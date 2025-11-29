/**
 * Composant App principal
 * Configure le routing et la structure globale de l'application
 */
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/store';
import { verifyToken, selectIsAuthenticated } from './store/slices/authSlice';
import { wsService } from './services/websocket';

// Pages
import Dashboard from './pages/Dashboard';
import Cameras from './pages/Cameras';
import Login from './pages/Login';

// Styles globaux
import './App.css';

/**
 * Composant de route protégée (nécessite authentification)
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Si non authentifié, rediriger vers login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si authentifié, afficher le contenu
  return <>{children}</>;
};

/**
 * Composant App principal
 */
function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  /**
   * Vérifier l'authentification au montage
   */
  useEffect(() => {
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('token');

    // Si token présent, vérifier sa validité
    if (token) {
      console.log('Token found, verifying...');
      dispatch(verifyToken(token));
    }
  }, [dispatch]);

  /**
   * Connecter le WebSocket une fois authentifié
   */
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, connecting WebSocket...');

      // Vérifier si déjà connecté
      if (!wsService.isConnected()) {
        wsService.connect();
      }
    }

    // Cleanup: déconnecter au démontage
    return () => {
      // Note: on ne déconnecte pas ici car on veut garder
      // la connexion active entre les pages
    };
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Route Dashboard (protégée) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Route Dashboard explicite */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Page Cameras */}
          <Route
            path="/cameras"
            element={
              <ProtectedRoute>
                <Cameras />
              </ProtectedRoute>
            }
          />

          {/* Page Events (à implémenter) */}
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <div className="page-placeholder">
                  <h1>Page Événements</h1>
                  <p>Historique des événements - À implémenter</p>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Page Settings (à implémenter) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div className="page-placeholder">
                  <h1>Page Paramètres</h1>
                  <p>Configuration du système - À implémenter</p>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Page Login */}
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <Login />
            }
          />

          {/* Route 404 */}
          <Route
            path="*"
            element={
              <div className="page-placeholder page-placeholder--center">
                <h1>404 - Page non trouvée</h1>
                <p>La page que vous cherchez n'existe pas</p>
                <button onClick={() => (window.location.href = '/')}>
                  Retour à l'accueil
                </button>
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
