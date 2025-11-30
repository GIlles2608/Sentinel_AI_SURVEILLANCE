/**
 * Service WebSocket pour la communication temps réel
 */
import { io, Socket } from 'socket.io-client';
import type { Camera, Event, CameraStats } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private connectionErrorLogged = false;

  constructor() {
    // Ne pas se connecter si WebSocket est désactivé
    if (import.meta.env.VITE_WS_DISABLED === 'true') {
      console.log('WebSocket disabled via VITE_WS_DISABLED');
      return;
    }

    // Ne pas se connecter automatiquement en développement
    // La connexion sera initiée quand le backend sera disponible
    if (import.meta.env.PROD) {
      this.connect();
    }
  }

  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const token = localStorage.getItem('token');

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
      // Ne logger qu'une seule fois pour éviter de spammer la console
      if (!this.connectionErrorLogged) {
        console.warn('WebSocket connection error: Backend non disponible. Les fonctionnalités temps réel seront désactivées.');
        this.connectionErrorLogged = true;
      }
    });

    // Événements métier
    this.socket.on('camera_status', (data: { camera: Camera }) => {
      this.emit('camera_status', data);
    });

    this.socket.on('camera_stats', (data: CameraStats) => {
      this.emit('camera_stats', data);
    });

    this.socket.on('detection', (data: any) => {
      this.emit('detection', data);
    });

    this.socket.on('event', (data: Event) => {
      this.emit('event', data);
    });

    this.socket.on('notification', (data: any) => {
      this.emit('notification', data);
    });

    this.socket.on('error', (data: any) => {
      console.error('WebSocket error:', data);
      this.emit('error', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  /**
   * Abonner à un événement
   */
  on(event: string, handler: WebSocketEventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Retourner fonction de désabonnement
    return () => this.off(event, handler);
  }

  /**
   * Désabonner d'un événement
   */
  off(event: string, handler: WebSocketEventHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Émettre un événement aux handlers locaux
   */
  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Envoyer un message au serveur
   */
  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * S'abonner aux updates d'une caméra
   */
  subscribeToCameraUpdates(cameraId: string) {
    this.send('subscribe_camera', { camera_id: cameraId });
  }

  /**
   * Se désabonner des updates d'une caméra
   */
  unsubscribeFromCameraUpdates(cameraId: string) {
    this.send('unsubscribe_camera', { camera_id: cameraId });
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

export default wsService;
