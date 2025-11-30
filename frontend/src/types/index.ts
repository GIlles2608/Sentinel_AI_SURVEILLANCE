/**
 * Types TypeScript pour Sentinel IA
 */

// ===== Camera Types =====

export interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  location: string;
  status: CameraStatus;
  resolution: Resolution;
  fps: number;
  created_at: string;
  last_seen?: string;
  is_recording?: boolean;
}

export type CameraStatus = 'active' | 'inactive' | 'error' | 'connecting';

export interface Resolution {
  width: number;
  height: number;
}

// ===== Detection Types =====

export interface Detection {
  id: string;
  camera_id: string;
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
  center: Point;
  has_pose: boolean;
  keypoints?: Keypoint[];
  timestamp: string;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Keypoint {
  id: number;
  name: string;
  x: number;
  y: number;
  confidence: number;
  visible: boolean;
}

// ===== Event Types =====

export interface Event {
  id: string;
  camera_id: string;
  event_type: EventType;
  severity: EventSeverity;
  confidence: number;
  description: string;
  metadata: EventMetadata;
  timestamp: string;
  acknowledged: boolean;
}

export type EventType =
  | 'detection'
  | 'intrusion'
  | 'fall'
  | 'aggressive_behavior'
  | 'theft'
  | 'loitering'
  | 'medical_distress';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EventMetadata {
  detections?: Detection[];
  zone?: string;
  duration?: number;
  [key: string]: any;
}

// ===== Stats Types =====

export interface CameraStats {
  camera_id: string;
  fps: number;
  latency: number;
  detections_count: number;
  events_count: number;
  uptime: number;
  last_update: string;
}

export interface SystemStats {
  cameras_active: number;
  cameras_total: number;
  events_today: number;
  detections_today: number;
  cpu_usage: number;
  memory_usage: number;
  gpu_usage?: number;
}

// ===== WebRTC Types =====

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'error';
  camera_id: string;
  data: any;
}

// ===== WebSocket Types =====

export interface WebSocketMessage {
  type: WSMessageType;
  data: any;
  timestamp: string;
}

export type WSMessageType =
  | 'camera_status'
  | 'detection'
  | 'event'
  | 'stats'
  | 'notification'
  | 'error';

// ===== Auth Types =====

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  created_at: string;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export type Permission =
  | 'view_cameras'
  | 'manage_cameras'
  | 'view_events'
  | 'acknowledge_events'
  | 'manage_users'
  | 'view_settings'
  | 'manage_settings';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ===== API Response Types =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ===== UI Types =====

export type GridLayout = 'auto' | '1x1' | '2x2' | '3x3' | '4x4';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// ===== Utility Types =====

export type Timestamp = string; // ISO 8601 format
export type UUID = string;
