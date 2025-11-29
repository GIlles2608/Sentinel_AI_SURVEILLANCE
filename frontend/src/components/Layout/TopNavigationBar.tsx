/**
 * TopNavigationBar - Barre de navigation supérieure strictement conforme à la maquette
 * Design Sentinel IA v2.0
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { logout, selectCurrentUser } from '../../store/slices/authSlice';
import './TopNavigationBar.css';

interface TopNavigationBarProps {
  className?: string;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  /**
   * Gérer la déconnexion
   */
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  /**
   * Toggle menu profil
   */
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <nav className={`top-nav ${className || ''}`}>
      {/* Logo et titre */}
      <div className="top-nav__brand">
        <div className="top-nav__logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" fill="currentColor" />
            <path
              d="M16 2 L16 10 M16 22 L16 30 M2 16 L10 16 M22 16 L30 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="top-nav__title">SENTINELLE AI</span>
      </div>

      {/* Navigation principale */}
      <div className="top-nav__menu">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
          end
        >
          <svg className="top-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/cameras"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
        >
          <svg className="top-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Caméras</span>
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
        >
          <svg className="top-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 2v20M3 8h18M3 16h18" strokeLinecap="round" />
          </svg>
          <span>Événements</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
        >
          <svg className="top-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m6-12l-3 3m-6 6l-3 3m12-6h-6m-6 0H1m18 0l-3-3m-6-6L7 4" strokeLinecap="round" />
          </svg>
          <span>Paramètres</span>
        </NavLink>
      </div>

      {/* Actions droite */}
      <div className="top-nav__actions">
        {/* Indicateur de connexion */}
        <div className="top-nav__status">
          <div className="top-nav__status-dot top-nav__status-dot--connected" />
          <span className="top-nav__status-text">Connected</span>
        </div>

        {/* Notifications */}
        <button className="top-nav__action-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
          </svg>
        </button>

        {/* Profil utilisateur */}
        <div className="top-nav__profile">
          <button
            className="top-nav__profile-btn"
            onClick={toggleProfileMenu}
            aria-label="Menu utilisateur"
          >
            <div className="top-nav__avatar">
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <svg
              className={`top-nav__profile-arrow ${showProfileMenu ? 'top-nav__profile-arrow--open' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Menu déroulant profil */}
          {showProfileMenu && (
            <div className="top-nav__dropdown">
              <div className="top-nav__dropdown-header">
                <div className="top-nav__dropdown-avatar">
                  {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="top-nav__dropdown-name">
                    {currentUser?.username || 'Utilisateur'}
                  </div>
                  <div className="top-nav__dropdown-email">
                    {currentUser?.email || 'user@sentinelle.ai'}
                  </div>
                </div>
              </div>

              <div className="top-nav__dropdown-divider" />

              <button className="top-nav__dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Mon profil
              </button>

              <button className="top-nav__dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m6-12l-3 3m-6 6l-3 3m12-6h-6m-6 0H1m18 0l-3-3m-6-6L7 4" />
                </svg>
                Paramètres
              </button>

              <div className="top-nav__dropdown-divider" />

              <button
                className="top-nav__dropdown-item top-nav__dropdown-item--danger"
                onClick={handleLogout}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Déconnexion
              </button>
            </div>
          )}
        </div>

        {/* Menu burger (mobile - futur) */}
        <button className="top-nav__burger" aria-label="Menu mobile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
            <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
            <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Overlay pour fermer le menu profil */}
      {showProfileMenu && (
        <div
          className="top-nav__overlay"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </nav>
  );
};

export default TopNavigationBar;
