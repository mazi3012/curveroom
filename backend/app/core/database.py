from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

# Create async engine for PostgreSQL (Neon)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)

# Session factory
async_session = async_sessionmaker(
    engine, 
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_async_session() -> AsyncSession:
    """Dependency to get async database session with error handling"""
    async with async_session() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {str(e)}")
            await session.rollback()
            raise
        finally:
            await session.close()