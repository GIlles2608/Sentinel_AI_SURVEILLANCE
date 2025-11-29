/**
 * Redux Slice pour la gestion des événements
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Event, EventType, EventSeverity } from '../../types';

interface EventsState {
  events: Event[];
  unacknowledgedCount: number;
  filters: EventFilters;
  isLoading: boolean;
  error: string | null;
}

interface EventFilters {
  cameraId?: string;
  eventType?: EventType;
  severity?: EventSeverity;
  startDate?: string;
  endDate?: string;
  acknowledged?: boolean;
  page?: number;
  pageSize?: number;
}

const initialState: EventsState = {
  events: [],
  unacknowledgedCount: 0,
  filters: {},
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (filters?: EventFilters) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(filters as any);

    const response = await fetch(`${API_URL}/api/events?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`);
    }

    return await response.json();
  }
);

export const acknowledgeEvent = createAsyncThunk(
  'events/acknowledge',
  async (eventId: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/api/events/${eventId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to acknowledge event: ${response.status}`);
    }

    return await response.json();
  }
);

// Slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action: { payload: Event; type: string }) => {
      state.events.unshift(action.payload);
      if (!action.payload.acknowledged) {
        state.unacknowledgedCount++;
      }
      // Limiter à 1000 événements en mémoire
      if (state.events.length > 1000) {
        state.events = state.events.slice(0, 1000);
      }
    },

    updateEvent: (state, action: { payload: Event; type: string }) => {
      const index = state.events.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        const wasUnacknowledged = !state.events[index].acknowledged;
        const isAcknowledged = action.payload.acknowledged;

        state.events[index] = action.payload;

        if (wasUnacknowledged && isAcknowledged) {
          state.unacknowledgedCount = Math.max(0, state.unacknowledgedCount - 1);
        }
      }
    },

    setFilters: (state, action: { payload: EventFilters; type: string }) => {
      state.filters = action.payload;
    },

    clearFilters: (state) => {
      state.filters = {};
    },

    clearEvents: (state) => {
      state.events = [];
      state.unacknowledgedCount = 0;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch events
    builder.addCase(fetchEvents.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      state.isLoading = false;
      state.events = action.payload.items || action.payload;
      state.unacknowledgedCount = state.events.filter(e => !e.acknowledged).length;
    });
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch events';
    });

    // Acknowledge event
    builder.addCase(acknowledgeEvent.fulfilled, (state, action) => {
      const index = state.events.findIndex(e => e.id === action.payload.id);
      if (index !== -1 && !state.events[index].acknowledged) {
        state.events[index].acknowledged = true;
        state.unacknowledgedCount = Math.max(0, state.unacknowledgedCount - 1);
      }
    });
  },
});

// Export actions
export const {
  addEvent,
  updateEvent,
  setFilters,
  clearFilters,
  clearEvents,
  clearError,
} = eventsSlice.actions;

// Selectors
export const selectAllEvents = (state: { events: EventsState }) => state.events.events;

export const selectFilteredEvents = (state: { events: EventsState }) => {
  const { events, filters } = state.events;

  return events.filter(event => {
    if (filters.cameraId && event.camera_id !== filters.cameraId) return false;
    if (filters.eventType && event.event_type !== filters.eventType) return false;
    if (filters.severity && event.severity !== filters.severity) return false;
    if (filters.acknowledged !== undefined && event.acknowledged !== filters.acknowledged) return false;

    if (filters.startDate) {
      const eventDate = new Date(event.timestamp);
      const startDate = new Date(filters.startDate);
      if (eventDate < startDate) return false;
    }

    if (filters.endDate) {
      const eventDate = new Date(event.timestamp);
      const endDate = new Date(filters.endDate);
      if (eventDate > endDate) return false;
    }

    return true;
  });
};

export const selectUnacknowledgedCount = (state: { events: EventsState }) =>
  state.events.unacknowledgedCount;

export const selectCriticalEvents = (state: { events: EventsState }) =>
  state.events.events.filter(e => e.severity === 'critical' && !e.acknowledged);

export default eventsSlice.reducer;
