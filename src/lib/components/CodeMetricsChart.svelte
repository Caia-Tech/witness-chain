<!-- High-performance code metrics visualization using Observable Plot -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as Plot from '@observablehq/plot';
  import type { CodeMetrics, TimeSeriesPoint } from '$lib/types';
  
  export let metrics: CodeMetrics[] = [];
  export let height = 300;
  export let timeRange: { start: number; end: number } = { 
    start: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
    end: Date.now() 
  };
  
  let container: HTMLDivElement;
  let resizeObserver: ResizeObserver;
  let chartWidth = 800;
  
  // Filter and process metrics data
  $: processedData = processMetrics(metrics, timeRange);
  $: if (container && processedData.length > 0) {
    updateChart();
  }
  
  onMount(() => {
    if (container) {
      // Set up responsive behavior
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          chartWidth = entry.contentRect.width;
          updateChart();
        }
      });
      resizeObserver.observe(container);
      
      // Initial render
      updateChart();
    }
  });
  
  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });
  
  function processMetrics(rawMetrics: CodeMetrics[], range: { start: number; end: number }) {
    const filtered = rawMetrics.filter(m => 
      m.timestamp * 1000 >= range.start && m.timestamp * 1000 <= range.end
    );
    
    // Group by file and create time series data
    const fileGroups = new Map<string, CodeMetrics[]>();
    filtered.forEach(metric => {
      const key = metric.file_path;
      if (!fileGroups.has(key)) {
        fileGroups.set(key, []);
      }
      fileGroups.get(key)!.push(metric);
    });
    
    // Convert to time series points
    const timeSeriesData: TimeSeriesPoint[] = [];
    fileGroups.forEach((fileMetrics, filePath) => {
      fileMetrics.forEach(metric => {
        timeSeriesData.push({
          timestamp: metric.timestamp * 1000,
          value: metric.lines_of_code,
          category: getFileCategory(metric.file_path),
          label: metric.file_path
        });
      });
    });
    
    return timeSeriesData.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  function getFileCategory(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const categories: Record<string, string> = {
      'rs': 'Rust',
      'js': 'JavaScript', 
      'ts': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'go': 'Go',
      'rb': 'Ruby',
      'php': 'PHP',
      'css': 'CSS',
      'html': 'HTML',
      'md': 'Markdown',
      'json': 'Config',
      'yaml': 'Config',
      'yml': 'Config',
      'toml': 'Config'
    };
    return categories[ext] || 'Other';
  }
  
  function getLanguageColor(category: string): string {
    const colors: Record<string, string> = {
      'Rust': '#dea584',
      'TypeScript': '#3178c6',
      'JavaScript': '#f1e05a',
      'Python': '#3572a5',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C': '#555555',
      'Go': '#00add8',
      'Ruby': '#701516',
      'PHP': '#4f5d95',
      'CSS': '#563d7c',
      'HTML': '#e34c26',
      'Markdown': '#083fa1',
      'Config': '#6b7280',
      'Other': '#9ca3af'
    };
    return colors[category] || '#9ca3af';
  }
  
  function updateChart() {
    if (!container || processedData.length === 0) return;
    
    // Clear previous chart
    container.innerHTML = '';
    
    try {
      // Create the plot
      const chart = Plot.plot({
        width: chartWidth,
        height,
        marginLeft: 60,
        marginBottom: 40,
        marginTop: 20,
        marginRight: 100,
        
        style: {
          backgroundColor: '#0f172a',
          color: '#f1f5f9'
        },
        
        x: {
          type: 'time',
          label: 'Time',
          tickFormat: '%H:%M',
          grid: true,
          stroke: '#334155'
        },
        
        y: {
          label: 'Lines of Code',
          grid: true,
          stroke: '#334155'
        },
        
        color: {
          legend: true,
          range: processedData
            .map(d => d.category)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map(cat => getLanguageColor(cat))
        },
        
        marks: [
          // Grid lines
          Plot.gridY({ stroke: '#1e293b', strokeOpacity: 0.5 }),
          Plot.gridX({ stroke: '#1e293b', strokeOpacity: 0.5 }),
          
          // Line chart for each file category
          Plot.line(processedData, {
            x: 'timestamp',
            y: 'value',
            stroke: 'category',
            strokeWidth: 2,
            curve: 'catmull-rom'
          }),
          
          // Points for better visibility
          Plot.dot(processedData, {
            x: 'timestamp',
            y: 'value',
            fill: 'category',
            r: 3,
            stroke: '#0f172a',
            strokeWidth: 1,
            title: d => `${d.label}\n${d.value} lines\n${new Date(d.timestamp).toLocaleTimeString()}`
          }),
          
          // Text labels for latest values
          Plot.text(
            processedData
              .reduce((acc, d) => {
                const existing = acc.find(item => item.category === d.category);
                if (!existing || d.timestamp > existing.timestamp) {
                  const index = acc.findIndex(item => item.category === d.category);
                  if (index >= 0) acc[index] = d;
                  else acc.push(d);
                }
                return acc;
              }, [] as TimeSeriesPoint[]),
            {
              x: 'timestamp',
              y: 'value',
              text: 'category',
              fontSize: 11,
              dx: 8,
              fill: '#cbd5e1'
            }
          )
        ]
      });
      
      container.appendChild(chart);
      
    } catch (error) {
      console.error('Failed to render code metrics chart:', error);
      
      // Fallback: show error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'flex items-center justify-center h-full text-dashboard-text-secondary';
      errorDiv.textContent = 'Failed to render chart';
      container.appendChild(errorDiv);
    }
  }
  
  // Summary statistics
  $: totalLines = processedData.reduce((sum, d) => sum + d.value, 0);
  $: fileCount = new Set(processedData.map(d => d.label)).size;
  $: languageCount = new Set(processedData.map(d => d.category)).size;
</script>

<div class="code-metrics-chart">
  <div class="chart-header">
    <h3 class="font-medium text-dashboard-text-primary">
      Code Metrics Over Time
    </h3>
    <div class="chart-stats">
      <div class="stat">
        <span class="stat-value">{totalLines.toLocaleString()}</span>
        <span class="stat-label">Total Lines</span>
      </div>
      <div class="stat">
        <span class="stat-value">{fileCount}</span>
        <span class="stat-label">Files</span>
      </div>
      <div class="stat">
        <span class="stat-value">{languageCount}</span>
        <span class="stat-label">Languages</span>
      </div>
    </div>
  </div>
  
  <div class="chart-container">
    <div 
      bind:this={container} 
      class="chart-content"
      style="height: {height}px"
    />
    
    {#if processedData.length === 0}
      <div class="chart-empty">
        <div class="text-dashboard-text-secondary">
          No code metrics data available for the selected time range
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .code-metrics-chart {
    @apply bg-dashboard-bg-secondary rounded-lg border border-dashboard-bg-tertiary;
    @apply flex flex-col h-full;
  }
  
  .chart-header {
    @apply p-4 border-b border-dashboard-bg-tertiary;
    @apply flex justify-between items-center;
  }
  
  .chart-stats {
    @apply flex gap-6;
  }
  
  .stat {
    @apply text-center;
  }
  
  .stat-value {
    @apply block text-lg font-semibold text-dashboard-text-primary;
  }
  
  .stat-label {
    @apply text-xs text-dashboard-text-secondary;
  }
  
  .chart-container {
    @apply flex-1 relative overflow-hidden;
  }
  
  .chart-content {
    @apply w-full;
  }
  
  .chart-empty {
    @apply absolute inset-0 flex items-center justify-center;
    @apply bg-dashboard-bg-primary bg-opacity-50;
  }
  
  /* Observable Plot styling overrides */
  :global(.code-metrics-chart svg) {
    @apply bg-dashboard-bg-primary;
  }
  
  :global(.code-metrics-chart .plot-legend) {
    @apply text-dashboard-text-secondary;
  }
  
  :global(.code-metrics-chart .plot-legend text) {
    @apply fill-dashboard-text-secondary text-xs;
  }
</style>