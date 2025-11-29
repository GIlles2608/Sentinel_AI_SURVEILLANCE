import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle } from 'lucide-react';

interface WebRTCPlayerProps {
  cameraId: string;
  webrtcUrl?: string; // URL du serveur MediaMTX
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onPlaying?: () => void;
}

export const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({
  cameraId,
  webrtcUrl = 'http://localhost:8889',
  autoplay = true,
  controls = true,
  className = '',
  onError,
  onPlaying,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration WebRTC
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  // Démarrer la connexion WebRTC
  const startWebRTC = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Créer la connexion peer
      const pc = new RTCPeerConnection({
        iceServers,
      });

      pcRef.current = pc;

      // Gérer les tracks reçus
      pc.ontrack = (event) => {
        console.log('[WebRTC] Track received:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setIsLoading(false);
          setIsPlaying(true);
          onPlaying?.();
        }
      };

      // Gérer les états de connexion
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          const err = new Error('WebRTC connection failed');
          setError(err.message);
          onError?.(err);
        }
      };

      pc.onicecandidateerror = (event) => {
        console.error('[WebRTC] ICE candidate error:', event);
      };

      // Ajouter un transceiver pour recevoir la vidéo
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Créer l'offre SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Envoyer l'offre au serveur MediaMTX
      console.log('[WebRTC] Sending offer to MediaMTX...');
      const whepUrl = `${webrtcUrl}/${cameraId}/whep`;

      const response = await fetch(whepUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);
      }

      // Récupérer la réponse SDP
      const answerSdp = await response.text();
      console.log('[WebRTC] Received answer from MediaMTX');

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp,
      }));

      console.log('[WebRTC] Connection established');

    } catch (err) {
      console.error('[WebRTC] Error:', err);
      const error = err as Error;
      setError(error.message);
      setIsLoading(false);
      onError?.(error);
    }
  };

  // Arrêter la connexion WebRTC
  const stopWebRTC = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPlaying(false);
  };

  // Effet pour démarrer/arrêter le stream
  useEffect(() => {
    if (autoplay) {
      startWebRTC();
    }

    return () => {
      stopWebRTC();
    };
  }, [cameraId, webrtcUrl]);

  // Gestion du play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      stopWebRTC();
    } else {
      startWebRTC();
    }
  };

  // Gestion du mute
  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Gestion du fullscreen
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-contain"
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
      />

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Connexion à la caméra...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-white max-w-md px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Erreur de connexion</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <button
              onClick={startWebRTC}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {controls && !isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Mute */}
              <button
                onClick={handleMute}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-white text-sm font-medium">LIVE</span>
              </div>

              {/* Fullscreen */}
              <button
                onClick={handleFullscreen}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="Plein écran"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
