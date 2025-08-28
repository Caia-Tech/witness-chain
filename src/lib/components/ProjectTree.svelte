<!--
  Interactive Project Structure Tree Component
  Real-time file tree visualization with expand/collapse and filtering
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { FileAnalysis, Language } from '../monitoring/FileAnalyzer.js';
  import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor.js';
  import TreeNode from './TreeNode.svelte';

  export let events: MonitorEvent[] = [];
  export let searchTerm: string = '';
  export let showHidden: boolean = false;

  const dispatch = createEventDispatcher();

  export interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    language?: Language;
    size?: number;
    children: TreeNode[];
    expanded: boolean;
    analysis?: FileAnalysis;
    lastModified?: Date;
    isNew: boolean;
    isModified: boolean;
    isDeleted: boolean;
  }

  let projectTree: TreeNode = {
    name: 'Project Root',
    path: '',
    type: 'directory',
    children: [],
    expanded: true,
    isNew: false,
    isModified: false,
    isDeleted: false
  };

  let filteredTree: TreeNode = projectTree;
  let selectedNode: TreeNode | null = null;
  let contextMenuNode: TreeNode | null = null;
  let contextMenuPosition = { x: 0, y: 0 };

  // Language to icon mapping
  const languageIcons: Record<string, string> = {
    rust: '🦀',
    typescript: '📘',
    javascript: '📄',
    svelte: '🎯',
    json: '📋',
    toml: '⚙️',
    markdown: '📝',
    html: '🌐',
    css: '🎨',
    unknown: '📄'
  };

  // Build tree structure from events
  function buildTreeFromEvents(events: MonitorEvent[]): TreeNode {
    const root: TreeNode = {
      name: 'Project Root',
      path: '',
      type: 'directory',
      children: [],
      expanded: true,
      isNew: false,
      isModified: false,
      isDeleted: false
    };

    const pathMap = new Map<string, TreeNode>();
    pathMap.set('', root);

    // Process events to build tree structure
    events.forEach(event => {
      if (!event.relativePath) return;

      const pathParts = event.relativePath.split('/').filter(part => part.length > 0);
      let currentPath = '';
      let currentNode = root;

      // Build directory structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        let childNode = pathMap.get(currentPath);
        if (!childNode) {
          childNode = {
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
            expanded: false,
            isNew: false,
            isModified: false,
            isDeleted: false
          };
          currentNode.children.push(childNode);
          pathMap.set(currentPath, childNode);
        }
        currentNode = childNode;
      }

      // Add file node
      if (pathParts.length > 0) {
        const fileName = pathParts[pathParts.length - 1];
        const filePath = event.relativePath;
        
        let fileNode = pathMap.get(filePath);
        if (!fileNode) {
          fileNode = {
            name: fileName,
            path: filePath,
            type: 'file',
            language: event.analysis?.language,
            size: event.analysis?.size || event.size,
            children: [],
            expanded: false,
            analysis: event.analysis,
            lastModified: new Date(event.timestamp),
            isNew: event.type === 'file_created',
            isModified: event.type === 'file_modified',
            isDeleted: event.type === 'file_deleted'
          };
          
          if (!event.type.includes('deleted')) {
            currentNode.children.push(fileNode);
            pathMap.set(filePath, fileNode);
          }
        } else {
          // Update existing node
          fileNode.isModified = event.type === 'file_modified';
          fileNode.isDeleted = event.type === 'file_deleted';
          fileNode.lastModified = new Date(event.timestamp);
          fileNode.analysis = event.analysis || fileNode.analysis;
        }
      }
    });

    // Sort children: directories first, then files alphabetically
    function sortChildren(node: TreeNode) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }

    sortChildren(root);
    return root;
  }

  // Filter tree based on search term and visibility options
  function filterTree(node: TreeNode, searchTerm: string): TreeNode | null {
    if (!showHidden && node.name.startsWith('.')) {
      return null;
    }

    const matchesSearch = !searchTerm || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.path.toLowerCase().includes(searchTerm.toLowerCase());

    const filteredChildren = node.children
      .map(child => filterTree(child, searchTerm))
      .filter((child): child is TreeNode => child !== null);

    if (matchesSearch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
        expanded: searchTerm ? true : node.expanded
      };
    }

    return null;
  }

  // Toggle node expansion
  function toggleNode(node: TreeNode, event: Event) {
    event.stopPropagation();
    if (node.type === 'directory') {
      node.expanded = !node.expanded;
      projectTree = { ...projectTree };
      updateFilteredTree();
    }
  }

  // Select node
  function selectNode(node: TreeNode, event: Event) {
    event.stopPropagation();
    selectedNode = node;
    dispatch('nodeSelected', {
      node,
      analysis: node.analysis
    });
  }

  // Context menu handling
  function showContextMenu(node: TreeNode, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    contextMenuNode = node;
    contextMenuPosition = { x: event.clientX, y: event.clientY };
    
    // Hide context menu after a delay if not interacted with
    setTimeout(() => {
      contextMenuNode = null;
    }, 3000);
  }

  function hideContextMenu() {
    contextMenuNode = null;
  }

  // Context menu actions
  function viewFile(node: TreeNode) {
    dispatch('viewFile', { node });
    hideContextMenu();
  }

  function analyzeFile(node: TreeNode) {
    dispatch('analyzeFile', { node });
    hideContextMenu();
  }

  function copyPath(node: TreeNode) {
    navigator.clipboard?.writeText(node.path);
    hideContextMenu();
  }

  // Update filtered tree when search changes
  function updateFilteredTree() {
    const filtered = filterTree(projectTree, searchTerm);
    filteredTree = filtered || projectTree;
  }

  // Format file size
  function formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(size < 10 ? 1 : 0)}${units[unitIndex]}`;
  }

  // Get language icon
  function getLanguageIcon(language: Language | undefined): string {
    return languageIcons[language || 'unknown'] || languageIcons.unknown;
  }

  // Reactive updates
  $: {
    if (events.length > 0) {
      projectTree = buildTreeFromEvents(events);
      updateFilteredTree();
    }
  }

  $: {
    updateFilteredTree();
  }

  onMount(() => {
    // Close context menu on outside click
    function handleOutsideClick() {
      hideContextMenu();
    }
    
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  });
</script>

<div class="project-tree" on:click={hideContextMenu}>
  <!-- Search and Controls -->
  <div class="tree-controls">
    <div class="search-box">
      <input
        type="text"
        placeholder="Search files and folders..."
        bind:value={searchTerm}
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>
    
    <div class="control-options">
      <label class="checkbox-label">
        <input
          type="checkbox"
          bind:checked={showHidden}
        />
        <span class="checkbox-text">Show hidden files</span>
      </label>
    </div>
  </div>

  <!-- Tree Structure -->
  <div class="tree-content">
    {#if filteredTree}
      <TreeNode 
        node={filteredTree}
        level={0}
        {selectedNode}
        on:toggle={(e) => toggleNode(e.detail.node, e.detail.event)}
        on:select={(e) => selectNode(e.detail.node, e.detail.event)}
        on:contextmenu={(e) => showContextMenu(e.detail.node, e.detail.event)}
      />
    {:else}
      <div class="empty-tree">
        <p>No files found matching your search.</p>
      </div>
    {/if}
  </div>

  <!-- Context Menu -->
  {#if contextMenuNode}
    <div 
      class="context-menu"
      style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
      on:click|stopPropagation
    >
      <div class="context-menu-item" on:click={() => viewFile(contextMenuNode)}>
        📄 View File
      </div>
      {#if contextMenuNode.type === 'file'}
        <div class="context-menu-item" on:click={() => analyzeFile(contextMenuNode)}>
          🔍 Analyze
        </div>
      {/if}
      <div class="context-menu-item" on:click={() => copyPath(contextMenuNode)}>
        📋 Copy Path
      </div>
    </div>
  {/if}
</div>


<style>
  .project-tree {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #1e293b;
    border-radius: 0.5rem;
    border: 1px solid #334155;
    overflow: hidden;
  }

  .tree-controls {
    padding: 1rem;
    border-bottom: 1px solid #334155;
    background-color: #0f172a;
  }

  .search-box {
    position: relative;
    margin-bottom: 0.75rem;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    color: #f1f5f9;
    font-size: 0.875rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .search-input::placeholder {
    color: #9ca3af;
  }

  .search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    font-size: 0.875rem;
    pointer-events: none;
  }

  .control-options {
    display: flex;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-text {
    color: #cbd5e1;
    font-size: 0.875rem;
  }

  .tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .tree-node {
    user-select: none;
  }

  .node-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .node-content:hover {
    background-color: #374151;
  }

  .node-content.selected,
  .tree-node.selected > .node-content {
    background-color: #3b82f6;
    color: #ffffff;
  }

  .expand-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0;
    color: inherit;
    transition: transform 0.15s ease;
  }

  .expand-button:hover {
    transform: scale(1.1);
  }

  .file-icon {
    font-size: 0.875rem;
    width: 1rem;
    text-align: center;
  }

  .node-name {
    flex: 1;
    font-size: 0.875rem;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    color: #e2e8f0;
    transition: color 0.15s ease;
  }

  .node-name.new {
    color: #10b981;
    font-weight: 500;
  }

  .node-name.modified {
    color: #f59e0b;
  }

  .file-size {
    font-size: 0.75rem;
    color: #9ca3af;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  }

  .status-badge {
    font-size: 0.6rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.new {
    background-color: #10b981;
    color: #ffffff;
  }

  .status-badge.modified {
    background-color: #f59e0b;
    color: #ffffff;
  }

  .children {
    border-left: 1px solid #4b5563;
    margin-left: 1rem;
  }

  .empty-tree {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #9ca3af;
    font-style: italic;
  }

  .context-menu {
    position: fixed;
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    z-index: 1000;
    min-width: 150px;
    padding: 0.25rem;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #e2e8f0;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease;
  }

  .context-menu-item:hover {
    background-color: #4b5563;
  }

  /* Scrollbar styling */
  .tree-content::-webkit-scrollbar {
    width: 6px;
  }

  .tree-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .tree-content::-webkit-scrollbar-thumb {
    background-color: #4b5563;
    border-radius: 3px;
  }

  .tree-content::-webkit-scrollbar-thumb:hover {
    background-color: #6b7280;
  }

  /* Animation for new/modified items */
  @keyframes highlight {
    0% { background-color: rgba(16, 185, 129, 0.2); }
    100% { background-color: transparent; }
  }

  .node-content:has(.node-name.new),
  .node-content:has(.node-name.modified) {
    animation: highlight 2s ease-out;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .tree-controls {
      padding: 0.75rem;
    }
    
    .node-content {
      padding: 0.5rem;
    }
    
    .file-size {
      display: none;
    }
  }
</style>