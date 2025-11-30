/**
 * Service API REST pour communiquer avec le backend
 */
import type { Camera, Event, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || 'Request failed',
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // ===== Auth API =====

  async login(username: string, password: string) {
    return this.request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    const result = await this.request('/api/auth/logout', { method: 'POST' });
    this.clearToken();
    return result;
  }

  async verifyToken() {
    return this.request<{ user: any }>('/api/auth/verify');
  }

  // ===== Cameras API =====

  async getCameras() {
    return this.request<Camera[]>('/api/cameras');
  }

  async getCamera(id: string) {
    return this.request<Camera>(`/api/cameras/${id}`);
  }

  async createCamera(camera: Partial<Camera>) {
    return this.request<Camera>('/api/cameras', {
      method: 'POST',
      body: JSON.stringify(camera),
    });
  }

  async updateCamera(id: string, updates: Partial<Camera>) {
    return this.request<Camera>(`/api/cameras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCamera(id: string) {
    return this.request(`/api/cameras/${id}`, { method: 'DELETE' });
  }

  async getCameraStats(id: string) {
    return this.request(`/api/cameras/${id}/stats`);
  }

  // ===== Events API =====

  async getEvents(params?: {
    camera_id?: string;
    event_type?: string;
    severity?: string;
    start_date?: string;
    end_date?: string;
    acknowledged?: boolean;
    page?: number;
    page_size?: number;
  }) {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.request<Event[]>(`/api/events?${queryParams}`);
  }

  async getEvent(id: string) {
    return this.request<Event>(`/api/events/${id}`);
  }

  async acknowledgeEvent(id: string) {
    return this.request<Event>(`/api/events/${id}/acknowledge`, {
      method: 'POST',
    });
  }

  // ===== System API =====

  async getSystemStats() {
    return this.request('/api/system/stats');
  }

  async getSystemHealth() {
    return this.request('/api/system/health');
  }
}

// Export singleton instance
export const apiService = new ApiService(API_BASE_URL);

export default apiService;
