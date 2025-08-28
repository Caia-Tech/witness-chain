/**
 * Advanced Search Engine for WitnessChain
 * Provides full-text search, semantic code search, and intelligent query capabilities
 */

import type { FileAnalysis, Symbol, ImportExport, FunctionInfo, ClassInfo } from '../monitoring/FileAnalyzer';
import type { CodeHotspot, CodeSmell } from '../analytics/CodeAnalytics';

export interface SearchResult {
  id: string;
  filePath: string;
  type: 'file' | 'symbol' | 'function' | 'class' | 'import' | 'export' | 'content';
  score: number;
  highlights: HighlightMatch[];
  preview: string;
  lineNumber?: number;
  columnNumber?: number;
  metadata: {
    language?: string;
    size?: number;
    complexity?: number;
    lastModified?: Date;
  };
}

export interface HighlightMatch {
  field: string;
  value: string;
  start: number;
  end: number;
}

export interface SearchQuery {
  text: string;
  type?: SearchQueryType;
  filters?: SearchFilters;
  options?: SearchOptions;
}

export enum SearchQueryType {
  FullText = 'full_text',
  Semantic = 'semantic',
  Regex = 'regex',
  Fuzzy = 'fuzzy',
  Exact = 'exact'
}

export interface SearchFilters {
  languages?: string[];
  fileTypes?: string[];
  paths?: string[];
  excludePaths?: string[];
  dateRange?: { start: Date; end: Date };
  complexityRange?: { min: number; max: number };
  sizeRange?: { min: number; max: number };
  hasHotspots?: boolean;
  hasCodeSmells?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'size' | 'complexity' | 'path';
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface SearchIndex {
  documents: Map<string, IndexedDocument>;
  invertedIndex: Map<string, Set<string>>;
  symbolIndex: Map<string, SymbolIndexEntry[]>;
  importExportIndex: Map<string, Set<string>>;
  lastUpdate: Date;
}

export interface IndexedDocument {
  id: string;
  filePath: string;
  content: string;
  tokens: string[];
  analysis?: FileAnalysis;
  hotspots?: CodeHotspot[];
  codeSmells?: CodeSmell[];
  lastIndexed: Date;
}

export interface SymbolIndexEntry {
  documentId: string;
  symbol: Symbol;
  context: string;
}

export interface QueryToken {
  type: 'term' | 'phrase' | 'field' | 'operator' | 'modifier';
  value: string;
  field?: string;
  operator?: 'AND' | 'OR' | 'NOT';
  modifier?: '+' | '-' | '~';
}

export interface SearchHistory {
  query: string;
  timestamp: Date;
  resultCount: number;
  filters?: SearchFilters;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

export class SearchEngine {
  private index: SearchIndex;
  private searchHistory: SearchHistory[] = [];
  private savedQueries: Map<string, SavedQuery> = new Map();
  private stopWords: Set<string>;
  private synonyms: Map<string, string[]>;

  constructor() {
    this.index = {
      documents: new Map(),
      invertedIndex: new Map(),
      symbolIndex: new Map(),
      importExportIndex: new Map(),
      lastUpdate: new Date()
    };

    this.stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'been', 'was', 'were', 'will'
    ]);

    this.synonyms = new Map([
      ['function', ['func', 'fn', 'method', 'procedure']],
      ['class', ['cls', 'type', 'struct', 'interface']],
      ['variable', ['var', 'const', 'let', 'field', 'property']],
      ['import', ['require', 'include', 'use']],
      ['export', ['module.exports', 'expose', 'public']]
    ]);
  }

  /**
   * Index a file for searching
   */
  async indexFile(filePath: string, content: string, analysis?: FileAnalysis): Promise<void> {
    const documentId = this.generateDocumentId(filePath);
    
    // Tokenize content
    const tokens = this.tokenize(content);
    
    // Create indexed document
    const doc: IndexedDocument = {
      id: documentId,
      filePath,
      content,
      tokens,
      analysis,
      lastIndexed: new Date()
    };

    // Store document
    this.index.documents.set(documentId, doc);

    // Update inverted index
    this.updateInvertedIndex(documentId, tokens);

    // Index symbols if analysis is provided
    if (analysis) {
      this.indexSymbols(documentId, analysis);
      this.indexImportsExports(documentId, analysis);
    }

    this.index.lastUpdate = new Date();
  }

  /**
   * Perform a search query
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const startTime = Date.now();
    let results: SearchResult[] = [];

    // Parse query
    const queryTokens = this.parseQuery(query.text);
    
    // Perform search based on query type
    switch (query.type || SearchQueryType.FullText) {
      case SearchQueryType.FullText:
        results = await this.fullTextSearch(queryTokens, query.filters, query.options);
        break;
      
      case SearchQueryType.Semantic:
        results = await this.semanticSearch(query.text, query.filters, query.options);
        break;
      
      case SearchQueryType.Regex:
        results = await this.regexSearch(query.text, query.filters, query.options);
        break;
      
      case SearchQueryType.Fuzzy:
        results = await this.fuzzySearch(queryTokens, query.filters, query.options);
        break;
      
      case SearchQueryType.Exact:
        results = await this.exactSearch(query.text, query.filters, query.options);
        break;
    }

    // Apply filters
    if (query.filters) {
      results = this.applyFilters(results, query.filters);
    }

    // Sort results
    results = this.sortResults(results, query.options?.sortBy || 'relevance', query.options?.sortOrder || 'desc');

    // Apply pagination
    if (query.options?.offset || query.options?.limit) {
      const offset = query.options.offset || 0;
      const limit = query.options.limit || 50;
      results = results.slice(offset, offset + limit);
    }

    // Record search history
    this.recordSearchHistory(query.text, results.length, query.filters);

    // Calculate search time
    const searchTime = Date.now() - startTime;
    console.log(`[SearchEngine] Query completed in ${searchTime}ms, found ${results.length} results`);

    return results;
  }

  /**
   * Full-text search implementation
   */
  private async fullTextSearch(
    queryTokens: QueryToken[],
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results = new Map<string, SearchResult>();
    const termTokens = queryTokens.filter(t => t.type === 'term' || t.type === 'phrase');

    for (const token of termTokens) {
      const searchTerm = token.value.toLowerCase();
      
      // Expand with synonyms
      const expandedTerms = this.expandWithSynonyms(searchTerm);
      
      for (const term of expandedTerms) {
        const documentIds = this.index.invertedIndex.get(term) || new Set();
        
        for (const docId of documentIds) {
          const doc = this.index.documents.get(docId);
          if (!doc) continue;

          // Calculate relevance score
          const score = this.calculateRelevanceScore(doc, term, termTokens);
          
          // Create or update result
          if (results.has(docId)) {
            const existing = results.get(docId)!;
            existing.score += score;
          } else {
            const highlights = this.findHighlights(doc.content, term);
            results.set(docId, {
              id: docId,
              filePath: doc.filePath,
              type: 'content',
              score,
              highlights,
              preview: this.generatePreview(doc.content, highlights),
              metadata: {
                language: doc.analysis?.language,
                size: doc.analysis?.size,
                complexity: doc.analysis?.complexity,
                lastModified: doc.analysis?.lastModified
              }
            });
          }
        }
      }
    }

    return Array.from(results.values());
  }

  /**
   * Semantic search using AST and code understanding
   */
  private async semanticSearch(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Determine search intent
    const intent = this.detectSearchIntent(query);
    
    if (intent.searchingForSymbol) {
      // Search in symbol index
      for (const [symbolName, entries] of this.index.symbolIndex) {
        if (this.matchesSemanticQuery(symbolName, intent.symbolType, query)) {
          for (const entry of entries) {
            const doc = this.index.documents.get(entry.documentId);
            if (!doc) continue;

            results.push({
              id: `${entry.documentId}-${symbolName}`,
              filePath: doc.filePath,
              type: 'symbol',
              score: this.calculateSemanticScore(entry.symbol, intent),
              highlights: [{
                field: 'symbol',
                value: symbolName,
                start: 0,
                end: symbolName.length
              }],
              preview: entry.context,
              lineNumber: entry.symbol.line,
              columnNumber: entry.symbol.column,
              metadata: {
                language: doc.analysis?.language
              }
            });
          }
        }
      }
    }

    if (intent.searchingForImports) {
      // Search in import/export index
      const searchModule = intent.moduleName?.toLowerCase();
      if (searchModule) {
        for (const [module, docIds] of this.index.importExportIndex) {
          if (module.toLowerCase().includes(searchModule)) {
            for (const docId of docIds) {
              const doc = this.index.documents.get(docId);
              if (!doc || !doc.analysis) continue;

              // Find specific import/export
              const imports = doc.analysis.imports || [];
              const exports = doc.analysis.exports || [];
              
              [...imports, ...exports].forEach(item => {
                if (item.module.toLowerCase().includes(searchModule)) {
                  results.push({
                    id: `${docId}-import-${item.module}`,
                    filePath: doc.filePath,
                    type: item.type === 'import' ? 'import' : 'export',
                    score: 10,
                    highlights: [{
                      field: 'module',
                      value: item.module,
                      start: 0,
                      end: item.module.length
                    }],
                    preview: `${item.type} ${item.specifiers.join(', ')} from '${item.module}'`,
                    lineNumber: item.line,
                    metadata: {
                      language: doc.analysis.language
                    }
                  });
                }
              });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Regex-based search
   */
  private async regexSearch(
    pattern: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      const regex = new RegExp(pattern, options?.caseSensitive ? 'g' : 'gi');
      
      for (const [docId, doc] of this.index.documents) {
        const matches = [...doc.content.matchAll(regex)];
        
        if (matches.length > 0) {
          const highlights: HighlightMatch[] = matches.map(match => ({
            field: 'content',
            value: match[0],
            start: match.index!,
            end: match.index! + match[0].length
          }));

          results.push({
            id: docId,
            filePath: doc.filePath,
            type: 'content',
            score: matches.length,
            highlights,
            preview: this.generatePreview(doc.content, highlights),
            metadata: {
              language: doc.analysis?.language,
              size: doc.analysis?.size
            }
          });
        }
      }
    } catch (error) {
      console.error('[SearchEngine] Invalid regex pattern:', error);
    }

    return results;
  }

  /**
   * Fuzzy search with tolerance for typos
   */
  private async fuzzySearch(
    queryTokens: QueryToken[],
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results = new Map<string, SearchResult>();
    
    for (const token of queryTokens) {
      if (token.type !== 'term') continue;
      
      const searchTerm = token.value.toLowerCase();
      
      // Find similar terms in index
      for (const indexedTerm of this.index.invertedIndex.keys()) {
        const distance = this.levenshteinDistance(searchTerm, indexedTerm);
        
        // Allow up to 2 character differences
        if (distance <= 2) {
          const documentIds = this.index.invertedIndex.get(indexedTerm)!;
          
          for (const docId of documentIds) {
            const doc = this.index.documents.get(docId);
            if (!doc) continue;

            // Lower score for fuzzy matches
            const score = Math.max(1, 10 - distance * 3);
            
            if (results.has(docId)) {
              results.get(docId)!.score += score;
            } else {
              const highlights = this.findHighlights(doc.content, indexedTerm);
              results.set(docId, {
                id: docId,
                filePath: doc.filePath,
                type: 'content',
                score,
                highlights,
                preview: this.generatePreview(doc.content, highlights),
                metadata: {
                  language: doc.analysis?.language
                }
              });
            }
          }
        }
      }
    }

    return Array.from(results.values());
  }

  /**
   * Exact phrase search
   */
  private async exactSearch(
    phrase: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchPhrase = options?.caseSensitive ? phrase : phrase.toLowerCase();
    
    for (const [docId, doc] of this.index.documents) {
      const content = options?.caseSensitive ? doc.content : doc.content.toLowerCase();
      const index = content.indexOf(searchPhrase);
      
      if (index !== -1) {
        const highlights: HighlightMatch[] = [{
          field: 'content',
          value: phrase,
          start: index,
          end: index + phrase.length
        }];

        results.push({
          id: docId,
          filePath: doc.filePath,
          type: 'content',
          score: 15, // High score for exact matches
          highlights,
          preview: this.generatePreview(doc.content, highlights),
          metadata: {
            language: doc.analysis?.language
          }
        });
      }
    }

    return results;
  }

  /**
   * Get search suggestions based on partial input
   */
  getSuggestions(partial: string, limit = 10): string[] {
    const suggestions: string[] = [];
    const partialLower = partial.toLowerCase();
    
    // Get suggestions from search history
    const historyMatches = this.searchHistory
      .filter(h => h.query.toLowerCase().startsWith(partialLower))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5)
      .map(h => h.query);
    
    suggestions.push(...historyMatches);
    
    // Get suggestions from indexed terms
    const termMatches: string[] = [];
    for (const term of this.index.invertedIndex.keys()) {
      if (term.startsWith(partialLower) && !suggestions.includes(term)) {
        termMatches.push(term);
        if (termMatches.length >= 5) break;
      }
    }
    
    suggestions.push(...termMatches);
    
    return suggestions.slice(0, limit);
  }

  /**
   * Save a search query for later use
   */
  saveQuery(name: string, query: SearchQuery, description?: string): SavedQuery {
    const id = this.generateQueryId(name);
    const savedQuery: SavedQuery = {
      id,
      name,
      description,
      query,
      createdAt: new Date(),
      useCount: 0
    };
    
    this.savedQueries.set(id, savedQuery);
    return savedQuery;
  }

  /**
   * Get saved queries
   */
  getSavedQueries(): SavedQuery[] {
    return Array.from(this.savedQueries.values())
      .sort((a, b) => b.lastUsed?.getTime() || 0 - (a.lastUsed?.getTime() || 0));
  }

  /**
   * Execute a saved query
   */
  async executeSavedQuery(queryId: string): Promise<SearchResult[]> {
    const savedQuery = this.savedQueries.get(queryId);
    if (!savedQuery) {
      throw new Error(`Saved query not found: ${queryId}`);
    }
    
    // Update usage stats
    savedQuery.lastUsed = new Date();
    savedQuery.useCount++;
    
    return this.search(savedQuery.query);
  }

  /**
   * Get search history
   */
  getSearchHistory(limit = 20): SearchHistory[] {
    return this.searchHistory.slice(0, limit);
  }

  /**
   * Clear search index
   */
  clearIndex(): void {
    this.index.documents.clear();
    this.index.invertedIndex.clear();
    this.index.symbolIndex.clear();
    this.index.importExportIndex.clear();
    this.index.lastUpdate = new Date();
  }

  // Helper methods

  private tokenize(text: string): string[] {
    // Remove special characters and split into tokens
    const tokens = text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0 && !this.stopWords.has(token));
    
    return tokens;
  }

  private parseQuery(query: string): QueryToken[] {
    const tokens: QueryToken[] = [];
    
    // Simple tokenization - could be enhanced with a proper query parser
    const terms = query.split(/\s+/);
    
    for (const term of terms) {
      if (term.startsWith('+')) {
        tokens.push({ type: 'modifier', value: term.substring(1), modifier: '+' });
      } else if (term.startsWith('-')) {
        tokens.push({ type: 'modifier', value: term.substring(1), modifier: '-' });
      } else if (term.includes(':')) {
        const [field, value] = term.split(':');
        tokens.push({ type: 'field', value, field });
      } else {
        tokens.push({ type: 'term', value: term });
      }
    }
    
    return tokens;
  }

  private updateInvertedIndex(documentId: string, tokens: string[]): void {
    for (const token of tokens) {
      if (!this.index.invertedIndex.has(token)) {
        this.index.invertedIndex.set(token, new Set());
      }
      this.index.invertedIndex.get(token)!.add(documentId);
    }
  }

  private indexSymbols(documentId: string, analysis: FileAnalysis): void {
    if (!analysis.symbols) return;
    
    for (const symbol of analysis.symbols) {
      const symbolName = symbol.name.toLowerCase();
      
      if (!this.index.symbolIndex.has(symbolName)) {
        this.index.symbolIndex.set(symbolName, []);
      }
      
      this.index.symbolIndex.get(symbolName)!.push({
        documentId,
        symbol,
        context: `${symbol.type} ${symbol.name}`
      });
    }
  }

  private indexImportsExports(documentId: string, analysis: FileAnalysis): void {
    const allImportsExports = [
      ...(analysis.imports || []),
      ...(analysis.exports || [])
    ];
    
    for (const item of allImportsExports) {
      const module = item.module.toLowerCase();
      
      if (!this.index.importExportIndex.has(module)) {
        this.index.importExportIndex.set(module, new Set());
      }
      
      this.index.importExportIndex.get(module)!.add(documentId);
    }
  }

  private calculateRelevanceScore(doc: IndexedDocument, term: string, allTerms: QueryToken[]): number {
    let score = 0;
    
    // Term frequency
    const termCount = doc.tokens.filter(t => t === term).length;
    score += Math.log(1 + termCount) * 10;
    
    // Document frequency (inverse)
    const docsWithTerm = this.index.invertedIndex.get(term)?.size || 1;
    const totalDocs = this.index.documents.size;
    const idf = Math.log(totalDocs / docsWithTerm);
    score *= idf;
    
    // Boost for exact matches in filename
    if (doc.filePath.toLowerCase().includes(term)) {
      score += 5;
    }
    
    // Boost for recent files
    if (doc.lastIndexed) {
      const age = Date.now() - doc.lastIndexed.getTime();
      const ageDays = age / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - ageDays / 30);
    }
    
    return score;
  }

  private findHighlights(content: string, term: string): HighlightMatch[] {
    const highlights: HighlightMatch[] = [];
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    
    let index = lowerContent.indexOf(lowerTerm);
    while (index !== -1) {
      highlights.push({
        field: 'content',
        value: content.substring(index, index + term.length),
        start: index,
        end: index + term.length
      });
      
      index = lowerContent.indexOf(lowerTerm, index + 1);
      
      // Limit highlights
      if (highlights.length >= 5) break;
    }
    
    return highlights;
  }

  private generatePreview(content: string, highlights: HighlightMatch[]): string {
    if (highlights.length === 0) {
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }
    
    // Get context around first highlight
    const firstHighlight = highlights[0];
    const start = Math.max(0, firstHighlight.start - 50);
    const end = Math.min(content.length, firstHighlight.end + 50);
    
    let preview = content.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';
    
    return preview;
  }

  private expandWithSynonyms(term: string): string[] {
    const expanded = [term];
    
    for (const [key, synonymList] of this.synonyms) {
      if (key === term || synonymList.includes(term)) {
        expanded.push(key, ...synonymList);
      }
    }
    
    return [...new Set(expanded)];
  }

  private detectSearchIntent(query: string): any {
    const lowerQuery = query.toLowerCase();
    
    return {
      searchingForSymbol: /\b(function|func|class|interface|struct|enum|variable|const)\b/.test(lowerQuery),
      symbolType: lowerQuery.match(/\b(function|class|interface|struct|enum)\b/)?.[0],
      searchingForImports: /\b(import|require|from|use)\b/.test(lowerQuery),
      moduleName: lowerQuery.match(/from\s+['"]([^'"]+)['"]/)?.[1] || 
                  lowerQuery.match(/import\s+['"]([^'"]+)['"]/)?.[1]
    };
  }

  private matchesSemanticQuery(symbolName: string, symbolType: string | undefined, query: string): boolean {
    const lowerSymbol = symbolName.toLowerCase();
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // Check if symbol name matches any query terms
    return queryTerms.some(term => lowerSymbol.includes(term));
  }

  private calculateSemanticScore(symbol: Symbol, intent: any): number {
    let score = 10;
    
    // Boost for matching symbol type
    if (intent.symbolType && symbol.type.toLowerCase().includes(intent.symbolType)) {
      score += 5;
    }
    
    // Boost for public symbols
    if (symbol.visibility === 'public') {
      score += 2;
    }
    
    return score;
  }

  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    return results.filter(result => {
      // Language filter
      if (filters.languages && filters.languages.length > 0) {
        if (!result.metadata.language || !filters.languages.includes(result.metadata.language)) {
          return false;
        }
      }
      
      // Path filters
      if (filters.paths && filters.paths.length > 0) {
        const matchesPath = filters.paths.some(path => result.filePath.includes(path));
        if (!matchesPath) return false;
      }
      
      if (filters.excludePaths && filters.excludePaths.length > 0) {
        const excludedPath = filters.excludePaths.some(path => result.filePath.includes(path));
        if (excludedPath) return false;
      }
      
      // Complexity filter
      if (filters.complexityRange) {
        const complexity = result.metadata.complexity || 0;
        if (complexity < filters.complexityRange.min || complexity > filters.complexityRange.max) {
          return false;
        }
      }
      
      // Size filter
      if (filters.sizeRange) {
        const size = result.metadata.size || 0;
        if (size < filters.sizeRange.min || size > filters.sizeRange.max) {
          return false;
        }
      }
      
      return true;
    });
  }

  private sortResults(
    results: SearchResult[],
    sortBy: string,
    order: 'asc' | 'desc'
  ): SearchResult[] {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.score - a.score;
          break;
        case 'date':
          comparison = (b.metadata.lastModified?.getTime() || 0) - (a.metadata.lastModified?.getTime() || 0);
          break;
        case 'size':
          comparison = (b.metadata.size || 0) - (a.metadata.size || 0);
          break;
        case 'complexity':
          comparison = (b.metadata.complexity || 0) - (a.metadata.complexity || 0);
          break;
        case 'path':
          comparison = a.filePath.localeCompare(b.filePath);
          break;
      }
      
      return order === 'asc' ? -comparison : comparison;
    });
    
    return sorted;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  private recordSearchHistory(query: string, resultCount: number, filters?: SearchFilters): void {
    this.searchHistory.unshift({
      query,
      timestamp: new Date(),
      resultCount,
      filters
    });
    
    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(0, 100);
    }
  }

  private generateDocumentId(filePath: string): string {
    return filePath.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private generateQueryId(name: string): string {
    return `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }
}