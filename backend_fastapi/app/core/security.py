"""
Module de sécurité pour JWT, hash de mots de passe et chiffrement de credentials
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import JWTError, jwt
import bcrypt
from cryptography.fernet import Fernet
import base64
import uuid
import hashlib
from loguru import logger

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifier si un mot de passe correspond au hash

    Args:
        plain_password: Mot de passe en clair
        hashed_password: Hash bcrypt du mot de passe

    Returns:
        True si le mot de passe correspond
    """
    # Convertir les strings en bytes pour bcrypt
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """
    Hasher un mot de passe avec bcrypt

    Args:
        password: Mot de passe en clair

    Returns:
        Hash bcrypt du mot de passe
    """
    # Convertir en bytes et générer le hash
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, str, datetime]:
    """
    Créer un token JWT

    Args:
        data: Données à encoder dans le token (user_id, username, etc.)
        expires_delta: Durée de validité du token (optionnel)

    Returns:
        Tuple (token_jwt, jti, expires_at)
    """
    to_encode = data.copy()

    # Générer un JTI unique (JWT ID) pour identifier ce token
    jti = str(uuid.uuid4())

    # Définir l'expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Ajouter les claims standard
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued at
        "jti": jti,  # JWT ID unique
    })

    # Encoder le token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt, jti, expire


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, str, datetime]:
    """
    Créer un refresh token JWT (durée de vie plus longue)

    Args:
        data: Données à encoder dans le token
        expires_delta: Durée de validité du token (optionnel)

    Returns:
        Tuple (token_jwt, jti, expires_at)
    """
    to_encode = data.copy()

    # Générer un JTI unique
    jti = str(uuid.uuid4())

    # Refresh token a une durée de vie plus longue
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",  # Marquer comme refresh token
        "jti": jti,  # JWT ID unique
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt, jti, expire


def decode_token(token: str, check_blacklist: bool = True) -> Optional[Dict[str, Any]]:
    """
    Décoder et valider un token JWT

    Args:
        token: Token JWT à décoder
        check_blacklist: Vérifier si le token est blacklisté (défaut: True)

    Returns:
        Payload du token si valide, None sinon
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Vérifier la blacklist si demandé
        if check_blacklist:
            # Import ici pour éviter les imports circulaires
            from app.core.token_blacklist import token_blacklist

            jti = payload.get("jti")
            if jti and token_blacklist.is_blacklisted(jti):
                logger.warning(f"Attempted use of blacklisted token: {jti[:8]}...")
                return None

        return payload

    except JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        return None


def verify_token(token: str) -> bool:
    """
    Vérifier la validité d'un token JWT

    Args:
        token: Token JWT à vérifier

    Returns:
        True si le token est valide
    """
    payload = decode_token(token)
    return payload is not None


def get_token_subject(token: str) -> Optional[str]:
    """
    Extraire le sujet (user_id) d'un token JWT

    Args:
        token: Token JWT

    Returns:
        User ID si le token est valide, None sinon
    """
    payload = decode_token(token)
    if payload:
        return payload.get("sub")
    return None


def hash_token(token: str) -> str:
    """
    Hasher un token pour stockage sécurisé en base de données

    Utilise SHA-256 pour hasher le token. Le hash peut être utilisé
    pour vérifier qu'un token correspond sans stocker le token en clair.

    Args:
        token: Token JWT à hasher

    Returns:
        Hash SHA-256 du token
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


# ============================================
# Chiffrement de credentials (pour caméras)
# ============================================

def _get_encryption_key() -> bytes:
    """
    Génère ou récupère la clé de chiffrement depuis SECRET_KEY

    Returns:
        Clé de chiffrement Fernet
    """
    # Utiliser SECRET_KEY comme base, la hacher pour obtenir 32 bytes
    key_base = settings.SECRET_KEY.encode('utf-8')
    # Prendre les 32 premiers bytes du hash bcrypt (ou padding si nécessaire)
    key = base64.urlsafe_b64encode(key_base[:32].ljust(32, b'0'))
    return key


def encrypt_credential(plain_text: str) -> str:
    """
    Chiffre un credential (username/password) pour stockage sécurisé

    Args:
        plain_text: Texte en clair à chiffrer

    Returns:
        Texte chiffré en base64
    """
    if not plain_text:
        return ""

    key = _get_encryption_key()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(plain_text.encode('utf-8'))
    return encrypted.decode('utf-8')


def decrypt_credential(encrypted_text: str) -> str:
    """
    Déchiffre un credential stocké

    Args:
        encrypted_text: Texte chiffré

    Returns:
        Texte en clair
    """
    if not encrypted_text:
        return ""

    try:
        key = _get_encryption_key()
        logger.debug(f"Decryption key (first 16 chars): {key[:16]}")
        logger.debug(f"Encrypted text length: {len(encrypted_text)}")
        logger.debug(f"Encrypted text (first 32 chars): {encrypted_text[:32]}")

        fernet = Fernet(key)
        decrypted = fernet.decrypt(encrypted_text.encode('utf-8'))
        result = decrypted.decode('utf-8')

        logger.debug(f"Decryption successful, result length: {len(result)}")
        return result
    except Exception as e:
        logger.error(f"Decryption error: {e}")
        logger.error(f"Encrypted text was: {encrypted_text[:50]}...")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return ""
