<script lang="ts">
  import { onMount } from 'svelte';
  import { scaleTime, scaleLinear } from 'd3-scale';
  import { extent, max, min } from 'd3-array';
  import { line } from 'd3-shape';
  import { select } from 'd3-selection';
  import { axisBottom, axisLeft } from 'd3-axis';
  import { timeFormat } from 'd3-time-format';
  import { createEventDispatcher } from 'svelte';
  import type { ComplexityTrend } from '../analytics/CodeAnalytics';

  export let trends: ComplexityTrend[] = [];
  export let width = 800;
  export let height = 400;
  export let selectedMetric: 'complexity' | 'lines' | 'functions' | 'classes' = 'complexity';
  export let title = 'Code Metrics Trend';
  export let showLegend = true;
  export let animate = true;

  const dispatch = createEventDispatcher<{
    pointClick: { trend: ComplexityTrend; event: MouseEvent };
    metricChange: { metric: string };
  }>();

  let svgElement: SVGElement;
  let chartContainer: HTMLDivElement;

  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  $: processedData = processData(trends, selectedMetric);
  $: if (svgElement && processedData.length > 0) {
    updateChart();
  }

  interface ProcessedDataPoint {
    date: Date;
    value: number;
    trend: ComplexityTrend;
    filePath: string;
  }

  function processData(trends: ComplexityTrend[], metric: string): ProcessedDataPoint[] {
    return trends.map(trend => ({
      date: new Date(trend.timestamp),
      value: getMetricValue(trend, metric),
      trend,
      filePath: trend.filePath
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  function getMetricValue(trend: ComplexityTrend, metric: string): number {
    switch (metric) {
      case 'complexity': return trend.complexity;
      case 'lines': return trend.lines;
      case 'functions': return trend.functions;
      case 'classes': return trend.classes;
      default: return trend.complexity;
    }
  }

  function getMetricLabel(metric: string): string {
    switch (metric) {
      case 'complexity': return 'Complexity Score';
      case 'lines': return 'Lines of Code';
      case 'functions': return 'Function Count';
      case 'classes': return 'Class Count';
      default: return 'Complexity Score';
    }
  }

  function updateChart() {
    if (!svgElement || processedData.length === 0) return;

    const svg = select(svgElement);
    svg.selectAll("*").remove();

    // Create scales
    const xScale = scaleTime()
      .domain(extent(processedData, d => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = scaleLinear()
      .domain([0, max(processedData, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(axisBottom(xScale).tickFormat(timeFormat('%m/%d %H:%M')));

    g.append('g')
      .call(axisLeft(yScale));

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#cbd5e1')
      .style('font-size', '12px')
      .text(getMetricLabel(selectedMetric));

    g.append('text')
      .attr('transform', `translate(${chartWidth / 2}, ${chartHeight + margin.bottom})`)
      .style('text-anchor', 'middle')
      .style('fill', '#cbd5e1')
      .style('font-size', '12px')
      .text('Time');

    // Group data by file path
    const fileGroups = new Map<string, ProcessedDataPoint[]>();
    processedData.forEach(d => {
      const filePath = d.filePath;
      if (!fileGroups.has(filePath)) {
        fileGroups.set(filePath, []);
      }
      fileGroups.get(filePath)!.push(d);
    });

    // Color scale for different files
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    let colorIndex = 0;

    // Create line generator
    const lineGenerator = line<ProcessedDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value));

    // Draw lines for each file
    fileGroups.forEach((points, filePath) => {
      const color = colors[colorIndex % colors.length];
      colorIndex++;

      // Sort points by date for proper line drawing
      points.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Draw line
      const path = g.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .attr('d', lineGenerator);

      // Animate line if requested
      if (animate) {
        const totalLength = (path.node() as SVGPathElement).getTotalLength();
        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1500)
          .attr('stroke-dashoffset', 0);
      }

      // Draw points
      g.selectAll(`.point-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`)
        .data(points)
        .enter()
        .append('circle')
        .attr('class', `point-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`)
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          dispatch('pointClick', { trend: d.trend, event });
        })
        .append('title')
        .text(d => `${filePath}\n${getMetricLabel(selectedMetric)}: ${d.value}\n${timeFormat('%Y-%m-%d %H:%M:%S')(d.date)}`);
    });

    // Add title
    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', '#f1f5f9')
      .text(title);
  }

  function handleMetricChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedMetric = target.value as any;
    dispatch('metricChange', { metric: selectedMetric });
  }

  onMount(() => {
    if (trends.length > 0) {
      updateChart();
    }
  });
</script>

<div class="trend-chart-container" bind:this={chartContainer}>
  <div class="chart-header">
    <h3 class="chart-title">{title}</h3>
    <div class="chart-controls">
      <label for="metric-select">Metric:</label>
      <select id="metric-select" bind:value={selectedMetric} on:change={handleMetricChange}>
        <option value="complexity">Complexity</option>
        <option value="lines">Lines of Code</option>
        <option value="functions">Functions</option>
        <option value="classes">Classes</option>
      </select>
    </div>
  </div>
  
  <div class="chart-content">
    <svg
      bind:this={svgElement}
      {width}
      {height}
      viewBox="0 0 {width} {height}"
    ></svg>
  </div>

  {#if showLegend && processedData.length > 0}
    <div class="chart-legend">
      {#each Array.from(new Set(processedData.map(d => d.filePath))).slice(0, 8) as filePath, index}
        <div class="legend-item">
          <div
            class="legend-color"
            style="background-color: {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'][index % 8]}"
          ></div>
          <span class="legend-label">{filePath.split('/').pop()}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if processedData.length === 0}
    <div class="no-data">
      <p>No trend data available</p>
    </div>
  {/if}
</div>

<style>
  .trend-chart-container {
    background-color: #1e293b;
    border-radius: 0.5rem;
    border: 1px solid #334155;
    padding: 1rem;
    color: #f1f5f9;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .chart-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .chart-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .chart-controls label {
    font-size: 0.875rem;
    color: #cbd5e1;
  }

  .chart-controls select {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .chart-controls select:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .chart-content {
    width: 100%;
    overflow-x: auto;
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #374151;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .legend-label {
    font-size: 0.75rem;
    color: #cbd5e1;
    font-family: monospace;
  }

  .no-data {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: #6b7280;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .chart-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .chart-legend {
      justify-content: center;
    }
  }
</style>