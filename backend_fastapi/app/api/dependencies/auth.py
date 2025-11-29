"""
Dependencies pour l'authentification JWT
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import decode_token
from app.services.user_service import get_user_by_id
from app.models.user import User


# Security scheme pour JWT Bearer
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency pour récupérer l'utilisateur connecté depuis le token JWT

    Usage dans les routes:
    ```python
    @router.get("/protected")
    async def protected_route(user: User = Depends(get_current_user)):
        return {"message": f"Hello {user.username}"}
    ```

    Args:
        credentials: Token JWT depuis le header Authorization
        db: Session de base de données

    Returns:
        Utilisateur connecté

    Raises:
        HTTPException 401 si token invalide ou utilisateur non trouvé
    """
    # Extraire le token
    token = credentials.credentials

    # Décoder le token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extraire le user_id du payload
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Récupérer l'utilisateur depuis la DB
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency pour vérifier que l'utilisateur est actif

    Usage:
    ```python
    @router.get("/active-only")
    async def active_only(user: User = Depends(get_current_active_user)):
        return {"message": "Only active users here"}
    ```

    Args:
        current_user: Utilisateur connecté (depuis get_current_user)

    Returns:
        Utilisateur actif

    Raises:
        HTTPException 403 si utilisateur inactif
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return current_user


def require_role(required_role: str):
    """
    Dependency factory pour vérifier le rôle de l'utilisateur

    Usage:
    ```python
    @router.delete("/admin-only")
    async def admin_only(user: User = Depends(require_role("admin"))):
        return {"message": "Admin access granted"}
    ```

    Args:
        required_role: Rôle requis (admin, operator, viewer)

    Returns:
        Dependency function
    """
    async def check_role(user: User = Depends(get_current_active_user)) -> User:
        # Hiérarchie des rôles
        role_hierarchy = {
            "admin": 3,
            "operator": 2,
            "viewer": 1,
        }

        user_level = role_hierarchy.get(user.role, 0)
        required_level = role_hierarchy.get(required_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )

        return user

    return check_role
