"""
Routes WebSocket pour communication temps réel
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

router = APIRouter()


class ConnectionManager:
    """
    Gestionnaire de connexions WebSocket
    Gère les connexions multiples et le broadcast de messages
    """

    def __init__(self):
        # Ensemble des connexions actives
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Accepter une nouvelle connexion"""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"OK WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Déconnecter un client"""
        self.active_connections.discard(websocket)
        print(f"❌ WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Envoyer un message à un client spécifique"""
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """
        Broadcaster un message à tous les clients connectés
        Gère automatiquement les connexions fermées
        """
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.add(connection)

        # Nettoyer les connexions mortes
        for connection in disconnected:
            self.disconnect(connection)


# Instance globale du gestionnaire
manager = ConnectionManager()


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    """
    Endpoint WebSocket principal pour communication temps réel

    Messages supportés:
    - **new_event**: Nouvel événement détecté
    - **frame_update**: Mise à jour frame caméra
    - **camera_status**: Changement statut caméra
    - **system_alert**: Alerte système

    Format des messages:
    ```json
    {
        "type": "new_event",
        "data": { ... }
    }
    ```
    """
    await manager.connect(websocket)

    try:
        # Envoyer un message de bienvenue
        await manager.send_personal_message(
            {
                "type": "connected",
                "message": "Connected to Sentinel IA WebSocket",
                "timestamp": asyncio.get_event_loop().time(),
            },
            websocket
        )

        # Boucle de réception des messages
        while True:
            # Recevoir les messages du client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type")

                # Traiter les différents types de messages
                if message_type == "ping":
                    # Répondre au heartbeat
                    await manager.send_personal_message(
                        {"type": "pong", "timestamp": asyncio.get_event_loop().time()},
                        websocket
                    )

                elif message_type == "subscribe":
                    # TODO: Implémenter la souscription à des événements spécifiques
                    channels = message.get("channels", [])
                    await manager.send_personal_message(
                        {"type": "subscribed", "channels": channels},
                        websocket
                    )

                elif message_type == "unsubscribe":
                    # TODO: Implémenter la désouscription
                    channels = message.get("channels", [])
                    await manager.send_personal_message(
                        {"type": "unsubscribed", "channels": channels},
                        websocket
                    )

                else:
                    # Message non reconnu
                    await manager.send_personal_message(
                        {"type": "error", "message": f"Unknown message type: {message_type}"},
                        websocket
                    )

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {"type": "error", "message": "Invalid JSON"},
                    websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Fonctions utilitaires pour broadcaster depuis d'autres modules
async def broadcast_new_event(event: dict):
    """Broadcaster un nouvel événement à tous les clients"""
    await manager.broadcast({
        "type": "new_event",
        "data": event
    })


async def broadcast_frame_update(camera_id: str, frame_data: str):
    """Broadcaster une mise à jour de frame"""
    await manager.broadcast({
        "type": "frame_update",
        "camera_id": camera_id,
        "data": frame_data
    })


async def broadcast_camera_status(camera_id: str, status: str):
    """Broadcaster un changement de statut caméra"""
    await manager.broadcast({
        "type": "camera_status",
        "camera_id": camera_id,
        "status": status
    })


async def broadcast_system_alert(alert: dict):
    """Broadcaster une alerte système"""
    await manager.broadcast({
        "type": "system_alert",
        "data": alert
    })
