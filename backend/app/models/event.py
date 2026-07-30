from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base

class EventType(str, enum.Enum):
    GAZE_DEVIATION = "gaze_deviation"
    HAND_PRESENCE = "hand_presence"
    MULTIPLE_FACES = "multiple_faces"
    PHONE_DETECTION = "phone_detection"
    HEAD_TURN = "head_turn"
    AUDIO_BACKGROUND_NOISE = "audio_background_noise"
    VIDEO_QUALITY_LOW = "video_quality_low"

class Severity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type = Column(String(100), nullable=False)
    event_data = Column(JSON, nullable=True)
    severity = Column(String(50), nullable=False, default="low")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Event {self.id}>"