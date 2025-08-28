#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';

const PORT = 8091;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 Mock WitnessChain WebSocket server running on port ${PORT}`);

// Mock data generators
function generateEvent(type = 'file_modified') {
  const files = [
    'src/routes/+page.svelte',
    'src/lib/stores/websocket.ts',
    'src/lib/components/RealTimeActivityFeed.svelte',
    'crates/witness-core/src/lib.rs',
    'crates/witness-api/src/routes.rs',
    'README.md',
    'package.json',
    'Cargo.toml',
    'tests/unit/components.test.ts'
  ];
  
  const authors = ['developer1', 'developer2', 'developer3'];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now() / 1000,
    type,
    file: files[Math.floor(Math.random() * files.length)],
    author: authors[Math.floor(Math.random() * authors.length)],
    message: `${type.replace('_', ' ')} - ${Math.random() > 0.5 ? 'Added functionality' : 'Fixed bug'}`
  };
}

function generateMetrics() {
  return {
    timestamp: new Date().toISOString(),
    filesChanged: Math.floor(Math.random() * 50) + 10,
    linesAdded: Math.floor(Math.random() * 500) + 100,
    linesRemoved: Math.floor(Math.random() * 200) + 20,
    commits: Math.floor(Math.random() * 10) + 1
  };
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('📡 Dashboard connected');
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    data: { status: 'connected', message: 'Connected to WitnessChain' }
  }));
  
  // Send some initial events
  for (let i = 0; i < 5; i++) {
    ws.send(JSON.stringify({
      type: 'event',
      data: generateEvent(['file_created', 'file_modified', 'file_deleted'][Math.floor(Math.random() * 3)])
    }));
  }
  
  // Send initial metrics
  ws.send(JSON.stringify({
    type: 'metrics',
    data: [generateMetrics()]
  }));
  
  // Simulate real-time events
  const eventInterval = setInterval(() => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      // Send random events
      const eventTypes = ['file_created', 'file_modified', 'file_deleted', 'git_commit'];
      ws.send(JSON.stringify({
        type: 'event',
        data: generateEvent(eventTypes[Math.floor(Math.random() * eventTypes.length)])
      }));
    } else {
      clearInterval(eventInterval);
    }
  }, 2000); // Every 2 seconds
  
  // Send metrics updates
  const metricsInterval = setInterval(() => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({
        type: 'metrics',
        data: [generateMetrics()]
      }));
    } else {
      clearInterval(metricsInterval);
    }
  }, 5000); // Every 5 seconds
  
  // Send heartbeat
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds
  
  ws.on('close', () => {
    console.log('📡 Dashboard disconnected');
    clearInterval(eventInterval);
    clearInterval(metricsInterval);
    clearInterval(heartbeatInterval);
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received message:', data);
      
      // Echo heartbeat
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock server...');
  wss.close(() => {
    console.log('✅ Mock server stopped');
    process.exit(0);
  });
});