from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from sqlalchemy.orm import relationship

from app.core.database import Base

class RoomStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"

class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    # Python attr 'created_by_id' maps to DB column 'created_by' to match the existing schema
    created_by_id = Column("created_by", UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", back_populates="created_rooms", foreign_keys=[created_by_id])
    participants = relationship("RoomParticipant", back_populates="room", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Room {self.slug}>"