import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle } from 'lucide-react';

interface HLSPlayerProps {
  cameraId: string;
  hlsUrl?: string; // URL du serveur MediaMTX HLS
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onPlaying?: () => void;
}

export const HLSPlayer: React.FC<HLSPlayerProps> = ({
  cameraId,
  hlsUrl = 'http://localhost:8888',
  autoplay = true,
  controls = true,
  className = '',
  onError,
  onPlaying,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Démarrer le stream HLS
  const startHLS = () => {
    if (!videoRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const streamUrl = `${hlsUrl}/${cameraId}/index.m3u8`;
      console.log('[HLS] Loading stream from:', streamUrl);

      if (Hls.isSupported()) {
        // HLS.js est supporté
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true, // Mode faible latence
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          liveDurationInfinity: true,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 3,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 3,
          fragLoadingRetryDelay: 1000,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[HLS] Media attached');
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          console.log('[HLS] Manifest parsed, found', data.levels.length, 'quality levels');
          setIsLoading(false);
          if (autoplay) {
            videoRef.current?.play().catch((e) => {
              console.error('[HLS] Autoplay failed:', e);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error('[HLS] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[HLS] Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[HLS] Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                const err = new Error(`HLS fatal error: ${data.type}`);
                setError(err.message);
                setIsLoading(false);
                onError?.(err);
                hls.destroy();
                break;
            }
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Support natif HLS (Safari)
        console.log('[HLS] Using native HLS support');
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          if (autoplay) {
            videoRef.current?.play().catch((e) => {
              console.error('[HLS] Autoplay failed:', e);
            });
          }
        });
        videoRef.current.addEventListener('error', () => {
          const err = new Error('HLS playback error');
          setError(err.message);
          setIsLoading(false);
          onError?.(err);
        });
      } else {
        throw new Error('HLS is not supported in this browser');
      }
    } catch (err) {
      console.error('[HLS] Error:', err);
      const error = err as Error;
      setError(error.message);
      setIsLoading(false);
      onError?.(error);
    }
  };

  // Arrêter le stream HLS
  const stopHLS = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setIsPlaying(false);
  };

  // Effet pour démarrer/arrêter le stream
  useEffect(() => {
    startHLS();

    return () => {
      stopHLS();
    };
  }, [cameraId, hlsUrl]);

  // Gestion du play/pause
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch((e) => {
          console.error('[HLS] Play failed:', e);
        });
      }
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
        autoPlay={autoplay}
        playsInline
        muted={isMuted}
        className="w-full h-full object-contain"
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
          onPlaying?.();
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Chargement du flux vidéo...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-white max-w-md px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Erreur de lecture</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                startHLS();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {controls && !error && (
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
