/**
 * Page Dashboard - Vue principale conforme à la maquette v2.0
 * Design Sentinel IA - Strictement conforme au cahier des charges
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { fetchCameras, selectAllCameras, selectActiveCameras } from '../store/slices/camerasSlice';
import { fetchEvents, selectFilteredEvents } from '../store/slices/eventsSlice';
import { TopNavigationBar } from '../components/Layout';
import { wsService } from '../services/websocket';
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
      {/* Top Navigation Bar */}
      <TopNavigationBar />

      {/* Contenu principal */}
      <div className="dashboard-container">
        {/* En-tête du dashboard */}
        <header className="dashboard-header">
          <div className="dashboard-header__content">
            <h1 className="dashboard-header__title">Dashboard</h1>
            <p className="dashboard-header__subtitle">
              Vue d'ensemble en temps réel du système de surveillance
            </p>
          </div>
        </header>

        {/* Widgets statistiques */}
        <section className="dashboard-stats">
          {/* Widget: Événements aujourd'hui */}
          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 2v20M3 8h18M3 16h18" strokeLinecap="round" />
                </svg>
              </div>
              <span className="stat-card__label">ÉVÉNEMENTS AUJOURD'HUI</span>
            </div>
            <div className="stat-card__value">{stats.eventsToday}</div>
            <div className="stat-card__footer">
              <span className="stat-card__trend stat-card__trend--up">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                Dernière heure
              </span>
            </div>
          </div>

          {/* Widget: Caméras actives */}
          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span className="stat-card__label">CAMÉRAS ACTIVES</span>
            </div>
            <div className="stat-card__value">
              {formatNumber(stats.activeCameras)}/{allCameras.length > 0 ? allCameras.length : 4}
            </div>
            <div className="stat-card__footer">
              <span className="stat-card__trend">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {stats.activeCameras > 0 ? '0% opérationnel' : 'Non spécifié'}
              </span>
            </div>
          </div>

          {/* Widget: Détections/min */}
          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="stat-card__label">DÉTECTIONS/MIN</span>
            </div>
            <div className="stat-card__value">{stats.detectionsPerMinute}</div>
            <div className="stat-card__footer">
              <span className="stat-card__trend">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                </svg>
                Temps réel
              </span>
            </div>
          </div>

          {/* Widget: Statut système */}
          <div className="stat-card">
            <div className="stat-card__header">
              <div className="stat-card__icon stat-card__icon--warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="stat-card__label">STATUT SYSTÈME</span>
            </div>
            <div className="stat-card__value">{stats.systemStatus}%</div>
            <div className="stat-card__footer">
              <span className="stat-card__trend stat-card__trend--success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Opérationnel
              </span>
            </div>
          </div>
        </section>

        {/* Section Activité en Temps Réel */}
        <section className="dashboard-content">
          <h2 className="dashboard-section-title">Activité en Temps Réel</h2>

          <div className="dashboard-grid">
            {/* Colonne gauche: Événements récents */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">Événements Récents</h3>
                <button
                  className="panel-action"
                  onClick={() => navigate('/events')}
                >
                  Voir tout →
                </button>
              </div>

              <div className="panel-content">
                {recentEvents.length === 0 ? (
                  <div className="empty-state">
                    <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <p className="empty-state__text">Aucun événement</p>
                    <p className="empty-state__subtext">Aucune activité récente</p>
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
                            <span className="event-item__time">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="event-item__description">{event.description}</p>
                          {event.camera_id && (
                            <span className="event-item__camera">
                              📹 Caméra {event.camera_id}
                            </span>
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

            {/* Colonne droite: État des caméras */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">État des Caméras</h3>
                <button
                  className="panel-action"
                  onClick={() => navigate('/cameras')}
                >
                  Gérer →
                </button>
              </div>

              <div className="panel-content">
                {allCameras.length === 0 ? (
                  <div className="empty-state">
                    <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <p className="empty-state__text">Aucune caméra</p>
                    <p className="empty-state__subtext">Ajoutez des caméras pour commencer</p>
                  </div>
                ) : (
                  <div className="cameras-list">
                    {/* Caméra exemple IMOU Principale */}
                    <div className="camera-item">
                      <div className="camera-item__status camera-item__status--offline"></div>
                      <div className="camera-item__content">
                        <div className="camera-item__header">
                          <span className="camera-item__name">Caméra IMOU Principale</span>
                          <span className="camera-item__badge camera-item__badge--offline">
                            Non spécifié
                          </span>
                        </div>
                        <p className="camera-item__fps">0 FPS</p>
                      </div>
                    </div>

                    {/* Autres caméras depuis Redux si disponibles */}
                    {allCameras.slice(0, 3).map((camera) => (
                      <div key={camera.id} className="camera-item">
                        <div
                          className={`camera-item__status camera-item__status--${
                            camera.status === 'active' ? 'active' : 'offline'
                          }`}
                        ></div>
                        <div className="camera-item__content">
                          <div className="camera-item__header">
                            <span className="camera-item__name">{camera.name}</span>
                            <span
                              className={`camera-item__badge camera-item__badge--${
                                camera.status === 'active' ? 'active' : 'offline'
                              }`}
                            >
                              {camera.status === 'active' ? 'Active' : 'Inactive'}
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
