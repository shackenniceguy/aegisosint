# AegisOSINT — Autonomous Digital Footprint & Attack Surface Intelligence

A production-grade, self-hosted, "White-Zone" Open-Source Intelligence (OSINT) and External Attack Surface Management (ASM) Web Platform.

AegisOSINT analyzes publicly accessible network infrastructure, official registries, Certificate Transparency logs, open web protocols, and metadata to help organizations and security analysts assess their external security posture and identify potential data exposure risks.

---

## Key Capabilities & Modules

### 1. Domain & Infrastructure Reconnaissance
- **DNS Records Enumeration:** Passive resolution of A, AAAA, MX, TXT, NS, CNAME, and SOA records via `dnspython`.
- **Certificate Transparency (CT Logs):** Deep query of `crt.sh` historical logs with asynchronous sub-domain resolution and live IP mapping.
- **Email Security Assessment:** Automated parsing and compliance check for SPF records (`v=spf1`, `-all` vs `~all`) and DMARC enforcement policies (`p=reject`, `p=quarantine`, `p=none`).
- **RDAP & Geolocation:** Autonomous System Number (ASN), ISP, and geographic country/city mapping.
- **Web Stack & Security Headers Fingerprint:** Real-time TLS certificate analysis and security headers audit (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) with a letter grade (A+ through F) and posture score.

### 2. SOCMINT & Username Correlation
- **Multi-Platform Digital Footprint:** Concurrent asynchronous search across 30+ major developer, social, blogging, and gaming platforms (GitHub, GitLab, Reddit, Telegram, Keybase, Medium, HackerNews, Habr, StackOverflow, Pinterest, DockerHub, Dev.to, etc.).
- **False-Positive Reduction Engine:** Contextual content and negative signature verification beyond simple HTTP status codes.
- **GitHub Enrichment:** Direct retrieval of public bio, organization, location, public repositories, and commit metadata.

### 3. Document & Image Metadata Forensics
- **EXIF Extraction:** Camera make/model, lens, software, and original capture timestamps.
- **GPS Coordinates & Mapping:** Decimal conversion of latitude/longitude with direct links to Google Maps and OpenStreetMap.
- **Document Forensics:** Metadata and author tags from PDF and Word (`.docx`) documents, plus embedded URL extraction.
- **Privacy Sanitizer:** One-click metadata stripping allowing download of cleaned, leak-free media files.

### 4. Advanced Dork Builder & Archive Explorer
- **Targeted Dork Constructor:** Instant generator for Google, Yandex, GitHub Code, and Shodan search strings (exposed `.env` configs, database dumps, open indexes, admin portals).
- **Wayback Machine Integration:** Historical snapshots discovery via the Internet Archive CDX API with MIME-type filtering.

### 5. Interactive Link-Analysis Graph (Maltego-style)
- **Automatic Knowledge Graph:** Relational canvas mapping Domain ➔ Subdomains ➔ IP Addresses ➔ ASN ➔ Web Tech ➔ Usernames ➔ Profiles ➔ Locations.
- **Dynamic Layouts:** Force-Directed (Cose), Hierarchical (Breadthfirst), Concentric/Circular, and Grid layouts via Cytoscape.js.
- **Graph Pivoting:** Right-click or select any node to trigger automated sub-scans (e.g. Pivot on IP for reverse lookup, Pivot on Username for SOCMINT correlation).

### 6. Executive Reporting & Security Scoring
- **Executive Security Posture Score (0–100):** Automated weighting of infrastructure weaknesses and privacy leaks.
- **Multi-Format Export:** Formatted Markdown, printable HTML / PDF, and raw JSON export.

### 7. Multi-Language (i18n)
- Native hot-swappable interface in **English (EN)**, **Russian (RU)**, and **Uzbek (UZ)**.

---

## Architecture & Tech Stack

```
aegisosint/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application & WebSockets
│   │   ├── config.py                  # Pydantic v2 configuration
│   │   ├── database.py                # Async SQLAlchemy 2.0 & SQLite engine
│   │   ├── models/                    # Workspaces, Entities, Relationships, Logs
│   │   ├── schemas/                   # Pydantic validation schemas
│   │   ├── services/                  # 5 Core Real Async OSINT Engines
│   │   ├── api/                       # REST endpoints & WebSockets
│   │   └── utils/                     # User-Agent rotation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── locales/                   # en.json, ru.json, uz.json
│   │   ├── components/                # Navbar, Sidebar, TerminalLog, etc.
│   │   ├── views/                     # 6 Module Views
│   │   ├── context/                   # Language & Workspace Contexts
│   │   └── types/                     # TypeScript definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Quickstart & Launch Instructions

### Option 1: One-Command Docker Deployment (Recommended)

```bash
cd /home/shacken/IT/aegisosint
docker-compose up -d --build
```

- Web UI: `http://localhost:3000`
- API Documentation (Swagger): `http://localhost:8000/docs`

---

### Option 2: Local Standalone Development

#### 1. Backend Setup
```bash
cd /home/shacken/IT/aegisosint/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd /home/shacken/IT/aegisosint/frontend
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Legal & Compliance Notice

AegisOSINT is designed exclusively for authorized cybersecurity auditing, digital footprint analysis, and threat modeling within legal "White-Zone" OSINT boundaries. It does not exploit vulnerabilities, bypass authentication, or access unauthorized databases.

