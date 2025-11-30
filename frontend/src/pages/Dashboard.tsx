/**
 * Dashboard - Sentinel AI Premium Design v3.0
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { fetchCameras, selectAllCameras, selectActiveCameras } from '../store/slices/camerasSlice';
import { fetchEvents, selectFilteredEvents } from '../store/slices/eventsSlice';
import { TopNavigationBar } from '../components/Layout';
import { wsService } from '../services/websocket';
import {
  Activity,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  Video,
  Plus,
  Download,
  Clock3,
  Camera as CameraIcon
} from 'lucide-react';
import type { Event } from '../types';
import './Dashboard.css';

/**
 * Composant Dashboard principal
 */
export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Sélecteurs Redux
  const allCameras = useAppSelector(selectAllCameras);
  const activeCameras = useAppSelector(selectActiveCameras);
  const recentEvents = useAppSelector(selectFilteredEvents);

  // États locaux pour les statistiques
  const [stats, setStats] = useState({
    eventsToday: 0,
    activeCameras: 0,
    detectionsPerMinute: 0,
    systemStatus: 100,
  });

  /**
   * Charger les données initiales au montage
   */
  useEffect(() => {
    console.log('📊 Dashboard: Loading initial data...');

    // Charger les caméras
    dispatch(fetchCameras());

    // Charger les événements récents (dernières 24h)
    dispatch(fetchEvents({ page: 1, pageSize: 10 }));
  }, [dispatch]);

  /**
   * Mettre à jour les stats en fonction des données
   */
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      activeCameras: activeCameras.length,
      eventsToday: recentEvents.length,
    }));
  }, [activeCameras, recentEvents]);

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

    // Écouter les nouveaux événements
    const unsubscribeEvents = wsService.on('event', (event: Event) => {
      console.log('🆕 New event received:', event);
      setStats(prev => ({
        ...prev,
        eventsToday: prev.eventsToday + 1,
      }));
    });

    // Écouter les détections pour calculer le taux/min
    const unsubscribeDetections = wsService.on('detection', () => {
      setStats(prev => ({
        ...prev,
        detectionsPerMinute: prev.detectionsPerMinute + 1,
      }));
    });

    // Cleanup
    return () => {
      unsubscribeEvents();
      unsubscribeDetections();
    };
  }, []);

  /**
   * Formater le nombre pour affichage
   */
  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  /**
   * Obtenir la classe CSS selon la sévérité
   */
  const getSeverityClass = (severity: string): string => {
    return `event-item--${severity}`;
  };

  /**
   * Obtenir l'icône selon le type d'événement
   */
  const getEventIcon = (eventType: string): string => {
    const icons: Record<string, string> = {
      intrusion: '🚨',
      detection: '👤',
      alert: '⚠️',
      motion: '🏃',
      camera_offline: '📹',
      system: '⚙️',
    };
    return icons[eventType] || '🔔';
  };

  /**
   * Formater le timestamp
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `Il y a ${hours}h`;
    if (minutes > 0) return `Il y a ${minutes}min`;
    return 'Maintenant';
  };

  return (
    <div className="dashboard-page">
      <TopNavigationBar />

      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header__content">
            <div className="dashboard-header__text">
              <h1 className="dashboard-header__title">Dashboard</h1>
              <p className="dashboard-header__subtitle">
                Vue d'ensemble en temps reel du systeme de surveillance
              </p>
            </div>
            <div className="dashboard-header__actions">
              <button className="dashboard-header__btn dashboard-header__btn--secondary">
                <Download />
                Exporter
              </button>
              <button className="dashboard-header__btn dashboard-header__btn--primary">
                <Plus />
                Ajouter camera
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--primary">
                <Activity />
              </div>
              <span className="stat-card__label">Evenements</span>
            </div>
            <div className="stat-card__value">{stats.eventsToday}</div>
            <div className="stat-card__footer">
              <span className="stat-card__trend stat-card__trend--up">
                <TrendingUp />
                Derniere heure
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--success">
                <Video />
              </div>
              <span className="stat-card__label">Cameras actives</span>
            </div>
            <div className="stat-card__value">
              {formatNumber(stats.activeCameras)}/{allCameras.length > 0 ? allCameras.length : 4}
            </div>
            <div className="stat-card__footer">
              <span className="stat-card__trend">
                <Clock />
                {stats.activeCameras > 0 ? '100% operationnel' : 'En attente'}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--info">
                <Zap />
              </div>
              <span className="stat-card__label">Detections/min</span>
            </div>
            <div className="stat-card__value">{stats.detectionsPerMinute}</div>
            <div className="stat-card__footer">
              <span className="stat-card__trend">
                <Activity />
                Temps reel
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--warning">
                <Shield />
              </div>
              <span className="stat-card__label">Statut systeme</span>
            </div>
            <div className="stat-card__value">{stats.systemStatus}%</div>
            <div className="stat-card__footer">
              <span className="stat-card__trend stat-card__trend--up">
                <CheckCircle />
                Operationnel
              </span>
            </div>
          </div>
        </section>

        {/* Activity Section */}
        <section className="dashboard-content">
          <h2 className="dashboard-section-title">Activite en temps reel</h2>

          <div className="dashboard-grid">
            {/* Events Panel */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">Evenements recents</h3>
                <button className="panel-action" onClick={() => navigate('/events')}>
                  Voir tout
                </button>
              </div>

              <div className="panel-content">
                {recentEvents.length === 0 ? (
                  <div className="empty-state">
                    <Clock3 className="empty-state__icon" />
                    <p className="empty-state__text">Aucun evenement</p>
                    <p className="empty-state__subtext">Aucune activite recente detectee</p>
                  </div>
                ) : (
                  <div className="events-list">
                    {recentEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className={`event-item ${getSeverityClass(event.severity)}`}
                      >
                        <div className="event-item__icon">
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="event-item__content">
                          <div className="event-item__header">
                            <span className="event-item__type">{event.event_type}</span>
                            <span className="event-item__time">{formatTime(event.timestamp)}</span>
                          </div>
                          <p className="event-item__description">{event.description}</p>
                          {event.camera_id && (
                            <span className="event-item__camera">Camera {event.camera_id}</span>
                          )}
                        </div>
                        {!event.acknowledged && (
                          <div className="event-item__badge">Nouveau</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cameras Panel */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">Etat des cameras</h3>
                <button className="panel-action" onClick={() => navigate('/cameras')}>
                  Gerer
                </button>
              </div>

              <div className="panel-content">
                {allCameras.length === 0 ? (
                  <div className="empty-state">
                    <CameraIcon className="empty-state__icon" />
                    <p className="empty-state__text">Aucune camera</p>
                    <p className="empty-state__subtext">Ajoutez des cameras pour commencer</p>
                  </div>
                ) : (
                  <div className="cameras-list">
                    {allCameras.slice(0, 4).map((camera) => (
                      <div key={camera.id} className="camera-item">
                        <div
                          className={`camera-item__status camera-item__status--${
                            camera.status === 'active' ? 'active' : 'offline'
                          }`}
                        />
                        <div className="camera-item__content">
                          <div className="camera-item__header">
                            <span className="camera-item__name">{camera.name}</span>
                            <span
                              className={`camera-item__badge camera-item__badge--${
                                camera.status === 'active' ? 'active' : 'offline'
                              }`}
                            >
                              {camera.status === 'active' ? 'Active' : 'Hors ligne'}
                            </span>
                          </div>
                          <p className="camera-item__fps">
                            {camera.status === 'active' ? '25 FPS' : '0 FPS'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
