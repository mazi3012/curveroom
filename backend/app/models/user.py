from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    INTERVIEWER = "interviewer"
    CANDIDATE = "candidate"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="candidate")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_rooms = relationship("Room", back_populates="created_by", foreign_keys="Room.created_by_id")
    room_participations = relationship("RoomParticipant", back_populates="user")
    
    def __repr__(self):
        return f"<User {self.email}>"