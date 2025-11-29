/**
 * Composant VideoPlayer pour afficher un flux vidéo WebRTC d'une caméra
 */
import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import type { Camera } from '../../types';
import './VideoPlayer.css';

// Props du composant VideoPlayer
interface VideoPlayerProps {
  camera: Camera;                    // Caméra à afficher
  autoPlay?: boolean;                // Lecture automatique (défaut: true)
  muted?: boolean;                   // Son coupé (défaut: true)
  controls?: boolean;                // Afficher les contrôles (défaut: true)
  className?: string;                // Classes CSS additionnelles
  onError?: (error: Error) => void;  // Callback en cas d'erreur
  onStreamReady?: () => void;        // Callback quand le stream est prêt
}

/**
 * Composant VideoPlayer
 * Affiche un flux vidéo WebRTC avec contrôles (play/pause, fullscreen, mute)
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  camera,
  autoPlay = true,
  muted = true,
  controls = true,
  className = '',
  onError,
  onStreamReady,
}) => {
  // Référence vers l'élément <video> HTML
  const videoRef = useRef<HTMLVideoElement>(null);

  // États locaux pour les contrôles
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(0.8); // Volume par défaut: 80%

  // Hook WebRTC pour gérer la connexion
  const {
    isConnecting,
    isConnected,
    error: webrtcError,
    stream,
    reconnect,
  } = useWebRTC(camera.id, {
    autoConnect: true,
    autoReconnect: true,
    reconnectDelay: 3000,
  });

  /**
   * Effet pour attacher le stream MediaStream à l'élément <video>
   */
  useEffect(() => {
    // Vérifier qu'on a le stream et la ref vidéo
    if (stream && videoRef.current) {
      console.log('Attaching stream to video element for camera:', camera.id);

      // Attacher le stream à l'élément vidéo
      videoRef.current.srcObject = stream;

      // Appeler le callback si fourni
      if (onStreamReady) {
        onStreamReady();
      }

      // Si autoPlay, démarrer la lecture
      if (autoPlay) {
        videoRef.current.play().catch((err) => {
          console.error('Autoplay failed:', err);
        });
      }
    }

    // Cleanup: retirer le stream au démontage
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, camera.id, autoPlay, onStreamReady]);

  /**
   * Effet pour notifier les erreurs WebRTC
   */
  useEffect(() => {
    if (webrtcError && onError) {
      onError(webrtcError);
    }
  }, [webrtcError, onError]);

  /**
   * Gérer play/pause
   */
  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  /**
   * Gérer mute/unmute
   */
  const handleMuteToggle = () => {
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  /**
   * Gérer le changement de volume
   */
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);

    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);

      // Unmute automatiquement si on augmente le volume
      if (newVolume > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  /**
   * Gérer le plein écran
   */
  const handleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (!isFullscreen) {
        // Entrer en plein écran
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Sortir du plein écran
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  /**
   * Écouter les changements de fullscreen
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  /**
   * Rendu du composant
   */
  return (
    <div className={`video-player ${className}`}>
      {/* En-tête avec infos caméra */}
      <div className="video-player__header">
        <h3 className="video-player__title">{camera.name}</h3>
        <span className="video-player__location">{camera.location}</span>
        <span className={`video-player__status video-player__status--${camera.status}`}>
          {camera.status === 'active' ? '🟢' : camera.status === 'error' ? '🔴' : '⚪'}
          {camera.status}
        </span>
      </div>

      {/* Container vidéo */}
      <div className="video-player__container">
        {/* Élément <video> HTML5 */}
        <video
          ref={videoRef}
          className="video-player__video"
          autoPlay={autoPlay}
          muted={muted}
          playsInline  // Important pour iOS
        />

        {/* Overlay de chargement */}
        {isConnecting && (
          <div className="video-player__overlay">
            <div className="video-player__spinner" />
            <p>Connexion à la caméra...</p>
          </div>
        )}

        {/* Overlay d'erreur */}
        {webrtcError && (
          <div className="video-player__overlay video-player__overlay--error">
            <p className="video-player__error-message">
              ⚠️ Erreur de connexion: {webrtcError.message}
            </p>
            <button className="video-player__retry-button" onClick={reconnect}>
              🔄 Réessayer
            </button>
          </div>
        )}

        {/* Overlay pas de stream */}
        {!isConnecting && !isConnected && !webrtcError && (
          <div className="video-player__overlay">
            <p>Aucun flux vidéo disponible</p>
          </div>
        )}
      </div>

      {/* Contrôles personnalisés */}
      {controls && isConnected && (
        <div className="video-player__controls">
          {/* Bouton Play/Pause */}
          <button
            className="video-player__control-button"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {/* Bouton Mute/Unmute */}
          <button
            className="video-player__control-button"
            onClick={handleMuteToggle}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Slider de volume */}
          <input
            type="range"
            className="video-player__volume-slider"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            title="Volume"
          />

          {/* Spacer pour pousser fullscreen à droite */}
          <div className="video-player__spacer" />

          {/* Info FPS */}
          <span className="video-player__info">
            {camera.fps} FPS
          </span>

          {/* Info résolution */}
          <span className="video-player__info">
            {camera.resolution.width}x{camera.resolution.height}
          </span>

          {/* Bouton Fullscreen */}
          <button
            className="video-player__control-button"
            onClick={handleFullscreen}
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
