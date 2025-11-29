/**
 * Point d'entrée de l'application React
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App.tsx';
import './index.css';

// Créer la racine React et rendre l'application
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Provider Redux pour rendre le store accessible à toute l'app */}
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
