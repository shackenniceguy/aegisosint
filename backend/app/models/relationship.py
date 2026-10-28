import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # RESOLVES_TO, SUBDOMAIN_OF, BELONGS_TO, RUNS_ON, OWNER_OF, LOCATED_AT
    label: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="relationships")
    source_entity = relationship("Entity", foreign_keys=[source_id], back_populates="outgoing_relations")
    target_entity = relationship("Entity", foreign_keys=[target_id], back_populates="incoming_relations")

