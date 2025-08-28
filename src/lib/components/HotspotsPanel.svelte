<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CodeHotspot } from '../analytics/CodeAnalytics';

  export let hotspots: CodeHotspot[] = [];
  export let maxHotspots = 10;
  export let showDetails = true;
  export let sortBy: 'score' | 'severity' | 'reason' = 'score';

  const dispatch = createEventDispatcher<{
    hotspotSelect: { hotspot: CodeHotspot };
    hotspotAction: { hotspot: CodeHotspot; action: string };
  }>();

  $: sortedHotspots = [...hotspots]
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'reason':
          return a.reason.localeCompare(b.reason);
        default:
          return b.score - a.score;
      }
    })
    .slice(0, maxHotspots);

  function getSeverityColor(severity: CodeHotspot['severity']): string {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#84cc16';
      default: return '#6b7280';
    }
  }

  function getSeverityIcon(severity: CodeHotspot['severity']): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  function getReasonIcon(reason: CodeHotspot['reason']): string {
    switch (reason) {
      case 'high_complexity': return '🧠';
      case 'frequent_changes': return '🔄';
      case 'large_file': return '📄';
      case 'many_dependencies': return '🔗';
      default: return '⚠️';
    }
  }

  function getReasonLabel(reason: CodeHotspot['reason']): string {
    switch (reason) {
      case 'high_complexity': return 'High Complexity';
      case 'frequent_changes': return 'Frequent Changes';
      case 'large_file': return 'Large File';
      case 'many_dependencies': return 'Many Dependencies';
      default: return 'Unknown';
    }
  }

  function formatScore(score: number): string {
    return score.toFixed(1);
  }

  function formatFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  function formatFilePath(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }

  function handleHotspotClick(hotspot: CodeHotspot) {
    dispatch('hotspotSelect', { hotspot });
  }

  function handleAction(hotspot: CodeHotspot, action: string) {
    dispatch('hotspotAction', { hotspot, action });
  }
</script>

<div class="hotspots-panel">
  <div class="panel-header">
    <h3>Code Hotspots</h3>
    <div class="panel-controls">
      <label for="sort-select">Sort by:</label>
      <select id="sort-select" bind:value={sortBy}>
        <option value="score">Score</option>
        <option value="severity">Severity</option>
        <option value="reason">Reason</option>
      </select>
    </div>
  </div>

  <div class="hotspots-list">
    {#each sortedHotspots as hotspot (hotspot.filePath + hotspot.reason)}
      <div 
        class="hotspot-card"
        on:click={() => handleHotspotClick(hotspot)}
        role="button"
        tabindex="0"
        on:keypress={(e) => e.key === 'Enter' && handleHotspotClick(hotspot)}
      >
        <div class="hotspot-header">
          <div class="hotspot-file">
            <span class="file-icon">📁</span>
            <span class="file-name" title={hotspot.filePath}>
              {formatFileName(hotspot.filePath)}
            </span>
            <span class="file-path">
              {formatFilePath(hotspot.filePath)}
            </span>
          </div>
          <div class="hotspot-severity">
            <span 
              class="severity-badge"
              style="background-color: {getSeverityColor(hotspot.severity)};"
            >
              {getSeverityIcon(hotspot.severity)} {hotspot.severity.toUpperCase()}
            </span>
          </div>
        </div>

        <div class="hotspot-content">
          <div class="hotspot-reason">
            <span class="reason-icon">{getReasonIcon(hotspot.reason)}</span>
            <span class="reason-text">{getReasonLabel(hotspot.reason)}</span>
            <span class="hotspot-score">Score: {formatScore(hotspot.score)}</span>
          </div>

          {#if showDetails && hotspot.details}
            <div class="hotspot-details">
              {#if hotspot.details.complexity !== undefined}
                <div class="detail-item">
                  <span class="detail-label">Complexity:</span>
                  <span class="detail-value">{hotspot.details.complexity}</span>
                </div>
              {/if}
              {#if hotspot.details.changeFrequency !== undefined}
                <div class="detail-item">
                  <span class="detail-label">Changes:</span>
                  <span class="detail-value">{hotspot.details.changeFrequency}</span>
                </div>
              {/if}
              {#if hotspot.details.size !== undefined}
                <div class="detail-item">
                  <span class="detail-label">Size:</span>
                  <span class="detail-value">{hotspot.details.size} bytes</span>
                </div>
              {/if}
              {#if hotspot.details.dependencyCount !== undefined}
                <div class="detail-item">
                  <span class="detail-label">Dependencies:</span>
                  <span class="detail-value">{hotspot.details.dependencyCount}</span>
                </div>
              {/if}
            </div>
          {/if}

          <div class="hotspot-recommendations">
            {#each hotspot.recommendations.slice(0, 2) as recommendation}
              <div class="recommendation">
                💡 {recommendation}
              </div>
            {/each}
          </div>
        </div>

        <div class="hotspot-actions">
          <button 
            class="action-btn view-btn"
            on:click|stopPropagation={() => handleAction(hotspot, 'view')}
          >
            View
          </button>
          <button 
            class="action-btn analyze-btn"
            on:click|stopPropagation={() => handleAction(hotspot, 'analyze')}
          >
            Analyze
          </button>
          <button 
            class="action-btn ignore-btn"
            on:click|stopPropagation={() => handleAction(hotspot, 'ignore')}
          >
            Ignore
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if sortedHotspots.length === 0}
    <div class="no-hotspots">
      <div class="no-hotspots-icon">✅</div>
      <h4>No Code Hotspots Detected</h4>
      <p>Your codebase looks healthy! Keep up the good work.</p>
    </div>
  {/if}

  {#if hotspots.length > maxHotspots}
    <div class="more-hotspots">
      <p>Showing {maxHotspots} of {hotspots.length} hotspots</p>
      <button class="view-all-btn" on:click={() => dispatch('hotspotAction', { hotspot: hotspots[0], action: 'viewAll' })}>
        View All Hotspots
      </button>
    </div>
  {/if}
</div>

<style>
  .hotspots-panel {
    background-color: #1e293b;
    border-radius: 0.5rem;
    border: 1px solid #334155;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #0f172a;
    border-bottom: 1px solid #334155;
  }

  .panel-header h3 {
    margin: 0;
    color: #f1f5f9;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .panel-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel-controls label {
    font-size: 0.875rem;
    color: #cbd5e1;
  }

  .panel-controls select {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .hotspots-list {
    max-height: 600px;
    overflow-y: auto;
  }

  .hotspot-card {
    padding: 1rem;
    border-bottom: 1px solid #334155;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .hotspot-card:hover {
    background-color: #374151;
  }

  .hotspot-card:last-child {
    border-bottom: none;
  }

  .hotspot-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .hotspot-file {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .file-icon {
    font-size: 1rem;
  }

  .file-name {
    font-weight: 600;
    color: #f1f5f9;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-path {
    font-size: 0.75rem;
    color: #9ca3af;
    font-family: monospace;
    margin-left: 0.5rem;
  }

  .hotspot-severity {
    flex-shrink: 0;
  }

  .severity-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .hotspot-content {
    margin-bottom: 0.75rem;
  }

  .hotspot-reason {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .reason-icon {
    font-size: 1.1rem;
  }

  .reason-text {
    color: #f1f5f9;
    font-weight: 500;
  }

  .hotspot-score {
    margin-left: auto;
    background-color: #3b82f6;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .hotspot-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .detail-label {
    color: #9ca3af;
  }

  .detail-value {
    color: #f1f5f9;
    font-weight: 500;
  }

  .hotspot-recommendations {
    margin-bottom: 0.5rem;
  }

  .recommendation {
    font-size: 0.75rem;
    color: #cbd5e1;
    margin-bottom: 0.25rem;
    line-height: 1.4;
  }

  .hotspot-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .action-btn {
    padding: 0.25rem 0.75rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .view-btn {
    background-color: #3b82f6;
    color: white;
  }

  .view-btn:hover {
    background-color: #2563eb;
  }

  .analyze-btn {
    background-color: #10b981;
    color: white;
  }

  .analyze-btn:hover {
    background-color: #059669;
  }

  .ignore-btn {
    background-color: #6b7280;
    color: white;
  }

  .ignore-btn:hover {
    background-color: #4b5563;
  }

  .no-hotspots {
    text-align: center;
    padding: 3rem 2rem;
    color: #9ca3af;
  }

  .no-hotspots-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-hotspots h4 {
    margin: 0 0 0.5rem 0;
    color: #f1f5f9;
    font-size: 1.1rem;
  }

  .no-hotspots p {
    margin: 0;
    font-size: 0.875rem;
  }

  .more-hotspots {
    padding: 1rem;
    background-color: #0f172a;
    border-top: 1px solid #334155;
    text-align: center;
  }

  .more-hotspots p {
    margin: 0 0 0.5rem 0;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .view-all-btn {
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .view-all-btn:hover {
    background-color: #2563eb;
  }

  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .hotspot-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .hotspot-details {
      grid-template-columns: 1fr;
    }

    .hotspot-actions {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>