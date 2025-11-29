/**
 * Redux Slice pour la gestion des caméras
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Camera, CameraStats } from '../../types';

interface CamerasState {
  cameras: Record<string, Camera>;
  stats: Record<string, CameraStats>;
  selectedCameraId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CamerasState = {
  cameras: {},
  stats: {},
  selectedCameraId: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCameras = createAsyncThunk(
  'cameras/fetchCameras',
  async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/api/cameras`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch cameras: ${response.status}`);
    }

    return await response.json();
  }
);

export const fetchCameraStats = createAsyncThunk(
  'cameras/fetchStats',
  async (cameraId: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/api/cameras/${cameraId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch camera stats: ${response.status}`);
    }

    return await response.json();
  }
);

export const startCamera = createAsyncThunk(
  'cameras/start',
  async (cameraId: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/api/cameras/${cameraId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to start camera: ${response.status}`);
    }

    const data = await response.json();
    return data.camera;
  }
);

export const stopCamera = createAsyncThunk(
  'cameras/stop',
  async (cameraId: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/api/cameras/${cameraId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to stop camera: ${response.status}`);
    }

    const data = await response.json();
    return data.camera;
  }
);

// Slice
const camerasSlice = createSlice({
  name: 'cameras',
  initialState,
  reducers: {
    // Actions synchrones
    addCamera: (state, action: { payload: Camera; type: string }) => {
      state.cameras[action.payload.id] = action.payload;
    },

    updateCamera: (state, action: { payload: Camera; type: string }) => {
      if (state.cameras[action.payload.id]) {
        state.cameras[action.payload.id] = action.payload;
      }
    },

    removeCamera: (state, action: { payload: string; type: string }) => {
      delete state.cameras[action.payload];
      delete state.stats[action.payload];
      if (state.selectedCameraId === action.payload) {
        state.selectedCameraId = null;
      }
    },

    updateCameraStatus: (state, action: { payload: { id: string; status: Camera['status'] }; type: string }) => {
      if (state.cameras[action.payload.id]) {
        state.cameras[action.payload.id].status = action.payload.status;
        state.cameras[action.payload.id].last_seen = new Date().toISOString();
      }
    },

    updateCameraStats: (state, action: { payload: CameraStats; type: string }) => {
      state.stats[action.payload.camera_id] = action.payload;
    },

    selectCamera: (state, action: { payload: string | null; type: string }) => {
      state.selectedCameraId = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch cameras
    builder.addCase(fetchCameras.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCameras.fulfilled, (state, action) => {
      state.isLoading = false;
      state.cameras = action.payload.reduce((acc: Record<string, Camera>, camera: Camera) => {
        acc[camera.id] = camera;
        return acc;
      }, {});
    });
    builder.addCase(fetchCameras.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch cameras';
    });

    // Fetch stats
    builder.addCase(fetchCameraStats.fulfilled, (state, action) => {
      state.stats[action.payload.camera_id] = action.payload;
    });

    // Start camera
    builder.addCase(startCamera.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(startCamera.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload && action.payload.id) {
        state.cameras[action.payload.id] = action.payload;
      }
    });
    builder.addCase(startCamera.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to start camera';
    });

    // Stop camera
    builder.addCase(stopCamera.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(stopCamera.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload && action.payload.id) {
        state.cameras[action.payload.id] = action.payload;
      }
    });
    builder.addCase(stopCamera.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to stop camera';
    });
  },
});

// Export actions
export const {
  addCamera,
  updateCamera,
  removeCamera,
  updateCameraStatus,
  updateCameraStats,
  selectCamera,
  clearError,
} = camerasSlice.actions;

// Selectors
export const selectAllCameras = (state: { cameras: CamerasState }) =>
  Object.values(state.cameras.cameras);

export const selectCameraById = (state: { cameras: CamerasState }, id: string) =>
  state.cameras.cameras[id];

export const selectActiveCameras = (state: { cameras: CamerasState }) =>
  Object.values(state.cameras.cameras).filter(cam => cam.status === 'active');

export const selectCameraStats = (state: { cameras: CamerasState }, id: string) =>
  state.cameras.stats[id];

export const selectSelectedCamera = (state: { cameras: CamerasState }) => {
  const id = state.cameras.selectedCameraId;
  return id ? state.cameras.cameras[id] : null;
};

export default camerasSlice.reducer;
