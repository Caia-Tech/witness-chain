<!-- High-performance canvas-based real-time activity feed -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Event } from '$lib/types';
  
  export let events: Event[] = [];
  export let maxEvents = 100;
  export let height = 400;
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationFrame: number;
  let isVisible = true;
  let lastEventCount = 0;
  
  // Performance monitoring
  let renderCount = 0;
  let avgRenderTime = 0;
  
  // Event colors by type
  const EVENT_COLORS = {
    'file_created': '#10b981',    // green
    'file_modified': '#3b82f6',   // blue  
    'file_deleted': '#ef4444',    // red
    'git_commit': '#8b5cf6',      // purple
    'build_started': '#f59e0b',   // amber
    'build_completed': '#10b981', // green
    'build_failed': '#ef4444',    // red
    default: '#6b7280'            // gray
  };
  
  $: visibleEvents = events.slice(-maxEvents);
  $: if (canvas && ctx && events.length !== lastEventCount) {
    lastEventCount = events.length;
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
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = height + 'px';
    
    // Set default styles
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
  }
  
  function startRenderLoop() {
    function render() {
      if (isVisible) {
        const startTime = performance.now();
        renderEvents();
        
        // Performance tracking
        const renderTime = performance.now() - startTime;
        renderCount++;
        avgRenderTime = (avgRenderTime * (renderCount - 1) + renderTime) / renderCount;
      }
      
      animationFrame = requestAnimationFrame(render);
    }
    
    render();
  }
  
  function requestRender() {
    if (!animationFrame && isVisible) {
      animationFrame = requestAnimationFrame(() => {
        renderEvents();
        animationFrame = 0;
      });
    }
  }
  
  function renderEvents() {
    if (!ctx || !canvas) return;
    
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = height;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    if (visibleEvents.length === 0) {
      // Show empty state
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for events...', canvasWidth / 2, canvasHeight / 2);
      return;
    }
    
    const eventHeight = Math.min(30, Math.max(15, canvasHeight / maxEvents));
    const padding = 2;
    const contentWidth = canvasWidth - 20;
    
    // Render events from bottom to top (newest at bottom)
    visibleEvents.forEach((event, index) => {
      const y = canvasHeight - (index + 1) * (eventHeight + padding);
      
      if (y < -eventHeight) return; // Skip events above viewport
      
      renderEvent(event, 10, y, contentWidth, eventHeight - padding, index);
    });
    
    // Render performance info in debug mode
    if (import.meta.env.DEV) {
      renderDebugInfo();
    }
  }
  
  function renderEvent(event: Event, x: number, y: number, width: number, height: number, index: number) {
    const age = Date.now() - (event.timestamp * 1000);
    const ageSeconds = age / 1000;
    
    // Calculate opacity based on age (fade older events)
    const maxAge = 300; // 5 minutes
    const opacity = Math.max(0.3, Math.min(1, 1 - (ageSeconds / maxAge)));
    
    // Get event color
    const color = EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS] || EVENT_COLORS.default;
    
    // Draw event background
    ctx.globalAlpha = opacity * 0.8;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    
    // Draw event border (for newest events)
    if (index >= visibleEvents.length - 5) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
    
    // Draw event content
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    // Event type and timestamp
    const timeStr = formatTimestamp(event.timestamp);
    const typeText = `${event.event_type} • ${timeStr}`;
    ctx.fillText(typeText, x + 8, y + height * 0.3);
    
    // File path or additional info
    if (event.file_path) {
      ctx.fillStyle = '#cbd5e1';
      const pathText = truncateText(event.file_path, width - 16);
      ctx.fillText(pathText, x + 8, y + height * 0.7);
    }
    
    // Activity indicator for very recent events
    if (ageSeconds < 2) {
      const pulseOpacity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      ctx.globalAlpha = pulseOpacity;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + width - 8, y + 4, 4, height - 8);
    }
  }
  
  function renderDebugInfo() {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 10, 200, 60);
    
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(`Events: ${visibleEvents.length}/${events.length}`, 15, 25);
    ctx.fillText(`Avg render: ${avgRenderTime.toFixed(2)}ms`, 15, 40);
    ctx.fillText(`Renders: ${renderCount}`, 15, 55);
  }
  
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  }
  
  function truncateText(text: string, maxWidth: number): string {
    ctx.font = '11px system-ui, sans-serif';
    const metrics = ctx.measureText(text);
    
    if (metrics.width <= maxWidth) {
      return text;
    }
    
    // Binary search for maximum length
    let left = 0;
    let right = text.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.substring(0, mid) + '...';
      const width = ctx.measureText(truncated).width;
      
      if (width <= maxWidth) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return text.substring(0, left - 1) + '...';
  }
  
  // Handle canvas click events
  function handleCanvasClick(event: MouseEvent) {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate which event was clicked
    const eventHeight = Math.min(30, Math.max(15, height / maxEvents));
    const padding = 2;
    const eventIndex = Math.floor((height - y) / (eventHeight + padding));
    
    if (eventIndex >= 0 && eventIndex < visibleEvents.length) {
      const clickedEvent = visibleEvents[eventIndex];
      // Dispatch custom event for parent to handle
      const detail = { event: clickedEvent };
      canvas.dispatchEvent(new CustomEvent('eventClick', { detail }));
    }
  }
</script>

<div class="activity-feed">
  <div class="feed-header">
    <h3 class="font-medium text-dashboard-text-primary">
      Real-time Activity
    </h3>
    <div class="text-sm text-dashboard-text-secondary">
      {events.length} events • {visibleEvents.length} visible
    </div>
  </div>
  
  <div class="feed-canvas-container">
    <canvas
      bind:this={canvas}
      {height}
      class="activity-canvas"
      on:click={handleCanvasClick}
      on:eventClick
      style="height: {height}px"
    />
    
    {#if !isVisible}
      <div class="feed-overlay">
        <div class="text-sm text-dashboard-text-secondary">
          Activity feed paused (not visible)
        </div>
      </div>
    {/if}
  </div>
  
  <div class="feed-legend">
    {#each Object.entries(EVENT_COLORS) as [type, color]}
      {#if type !== 'default'}
        <div class="legend-item">
          <div 
            class="legend-color" 
            style="background-color: {color}"
          ></div>
          <span class="text-xs text-dashboard-text-secondary">
            {type.replace('_', ' ')}
          </span>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .activity-feed {
    @apply bg-dashboard-bg-secondary rounded-lg border border-dashboard-bg-tertiary;
    @apply flex flex-col h-full;
  }
  
  .feed-header {
    @apply p-4 border-b border-dashboard-bg-tertiary;
    @apply flex justify-between items-center;
  }
  
  .feed-canvas-container {
    @apply flex-1 relative overflow-hidden;
  }
  
  .activity-canvas {
    @apply w-full cursor-pointer;
    @apply transition-opacity duration-200;
  }
  
  .feed-overlay {
    @apply absolute inset-0 bg-dashboard-bg-primary bg-opacity-80;
    @apply flex items-center justify-center;
    @apply backdrop-blur-sm;
  }
  
  .feed-legend {
    @apply p-2 border-t border-dashboard-bg-tertiary;
    @apply flex flex-wrap gap-3;
  }
  
  .legend-item {
    @apply flex items-center gap-1;
  }
  
  .legend-color {
    @apply w-3 h-3 rounded-sm;
  }
</style>