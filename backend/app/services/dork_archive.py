import urllib.parse
from typing import List, Optional
import httpx
from app.utils.user_agents import get_random_user_agent
from app.schemas.dork import DorkQuery, WaybackSnapshot, WaybackResponse

class DorkArchiveService:
    def generate_dorks(self, target: str) -> List[DorkQuery]:
        target = target.strip().replace("http://", "").replace("https://", "").split("/")[0]

        dork_templates = [
            {
                "category": "Exposed Configurations & Environment",
                "title": "Leaked Environment Files (.env, config.json)",
                "description": "Finds exposed database credentials, API keys, and environment variables.",
                "dork": f'site:{target} ext:env OR ext:yml OR ext:yaml OR ext:conf OR ext:ini "DB_PASSWORD" OR "SECRET_KEY"'
            },
            {
                "category": "Database & Backups",
                "title": "Public Database Dumps & SQL Backups",
                "description": "Searches for raw database backups and archive files.",
                "dork": f'site:{target} ext:sql OR ext:dump OR ext:tar OR ext:zip OR ext:bak OR ext:bkp "dump" OR "backup"'
            },
            {
                "category": "Admin & Sensitive Portals",
                "title": "Administrative Panels & Login Dashboards",
                "description": "Locates internal login portals, SSO endpoints, and administrative interfaces.",
                "dork": f'site:{target} inurl:admin OR inurl:login OR inurl:dashboard OR inurl:portal OR inurl:manage'
            },
            {
                "category": "Directory Traversal & Open Indexes",
                "title": "Directory Listing / Open Apache & Nginx Indexes",
                "description": "Detects web directories without default index files exposing internal assets.",
                "dork": f'site:{target} intitle:"index of /" OR intitle:"index of" "parent directory"'
            },
            {
                "category": "Sensitive Documents & Spreadsheets",
                "title": "Confidential Documents (PDF, XLSX, DOCX)",
                "description": "Finds files marked as confidential, proprietary, or internal use only.",
                "dork": f'site:{target} ext:pdf OR ext:xlsx OR ext:xls OR ext:docx "confidential" OR "internal use only" OR "не для распространения"'
            },
            {
                "category": "Exposed Log Files",
                "title": "Application & Debug Logs",
                "description": "Uncovers application tracebacks, access logs, and exception dumps.",
                "dork": f'site:{target} ext:log OR inurl:logs "error" OR "exception" OR "warning"'
            },
            {
                "category": "Public Code Repositories (GitHub)",
                "title": "GitHub Code & Token Leaks",
                "description": "Direct search on GitHub code for domain references with credentials.",
                "dork": f'"{target}" filename:.env OR path:credentials OR "PRIVATE KEY"'
            },
            {
                "category": "Network Infrastructure (Shodan)",
                "title": "Shodan SSL Certificate & Host Discovery",
                "description": "Locates exposed servers presenting target SSL certificates or title tags.",
                "dork": f'ssl.cert.subject.CN:"{target}"'
            }
        ]

        results = []
        for item in dork_templates:
            query = item["dork"]
            encoded = urllib.parse.quote_plus(query)
            google_url = f"https://www.google.com/search?q={encoded}"
            yandex_url = f"https://yandex.ru/search/?text={encoded}"
            
            github_url = None
            if "GitHub" in item["category"] or "Code" in item["title"]:
                github_url = f"https://github.com/search?q={encoded}&type=code"

            shodan_url = None
            if "Shodan" in item["category"] or "Infrastructure" in item["title"]:
                shodan_url = f"https://www.shodan.io/search?query={encoded}"

            results.append(DorkQuery(
                category=item["category"],
                title=item["title"],
                description=item["description"],
                query=query,
                google_url=google_url,
                yandex_url=yandex_url,
                github_url=github_url,
                shodan_url=shodan_url
            ))

        return results

    async def query_wayback_cdx(self, domain: str, limit: int = 50, mime_filter: Optional[str] = None) -> WaybackResponse:
        domain = domain.strip().replace("http://", "").replace("https://", "").split("/")[0]
        # Query CDX Server
        base_url = "https://web.archive.org/cdx/search/cdx"
        params = {
            "url": f"*.{domain}/*",
            "output": "json",
            "fl": "original,timestamp,mimetype,statuscode,digest",
            "collapse": "urlkey",
            "limit": str(min(limit, 200))
        }

        if mime_filter:
            params["filter"] = f"mimetype:{mime_filter}"

        headers = {"User-Agent": get_random_user_agent()}
        snapshots = []

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.get(base_url, params=params, headers=headers)
                if res.status_code == 200:
                    rows = res.json()
                    if len(rows) > 1:
                        # Row 0 is header: ['original', 'timestamp', 'mimetype', 'statuscode', 'digest']
                        for row in rows[1:]:
                            if len(row) >= 4:
                                orig = row[0]
                                ts = row[1]
                                mime = row[2]
                                status = row[3]
                                archive_link = f"https://web.archive.org/web/{ts}/{orig}"
                                snapshots.append(WaybackSnapshot(
                                    original_url=orig,
                                    timestamp=ts,
                                    mimetype=mime,
                                    status_code=status,
                                    archive_url=archive_link
                                ))
        except Exception:
            pass

        return WaybackResponse(
            domain=domain,
            total_snapshots=len(snapshots),
            snapshots=snapshots
        )

