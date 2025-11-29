/**
 * Configuration du Redux Store
 */
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import camerasReducer from './slices/camerasSlice';
import eventsReducer from './slices/eventsSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    cameras: camerasReducer,
    events: eventsReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore ces actions pour les checks de sérialization
        ignoredActions: ['cameras/updateCameraStats'],
      },
    }),
});

// Types pour TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks typés pour utilisation dans les composants
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <TSelected = unknown>(
  selector: (state: RootState) => TSelected
): TSelected => useSelector(selector);
