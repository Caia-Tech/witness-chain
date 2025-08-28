<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
  import { scaleOrdinal } from 'd3-scale';
  import { schemeCategory10 } from 'd3-scale-chromatic';
  import { zoom } from 'd3-zoom';
  import { createEventDispatcher } from 'svelte';
  import type { DependencyGraph as GraphData } from '../analytics/CodeAnalytics';

  export let graphData: GraphData = { nodes: [], edges: [], clusters: [] };
  export let width = 800;
  export let height = 600;
  export let showClusters = true;
  export let showLabels = true;
  export let interactive = true;

  const dispatch = createEventDispatcher<{
    nodeClick: { node: any; event: MouseEvent };
    nodeHover: { node: any; event: MouseEvent };
    edgeClick: { edge: any; event: MouseEvent };
  }>();

  let svgElement: SVGElement;
  let simulation: any;
  
  const colorScale = scaleOrdinal(schemeCategory10);
  
  $: if (svgElement && graphData.nodes.length > 0) {
    updateGraph();
  }

  interface Node {
    id: string;
    label: string;
    type: string;
    language: string;
    size: number;
    complexity: number;
    centrality: number;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
  }

  interface Edge {
    source: string | Node;
    target: string | Node;
    type: string;
    weight: number;
  }

  function getNodeRadius(node: Node): number {
    // Base radius on size and complexity
    const baseSize = Math.sqrt(node.size / 100) + 3;
    const complexityBonus = Math.sqrt(node.complexity) / 2;
    return Math.min(Math.max(baseSize + complexityBonus, 4), 20);
  }

  function getNodeColor(node: Node): string {
    // Color by language/type
    switch (node.language) {
      case 'rust': return '#ce422b';
      case 'typescript': return '#3178c6';
      case 'javascript': return '#f7df1e';
      case 'svelte': return '#ff3e00';
      case 'json': return '#000000';
      default: return '#64748b';
    }
  }

  function getEdgeColor(edge: Edge): string {
    switch (edge.type) {
      case 'import': return '#3b82f6';
      case 'export': return '#10b981';
      case 'dynamic_import': return '#f59e0b';
      case 'require': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  function getEdgeWidth(edge: Edge): number {
    return Math.min(Math.max(edge.weight / 2, 1), 5);
  }

  function updateGraph() {
    if (!svgElement || graphData.nodes.length === 0) return;

    const svg = select(svgElement);
    svg.selectAll("*").remove();

    // Create working copies of data
    const nodes: Node[] = graphData.nodes.map(d => ({ ...d }));
    const edges: Edge[] = graphData.edges.map(d => ({ ...d }));

    // Create main group for zooming/panning
    const g = svg.append('g');

    // Add zoom behavior if interactive
    if (interactive) {
      const zoomBehavior = zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoomBehavior as any);
    }

    // Create cluster backgrounds if enabled
    if (showClusters && graphData.clusters.length > 0) {
      const clusterGroup = g.append('g').attr('class', 'clusters');
      
      // This would need more complex clustering visualization
      // For now, we'll skip cluster backgrounds
    }

    // Create edge elements
    const link = g.append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', d => getEdgeColor(d))
      .attr('stroke-width', d => getEdgeWidth(d))
      .attr('stroke-opacity', 0.6)
      .style('cursor', interactive ? 'pointer' : 'default')
      .on('click', interactive ? (event, d) => {
        event.stopPropagation();
        dispatch('edgeClick', { edge: d, event });
      } : null);

    // Add edge labels for important connections
    const edgeLabels = g.append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(edges.filter(d => d.weight > 2))
      .enter()
      .append('text')
      .attr('font-size', 10)
      .attr('fill', '#9ca3af')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .text(d => d.weight > 5 ? `×${d.weight}` : '');

    // Create node elements
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', interactive ? 'pointer' : 'default')
      .on('click', interactive ? (event, d) => {
        event.stopPropagation();
        dispatch('nodeClick', { node: d, event });
      } : null)
      .on('mouseover', interactive ? (event, d) => {
        // Highlight connected nodes and edges
        link.attr('stroke-opacity', edge => 
          (edge.source as Node).id === d.id || (edge.target as Node).id === d.id ? 1 : 0.2
        );
        node.attr('opacity', n => 
          n.id === d.id || isConnected(d, n as Node, edges) ? 1 : 0.3
        );
        dispatch('nodeHover', { node: d, event });
      } : null)
      .on('mouseout', interactive ? () => {
        link.attr('stroke-opacity', 0.6);
        node.attr('opacity', 1);
      } : null);

    // Add node labels if enabled
    if (showLabels) {
      const labels = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('font-size', 10)
        .attr('font-family', 'monospace')
        .attr('fill', '#f1f5f9')
        .attr('text-anchor', 'middle')
        .attr('dy', d => getNodeRadius(d) + 15)
        .style('pointer-events', 'none')
        .text(d => d.label.length > 15 ? d.label.substring(0, 12) + '...' : d.label);
    }

    // Add tooltips
    node.append('title')
      .text(d => `${d.label}\nLanguage: ${d.language}\nComplexity: ${d.complexity}\nSize: ${d.size} bytes`);

    link.append('title')
      .text(d => `${d.type} (×${d.weight})`);

    // Create force simulation
    simulation = forceSimulation(nodes)
      .force('link', forceLink(edges).id((d: any) => d.id).distance(80))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide().radius(d => getNodeRadius(d as Node) + 5));

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      edgeLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      if (showLabels) {
        g.selectAll('.labels text')
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      }
    });

    // Enable dragging if interactive
    if (interactive) {
      node.call(drag(simulation) as any);
    }
  }

  function isConnected(nodeA: Node, nodeB: Node, edges: Edge[]): boolean {
    return edges.some(edge => 
      ((edge.source as Node).id === nodeA.id && (edge.target as Node).id === nodeB.id) ||
      ((edge.source as Node).id === nodeB.id && (edge.target as Node).id === nodeA.id)
    );
  }

  function drag(simulation: any) {
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return select as any()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  function centerGraph() {
    if (simulation) {
      simulation.force('center', forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    }
  }

  function resetZoom() {
    if (svgElement && interactive) {
      const svg = select(svgElement);
      svg.transition()
        .duration(750)
        .call(zoom().transform as any, { k: 1, x: 0, y: 0 });
    }
  }

  onMount(() => {
    if (graphData.nodes.length > 0) {
      updateGraph();
    }

    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  });
</script>

<div class="dependency-graph-container">
  <div class="graph-header">
    <h3>Dependency Graph</h3>
    <div class="graph-controls">
      {#if interactive}
        <button class="control-btn" on:click={resetZoom} title="Reset Zoom">
          🔍 Reset
        </button>
        <button class="control-btn" on:click={centerGraph} title="Center Graph">
          🎯 Center
        </button>
      {/if}
      <label>
        <input type="checkbox" bind:checked={showLabels} />
        Labels
      </label>
      <label>
        <input type="checkbox" bind:checked={showClusters} />
        Clusters
      </label>
    </div>
  </div>

  <div class="graph-content">
    <svg
      bind:this={svgElement}
      {width}
      {height}
      viewBox="0 0 {width} {height}"
    ></svg>
  </div>

  <div class="graph-legend">
    <div class="legend-section">
      <h4>Languages</h4>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color" style="background-color: #ce422b;"></div>
          <span>Rust</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #3178c6;"></div>
          <span>TypeScript</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #f7df1e;"></div>
          <span>JavaScript</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #ff3e00;"></div>
          <span>Svelte</span>
        </div>
      </div>
    </div>

    <div class="legend-section">
      <h4>Connections</h4>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-line" style="background-color: #3b82f6;"></div>
          <span>Import</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background-color: #10b981;"></div>
          <span>Export</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background-color: #f59e0b;"></div>
          <span>Dynamic</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background-color: #8b5cf6;"></div>
          <span>Require</span>
        </div>
      </div>
    </div>
  </div>

  {#if graphData.nodes.length === 0}
    <div class="no-data">
      <div class="no-data-icon">🕸️</div>
      <h4>No Dependency Data Available</h4>
      <p>Dependency analysis will appear here once files are processed.</p>
    </div>
  {/if}
</div>

<style>
  .dependency-graph-container {
    background-color: #1e293b;
    border-radius: 0.5rem;
    border: 1px solid #334155;
    overflow: hidden;
  }

  .graph-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #0f172a;
    border-bottom: 1px solid #334155;
  }

  .graph-header h3 {
    margin: 0;
    color: #f1f5f9;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .graph-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .control-btn {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .control-btn:hover {
    background-color: #4b5563;
  }

  .graph-controls label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #cbd5e1;
    cursor: pointer;
  }

  .graph-controls input[type="checkbox"] {
    accent-color: #3b82f6;
  }

  .graph-content {
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  .graph-legend {
    display: flex;
    justify-content: space-around;
    padding: 1rem;
    background-color: #0f172a;
    border-top: 1px solid #334155;
    gap: 2rem;
  }

  .legend-section h4 {
    margin: 0 0 0.5rem 0;
    color: #f1f5f9;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #cbd5e1;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid #374151;
  }

  .legend-line {
    width: 20px;
    height: 3px;
    border-radius: 2px;
  }

  .no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: #6b7280;
  }

  .no-data-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-data h4 {
    margin: 0 0 0.5rem 0;
    color: #9ca3af;
    font-size: 1.1rem;
  }

  .no-data p {
    margin: 0;
    font-size: 0.875rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    .graph-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .graph-controls {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .graph-legend {
      flex-direction: column;
      gap: 1rem;
    }

    .legend-items {
      justify-content: center;
    }
  }
</style>