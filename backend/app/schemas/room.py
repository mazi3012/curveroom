from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID

class RoomBase(BaseModel):
    name: str

class RoomCreate(RoomBase):
    duration_hours: int = 2

class RoomResponse(RoomBase):
    id: str
    slug: str
    status: str
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    created_by_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def model_validate(cls, obj: Any) -> "RoomResponse":
        if hasattr(obj, 'id') and isinstance(obj.id, UUID):
            obj.id = str(obj.id)
        if hasattr(obj, 'created_by_id') and isinstance(obj.created_by_id, UUID):
            obj.created_by_id = str(obj.created_by_id)
        return super().model_validate(obj)

class RoomListResponse(BaseModel):
    id: str
    slug: str
    name: str
    status: str
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def model_validate(cls, obj: Any) -> "RoomListResponse":
        if hasattr(obj, 'id') and isinstance(obj.id, UUID):
            obj.id = str(obj.id)
        return super().model_validate(obj)

class RoomDetailsResponse(BaseModel):
    id: str
    slug: str
    name: str
    status: str
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    qr_code: str
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def model_validate(cls, obj: Any) -> "RoomDetailsResponse":
        if hasattr(obj, 'id') and isinstance(obj.id, UUID):
            obj.id = str(obj.id)
        return super().model_validate(obj)
