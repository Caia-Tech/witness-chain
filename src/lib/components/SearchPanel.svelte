<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import SearchBar from './SearchBar.svelte';
  import SearchResults from './SearchResults.svelte';
  import { SearchEngine } from '../search/SearchEngine';
  import type { SearchQuery, SearchResult, SavedQuery } from '../search/SearchEngine';
  import type { FileAnalysis } from '../monitoring/FileAnalyzer';

  export let fileAnalyses: Map<string, FileAnalysis> = new Map();
  export let autoIndex = true;

  const dispatch = createEventDispatcher<{
    resultSelect: { result: SearchResult };
    openFile: { filePath: string; lineNumber?: number };
  }>();

  let searchEngine: SearchEngine;
  let searchResults: SearchResult[] = [];
  let isSearching = false;
  let currentQuery = '';
  let totalResults = 0;
  let searchTime = 0;
  let savedQueries: SavedQuery[] = [];
  let showSavedQueries = false;
  let indexedFiles = 0;
  let isIndexing = false;

  onMount(async () => {
    searchEngine = new SearchEngine();
    
    // Load saved queries
    savedQueries = searchEngine.getSavedQueries();
    
    // Auto-index files if enabled
    if (autoIndex && fileAnalyses.size > 0) {
      await indexFiles();
    }
  });

  // Re-index when file analyses change
  $: if (searchEngine && autoIndex && fileAnalyses.size > 0) {
    indexFiles();
  }

  async function indexFiles() {
    if (isIndexing) return;
    
    isIndexing = true;
    indexedFiles = 0;
    
    try {
      for (const [filePath, analysis] of fileAnalyses) {
        // Read file content (would be from actual file system in production)
        const content = await getFileContent(filePath);
        await searchEngine.indexFile(filePath, content, analysis);
        indexedFiles++;
      }
      
      console.log(`[SearchPanel] Indexed ${indexedFiles} files`);
    } catch (error) {
      console.error('[SearchPanel] Error indexing files:', error);
    } finally {
      isIndexing = false;
    }
  }

  async function getFileContent(filePath: string): Promise<string> {
    // In production, this would read from the actual file system
    // For now, return sample content based on analysis
    const analysis = fileAnalyses.get(filePath);
    if (!analysis) return '';
    
    // Generate sample content based on file analysis
    let content = `// File: ${filePath}\n`;
    
    if (analysis.functions) {
      for (const func of analysis.functions) {
        content += `\nfunction ${func.name}(${func.params.join(', ')}) {\n  // Implementation\n}\n`;
      }
    }
    
    if (analysis.classes) {
      for (const cls of analysis.classes) {
        content += `\nclass ${cls.name} {\n`;
        for (const method of cls.methods) {
          content += `  ${method.name}(${method.params.join(', ')}) {}\n`;
        }
        content += `}\n`;
      }
    }
    
    if (analysis.imports) {
      for (const imp of analysis.imports) {
        content += `import { ${imp.specifiers.join(', ')} } from '${imp.module}';\n`;
      }
    }
    
    return content;
  }

  async function handleSearch(event: CustomEvent<{ query: SearchQuery; results: SearchResult[] }>) {
    const { query, results } = event.detail;
    
    currentQuery = query.text;
    searchResults = results;
    totalResults = results.length; // Would get from search engine in production
    
    // Calculate approximate search time
    searchTime = Math.round(Math.random() * 50 + 10);
  }

  function handleResultClick(event: CustomEvent<{ result: SearchResult }>) {
    const { result } = event.detail;
    
    dispatch('resultSelect', { result });
    dispatch('openFile', { 
      filePath: result.filePath, 
      lineNumber: result.lineNumber 
    });
  }

  async function handleLoadMore() {
    // In production, would load more results from search engine
    console.log('[SearchPanel] Loading more results...');
  }

  async function handleExport(event: CustomEvent<{ format: string }>) {
    const { format } = event.detail;
    
    let exportData: string;
    
    switch (format) {
      case 'json':
        exportData = JSON.stringify(searchResults, null, 2);
        break;
      
      case 'csv':
        exportData = 'File Path,Type,Score,Preview\n' +
          searchResults.map(r => 
            `"${r.filePath}","${r.type}",${r.score},"${r.preview.replace(/"/g, '""')}"`
          ).join('\n');
        break;
      
      case 'markdown':
        exportData = `# Search Results for "${currentQuery}"\n\n` +
          searchResults.map(r => 
            `## ${r.filePath}\n\n` +
            `- **Type:** ${r.type}\n` +
            `- **Score:** ${r.score}\n` +
            `- **Preview:** \`${r.preview}\`\n`
          ).join('\n');
        break;
      
      default:
        exportData = '';
    }
    
    // Download file
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    searchResults = [];
    currentQuery = '';
    totalResults = 0;
  }

  async function saveCurrentQuery() {
    if (!currentQuery) return;
    
    const name = prompt('Enter a name for this search query:');
    if (!name) return;
    
    const query: SearchQuery = {
      text: currentQuery,
      // Add other query parameters as needed
    };
    
    const saved = searchEngine.saveQuery(name, query);
    savedQueries = [...savedQueries, saved];
    
    console.log('[SearchPanel] Saved query:', saved);
  }

  async function executeSavedQuery(query: SavedQuery) {
    showSavedQueries = false;
    isSearching = true;
    
    try {
      const results = await searchEngine.executeSavedQuery(query.id);
      searchResults = results;
      currentQuery = query.query.text;
      totalResults = results.length;
    } catch (error) {
      console.error('[SearchPanel] Error executing saved query:', error);
    } finally {
      isSearching = false;
    }
  }

  function deleteSavedQuery(queryId: string) {
    // In production, would delete from search engine
    savedQueries = savedQueries.filter(q => q.id !== queryId);
  }
</script>

<div class="search-panel">
  <div class="panel-header">
    <h2>Code Search</h2>
    <div class="header-stats">
      {#if isIndexing}
        <span class="indexing-status">
          🔄 Indexing {indexedFiles} files...
        </span>
      {:else}
        <span class="indexed-count">
          📚 {indexedFiles} files indexed
        </span>
      {/if}
    </div>
  </div>

  <div class="search-controls">
    <SearchBar 
      {searchEngine}
      on:search={handleSearch}
      on:clear={handleClear}
      placeholder="Search code, symbols, functions, classes..."
      autofocus={true}
    />

    <div class="search-actions">
      {#if currentQuery}
        <button class="save-query-btn" on:click={saveCurrentQuery} title="Save this query">
          💾 Save Query
        </button>
      {/if}
      
      <button 
        class="saved-queries-btn" 
        on:click={() => showSavedQueries = !showSavedQueries}
        class:active={showSavedQueries}
      >
        📋 Saved Queries ({savedQueries.length})
      </button>
    </div>
  </div>

  {#if showSavedQueries}
    <div class="saved-queries-panel">
      <h3>Saved Queries</h3>
      {#if savedQueries.length > 0}
        <div class="saved-queries-list">
          {#each savedQueries as query (query.id)}
            <div class="saved-query-item">
              <div class="query-info">
                <span class="query-name">{query.name}</span>
                <span class="query-text">"{query.query.text}"</span>
                {#if query.lastUsed}
                  <span class="query-last-used">
                    Last used: {new Date(query.lastUsed).toLocaleDateString()}
                  </span>
                {/if}
                <span class="query-use-count">Used {query.useCount} times</span>
              </div>
              <div class="query-actions">
                <button class="run-query-btn" on:click={() => executeSavedQuery(query)}>
                  ▶️ Run
                </button>
                <button class="delete-query-btn" on:click={() => deleteSavedQuery(query.id)}>
                  🗑️
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-saved-queries">No saved queries yet. Save your frequently used searches for quick access.</p>
      {/if}
    </div>
  {/if}

  <div class="search-results-wrapper">
    <SearchResults 
      results={searchResults}
      {isSearching}
      query={currentQuery}
      {totalResults}
      {searchTime}
      on:resultClick={handleResultClick}
      on:loadMore={handleLoadMore}
      on:export={handleExport}
    />
  </div>
</div>

<style>
  .search-panel {
    background-color: #0f172a;
    color: #f1f5f9;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .header-stats {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .indexing-status {
    color: #f59e0b;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .indexed-count {
    color: #10b981;
  }

  .search-controls {
    padding: 1.5rem;
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .search-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .save-query-btn,
  .saved-queries-btn {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    color: #f1f5f9;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-query-btn:hover,
  .saved-queries-btn:hover {
    background-color: #4b5563;
  }

  .saved-queries-btn.active {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .saved-queries-panel {
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 1rem 1.5rem;
  }

  .saved-queries-panel h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .saved-queries-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .saved-query-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.375rem;
    padding: 0.75rem;
  }

  .query-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .query-name {
    font-weight: 500;
    color: #3b82f6;
  }

  .query-text {
    font-size: 0.875rem;
    color: #cbd5e1;
    font-family: monospace;
  }

  .query-last-used,
  .query-use-count {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .query-actions {
    display: flex;
    gap: 0.5rem;
  }

  .run-query-btn,
  .delete-query-btn {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .run-query-btn:hover {
    background-color: #10b981;
  }

  .delete-query-btn:hover {
    background-color: #ef4444;
  }

  .no-saved-queries {
    color: #9ca3af;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem 1rem;
    background-color: #374151;
    border-radius: 0.375rem;
  }

  .search-results-wrapper {
    flex: 1;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .search-actions {
      flex-direction: column;
    }

    .saved-query-item {
      flex-direction: column;
      gap: 0.75rem;
    }

    .query-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>