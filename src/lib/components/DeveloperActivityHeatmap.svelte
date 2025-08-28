<!-- High-performance developer activity heatmap using Canvas -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Event, ActivityData } from '$lib/types';
  
  export let events: Event[] = [];
  export let width = 600;
  export let height = 400;
  export let days = 30; // Number of days to show
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationFrame: number;
  let isVisible = true;
  
  // Heatmap configuration
  const CELL_SIZE = 12;
  const CELL_PADDING = 2;
  const HOURS_PER_DAY = 24;
  const MAX_INTENSITY = 10; // Maximum events per hour-cell
  
  // Color scale for activity intensity
  const INTENSITY_COLORS = [
    '#0f172a', // No activity (background)
    '#1e293b', // Very low
    '#334155', // Low
    '#475569', // Medium-low
    '#64748b', // Medium
    '#94a3b8', // Medium-high
    '#cbd5e1', // High
    '#e2e8f0', // Very high
    '#f1f5f9', // Maximum
  ];
  
  $: heatmapData = processEventData(events, days);
  $: if (canvas && ctx && heatmapData) {
    requestRender();
  }
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      setupCanvas();
      startRenderLoop();
    }
    
    // Intersection Observer for performance
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) {
          requestRender();
        }
      },
      { threshold: 0.1 }
    );
    
    if (canvas) {
      observer.observe(canvas);
    }
    
    return () => {
      observer.disconnect();
    };
  });
  
  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });
  
  function setupCanvas() {
    // Set up high DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Set default styles
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
  }
  
  function startRenderLoop() {
    function render() {
      if (isVisible) {
        renderHeatmap();
      }
      animationFrame = requestAnimationFrame(render);
    }
    render();
  }
  
  function requestRender() {
    if (!animationFrame && isVisible) {
      animationFrame = requestAnimationFrame(() => {
        renderHeatmap();
        animationFrame = 0;
      });
    }
  }
  
  function processEventData(rawEvents: Event[], dayCount: number): ActivityData[] {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - dayCount);
    startDate.setHours(0, 0, 0, 0);
    
    // Create activity map: developer -> day -> hour -> count
    const activityMap = new Map<string, Map<number, Map<number, number>>>();
    
    rawEvents
      .filter(event => {
        const eventDate = new Date(event.timestamp * 1000);
        return eventDate >= startDate && event.developer_id;
      })
      .forEach(event => {
        const developer = event.developer_id || 'Unknown';
        const eventDate = new Date(event.timestamp * 1000);
        const dayIndex = Math.floor((eventDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const hour = eventDate.getHours();
        
        if (!activityMap.has(developer)) {
          activityMap.set(developer, new Map());
        }
        
        const developerMap = activityMap.get(developer)!;
        if (!developerMap.has(dayIndex)) {
          developerMap.set(dayIndex, new Map());
        }
        
        const dayMap = developerMap.get(dayIndex)!;
        dayMap.set(hour, (dayMap.get(hour) || 0) + 1);
      });
    
    // Convert to ActivityData array
    const activityData: ActivityData[] = [];
    
    activityMap.forEach((developerData, developer) => {
      for (let day = 0; day < dayCount; day++) {
        const dayData = developerData.get(day) || new Map();
        for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
          const activity = dayData.get(hour) || 0;
          activityData.push({
            developer,
            day,
            hour,
            activity
          });
        }
      }
    });
    
    return activityData;
  }
  
  function renderHeatmap() {
    if (!ctx || !canvas || !heatmapData) return;
    
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    if (heatmapData.length === 0) {
      // Show empty state
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('No developer activity data available', width / 2, height / 2);
      return;
    }
    
    // Group data by developer
    const developers = Array.from(new Set(heatmapData.map(d => d.developer))).sort();
    const maxActivity = Math.max(...heatmapData.map(d => d.activity));
    
    // Calculate layout
    const leftMargin = 80;
    const topMargin = 40;
    const availableWidth = width - leftMargin - 20;
    const availableHeight = height - topMargin - 60;
    
    const cellWidth = Math.min(CELL_SIZE, availableWidth / days);
    const cellHeight = Math.min(CELL_SIZE, availableHeight / (developers.length * HOURS_PER_DAY));
    
    // Render day labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    for (let day = 0; day < days; day += 7) {
      const x = leftMargin + day * cellWidth + cellWidth / 2;
      const date = new Date();
      date.setDate(date.getDate() - days + day);
      ctx.fillText(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, 20);
    }
    
    // Render hour labels (every 6 hours)
    ctx.textAlign = 'right';
    for (let hour = 0; hour < HOURS_PER_DAY; hour += 6) {
      const y = topMargin + hour * cellHeight * developers.length + cellHeight / 2;
      ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, leftMargin - 10, y);
    }
    
    // Render developer labels
    ctx.textAlign = 'right';
    ctx.font = '11px Inter, system-ui, sans-serif';
    developers.forEach((developer, devIndex) => {
      const y = topMargin + devIndex * HOURS_PER_DAY * cellHeight + (HOURS_PER_DAY * cellHeight) / 2;
      ctx.fillText(developer, leftMargin - 10, y);
    });
    
    // Render heatmap cells
    heatmapData.forEach(data => {
      const devIndex = developers.indexOf(data.developer);
      if (devIndex === -1) return;
      
      const x = leftMargin + data.day * cellWidth;
      const y = topMargin + devIndex * HOURS_PER_DAY * cellHeight + data.hour * cellHeight;
      
      // Calculate intensity (0-1)
      const intensity = Math.min(data.activity / MAX_INTENSITY, 1);
      const colorIndex = Math.floor(intensity * (INTENSITY_COLORS.length - 1));
      
      ctx.fillStyle = INTENSITY_COLORS[colorIndex];
      ctx.fillRect(x, y, cellWidth - CELL_PADDING, cellHeight - CELL_PADDING);
      
      // Add border for cells with activity
      if (data.activity > 0) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellWidth - CELL_PADDING, cellHeight - CELL_PADDING);
      }
      
      // Add activity count for high activity cells
      if (data.activity >= 5 && cellWidth > 10 && cellHeight > 10) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '8px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          data.activity.toString(),
          x + cellWidth / 2,
          y + cellHeight / 2
        );
      }
    });
    
    // Render legend
    renderLegend();
    
    // Render statistics
    renderStats();
  }
  
  function renderLegend() {
    const legendY = height - 40;
    const legendStartX = width - 200;
    
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Activity Level:', legendStartX, legendY - 15);
    
    // Legend scale
    const legendCellSize = 12;
    INTENSITY_COLORS.forEach((color, index) => {
      const x = legendStartX + index * (legendCellSize + 1);
      ctx.fillStyle = color;
      ctx.fillRect(x, legendY, legendCellSize, legendCellSize);
      
      if (index === 0 || index === INTENSITY_COLORS.length - 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(
          index === 0 ? 'Low' : 'High',
          x + legendCellSize / 2,
          legendY + legendCellSize + 12
        );
      }
    });
  }
  
  function renderStats() {
    const developers = Array.from(new Set(heatmapData.map(d => d.developer)));
    const totalActivity = heatmapData.reduce((sum, d) => sum + d.activity, 0);
    const activeDays = new Set(heatmapData.filter(d => d.activity > 0).map(d => `${d.developer}-${d.day}`)).size;
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    
    const statsY = height - 20;
    ctx.fillText(`${developers.length} developers • ${totalActivity} events • ${activeDays} active days`, 10, statsY);
  }
  
  // Handle canvas click events
  function handleCanvasClick(event: MouseEvent) {
    if (!canvas || !heatmapData) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate which cell was clicked
    const leftMargin = 80;
    const topMargin = 40;
    const cellWidth = Math.min(CELL_SIZE, (width - leftMargin - 20) / days);
    const developers = Array.from(new Set(heatmapData.map(d => d.developer))).sort();
    const cellHeight = Math.min(CELL_SIZE, (height - topMargin - 60) / (developers.length * HOURS_PER_DAY));
    
    const day = Math.floor((x - leftMargin) / cellWidth);
    const totalY = y - topMargin;
    const devIndex = Math.floor(totalY / (HOURS_PER_DAY * cellHeight));
    const hour = Math.floor((totalY % (HOURS_PER_DAY * cellHeight)) / cellHeight);
    
    if (day >= 0 && day < days && devIndex >= 0 && devIndex < developers.length && hour >= 0 && hour < HOURS_PER_DAY) {
      const developer = developers[devIndex];
      const activity = heatmapData.find(d => d.developer === developer && d.day === day && d.hour === hour);
      
      if (activity && activity.activity > 0) {
        const date = new Date();
        date.setDate(date.getDate() - days + day);
        date.setHours(hour, 0, 0, 0);
        
        const detail = {
          developer,
          day,
          hour,
          activity: activity.activity,
          date: date.toISOString()
        };
        
        canvas.dispatchEvent(new CustomEvent('cellClick', { detail }));
      }
    }
  }
</script>

<div class="activity-heatmap">
  <div class="heatmap-header">
    <h3 class="font-medium text-dashboard-text-primary">
      Developer Activity Heatmap
    </h3>
    <div class="text-sm text-dashboard-text-secondary">
      Last {days} days • Activity by hour
    </div>
  </div>
  
  <div class="heatmap-container">
    <canvas
      bind:this={canvas}
      class="heatmap-canvas"
      on:click={handleCanvasClick}
      on:cellClick
      {width}
      {height}
      style="width: {width}px; height: {height}px"
    />
    
    {#if !isVisible}
      <div class="heatmap-overlay">
        <div class="text-sm text-dashboard-text-secondary">
          Heatmap paused (not visible)
        </div>
      </div>
    {/if}
  </div>
  
  <div class="heatmap-footer">
    <div class="text-xs text-dashboard-text-secondary">
      Click on cells to view detailed activity • Darker colors indicate higher activity
    </div>
  </div>
</div>

<style>
  .activity-heatmap {
    @apply bg-dashboard-bg-secondary rounded-lg border border-dashboard-bg-tertiary;
    @apply flex flex-col h-full;
  }
  
  .heatmap-header {
    @apply p-4 border-b border-dashboard-bg-tertiary;
    @apply flex justify-between items-center;
  }
  
  .heatmap-container {
    @apply flex-1 relative overflow-hidden p-4;
  }
  
  .heatmap-canvas {
    @apply cursor-pointer;
    @apply transition-opacity duration-200;
  }
  
  .heatmap-overlay {
    @apply absolute inset-0 bg-dashboard-bg-primary bg-opacity-80;
    @apply flex items-center justify-center;
    @apply backdrop-blur-sm;
  }
  
  .heatmap-footer {
    @apply p-2 border-t border-dashboard-bg-tertiary text-center;
  }
</style>