/**
 * Hook personnalisé pour gérer une connexion WebRTC vers une caméra
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCConnection } from '../services/webrtc';
import { wsService } from '../services/websocket';

interface UseWebRTCOptions {
  autoConnect?: boolean;      // Se connecter automatiquement au montage
  autoReconnect?: boolean;     // Reconnecter automatiquement en cas d'erreur
  reconnectDelay?: number;     // Délai avant reconnexion (ms)
}

interface UseWebRTCReturn {
  // État de la connexion
  isConnecting: boolean;       // Connexion en cours
  isConnected: boolean;        // Connecté avec succès
  error: Error | null;         // Erreur éventuelle

  // Flux vidéo MediaStream
  stream: MediaStream | null;

  // Fonctions de contrôle
  connect: () => Promise<void>;     // Établir la connexion
  disconnect: () => void;            // Fermer la connexion
  reconnect: () => Promise<void>;    // Se reconnecter
}

/**
 * Hook pour gérer une connexion WebRTC vers une caméra
 * @param cameraId ID de la caméra à connecter
 * @param options Options de configuration
 * @returns État et fonctions de contrôle WebRTC
 */
export function useWebRTC(
  cameraId: string | null,
  options: UseWebRTCOptions = {}
): UseWebRTCReturn {
  // Destructurer les options avec valeurs par défaut
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options;

  // États du hook
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Refs pour éviter les stale closures
  const connectionRef = useRef<WebRTCConnection | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  /**
   * Fonction pour établir la connexion WebRTC
   */
  const connect = useCallback(async () => {
    // Vérifier qu'on a un cameraId
    if (!cameraId) {
      console.warn('Cannot connect: cameraId is null');
      return;
    }

    // Éviter de connecter si déjà en cours
    if (isConnecting || isConnected) {
      console.warn('Already connecting or connected');
      return;
    }

    console.log('Connecting to camera:', cameraId);
    setIsConnecting(true);
    setError(null);

    try {
      // Créer une nouvelle connexion WebRTC
      const connection = new WebRTCConnection(cameraId);
      connectionRef.current = connection;

      // Écouter l'événement 'stream' pour recevoir le flux vidéo
      connection.on('stream', ({ stream: mediaStream }) => {
        if (!isUnmountedRef.current) {
          console.log('Stream received for camera:', cameraId);
          setStream(mediaStream);
          setIsConnected(true);
          setIsConnecting(false);
        }
      });

      // Écouter l'événement 'connected'
      connection.on('connected', () => {
        if (!isUnmountedRef.current) {
          console.log('WebRTC connected for camera:', cameraId);
          setIsConnected(true);
          setIsConnecting(false);
        }
      });

      // Écouter l'événement 'disconnected'
      connection.on('disconnected', () => {
        if (!isUnmountedRef.current) {
          console.log('WebRTC disconnected for camera:', cameraId);
          setIsConnected(false);
          setStream(null);

          // Reconnecter automatiquement si activé
          if (autoReconnect && !isUnmountedRef.current) {
            console.log(`Reconnecting in ${reconnectDelay}ms...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectDelay);
          }
        }
      });

      // Écouter l'événement 'error'
      connection.on('error', ({ error: err }) => {
        if (!isUnmountedRef.current) {
          console.error('WebRTC error for camera:', cameraId, err);
          setError(err);
          setIsConnecting(false);

          // Reconnecter automatiquement en cas d'erreur si activé
          if (autoReconnect && !isUnmountedRef.current) {
            console.log(`Reconnecting after error in ${reconnectDelay}ms...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectDelay);
          }
        }
      });

      // Écouter l'événement 'signal' pour envoyer au serveur
      connection.on('signal', ({ signal }) => {
        console.log('Sending WebRTC signal to server for camera:', cameraId);
        // Envoyer le signal au serveur via WebSocket
        wsService.send('webrtc_signal', {
          camera_id: cameraId,
          signal,
        });
      });

      // Écouter les signaux du serveur via WebSocket
      const unsubscribe = wsService.on('webrtc_signal', (data) => {
        // Vérifier que c'est pour cette caméra
        if (data.camera_id === cameraId && connectionRef.current) {
          console.log('Received WebRTC signal from server for camera:', cameraId);
          connectionRef.current.signal(data.signal);
        }
      });

      // Sauvegarder la fonction de désabonnement
      connectionRef.current.on('cleanup', unsubscribe);

      // Demander au serveur d'initier le stream WebRTC
      wsService.send('request_webrtc_stream', { camera_id: cameraId });

      // Initier la connexion
      await connection.connect();
    } catch (err) {
      console.error('Failed to connect WebRTC:', err);
      const error = err instanceof Error ? err : new Error('Connection failed');
      if (!isUnmountedRef.current) {
        setError(error);
        setIsConnecting(false);
      }
    }
  }, [cameraId, isConnecting, isConnected, autoReconnect, reconnectDelay]);

  /**
   * Fonction pour fermer la connexion
   */
  const disconnect = useCallback(() => {
    console.log('Disconnecting from camera:', cameraId);

    // Annuler le timeout de reconnexion s'il existe
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fermer la connexion WebRTC
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
    }

    // Réinitialiser les états
    setIsConnecting(false);
    setIsConnected(false);
    setStream(null);
    setError(null);
  }, [cameraId]);

  /**
   * Fonction pour se reconnecter
   */
  const reconnect = useCallback(async () => {
    console.log('Reconnecting to camera:', cameraId);
    disconnect();
    await connect();
  }, [cameraId, connect, disconnect]);

  /**
   * Effet pour auto-connexion au montage
   */
  useEffect(() => {
    // Auto-connecter si activé et cameraId présent
    if (autoConnect && cameraId) {
      connect();
    }

    // Cleanup au démontage
    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [cameraId]); // Reconnect if cameraId changes

  // Retourner l'état et les fonctions de contrôle
  return {
    isConnecting,
    isConnected,
    error,
    stream,
    connect,
    disconnect,
    reconnect,
  };
}

export default useWebRTC;
