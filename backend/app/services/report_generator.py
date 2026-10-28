import json
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.workspace import Workspace
from app.models.entity import Entity
from app.schemas.report import ReportResponse, ExecutiveSummary

I18N_TITLES = {
    "en": {
        "title": "AegisOSINT Intelligence & Digital Footprint Audit Report",
        "exec_summary": "Executive Summary & Security Posture",
        "target": "Audit Target",
        "date": "Assessment Date",
        "score": "Security Posture Score",
        "entities_title": "Identified Digital Assets",
        "findings_title": "Key Vulnerabilities & Exposure Findings",
        "recommendations": "Remediation Recommendations",
        "confidentiality": "CONFIDENTIAL - FOR AUTHORIZED ASSESSMENT USE ONLY"
    },
    "ru": {
        "title": "Отчёт аудита цифрового следа и внешней инфраструктуры AegisOSINT",
        "exec_summary": "Сводный обзор и оценка защищённости (Security Posture)",
        "target": "Объект исследования",
        "date": "Дата проведения аудита",
        "score": "Индекс защищённости (Security Score)",
        "entities_title": "Обнаруженные цифровые активы и инфраструктура",
        "findings_title": "Ключевые уязвимости и риски компрометации",
        "recommendations": "Рекомендации по устранению рисков",
        "confidentiality": "КОНФИДЕНЦИАЛЬНО - ДЛЯ ВНУТРЕННЕГО АУДИТА"
    },
    "uz": {
        "title": "AegisOSINT Raqamli Iz va Tashqi Infratuzilma Auditi Hisoboti",
        "exec_summary": "Xulosa va Xavfsizlik Holatini Baholash (Security Posture)",
        "target": "Audit obyekti",
        "date": "Audit o'tkazilgan sana",
        "score": "Xavfsizlik indeksi (Security Score)",
        "entities_title": "Aniqlangan raqamli aktivlar va infratuzilma",
        "findings_title": "Asosiy zaifliklar va xavf omillari",
        "recommendations": "Xavflarni bartaraf etish bo'yicha tavsiyalar",
        "confidentiality": "MAXFIY - FAQAT ICHKI AUDIT UCHUN"
    }
}

class ReportGeneratorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_report(self, workspace_id: str, lang: str = "ru", output_format: str = "markdown") -> ReportResponse:
        lang = lang if lang in ["ru", "en", "uz"] else "en"
        t = I18N_TITLES[lang]

        stmt = select(Workspace).where(Workspace.id == workspace_id)
        res = await self.db.execute(stmt)
        workspace = res.scalars().first()
        target_name = workspace.target if workspace else "Unknown Target"

        # Fetch entities
        stmt_ent = select(Entity).where(Entity.workspace_id == workspace_id)
        res_ent = await self.db.execute(stmt_ent)
        entities = res_ent.scalars().all()

        crit_count = sum(1 for e in entities if e.risk_level == "CRITICAL")
        high_count = sum(1 for e in entities if e.risk_level == "HIGH")
        med_count = sum(1 for e in entities if e.risk_level == "MEDIUM")
        low_count = sum(1 for e in entities if e.risk_level == "LOW")

        # Calculate score
        score = 100 - (crit_count * 25) - (high_count * 15) - (med_count * 8) - (low_count * 3)
        score = max(5, min(100, score))

        if score >= 85:
            grade = "A"
        elif score >= 70:
            grade = "B"
        elif score >= 55:
            grade = "C"
        elif score >= 40:
            grade = "D"
        else:
            grade = "F"

        key_findings = []
        for e in entities:
            if e.risk_level in ["HIGH", "CRITICAL"]:
                key_findings.append(f"[{e.risk_level}] {e.type.upper()}: {e.label}")
            elif e.type == "location":
                key_findings.append(f"[HIGH] GPS Geotag Exposing Physical Location: {e.value}")

        if not key_findings:
            key_findings.append("No critical or high-risk exposure vectors detected during baseline reconnaissance.")

        exec_summary = ExecutiveSummary(
            target=target_name,
            security_score=score,
            score_grade=grade,
            total_entities=len(entities),
            critical_risks_count=crit_count,
            high_risks_count=high_count,
            medium_risks_count=med_count,
            low_risks_count=low_count,
            key_findings=key_findings[:8]
        )

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Format output
        if output_format == "json":
            raw_data = {
                "workspace": {"id": workspace_id, "name": workspace.name if workspace else "", "target": target_name},
                "executive_summary": exec_summary.dict(),
                "entities": [{"type": e.type, "value": e.value, "label": e.label, "risk_level": e.risk_level} for e in entities]
            }
            content = json.dumps(raw_data, indent=2, ensure_ascii=False)
            return ReportResponse(
                title=t["title"],
                generated_at=now_str,
                language=lang,
                executive_summary=exec_summary,
                content=content,
                raw_data=raw_data
            )

        elif output_format == "html":
            html_content = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <title>{t["title"]} - {target_name}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f17; color: #e2e8f0; margin: 0; padding: 40px; }}
        .header {{ border-bottom: 2px solid #00f2fe; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }}
        h1 {{ margin: 0; color: #38bdf8; font-size: 24px; }}
        .badge {{ background: #1e293b; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #38bdf8; border: 1px solid #334155; }}
        .score-card {{ background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 30px; display: flex; gap: 40px; align-items: center; }}
        .score-circle {{ font-size: 48px; font-weight: 800; color: {'#10b981' if score >= 70 else '#f59e0b' if score >= 40 else '#ef4444'}; }}
        .meta-table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        .meta-table th, .meta-table td {{ text-align: left; padding: 12px; border-bottom: 1px solid #1e293b; font-size: 14px; }}
        .meta-table th {{ color: #94a3b8; font-weight: 600; }}
        .risk-tag {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }}
        .risk-HIGH {{ background: #ef444422; color: #ef4444; border: 1px solid #ef4444; }}
        .risk-MEDIUM {{ background: #f59e0b22; color: #f59e0b; border: 1px solid #f59e0b; }}
        .risk-INFO {{ background: #38bdf822; color: #38bdf8; border: 1px solid #38bdf8; }}
        .print-btn {{ background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }}
        @media print {{ .print-btn {{ display: none; }} body {{ background: white; color: black; }} }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>{t["title"]}</h1>
            <p style="color: #64748b; margin: 5px 0 0 0;">{t["target"]}: <strong>{target_name}</strong> | {t["date"]}: {now_str}</p>
        </div>
        <button class="print-btn" onclick="window.print()">Print / Export PDF</button>
    </div>

    <div class="score-card">
        <div class="score-circle">{score} <span style="font-size: 20px; color: #94a3b8;">/ 100 (Grade {grade})</span></div>
        <div>
            <h3 style="margin: 0 0 8px 0; color: #f8fafc;">{t["exec_summary"]}</h3>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">Total Discovered Artifacts: <strong>{len(entities)}</strong> | High/Critical Risks: <strong style="color: #ef4444;">{crit_count + high_count}</strong></p>
        </div>
    </div>

    <h3 style="color: #38bdf8; margin-top: 30px;">{t["findings_title"]}</h3>
    <ul>
        {"".join(f'<li style="margin-bottom: 8px; font-size: 14px;">{item}</li>' for item in exec_summary.key_findings)}
    </ul>

    <h3 style="color: #38bdf8; margin-top: 40px;">{t["entities_title"]}</h3>
    <table class="meta-table">
        <thead>
            <tr>
                <th>Type</th>
                <th>Label / Value</th>
                <th>Risk Level</th>
            </tr>
        </thead>
        <tbody>
            {"".join(f'<tr><td>{e.type.upper()}</td><td>{e.label}</td><td><span class="risk-tag risk-{e.risk_level}">{e.risk_level}</span></td></tr>' for e in entities[:50])}
        </tbody>
    </table>
</body>
</html>"""
            return ReportResponse(
                title=t["title"],
                generated_at=now_str,
                language=lang,
                executive_summary=exec_summary,
                content=html_content
            )

        else:
            # Markdown format
            md_lines = [
                f"# {t['title']}",
                f"**{t['target']}:** `{target_name}`  ",
                f"**{t['date']}:** {now_str}  ",
                f"**Status:** {t['confidentiality']}\n",
                f"---",
                f"## 1. {t['exec_summary']}",
                f"- **{t['score']}:** `{score}/100` (Grade: **{grade}**)",
                f"- **Total Discovered Assets:** `{len(entities)}`",
                f"- **Critical / High Risks:** `{crit_count + high_count}`\n",
                f"### {t['findings_title']}"
            ]
            for item in exec_summary.key_findings:
                md_lines.append(f"- {item}")

            md_lines.append(f"\n## 2. {t['entities_title']}")
            md_lines.append("| Type | Label / Artifact | Risk Level |")
            md_lines.append("| :--- | :--- | :--- |")
            for e in entities[:40]:
                md_lines.append(f"| `{e.type.upper()}` | {e.label} | **{e.risk_level}** |")

            md_lines.append(f"\n## 3. {t['recommendations']}")
            md_lines.append("1. **Email Security:** Enforce strict SPF policy (`-all`) and upgrade DMARC to `p=quarantine` or `p=reject`.")
            md_lines.append("2. **Web Hardening:** Implement Content-Security-Policy (CSP) and HSTS with long max-age to prevent downgrade attacks.")
            md_lines.append("3. **Asset Hygiene:** Sanitize internal development and staging subdomains from public DNS.")
            md_lines.append("4. **Operational Security (OPSEC):** Strip EXIF metadata and GPS coordinates from public media prior to publication.")

            content = "\n".join(md_lines)
            return ReportResponse(
                title=t["title"],
                generated_at=now_str,
                language=lang,
                executive_summary=exec_summary,
                content=content
            )

