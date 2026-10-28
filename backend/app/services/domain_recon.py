import asyncio
import socket
import ssl
from typing import Dict, List, Any, Optional, Tuple
import dns.resolver
import dns.asyncresolver
import httpx
from app.utils.user_agents import get_random_user_agent
from app.schemas.domain import (
    DomainReconResponse,
    SubdomainResult,
    HTTPTechResult,
    SecurityHeaderGrade
)

class DomainReconService:
    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout
        self.resolver = dns.asyncresolver.Resolver()
        self.resolver.timeout = 4.0
        self.resolver.lifetime = 6.0
        # Fallback nameservers: Cloudflare and Google
        self.resolver.nameservers = ['1.1.1.1', '8.8.8.8', '1.0.0.1']

    async def query_dns_records(self, domain: str) -> Dict[str, List[str]]:
        record_types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA']
        results: Dict[str, List[str]] = {}

        for r_type in record_types:
            try:
                answers = await self.resolver.resolve(domain, r_type)
                values = []
                for rdata in answers:
                    if r_type == 'MX':
                        values.append(f"{rdata.preference} {rdata.exchange.to_text().rstrip('.')}")
                    else:
                        values.append(rdata.to_text().strip('"').rstrip('.'))
                if values:
                    results[r_type] = values
            except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers, dns.exception.Timeout):
                continue
            except Exception:
                continue

        return results

    async def analyze_spf_dmarc(self, domain: str, txt_records: List[str]) -> Tuple[Optional[str], bool, Optional[str], Optional[str]]:
        spf_record = None
        spf_valid = False
        dmarc_record = None
        dmarc_policy = None

        # SPF analysis
        for record in txt_records:
            if record.startswith("v=spf1"):
                spf_record = record
                # -all or ~all is considered protective
                if "-all" in record or "~all" in record:
                    spf_valid = True
                break

        # DMARC analysis
        dmarc_domain = f"_dmarc.{domain}"
        try:
            answers = await self.resolver.resolve(dmarc_domain, 'TXT')
            for rdata in answers:
                txt_val = rdata.to_text().strip('"')
                if txt_val.startswith("v=DMARC1"):
                    dmarc_record = txt_val
                    # Parse policy
                    for part in txt_val.split(";"):
                        part = part.strip()
                        if part.startswith("p="):
                            dmarc_policy = part.split("=")[1].strip()
                    break
        except Exception:
            pass

        return spf_record, spf_valid, dmarc_record, dmarc_policy

    async def fetch_crt_sh_subdomains(self, domain: str) -> List[str]:
        url = f"https://crt.sh/?q=%.{domain}&output=json"
        headers = {"User-Agent": get_random_user_agent()}
        subdomains = set()

        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    entries = resp.json()
                    for item in entries:
                        name_val = item.get("name_value", "")
                        for sub in name_val.split("\n"):
                            sub = sub.strip().lower()
                            if "*" in sub:
                                sub = sub.replace("*.", "")
                            if sub.endswith(domain) and sub != domain:
                                subdomains.add(sub)
        except Exception:
            pass

        return sorted(list(subdomains))

    async def resolve_subdomain(self, sub: str, semaphore: asyncio.Semaphore) -> SubdomainResult:
        async with semaphore:
            try:
                answers = await self.resolver.resolve(sub, 'A')
                ips = [rdata.to_text() for rdata in answers]
                return SubdomainResult(
                    subdomain=sub,
                    ip_addresses=ips,
                    is_active=True,
                    source="crt.sh"
                )
            except Exception:
                return SubdomainResult(
                    subdomain=sub,
                    ip_addresses=[],
                    is_active=False,
                    source="crt.sh"
                )

    async def lookup_ip_details(self, ip: str) -> Dict[str, Any]:
        url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "success":
                        return data
        except Exception:
            pass
        return {"query": ip, "status": "fail"}

    async def query_rdap(self, domain: str) -> Optional[Dict[str, Any]]:
        url = f"https://rdap.org/domain/{domain}"
        headers = {"User-Agent": get_random_user_agent(), "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    # Extract high-level summary
                    registrar = "Unknown"
                    for entity in data.get("entities", []):
                        if "registrar" in entity.get("roles", []):
                            vcard = entity.get("vcardArray", [])
                            if len(vcard) > 1:
                                for prop in vcard[1]:
                                    if prop[0] == "fn":
                                        registrar = prop[3]
                    
                    events = {}
                    for ev in data.get("events", []):
                        action = ev.get("eventAction")
                        date = ev.get("eventDate")
                        if action and date:
                            events[action] = date

                    return {
                        "handle": data.get("handle"),
                        "registrar": registrar,
                        "status": data.get("status", []),
                        "events": events,
                        "nameservers": [ns.get("ldhName") for ns in data.get("nameservers", []) if ns.get("ldhName")]
                    }
        except Exception:
            pass
        return None

    def evaluate_security_headers(self, headers: httpx.Headers) -> Tuple[List[SecurityHeaderGrade], int, str]:
        checks = [
            ("Strict-Transport-Security", "HSTS protects against SSL-stripping and cookie hijacking.", 20),
            ("Content-Security-Policy", "CSP mitigates Cross-Site Scripting (XSS) and data injection.", 25),
            ("X-Frame-Options", "Prevents clickjacking attacks via iframes.", 15),
            ("X-Content-Type-Options", "Prevents MIME-type sniffing.", 15),
            ("Referrer-Policy", "Controls referrer leakage in outbound HTTP requests.", 15),
            ("Permissions-Policy", "Restricts browser feature usage like camera, microphone, GPS.", 10)
        ]

        score = 0
        grades = []

        for header_name, desc, weight in checks:
            val = headers.get(header_name)
            if val:
                score += weight
                grades.append(SecurityHeaderGrade(
                    header=header_name,
                    value=val,
                    status="PASS",
                    description=desc
                ))
            else:
                grades.append(SecurityHeaderGrade(
                    header=header_name,
                    value=None,
                    status="FAIL",
                    description=desc
                ))

        if score >= 90:
            letter = "A+"
        elif score >= 80:
            letter = "A"
        elif score >= 65:
            letter = "B"
        elif score >= 50:
            letter = "C"
        elif score >= 35:
            letter = "D"
        else:
            letter = "F"

        return grades, score, letter

    async def get_tls_certificate_info(self, domain: str) -> Optional[Dict[str, Any]]:
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            loop = asyncio.get_event_loop()
            def fetch_cert():
                with socket.create_connection((domain, 443), timeout=4.0) as sock:
                    with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                        return ssock.getpeercert(binary_form=False), ssock.version(), ssock.cipher()
            
            cert, ver, cipher = await loop.run_in_executor(None, fetch_cert)
            if cert:
                return {
                    "subject": dict(x[0] for x in cert.get("subject", [])),
                    "issuer": dict(x[0] for x in cert.get("issuer", [])),
                    "notAfter": cert.get("notAfter"),
                    "notBefore": cert.get("notBefore"),
                    "tls_version": ver,
                    "cipher": cipher
                }
        except Exception:
            pass
        return None

    async def fingerprint_http(self, domain: str) -> Optional[HTTPTechResult]:
        url = f"https://{domain}"
        headers = {"User-Agent": get_random_user_agent()}

        try:
            async with httpx.AsyncClient(timeout=8.0, verify=False, follow_redirects=True) as client:
                res = await client.get(url, headers=headers)
                sec_grades, score, letter = self.evaluate_security_headers(res.headers)
                
                techs = set()
                server = res.headers.get("Server")
                x_pow = res.headers.get("X-Powered-By")
                if server:
                    techs.add(f"Server: {server}")
                if x_pow:
                    techs.add(f"Powered-By: {x_pow}")

                # Check body keywords
                body_lower = res.text[:20000].lower()
                if "wp-content" in body_lower or "wordpress" in body_lower:
                    techs.add("CMS: WordPress")
                if "react" in body_lower or "_next" in body_lower:
                    techs.add("Framework: React / Next.js")
                if "vue" in body_lower or "nuxt" in body_lower:
                    techs.add("Framework: Vue / Nuxt")
                if "cloudflare" in str(res.headers).lower():
                    techs.add("CDN: Cloudflare")
                if "nginx" in str(res.headers).lower():
                    techs.add("Web Server: Nginx")
                if "apache" in str(res.headers).lower():
                    techs.add("Web Server: Apache")

                tls_info = await self.get_tls_certificate_info(domain)

                return HTTPTechResult(
                    status_code=res.status_code,
                    server=server,
                    x_powered_by=x_pow,
                    technologies=list(techs),
                    security_headers=sec_grades,
                    security_score=score,
                    grade=letter,
                    tls_info=tls_info
                )
        except Exception:
            return None

    async def perform_full_recon(self, domain: str, resolve_subs: bool = True, check_http: bool = True) -> DomainReconResponse:
        domain = domain.strip().lower().replace("http://", "").replace("https://", "").split("/")[0]

        # 1. DNS records
        dns_records = await self.query_dns_records(domain)
        txt_records = dns_records.get("TXT", [])
        
        # 2. SPF & DMARC
        spf_rec, spf_ok, dmarc_rec, dmarc_pol = await self.analyze_spf_dmarc(domain, txt_records)

        # 3. WHOIS / RDAP
        whois_data = await self.query_rdap(domain)

        # 4. Resolve IPs & IP Details
        ip_details = []
        for ip in dns_records.get("A", [])[:4]:
            detail = await self.lookup_ip_details(ip)
            ip_details.append(detail)

        # 5. Subdomain discovery via CT Logs
        raw_subs = await self.fetch_crt_sh_subdomains(domain)
        subdomain_results = []
        
        if resolve_subs and raw_subs:
            sem = asyncio.Semaphore(15)
            # Limit resolution to first 30 subdomains to prevent timeouts
            tasks = [self.resolve_subdomain(sub, sem) for sub in raw_subs[:30]]
            subdomain_results = await asyncio.gather(*tasks)
        else:
            for s in raw_subs[:30]:
                subdomain_results.append(SubdomainResult(subdomain=s, ip_addresses=[], is_active=False))

        # 6. HTTP Fingerprint
        http_data = None
        if check_http:
            http_data = await self.fingerprint_http(domain)

        # 7. Security Posture Score & Risks calculation
        risks = []
        posture_score = 100

        if not spf_rec:
            posture_score -= 15
            risks.append({"severity": "HIGH", "issue": "Missing SPF Record", "detail": "Domain lacks SPF record, enabling email spoofing."})
        elif not spf_ok:
            posture_score -= 10
            risks.append({"severity": "MEDIUM", "issue": "Permissive SPF Policy", "detail": "SPF does not use strict '-all' or '~all' qualifiers."})

        if not dmarc_rec:
            posture_score -= 20
            risks.append({"severity": "HIGH", "issue": "Missing DMARC Record", "detail": "Lack of DMARC prevents enforcement against unauthorized senders."})
        elif dmarc_pol == "none":
            posture_score -= 10
            risks.append({"severity": "MEDIUM", "issue": "DMARC Policy in Monitoring Mode (p=none)", "detail": "Emails failing SPF/DKIM are still delivered."})

        if http_data:
            if http_data.grade in ["D", "F"]:
                posture_score -= 20
                risks.append({"severity": "HIGH", "issue": f"Poor HTTP Security Headers (Grade: {http_data.grade})", "detail": "Crucial headers like CSP or HSTS are absent."})
            elif http_data.grade in ["C", "B"]:
                posture_score -= 10
                risks.append({"severity": "LOW", "issue": f"Suboptimal Security Headers (Grade: {http_data.grade})", "detail": "Some protective headers are missing."})

        # Check for exposed high-risk subdomains
        staging_keywords = ["dev", "staging", "test", "admin", "internal", "vpn", "corp", "jenkins", "gitlab"]
        for sub_res in subdomain_results:
            if sub_res.is_active:
                for kw in staging_keywords:
                    if kw in sub_res.subdomain.split("."):
                        risks.append({
                            "severity": "MEDIUM",
                            "issue": f"Exposed Sensitive Subdomain ({sub_res.subdomain})",
                            "detail": f"Active infrastructure element ({kw}) exposed to public internet."
                        })
                        posture_score = max(10, posture_score - 5)
                        break

        posture_score = max(5, posture_score)

        return DomainReconResponse(
            domain=domain,
            dns_records=dns_records,
            spf_record=spf_rec,
            spf_valid=spf_ok,
            dmarc_record=dmarc_rec,
            dmarc_policy=dmarc_pol,
            whois_rdap=whois_data,
            ip_details=ip_details,
            subdomains=subdomain_results,
            http_fingerprint=http_data,
            security_posture_score=posture_score,
            risks_identified=risks
        )

