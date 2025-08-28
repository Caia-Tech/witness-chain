<!--
  Enhanced Real-time Activity Feed Component
  Shows file changes, diffs, and code analysis updates in real-time
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor.js';
  import { MonitorEventType } from '../monitoring/MultiDirectoryMonitor.js';

  export let events: MonitorEvent[] = [];
  export let maxEvents: number = 50;
  export let showDiffs: boolean = true;
  export let autoScroll: boolean = true;

  const dispatch = createEventDispatcher();

  let feedContainer: HTMLElement;
  let expandedEvents = new Set<string>();
  let filteredEventTypes: Set<MonitorEventType> = new Set([
    MonitorEventType.FileCreated,
    MonitorEventType.FileModified,
    MonitorEventType.FileDeleted
  ]);

  $: displayEvents = events
    .filter(event => filteredEventTypes.has(event.type))
    .slice(-maxEvents)
    .reverse(); // Show newest first

  function toggleEventExpansion(eventId: string) {
    if (expandedEvents.has(eventId)) {
      expandedEvents.delete(eventId);
    } else {
      expandedEvents.add(eventId);
    }
    expandedEvents = expandedEvents; // Trigger reactivity
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  }

  function formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  function getEventIcon(eventType: MonitorEventType): string {
    switch (eventType) {
      case MonitorEventType.FileCreated: return '➕';
      case MonitorEventType.FileModified: return '✏️';
      case MonitorEventType.FileDeleted: return '🗑️';
      case MonitorEventType.DirectoryCreated: return '📁';
      case MonitorEventType.DirectoryDeleted: return '🗂️';
      case MonitorEventType.FileRenamed: return '🔄';
      case MonitorEventType.AnalysisComplete: return '🔍';
      case MonitorEventType.Error: return '⚠️';
      default: return '📄';
    }
  }

  function getEventColor(eventType: MonitorEventType): string {
    switch (eventType) {
      case MonitorEventType.FileCreated: return '#10b981'; // green
      case MonitorEventType.FileModified: return '#f59e0b'; // amber
      case MonitorEventType.FileDeleted: return '#ef4444'; // red
      case MonitorEventType.DirectoryCreated: return '#3b82f6'; // blue
      case MonitorEventType.DirectoryDeleted: return '#8b5cf6'; // purple
      case MonitorEventType.FileRenamed: return '#06b6d4'; // cyan
      case MonitorEventType.AnalysisComplete: return '#6366f1'; // indigo
      case MonitorEventType.Error: return '#dc2626'; // red-600
      default: return '#6b7280'; // gray
    }
  }

  function getLanguageColor(language?: string): string {
    if (!language) return '#6b7280';
    
    const colors: Record<string, string> = {
      rust: '#dea584',
      typescript: '#3178c6',
      javascript: '#f7df1e',
      svelte: '#ff3e00',
      python: '#3776ab',
      java: '#ed8b00',
      html: '#e34c26',
      css: '#1572b6',
      json: '#000000',
      markdown: '#083fa1'
    };
    
    return colors[language] || '#6b7280';
  }

  function handleEventClick(event: MonitorEvent) {
    dispatch('eventSelect', { event });
  }

  function handleFileClick(filePath: string) {
    dispatch('fileSelect', { filePath });
  }

  function toggleFilter(eventType: MonitorEventType) {
    if (filteredEventTypes.has(eventType)) {
      filteredEventTypes.delete(eventType);
    } else {
      filteredEventTypes.add(eventType);
    }
    filteredEventTypes = filteredEventTypes;
  }

  onMount(() => {
    // Auto-scroll to bottom when new events arrive
    if (autoScroll && feedContainer) {
      const observer = new MutationObserver(() => {
        feedContainer.scrollTop = feedContainer.scrollHeight;
      });
      
      observer.observe(feedContainer, { childList: true, subtree: true });
      
      return () => observer.disconnect();
    }
  });

  $: if (autoScroll && feedContainer && displayEvents) {
    // Auto-scroll when events change
    setTimeout(() => {
      feedContainer.scrollTop = feedContainer.scrollHeight;
    }, 100);
  }
</script>

<div class="activity-feed">
  <!-- Header with filters -->
  <div class="feed-header">
    <h3 class="feed-title">
      <span class="title-icon">⚡</span>
      Real-time Activity
    </h3>
    
    <div class="feed-controls">
      <div class="event-filters">
        {#each Object.values(MonitorEventType) as eventType}
          <button
            class="filter-button"
            class:active={filteredEventTypes.has(eventType)}
            style="--event-color: {getEventColor(eventType)}"
            on:click={() => toggleFilter(eventType)}
            title="Toggle {eventType.replace('_', ' ')}"
          >
            {getEventIcon(eventType)}
          </button>
        {/each}
      </div>
      
      <div class="feed-options">
        <label class="option-toggle">
          <input type="checkbox" bind:checked={showDiffs} />
          <span>Show diffs</span>
        </label>
        <label class="option-toggle">
          <input type="checkbox" bind:checked={autoScroll} />
          <span>Auto-scroll</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Activity feed content -->
  <div 
    class="feed-content" 
    bind:this={feedContainer}
    data-testid="activity-feed-content"
  >
    {#if displayEvents.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No activity to display</p>
        <small>File changes will appear here in real-time</small>
      </div>
    {:else}
      {#each displayEvents as event, index (event.timestamp + event.filePath)}
        {@const eventId = `${event.timestamp}-${event.filePath}`}
        {@const isExpanded = expandedEvents.has(eventId)}
        <div 
          class="event-item"
          class:expanded={isExpanded}
          style="--event-color: {getEventColor(event.type)}"
          on:click={() => handleEventClick(event)}
          on:keydown={(e) => e.key === 'Enter' && handleEventClick(event)}
          role="button"
          tabindex="0"
        >
          <!-- Event header -->
          <div class="event-header">
            <div class="event-indicator">
              <span class="event-icon">{getEventIcon(event.type)}</span>
            </div>
            
            <div class="event-info">
              <div class="event-title">
                <button 
                  class="file-link"
                  on:click|stopPropagation={() => handleFileClick(event.filePath)}
                  title="Open {event.filePath}"
                >
                  {event.relativePath || event.filePath.split('/').pop()}
                </button>
                
                {#if event.analysis?.language}
                  <span 
                    class="language-badge"
                    style="--language-color: {getLanguageColor(event.analysis.language)}"
                  >
                    {event.analysis.language}
                  </span>
                {/if}
              </div>
              
              <div class="event-meta">
                <span class="event-type">
                  {event.type.replace('_', ' ')}
                </span>
                <span class="event-time" title="{formatTimestamp(event.timestamp)}">
                  {formatTimeAgo(event.timestamp)}
                </span>
                {#if event.size}
                  <span class="file-size">
                    {(event.size / 1024).toFixed(1)}KB
                  </span>
                {/if}
              </div>
            </div>

            {#if event.analysis || (showDiffs && event.previousAnalysis)}
              <button
                class="expand-button"
                on:click|stopPropagation={() => toggleEventExpansion(eventId)}
                title={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                <span class="expand-icon" class:rotated={isExpanded}>▶</span>
              </button>
            {/if}
          </div>

          <!-- Event details (expanded) -->
          {#if isExpanded && event.analysis}
            <div class="event-details">
              <div class="analysis-info">
                <div class="analysis-row">
                  <span class="metric-label">Lines:</span>
                  <span class="metric-value">{event.analysis.lines}</span>
                </div>
                
                {#if event.analysis.complexity}
                  <div class="analysis-row">
                    <span class="metric-label">Complexity:</span>
                    <span class="metric-value complexity-{event.analysis.complexity > 10 ? 'high' : event.analysis.complexity > 5 ? 'medium' : 'low'}">
                      {event.analysis.complexity}
                    </span>
                  </div>
                {/if}
                
                {#if event.analysis.symbols.length > 0}
                  <div class="analysis-row symbols">
                    <span class="metric-label">Symbols:</span>
                    <div class="symbol-list">
                      {#each event.analysis.symbols.slice(0, 3) as symbol}
                        <span class="symbol-item" title="{symbol.type} at line {symbol.line}">
                          {symbol.name}
                        </span>
                      {/each}
                      {#if event.analysis.symbols.length > 3}
                        <span class="symbol-more">+{event.analysis.symbols.length - 3} more</span>
                      {/if}
                    </div>
                  </div>
                {/if}
                
                {#if event.analysis.dependencies.length > 0}
                  <div class="analysis-row">
                    <span class="metric-label">Dependencies:</span>
                    <span class="metric-value">{event.analysis.dependencies.length}</span>
                  </div>
                {/if}
              </div>

              <!-- Diff preview (if available) -->
              {#if showDiffs && event.previousAnalysis && event.analysis}
                {#if event.analysis && event.previousAnalysis}
                  {@const lineDiff = event.analysis.lines - event.previousAnalysis.lines}
                  {@const complexityDiff = (event.analysis.complexity || 0) - (event.previousAnalysis.complexity || 0)}
                  <div class="diff-preview">
                    <div class="diff-header">Changes:</div>
                    <div class="diff-stats">
                      {#if lineDiff !== 0}
                        <span class="diff-stat" class:positive={lineDiff > 0} class:negative={lineDiff < 0}>
                          {lineDiff > 0 ? '+' : ''}{lineDiff} lines
                        </span>
                      {/if}
                      
                      {#if complexityDiff !== 0}
                        <span class="diff-stat" class:positive={complexityDiff > 0} class:negative={complexityDiff < 0}>
                          {complexityDiff > 0 ? '+' : ''}{complexityDiff} complexity
                        </span>
                      {/if}
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer stats -->
  <div class="feed-footer">
    <div class="feed-stats">
      <span class="stat-item">
        <span class="stat-label">Total events:</span>
        <span class="stat-value">{events.length}</span>
      </span>
      <span class="stat-item">
        <span class="stat-label">Showing:</span>
        <span class="stat-value">{displayEvents.length}</span>
      </span>
    </div>
  </div>
</div>

<style>
  .activity-feed {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e293b;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .feed-header {
    padding: 1rem;
    border-bottom: 1px solid #334155;
    background: #0f172a;
  }

  .feed-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .title-icon {
    font-size: 1.2rem;
  }

  .feed-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .event-filters {
    display: flex;
    gap: 0.25rem;
  }

  .filter-button {
    width: 2rem;
    height: 2rem;
    border: 1px solid #334155;
    border-radius: 0.25rem;
    background: #1e293b;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
  }

  .filter-button:hover {
    background: #334155;
    color: #f1f5f9;
  }

  .filter-button.active {
    background: var(--event-color);
    color: white;
    border-color: var(--event-color);
  }

  .feed-options {
    display: flex;
    gap: 1rem;
  }

  .option-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #cbd5e1;
    cursor: pointer;
  }

  .option-toggle input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }

  .feed-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    text-align: center;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .empty-state small {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  .event-item {
    background: #334155;
    border: 1px solid #475569;
    border-radius: 0.5rem;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-left: 3px solid var(--event-color);
  }

  .event-item:hover {
    background: #475569;
    border-color: var(--event-color);
  }

  .event-item.expanded {
    background: #475569;
  }

  .event-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .event-indicator {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    background: var(--event-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .event-icon {
    color: white;
    font-size: 0.875rem;
  }

  .event-info {
    flex: 1;
    min-width: 0;
  }

  .event-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .file-link {
    background: none;
    border: none;
    color: #e2e8f0;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.2s ease;
  }

  .file-link:hover {
    text-decoration-color: #e2e8f0;
  }

  .language-badge {
    padding: 0.125rem 0.5rem;
    background: var(--language-color);
    color: white;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: 0.25rem;
    letter-spacing: 0.05em;
  }

  .event-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .event-type {
    text-transform: capitalize;
    color: var(--event-color);
    font-weight: 500;
  }

  .expand-button {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }

  .expand-button:hover {
    background: #475569;
    color: #f1f5f9;
  }

  .expand-icon {
    display: block;
    transition: transform 0.2s ease;
  }

  .expand-icon.rotated {
    transform: rotate(90deg);
  }

  .event-details {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #475569;
  }

  .analysis-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .analysis-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .analysis-row.symbols {
    align-items: flex-start;
  }

  .metric-label {
    color: #94a3b8;
    min-width: 5rem;
    font-weight: 500;
  }

  .metric-value {
    color: #e2e8f0;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .complexity-low { color: #10b981; }
  .complexity-medium { color: #f59e0b; }
  .complexity-high { color: #ef4444; }

  .symbol-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .symbol-item {
    background: #1e293b;
    color: #cbd5e1;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .symbol-more {
    color: #64748b;
    font-size: 0.75rem;
    font-style: italic;
  }

  .diff-preview {
    background: #0f172a;
    border-radius: 0.25rem;
    padding: 0.75rem;
  }

  .diff-header {
    font-size: 0.875rem;
    font-weight: 500;
    color: #cbd5e1;
    margin-bottom: 0.5rem;
  }

  .diff-stats {
    display: flex;
    gap: 0.5rem;
  }

  .diff-stat {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-weight: 500;
  }

  .diff-stat.positive {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
  }

  .diff-stat.negative {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .feed-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid #334155;
    background: #0f172a;
  }

  .feed-stats {
    display: flex;
    gap: 1.5rem;
    font-size: 0.75rem;
  }

  .stat-item {
    display: flex;
    gap: 0.25rem;
  }

  .stat-label {
    color: #94a3b8;
  }

  .stat-value {
    color: #e2e8f0;
    font-weight: 500;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .feed-controls {
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }

    .event-filters {
      justify-content: center;
    }

    .feed-options {
      justify-content: center;
    }

    .event-header {
      flex-wrap: wrap;
    }

    .analysis-row {
      flex-direction: column;
      gap: 0.25rem;
    }

    .metric-label {
      min-width: auto;
    }

    .feed-stats {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  /* Scrollbar styling */
  .feed-content::-webkit-scrollbar {
    width: 6px;
  }

  .feed-content::-webkit-scrollbar-track {
    background: #1e293b;
  }

  .feed-content::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 3px;
  }

  .feed-content::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
</style>