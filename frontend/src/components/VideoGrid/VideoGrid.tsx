/**
 * Composant VideoGrid pour afficher plusieurs caméras en grille
 * Supporte différents layouts (1x1, 2x2, 3x3, 4x4)
 */
import React, { useState, useMemo } from 'react';
import { VideoPlayer } from '../VideoPlayer';
import type { Camera, GridLayout } from '../../types';
import './VideoGrid.css';

// Props du composant VideoGrid
interface VideoGridProps {
  cameras: Camera[];                    // Liste des caméras à afficher
  layout?: GridLayout;                  // Layout de la grille (défaut: 'auto')
  maxCameras?: number;                  // Nombre max de caméras (défaut: 16)
  selectedCameraId?: string | null;     // ID de la caméra sélectionnée (pour focus)
  onCameraSelect?: (cameraId: string) => void;  // Callback lors de sélection
  className?: string;                   // Classes CSS additionnelles
}

/**
 * Calculer le layout optimal selon le nombre de caméras
 */
function calculateOptimalLayout(cameraCount: number): GridLayout {
  if (cameraCount <= 1) return '1x1';
  if (cameraCount <= 4) return '2x2';
  if (cameraCount <= 9) return '3x3';
  return '4x4';
}

/**
 * Obtenir la classe CSS pour le layout
 */
function getLayoutClass(layout: GridLayout): string {
  const layoutMap: Record<GridLayout, string> = {
    '1x1': 'video-grid--1x1',
    '2x2': 'video-grid--2x2',
    '3x3': 'video-grid--3x3',
    '4x4': 'video-grid--4x4',
    'auto': '', // Sera calculé dynamiquement
  };
  return layoutMap[layout] || '';
}

/**
 * Composant VideoGrid
 * Affiche une grille de caméras avec layout adaptatif
 */
export const VideoGrid: React.FC<VideoGridProps> = ({
  cameras,
  layout = 'auto',
  maxCameras = 16,
  selectedCameraId = null,
  onCameraSelect,
  className = '',
}) => {
  // État local pour la caméra en focus (plein écran dans la grille)
  const [focusedCameraId, setFocusedCameraId] = useState<string | null>(selectedCameraId);

  /**
   * Filtrer et limiter les caméras à afficher
   * Utiliser useMemo pour éviter le recalcul à chaque rendu
   */
  const displayCameras = useMemo(() => {
    // Filtrer les caméras actives en priorité
    const activeCameras = cameras.filter(cam => cam.status === 'active');
    const inactiveCameras = cameras.filter(cam => cam.status !== 'active');

    // Combiner: actives d'abord, puis inactives
    const sortedCameras = [...activeCameras, ...inactiveCameras];

    // Limiter au nombre max
    return sortedCameras.slice(0, maxCameras);
  }, [cameras, maxCameras]);

  /**
   * Calculer le layout effectif
   */
  const effectiveLayout = useMemo(() => {
    if (layout === 'auto') {
      return calculateOptimalLayout(displayCameras.length);
    }
    return layout;
  }, [layout, displayCameras.length]);

  /**
   * Obtenir la classe CSS du layout
   */
  const layoutClass = useMemo(() => {
    return getLayoutClass(effectiveLayout);
  }, [effectiveLayout]);

  /**
   * Gérer le clic sur une caméra
   */
  const handleCameraClick = (cameraId: string) => {
    // Mettre en focus la caméra cliquée
    setFocusedCameraId(cameraId === focusedCameraId ? null : cameraId);

    // Notifier le parent si callback fourni
    if (onCameraSelect) {
      onCameraSelect(cameraId);
    }
  };

  /**
   * Gérer le changement de layout
   */
  const handleLayoutChange = (newLayout: GridLayout) => {
    // Note: pour l'instant, layout est contrôlé par props
    // Cette fonction pourrait être exposée via callback si besoin
    console.log('Layout change requested:', newLayout);
  };

  /**
   * Affichage si aucune caméra
   */
  if (displayCameras.length === 0) {
    return (
      <div className={`video-grid video-grid--empty ${className}`}>
        <div className="video-grid__empty-state">
          <div className="video-grid__empty-icon">📹</div>
          <h3 className="video-grid__empty-title">Aucune caméra disponible</h3>
          <p className="video-grid__empty-description">
            Ajoutez des caméras pour commencer la surveillance
          </p>
        </div>
      </div>
    );
  }

  /**
   * Rendu principal
   */
  return (
    <div className={`video-grid ${className}`}>
      {/* Barre d'outils (optionnelle) */}
      <div className="video-grid__toolbar">
        <div className="video-grid__info">
          <span className="video-grid__count">
            {displayCameras.length} caméra{displayCameras.length > 1 ? 's' : ''}
          </span>
          <span className="video-grid__layout-info">
            Layout: {effectiveLayout}
          </span>
        </div>

        {/* Boutons de layout */}
        <div className="video-grid__layout-buttons">
          <button
            className={`video-grid__layout-button ${layout === '1x1' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('1x1')}
            title="1x1"
          >
            ▢
          </button>
          <button
            className={`video-grid__layout-button ${layout === '2x2' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('2x2')}
            title="2x2"
          >
            ▦
          </button>
          <button
            className={`video-grid__layout-button ${layout === '3x3' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('3x3')}
            title="3x3"
          >
            ▦▦
          </button>
          <button
            className={`video-grid__layout-button ${layout === '4x4' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('4x4')}
            title="4x4"
          >
            ▦▦▦
          </button>
          <button
            className={`video-grid__layout-button ${layout === 'auto' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('auto')}
            title="Auto"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Grille de caméras */}
      <div className={`video-grid__container ${layoutClass}`}>
        {displayCameras.map((camera) => {
          // Déterminer si cette caméra est en focus
          const isFocused = camera.id === focusedCameraId;

          return (
            <div
              key={camera.id}
              className={`video-grid__item ${isFocused ? 'video-grid__item--focused' : ''}`}
              onClick={() => handleCameraClick(camera.id)}
            >
              {/* VideoPlayer pour chaque caméra */}
              <VideoPlayer
                camera={camera}
                autoPlay={true}
                muted={true}
                controls={isFocused} // Afficher contrôles seulement si focused
                onError={(error) => {
                  console.error(`Error with camera ${camera.id}:`, error);
                }}
              />

              {/* Indicateur de focus */}
              {isFocused && (
                <div className="video-grid__focus-indicator">
                  <span>🔍 Focus</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Cases vides pour compléter la grille (optionnel, pour esthétique) */}
        {effectiveLayout !== '1x1' && effectiveLayout !== 'auto' && (
          <>
            {Array.from({ length: getEmptySlots(effectiveLayout, displayCameras.length) }).map((_, index) => (
              <div key={`empty-${index}`} className="video-grid__item video-grid__item--empty">
                <div className="video-grid__empty-slot">
                  <span className="video-grid__empty-slot-icon">➕</span>
                  <span className="video-grid__empty-slot-text">Ajouter caméra</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Calculer le nombre de slots vides à afficher
 */
function getEmptySlots(layout: GridLayout, cameraCount: number): number {
  const layoutSizes: Record<string, number> = {
    '1x1': 1,
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
  };

  const totalSlots = layoutSizes[layout] || 0;
  const emptySlots = totalSlots - cameraCount;

  // Retourner max 0 (pas de slots négatifs)
  return Math.max(0, emptySlots);
}

export default VideoGrid;
