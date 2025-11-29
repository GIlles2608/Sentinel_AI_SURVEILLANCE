"""
Routes de gestion des sessions utilisateur
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.services import session_service
from app.core.token_blacklist import token_blacklist


router = APIRouter()


@router.get("/sessions")
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    active_only: bool = True
):
    """
    Récupérer toutes les sessions actives de l'utilisateur connecté

    - **active_only**: Filtrer uniquement les sessions actives (défaut: true)

    Returns la liste des sessions avec leurs métadonnées
    """
    sessions = await session_service.get_user_sessions(
        db=db,
        user_id=current_user.id,
        active_only=active_only
    )

    return {
        "sessions": [session.to_dict() for session in sessions],
        "total": len(sessions)
    }


@router.delete("/sessions/{session_id}")
async def revoke_session_by_id(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Révoquer une session spécifique

    - **session_id**: ID de la session à révoquer

    La session sera révoquée et le token blacklisté
    """
    # Récupérer la session
    session = await session_service.get_session_by_jti(db, session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Vérifier que la session appartient à l'utilisateur
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revoke your own sessions"
        )

    # Blacklister le token si la session est encore active
    if session.is_active:
        token_blacklist.blacklist_token(session.token_jti, session.expires_at)

    # Révoquer la session
    revoked = await session_service.revoke_session(db, session_id)

    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return {
        "message": "Session revoked successfully",
        "session_id": session_id
    }


@router.delete("/sessions")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    except_current: bool = True
):
    """
    Révoquer toutes les sessions de l'utilisateur

    - **except_current**: Garder la session actuelle active (défaut: true)

    Utile pour déconnecter tous les autres appareils
    """
    # Récupérer toutes les sessions actives
    sessions = await session_service.get_user_sessions(
        db=db,
        user_id=current_user.id,
        active_only=True
    )

    # Blacklister tous les tokens
    current_jti = None  # TODO: extraire du token actuel si except_current
    revoked_count = 0

    for session in sessions:
        if except_current and session.token_jti == current_jti:
            continue

        # Blacklister le token
        token_blacklist.blacklist_token(session.token_jti, session.expires_at)
        revoked_count += 1

    # Révoquer toutes les sessions sauf la courante
    revoked = await session_service.revoke_all_user_sessions(
        db=db,
        user_id=current_user.id,
        except_jti=current_jti if except_current else None
    )

    return {
        "message": f"Revoked {revoked} sessions",
        "revoked_count": revoked,
        "tokens_blacklisted": revoked_count
    }


@router.get("/sessions/stats")
async def get_session_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtenir des statistiques sur les sessions utilisateur

    Returns le nombre de sessions actives, totales, etc.
    """
    all_sessions = await session_service.get_user_sessions(
        db=db,
        user_id=current_user.id,
        active_only=False
    )

    active_sessions = [s for s in all_sessions if s.is_active]
    revoked_sessions = [s for s in all_sessions if not s.is_active]

    return {
        "total_sessions": len(all_sessions),
        "active_sessions": len(active_sessions),
        "revoked_sessions": len(revoked_sessions),
        "blacklist_stats": token_blacklist.get_stats()
    }
