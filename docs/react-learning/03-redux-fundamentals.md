# Redux Toolkit - Fondamentaux

## 🎯 Qu'est-ce que Redux ?

**Redux** est une bibliothèque de **gestion d'état global** pour React.

**Problème sans Redux:**
- Le state est local à chaque composant
- Difficile de partager des données entre composants éloignés
- Prop drilling: passer des props sur plusieurs niveaux

**Solution avec Redux:**
- Un **store central** contient tout l'état de l'application
- Tous les composants peuvent accéder à cet état
- État prévisible et facile à déboguer

---

## 1. Architecture Redux

### Schéma du Flux de Données

```
┌──────────────┐
│  Component   │ ──dispatch(action)──┐
└──────────────┘                     │
       ↑                             ↓
       │                      ┌─────────────┐
       │                      │   Reducer   │
       │                      └─────────────┘
       │                             │
       │                             ↓
       │                      ┌─────────────┐
       └───useSelector────────│    Store    │
                              └─────────────┘
```

**Flux:**
1. **Component** déclenche une **action** (ex: "ajouter une caméra")
2. **Reducer** reçoit l'action et met à jour le **state**
3. **Store** notifie tous les composants abonnés
4. **Component** se re-rend avec les nouvelles données

---

## 2. Le Store

**🎯 Objectif:** Créer le store central qui contient tout l'état de l'application

### Configuration du Store

```tsx
// Fichier: frontend/src/store/store.ts

// Importer configureStore depuis Redux Toolkit
// configureStore simplifie la configuration du store
import { configureStore } from '@reduxjs/toolkit';

// Importer les hooks React-Redux typés
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Importer les reducers (un par slice/fonctionnalité)
// Chaque reducer gère une partie de l'état global
import camerasReducer from './slices/camerasSlice';    // Gère les caméras
import eventsReducer from './slices/eventsSlice';      // Gère les événements
import authReducer from './slices/authSlice';          // Gère l'authentification

// Créer et configurer le store Redux
export const store = configureStore({
  // 'reducer' définit la structure de l'état global
  // Chaque clé devient une propriété du state global
  reducer: {
    cameras: camerasReducer,   // state.cameras sera géré par camerasReducer
    events: eventsReducer,     // state.events sera géré par eventsReducer
    auth: authReducer,         // state.auth sera géré par authReducer
  },

  // 'middleware' permet d'ajouter des comportements personnalisés
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Configuration du check de sérialisation
      serializableCheck: {
        // Ignorer certaines actions qui contiennent des données non-sérialisables
        // (ex: fonctions, classes, etc.)
        ignoredActions: ['cameras/updateCameraStats'],
      },
    }),
});

// TYPES TYPESCRIPT pour typage fort

// Type RootState = type de tout l'état du store
// Exemple: { cameras: {...}, events: {...}, auth: {...} }
export type RootState = ReturnType<typeof store.getState>;

// Type AppDispatch = type de la fonction dispatch
// Utilisé pour typer les actions asynchrones (thunks)
export type AppDispatch = typeof store.dispatch;

// HOOKS TYPÉS pour utilisation dans les composants

// Hook typé pour dispatcher des actions
// Utiliser ceci au lieu de useDispatch natif
export const useAppDispatch: () => AppDispatch = useDispatch;

// Hook typé pour sélectionner des données du store
// Utiliser ceci au lieu de useSelector natif
// TypedUseSelectorHook ajoute l'autocomplétion du state
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Utilisation du Store dans l'App

**🎯 Objectif:** Connecter le store à l'application React pour que tous les composants y aient accès

```tsx
// Fichier: frontend/src/main.tsx (ou App.tsx)

import React from 'react';
import ReactDOM from 'react-dom/client';

// Importer le Provider de React-Redux
// Provider rend le store accessible à tous les composants enfants
import { Provider } from 'react-redux';

// Importer notre store configuré
import { store } from './store/store';

// Importer le composant racine de l'app
import App from './App';

// Créer la racine React
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Provider enveloppe toute l'application */}
    {/* Passer le store via la prop 'store' */}
    {/* Tous les composants enfants peuvent maintenant accéder au store */}
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

---

## 3. Les Slices

Un **slice** est une portion du state avec ses reducers et actions associés.

**🎯 Objectif:** Créer un slice pour gérer les caméras (liste, stats, sélection)

### Structure d'un Slice

```tsx
// Fichier: frontend/src/store/slices/camerasSlice.ts

// Importer createSlice depuis Redux Toolkit
// createSlice crée automatiquement les actions et le reducer
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Importer les types TypeScript
import type { Camera, CameraStats } from '../../types';

// DÉFINIR LE STATE INITIAL

// Interface définissant la structure du state de ce slice
interface CamerasState {
  // 'cameras' est un dictionnaire: { 'cam1': {...}, 'cam2': {...} }
  // Record<string, Camera> = objet avec clés string et valeurs Camera
  cameras: Record<string, Camera>;

  // 'stats' stocke les statistiques de chaque caméra
  stats: Record<string, CameraStats>;

  // 'selectedCameraId' est l'ID de la caméra actuellement sélectionnée
  // null si aucune sélection
  selectedCameraId: string | null;

  // 'isLoading' indique si une requête est en cours
  isLoading: boolean;

  // 'error' contient le message d'erreur s'il y en a une
  error: string | null;
}

// Valeur initiale du state au démarrage de l'app
const initialState: CamerasState = {
  cameras: {},              // Pas de caméras au départ
  stats: {},                // Pas de stats
  selectedCameraId: null,   // Aucune sélection
  isLoading: false,         // Pas de chargement
  error: null,              // Pas d'erreur
};

// CRÉER LE SLICE

// createSlice génère automatiquement:
// - Les action creators
// - Le reducer
const camerasSlice = createSlice({
  // Nom du slice, préfixe des actions (ex: "cameras/addCamera")
  name: 'cameras',

  // State initial
  initialState,

  // Reducers = fonctions qui modifient le state
  // Chaque reducer correspond à une action
  reducers: {
    // ACTION: Ajouter une caméra au store
    // PayloadAction<Camera> = l'action contient un objet Camera en payload
    addCamera: (state, action: PayloadAction<Camera>) => {
      // action.payload contient l'objet Camera
      const camera = action.payload;

      // Ajouter la caméra au dictionnaire
      // state.cameras['cam1'] = { id: 'cam1', name: '...', ... }
      state.cameras[camera.id] = camera;

      // NOTE: Redux Toolkit utilise Immer, on peut modifier 'state' directement
      // Pas besoin de faire: return { ...state, cameras: { ...state.cameras, ... } }
    },

    // ACTION: Mettre à jour une caméra existante
    updateCamera: (state, action: PayloadAction<Camera>) => {
      const camera = action.payload;

      // Vérifier si la caméra existe déjà
      if (state.cameras[camera.id]) {
        // Remplacer l'ancienne caméra par la nouvelle
        state.cameras[camera.id] = camera;
      }
    },

    // ACTION: Supprimer une caméra
    removeCamera: (state, action: PayloadAction<string>) => {
      // action.payload contient l'ID de la caméra à supprimer
      const cameraId = action.payload;

      // Supprimer la caméra du dictionnaire
      delete state.cameras[cameraId];

      // Supprimer les stats associées
      delete state.stats[cameraId];

      // Si cette caméra était sélectionnée, désélectionner
      if (state.selectedCameraId === cameraId) {
        state.selectedCameraId = null;
      }
    },

    // ACTION: Mettre à jour seulement le statut d'une caméra
    updateCameraStatus: (
      state,
      action: PayloadAction<{ id: string; status: Camera['status'] }>
    ) => {
      // action.payload contient un objet avec id et status
      const { id, status } = action.payload;

      // Vérifier si la caméra existe
      if (state.cameras[id]) {
        // Modifier seulement le statut
        state.cameras[id].status = status;

        // Mettre à jour last_seen avec la date actuelle
        state.cameras[id].last_seen = new Date().toISOString();
      }
    },

    // ACTION: Mettre à jour les statistiques d'une caméra
    updateCameraStats: (
      state,
      action: PayloadAction<{ cameraId: string; stats: CameraStats }>
    ) => {
      const { cameraId, stats } = action.payload;

      // Enregistrer les stats dans le dictionnaire
      state.stats[cameraId] = stats;
    },

    // ACTION: Sélectionner une caméra
    selectCamera: (state, action: PayloadAction<string | null>) => {
      // Mettre à jour l'ID de la caméra sélectionnée
      state.selectedCameraId = action.payload;
    },
  },
});

// EXPORTER LES ACTIONS

// Extraire les action creators générés automatiquement
// Ces fonctions créent les actions à dispatcher
export const {
  addCamera,
  updateCamera,
  removeCamera,
  updateCameraStatus,
  updateCameraStats,
  selectCamera,
} = camerasSlice.actions;

// EXPORTER LES SELECTORS

// Selector = fonction pour extraire des données du state
// Évite la duplication de logique de sélection

// Sélectionner toutes les caméras (convertir dictionnaire en tableau)
export const selectAllCameras = (state: { cameras: CamerasState }) =>
  Object.values(state.cameras.cameras);  // Retourne Camera[]

// Sélectionner seulement les caméras actives
export const selectActiveCameras = (state: { cameras: CamerasState }) =>
  Object.values(state.cameras.cameras).filter(cam => cam.status === 'active');

// Sélectionner une caméra par son ID
export const selectCameraById = (state: { cameras: CamerasState }, id: string) =>
  state.cameras.cameras[id];  // Retourne Camera | undefined

// Sélectionner la caméra actuellement sélectionnée
export const selectSelectedCamera = (state: { cameras: CamerasState }) => {
  const { cameras, selectedCameraId } = state.cameras;
  // Si aucune sélection, retourne null
  // Sinon, retourne l'objet Camera correspondant
  return selectedCameraId ? cameras[selectedCameraId] : null;
};

// EXPORTER LE REDUCER

// Le reducer sera ajouté au store
export default camerasSlice.reducer;
```

---

## 4. Utiliser Redux dans les Composants

### Lire des Données du Store (useAppSelector)

**🎯 Objectif:** Afficher la liste des caméras depuis le store Redux

```tsx
// Importer le hook typé
import { useAppSelector } from '../store/store';

// Importer le selector
import { selectActiveCameras } from '../store/slices/camerasSlice';

function CameraList() {
  // useAppSelector permet de lire des données du store
  // selectActiveCameras filtre et retourne seulement les caméras actives
  // cameras est un tableau: Camera[]
  const cameras = useAppSelector(selectActiveCameras);

  // Le composant se re-rend automatiquement quand 'cameras' change dans le store

  return (
    <div>
      <h2>Caméras Actives ({cameras.length})</h2>

      {/* Boucle sur chaque caméra */}
      {cameras.map(camera => (
        <div key={camera.id}>
          <h3>{camera.name}</h3>
          <p>{camera.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### Modifier le Store (useAppDispatch)

**🎯 Objectif:** Ajouter une nouvelle caméra au store lors d'un clic

```tsx
// Importer le hook dispatch typé
import { useAppDispatch } from '../store/store';

// Importer l'action creator
import { addCamera } from '../store/slices/camerasSlice';

function AddCameraButton() {
  // useAppDispatch retourne la fonction dispatch
  // dispatch permet d'envoyer des actions au store
  const dispatch = useAppDispatch();

  // Fonction appelée lors du clic
  const handleAddCamera = () => {
    // Créer un nouvel objet Camera
    const newCamera: Camera = {
      id: 'cam_' + Date.now(),        // Générer un ID unique
      name: 'Nouvelle Caméra',
      rtsp_url: 'rtsp://...',
      location: 'Bureau',
      status: 'inactive',
      resolution: { width: 1920, height: 1080 },
      fps: 25,
      created_at: new Date().toISOString(),
    };

    // Dispatcher l'action addCamera avec le nouvel objet
    // 1. addCamera(newCamera) crée l'action: { type: 'cameras/addCamera', payload: newCamera }
    // 2. dispatch envoie l'action au store
    // 3. Le reducer addCamera est appelé et ajoute la caméra au state
    // 4. Tous les composants utilisant selectActiveCameras se re-rendent
    dispatch(addCamera(newCamera));

    console.log('Caméra ajoutée au store !');
  };

  return (
    <button onClick={handleAddCamera}>
      ➕ Ajouter une caméra
    </button>
  );
}
```

### Exemple Complet: Sélectionner une Caméra

**🎯 Objectif:** Liste de caméras cliquables, afficher la caméra sélectionnée

```tsx
import { useAppSelector, useAppDispatch } from '../store/store';
import { selectAllCameras, selectSelectedCamera, selectCamera } from '../store/slices/camerasSlice';

function CameraDashboard() {
  // Lire la liste de toutes les caméras
  const cameras = useAppSelector(selectAllCameras);

  // Lire la caméra actuellement sélectionnée (ou null)
  const selectedCamera = useAppSelector(selectSelectedCamera);

  // Récupérer la fonction dispatch
  const dispatch = useAppDispatch();

  // Fonction pour sélectionner une caméra
  const handleSelectCamera = (cameraId: string) => {
    // Dispatcher l'action selectCamera avec l'ID
    // Met à jour selectedCameraId dans le store
    dispatch(selectCamera(cameraId));
  };

  return (
    <div>
      {/* Liste des caméras */}
      <div>
        <h2>Caméras</h2>
        {cameras.map(camera => (
          <div
            key={camera.id}
            // Ajouter classe 'selected' si c'est la caméra sélectionnée
            className={selectedCamera?.id === camera.id ? 'selected' : ''}
            // Clic = sélectionner cette caméra
            onClick={() => handleSelectCamera(camera.id)}
          >
            {camera.name}
          </div>
        ))}
      </div>

      {/* Détails de la caméra sélectionnée */}
      <div>
        <h2>Détails</h2>
        {selectedCamera ? (
          // Afficher les infos si une caméra est sélectionnée
          <div>
            <h3>{selectedCamera.name}</h3>
            <p>Statut: {selectedCamera.status}</p>
            <p>Localisation: {selectedCamera.location}</p>
            <p>FPS: {selectedCamera.fps}</p>
          </div>
        ) : (
          // Message si aucune sélection
          <p>Aucune caméra sélectionnée</p>
        )}
      </div>
    </div>
  );
}
```

---

## 📝 Résumé

| Concept | Description | Fichier |
|---------|-------------|---------|
| **Store** | État global central | `store/store.ts` |
| **Slice** | Portion du state avec ses reducers | `store/slices/camerasSlice.ts` |
| **Reducer** | Fonction qui modifie le state | `addCamera: (state, action) => {...}` |
| **Action** | Objet décrivant un changement | `{ type: 'cameras/addCamera', payload: camera }` |
| **Selector** | Fonction qui extrait des données | `selectActiveCameras(state)` |
| **useAppSelector** | Hook pour lire le store | `const cameras = useAppSelector(selectAllCameras)` |
| **useAppDispatch** | Hook pour modifier le store | `dispatch(addCamera(newCamera))` |

---

## 🎯 Prochaine Étape

➡️ **[04-redux-async.md](04-redux-async.md)** - Gérer les appels API asynchrones avec Redux Thunks
