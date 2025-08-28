<!-- Interactive file system tree visualization using D3 -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import type { FileNode, Event } from '$lib/types';
  
  export let fileStructure: FileNode;
  export let recentEvents: Event[] = [];
  export let width = 400;
  export let height = 600;
  
  let container: HTMLDivElement;
  let svg: d3.Selection<SVGElement, unknown, null, undefined>;
  let resizeObserver: ResizeObserver;
  
  // Activity tracking
  $: fileActivity = calculateFileActivity(recentEvents);
  $: if (container && fileStructure) {
    updateTree();
  }
  
  onMount(() => {
    if (container) {
      setupSVG();
      
      // Set up responsive behavior
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          width = entry.contentRect.width;
          updateTree();
        }
      });
      resizeObserver.observe(container);
    }
  });
  
  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });
  
  function setupSVG() {
    // Clear any existing SVG
    d3.select(container).selectAll('svg').remove();
    
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#0f172a')
      .style('border-radius', '0.5rem');
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        svg.select('g').attr('transform', event.transform);
      });
    
    svg.call(zoom as any);
    
    // Create main group for tree content
    svg.append('g').attr('class', 'tree-content');
  }
  
  function calculateFileActivity(events: Event[]): Map<string, number> {
    const activity = new Map<string, number>();
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    events
      .filter(e => e.timestamp * 1000 > fiveMinutesAgo && e.file_path)
      .forEach(event => {
        const path = event.file_path!;
        const weight = getEventWeight(event.event_type);
        activity.set(path, (activity.get(path) || 0) + weight);
      });
    
    return activity;
  }
  
  function getEventWeight(eventType: string): number {
    const weights: Record<string, number> = {
      'file_created': 5,
      'file_modified': 3,
      'file_deleted': 4,
      'file_renamed': 2,
      'git_commit': 1,
      'build_started': 1,
      'build_completed': 1,
      'build_failed': 2
    };
    return weights[eventType] || 1;
  }
  
  function getFileTypeColor(path: string, isDirectory: boolean): string {
    if (isDirectory) return '#3b82f6'; // Blue for directories
    
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const colors: Record<string, string> = {
      'rs': '#dea584',
      'js': '#f1e05a',
      'ts': '#3178c6',
      'py': '#3572a5',
      'java': '#b07219',
      'cpp': '#f34b7d',
      'c': '#555555',
      'go': '#00add8',
      'rb': '#701516',
      'php': '#4f5d95',
      'css': '#563d7c',
      'html': '#e34c26',
      'json': '#6b7280',
      'md': '#083fa1',
      'toml': '#6b7280',
      'yaml': '#6b7280',
      'yml': '#6b7280'
    };
    return colors[ext] || '#9ca3af';
  }
  
  function getActivityIntensity(path: string): number {
    const activity = fileActivity.get(path) || 0;
    const maxActivity = Math.max(...Array.from(fileActivity.values()));
    return maxActivity > 0 ? activity / maxActivity : 0;
  }
  
  function updateTree() {
    if (!svg || !fileStructure) return;
    
    const margin = { top: 20, right: 20, bottom: 20, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create hierarchy
    const root = d3.hierarchy(fileStructure);
    
    // Create tree layout
    const treeLayout = d3.tree<FileNode>()
      .size([innerHeight, innerWidth])
      .separation((a, b) => a.parent === b.parent ? 1 : 1.5);
    
    treeLayout(root);
    
    const g = svg.select('g.tree-content');
    g.selectAll('*').remove();
    
    // Position the tree
    const treeGroup = g.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Links
    const link = treeGroup.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      )
      .style('fill', 'none')
      .style('stroke', '#334155')
      .style('stroke-width', 1.5)
      .style('stroke-opacity', 0.6);
    
    // Nodes
    const node = treeGroup.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y}, ${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        handleNodeClick(d);
      })
      .on('mouseover', (event, d) => {
        showTooltip(event, d);
      })
      .on('mouseout', () => {
        hideTooltip();
      });
    
    // Node circles
    node.append('circle')
      .attr('r', d => {
        const baseRadius = d.data.type === 'directory' ? 6 : 4;
        const activityBonus = getActivityIntensity(d.data.path) * 3;
        return baseRadius + activityBonus;
      })
      .style('fill', d => {
        const baseColor = getFileTypeColor(d.data.path, d.data.type === 'directory');
        const intensity = getActivityIntensity(d.data.path);
        
        if (intensity > 0) {
          // Add glow effect for active files
          const glowColor = d3.color(baseColor)?.brighter(intensity) || baseColor;
          return glowColor.toString();
        }
        
        return baseColor;
      })
      .style('stroke', '#0f172a')
      .style('stroke-width', 1.5)
      .style('filter', d => {
        const intensity = getActivityIntensity(d.data.path);
        return intensity > 0.5 ? 'drop-shadow(0 0 6px currentColor)' : 'none';
      });
    
    // Node labels
    node.append('text')
      .attr('dx', d => d.children ? -10 : 10)
      .attr('dy', 4)
      .style('text-anchor', d => d.children ? 'end' : 'start')
      .style('fill', '#f1f5f9')
      .style('font-size', '11px')
      .style('font-family', 'Inter, system-ui, sans-serif')
      .text(d => d.data.name)
      .each(function(d) {
        // Truncate long file names
        const text = d3.select(this);
        const maxLength = 15;
        if (d.data.name.length > maxLength) {
          text.text(d.data.name.substring(0, maxLength) + '...');
        }
      });
    
    // Activity indicators for recently modified files
    node.filter(d => getActivityIntensity(d.data.path) > 0)
      .append('circle')
      .attr('r', 2)
      .attr('cx', 10)
      .attr('cy', -6)
      .style('fill', '#10b981')
      .style('opacity', d => getActivityIntensity(d.data.path))
      .append('title')
      .text('Recently active');
  }
  
  function handleNodeClick(d: d3.HierarchyNode<FileNode>) {
    // Dispatch custom event for parent to handle
    const detail = { 
      node: d.data,
      path: d.data.path,
      type: d.data.type
    };
    
    const event = new CustomEvent('nodeClick', { detail });
    container.dispatchEvent(event);
    
    // Toggle collapsed state for directories
    if (d.data.type === 'directory' && d.children) {
      // This would require state management for collapsed nodes
      console.log('Toggle directory:', d.data.name);
    }
  }
  
  function showTooltip(event: MouseEvent, d: d3.HierarchyNode<FileNode>) {
    const activity = fileActivity.get(d.data.path) || 0;
    const tooltipContent = `
      <div class="tooltip-content">
        <div class="font-medium">${d.data.name}</div>
        <div class="text-sm text-dashboard-text-secondary">${d.data.path}</div>
        ${d.data.size ? `<div class="text-xs">Size: ${formatBytes(d.data.size)}</div>` : ''}
        ${activity > 0 ? `<div class="text-xs text-green-400">Activity: ${activity}</div>` : ''}
        ${d.data.last_modified ? `<div class="text-xs">Modified: ${new Date(d.data.last_modified * 1000).toLocaleString()}</div>` : ''}
      </div>
    `;
    
    // Create tooltip (simplified version - in a real app you'd use a proper tooltip library)
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tree-tooltip')
      .style('position', 'absolute')
      .style('background', '#1e293b')
      .style('border', '1px solid #334155')
      .style('border-radius', '6px')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('color', '#f1f5f9')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .html(tooltipContent);
    
    tooltip
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }
  
  function hideTooltip() {
    d3.selectAll('.tree-tooltip').remove();
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  // Stats calculation
  $: totalFiles = countNodes(fileStructure, 'file');
  $: totalDirectories = countNodes(fileStructure, 'directory');
  $: activeFiles = Array.from(fileActivity.keys()).length;
  
  function countNodes(node: FileNode, type: 'file' | 'directory'): number {
    let count = node.type === type ? 1 : 0;
    if (node.children) {
      count += node.children.reduce((sum, child) => sum + countNodes(child, type), 0);
    }
    return count;
  }
</script>

<div class="file-tree">
  <div class="tree-header">
    <h3 class="font-medium text-dashboard-text-primary">
      Project Structure
    </h3>
    <div class="tree-stats">
      <div class="stat">
        <span class="stat-value">{totalFiles}</span>
        <span class="stat-label">Files</span>
      </div>
      <div class="stat">
        <span class="stat-value">{totalDirectories}</span>
        <span class="stat-label">Dirs</span>
      </div>
      <div class="stat">
        <span class="stat-value">{activeFiles}</span>
        <span class="stat-label">Active</span>
      </div>
    </div>
  </div>
  
  <div class="tree-container">
    <div 
      bind:this={container} 
      class="tree-content"
      on:nodeClick
      style="width: {width}px; height: {height}px"
    />
    
    {#if !fileStructure || !fileStructure.children?.length}
      <div class="tree-empty">
        <div class="text-dashboard-text-secondary">
          No file structure data available
        </div>
      </div>
    {/if}
  </div>
  
  <div class="tree-legend">
    <div class="legend-title text-xs text-dashboard-text-secondary mb-2">
      File Types
    </div>
    <div class="legend-items">
      <div class="legend-item">
        <div class="legend-color" style="background-color: #3b82f6"></div>
        <span>Directory</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background-color: #dea584"></div>
        <span>Rust</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background-color: #3178c6"></div>
        <span>TypeScript</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background-color: #f1e05a"></div>
        <span>JavaScript</span>
      </div>
      <div class="legend-item">
        <div class="legend-color glow" style="background-color: #10b981"></div>
        <span>Recently Active</span>
      </div>
    </div>
  </div>
</div>

<style>
  .file-tree {
    @apply bg-dashboard-bg-secondary rounded-lg border border-dashboard-bg-tertiary;
    @apply flex flex-col h-full;
  }
  
  .tree-header {
    @apply p-4 border-b border-dashboard-bg-tertiary;
    @apply flex justify-between items-center;
  }
  
  .tree-stats {
    @apply flex gap-4;
  }
  
  .stat {
    @apply text-center;
  }
  
  .stat-value {
    @apply block text-sm font-semibold text-dashboard-text-primary;
  }
  
  .stat-label {
    @apply text-xs text-dashboard-text-secondary;
  }
  
  .tree-container {
    @apply flex-1 relative overflow-hidden;
  }
  
  .tree-content {
    @apply w-full h-full overflow-auto;
  }
  
  .tree-empty {
    @apply absolute inset-0 flex items-center justify-center;
    @apply bg-dashboard-bg-primary bg-opacity-50;
  }
  
  .tree-legend {
    @apply p-3 border-t border-dashboard-bg-tertiary;
  }
  
  .legend-items {
    @apply flex flex-wrap gap-3;
  }
  
  .legend-item {
    @apply flex items-center gap-1;
  }
  
  .legend-color {
    @apply w-3 h-3 rounded-sm;
  }
  
  .legend-color.glow {
    @apply shadow-sm;
    box-shadow: 0 0 8px currentColor;
  }
  
  .legend-item span {
    @apply text-xs text-dashboard-text-secondary;
  }
  
  /* Custom scrollbar for tree container */
  .tree-content::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .tree-content::-webkit-scrollbar-track {
    @apply bg-dashboard-bg-primary;
  }
  
  .tree-content::-webkit-scrollbar-thumb {
    @apply bg-dashboard-bg-tertiary rounded;
  }
  
  .tree-content::-webkit-scrollbar-thumb:hover {
    @apply bg-dashboard-text-secondary;
  }
</style>