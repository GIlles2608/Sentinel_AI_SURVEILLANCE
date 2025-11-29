"""
Session SQLite async avec SQLAlchemy
Compatible avec la base users.db existante
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import event
from typing import AsyncGenerator

from app.core.config import settings
from app.models import Base


# Créer l'engine async SQLite
engine = create_async_engine(
    settings.get_database_url(),
    echo=settings.DEBUG,  # Log SQL queries en mode debug
    future=True,
)


# Activer les foreign keys pour SQLite
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Active les foreign keys pour SQLite"""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Session maker async
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """
    Initialiser la base de données
    Crée les tables si elles n'existent pas
    """
    async with engine.begin() as conn:
        # Créer toutes les tables définies dans Base
        await conn.run_sync(Base.metadata.create_all)
        print("OK Database tables created/verified")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency pour obtenir une session de base de données

    Usage dans les routes:
    ```python
    @router.get("/users")
    async def get_users(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))
        users = result.scalars().all()
        return users
    ```
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """
    Fermer proprement les connexions DB
    À appeler au shutdown de l'application
    """
    await engine.dispose()
    print("OK Database connections closed")
