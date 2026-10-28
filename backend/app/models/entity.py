import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # domain, subdomain, ip, asn, tech, username, profile, doc, location
    value: Mapped[str] = mapped_column(String(500), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    risk_level: Mapped[str] = mapped_column(String(20), default="INFO")  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="entities")
    outgoing_relations = relationship("Relationship", foreign_keys="Relationship.source_id", back_populates="source_entity", cascade="all, delete-orphan")
    incoming_relations = relationship("Relationship", foreign_keys="Relationship.target_id", back_populates="target_entity", cascade="all, delete-orphan")

