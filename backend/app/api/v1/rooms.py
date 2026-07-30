from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
import secrets
import qrcode
import io
import base64
import logging
import httpx
import asyncio

from app.core.database import get_async_session
from app.models.room import Room, RoomStatus
from app.models.room_participant import RoomParticipant, ParticipantStatus
from app.models.user import User
from app.schemas.room import RoomCreate, RoomResponse, RoomListResponse, RoomDetailsResponse
from app.schemas.auth import UserResponse
from app.core.config import settings
from app.api.v1.auth import get_mock_current_user

router = APIRouter()

logger = logging.getLogger(__name__)

# Store active room sessions
active_rooms: dict[str, dict] = {}

def generate_qr_code(room_slug: str) -> str:
    """Generate QR code for room and return as base64 string"""
    room_url = f"{settings.FRONTEND_URL}/room/{room_slug}" if hasattr(settings, 'FRONTEND_URL') else f"http://localhost:3000/room/{room_slug}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(room_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

async def generate_livekit_token(room_name: str, identity: str) -> str:
    """Generate a LiveKit access token for a room participant"""
    if not settings.LIVEKIT_URL or not settings.LIVEKIT_API_KEY:
        logger.warning("LiveKit not configured, returning placeholder token")
        return f"mock_token_for_{room_name}_{identity}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.LIVEKIT_URL}/access_token",
                json={
                    "room": room_name,
                    "identity": identity,
                    "name": identity,
                    "video": {"roomJoin": True, "canPublish": True, "canSubscribe": True},
                },
                headers={
                    "Authorization": f"Basic {base64.b64encode(f'{settings.LIVEKIT_API_KEY}:{settings.LIVEKIT_API_SECRET}'.encode()).decode()}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json().get("token", "")
    except Exception as e:
        logger.error(f"Failed to generate LiveKit token: {e}")
        return f"mock_token_for_{room_name}_{identity}"

@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: UserResponse = Depends(get_mock_current_user)
):
    """Create a new room"""
    try:
        # Generate unique slug
        slug = secrets.token_urlsafe(16)
        
        # Calculate expiration time
        expires_at = datetime.now(timezone.utc) + timedelta(hours=room_in.duration_hours)
        
        # Create room
        new_room = Room(
            slug=slug,
            name=room_in.name,
            status="active",
            expires_at=expires_at
        )
        
        db.add(new_room)
        await db.commit()
        await db.refresh(new_room)
        
        logger.info(f"Room created: {slug} by user: {current_user.email}")
        
        # Convert UUID to string for response
        return RoomResponse(
            id=str(new_room.id),
            slug=new_room.slug,
            name=new_room.name,
            status=new_room.status,
            expires_at=new_room.expires_at,
            created_at=new_room.created_at,
            created_by_id=str(new_room.created_by_id) if new_room.created_by_id else None
        )
    except Exception as e:
        logger.error(f"Error creating room: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create room: {str(e)}"
        )

@router.get("/", response_model=list[RoomListResponse])
async def list_rooms(
    db: AsyncSession = Depends(get_async_session)
):
    """List all rooms"""
    try:
        result = await db.execute(select(Room).order_by(Room.created_at.desc()))
        rooms = result.scalars().all()
        logger.info(f"Retrieved {len(rooms)} rooms")
        # Convert UUIDs to strings for response
        return [
            RoomListResponse(
                id=str(room.id),
                slug=room.slug,
                name=room.name,
                status=room.status,
                expires_at=room.expires_at,
                created_at=room.created_at
            )
            for room in rooms
        ]
    except Exception as e:
        logger.error(f"Error listing rooms: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list rooms: {str(e)}"
        )

@router.get("/{slug}", response_model=RoomDetailsResponse)
async def get_room(
    slug: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get room by slug with details"""
    result = await db.execute(select(Room).where(Room.slug == slug))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Generate QR code
    qr_code = generate_qr_code(room.slug)
    
    return RoomDetailsResponse(
        id=str(room.id),
        slug=room.slug,
        name=room.name,
        status=room.status.value if hasattr(room.status, 'value') else str(room.status),
        expires_at=room.expires_at,
        created_at=room.created_at,
        qr_code=qr_code
    )

@router.post("/{slug}/join")
async def join_room(
    slug: str,
    role: str = "candidate",
    db: AsyncSession = Depends(get_async_session)
):
    """Handle user joining a room"""
    # Get room
    result = await db.execute(select(Room).where(Room.slug == slug))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    if room.status != RoomStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is not active"
        )
    
    if datetime.now(timezone.utc) > room.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room has expired"
        )
    
    # Generate unique participant identity
    participant_id = secrets.token_urlsafe(16)
    
    # Create room participant
    participant = RoomParticipant(
        room_id=room.id,
        role=role,
        status=ParticipantStatus.CONNECTED
    )
    
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    # Generate LiveKit token
    livekit_token = await generate_livekit_token(
        room_name=room.slug,
        identity=f"{role}_{participant_id}"
    )
    
    return {
        "status": "success",
        "message": "Joined room successfully",
        "room_id": room.id,
        "participant_id": participant.id,
        "role": role,
        "livekit_token": livekit_token,
        "livekit_url": settings.LIVEKIT_URL,
        "room_slug": room.slug
    }

@router.post("/{slug}/end")
async def end_room(
    slug: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session)
):
    """End a room session"""
    result = await db.execute(select(Room).where(Room.slug == slug))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    room.status = RoomStatus.COMPLETED
    await db.commit()
    
    # Notify participants via LiveKit if configured
    if settings.LIVEKIT_URL and settings.LIVEKIT_API_KEY:
        background_tasks.add_task(notify_room_ended, room.slug)
    
    return {
        "status": "success",
        "message": "Room ended successfully"
    }

async def notify_room_ended(room_slug: str):
    """Notify all participants that the room has ended"""
    if not settings.LIVEKIT_URL or not settings.LIVEKIT_API_KEY:
        return
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.LIVEKIT_URL}/rooms/{room_slug}/disconnect",
                json={"reason": "room_ended"},
                headers={
                    "Authorization": f"Basic {base64.b64encode(f'{settings.LIVEKIT_API_KEY}:{settings.LIVEKIT_API_SECRET}'.encode()).decode()}",
                    "Content-Type": "application/json",
                },
                timeout=5.0,
            )
            logger.info(f"Notified participants in room {room_slug} that it has ended")
    except Exception as e:
        logger.error(f"Failed to notify room {room_slug} ended: {e}")

@router.get("/{slug}/participants")
async def get_room_participants(
    slug: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get all participants in a room"""
    result = await db.execute(select(Room).where(Room.slug == slug))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    result = await db.execute(
        select(RoomParticipant)
        .where(RoomParticipant.room_id == room.id)
        .order_by(RoomParticipant.joined_at.desc())
    )
    participants = result.scalars().all()
    
    return {
        "room_id": room.id,
        "participants": [
            {
                "id": p.id,
                "role": p.role,
                "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
                "joined_at": p.joined_at,
                "left_at": p.left_at,
            }
            for p in participants
        ]
    }

@router.post("/{slug}/start-video")
async def start_video_stream(
    slug: str,
    role: str = "candidate",
    db: AsyncSession = Depends(get_async_session)
):
    """Initiate video stream for a participant"""
    result = await db.execute(select(Room).where(Room.slug == slug))
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Generate unique participant identity
    participant_id = secrets.token_urlsafe(16)
    
    # Create room participant
    participant = RoomParticipant(
        room_id=room.id,
        role=role,
        status=ParticipantStatus.CONNECTED
    )
    
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    # Generate LiveKit token with video permissions
    livekit_token = await generate_livekit_token(
        room_name=room.slug,
        identity=f"{role}_{participant_id}"
    )
    
    return {
        "status": "success",
        "message": "Video stream initialized",
        "room_id": room.id,
        "participant_id": participant.id,
        "role": role,
        "livekit_token": livekit_token,
        "livekit_url": settings.LIVEKIT_URL,
        "room_slug": room.slug,
        "identity": f"{role}_{participant_id}"
    }