from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert
from datetime import datetime
import asyncio
import json

from app.core.database import get_async_session
from app.models.event import Event
from app.schemas.telemetry import TelemetryEvent, TelemetryResponse
from app.models.room import Room, RoomStatus

router = APIRouter()

# Store active WebSocket connections for real-time updates
active_connections: dict[str, list] = {}

# Event broadcast task
broadcast_tasks: dict[str, asyncio.Task] = {}

@router.post("/events")
async def submit_telemetry_event(
    event: TelemetryEvent,
    db: AsyncSession = Depends(get_async_session)
):
    """Submit a telemetry event from the client"""
    # Create event record
    db_event = Event(
        room_id=event.room_id,
        user_id=event.user_id,
        event_type=event.event_type,
        event_data=event.event_data,
        severity=event.severity
    )
    
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    
    # Broadcast to active WebSocket connections for real-time updates
    timestamp = db_event.created_at.isoformat() if db_event.created_at else datetime.utcnow().isoformat()
    await broadcast_event_to_room(str(event.room_id), {
        "event_id": str(db_event.id),
        "event_type": event.event_type,
        "event_data": event.event_data,
        "severity": event.severity,
        "timestamp": timestamp,
    })
    
    return {
        "status": "success",
        "event_id": db_event.id,
        "timestamp": timestamp
    }

async def broadcast_event_to_room(room_id: str, event_data: dict):
    """Broadcast event to all WebSocket connections in a room"""
    if room_id in active_connections:
        message = json.dumps({
            "type": "event_update",
            "data": event_data
        })
        
        disconnected = []
        for websocket in active_connections[room_id]:
            try:
                await websocket.send_text(message)
            except Exception:
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for ws in disconnected:
            active_connections[room_id].remove(ws)
            if not active_connections[room_id]:
                del active_connections[room_id]

@router.get("/{room_id}", response_model=list[TelemetryResponse])
async def get_room_events(
    room_id: str,
    db: AsyncSession = Depends(get_async_session),
    limit: int = 100
):
    """Get telemetry events for a room"""
    result = await db.execute(
        select(Event)
        .where(Event.room_id == room_id)
        .order_by(Event.created_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    return events

@router.get("/trust-score/{room_id}")
async def get_trust_score(
    room_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Calculate and return trust score for a room"""
    # Get recent events
    result = await db.execute(
        select(Event)
        .where(Event.room_id == room_id)
        .order_by(Event.created_at.desc())
        .limit(100)
    )
    events = result.scalars().all()
    
    if not events:
        return {"trust_score": 100.0, "event_count": 0}
    
    # Calculate trust score based on event severity
    # High severity: -20 points, Medium: -10 points, Low: -5 points
    penalty = 0
    for event in events:
        if event.severity == "high":
            penalty += 20
        elif event.severity == "medium":
            penalty += 10
        elif event.severity == "low":
            penalty += 5
    
    trust_score = max(0.0, 100.0 - penalty)
    
    return {
        "trust_score": trust_score,
        "event_count": len(events),
        "severity_breakdown": {
            "high": sum(1 for e in events if e.severity == "high"),
            "medium": sum(1 for e in events if e.severity == "medium"),
            "low": sum(1 for e in events if e.severity == "low")
        }
    }

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for real-time telemetry updates"""
    # Verify room exists and is active
    from app.core.database import async_session
    async with async_session() as session:
        result = await session.execute(
            select(Room).where(Room.slug == room_id)
        )
        room = result.scalar_one_or_none()
        
        if not room or room.status not in ["active", "ACTIVE"]:
            await websocket.close(code=4003, reason="Room not found or not active")
            return
    
    await websocket.accept()
    
    # Add connection to active connections
    if room_id not in active_connections:
        active_connections[room_id] = []
    active_connections[room_id].append(websocket)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            elif data == "pong":
                # Client responded to ping, connection is healthy
                continue
            else:
                # Handle other message types
                try:
                    message = json.loads(data)
                    if message.get("type") == "subscribe":
                        # Client is subscribing to events
                        await websocket.send_text(json.dumps({
                            "type": "subscribed",
                            "room_id": room_id,
                            "message": "Now receiving real-time updates"
                        }))
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        # Remove connection on disconnect
        if room_id in active_connections:
            active_connections[room_id].remove(websocket)
            if not active_connections[room_id]:
                del active_connections[room_id]

async def start_trust_score_monitor(room_id: str, interval: float = 5.0):
    """Background task to monitor and broadcast trust score updates"""
    from app.core.database import async_session
    
    async with async_session() as session:
        while True:
            try:
                await asyncio.sleep(interval)
                
                # Get recent events for trust score calculation
                result = await session.execute(
                    select(Event)
                    .where(Event.room_id == room_id)
                    .order_by(Event.created_at.desc())
                    .limit(100)
                )
                events = result.scalars().all()
                
                if not events:
                    continue
                
                # Calculate trust score
                penalty = 0
                for event in events:
                    if event.severity == "high":
                        penalty += 20
                    elif event.severity == "medium":
                        penalty += 10
                    elif event.severity == "low":
                        penalty += 5
                
                trust_score = max(0.0, 100.0 - penalty)
                
                # Broadcast update to all connected clients
                if room_id in active_connections:
                    message = json.dumps({
                        "type": "trust_score_update",
                        "data": {
                            "trust_score": trust_score,
                            "event_count": len(events),
                            "severity_breakdown": {
                                "high": sum(1 for e in events if e.severity == "high"),
                                "medium": sum(1 for e in events if e.severity == "medium"),
                                "low": sum(1 for e in events if e.severity == "low")
                            }
                        }
                    })
                    
                    disconnected = []
                    for websocket in active_connections[room_id]:
                        try:
                            await websocket.send_text(message)
                        except Exception:
                            disconnected.append(websocket)
                    
                    for ws in disconnected:
                        active_connections[room_id].remove(ws)
                        if not active_connections[room_id]:
                            del active_connections[room_id]
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error monitoring room {room_id}: {e}")
                break