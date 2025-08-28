<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { CodeAnalytics } from '../analytics/CodeAnalytics';
  import type { 
    AnalyticsReport, 
    ComplexityTrend, 
    CodeHotspot, 
    DependencyGraph as GraphData,
    AnalyticsConfig 
  } from '../analytics/CodeAnalytics';
  import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor';
  import TrendChart from './TrendChart.svelte';
  import HotspotsPanel from './HotspotsPanel.svelte';
  import DependencyGraph from './DependencyGraph.svelte';

  export let events: MonitorEvent[] = [];
  export let refreshInterval = 30000; // 30 seconds
  export let config: Partial<AnalyticsConfig> = {};

  const dispatch = createEventDispatcher<{
    reportGenerated: { report: AnalyticsReport };
    hotspotSelected: { hotspot: CodeHotspot };
    dependencyNodeSelected: { node: any };
  }>();

  let analytics: CodeAnalytics;
  let currentReport: AnalyticsReport | null = null;
  let selectedView: 'overview' | 'trends' | 'hotspots' | 'dependencies' | 'smells' = 'overview';
  let isGenerating = false;
  let lastUpdate: Date | null = null;
  let autoRefresh = true;
  let refreshTimer: number;

  // Initialize analytics engine
  onMount(() => {
    analytics = new CodeAnalytics(config);
    
    // Process existing events
    processEvents();
    
    // Set up auto-refresh
    if (autoRefresh) {
      refreshTimer = setInterval(generateReport, refreshInterval);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  });

  // React to new events
  $: if (analytics && events.length > 0) {
    processEvents();
  }

  async function processEvents() {
    if (!analytics || events.length === 0) return;

    // Process events with analysis data
    for (const event of events) {
      if (event.analysis) {
        analytics.processFileAnalysis(event.analysis, event);
      }
    }
  }

  async function generateReport() {
    if (!analytics || isGenerating) return;

    isGenerating = true;
    
    try {
      currentReport = analytics.generateReport();
      lastUpdate = new Date();
      dispatch('reportGenerated', { report: currentReport });
    } catch (error) {
      console.error('Failed to generate analytics report:', error);
    } finally {
      isGenerating = false;
    }
  }

  function handleViewChange(view: typeof selectedView) {
    selectedView = view;
  }

  function handleHotspotSelect(event: CustomEvent<{ hotspot: CodeHotspot }>) {
    dispatch('hotspotSelected', event.detail);
  }

  function handleDependencyNodeSelect(event: CustomEvent<{ node: any }>) {
    dispatch('dependencyNodeSelected', event.detail);
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    
    if (autoRefresh) {
      refreshTimer = setInterval(generateReport, refreshInterval);
    } else if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  }

  function formatTimestamp(date: Date): string {
    return date.toLocaleTimeString();
  }

  // Generate initial report
  onMount(async () => {
    await generateReport();
  });
</script>

<div class="analytics-dashboard">
  <header class="dashboard-header">
    <div class="header-left">
      <h2>Code Analytics & Intelligence</h2>
      {#if lastUpdate}
        <span class="last-update">
          Last updated: {formatTimestamp(lastUpdate)}
        </span>
      {/if}
    </div>
    
    <div class="header-controls">
      <button 
        class="refresh-btn"
        class:loading={isGenerating}
        on:click={generateReport}
        disabled={isGenerating}
      >
        {isGenerating ? '🔄 Analyzing...' : '🔄 Refresh'}
      </button>
      
      <button
        class="auto-refresh-btn"
        class:active={autoRefresh}
        on:click={toggleAutoRefresh}
      >
        {autoRefresh ? '⏸️ Auto' : '▶️ Auto'}
      </button>
    </div>
  </header>

  {#if currentReport}
    <nav class="dashboard-nav">
      <button 
        class="nav-btn"
        class:active={selectedView === 'overview'}
        on:click={() => handleViewChange('overview')}
      >
        📊 Overview
      </button>
      <button 
        class="nav-btn"
        class:active={selectedView === 'trends'}
        on:click={() => handleViewChange('trends')}
      >
        📈 Trends
      </button>
      <button 
        class="nav-btn"
        class:active={selectedView === 'hotspots'}
        on:click={() => handleViewChange('hotspots')}
      >
        🔥 Hotspots ({currentReport.hotspots.length})
      </button>
      <button 
        class="nav-btn"
        class:active={selectedView === 'dependencies'}
        on:click={() => handleViewChange('dependencies')}
      >
        🕸️ Dependencies
      </button>
      <button 
        class="nav-btn"
        class:active={selectedView === 'smells'}
        on:click={() => handleViewChange('smells')}
      >
        👃 Code Smells ({currentReport.codeSmells.length})
      </button>
    </nav>

    <main class="dashboard-content">
      {#if selectedView === 'overview'}
        <div class="overview-grid">
          <div class="metrics-card">
            <h3>📂 Files Analyzed</h3>
            <div class="metric-value">{currentReport.summary.totalFiles}</div>
          </div>
          
          <div class="metrics-card">
            <h3>🧮 Average Complexity</h3>
            <div class="metric-value">{currentReport.summary.averageComplexity}</div>
          </div>
          
          <div class="metrics-card">
            <h3>🔗 Dependencies</h3>
            <div class="metric-value">{currentReport.summary.dependenciesCount}</div>
            {#if currentReport.summary.circularDependencies > 0}
              <div class="metric-warning">⚠️ {currentReport.summary.circularDependencies} circular</div>
            {/if}
          </div>
          
          <div class="metrics-card">
            <h3>🎨 Patterns Detected</h3>
            <div class="metric-value">{currentReport.summary.patternsDetected}</div>
          </div>

          <div class="recommendations-card">
            <h3>💡 Recommendations</h3>
            <div class="recommendations-list">
              {#each currentReport.recommendations.slice(0, 5) as recommendation}
                <div class="recommendation-item">
                  {recommendation}
                </div>
              {/each}
            </div>
          </div>

          <div class="quick-stats-card">
            <h3>🔍 Quick Stats</h3>
            <div class="quick-stats">
              <div class="stat">
                <span class="stat-label">Critical Hotspots:</span>
                <span class="stat-value critical">
                  {currentReport.hotspots.filter(h => h.severity === 'critical').length}
                </span>
              </div>
              <div class="stat">
                <span class="stat-label">Major Code Smells:</span>
                <span class="stat-value major">
                  {currentReport.codeSmells.filter(s => s.severity === 'major').length}
                </span>
              </div>
              <div class="stat">
                <span class="stat-label">Patterns Found:</span>
                <span class="stat-value">
                  {currentReport.patterns.filter(p => p.type === 'design_pattern').length} design,
                  {currentReport.patterns.filter(p => p.type === 'anti_pattern').length} anti
                </span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if selectedView === 'trends'}
        <div class="trends-view">
          <TrendChart 
            trends={currentReport.trends}
            width={800}
            height={400}
            title="Code Complexity Trends Over Time"
            selectedMetric="complexity"
            on:pointClick={(e) => console.log('Trend point clicked:', e.detail)}
          />
        </div>
      {/if}

      {#if selectedView === 'hotspots'}
        <div class="hotspots-view">
          <HotspotsPanel 
            hotspots={currentReport.hotspots}
            maxHotspots={20}
            on:hotspotSelect={handleHotspotSelect}
            on:hotspotAction={(e) => console.log('Hotspot action:', e.detail)}
          />
        </div>
      {/if}

      {#if selectedView === 'dependencies'}
        <div class="dependencies-view">
          <DependencyGraph 
            graphData={analytics.getDependencyGraph()}
            width={800}
            height={600}
            on:nodeClick={handleDependencyNodeSelect}
            on:edgeClick={(e) => console.log('Edge clicked:', e.detail)}
          />
        </div>
      {/if}

      {#if selectedView === 'smells'}
        <div class="smells-view">
          <div class="smells-panel">
            <h3>Code Smells Detected</h3>
            {#each currentReport.codeSmells as smell}
              <div class="smell-card" class:critical={smell.severity === 'critical'} class:major={smell.severity === 'major'}>
                <div class="smell-header">
                  <span class="smell-type">{smell.type.replace('_', ' ')}</span>
                  <span class="smell-severity {smell.severity}">{smell.severity}</span>
                </div>
                <div class="smell-file">
                  📁 {smell.filePath.split('/').pop()} (line {smell.line})
                </div>
                <div class="smell-description">
                  {smell.description}
                </div>
                <div class="smell-suggestion">
                  💡 {smell.suggestion}
                </div>
              </div>
            {/each}
            
            {#if currentReport.codeSmells.length === 0}
              <div class="no-smells">
                <div class="no-smells-icon">✨</div>
                <h4>No Code Smells Detected!</h4>
                <p>Your code quality looks great.</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </main>
  {:else if isGenerating}
    <div class="loading-state">
      <div class="loading-spinner">🔄</div>
      <h3>Analyzing Code...</h3>
      <p>Generating comprehensive analytics report</p>
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No Analytics Data</h3>
      <p>Analytics will appear here once files are analyzed.</p>
      <button class="generate-btn" on:click={generateReport}>
        Generate Report
      </button>
    </div>
  {/if}
</div>

<style>
  .analytics-dashboard {
    background-color: #0f172a;
    color: #f1f5f9;
    min-height: 100vh;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .header-left h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .last-update {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .header-controls {
    display: flex;
    gap: 0.75rem;
  }

  .refresh-btn, .auto-refresh-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    background-color: #374151;
    color: #f1f5f9;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .refresh-btn:hover, .auto-refresh-btn:hover {
    background-color: #4b5563;
  }

  .refresh-btn.loading {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .auto-refresh-btn.active {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .dashboard-nav {
    display: flex;
    padding: 0 2rem;
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
    overflow-x: auto;
  }

  .nav-btn {
    padding: 1rem 1.5rem;
    border: none;
    background: none;
    color: #9ca3af;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    white-space: nowrap;
    border-bottom: 3px solid transparent;
  }

  .nav-btn:hover {
    color: #f1f5f9;
  }

  .nav-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .dashboard-content {
    padding: 2rem;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .metrics-card, .recommendations-card, .quick-stats-card {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .metrics-card h3, .recommendations-card h3, .quick-stats-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .metric-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #3b82f6;
  }

  .metric-warning {
    font-size: 0.875rem;
    color: #f59e0b;
    margin-top: 0.5rem;
  }

  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .recommendation-item {
    padding: 0.75rem;
    background-color: #374151;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .quick-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    color: #cbd5e1;
    font-size: 0.875rem;
  }

  .stat-value {
    font-weight: 600;
    color: #f1f5f9;
  }

  .stat-value.critical {
    color: #ef4444;
  }

  .stat-value.major {
    color: #f59e0b;
  }

  .trends-view, .hotspots-view, .dependencies-view, .smells-view {
    background-color: #1e293b;
    border-radius: 0.5rem;
    border: 1px solid #334155;
    padding: 1.5rem;
  }

  .smells-panel h3 {
    margin: 0 0 1.5rem 0;
    color: #f1f5f9;
  }

  .smell-card {
    background-color: #374151;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    border-left: 4px solid #6b7280;
  }

  .smell-card.major {
    border-left-color: #f59e0b;
  }

  .smell-card.critical {
    border-left-color: #ef4444;
  }

  .smell-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .smell-type {
    font-weight: 600;
    text-transform: capitalize;
    color: #f1f5f9;
  }

  .smell-severity {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .smell-severity.critical {
    background-color: #ef4444;
    color: white;
  }

  .smell-severity.major {
    background-color: #f59e0b;
    color: white;
  }

  .smell-severity.minor {
    background-color: #6b7280;
    color: white;
  }

  .smell-file {
    font-size: 0.875rem;
    color: #9ca3af;
    font-family: monospace;
    margin-bottom: 0.5rem;
  }

  .smell-description {
    color: #cbd5e1;
    margin-bottom: 0.5rem;
  }

  .smell-suggestion {
    font-size: 0.875rem;
    color: #10b981;
    font-style: italic;
  }

  .no-smells {
    text-align: center;
    padding: 3rem;
    color: #9ca3af;
  }

  .no-smells-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-smells h4 {
    margin: 0 0 0.5rem 0;
    color: #f1f5f9;
  }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: #9ca3af;
  }

  .loading-spinner, .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: spin 2s linear infinite;
  }

  .empty-icon {
    animation: none;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading-state h3, .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #f1f5f9;
  }

  .generate-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
  }

  .generate-btn:hover {
    background-color: #2563eb;
  }

  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .header-controls {
      justify-content: center;
    }

    .dashboard-nav {
      padding: 0 1rem;
    }

    .dashboard-content {
      padding: 1rem;
    }

    .overview-grid {
      grid-template-columns: 1fr;
    }
  }
</style>