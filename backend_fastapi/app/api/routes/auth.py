"""
Routes d'authentification
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta, datetime

from app.schemas.auth import LoginRequest, LoginResponse, RefreshTokenRequest
from app.schemas.user import UserResponse
from app.db.session import get_db
from app.services.user_service import authenticate_user, get_user_by_id
from app.services.session_service import create_session, revoke_session, delete_session
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.core.token_blacklist import token_blacklist
from app.api.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Connexion utilisateur avec JWT

    - **username**: Nom d'utilisateur (min 3 caractères)
    - **password**: Mot de passe (min 6 caractères)
    - **remember_me**: Garder la session active plus longtemps

    Returns un access_token JWT et les informations utilisateur
    """
    # Authentifier l'utilisateur
    user = await authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Déterminer la durée du token
    if credentials.remember_me:
        # Token plus long si remember_me
        access_token_expires = timedelta(days=7)
    else:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Créer le token JWT (retourne maintenant token, jti, expires_at)
    access_token, access_jti, access_expires_at = create_access_token(
        data={"sub": user.id, "username": user.username, "role": user.role},
        expires_delta=access_token_expires
    )

    # Créer le refresh token
    refresh_token, refresh_jti, refresh_expires_at = create_refresh_token(
        data={"sub": user.id}
    )

    # Extraire user agent et IP
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    # Créer la session en base de données
    await create_session(
        db=db,
        user_id=user.id,
        token_jti=access_jti,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=access_expires_at,
        user_agent=user_agent,
        ip_address=ip_address
    )

    # Mettre à jour last_login
    user.last_login = datetime.utcnow()
    await db.commit()

    # Retourner le token et les infos utilisateur
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user.to_dict()
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Rafraîchir le token JWT

    - **refresh_token**: Token de rafraîchissement

    Returns un nouveau access_token
    """
    # Décoder le refresh token
    payload = decode_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Vérifier que c'est bien un refresh token
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Récupérer le user_id
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Récupérer l'utilisateur
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Créer un nouveau access token
    access_token = create_access_token(
        data={"sub": user.id, "username": user.username, "role": user.role}
    )

    # Créer un nouveau refresh token
    new_refresh_token = create_refresh_token(
        data={"sub": user.id}
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user.to_dict()
    )


@router.post("/logout")
async def logout(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Déconnexion utilisateur

    - Blackliste le token JWT
    - Révoque la session en base de données
    - Empêche toute utilisation future du token

    Nécessite un token JWT valide dans le header Authorization
    """
    # Décoder le token pour extraire le JTI
    payload = decode_token(token.credentials, check_blacklist=False)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    exp = payload.get("exp")

    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing JTI",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convertir timestamp exp en datetime
    expires_at = datetime.fromtimestamp(exp) if exp else datetime.utcnow()

    # Blacklister le token
    token_blacklist.blacklist_token(jti, expires_at)

    # Révoquer la session en base de données
    await revoke_session(db, jti)

    return {
        "message": "Logout successful",
        "detail": "Token has been blacklisted and session revoked"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Récupérer l'utilisateur connecté

    Nécessite un token JWT valide dans le header Authorization
    """
    return UserResponse(**current_user.to_dict())


@router.get("/verify")
async def verify_token_endpoint(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Vérifier la validité d'un token JWT

    Returns l'utilisateur si le token est valide
    """
    # Décoder le token
    payload = decode_token(token.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Récupérer le user_id
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Récupérer l'utilisateur
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "valid": True,
        "user": user.to_dict()
    }
