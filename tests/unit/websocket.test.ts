import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { websocketStore, connectionStatus, realtimeEvents, eventMetrics } from '$lib/stores/websocket';

describe('WebSocket Store', () => {
  it('should initialize websocket store with correct initial state', () => {
    const storeValue = get(websocketStore);
    expect(storeValue.connected).toBe(false);
    expect(storeValue.events).toEqual([]);
    expect(storeValue.metrics).toEqual([]);
    expect(storeValue.lastUpdate).toBe(0);
  });

  it('should have connection status derived store', () => {
    const connectionState = get(connectionStatus);
    expect(connectionState).toHaveProperty('connected');
    expect(connectionState).toHaveProperty('lastHeartbeat');
    expect(connectionState).toHaveProperty('reconnectAttempts');
    expect(connectionState.connected).toBe(false);
  });

  it('should have realtime events derived store', () => {
    const events = get(realtimeEvents);
    expect(Array.isArray(events)).toBe(true);
    expect(events).toHaveLength(0); // Initially empty
  });

  it('should have event metrics derived store', () => {
    const metrics = get(eventMetrics);
    expect(metrics).toHaveProperty('totalEvents');
    expect(metrics).toHaveProperty('recentEvents');
    expect(metrics).toHaveProperty('eventsPerMinute');
    expect(metrics).toHaveProperty('lastUpdate');
    expect(metrics.totalEvents).toBe(0);
  });

  it('should handle WebSocket mock behavior', () => {
    const mockWs = new WebSocket('ws://localhost:8080');
    
    expect(mockWs.url).toBe('ws://localhost:8080');
    expect(mockWs.readyState).toBe(0); // CONNECTING initially
    
    // Wait for mock WebSocket to "close"
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockWs.readyState).toBe(3); // CLOSED
        resolve();
      }, 150);
    });
  });
});