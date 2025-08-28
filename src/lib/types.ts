// Core WitnessChain data types for the dashboard

export interface Event {
  id: string;
  timestamp: number; // Unix timestamp with microseconds
  event_type: EventType;
  file_path?: string;
  data: Record<string, any>;
  session_id?: string;
  developer_id?: string;
}

export type EventType = 
  | 'file_created'
  | 'file_modified' 
  | 'file_deleted'
  | 'file_renamed'
  | 'git_commit'
  | 'git_branch_created'
  | 'git_branch_deleted'
  | 'build_started'
  | 'build_completed'
  | 'build_failed'
  | 'test_started'
  | 'test_completed'
  | 'test_failed';

export interface FileChange {
  path: string;
  lines_added: number;
  lines_removed: number;
  chars_delta: number;
  operations: string[];
}

export interface CodeMetrics {
  file_path: string;
  language?: string;
  lines_of_code: number;
  comment_lines: number;
  blank_lines: number;
  complexity_score?: number;
  function_count: number;
  class_count: number;
  import_count: number;
  timestamp: number;
}

export interface DeveloperSession {
  session_id: string;
  developer_id: string;
  start_time: number;
  end_time: number;
  files_touched: number;
  lines_changed: number;
  commits_made: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  last_modified?: number;
  language?: string;
  children?: FileNode[];
}

export interface BuildInfo {
  id: string;
  timestamp: number;
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  success_rate: number;
  error_message?: string;
}

export interface GitInfo {
  branch: string;
  commit_hash: string;
  commit_message: string;
  author: string;
  files_changed: number;
  insertions: number;
  deletions: number;
}

// Dashboard-specific types
export interface DashboardState {
  connected: boolean;
  events: Event[];
  metrics: CodeMetrics[];
  sessions: DeveloperSession[];
  fileStructure: FileNode;
  lastUpdate: number;
  error?: string;
}

export interface TimeRange {
  start: number;
  end: number;
  label: string;
}

export interface Filter {
  developers: string[];
  fileTypes: string[];
  eventTypes: EventType[];
  timeRange: TimeRange;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ActivityData {
  hour: number;
  day: number;
  activity: number;
  developer: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'event' | 'metrics' | 'heartbeat' | 'error';
  data: any;
  timestamp: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  latency?: number;
  error?: string;
}

// Chart data structures
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  category?: string;
  label?: string;
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  label: string;
}

export interface TreemapNode {
  name: string;
  value: number;
  color?: string;
  children?: TreemapNode[];
}

// Performance monitoring
export interface PerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  memoryUsage: number;
  eventQueueSize: number;
  wsLatency: number;
}