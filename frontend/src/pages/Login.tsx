/**
 * Page de connexion - Design Sentinel 2.0
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/store';
import { loginAsync } from '../store/slices/authSlice';
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
      const result = await dispatch(loginAsync({ username, password })).unwrap();

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      // Redirection vers le dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Contactez votre administrateur pour réinitialiser votre mot de passe');
  };

  const handleGoogleSignIn = () => {
    alert('Fonctionnalité Google Sign-In à venir');
  };

  const handleCreateAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Contactez votre administrateur pour créer un compte');
  };

  return (
    <div className="signin-container">
      {/* Left column: sign-in form */}
      <section className="signin-form-column">
        <div className="signin-form-wrapper">
          <div className="signin-content">
            <h1 className="signin-title animate-element animate-delay-100">
              <span style={{ fontWeight: 300 }}>Bienvenue</span>
            </h1>
            <p className="signin-subtitle animate-element animate-delay-200">
              Accédez à votre compte et continuez votre parcours avec nous
            </p>

            {/* Error message */}
            {error && (
              <div className="error-message show animate-element">
                {error}
              </div>
            )}

            <form className="signin-form" onSubmit={handleSubmit}>
              <div className="form-field animate-element animate-delay-300">
                <label className="form-label">Nom d'utilisateur</label>
                <div className="glass-input-wrapper">
                  <input
                    type="text"
                    placeholder="Entrez votre nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-field animate-element animate-delay-400">
                <label className="form-label">Mot de passe</label>
                <div className="glass-input-wrapper password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options animate-element animate-delay-500">
                <label className="remember-me-label">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Rester connecté</span>
                </label>
                <a href="#" className="reset-password-link" onClick={handleResetPassword}>
                  Réinitialiser le mot de passe
                </a>
              </div>

              <button
                type="submit"
                className="signin-button animate-element animate-delay-600"
                disabled={isLoading}
              >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            <div className="divider animate-element animate-delay-700">
              <span className="divider-text">Ou continuer avec</span>
            </div>

            <button
              className="google-button animate-element animate-delay-800"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Continuer avec Google
            </button>

            <p className="footer-text animate-element animate-delay-900">
              Nouveau sur notre plateforme?{' '}
              <a href="#" className="footer-link" onClick={handleCreateAccount}>
                Créer un compte
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      <section className="hero-column">
        <div
          className="hero-image animate-slide-right"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)'
          }}
        />
      </section>
    </div>
  );
};

export default Login;
