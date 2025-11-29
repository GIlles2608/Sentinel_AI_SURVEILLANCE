/**
 * Service WebRTC pour le streaming vidéo en temps réel
 * Utilise simple-peer pour simplifier la gestion WebRTC
 */
import SimplePeer from 'simple-peer';
import type { WebRTCConfig } from '../types';

// Type pour les événements WebRTC
export type WebRTCEventHandler = (data: any) => void;

// Configuration par défaut WebRTC
const DEFAULT_CONFIG: RTCConfiguration = {
  iceServers: [
    // Serveurs STUN publics pour la découverte d'adresses IP
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Classe pour gérer une connexion WebRTC vers une caméra
 */
export class WebRTCConnection {
  // Instance simple-peer pour la connexion P2P
  private peer: SimplePeer.Instance | null = null;

  // ID de la caméra connectée
  private cameraId: string;

  // Handlers pour les événements
  private eventHandlers: Map<string, Set<WebRTCEventHandler>> = new Map();

  // Configuration WebRTC
  private config: RTCConfiguration;

  // État de la connexion
  private connected: boolean = false;

  constructor(cameraId: string, config?: Partial<WebRTCConfig>) {
    this.cameraId = cameraId;

    // Fusionner la config par défaut avec la config fournie
    this.config = {
      ...DEFAULT_CONFIG,
      ...(config?.iceServers ? { iceServers: config.iceServers } : {}),
    };
  }

  /**
   * Initialiser la connexion WebRTC en tant qu'initiateur
   * @param signalData Données de signalisation du serveur (optionnel)
   */
  async connect(signalData?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Créer l'instance SimplePeer
        // initiator: false = on reçoit l'offre du serveur
        // trickle: true = envoyer les ICE candidates au fur et à mesure
        this.peer = new SimplePeer({
          initiator: !signalData, // true si pas de signal (on est l'initiateur)
          trickle: true,
          config: this.config,
        });

        // Si on a déjà des données de signalisation, les envoyer
        if (signalData) {
          this.peer.signal(signalData);
        }

        // Écouter l'événement 'signal' pour échanger les données SDP/ICE
        this.peer.on('signal', (data) => {
          console.log('WebRTC signal:', data);
          this.emit('signal', { cameraId: this.cameraId, signal: data });
        });

        // Écouter l'événement 'connect' quand la connexion est établie
        this.peer.on('connect', () => {
          console.log('WebRTC connected to camera:', this.cameraId);
          this.connected = true;
          this.emit('connected', { cameraId: this.cameraId });
          resolve();
        });

        // Écouter l'événement 'stream' pour recevoir le flux vidéo
        this.peer.on('stream', (stream: MediaStream) => {
          console.log('WebRTC stream received from camera:', this.cameraId);
          this.emit('stream', { cameraId: this.cameraId, stream });
        });

        // Écouter l'événement 'data' pour recevoir des données arbitraires
        this.peer.on('data', (data: Buffer) => {
          const message = JSON.parse(data.toString());
          this.emit('data', { cameraId: this.cameraId, data: message });
        });

        // Écouter l'événement 'error' pour gérer les erreurs
        this.peer.on('error', (error: Error) => {
          console.error('WebRTC error:', error);
          this.emit('error', { cameraId: this.cameraId, error });
          reject(error);
        });

        // Écouter l'événement 'close' quand la connexion se ferme
        this.peer.on('close', () => {
          console.log('WebRTC connection closed for camera:', this.cameraId);
          this.connected = false;
          this.emit('disconnected', { cameraId: this.cameraId });
        });

        // Si on n'a pas de signalData, la connexion sera établie après échange de signaux
        if (signalData) {
          // Timeout si la connexion prend trop de temps
          setTimeout(() => {
            if (!this.connected) {
              reject(new Error('WebRTC connection timeout'));
            }
          }, 10000); // 10 secondes
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Traiter les données de signalisation reçues du serveur
   * @param signalData Données SDP ou ICE candidate
   */
  signal(signalData: any): void {
    if (this.peer) {
      this.peer.signal(signalData);
    } else {
      console.warn('Peer not initialized, cannot signal');
    }
  }

  /**
   * Envoyer des données au serveur via le data channel
   * @param data Données à envoyer (sera stringifié en JSON)
   */
  send(data: any): void {
    if (this.peer && this.connected) {
      this.peer.send(JSON.stringify(data));
    } else {
      console.warn('Peer not connected, cannot send data');
    }
  }

  /**
   * Fermer la connexion WebRTC
   */
  disconnect(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
      this.connected = false;
      console.log('WebRTC disconnected from camera:', this.cameraId);
    }
    this.eventHandlers.clear();
  }

  /**
   * S'abonner à un événement WebRTC
   * @param event Nom de l'événement
   * @param handler Fonction callback
   * @returns Fonction pour se désabonner
   */
  on(event: string, handler: WebRTCEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Retourner fonction de désabonnement
    return () => this.off(event, handler);
  }

  /**
   * Se désabonner d'un événement
   * @param event Nom de l'événement
   * @param handler Fonction callback
   */
  off(event: string, handler: WebRTCEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Émettre un événement aux handlers locaux
   * @param event Nom de l'événement
   * @param data Données de l'événement
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Vérifier si la connexion est active
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Obtenir l'ID de la caméra
   */
  getCameraId(): string {
    return this.cameraId;
  }
}

/**
 * Gestionnaire de connexions WebRTC multiples
 */
export class WebRTCManager {
  // Map des connexions actives par ID de caméra
  private connections: Map<string, WebRTCConnection> = new Map();

  // Configuration par défaut
  private defaultConfig?: Partial<WebRTCConfig>;

  constructor(config?: Partial<WebRTCConfig>) {
    this.defaultConfig = config;
  }

  /**
   * Créer une nouvelle connexion WebRTC vers une caméra
   * @param cameraId ID de la caméra
   * @param signalData Données de signalisation initiales (optionnel)
   * @returns Instance de connexion WebRTC
   */
  async createConnection(
    cameraId: string,
    signalData?: any
  ): Promise<WebRTCConnection> {
    // Fermer la connexion existante si elle existe
    if (this.connections.has(cameraId)) {
      this.closeConnection(cameraId);
    }

    // Créer nouvelle connexion
    const connection = new WebRTCConnection(cameraId, this.defaultConfig);
    this.connections.set(cameraId, connection);

    // Connecter
    await connection.connect(signalData);

    return connection;
  }

  /**
   * Obtenir une connexion existante
   * @param cameraId ID de la caméra
   * @returns Instance de connexion ou undefined
   */
  getConnection(cameraId: string): WebRTCConnection | undefined {
    return this.connections.get(cameraId);
  }

  /**
   * Fermer une connexion spécifique
   * @param cameraId ID de la caméra
   */
  closeConnection(cameraId: string): void {
    const connection = this.connections.get(cameraId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(cameraId);
    }
  }

  /**
   * Fermer toutes les connexions
   */
  closeAllConnections(): void {
    this.connections.forEach((connection) => {
      connection.disconnect();
    });
    this.connections.clear();
  }

  /**
   * Obtenir toutes les connexions actives
   */
  getAllConnections(): Map<string, WebRTCConnection> {
    return this.connections;
  }
}

// Export singleton instance
export const webrtcManager = new WebRTCManager();

export default webrtcManager;
