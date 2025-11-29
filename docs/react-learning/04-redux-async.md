# Redux Async - Thunks et API

## 🎯 Pourquoi les Thunks ?

Les **reducers** doivent être **synchrones** et **purs** (sans effet de bord).

**Problème:**
- Impossible de faire des appels API directement dans un reducer
- Besoin de gérer les états de chargement (loading, success, error)

**Solution: Redux Thunks**
- Les **thunks** sont des actions **asynchrones**
- Permettent de faire des appels API, setTimeout, etc.
- Gèrent automatiquement les états pending/fulfilled/rejected

---

## 1. Créer un Thunk

**🎯 Objectif:** Créer une action asynchrone pour charger les caméras depuis l'API

### Thunk Simple

```tsx
// Fichier: frontend/src/store/slices/camerasSlice.ts

// Importer createAsyncThunk depuis Redux Toolkit
// createAsyncThunk génère automatiquement 3 actions:
// - pending: la requête est en cours
// - fulfilled: la requête a réussi
// - rejected: la requête a échoué
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Importer le service API
import { apiService } from '../../services/api';

// Importer les types
import type { Camera } from '../../types';

// CRÉER LE THUNK ASYNCHRONE

// createAsyncThunk prend 2 paramètres:
// 1. Le nom de l'action (préfixe: 'cameras/fetchCameras')
// 2. Une fonction async qui effectue l'action
export const fetchCameras = createAsyncThunk(
  // Nom de l'action (doit être unique dans l'app)
  'cameras/fetchCameras',

  // Fonction async qui fait l'appel API
  // Cette fonction sera appelée quand on dispatch(fetchCameras())
  async () => {
    // Appeler l'API pour récupérer les caméras
    // apiService.getCameras() retourne une Promise<ApiResponse<Camera[]>>
    const response = await apiService.getCameras();

    // Vérifier si la requête a réussi
    if (!response.success) {
      // Si erreur, throw pour déclencher l'état 'rejected'
      throw new Error(response.error?.message || 'Erreur de chargement');
    }

    // Retourner les données
    // Cette valeur devient action.payload dans fulfilled
    return response.data;  // Type: Camera[]
  }
);

// GÉRER LE THUNK DANS LE SLICE

interface CamerasState {
  cameras: Record<string, Camera>;
  isLoading: boolean;     // Indique si une requête est en cours
  error: string | null;   // Message d'erreur si échec
}

const initialState: CamerasState = {
  cameras: {},
  isLoading: false,
  error: null,
};

const camerasSlice = createSlice({
  name: 'cameras',
  initialState,
  reducers: {
    // ... autres reducers synchrones
  },

  // extraReducers permet de gérer les actions créées par createAsyncThunk
  extraReducers: (builder) => {
    // builder.addCase ajoute un case pour chaque état du thunk

    // CAS 1: fetchCameras.pending
    // Déclenché quand on dispatch(fetchCameras()) et que la requête démarre
    builder.addCase(fetchCameras.pending, (state) => {
      // Indiquer qu'une requête est en cours
      state.isLoading = true;

      // Réinitialiser l'erreur précédente
      state.error = null;
    });

    // CAS 2: fetchCameras.fulfilled
    // Déclenché quand la requête réussit
    // action.payload contient les données retournées (Camera[])
    builder.addCase(fetchCameras.fulfilled, (state, action: PayloadAction<Camera[]>) => {
      // La requête est terminée
      state.isLoading = false;

      // action.payload = tableau de caméras retourné par le thunk
      const cameras = action.payload;

      // Convertir le tableau en dictionnaire
      // Avant: [{ id: 'cam1', ... }, { id: 'cam2', ... }]
      // Après: { 'cam1': { id: 'cam1', ... }, 'cam2': { id: 'cam2', ... } }
      state.cameras = cameras.reduce((acc, camera) => {
        acc[camera.id] = camera;
        return acc;
      }, {} as Record<string, Camera>);
    });

    // CAS 3: fetchCameras.rejected
    // Déclenché quand la requête échoue (erreur réseau, throw dans le thunk, etc.)
    builder.addCase(fetchCameras.rejected, (state, action) => {
      // La requête est terminée (avec erreur)
      state.isLoading = false;

      // action.error contient l'erreur
      // action.error.message = le message du throw dans le thunk
      state.error = action.error.message || 'Erreur inconnue';
    });
  },
});

export default camerasSlice.reducer;
```

---

## 2. Thunk avec Paramètres

**🎯 Objectif:** Créer un thunk qui charge les stats d'UNE caméra spécifique

```tsx
// Thunk qui prend un paramètre (cameraId)
export const fetchCameraStats = createAsyncThunk(
  'cameras/fetchCameraStats',

  // La fonction async prend les paramètres en argument
  // Ici: cameraId de type string
  async (cameraId: string) => {
    // Appeler l'API avec l'ID de la caméra
    const response = await apiService.getCameraStats(cameraId);

    // Vérifier le succès
    if (!response.success) {
      throw new Error(response.error?.message || 'Erreur stats');
    }

    // Retourner un objet contenant l'ID et les stats
    // On a besoin de l'ID dans le reducer pour savoir quelle caméra mettre à jour
    return {
      cameraId,           // ID de la caméra
      stats: response.data  // Statistiques
    };
  }
);

// Gérer dans extraReducers
builder.addCase(fetchCameraStats.fulfilled, (state, action) => {
  // action.payload contient { cameraId, stats }
  const { cameraId, stats } = action.payload;

  // Mettre à jour les stats de cette caméra spécifique
  state.stats[cameraId] = stats;
});
```

---

## 3. Utiliser les Thunks dans les Composants

**🎯 Objectif:** Charger les caméras depuis l'API au montage du composant

### Avec useEffect

```tsx
// Importer useEffect pour exécuter du code au montage
import { useEffect } from 'react';

// Importer les hooks Redux
import { useAppDispatch, useAppSelector } from '../store/store';

// Importer le thunk
import { fetchCameras } from '../store/slices/camerasSlice';

function CameraList() {
  // Récupérer dispatch pour appeler le thunk
  const dispatch = useAppDispatch();

  // Lire les données du store
  // cameras = dictionnaire de caméras
  const cameras = useAppSelector(state => state.cameras.cameras);

  // isLoading = true pendant le chargement
  const isLoading = useAppSelector(state => state.cameras.isLoading);

  // error = message d'erreur si échec
  const error = useAppSelector(state => state.cameras.error);

  // useEffect s'exécute après le premier rendu
  useEffect(() => {
    // Dispatcher le thunk pour charger les caméras
    // dispatch(fetchCameras()) déclenche:
    // 1. fetchCameras.pending -> isLoading = true
    // 2. Appel API
    // 3a. Si succès -> fetchCameras.fulfilled -> cameras mis à jour
    // 3b. Si échec -> fetchCameras.rejected -> error mis à jour
    dispatch(fetchCameras());

    // [] = tableau de dépendances vide
    // L'effet s'exécute SEULEMENT au montage du composant
    // Si on mettait [dispatch], il s'exécuterait à chaque fois que dispatch change (jamais)
  }, [dispatch]);

  // Affichage conditionnel selon l'état

  // État 1: Chargement en cours
  if (isLoading) {
    return <div>Chargement des caméras...</div>;
  }

  // État 2: Erreur
  if (error) {
    return (
      <div style={{ color: 'red' }}>
        Erreur: {error}
        {/* Bouton pour réessayer */}
        <button onClick={() => dispatch(fetchCameras())}>
          Réessayer
        </button>
      </div>
    );
  }

  // État 3: Succès - afficher les caméras
  const cameraList = Object.values(cameras);  // Convertir dictionnaire en tableau

  return (
    <div>
      <h2>Caméras ({cameraList.length})</h2>

      {/* Vérifier si la liste est vide */}
      {cameraList.length === 0 ? (
        <p>Aucune caméra trouvée</p>
      ) : (
        // Afficher chaque caméra
        cameraList.map(camera => (
          <div key={camera.id}>
            <h3>{camera.name}</h3>
            <p>Statut: {camera.status}</p>
          </div>
        ))
      )}

      {/* Bouton pour recharger */}
      <button onClick={() => dispatch(fetchCameras())}>
        🔄 Recharger
      </button>
    </div>
  );
}
```

### Gérer le Chargement avec un Bouton

**🎯 Objectif:** Charger les stats d'une caméra lors d'un clic

```tsx
import { useState } from 'react';
import { useAppDispatch } from '../store/store';
import { fetchCameraStats } from '../store/slices/camerasSlice';

function CameraStatsButton({ cameraId }: { cameraId: string }) {
  // State local pour gérer le chargement de CE bouton spécifique
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const dispatch = useAppDispatch();

  // Fonction appelée au clic
  const handleLoadStats = async () => {
    // Indiquer le début du chargement
    setIsLoadingStats(true);

    try {
      // Dispatcher le thunk
      // unwrap() permet de gérer le résultat comme une Promise normale
      await dispatch(fetchCameraStats(cameraId)).unwrap();

      console.log('Stats chargées avec succès !');
    } catch (error) {
      // Gérer l'erreur localement
      console.error('Erreur chargement stats:', error);
      alert('Impossible de charger les stats');
    } finally {
      // Fin du chargement (succès ou échec)
      setIsLoadingStats(false);
    }
  };

  return (
    <button
      onClick={handleLoadStats}
      disabled={isLoadingStats}  // Désactiver pendant le chargement
    >
      {/* Affichage conditionnel du texte */}
      {isLoadingStats ? 'Chargement...' : '📊 Voir les stats'}
    </button>
  );
}
```

---

## 4. Thunks avec Données Complexes

**🎯 Objectif:** Créer un thunk pour récupérer les événements avec filtres

### Thunk avec Objet de Paramètres

```tsx
// Type pour les paramètres du thunk
interface FetchEventsParams {
  cameraId?: string;      // Filtrer par caméra (optionnel)
  severity?: string;      // Filtrer par sévérité (optionnel)
  page?: number;          // Pagination
  pageSize?: number;
}

// Créer le thunk
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',

  // La fonction prend un objet de paramètres
  async (params: FetchEventsParams) => {
    // Appeler l'API avec les paramètres
    const response = await apiService.getEvents(params);

    if (!response.success) {
      throw new Error(response.error?.message || 'Erreur événements');
    }

    // Retourner les événements
    return response.data;  // Type: Event[]
  }
);

// Utilisation dans un composant
function EventList({ cameraId }: { cameraId?: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Dispatcher avec paramètres
    dispatch(fetchEvents({
      cameraId,        // Filtrer par cette caméra
      severity: 'high',
      page: 1,
      pageSize: 20,
    }));
  }, [dispatch, cameraId]);  // Re-charger si cameraId change

  // ... rest du composant
}
```

---

## 5. Gérer Plusieurs États de Chargement

**🎯 Objectif:** Gérer plusieurs requêtes simultanées avec états séparés

```tsx
interface CamerasState {
  cameras: Record<string, Camera>;
  stats: Record<string, CameraStats>;

  // États de chargement séparés pour chaque opération
  loadingStates: {
    fetchCameras: boolean;      // Chargement liste caméras
    fetchStats: boolean;         // Chargement stats
    updateCamera: boolean;       // Mise à jour en cours
  };

  // Erreurs séparées
  errors: {
    fetchCameras: string | null;
    fetchStats: string | null;
    updateCamera: string | null;
  };
}

const initialState: CamerasState = {
  cameras: {},
  stats: {},
  loadingStates: {
    fetchCameras: false,
    fetchStats: false,
    updateCamera: false,
  },
  errors: {
    fetchCameras: null,
    fetchStats: null,
    updateCamera: null,
  },
};

// Dans extraReducers
builder
  // fetchCameras
  .addCase(fetchCameras.pending, (state) => {
    state.loadingStates.fetchCameras = true;
    state.errors.fetchCameras = null;
  })
  .addCase(fetchCameras.fulfilled, (state, action) => {
    state.loadingStates.fetchCameras = false;
    // ... traiter les données
  })
  .addCase(fetchCameras.rejected, (state, action) => {
    state.loadingStates.fetchCameras = false;
    state.errors.fetchCameras = action.error.message || 'Erreur';
  })

  // fetchStats
  .addCase(fetchCameraStats.pending, (state) => {
    state.loadingStates.fetchStats = true;
    state.errors.fetchStats = null;
  })
  .addCase(fetchCameraStats.fulfilled, (state, action) => {
    state.loadingStates.fetchStats = false;
    const { cameraId, stats } = action.payload;
    state.stats[cameraId] = stats;
  })
  .addCase(fetchCameraStats.rejected, (state, action) => {
    state.loadingStates.fetchStats = false;
    state.errors.fetchStats = action.error.message || 'Erreur';
  });

// Selectors pour lire les états
export const selectIsFetchingCameras = (state: { cameras: CamerasState }) =>
  state.cameras.loadingStates.fetchCameras;

export const selectFetchCamerasError = (state: { cameras: CamerasState }) =>
  state.cameras.errors.fetchCameras;
```

---

## 6. Exemple Complet: CRUD Camera

**🎯 Objectif:** Implémenter toutes les opérations CRUD (Create, Read, Update, Delete) avec thunks

```tsx
// ============= THUNKS =============

// READ: Charger toutes les caméras
export const fetchCameras = createAsyncThunk(
  'cameras/fetchCameras',
  async () => {
    const response = await apiService.getCameras();
    if (!response.success) throw new Error(response.error?.message);
    return response.data;
  }
);

// CREATE: Créer une nouvelle caméra
export const createCamera = createAsyncThunk(
  'cameras/createCamera',
  async (cameraData: Partial<Camera>) => {
    const response = await apiService.createCamera(cameraData);
    if (!response.success) throw new Error(response.error?.message);
    return response.data;  // Caméra créée avec ID généré
  }
);

// UPDATE: Mettre à jour une caméra
export const updateCamera = createAsyncThunk(
  'cameras/updateCamera',
  async ({ id, updates }: { id: string; updates: Partial<Camera> }) => {
    const response = await apiService.updateCamera(id, updates);
    if (!response.success) throw new Error(response.error?.message);
    return response.data;  // Caméra mise à jour
  }
);

// DELETE: Supprimer une caméra
export const deleteCamera = createAsyncThunk(
  'cameras/deleteCamera',
  async (cameraId: string) => {
    const response = await apiService.deleteCamera(cameraId);
    if (!response.success) throw new Error(response.error?.message);
    return cameraId;  // Retourner l'ID pour supprimer du state
  }
);

// ============= SLICE =============

const camerasSlice = createSlice({
  name: 'cameras',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // CREATE
    builder.addCase(createCamera.fulfilled, (state, action) => {
      const newCamera = action.payload;
      state.cameras[newCamera.id] = newCamera;
    });

    // UPDATE
    builder.addCase(updateCamera.fulfilled, (state, action) => {
      const updatedCamera = action.payload;
      state.cameras[updatedCamera.id] = updatedCamera;
    });

    // DELETE
    builder.addCase(deleteCamera.fulfilled, (state, action) => {
      const cameraId = action.payload;
      delete state.cameras[cameraId];
      delete state.stats[cameraId];
    });

    // READ (déjà fait plus haut)
    builder.addCase(fetchCameras.fulfilled, (state, action) => {
      // ...
    });
  },
});

// ============= COMPOSANT =============

function CameraManager() {
  const dispatch = useAppDispatch();
  const cameras = useAppSelector(selectAllCameras);

  // Charger les caméras au montage
  useEffect(() => {
    dispatch(fetchCameras());
  }, [dispatch]);

  // Créer une caméra
  const handleCreate = async () => {
    const newCameraData = {
      name: 'Nouvelle Caméra',
      rtsp_url: 'rtsp://192.168.1.100:554/stream',
      location: 'Bureau',
    };

    try {
      await dispatch(createCamera(newCameraData)).unwrap();
      alert('Caméra créée !');
    } catch (error) {
      alert('Erreur création: ' + error);
    }
  };

  // Mettre à jour une caméra
  const handleUpdate = async (cameraId: string) => {
    try {
      await dispatch(updateCamera({
        id: cameraId,
        updates: { name: 'Nom modifié' }
      })).unwrap();
      alert('Caméra mise à jour !');
    } catch (error) {
      alert('Erreur mise à jour: ' + error);
    }
  };

  // Supprimer une caméra
  const handleDelete = async (cameraId: string) => {
    if (!confirm('Supprimer cette caméra ?')) return;

    try {
      await dispatch(deleteCamera(cameraId)).unwrap();
      alert('Caméra supprimée !');
    } catch (error) {
      alert('Erreur suppression: ' + error);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>➕ Nouvelle caméra</button>

      {cameras.map(camera => (
        <div key={camera.id}>
          <h3>{camera.name}</h3>
          <button onClick={() => handleUpdate(camera.id)}>✏️ Modifier</button>
          <button onClick={() => handleDelete(camera.id)}>🗑️ Supprimer</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 📝 Résumé

| Concept | Description | Exemple |
|---------|-------------|---------|
| **createAsyncThunk** | Crée une action asynchrone | `createAsyncThunk('cameras/fetch', async () => {...})` |
| **pending** | État: requête en cours | `builder.addCase(fetch.pending, ...)` |
| **fulfilled** | État: requête réussie | `builder.addCase(fetch.fulfilled, ...)` |
| **rejected** | État: requête échouée | `builder.addCase(fetch.rejected, ...)` |
| **unwrap()** | Récupère le résultat comme Promise | `await dispatch(fetch()).unwrap()` |
| **useEffect** | Exécuter code au montage | `useEffect(() => dispatch(fetch()), [])` |

---

## 🎯 Prochaine Étape

➡️ **[05-hooks.md](05-hooks.md)** - Maîtriser les Hooks React (useState, useEffect, custom hooks)
