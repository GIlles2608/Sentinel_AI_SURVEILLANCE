"""
Système de blacklist pour tokens JWT révoqués

Utilise un dict en mémoire pour stocker les tokens blacklistés.
Pour une solution production, utiliser Redis.
"""
from datetime import datetime
from typing import Set, Dict
from loguru import logger


class TokenBlacklist:
    """
    Gère la blacklist des tokens JWT révoqués

    Stocke les tokens en mémoire. En production, utiliser Redis pour
    la persistance et le partage entre instances.
    """

    def __init__(self):
        # Set de JTI (JWT ID) blacklistés
        self._blacklisted_jtis: Set[str] = set()

        # Dict pour stocker l'expiration des tokens (nettoyage automatique)
        self._jti_expiration: Dict[str, datetime] = {}

        logger.info("TokenBlacklist initialized (in-memory)")

    def blacklist_token(self, jti: str, expires_at: datetime):
        """
        Ajouter un token à la blacklist

        Args:
            jti: JWT ID (unique identifier du token)
            expires_at: Date d'expiration du token
        """
        self._blacklisted_jtis.add(jti)
        self._jti_expiration[jti] = expires_at
        logger.info(f"Token {jti[:8]}... blacklisted until {expires_at}")

    def is_blacklisted(self, jti: str) -> bool:
        """
        Vérifier si un token est blacklisté

        Args:
            jti: JWT ID à vérifier

        Returns:
            True si le token est blacklisté
        """
        # Nettoyer les tokens expirés
        self._cleanup_expired()

        return jti in self._blacklisted_jtis

    def remove_from_blacklist(self, jti: str):
        """
        Retirer un token de la blacklist (rarement utilisé)

        Args:
            jti: JWT ID à retirer
        """
        if jti in self._blacklisted_jtis:
            self._blacklisted_jtis.discard(jti)
            self._jti_expiration.pop(jti, None)
            logger.info(f"Token {jti[:8]}... removed from blacklist")

    def _cleanup_expired(self):
        """
        Nettoyer les tokens expirés de la blacklist

        Les tokens expirés ne sont plus valides même s'ils ne sont pas
        blacklistés, donc on peut les retirer pour économiser de la mémoire.
        """
        now = datetime.utcnow()
        expired_jtis = [
            jti for jti, exp_date in self._jti_expiration.items()
            if exp_date < now
        ]

        for jti in expired_jtis:
            self._blacklisted_jtis.discard(jti)
            self._jti_expiration.pop(jti, None)

        if expired_jtis:
            logger.debug(f"Cleaned up {len(expired_jtis)} expired tokens from blacklist")

    def get_stats(self) -> dict:
        """
        Obtenir des statistiques sur la blacklist

        Returns:
            Dict avec le nombre de tokens blacklistés
        """
        self._cleanup_expired()
        return {
            "blacklisted_count": len(self._blacklisted_jtis),
            "oldest_expiration": min(self._jti_expiration.values()) if self._jti_expiration else None,
            "newest_expiration": max(self._jti_expiration.values()) if self._jti_expiration else None,
        }


# Instance globale (singleton)
token_blacklist = TokenBlacklist()
