<!--
  Individual Tree Node Component
  Recursive component for rendering tree structure
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Language } from '../monitoring/FileAnalyzer.js';

  export let node: TreeNode;
  export let level: number = 0;
  export let selectedNode: TreeNode | null = null;

  const dispatch = createEventDispatcher();

  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    language?: Language;
    size?: number;
    children: TreeNode[];
    expanded: boolean;
    isNew: boolean;
    isModified: boolean;
    isDeleted: boolean;
  }

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

  function getLanguageIcon(language: Language | undefined): string {
    return languageIcons[language || 'unknown'] || languageIcons.unknown;
  }

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

  function handleToggle(event: Event) {
    event.stopPropagation();
    dispatch('toggle', { node, event });
  }

  function handleSelect(event: Event) {
    event.stopPropagation();
    dispatch('select', { node, event });
  }

  function handleContextMenu(event: MouseEvent) {
    dispatch('contextmenu', { node, event });
  }
</script>

<div class="tree-node" class:selected={node === selectedNode}>
  <div 
    class="node-content" 
    style="padding-left: {level * 20}px"
    on:click={handleSelect}
    on:contextmenu|preventDefault={handleContextMenu}
  >
    {#if node.type === 'directory'}
      <button 
        class="expand-button"
        on:click={handleToggle}
      >
        {node.expanded ? '📂' : '📁'}
      </button>
    {:else}
      <span class="file-icon">
        {getLanguageIcon(node.language)}
      </span>
    {/if}
    
    <span class="node-name" class:new={node.isNew} class:modified={node.isModified}>
      {node.name}
    </span>
    
    {#if node.type === 'file' && node.size}
      <span class="file-size">{formatFileSize(node.size)}</span>
    {/if}
    
    {#if node.isNew}
      <span class="status-badge new">NEW</span>
    {:else if node.isModified}
      <span class="status-badge modified">MOD</span>
    {/if}
  </div>
  
  {#if node.type === 'directory' && node.expanded && node.children.length > 0}
    <div class="children">
      {#each node.children as child}
        <svelte:self 
          node={child} 
          level={level + 1} 
          {selectedNode}
          on:toggle
          on:select
          on:contextmenu
        />
      {/each}
    </div>
  {/if}
</div>

<style>
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
    .node-content {
      padding: 0.5rem;
    }
    
    .file-size {
      display: none;
    }
  }
</style>