<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { SearchEngine, type SearchQuery, type SearchResult, SearchQueryType } from '../search/SearchEngine';
  import type { SearchFilters, SearchOptions } from '../search/SearchEngine';

  export let placeholder = 'Search code, symbols, functions...';
  export let autofocus = false;
  export let showHistory = true;
  export let showSuggestions = true;
  export let showFilters = true;
  export let searchEngine: SearchEngine | null = null;

  const dispatch = createEventDispatcher<{
    search: { query: SearchQuery; results: SearchResult[] };
    select: { result: SearchResult };
    clear: void;
  }>();

  let searchInput = '';
  let isSearching = false;
  let isFocused = false;
  let suggestions: string[] = [];
  let selectedSuggestionIndex = -1;
  let searchHistory: string[] = [];
  let queryType: SearchQueryType = SearchQueryType.FullText;
  let showAdvanced = false;

  // Advanced filters
  let filters: SearchFilters = {
    languages: [],
    fileTypes: [],
    paths: [],
    excludePaths: []
  };

  let options: SearchOptions = {
    limit: 50,
    sortBy: 'relevance',
    sortOrder: 'desc',
    caseSensitive: false,
    wholeWord: false
  };

  $: if (searchInput && showSuggestions && searchEngine) {
    updateSuggestions();
  } else {
    suggestions = [];
  }

  onMount(() => {
    if (!searchEngine) {
      searchEngine = new SearchEngine();
    }

    // Load search history from local storage
    const saved = localStorage.getItem('witnesschain_search_history');
    if (saved) {
      searchHistory = JSON.parse(saved);
    }
  });

  function updateSuggestions() {
    if (searchEngine && searchInput.length > 1) {
      suggestions = searchEngine.getSuggestions(searchInput, 8);
    } else {
      suggestions = [];
    }
  }

  async function handleSearch() {
    if (!searchInput.trim() || !searchEngine) return;

    isSearching = true;
    selectedSuggestionIndex = -1;

    try {
      const query: SearchQuery = {
        text: searchInput,
        type: queryType,
        filters: Object.keys(filters).some(k => (filters as any)[k]?.length > 0) ? filters : undefined,
        options
      };

      const results = await searchEngine.search(query);
      
      dispatch('search', { query, results });
      
      // Update search history
      if (!searchHistory.includes(searchInput)) {
        searchHistory = [searchInput, ...searchHistory.slice(0, 19)];
        localStorage.setItem('witnesschain_search_history', JSON.stringify(searchHistory));
      }
      
      suggestions = [];
    } catch (error) {
      console.error('[SearchBar] Search error:', error);
    } finally {
      isSearching = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          searchInput = suggestions[selectedSuggestionIndex];
          selectedSuggestionIndex = -1;
        }
        handleSearch();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (suggestions.length > 0) {
          selectedSuggestionIndex = Math.max(0, selectedSuggestionIndex - 1);
        }
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (suggestions.length > 0) {
          selectedSuggestionIndex = Math.min(suggestions.length - 1, selectedSuggestionIndex + 1);
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        suggestions = [];
        selectedSuggestionIndex = -1;
        if (searchInput) {
          clearSearch();
        }
        break;
    }
  }

  function handleSuggestionClick(suggestion: string) {
    searchInput = suggestion;
    suggestions = [];
    selectedSuggestionIndex = -1;
    handleSearch();
  }

  function clearSearch() {
    searchInput = '';
    suggestions = [];
    selectedSuggestionIndex = -1;
    dispatch('clear');
  }

  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }

  function handleLanguageFilter(language: string) {
    if (filters.languages?.includes(language)) {
      filters.languages = filters.languages.filter(l => l !== language);
    } else {
      filters.languages = [...(filters.languages || []), language];
    }
  }

  function handleQueryTypeChange(event: Event) {
    queryType = (event.target as HTMLSelectElement).value as SearchQueryType;
  }
</script>

<div class="search-bar-container">
  <div class="search-bar" class:focused={isFocused}>
    <div class="search-icon">🔍</div>
    
    <input
      type="text"
      bind:value={searchInput}
      on:keydown={handleKeydown}
      on:focus={() => isFocused = true}
      on:blur={() => setTimeout(() => isFocused = false, 200)}
      {placeholder}
      {autofocus}
      class="search-input"
      disabled={isSearching}
    />

    {#if searchInput}
      <button class="clear-button" on:click={clearSearch} title="Clear search">
        ✕
      </button>
    {/if}

    {#if showFilters}
      <button class="filter-button" on:click={toggleAdvanced} title="Advanced filters">
        ⚙️
      </button>
    {/if}

    <button 
      class="search-button"
      on:click={handleSearch}
      disabled={isSearching || !searchInput.trim()}
    >
      {isSearching ? 'Searching...' : 'Search'}
    </button>
  </div>

  {#if showAdvanced}
    <div class="advanced-filters">
      <div class="filter-row">
        <label>
          Search Type:
          <select value={queryType} on:change={handleQueryTypeChange}>
            <option value={SearchQueryType.FullText}>Full Text</option>
            <option value={SearchQueryType.Semantic}>Semantic</option>
            <option value={SearchQueryType.Regex}>Regex</option>
            <option value={SearchQueryType.Fuzzy}>Fuzzy</option>
            <option value={SearchQueryType.Exact}>Exact</option>
          </select>
        </label>

        <label>
          Sort By:
          <select bind:value={options.sortBy}>
            <option value="relevance">Relevance</option>
            <option value="date">Date Modified</option>
            <option value="size">File Size</option>
            <option value="complexity">Complexity</option>
            <option value="path">File Path</option>
          </select>
        </label>

        <label>
          <input type="checkbox" bind:checked={options.caseSensitive} />
          Case Sensitive
        </label>

        <label>
          <input type="checkbox" bind:checked={options.wholeWord} />
          Whole Word
        </label>
      </div>

      <div class="filter-row">
        <div class="language-filters">
          <span>Languages:</span>
          {#each ['typescript', 'javascript', 'rust', 'svelte'] as lang}
            <label class="language-filter">
              <input
                type="checkbox"
                checked={filters.languages?.includes(lang)}
                on:change={() => handleLanguageFilter(lang)}
              />
              {lang}
            </label>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if suggestions.length > 0 && isFocused}
    <div class="suggestions-dropdown">
      {#each suggestions as suggestion, index}
        <div
          class="suggestion-item"
          class:selected={index === selectedSuggestionIndex}
          on:click={() => handleSuggestionClick(suggestion)}
          on:mouseenter={() => selectedSuggestionIndex = index}
        >
          <span class="suggestion-icon">🔍</span>
          <span class="suggestion-text">{suggestion}</span>
          {#if searchHistory.includes(suggestion)}
            <span class="history-badge">Recent</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if showHistory && searchHistory.length > 0 && isFocused && !searchInput}
    <div class="search-history">
      <div class="history-header">Recent Searches</div>
      {#each searchHistory.slice(0, 5) as historyItem}
        <div 
          class="history-item"
          on:click={() => handleSuggestionClick(historyItem)}
        >
          <span class="history-icon">🕐</span>
          <span class="history-text">{historyItem}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-bar-container {
    position: relative;
    width: 100%;
    max-width: 800px;
  }

  .search-bar {
    display: flex;
    align-items: center;
    background-color: #1e293b;
    border: 2px solid #334155;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    transition: all 0.2s;
  }

  .search-bar.focused {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-icon {
    font-size: 1.2rem;
    margin-right: 0.75rem;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #f1f5f9;
    font-size: 1rem;
  }

  .search-input::placeholder {
    color: #64748b;
  }

  .search-input:disabled {
    opacity: 0.5;
  }

  .clear-button {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.2rem;
    transition: color 0.2s;
  }

  .clear-button:hover {
    color: #f1f5f9;
  }

  .filter-button {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.25rem;
    margin: 0 0.5rem;
    font-size: 1.2rem;
    transition: color 0.2s;
  }

  .filter-button:hover {
    color: #f1f5f9;
  }

  .search-button {
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .search-button:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .search-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .advanced-filters {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 0.5rem;
  }

  .filter-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .filter-row:last-child {
    margin-bottom: 0;
  }

  .filter-row label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #cbd5e1;
    font-size: 0.875rem;
  }

  .filter-row select {
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 0.25rem;
    color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .language-filters {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #cbd5e1;
    font-size: 0.875rem;
  }

  .language-filter {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .suggestions-dropdown,
  .search-history {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
  }

  .suggestion-item,
  .history-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .suggestion-item:hover,
  .history-item:hover,
  .suggestion-item.selected {
    background-color: #334155;
  }

  .suggestion-icon,
  .history-icon {
    margin-right: 0.75rem;
    font-size: 0.9rem;
  }

  .suggestion-text,
  .history-text {
    flex: 1;
    color: #f1f5f9;
    font-size: 0.875rem;
  }

  .history-badge {
    background-color: #3b82f6;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin-left: auto;
  }

  .history-header {
    padding: 0.5rem 1rem;
    color: #9ca3af;
    font-size: 0.75rem;
    text-transform: uppercase;
    border-bottom: 1px solid #334155;
  }

  @media (max-width: 768px) {
    .search-bar {
      flex-wrap: wrap;
    }

    .search-input {
      width: 100%;
      margin-bottom: 0.5rem;
    }

    .filter-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .language-filters {
      flex-wrap: wrap;
    }
  }
</style>