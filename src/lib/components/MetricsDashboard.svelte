<!--
  D3.js Interactive Metrics Dashboard Component
  Advanced visualizations for code metrics and analytics
-->
<script lang="ts">
  import { onMount, createEventDispatcher, afterUpdate } from 'svelte';
  import { scaleTime, scaleLinear } from 'd3-scale';
  import { extent, max, min } from 'd3-array';
  import { line, area, curveMonotoneX } from 'd3-shape';
  import { axisBottom, axisLeft } from 'd3-axis';
  import { select } from 'd3-selection';
  import { transition } from 'd3-transition';
  import { brush, brushX } from 'd3-brush';
  import { zoom, zoomTransform } from 'd3-zoom';
  import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor.js';
  import type { Language } from '../monitoring/FileAnalyzer.js';
  
  export let events: MonitorEvent[] = [];
  export let width: number = 800;
  export let height: number = 400;
  export let selectedMetric: string = 'complexity';
  export let timeRange: string = '1h'; // 1h, 6h, 24h, 7d, 30d
  export let showLanguageBreakdown: boolean = true;

  const dispatch = createEventDispatcher();

  // Chart configuration
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Chart containers
  let svgContainer: HTMLElement;
  let svg: any;
  let tooltip: HTMLElement;

  // Data processing
  $: processedData = processEventsData(events, selectedMetric, timeRange);
  $: languageData = processLanguageData(events);
  $: timeSeriesData = aggregateTimeSeriesData(processedData);

  interface MetricDataPoint {
    timestamp: Date;
    value: number;
    event: MonitorEvent;
    language?: Language;
  }

  interface AggregatedPoint {
    timestamp: Date;
    value: number;
    count: number;
    languages: Record<Language, number>;
    events: MonitorEvent[];
  }

  function processEventsData(events: MonitorEvent[], metric: string, range: string): MetricDataPoint[] {
    const now = new Date();
    const rangeMs = getTimeRangeMs(range);
    const cutoffTime = new Date(now.getTime() - rangeMs);

    return events
      .filter(event => new Date(event.timestamp) >= cutoffTime)
      .filter(event => event.analysis)
      .map(event => ({
        timestamp: new Date(event.timestamp),
        value: getMetricValue(event, metric),
        event,
        language: event.analysis?.language
      }))
      .filter(d => d.value !== undefined && !isNaN(d.value));
  }

  function processLanguageData(events: MonitorEvent[]) {
    const languageCounts: Record<Language, number> = {} as Record<Language, number>;
    const languageComplexity: Record<Language, { total: number; count: number }> = {} as Record<Language, { total: number; count: number }>;
    
    events.forEach(event => {
      if (event.analysis?.language) {
        const lang = event.analysis.language;
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        
        if (event.analysis.complexity) {
          if (!languageComplexity[lang]) {
            languageComplexity[lang] = { total: 0, count: 0 };
          }
          languageComplexity[lang].total += event.analysis.complexity;
          languageComplexity[lang].count += 1;
        }
      }
    });

    return Object.entries(languageCounts).map(([language, count]) => ({
      language: language as Language,
      count,
      avgComplexity: languageComplexity[language as Language] 
        ? languageComplexity[language as Language].total / languageComplexity[language as Language].count 
        : 0
    }));
  }

  function aggregateTimeSeriesData(data: MetricDataPoint[]): AggregatedPoint[] {
    if (data.length === 0) return [];

    // Group by hour for better visualization
    const grouping = new Map<string, AggregatedPoint>();
    
    data.forEach(point => {
      const hourKey = new Date(point.timestamp);
      hourKey.setMinutes(0, 0, 0);
      const key = hourKey.toISOString();
      
      if (!grouping.has(key)) {
        grouping.set(key, {
          timestamp: hourKey,
          value: 0,
          count: 0,
          languages: {} as Record<Language, number>,
          events: []
        });
      }

      const group = grouping.get(key)!;
      group.value += point.value;
      group.count += 1;
      group.events.push(point.event);
      
      if (point.language) {
        group.languages[point.language] = (group.languages[point.language] || 0) + 1;
      }
    });

    return Array.from(grouping.values())
      .map(group => ({
        ...group,
        value: group.value / group.count // Average value
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  function getTimeRangeMs(range: string): number {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  function getMetricValue(event: MonitorEvent, metric: string): number {
    if (!event.analysis) return 0;

    switch (metric) {
      case 'complexity': return event.analysis.complexity || 0;
      case 'lines': return event.analysis.lines;
      case 'size': return event.analysis.size;
      case 'symbols': return event.analysis.symbols.length;
      case 'dependencies': return event.analysis.dependencies.length;
      default: return 0;
    }
  }

  function getLanguageColor(language: Language): string {
    const colors: Record<Language, string> = {
      rust: '#dea584',
      typescript: '#3178c6',
      javascript: '#f7df1e',
      svelte: '#ff3e00',
      python: '#3776ab',
      java: '#ed8b00',
      html: '#e34c26',
      css: '#1572b6',
      json: '#666666',
      markdown: '#083fa1',
      unknown: '#6b7280'
    };
    return colors[language] || colors.unknown;
  }

  function formatValue(value: number, metric: string): string {
    switch (metric) {
      case 'size':
        if (value > 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`;
        if (value > 1024) return `${(value / 1024).toFixed(1)}KB`;
        return `${value}B`;
      case 'complexity':
        return value.toFixed(1);
      default:
        return value.toLocaleString();
    }
  }

  function showTooltip(event: MouseEvent, data: AggregatedPoint) {
    if (!tooltip) return;

    const rect = svgContainer.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - rect.left + 10}px`;
    tooltip.style.top = `${event.clientY - rect.top - 10}px`;
    tooltip.style.opacity = '1';

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <strong>${data.timestamp.toLocaleString()}</strong>
      </div>
      <div class="tooltip-body">
        <div class="tooltip-row">
          <span>${selectedMetric}:</span>
          <strong>${formatValue(data.value, selectedMetric)}</strong>
        </div>
        <div class="tooltip-row">
          <span>Events:</span>
          <strong>${data.count}</strong>
        </div>
        ${Object.entries(data.languages).map(([lang, count]) => 
          `<div class="tooltip-row language-row">
            <span style="color: ${getLanguageColor(lang as Language)}">${lang}:</span>
            <strong>${count}</strong>
          </div>`
        ).join('')}
      </div>
    `;
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  }

  function createChart() {
    if (!svgContainer || timeSeriesData.length === 0) return;

    // Clear previous chart
    select(svgContainer).select('svg').remove();

    // Create SVG
    svg = select(svgContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = scaleTime()
      .domain(extent(timeSeriesData, d => d.timestamp) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = scaleLinear()
      .domain([0, max(timeSeriesData, d => d.value) || 1])
      .nice()
      .range([chartHeight, 0]);

    // Create line generator
    const lineGenerator = line<AggregatedPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(curveMonotoneX);

    // Create area generator for filled area under line
    const areaGenerator = area<AggregatedPoint>()
      .x(d => xScale(d.timestamp))
      .y0(chartHeight)
      .y1(d => yScale(d.value))
      .curve(curveMonotoneX);

    // Add gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', yScale(0))
      .attr('x2', 0).attr('y2', yScale(max(timeSeriesData, d => d.value) || 1));

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.8);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.1);

    // Add area
    chartGroup.append('path')
      .datum(timeSeriesData)
      .attr('class', 'area')
      .attr('d', areaGenerator)
      .style('fill', 'url(#area-gradient)');

    // Add line
    chartGroup.append('path')
      .datum(timeSeriesData)
      .attr('class', 'line')
      .attr('d', lineGenerator)
      .style('fill', 'none')
      .style('stroke', '#3b82f6')
      .style('stroke-width', 2);

    // Add data points
    chartGroup.selectAll('.data-point')
      .data(timeSeriesData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .style('fill', '#3b82f6')
      .style('stroke', '#ffffff')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => showTooltip(event, d))
      .on('mouseout', hideTooltip)
      .on('click', (event, d) => dispatch('pointClick', { data: d, events: d.events }));

    // Add X axis
    chartGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(axisBottom(xScale).tickFormat(d => {
        const date = d as Date;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }))
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '12px');

    // Add Y axis
    chartGroup.append('g')
      .attr('class', 'y-axis')
      .call(axisLeft(yScale).tickFormat(d => formatValue(d as number, selectedMetric)))
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '12px');

    // Style axis lines and ticks
    svg.selectAll('.domain, .tick line')
      .style('stroke', '#475569')
      .style('stroke-width', 1);

    // Add axis labels
    svg.append('text')
      .attr('class', 'y-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', margin.left - 35)
      .attr('x', -(height / 2))
      .attr('text-anchor', 'middle')
      .style('fill', '#cbd5e1')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text(selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1));

    svg.append('text')
      .attr('class', 'x-label')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .style('fill', '#cbd5e1')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Time');
  }

  function createLanguageChart() {
    if (!showLanguageBreakdown || languageData.length === 0) return;

    const languageContainer = select('#language-chart');
    languageContainer.select('svg').remove();

    const pieWidth = 200;
    const pieHeight = 200;
    const radius = Math.min(pieWidth, pieHeight) / 2;

    const pieSvg = languageContainer
      .append('svg')
      .attr('width', pieWidth)
      .attr('height', pieHeight);

    const pieGroup = pieSvg
      .append('g')
      .attr('transform', `translate(${pieWidth / 2},${pieHeight / 2})`);

    // Create pie chart here (simplified for now)
    const sortedLanguages = languageData
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 languages

    sortedLanguages.forEach((lang, i) => {
      const angle = (i / sortedLanguages.length) * 2 * Math.PI;
      const x = Math.cos(angle) * (radius - 20);
      const y = Math.sin(angle) * (radius - 20);

      pieGroup.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', Math.sqrt(lang.count) * 3)
        .style('fill', getLanguageColor(lang.language))
        .style('opacity', 0.7);

      pieGroup.append('text')
        .attr('x', x)
        .attr('y', y + 5)
        .attr('text-anchor', 'middle')
        .style('fill', '#f1f5f9')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .text(lang.language);
    });
  }

  onMount(() => {
    createChart();
    createLanguageChart();
  });

  afterUpdate(() => {
    createChart();
    createLanguageChart();
  });

  function handleMetricChange(metric: string) {
    selectedMetric = metric;
    dispatch('metricChange', { metric });
  }

  function handleTimeRangeChange(range: string) {
    timeRange = range;
    dispatch('timeRangeChange', { range });
  }
</script>

<div class="metrics-dashboard">
  <!-- Dashboard Header -->
  <div class="dashboard-header">
    <h3 class="dashboard-title">
      <span class="title-icon">📊</span>
      Code Metrics Dashboard
    </h3>
    
    <div class="dashboard-controls">
      <div class="metric-selector">
        <label for="metric-select">Metric:</label>
        <select 
          id="metric-select"
          bind:value={selectedMetric}
          on:change={(e) => handleMetricChange(e.target.value)}
        >
          <option value="complexity">Complexity</option>
          <option value="lines">Lines of Code</option>
          <option value="size">File Size</option>
          <option value="symbols">Symbol Count</option>
          <option value="dependencies">Dependencies</option>
        </select>
      </div>
      
      <div class="time-range-selector">
        <label for="range-select">Time Range:</label>
        <select 
          id="range-select"
          bind:value={timeRange}
          on:change={(e) => handleTimeRangeChange(e.target.value)}
        >
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <label class="toggle-option">
        <input type="checkbox" bind:checked={showLanguageBreakdown} />
        <span>Show Languages</span>
      </label>
    </div>
  </div>

  <!-- Main Chart -->
  <div class="chart-container">
    {#if timeSeriesData.length === 0}
      <div class="empty-chart">
        <div class="empty-icon">📈</div>
        <p>No data available for the selected time range</p>
        <small>Metrics will appear here as files are analyzed</small>
      </div>
    {:else}
      <div class="chart-content">
        <div class="main-chart" bind:this={svgContainer}></div>
        
        {#if showLanguageBreakdown && languageData.length > 0}
          <div class="side-panel">
            <h4>Language Distribution</h4>
            <div id="language-chart" class="language-chart"></div>
            
            <div class="language-stats">
              {#each languageData.slice(0, 5) as lang}
                <div class="language-stat">
                  <div 
                    class="language-color"
                    style="background-color: {getLanguageColor(lang.language)}"
                  ></div>
                  <div class="language-info">
                    <div class="language-name">{lang.language}</div>
                    <div class="language-details">
                      {lang.count} files • avg {lang.avgComplexity.toFixed(1)} complexity
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Statistics Footer -->
  <div class="dashboard-footer">
    <div class="metric-summary">
      {#if timeSeriesData.length > 0}
        {@const totalEvents = timeSeriesData.reduce((sum, d) => sum + d.count, 0)}
        {@const avgValue = timeSeriesData.reduce((sum, d) => sum + d.value, 0) / timeSeriesData.length}
        {@const maxValue = Math.max(...timeSeriesData.map(d => d.value))}
        
        <div class="summary-item">
          <span class="summary-label">Total Events:</span>
          <span class="summary-value">{totalEvents}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Average {selectedMetric}:</span>
          <span class="summary-value">{formatValue(avgValue, selectedMetric)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Peak {selectedMetric}:</span>
          <span class="summary-value">{formatValue(maxValue, selectedMetric)}</span>
        </div>
      {:else}
        <div class="summary-item">
          <span class="summary-label">No data available</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Tooltip -->
  <div bind:this={tooltip} class="chart-tooltip"></div>
</div>

<style>
  .metrics-dashboard {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e293b;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .dashboard-header {
    padding: 1rem;
    border-bottom: 1px solid #334155;
    background: #0f172a;
  }

  .dashboard-title {
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

  .dashboard-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .metric-selector,
  .time-range-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .metric-selector label,
  .time-range-selector label {
    font-size: 0.875rem;
    color: #cbd5e1;
    min-width: fit-content;
  }

  .metric-selector select,
  .time-range-selector select {
    padding: 0.375rem 0.75rem;
    background: #334155;
    border: 1px solid #475569;
    border-radius: 0.25rem;
    color: #e2e8f0;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .metric-selector select:focus,
  .time-range-selector select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .toggle-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #cbd5e1;
    cursor: pointer;
  }

  .toggle-option input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }

  .chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .empty-chart {
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

  .empty-chart p {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .empty-chart small {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  .chart-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .main-chart {
    flex: 1;
    min-height: 0;
    padding: 1rem;
  }

  .side-panel {
    width: 250px;
    padding: 1rem;
    border-left: 1px solid #334155;
    background: #0f172a;
    overflow-y: auto;
  }

  .side-panel h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .language-chart {
    width: 100%;
    height: 200px;
    margin-bottom: 1rem;
  }

  .language-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .language-stat {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .language-color {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .language-info {
    flex: 1;
    min-width: 0;
  }

  .language-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #e2e8f0;
    text-transform: capitalize;
  }

  .language-details {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.125rem;
  }

  .dashboard-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid #334155;
    background: #0f172a;
  }

  .metric-summary {
    display: flex;
    gap: 2rem;
    font-size: 0.875rem;
  }

  .summary-item {
    display: flex;
    gap: 0.5rem;
  }

  .summary-label {
    color: #94a3b8;
  }

  .summary-value {
    color: #e2e8f0;
    font-weight: 500;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .chart-tooltip {
    position: absolute;
    background: #0f172a;
    border: 1px solid #475569;
    border-radius: 0.5rem;
    padding: 0.75rem;
    font-size: 0.875rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 1000;
    max-width: 250px;
  }

  .tooltip-header {
    color: #f1f5f9;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .tooltip-body {
    color: #cbd5e1;
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .tooltip-row:last-child {
    margin-bottom: 0;
  }

  .language-row {
    font-size: 0.75rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .dashboard-controls {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .chart-content {
      flex-direction: column;
    }

    .side-panel {
      width: 100%;
      border-left: none;
      border-top: 1px solid #334155;
      max-height: 200px;
    }

    .metric-summary {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  /* Chart styling */
  :global(.data-point:hover) {
    r: 6;
    filter: brightness(1.2);
  }

  :global(.area) {
    transition: opacity 0.2s ease;
  }

  :global(.line) {
    transition: stroke-width 0.2s ease;
  }
</style>