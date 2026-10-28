import json
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.entity import Entity
from app.models.relationship import Relationship
from app.schemas.graph import GraphElements, GraphNode, GraphNodeData, GraphEdge, GraphEdgeData

class GraphCorrelatorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_entity(
        self,
        workspace_id: str,
        entity_type: str,
        value: str,
        label: str,
        risk_level: str = "INFO",
        metadata: dict = None
    ) -> Entity:
        stmt = select(Entity).where(
            Entity.workspace_id == workspace_id,
            Entity.type == entity_type,
            Entity.value == value
        )
        result = await self.db.execute(stmt)
        entity = result.scalars().first()

        if not entity:
            entity = Entity(
                workspace_id=workspace_id,
                type=entity_type,
                value=value,
                label=label,
                risk_level=risk_level,
                metadata_json=json.dumps(metadata or {})
            )
            self.db.add(entity)
            await self.db.flush()
        else:
            if metadata:
                existing = json.loads(entity.metadata_json or "{}")
                existing.update(metadata)
                entity.metadata_json = json.dumps(existing)
            if risk_level != "INFO":
                entity.risk_level = risk_level
            await self.db.flush()

        return entity

    async def create_relationship(
        self,
        workspace_id: str,
        source_id: str,
        target_id: str,
        relation_type: str,
        label: str = ""
    ) -> Optional[Relationship]:
        if source_id == target_id:
            return None

        stmt = select(Relationship).where(
            Relationship.workspace_id == workspace_id,
            Relationship.source_id == source_id,
            Relationship.target_id == target_id,
            Relationship.relation_type == relation_type
        )
        res = await self.db.execute(stmt)
        rel = res.scalars().first()

        if not rel:
            rel = Relationship(
                workspace_id=workspace_id,
                source_id=source_id,
                target_id=target_id,
                relation_type=relation_type,
                label=label
            )
            self.db.add(rel)
            await self.db.flush()

        return rel

    async def correlate_domain_recon(self, workspace_id: str, data: dict):
        domain_val = data.get("domain")
        if not domain_val:
            return

        # 1. Root Domain node
        domain_node = await self.get_or_create_entity(
            workspace_id=workspace_id,
            entity_type="domain",
            value=domain_val,
            label=domain_val,
            risk_level="INFO",
            metadata={"spf": data.get("spf_record"), "dmarc": data.get("dmarc_record")}
        )

        # 2. IP addresses & ASN
        for ip_detail in data.get("ip_details", []):
            ip_val = ip_detail.get("query")
            if ip_val:
                ip_node = await self.get_or_create_entity(
                    workspace_id=workspace_id,
                    entity_type="ip",
                    value=ip_val,
                    label=f"IP: {ip_val}",
                    risk_level="INFO",
                    metadata=ip_detail
                )
                await self.create_relationship(
                    workspace_id, domain_node.id, ip_node.id, "RESOLVES_TO", "A Record"
                )

                # ASN Node
                asn_val = ip_detail.get("as")
                if asn_val:
                    asn_node = await self.get_or_create_entity(
                        workspace_id=workspace_id,
                        entity_type="asn",
                        value=asn_val,
                        label=asn_val[:25],
                        risk_level="INFO",
                        metadata={"isp": ip_detail.get("isp"), "country": ip_detail.get("country")}
                    )
                    await self.create_relationship(
                        workspace_id, ip_node.id, asn_node.id, "ANNOUNCED_BY", "BGP"
                    )

        # 3. Subdomains
        for sub in data.get("subdomains", []):
            sub_val = sub.get("subdomain")
            if sub_val and sub_val != domain_val:
                is_active = sub.get("is_active", False)
                risk = "MEDIUM" if ("admin" in sub_val or "dev" in sub_val or "stage" in sub_val) else "INFO"
                
                sub_node = await self.get_or_create_entity(
                    workspace_id=workspace_id,
                    entity_type="subdomain",
                    value=sub_val,
                    label=sub_val,
                    risk_level=risk,
                    metadata={"active": is_active, "ips": sub.get("ip_addresses", [])}
                )
                await self.create_relationship(
                    workspace_id, domain_node.id, sub_node.id, "SUBDOMAIN_OF", "Certificate Log"
                )

                # Link Subdomain to its resolved IPs
                for s_ip in sub.get("ip_addresses", []):
                    s_ip_node = await self.get_or_create_entity(
                        workspace_id=workspace_id,
                        entity_type="ip",
                        value=s_ip,
                        label=f"IP: {s_ip}",
                        risk_level="INFO"
                    )
                    await self.create_relationship(
                        workspace_id, sub_node.id, s_ip_node.id, "RESOLVES_TO", "A"
                    )

        # 4. Technologies
        http_fp = data.get("http_fingerprint")
        if http_fp:
            for tech in http_fp.get("technologies", []):
                tech_node = await self.get_or_create_entity(
                    workspace_id=workspace_id,
                    entity_type="tech",
                    value=tech,
                    label=tech,
                    risk_level="INFO"
                )
                await self.create_relationship(
                    workspace_id, domain_node.id, tech_node.id, "RUNS_ON", "Fingerprint"
                )

        await self.db.commit()

    async def correlate_socmint(self, workspace_id: str, data: dict):
        username = data.get("username")
        if not username:
            return

        user_node = await self.get_or_create_entity(
            workspace_id=workspace_id,
            entity_type="username",
            value=username,
            label=f"@{username}",
            risk_level="INFO",
            metadata=data.get("github_enrichment") or {}
        )

        for p in data.get("profiles", []):
            if p.get("exists"):
                prof_node = await self.get_or_create_entity(
                    workspace_id=workspace_id,
                    entity_type="profile",
                    value=p.get("url"),
                    label=f"{p.get('platform')}",
                    risk_level="INFO",
                    metadata=p
                )
                await self.create_relationship(
                    workspace_id, user_node.id, prof_node.id, "HAS_PROFILE", p.get("category", "")
                )

        await self.db.commit()

    async def correlate_metadata(self, workspace_id: str, data: dict):
        filename = data.get("filename")
        if not filename:
            return

        doc_node = await self.get_or_create_entity(
            workspace_id=workspace_id,
            entity_type="doc",
            value=filename,
            label=f"File: {filename}",
            risk_level="HIGH" if data.get("has_sensitive_leaks") else "INFO",
            metadata={"mime_type": data.get("mime_type"), "size": data.get("file_size_bytes")}
        )

        gps = data.get("gps_info")
        if gps:
            lat = gps.get("latitude")
            lon = gps.get("longitude")
            coord_str = f"{lat},{lon}"
            loc_node = await self.get_or_create_entity(
                workspace_id=workspace_id,
                entity_type="location",
                value=coord_str,
                label=f"GPS: {coord_str}",
                risk_level="HIGH",
                metadata=gps
            )
            await self.create_relationship(
                workspace_id, doc_node.id, loc_node.id, "LOCATED_AT", "EXIF GPS"
            )

        # Document author
        props = data.get("document_properties", {})
        author = props.get("Author") or props.get("author")
        if author:
            auth_node = await self.get_or_create_entity(
                workspace_id=workspace_id,
                entity_type="username",
                value=author,
                label=f"Author: {author}",
                risk_level="MEDIUM"
            )
            await self.create_relationship(
                workspace_id, doc_node.id, auth_node.id, "AUTHOR_OF", "Metadata"
            )

        await self.db.commit()

    async def get_cytoscape_elements(self, workspace_id: str) -> GraphElements:
        stmt_entities = select(Entity).where(Entity.workspace_id == workspace_id)
        res_entities = await self.db.execute(stmt_entities)
        entities = res_entities.scalars().all()

        stmt_rels = select(Relationship).where(Relationship.workspace_id == workspace_id)
        res_rels = await self.db.execute(stmt_rels)
        relationships = res_rels.scalars().all()

        nodes = []
        for e in entities:
            meta = json.loads(e.metadata_json or "{}")
            nodes.append(GraphNode(
                data=GraphNodeData(
                    id=e.id,
                    label=e.label,
                    type=e.type,
                    value=e.value,
                    risk_level=e.risk_level,
                    metadata=meta
                )
            ))

        edges = []
        for r in relationships:
            edges.append(GraphEdge(
                data=GraphEdgeData(
                    id=r.id,
                    source=r.source_id,
                    target=r.target_id,
                    label=r.label,
                    relation_type=r.relation_type
                )
            ))

        return GraphElements(nodes=nodes, edges=edges)

