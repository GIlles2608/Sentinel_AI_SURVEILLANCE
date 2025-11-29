"""
Routes pour les statistiques globales
"""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats() -> Dict[str, Any]:
    """
    Récupérer les statistiques du dashboard

    Returns statistiques globales pour l'affichage dashboard:
    - Nombre de caméras actives
    - Nombre d'événements aujourd'hui
    - Nombre d'événements non traités
    - Statistiques de performance
    """
    # TODO: Implémenter les statistiques dashboard
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Dashboard stats not yet implemented"
    )


@router.get("/system")
async def get_system_stats() -> Dict[str, Any]:
    """
    Récupérer les statistiques système

    Returns métriques système:
    - Utilisation CPU
    - Utilisation RAM
    - Utilisation GPU
    - Uptime
    - Version
    """
    # TODO: Implémenter les statistiques système
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="System stats not yet implemented"
    )


@router.get("/performance")
async def get_performance_stats() -> Dict[str, Any]:
    """
    Récupérer les statistiques de performance

    Returns métriques de performance:
    - FPS moyen par caméra
    - Latence de détection
    - Nombre de frames traitées
    - Taux d'erreur
    """
    # TODO: Implémenter les statistiques de performance
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Performance stats not yet implemented"
    )
