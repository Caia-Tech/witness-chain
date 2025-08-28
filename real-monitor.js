#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8091;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 Real-time WitnessChain file monitor running on port ${PORT}`);
console.log(`👀 Monitoring directory: ${process.cwd()}`);

// Track file changes and metrics
let eventCount = 0;
let fileStats = {
  filesChanged: 0,
  linesAdded: 0,
  linesRemoved: 0,
  commits: 0
};

// Function to create real event from file change
function createRealEvent(eventType, filePath, stats = null) {
  eventCount++;
  
  const event = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now() / 1000,
    type: eventType,
    file: path.relative(process.cwd(), filePath),
    author: process.env.USER || 'developer',
    message: `${eventType.replace('_', ' ')} - Real file system change`,
    size: stats ? stats.size : 0,
    mtime: stats ? stats.mtime.getTime() / 1000 : Date.now() / 1000
  };
  
  // Update metrics
  fileStats.filesChanged++;
  if (eventType === 'file_modified' && stats) {
    // Rough estimate of lines based on file size
    const estimatedLines = Math.floor(stats.size / 50);
    fileStats.linesAdded += Math.floor(estimatedLines * 0.3);
    fileStats.linesRemoved += Math.floor(estimatedLines * 0.1);
  }
  
  return event;
}

// Function to broadcast to all clients
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// Set up file watcher using chokidar
const watcher = chokidar.watch('.', {
  ignored: [
    /node_modules/,
    /\.git/,
    /target/,
    /\.DS_Store/,
    /\.log$/,
    /\.tmp$/,
    /\.cache/,
    /playwright-report/,
    /test-results/,
    /\.svelte-kit/
  ],
  ignoreInitial: true,
  persistent: true,
  depth: 3  // Don't go too deep to avoid performance issues
});

// File change handlers
watcher.on('add', (filePath, stats) => {
  console.log(`📄 File added: ${filePath}`);
  const event = createRealEvent('file_created', filePath, stats);
  broadcast({ type: 'event', data: event });
});

watcher.on('change', (filePath, stats) => {
  console.log(`✏️  File modified: ${filePath}`);
  const event = createRealEvent('file_modified', filePath, stats);
  broadcast({ type: 'event', data: event });
});

watcher.on('unlink', (filePath) => {
  console.log(`🗑️  File deleted: ${filePath}`);
  const event = createRealEvent('file_deleted', filePath);
  broadcast({ type: 'event', data: event });
});

watcher.on('addDir', (dirPath) => {
  console.log(`📁 Directory added: ${dirPath}`);
  const event = createRealEvent('dir_created', dirPath);
  broadcast({ type: 'event', data: event });
});

watcher.on('unlinkDir', (dirPath) => {
  console.log(`🗂️  Directory deleted: ${dirPath}`);
  const event = createRealEvent('dir_deleted', dirPath);
  broadcast({ type: 'event', data: event });
});

watcher.on('error', (error) => {
  console.error('🚨 Watcher error:', error);
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('📡 Dashboard connected');
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    data: { status: 'connected', message: 'Connected to Real-time WitnessChain Monitor' }
  }));
  
  // Send current metrics
  ws.send(JSON.stringify({
    type: 'metrics',
    data: [{
      timestamp: new Date().toISOString(),
      filesChanged: fileStats.filesChanged,
      linesAdded: fileStats.linesAdded,
      linesRemoved: fileStats.linesRemoved,
      commits: fileStats.commits
    }]
  }));
  
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
  }, 30000);
  
  ws.on('close', () => {
    console.log('📡 Dashboard disconnected');
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

// Send periodic metrics updates
setInterval(() => {
  const metrics = {
    timestamp: new Date().toISOString(),
    filesChanged: fileStats.filesChanged,
    linesAdded: fileStats.linesAdded,
    linesRemoved: fileStats.linesRemoved,
    commits: fileStats.commits,
    totalEvents: eventCount
  };
  
  broadcast({
    type: 'metrics',
    data: [metrics]
  });
}, 5000); // Every 5 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down real-time monitor...');
  watcher.close();
  wss.close(() => {
    console.log('✅ Real-time monitor stopped');
    process.exit(0);
  });
});

console.log('🔄 File watcher initialized. Make changes to files in this directory to see real-time monitoring!');