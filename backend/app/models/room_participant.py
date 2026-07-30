from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base

class ParticipantStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"

class RoomParticipant(Base):
    __tablename__ = "room_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    role = Column(String(50), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True))
    status = Column(String(50), nullable=False, default="connected")
    
    # Relationships
    room = relationship("Room", back_populates="participants")
    user = relationship("User", back_populates="room_participations")
    
    def __repr__(self):
        return f"<RoomParticipant {self.id}>"