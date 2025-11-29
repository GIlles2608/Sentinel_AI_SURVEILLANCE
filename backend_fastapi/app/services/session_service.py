"""
Service de gestion des sessions utilisateur
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
from typing import Optional, List
from loguru import logger

from app.models.session import Session
from app.core.security import hash_token


async def create_session(
    db: AsyncSession,
    user_id: str,
    token_jti: str,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: datetime,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> Session:
    """
    Créer une nouvelle session utilisateur

    Args:
        db: Session de base de données
        user_id: ID de l'utilisateur
        token_jti: JWT ID du token d'accès
        access_token: Token JWT (sera hashé avant stockage)
        refresh_token: Refresh token (sera hashé avant stockage)
        expires_at: Date d'expiration du token
        user_agent: User-Agent du client
        ip_address: Adresse IP du client

    Returns:
        Session créée
    """
    # Hasher les tokens pour ne pas les stocker en clair
    access_token_hash = hash_token(access_token)
    refresh_token_hash = hash_token(refresh_token) if refresh_token else None

    session = Session(
        user_id=user_id,
        token_jti=token_jti,
        access_token_hash=access_token_hash,
        refresh_token_hash=refresh_token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
        is_active=True
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Session created for user {user_id} (JTI: {token_jti[:8]}...)")
    return session


async def get_session_by_jti(
    db: AsyncSession,
    jti: str
) -> Optional[Session]:
    """
    Récupérer une session par son JTI

    Args:
        db: Session de base de données
        jti: JWT ID

    Returns:
        Session si trouvée, None sinon
    """
    result = await db.execute(
        select(Session).where(Session.token_jti == jti)
    )
    return result.scalar_one_or_none()


async def get_user_sessions(
    db: AsyncSession,
    user_id: str,
    active_only: bool = True
) -> List[Session]:
    """
    Récupérer toutes les sessions d'un utilisateur

    Args:
        db: Session de base de données
        user_id: ID de l'utilisateur
        active_only: Ne retourner que les sessions actives

    Returns:
        Liste des sessions
    """
    query = select(Session).where(Session.user_id == user_id)

    if active_only:
        query = query.where(Session.is_active == True)

    result = await db.execute(query.order_by(Session.created_at.desc()))
    return list(result.scalars().all())


async def revoke_session(
    db: AsyncSession,
    jti: str
) -> bool:
    """
    Révoquer une session

    Args:
        db: Session de base de données
        jti: JWT ID de la session à révoquer

    Returns:
        True si révoquée, False si non trouvée
    """
    session = await get_session_by_jti(db, jti)
    if not session:
        return False

    session.is_active = False
    session.revoked_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Session revoked: {jti[:8]}...")
    return True


async def revoke_all_user_sessions(
    db: AsyncSession,
    user_id: str,
    except_jti: Optional[str] = None
) -> int:
    """
    Révoquer toutes les sessions d'un utilisateur

    Args:
        db: Session de base de données
        user_id: ID de l'utilisateur
        except_jti: JTI à exclure de la révocation (session actuelle)

    Returns:
        Nombre de sessions révoquées
    """
    sessions = await get_user_sessions(db, user_id, active_only=True)

    revoked_count = 0
    for session in sessions:
        if except_jti and session.token_jti == except_jti:
            continue

        session.is_active = False
        session.revoked_at = datetime.utcnow()
        revoked_count += 1

    await db.commit()

    logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
    return revoked_count


async def delete_session(
    db: AsyncSession,
    jti: str
) -> bool:
    """
    Supprimer définitivement une session

    Args:
        db: Session de base de données
        jti: JWT ID de la session

    Returns:
        True si supprimée, False si non trouvée
    """
    result = await db.execute(
        delete(Session).where(Session.token_jti == jti)
    )
    await db.commit()

    deleted = result.rowcount > 0
    if deleted:
        logger.info(f"Session deleted: {jti[:8]}...")

    return deleted


async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """
    Nettoyer les sessions expirées

    Args:
        db: Session de base de données

    Returns:
        Nombre de sessions supprimées
    """
    now = datetime.utcnow()

    result = await db.execute(
        delete(Session).where(Session.expires_at < now)
    )
    await db.commit()

    deleted = result.rowcount
    if deleted > 0:
        logger.info(f"Cleaned up {deleted} expired sessions")

    return deleted


async def update_session_activity(
    db: AsyncSession,
    jti: str
) -> bool:
    """
    Mettre à jour la dernière activité d'une session

    Args:
        db: Session de base de données
        jti: JWT ID de la session

    Returns:
        True si mise à jour réussie
    """
    session = await get_session_by_jti(db, jti)
    if not session:
        return False

    session.last_activity = datetime.utcnow()
    await db.commit()

    return True
