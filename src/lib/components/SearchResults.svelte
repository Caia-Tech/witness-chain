<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SearchResult } from '../search/SearchEngine';

  export let results: SearchResult[] = [];
  export let isSearching = false;
  export let query = '';
  export let totalResults = 0;
  export let searchTime = 0;

  const dispatch = createEventDispatcher<{
    resultClick: { result: SearchResult };
    loadMore: void;
    export: { format: string };
  }>();

  let selectedResultId: string | null = null;
  let viewMode: 'list' | 'grid' = 'list';

  function handleResultClick(result: SearchResult) {
    selectedResultId = result.id;
    dispatch('resultClick', { result });
  }

  function getResultIcon(type: SearchResult['type']): string {
    switch (type) {
      case 'file': return '📄';
      case 'symbol': return '🔤';
      case 'function': return '⚡';
      case 'class': return '📦';
      case 'import': return '📥';
      case 'export': return '📤';
      case 'content': return '📝';
      default: return '📄';
    }
  }

  function getLanguageColor(language?: string): string {
    switch (language) {
      case 'typescript': return '#3178c6';
      case 'javascript': return '#f7df1e';
      case 'rust': return '#ce422b';
      case 'svelte': return '#ff3e00';
      default: return '#64748b';
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  function highlightText(text: string, highlights: SearchResult['highlights']): string {
    if (!highlights || highlights.length === 0) return escapeHtml(text);
    
    // Sort highlights by start position
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    
    let result = '';
    let lastEnd = 0;
    
    for (const highlight of sorted) {
      // Add text before highlight
      result += escapeHtml(text.substring(lastEnd, highlight.start));
      // Add highlighted text
      result += `<mark>${escapeHtml(highlight.value)}</mark>`;
      lastEnd = highlight.end;
    }
    
    // Add remaining text
    result += escapeHtml(text.substring(lastEnd));
    
    return result;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPath(path: string): string {
    const parts = path.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return path;
  }

  function exportResults(format: string) {
    dispatch('export', { format });
  }
</script>

<div class="search-results-container">
  {#if query}
    <div class="search-header">
      <div class="search-info">
        {#if isSearching}
          <span class="searching-text">Searching for "{query}"...</span>
        {:else if results.length > 0}
          <span class="results-count">
            Found {totalResults} results for "{query}"
            {#if searchTime > 0}
              <span class="search-time">({searchTime}ms)</span>
            {/if}
          </span>
        {:else}
          <span class="no-results">No results found for "{query}"</span>
        {/if}
      </div>

      {#if results.length > 0}
        <div class="results-actions">
          <button 
            class="view-toggle"
            on:click={() => viewMode = viewMode === 'list' ? 'grid' : 'list'}
            title="Toggle view mode"
          >
            {viewMode === 'list' ? '⊞' : '☰'}
          </button>
          
          <div class="export-menu">
            <button class="export-button" title="Export results">
              📥 Export
            </button>
            <div class="export-dropdown">
              <button on:click={() => exportResults('json')}>JSON</button>
              <button on:click={() => exportResults('csv')}>CSV</button>
              <button on:click={() => exportResults('markdown')}>Markdown</button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if isSearching}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Searching across your codebase...</p>
    </div>
  {:else if results.length > 0}
    <div class="results-list" class:grid-view={viewMode === 'grid'}>
      {#each results as result (result.id)}
        <div 
          class="result-item"
          class:selected={selectedResultId === result.id}
          on:click={() => handleResultClick(result)}
          role="button"
          tabindex="0"
          on:keypress={(e) => e.key === 'Enter' && handleResultClick(result)}
        >
          <div class="result-header">
            <span class="result-icon">{getResultIcon(result.type)}</span>
            <span class="result-path" title={result.filePath}>
              {formatPath(result.filePath)}
            </span>
            <span 
              class="result-language"
              style="color: {getLanguageColor(result.metadata.language)}"
            >
              {result.metadata.language || 'unknown'}
            </span>
            <span class="result-score" title="Relevance score">
              {result.score.toFixed(1)}
            </span>
          </div>

          {#if result.lineNumber}
            <div class="result-location">
              Line {result.lineNumber}
              {#if result.columnNumber}
                , Column {result.columnNumber}
              {/if}
            </div>
          {/if}

          <div class="result-preview">
            {@html highlightText(result.preview, result.highlights)}
          </div>

          <div class="result-metadata">
            {#if result.metadata.size}
              <span class="meta-item">
                📊 {formatFileSize(result.metadata.size)}
              </span>
            {/if}
            {#if result.metadata.complexity}
              <span class="meta-item">
                🧮 Complexity: {result.metadata.complexity}
              </span>
            {/if}
            {#if result.metadata.lastModified}
              <span class="meta-item">
                📅 {new Date(result.metadata.lastModified).toLocaleDateString()}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    {#if results.length < totalResults}
      <div class="load-more">
        <button class="load-more-button" on:click={() => dispatch('loadMore')}>
          Load More Results ({totalResults - results.length} remaining)
        </button>
      </div>
    {/if}
  {:else if query && !isSearching}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No Results Found</h3>
      <p>Try adjusting your search query or filters</p>
      <div class="search-tips">
        <h4>Search Tips:</h4>
        <ul>
          <li>Use <code>function:</code> to search for functions</li>
          <li>Use <code>class:</code> to search for classes</li>
          <li>Use <code>import:</code> to search for imports</li>
          <li>Use quotes for exact phrases: <code>"exact match"</code></li>
          <li>Use <code>+</code> to require terms: <code>+required</code></li>
          <li>Use <code>-</code> to exclude terms: <code>-excluded</code></li>
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  .search-results-container {
    background-color: #0f172a;
    color: #f1f5f9;
    min-height: 400px;
  }

  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .search-info {
    font-size: 0.875rem;
    color: #cbd5e1;
  }

  .searching-text {
    color: #3b82f6;
  }

  .results-count {
    color: #10b981;
    font-weight: 500;
  }

  .search-time {
    color: #9ca3af;
    margin-left: 0.5rem;
  }

  .no-results {
    color: #ef4444;
  }

  .results-actions {
    display: flex;
    gap: 0.5rem;
  }

  .view-toggle {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .view-toggle:hover {
    background-color: #4b5563;
  }

  .export-menu {
    position: relative;
  }

  .export-button {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .export-button:hover {
    background-color: #4b5563;
  }

  .export-dropdown {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.25rem;
    margin-top: 0.25rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }

  .export-menu:hover .export-dropdown {
    display: block;
  }

  .export-dropdown button {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    color: #f1f5f9;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .export-dropdown button:hover {
    background-color: #374151;
  }

  .results-list {
    padding: 1rem;
  }

  .results-list.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
  }

  .result-item {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .grid-view .result-item {
    margin-bottom: 0;
  }

  .result-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
  }

  .result-item.selected {
    border-color: #3b82f6;
    background-color: #1e3a5f;
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .result-icon {
    font-size: 1.1rem;
  }

  .result-path {
    flex: 1;
    font-family: monospace;
    color: #3b82f6;
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-language {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    background-color: #374151;
    border-radius: 0.25rem;
  }

  .result-score {
    background-color: #10b981;
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .result-location {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.5rem;
    font-family: monospace;
  }

  .result-preview {
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.4;
    color: #cbd5e1;
    margin-bottom: 0.5rem;
    max-height: 100px;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .result-preview :global(mark) {
    background-color: #fbbf24;
    color: #1e293b;
    padding: 0.125rem 0.25rem;
    border-radius: 0.125rem;
  }

  .result-metadata {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    color: #9ca3af;
  }

  .loading-spinner {
    width: 3rem;
    height: 3rem;
    border: 3px solid #334155;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 2rem;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #f1f5f9;
    font-size: 1.5rem;
  }

  .empty-state p {
    margin: 0 0 2rem 0;
  }

  .search-tips {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1.5rem;
    text-align: left;
    max-width: 500px;
  }

  .search-tips h4 {
    margin: 0 0 1rem 0;
    color: #f1f5f9;
  }

  .search-tips ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .search-tips li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .search-tips code {
    background-color: #374151;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875rem;
    color: #3b82f6;
  }

  .load-more {
    padding: 2rem;
    text-align: center;
  }

  .load-more-button {
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .load-more-button:hover {
    background-color: #2563eb;
  }

  @media (max-width: 768px) {
    .search-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .results-list.grid-view {
      grid-template-columns: 1fr;
    }

    .result-header {
      flex-wrap: wrap;
    }

    .search-tips {
      max-width: 100%;
    }
  }
</style>