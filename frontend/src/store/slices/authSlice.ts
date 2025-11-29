/**
 * Redux Slice pour l'authentification
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User, AuthState, Permission } from '../../types';

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'), // Auto-connecté si token présent
  isLoading: false,
};

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }) => {
    // Toujours utiliser l'API réelle (pas de mock)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    return {
      token: data.access_token,
      user: {
        id: credentials.username,
        username: credentials.username,
        email: `${credentials.username}@sentinel.ai`,
        role: 'admin' as const,
        permissions: ['view_cameras', 'manage_cameras', 'view_events', 'acknowledge_events', 'manage_users', 'view_settings', 'manage_settings'] as Permission[],
        created_at: new Date().toISOString(),
      }
    };
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
});

export const verifyToken = createAsyncThunk('auth/verify', async (token: string) => {
  const response = await fetch('/api/auth/verify', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Token invalid');
  }

  return await response.json();
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: { payload: User; type: string }) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginAsync.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(loginAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    });
    builder.addCase(loginAsync.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // Verify token
    builder.addCase(verifyToken.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    });
    builder.addCase(verifyToken.rejected, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    });
  },
});

export const { setUser, clearAuth } = authSlice.actions;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user; // Alias pour compatibilité
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;

export default authSlice.reducer;
