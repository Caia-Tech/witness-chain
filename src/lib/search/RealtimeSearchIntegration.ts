/**
 * Real-time Search Integration for WitnessChain
 * Automatically updates search indices when files change
 */

import { SearchEngine } from './SearchEngine';
import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor';
import type { FileAnalysis } from '../monitoring/FileAnalyzer';
import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

export interface RealtimeSearchState {
  isIndexing: boolean;
  indexedFiles: number;
  totalFiles: number;
  lastIndexUpdate: Date | null;
  pendingUpdates: string[];
  errors: string[];
}

export interface SearchIndexStats {
  totalDocuments: number;
  totalTokens: number;
  totalSymbols: number;
  averageDocumentSize: number;
  indexSizeBytes: number;
}

export class RealtimeSearchIntegration {
  private searchEngine: SearchEngine;
  private fileContents: Map<string, string> = new Map();
  private indexQueue: Set<string> = new Set();
  private isProcessing = false;
  private batchSize = 10;
  private batchDelay = 500; // ms
  private batchTimer: number | null = null;

  // Svelte stores for reactive UI
  public state: Writable<RealtimeSearchState>;
  public stats: Readable<SearchIndexStats>;

  constructor(searchEngine?: SearchEngine) {
    this.searchEngine = searchEngine || new SearchEngine();
    
    // Initialize state store
    this.state = writable<RealtimeSearchState>({
      isIndexing: false,
      indexedFiles: 0,
      totalFiles: 0,
      lastIndexUpdate: null,
      pendingUpdates: [],
      errors: []
    });

    // Derive stats from search engine
    this.stats = derived(this.state, ($state) => {
      return this.calculateStats();
    });
  }

  /**
   * Handle file system events and update search index
   */
  async handleMonitorEvent(event: MonitorEvent): Promise<void> {
    console.log(`[RealtimeSearch] Handling event: ${event.type} for ${event.filePath}`);

    switch (event.type) {
      case 'file_created':
      case 'file_modified':
        await this.scheduleIndexUpdate(event.filePath, event.analysis);
        break;
      
      case 'file_deleted':
        await this.removeFromIndex(event.filePath);
        break;
      
      case 'analysis_complete':
        if (event.analysis) {
          await this.scheduleIndexUpdate(event.filePath, event.analysis);
        }
        break;
    }
  }

  /**
   * Schedule a file for indexing (batched for performance)
   */
  private async scheduleIndexUpdate(filePath: string, analysis?: FileAnalysis): Promise<void> {
    // Add to queue
    this.indexQueue.add(filePath);
    
    // Store analysis if provided
    if (analysis) {
      this.storeFileAnalysis(filePath, analysis);
    }

    // Update state
    this.updateState(state => ({
      ...state,
      pendingUpdates: Array.from(this.indexQueue)
    }));

    // Schedule batch processing
    this.scheduleBatchProcessing();
  }

  /**
   * Schedule batch processing of queued files
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay) as unknown as number;
  }

  /**
   * Process a batch of files for indexing
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.indexQueue.size === 0) {
      return;
    }

    this.isProcessing = true;
    this.updateState(state => ({ ...state, isIndexing: true }));

    const batch = Array.from(this.indexQueue).slice(0, this.batchSize);
    const startTime = Date.now();

    console.log(`[RealtimeSearch] Processing batch of ${batch.length} files`);

    for (const filePath of batch) {
      try {
        await this.indexFile(filePath);
        this.indexQueue.delete(filePath);
        
        this.updateState(state => ({
          ...state,
          indexedFiles: state.indexedFiles + 1,
          pendingUpdates: Array.from(this.indexQueue)
        }));
      } catch (error) {
        console.error(`[RealtimeSearch] Error indexing ${filePath}:`, error);
        
        this.updateState(state => ({
          ...state,
          errors: [...state.errors, `Failed to index ${filePath}: ${error}`]
        }));
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[RealtimeSearch] Batch processed in ${processingTime}ms`);

    this.updateState(state => ({
      ...state,
      isIndexing: false,
      lastIndexUpdate: new Date()
    }));

    this.isProcessing = false;

    // Process next batch if queue is not empty
    if (this.indexQueue.size > 0) {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string): Promise<void> {
    // Get file content
    const content = await this.getFileContent(filePath);
    if (!content) {
      console.warn(`[RealtimeSearch] No content for ${filePath}`);
      return;
    }

    // Get file analysis if available
    const analysis = this.getStoredAnalysis(filePath);

    // Index in search engine
    await this.searchEngine.indexFile(filePath, content, analysis);
  }

  /**
   * Remove file from index
   */
  private async removeFromIndex(filePath: string): Promise<void> {
    // In a real implementation, would remove from search engine
    // For now, just remove from our local storage
    this.fileContents.delete(filePath);
    
    this.updateState(state => ({
      ...state,
      indexedFiles: Math.max(0, state.indexedFiles - 1)
    }));

    console.log(`[RealtimeSearch] Removed ${filePath} from index`);
  }

  /**
   * Get file content (from cache or file system)
   */
  private async getFileContent(filePath: string): Promise<string | null> {
    // Check cache first
    if (this.fileContents.has(filePath)) {
      return this.fileContents.get(filePath)!;
    }

    // In production, would read from file system
    // For now, generate sample content
    const content = this.generateSampleContent(filePath);
    this.fileContents.set(filePath, content);
    
    return content;
  }

  /**
   * Generate sample content for testing
   */
  private generateSampleContent(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'file';
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return `// TypeScript file: ${fileName}
import { Component } from '@angular/core';

export interface DataModel {
  id: number;
  name: string;
  value: any;
}

export class ${fileName.replace(/\.[^.]+$/, '')}Service {
  private data: DataModel[] = [];
  
  async fetchData(): Promise<DataModel[]> {
    // Fetch data implementation
    return this.data;
  }
  
  processData(input: DataModel): void {
    // Process data
    console.log('Processing:', input);
  }
}`;

      case '.js':
      case '.jsx':
        return `// JavaScript file: ${fileName}
const utils = require('./utils');

function calculateMetrics(data) {
  let total = 0;
  for (const item of data) {
    total += item.value;
  }
  return total / data.length;
}

class DataProcessor {
  constructor() {
    this.cache = new Map();
  }
  
  process(input) {
    if (this.cache.has(input.id)) {
      return this.cache.get(input.id);
    }
    
    const result = calculateMetrics(input.data);
    this.cache.set(input.id, result);
    return result;
  }
}

module.exports = { DataProcessor, calculateMetrics };`;

      case '.rs':
        return `// Rust file: ${fileName}
use std::collections::HashMap;

pub struct DataProcessor {
    cache: HashMap<String, f64>,
}

impl DataProcessor {
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
        }
    }
    
    pub fn process(&mut self, data: &[f64]) -> f64 {
        let sum: f64 = data.iter().sum();
        let average = sum / data.len() as f64;
        average
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_processor() {
        let mut processor = DataProcessor::new();
        let result = processor.process(&[1.0, 2.0, 3.0]);
        assert_eq!(result, 2.0);
    }
}`;

      case '.svelte':
        return `<script lang="ts">
  import { onMount } from 'svelte';
  
  export let title = '${fileName}';
  export let data: any[] = [];
  
  let processed = false;
  
  onMount(() => {
    processData();
  });
  
  function processData() {
    // Process data
    console.log('Processing ${fileName}');
    processed = true;
  }
  
  function handleClick() {
    // Handle click event
  }
</script>

<div class="component">
  <h1>{title}</h1>
  {#if processed}
    <p>Data processed successfully</p>
  {/if}
  <button on:click={handleClick}>Process</button>
</div>

<style>
  .component {
    padding: 1rem;
  }
</style>`;

      default:
        return `// File: ${fileName}\nSample content for ${filePath}`;
    }
  }

  /**
   * Store file analysis for later use
   */
  private storeFileAnalysis(filePath: string, analysis: FileAnalysis): void {
    // In production, would store in a more persistent way
    // For now, we'll rely on the search engine's internal storage
  }

  /**
   * Get stored file analysis
   */
  private getStoredAnalysis(filePath: string): FileAnalysis | undefined {
    // In production, would retrieve from storage
    // For now, return undefined (search engine will work without it)
    return undefined;
  }

  /**
   * Calculate index statistics
   */
  private calculateStats(): SearchIndexStats {
    // In a real implementation, would get stats from search engine
    const state = get(this.state);
    
    return {
      totalDocuments: state.indexedFiles,
      totalTokens: state.indexedFiles * 100, // Estimate
      totalSymbols: state.indexedFiles * 10, // Estimate
      averageDocumentSize: 1000, // Bytes estimate
      indexSizeBytes: state.indexedFiles * 1000 // Estimate
    };
  }

  /**
   * Update state store
   */
  private updateState(updater: (state: RealtimeSearchState) => RealtimeSearchState): void {
    this.state.update(updater);
  }

  /**
   * Perform a real-time search
   */
  async search(query: string): Promise<any> {
    return this.searchEngine.search({
      text: query,
      options: {
        limit: 50,
        sortBy: 'relevance',
        sortOrder: 'desc'
      }
    });
  }

  /**
   * Get search suggestions
   */
  getSuggestions(partial: string): string[] {
    return this.searchEngine.getSuggestions(partial);
  }

  /**
   * Clear all indices
   */
  async clearIndices(): Promise<void> {
    this.searchEngine.clearIndex();
    this.fileContents.clear();
    this.indexQueue.clear();
    
    this.updateState(() => ({
      isIndexing: false,
      indexedFiles: 0,
      totalFiles: 0,
      lastIndexUpdate: null,
      pendingUpdates: [],
      errors: []
    }));

    console.log('[RealtimeSearch] Indices cleared');
  }

  /**
   * Re-index all files
   */
  async reindexAll(files: string[]): Promise<void> {
    console.log(`[RealtimeSearch] Re-indexing ${files.length} files`);
    
    // Clear existing indices
    await this.clearIndices();
    
    // Update total files count
    this.updateState(state => ({
      ...state,
      totalFiles: files.length
    }));

    // Queue all files for indexing
    for (const file of files) {
      this.indexQueue.add(file);
    }

    // Start processing
    this.scheduleBatchProcessing();
  }

  /**
   * Get the search engine instance
   */
  getSearchEngine(): SearchEngine {
    return this.searchEngine;
  }

  /**
   * Export index for backup
   */
  exportIndex(): any {
    // In production, would serialize the search engine's index
    return {
      timestamp: new Date().toISOString(),
      fileCount: this.fileContents.size,
      files: Array.from(this.fileContents.keys())
    };
  }

  /**
   * Import index from backup
   */
  async importIndex(data: any): Promise<void> {
    console.log('[RealtimeSearch] Importing index from backup');
    
    // In production, would deserialize and restore the index
    if (data.files && Array.isArray(data.files)) {
      for (const file of data.files) {
        this.indexQueue.add(file);
      }
      this.scheduleBatchProcessing();
    }
  }
}