<script lang="ts">
  import { onMount } from 'svelte';
  import { websocketStore, realtimeEvents, eventMetrics, monitorEvents } from '../lib/stores/websocket';
  import ProjectTree from '../lib/components/ProjectTree.svelte';
  import ActivityFeed from '../lib/components/ActivityFeed.svelte';
  import MetricsDashboard from '../lib/components/MetricsDashboard.svelte';
  import type { TreeNode } from '../lib/components/ProjectTree.svelte';
  
  let title = 'WitnessChain Dashboard';
  let selectedNode: TreeNode | null = null;
  
  $: connectionStatus = $websocketStore.connected ? 'connected' : 'disconnected';
  $: events = $realtimeEvents;
  $: metrics = $eventMetrics;
  $: wsMetrics = $websocketStore.metrics;
  $: treeEvents = $monitorEvents;

  function handleNodeSelect(event: CustomEvent<{ node: TreeNode }>) {
    selectedNode = event.detail.node;
    console.log('Selected node:', selectedNode);
  }

  function handleNodeContextMenu(event: CustomEvent<{ node: TreeNode; event: MouseEvent }>) {
    const { node, event: mouseEvent } = event.detail;
    console.log('Context menu for node:', node.path);
    // TODO: Show context menu with file operations
  }

  function handleActivityEventSelect(event: CustomEvent<{ event: any }>) {
    console.log('Activity event selected:', event.detail.event);
    // TODO: Show event details in a modal or sidebar
  }

  function handleActivityFileSelect(event: CustomEvent<{ filePath: string }>) {
    console.log('File selected from activity:', event.detail.filePath);
    // TODO: Open file editor or show file details
  }

  function handleMetricsPointClick(event: CustomEvent<{ data: any; events: any[] }>) {
    console.log('Metrics point clicked:', event.detail);
    // TODO: Show detailed analysis for that time period
  }

  function handleMetricChange(event: CustomEvent<{ metric: string }>) {
    console.log('Metric changed to:', event.detail.metric);
  }

  function handleTimeRangeChange(event: CustomEvent<{ range: string }>) {
    console.log('Time range changed to:', event.detail.range);
  }
</script>

<svelte:head>
  <title>WitnessChain Dashboard</title>
</svelte:head>

<div class="dashboard">
  <header class="dashboard-header">
    <div class="header-left">
      <h1 class="dashboard-title">{title}</h1>
      <div class="connection-status">
        <div class="status-indicator {connectionStatus}"></div>
        <span class="status-text">
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  </header>

  <main class="dashboard-main">
    <div class="dashboard-row">
      <div class="dashboard-panel activity-panel" data-testid="realtime-activity">
        <ActivityFeed 
          events={treeEvents}
          maxEvents={100}
          showDiffs={true}
          autoScroll={true}
          on:eventSelect={handleActivityEventSelect}
          on:fileSelect={handleActivityFileSelect}
        />
      </div>
    </div>
    
    <div class="dashboard-row">
      <div class="dashboard-panel metrics-panel" data-testid="code-metrics">
        <MetricsDashboard 
          events={treeEvents}
          width={800}
          height={400}
          selectedMetric="complexity"
          timeRange="6h"
          showLanguageBreakdown={true}
          on:pointClick={handleMetricsPointClick}
          on:metricChange={handleMetricChange}
          on:timeRangeChange={handleTimeRangeChange}
        />
      </div>
    </div>

    <div class="dashboard-row">
      <div class="dashboard-panel" data-testid="filesystem-tree">
        <h3>Project Structure</h3>
        <div class="panel-content tree-container">
          <ProjectTree 
            events={treeEvents}
            on:select={handleNodeSelect}
            on:contextmenu={handleNodeContextMenu}
          />
        </div>
      </div>
      
      <div class="dashboard-panel" data-testid="developer-heatmap">
        <h3>Developer Activity Heatmap</h3>
        <div class="panel-content">
          <p>No activity data available</p>
        </div>
      </div>
    </div>
  </main>

  <footer class="dashboard-footer">
    <div class="footer-left">
      <div class="footer-item">
        <span class="footer-label">Events:</span>
        <span class="footer-value">{metrics.totalEvents}</span>
      </div>
      <div class="footer-item">
        <span class="footer-label">Files:</span>
        <span class="footer-value">{events.length}</span>
      </div>
    </div>
    <div class="footer-right">
      <span>WitnessChain v1.0.0</span>
    </div>
  </footer>
</div>

<style>
  .dashboard {
    min-height: 100vh;
    background-color: #0f172a;
    color: #f1f5f9;
    display: flex;
    flex-direction: column;
  }
  
  .dashboard-header {
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 1rem;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .dashboard-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
  }
  
  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
  }
  
  .status-indicator.connected {
    background-color: #10b981;
  }
  
  .status-text {
    font-size: 0.875rem;
    color: #cbd5e1;
  }
  
  .dashboard-main {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .dashboard-row {
    display: flex;
    gap: 1rem;
  }
  
  .dashboard-panel {
    flex: 1;
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  
  .dashboard-panel h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 500;
    color: #f1f5f9;
  }
  
  .panel-content {
    color: #cbd5e1;
    font-size: 0.875rem;
  }
  
  .dashboard-footer {
    background-color: #1e293b;
    border-top: 1px solid #334155;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }
  
  .footer-left {
    display: flex;
    gap: 1.5rem;
  }
  
  .footer-item {
    display: flex;
    gap: 0.25rem;
  }
  
  .footer-label {
    color: #cbd5e1;
  }
  
  .footer-value {
    color: #f1f5f9;
    font-weight: 500;
  }
  
  .footer-right {
    color: #cbd5e1;
  }
  
  .event-item {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid #334155;
    flex-wrap: wrap;
  }
  
  .event-type {
    background-color: #3b82f6;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    text-transform: capitalize;
  }
  
  .event-file {
    font-family: monospace;
    color: #10b981;
  }
  
  .event-author {
    color: #f59e0b;
  }
  
  .event-time {
    color: #6b7280;
    margin-left: auto;
  }
  
  .metrics-item {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: #0f172a;
    border-radius: 0.25rem;
    border: 1px solid #374151;
  }
  
  .metrics-item div {
    font-size: 0.875rem;
  }
  
  .tree-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 0;
  }

  .activity-panel {
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .activity-panel .panel-content {
    display: none; /* Hide default panel content styling */
  }

  .metrics-panel {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 500px;
  }

  @media (max-width: 768px) {
    .dashboard-row {
      flex-direction: column;
    }
    
    .dashboard-main {
      padding: 0.5rem;
    }
    
    .header-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>