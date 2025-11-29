/**
 * Page Cameras - Affichage des flux vidéo en temps réel
 * Design Sentinel IA - Strictement conforme au cahier des charges
 */
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
  fetchCameras,
  selectAllCameras,
  selectActiveCameras,
  selectCamera,
  selectSelectedCamera,
  updateCameraStatus,
  startCamera,
  stopCamera
} from '../store/slices/camerasSlice';
import { TopNavigationBar } from '../components/Layout';
import { WebRTCPlayer } from '../components/WebRTCPlayer';
import { wsService } from '../services/websocket';
import type { Camera } from '../types';
import './Cameras.css';

/**
 * Composant de carte caméra avec flux vidéo
 */
interface CameraCardProps {
  camera: Camera;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ camera, isSelected, onSelect }) => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleStartCamera = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection de la carte
    setIsLoading(true);
    try {
      await dispatch(startCamera(camera.id)).unwrap();
      setHasError(false);
    } catch (error) {
      console.error('Failed to start camera:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await dispatch(stopCamera(camera.id)).unwrap();
    } catch (error) {
      console.error('Failed to stop camera:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`camera-card ${isSelected ? 'camera-card--selected' : ''} ${camera.status !== 'active' ? 'camera-card--offline' : ''}`}
      onClick={() => onSelect(camera.id)}
    >
      {/* En-tête de la carte */}
      <div className="camera-card__header">
        <div className="camera-card__info">
          <h3 className="camera-card__name">{camera.name}</h3>
          <span className={`camera-card__status camera-card__status--${camera.status}`}>
            <span className="camera-card__status-dot"></span>
            {camera.status === 'active' ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
        <div className="camera-card__actions">
          <button className="camera-card__action-btn" title="Plein écran">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <button className="camera-card__action-btn" title="Paramètres">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m6-12l-3 3m-6 6l-3 3m12-6h-6m-6 0H1m18 0l-3-3m-6-6L7 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zone de flux vidéo */}
      <div className="camera-card__video-container">
        {isLoading ? (
          <div className="camera-card__loading">
            <div className="camera-card__spinner"></div>
            <p>Chargement du flux...</p>
          </div>
        ) : hasError || camera.status !== 'active' ? (
          <div className="camera-card__error">
            <svg className="camera-card__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="camera-card__error-text">
              {camera.status !== 'active' ? 'Caméra hors ligne' : 'Erreur de connexion'}
            </p>
            <button
              className="camera-card__retry-btn"
              onClick={handleStartCamera}
              disabled={isLoading}
            >
              {isLoading ? 'Démarrage...' : 'Démarrer la caméra'}
            </button>
          </div>
        ) : (
          <div className="camera-card__video">
            {/* WebRTC Player for H264 transcoded stream (low latency < 500ms) */}
            {/* Note: Le flux H264 est disponible uniquement après avoir cliqué "Démarrer la caméra" */}
            {/* car FFmpeg transcode H265→H264 uniquement quand la caméra est active */}
            <WebRTCPlayer
              cameraId={`${camera.id}_h264`}
              webrtcUrl={import.meta.env.VITE_WEBRTC_URL || 'http://localhost:8889'}
              autoplay={true}
              controls={true}
              className="w-full h-full"
              onError={(error: Error) => {
                console.error('WebRTC error for camera', camera.id, ':', error);
                setHasError(true);
              }}
              onPlaying={() => {
                setHasError(false);
              }}
            />

            {/* Overlay d'informations */}
            <div className="camera-card__overlay">
              <div className="camera-card__stats">
                <span className="camera-card__stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
                </svg> 
                  25 FPS
                </span>
                <span className="camera-card__stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  1920x1080
                </span>
              </div>

              {/* Indicateur d'enregistrement si actif */}
              {camera.is_recording && (
                <div className="camera-card__recording">
                  <span className="camera-card__recording-dot"></span>
                  REC
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pied de carte avec détails */}
      <div className="camera-card__footer">
        <div className="camera-card__detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{camera.location || 'Position non définie'}</span>
        </div>
        <div className="camera-card__detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Dernière activité: {formatLastSeen(camera.last_seen)}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Formater le timestamp de dernière activité
 */
const formatLastSeen = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 24) return date.toLocaleDateString('fr-FR');
  if (hours > 0) return `Il y a ${hours}h`;
  if (minutes > 0) return `Il y a ${minutes}min`;
  return 'Maintenant';
};

/**
 * Composant principal de la page Cameras
 */
export const Cameras: React.FC = () => {
  const dispatch = useAppDispatch();

  // Sélecteurs Redux
  const allCameras = useAppSelector(selectAllCameras);
  const activeCameras = useAppSelector(selectActiveCameras);
  const selectedCamera = useAppSelector(selectSelectedCamera);

  // États locaux
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  /**
   * Charger les caméras au montage
   */
  useEffect(() => {
    console.log('📹 Cameras: Loading cameras...');
    dispatch(fetchCameras());
  }, [dispatch]);

  /**
   * Connecter au WebSocket pour les mises à jour temps réel
   */
  useEffect(() => {
    if (!wsService.isConnected()) {
      try {
        wsService.connect();
      } catch (error) {
        console.warn('⚠️  WebSocket connection skipped: Backend not available');
      }
    }

    // Écouter les changements de statut des caméras
    const unsubscribeStatus = wsService.on('camera_status', (data: { id: string; status: Camera['status'] }) => {
      console.log('📹 Camera status update:', data);
      dispatch(updateCameraStatus(data));
    });

    return () => {
      unsubscribeStatus();
    };
  }, [dispatch]);

  /**
   * Sélectionner une caméra
   */
  const handleSelectCamera = (cameraId: string) => {
    dispatch(selectCamera(cameraId));
  };

  /**
   * Filtrer les caméras selon le statut
   */
  const filteredCameras = allCameras.filter(camera => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return camera.status === 'active';
    if (filterStatus === 'inactive') return camera.status !== 'active';
    return true;
  });

  return (
    <div className="cameras-page">
      {/* Top Navigation Bar */}
      <TopNavigationBar />

      {/* Contenu principal */}
      <div className="cameras-container">
        {/* En-tête de la page */}
        <header className="cameras-header">
          <div className="cameras-header__content">
            <h1 className="cameras-header__title">Caméras</h1>
            <p className="cameras-header__subtitle">
              {allCameras.length} caméra{allCameras.length > 1 ? 's' : ''} • {activeCameras.length} active{activeCameras.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions de la page */}
          <div className="cameras-header__actions">
            {/* Filtres de statut */}
            <div className="cameras-filter">
              <button
                className={`cameras-filter__btn ${filterStatus === 'all' ? 'cameras-filter__btn--active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Toutes
              </button>
              <button
                className={`cameras-filter__btn ${filterStatus === 'active' ? 'cameras-filter__btn--active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                Actives
              </button>
              <button
                className={`cameras-filter__btn ${filterStatus === 'inactive' ? 'cameras-filter__btn--active' : ''}`}
                onClick={() => setFilterStatus('inactive')}
              >
                Inactives
              </button>
            </div>

            {/* Toggle mode d'affichage */}
            <div className="cameras-view-toggle">
              <button
                className={`cameras-view-toggle__btn ${viewMode === 'grid' ? 'cameras-view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Vue grille"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                className={`cameras-view-toggle__btn ${viewMode === 'list' ? 'cameras-view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Vue liste"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>

            {/* Bouton ajouter caméra */}
            <button className="cameras-add-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter une caméra
            </button>
          </div>
        </header>

        {/* Grille de caméras */}
        <section className="cameras-content">
          {filteredCameras.length === 0 ? (
            <div className="cameras-empty">
              <svg className="cameras-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <h2 className="cameras-empty__title">Aucune caméra</h2>
              <p className="cameras-empty__text">
                {filterStatus === 'all'
                  ? 'Ajoutez des caméras pour commencer la surveillance'
                  : `Aucune caméra ${filterStatus === 'active' ? 'active' : 'inactive'} pour le moment`
                }
              </p>
              <button className="cameras-empty__btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Ajouter une caméra
              </button>
            </div>
          ) : (
            <div className={`cameras-grid cameras-grid--${viewMode}`}>
              {filteredCameras.map((camera) => (
                <CameraCard
                  key={camera.id}
                  camera={camera}
                  isSelected={selectedCamera?.id === camera.id}
                  onSelect={handleSelectCamera}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Cameras;
