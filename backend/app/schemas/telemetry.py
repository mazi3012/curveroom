from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class TelemetryEvent(BaseModel):
    room_id: str
    user_id: Optional[str] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    severity: str = "low"

class TelemetryResponse(BaseModel):
    id: str
    room_id: str
    user_id: Optional[str] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    severity: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TrustScoreResponse(BaseModel):
    trust_score: float
    event_count: int
    severity_breakdown: Dict[str, int]