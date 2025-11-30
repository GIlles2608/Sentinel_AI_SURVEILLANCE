/**
 * TopNavigationBar - Sentinel AI Premium Design v3.0
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { logout, selectCurrentUser } from '../../store/slices/authSlice';
import {
  Shield,
  LayoutDashboard,
  Camera,
  Calendar,
  Settings,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Menu
} from 'lucide-react';
import './TopNavigationBar.css';

interface TopNavigationBarProps {
  className?: string;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <nav className={`top-nav ${className || ''}`}>
      {/* Brand / Logo */}
      <div className="top-nav__brand">
        <div className="top-nav__logo">
          <Shield strokeWidth={2} />
        </div>
        <span className="top-nav__title">
          Sentinel <span className="top-nav__title-ai">AI</span>
        </span>
      </div>

      {/* Navigation Menu */}
      <div className="top-nav__menu">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
          end
        >
          <LayoutDashboard className="top-nav__icon" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/cameras"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
        >
          <Camera className="top-nav__icon" />
          <span>Cameras</span>
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
        >
          <Calendar className="top-nav__icon" />
          <span>Evenements</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `top-nav__link ${isActive ? 'top-nav__link--active' : ''}`
          }
        >
          <Settings className="top-nav__icon" />
          <span>Parametres</span>
        </NavLink>
      </div>

      {/* Right Actions */}
      <div className="top-nav__actions">
        {/* Connection Status */}
        <div className="top-nav__status">
          <div className="top-nav__status-dot top-nav__status-dot--connected" />
          <span className="top-nav__status-text">En ligne</span>
        </div>

        {/* Notifications */}
        <button className="top-nav__action-btn" aria-label="Notifications">
          <Bell />
        </button>

        {/* Profile Dropdown */}
        <div className="top-nav__profile">
          <button
            className="top-nav__profile-btn"
            onClick={toggleProfileMenu}
            aria-label="Menu utilisateur"
          >
            <div className="top-nav__avatar">
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <ChevronDown
              className={`top-nav__profile-arrow ${showProfileMenu ? 'top-nav__profile-arrow--open' : ''}`}
            />
          </button>

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
                    {currentUser?.email || 'admin@sentinel.ai'}
                  </div>
                </div>
              </div>

              <div className="top-nav__dropdown-divider" />

              <button className="top-nav__dropdown-item">
                <User />
                Mon profil
              </button>

              <button className="top-nav__dropdown-item">
                <Settings />
                Parametres
              </button>

              <div className="top-nav__dropdown-divider" />

              <button
                className="top-nav__dropdown-item top-nav__dropdown-item--danger"
                onClick={handleLogout}
              >
                <LogOut />
                Deconnexion
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="top-nav__burger" aria-label="Menu mobile">
          <Menu />
        </button>
      </div>

      {/* Overlay to close profile menu */}
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
