/**
 * Login Page - Sentinel AI Premium Design v3.0
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/store';
import { loginAsync } from '../store/slices/authSlice';
import { Eye, EyeOff, AlertCircle, Shield, Zap, Video, Lock } from 'lucide-react';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await dispatch(loginAsync({ username, password })).unwrap();

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Contactez votre administrateur pour reinitialiser votre mot de passe');
  };

  const handleGoogleSignIn = () => {
    alert('Connexion Google bientot disponible');
  };

  const handleCreateAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Contactez votre administrateur pour creer un compte');
  };

  return (
    <div className="login-page">
      {/* Form Section */}
      <section className="login-form-section">
        <div className="login-form-container">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo">
              <Shield strokeWidth={2} />
            </div>
            <div className="login-brand-text">
              <span className="login-brand-name">Sentinel AI</span>
              <span className="login-brand-tagline">Surveillance Intelligente</span>
            </div>
          </div>

          {/* Header */}
          <div className="login-header">
            <h1 className="login-title">Bon retour</h1>
            <p className="login-subtitle">
              Connectez-vous pour acceder a votre tableau de bord de surveillance
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error">
              <AlertCircle className="login-error-icon" />
              <span className="login-error-text">{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="login-field">
              <label className="login-label" htmlFor="username">
                Nom d'utilisateur
              </label>
              <div className="login-input-wrapper">
                <input
                  id="username"
                  type="text"
                  className="login-input"
                  placeholder="Entrez votre identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field">
              <label className="login-label" htmlFor="password">
                Mot de passe
              </label>
              <div className="login-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input login-input--password"
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="login-options">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  className="login-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Rester connecte</span>
              </label>
              <a href="#" className="login-forgot-link" onClick={handleForgotPassword}>
                Mot de passe oublie ?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`login-submit ${isLoading ? 'login-submit--loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading && <span className="login-submit-spinner" />}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">ou continuer avec</span>
            <span className="login-divider-line" />
          </div>

          {/* Social Login */}
          <div className="login-social">
            <button
              type="button"
              className="login-social-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuer avec Google
            </button>
          </div>

          {/* Footer */}
          <p className="login-footer">
            Nouveau sur Sentinel AI ?{' '}
            <a href="#" className="login-footer-link" onClick={handleCreateAccount}>
              Demander un acces
            </a>
          </p>
        </div>
      </section>

      {/* Hero Section */}
      <section className="login-hero-section">
        <div className="login-hero-content">
          <div className="login-hero-bg" />
          <div className="login-hero-grid" />
          <div className="login-hero-overlay">
            <h2 className="login-hero-title">
              Surveillance video<br />
              nouvelle generation
            </h2>
            <p className="login-hero-description">
              Exploitez la puissance de l'intelligence artificielle pour une securite renforcee
              et une detection proactive des menaces.
            </p>
            <div className="login-hero-features">
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Video strokeWidth={2} />
                </div>
                <span className="login-hero-feature-text">
                  Streaming video temps reel multi-cameras
                </span>
              </div>
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Zap strokeWidth={2} />
                </div>
                <span className="login-hero-feature-text">
                  Detection IA avec alertes instantanees
                </span>
              </div>
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Lock strokeWidth={2} />
                </div>
                <span className="login-hero-feature-text">
                  Securite enterprise avec chiffrement E2E
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
