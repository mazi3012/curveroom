# Curve Room - Spatial Technical Interview Platform

Curve Room is a spatial technical interview and proctoring platform designed to eliminate online cheating during remote evaluations. By leveraging multi-angle device streaming and client-side edge computer vision, the platform provides automated behavioral telemetry and real-time trust scores to interviewers without invasive manual oversight.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Curve Room Platform                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐          ┌──────────────┐         ┌─────────────┐ │
│  │   Frontend   │─────────▶│   Backend    │────────▶│   Redis     │ │
│  │  (Next.js)   │  API     │  (FastAPI)   │  WS   │  (Cache)    │ │
│  └──────────────┘          └──────────────┘         └─────────────┘ │
│                                   │                                 │
│                                   ▼                                 │
│                          ┌──────────────┐                           │
│                          │ PostgreSQL   │                           │
│                          │  (Database)  │                           │
│                          └──────────────┘                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          Client-Side Features                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐          ┌──────────────┐                         │
│  │ Primary Feed │          │Secondary Feed│                         │
│  │ (Laptop Cam) │          │(Mobile Cam)  │                         │
│  └──────────────┘          └──────────────┘                         │
│         │                          │                                │
│         ▼                          ▼                                │
│  ┌────────────────────────────────────────┐                         │
│  │      MediaPipe (Edge CV)               │                         │
│  │  - Head Gaze Tracking                  │                         │
│  │  - Hand/Object Detection               │                         │
│  │  - Multiple Face Detection             │                         │
│  └────────────────────────────────────────┘                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15
- **Cache/State**: Redis 7
- **Authentication**: JWT tokens
- **Real-time**: WebSocket (LiveKit integration)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time Video**: LiveKit Client SDK
- **Computer Vision**: MediaPipe (client-side)

### DevOps
- **Containerization**: Docker + Docker Compose
- **Build**: npm / pip

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Quick Start

1. **Clone and install dependencies**

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Start Docker services**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

3. **Run database migrations**

```bash
# Run the init script to create tables
docker exec -i curveroom_postgres psql -U curveroom -d curveroom -f /docker-entrypoint-initdb.d/init.sql
```

4. **Start backend server**

```bash
cd backend
uvicorn main:app --reload --port 8000
```

5. **Start frontend**

```bash
cd frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
curveroom/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── rooms.py
│   │   │       └── telemetry.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── room.py
│   │   │   ├── room_participant.py
│   │   │   └── event.py
│   │   └── schemas/
│   │       ├── auth.py
│   │       ├── room.py
│   │       └── telemetry.py
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── utils.ts
│   │   └── components/
│   │       └── ui/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Phased Development Plan

### Phase 1: Core Infrastructure (Current)
- [x] Monorepo structure setup
- [x] Docker Compose configuration
- [x] PostgreSQL & Redis setup
- [x] Backend API structure
- [x] Frontend project setup
- [ ] JWT authentication
- [ ] Database models and schemas

### Phase 2: Room Management API
- [ ] Room creation and management
- [ ] Role-based access control
- [ ] Token-based access URLs

### Phase 3: LiveKit Integration
- [ ] Video streaming (Primary + Secondary)
- [ ] QR code generation for mobile
- [ ] Room participant management

### Phase 4: Edge Computer Vision
- [ ] MediaPipe integration
- [ ] Head gaze tracking
- [ ] Behavior event detection

### Phase 5: Telemetry Engine
- [ ] Real-time event ingestion
- [ ] Trust score calculation
- [ ] WebSocket real-time updates

### Phase 6: Dashboard
- [ ] Interviewer dashboard
- [ ] Multi-stream view
- [ ] Event timeline

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://curveroom:curveroom123@localhost:5432/curveroom
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:3000
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME="Curve Room"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Next Steps

1. Install dependencies (`npm install` in frontend, `pip install -r requirements.txt` in backend)
2. Run Docker Compose to start database services
3. Implement JWT authentication
4. Build room management endpoints
5. Integrate LiveKit for video streaming
6. Add MediaPipe for edge computer vision

## License

MIT License - see LICENSE file for details.