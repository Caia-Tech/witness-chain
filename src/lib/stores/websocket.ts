// High-performance WebSocket store for real-time dashboard updates
import { writable, derived, type Readable } from 'svelte/store';
import type { Event, DashboardState, ConnectionStatus, WebSocketMessage } from '../types';
import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor.js';

interface WebSocketStore {
  connected: boolean;
  events: Event[];
  monitorEvents: MonitorEvent[];
  metrics: any[];
  lastUpdate: number;
  error?: string;
  latency?: number;
}

const MAX_EVENTS = 10000; // Keep last 10k events in memory
const RECONNECT_DELAY = 3000;
const HEARTBEAT_INTERVAL = 30000;

function createWebSocketStore(url: string) {
  const initialState: WebSocketStore = {
    connected: false,
    events: [],
    monitorEvents: [],
    metrics: [],
    lastUpdate: 0,
  };

  const { subscribe, set, update } = writable(initialState);

  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout;
  let heartbeatInterval: NodeJS.Timeout;
  let reconnectAttempts = 0;
  let lastHeartbeat = 0;

  // Performance monitoring
  let messageCount = 0;
  let bytesReceived = 0;
  let latencySum = 0;

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    console.log(`[WebSocket] Connecting to ${url}...`);
    
    try {
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        reconnectAttempts = 0;
        
        update(state => ({ 
          ...state, 
          connected: true, 
          error: undefined 
        }));

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        const receiveTime = performance.now();
        bytesReceived += event.data.length;
        messageCount++;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Calculate latency if message has timestamp
          if (message.timestamp) {
            const latency = receiveTime - message.timestamp;
            latencySum += latency;
          }

          handleMessage(message);
          
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected: ${event.code} - ${event.reason}`);
        
        update(state => ({ ...state, connected: false }));
        
        // Stop heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        // Attempt reconnection
        if (!event.wasClean && reconnectAttempts < 5) {
          reconnectAttempts++;
          console.log(`[WebSocket] Reconnecting in ${RECONNECT_DELAY}ms... (attempt ${reconnectAttempts})`);
          
          reconnectTimeout = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY * reconnectAttempts); // Exponential backoff
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        
        update(state => ({
          ...state,
          error: 'WebSocket connection error'
        }));
      };

    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      
      update(state => ({
        ...state,
        error: 'Failed to create WebSocket connection'
      }));
    }
  }

  function handleMessage(message: WebSocketMessage) {
    const now = Date.now();
    
    update(state => {
      const newState = { ...state, lastUpdate: now };
      
      switch (message.type) {
        case 'event':
          // Add new events, maintaining size limit
          const newEvents = Array.isArray(message.data) ? message.data : [message.data];
          newState.events = [...state.events, ...newEvents].slice(-MAX_EVENTS);
          break;

        case 'monitor_event':
          // Handle file system monitor events for project tree
          const newMonitorEvents = Array.isArray(message.data) ? message.data : [message.data];
          newState.monitorEvents = [...state.monitorEvents, ...newMonitorEvents].slice(-MAX_EVENTS);
          break;
          
        case 'metrics':
          newState.metrics = message.data;
          break;
          
        case 'heartbeat':
          lastHeartbeat = now;
          break;
          
        case 'error':
          console.error('[WebSocket] Server error:', message.data);
          newState.error = message.data.message || 'Server error';
          break;
          
        default:
          console.warn('[WebSocket] Unknown message type:', message.type);
      }
      
      return newState;
    });
  }

  function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        const heartbeatMessage = {
          type: 'heartbeat',
          timestamp: performance.now()
        };
        ws.send(JSON.stringify(heartbeatMessage));
      }
    }, HEARTBEAT_INTERVAL);
  }

  function disconnect() {
    console.log('[WebSocket] Disconnecting...');
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    if (ws) {
      ws.close(1000, 'Client disconnect');
      ws = null;
    }
    
    update(state => ({ ...state, connected: false }));
  }

  function send(message: any) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }

  // Performance metrics
  function getPerformanceMetrics() {
    return {
      messageCount,
      bytesReceived,
      averageLatency: messageCount > 0 ? latencySum / messageCount : 0,
      reconnectAttempts,
      lastHeartbeat
    };
  }

  // Auto-connect on store creation
  connect();

  return {
    subscribe,
    connect,
    disconnect,
    send,
    getPerformanceMetrics
  };
}

// Create the main WebSocket store
const WS_URL = typeof window !== 'undefined' 
  ? `ws://${window.location.hostname}:8091`
  : 'ws://localhost:8091';

export const websocketStore = createWebSocketStore(WS_URL);

// Derived stores for different dashboard components
export const realtimeEvents = derived(
  websocketStore,
  ($ws) => $ws.events.slice(-100) // Last 100 events for activity feed
);

export const connectionStatus: Readable<ConnectionStatus> = derived(
  websocketStore,
  ($ws) => ({
    connected: $ws.connected,
    lastHeartbeat: 0, // Will be updated by heartbeat logic
    reconnectAttempts: 0, // Will be updated by connection logic
    error: $ws.error
  })
);

// Event filtering and processing
export const filteredEvents = derived(
  websocketStore,
  ($ws) => {
    // This could be moved to WASM for large datasets
    return $ws.events.filter(event => {
      // Add your filtering logic here
      return true;
    });
  }
);

// Metrics aggregation
export const eventMetrics = derived(
  websocketStore,
  ($ws) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // This computation could benefit from WASM for large datasets
    const recentEvents = $ws.events.filter(e => 
      (now - e.timestamp * 1000) < oneHour
    );
    
    return {
      totalEvents: $ws.events.length,
      recentEvents: recentEvents.length,
      eventsPerMinute: recentEvents.length / 60,
      lastUpdate: $ws.lastUpdate
    };
  }
);

// Monitor events store for ProjectTree component
export const monitorEvents = derived(
  websocketStore,
  ($ws) => $ws.monitorEvents
);