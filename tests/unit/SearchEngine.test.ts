import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine, SearchQueryType } from '../../src/lib/search/SearchEngine';
import type { SearchQuery, SearchResult, SearchFilters, SavedQuery } from '../../src/lib/search/SearchEngine';
import type { FileAnalysis } from '../../src/lib/monitoring/FileAnalyzer';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;

  beforeEach(() => {
    searchEngine = new SearchEngine();
  });

  describe('indexing', () => {
    it('should index a file successfully', async () => {
      const filePath = '/test/file.ts';
      const content = 'function testFunction() { return "hello world"; }';
      
      await searchEngine.indexFile(filePath, content);
      
      // Search for the indexed content
      const results = await searchEngine.search({ text: 'testFunction' });
      expect(results).toHaveLength(1);
      expect(results[0].filePath).toBe(filePath);
    });

    it('should index file with analysis data', async () => {
      const filePath = '/test/analyzed.ts';
      const content = 'class TestClass { method() {} }';
      const analysis: Partial<FileAnalysis> = {
        filePath,
        language: 'typescript' as any,
        size: content.length,
        lines: 1,
        complexity: 2,
        symbols: [],
        functions: [{
          name: 'method',
          line: 1,
          params: [],
          complexity: 1,
          isAsync: false,
          isExported: false
        }],
        classes: [{
          name: 'TestClass',
          line: 1,
          methods: [{
            name: 'method',
            line: 1,
            params: [],
            complexity: 1,
            isAsync: false,
            isExported: false
          }],
          properties: [],
          isExported: false
        }]
      };

      await searchEngine.indexFile(filePath, content, analysis as FileAnalysis);
      
      const results = await searchEngine.search({ text: 'TestClass' });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.language).toBe('typescript');
    });

    it('should update index when file is re-indexed', async () => {
      const filePath = '/test/update.ts';
      const content1 = 'function oldFunction() {}';
      const content2 = 'function newFunction() {}';
      
      await searchEngine.indexFile(filePath, content1);
      await searchEngine.indexFile(filePath, content2);
      
      const oldResults = await searchEngine.search({ text: 'oldFunction' });
      const newResults = await searchEngine.search({ text: 'newFunction' });
      
      expect(oldResults).toHaveLength(0);
      expect(newResults).toHaveLength(1);
    });
  });

  describe('full-text search', () => {
    beforeEach(async () => {
      // Index some test files
      await searchEngine.indexFile('/test/file1.ts', 'function calculateSum(a, b) { return a + b; }');
      await searchEngine.indexFile('/test/file2.js', 'const calculateProduct = (x, y) => x * y;');
      await searchEngine.indexFile('/test/file3.ts', 'class Calculator { add(a, b) { return a + b; } }');
    });

    it('should find files by keyword', async () => {
      const results = await searchEngine.search({ 
        text: 'calculate',
        type: SearchQueryType.FullText
      });
      
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some(r => r.filePath.includes('file1'))).toBe(true);
      expect(results.some(r => r.filePath.includes('file2'))).toBe(true);
    });

    it('should rank results by relevance', async () => {
      const results = await searchEngine.search({ text: 'Calculator' });
      
      expect(results.length).toBeGreaterThan(0);
      // file3 should rank higher as it has exact match
      expect(results[0].filePath).toContain('file3');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should handle multiple search terms', async () => {
      const results = await searchEngine.search({ text: 'add return' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.filePath.includes('file3'))).toBe(true);
    });
  });

  describe('semantic search', () => {
    beforeEach(async () => {
      const analysis1: Partial<FileAnalysis> = {
        functions: [{
          name: 'getData',
          line: 1,
          params: ['id'],
          complexity: 2,
          isAsync: true,
          isExported: true
        }],
        imports: [{
          module: 'axios',
          type: 'import',
          specifiers: ['default'],
          line: 1,
          isDefault: true,
          isNamespace: false
        }]
      };

      await searchEngine.indexFile(
        '/test/api.ts',
        'import axios from "axios"; async function getData(id) { return axios.get(`/api/${id}`); }',
        analysis1 as FileAnalysis
      );
    });

    it('should find functions by semantic search', async () => {
      const results = await searchEngine.search({
        text: 'function getData',
        type: SearchQueryType.Semantic
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('symbol');
    });

    it('should find imports by semantic search', async () => {
      const results = await searchEngine.search({
        text: 'import from axios',
        type: SearchQueryType.Semantic
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('import');
    });
  });

  describe('regex search', () => {
    beforeEach(async () => {
      await searchEngine.indexFile('/test/regex.ts', 'const EMAIL_REGEX = /^[\\w-\\.]+@[\\w-]+\\.[a-z]{2,}$/;');
      await searchEngine.indexFile('/test/pattern.js', 'function validateEmail(email) { return email.match(/.+@.+/); }');
    });

    it('should find patterns using regex', async () => {
      const results = await searchEngine.search({
        text: 'EMAIL_[A-Z]+',
        type: SearchQueryType.Regex
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].filePath).toContain('regex');
    });

    it('should handle case-insensitive regex', async () => {
      const results = await searchEngine.search({
        text: 'email',
        type: SearchQueryType.Regex,
        options: { caseSensitive: false }
      });

      expect(results.length).toBe(2);
    });
  });

  describe('fuzzy search', () => {
    beforeEach(async () => {
      await searchEngine.indexFile('/test/fuzzy.ts', 'function calculateAverage(numbers) { return sum / numbers.length; }');
    });

    it('should find results with typos', async () => {
      const results = await searchEngine.search({
        text: 'calclate', // Typo: should be 'calculate'
        type: SearchQueryType.Fuzzy
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].filePath).toContain('fuzzy');
    });

    it('should limit fuzzy distance', async () => {
      const results = await searchEngine.search({
        text: 'xyz123', // Too different
        type: SearchQueryType.Fuzzy
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('exact search', () => {
    beforeEach(async () => {
      await searchEngine.indexFile('/test/exact.ts', 'const message = "Hello World from TypeScript";');
    });

    it('should find exact phrase matches', async () => {
      const results = await searchEngine.search({
        text: 'Hello World',
        type: SearchQueryType.Exact
      });

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThan(10);
    });

    it('should be case sensitive when specified', async () => {
      const results = await searchEngine.search({
        text: 'hello world', // lowercase
        type: SearchQueryType.Exact,
        options: { caseSensitive: true }
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      const tsAnalysis: Partial<FileAnalysis> = {
        language: 'typescript' as any,
        size: 1000,
        complexity: 10
      };
      const jsAnalysis: Partial<FileAnalysis> = {
        language: 'javascript' as any,
        size: 500,
        complexity: 5
      };

      await searchEngine.indexFile('/src/large.ts', 'complex code here', tsAnalysis as FileAnalysis);
      await searchEngine.indexFile('/test/small.js', 'simple code', jsAnalysis as FileAnalysis);
    });

    it('should filter by language', async () => {
      const filters: SearchFilters = {
        languages: ['typescript']
      };

      const results = await searchEngine.search({
        text: 'code',
        filters
      });

      expect(results.every(r => r.metadata.language === 'typescript')).toBe(true);
    });

    it('should filter by path', async () => {
      const filters: SearchFilters = {
        paths: ['/src']
      };

      const results = await searchEngine.search({
        text: 'code',
        filters
      });

      expect(results.every(r => r.filePath.includes('/src'))).toBe(true);
    });

    it('should exclude paths', async () => {
      const filters: SearchFilters = {
        excludePaths: ['/test']
      };

      const results = await searchEngine.search({
        text: 'code',
        filters
      });

      expect(results.every(r => !r.filePath.includes('/test'))).toBe(true);
    });

    it('should filter by complexity range', async () => {
      const filters: SearchFilters = {
        complexityRange: { min: 8, max: 15 }
      };

      const results = await searchEngine.search({
        text: 'code',
        filters
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.complexity).toBe(10);
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      await searchEngine.indexFile('/a.ts', 'test content a', {
        size: 100,
        complexity: 5,
        lastModified: new Date('2024-01-01')
      } as FileAnalysis);
      
      await searchEngine.indexFile('/b.ts', 'test content b', {
        size: 200,
        complexity: 10,
        lastModified: new Date('2024-01-02')
      } as FileAnalysis);
    });

    it('should sort by relevance by default', async () => {
      const results = await searchEngine.search({ text: 'test' });
      
      expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
    });

    it('should sort by date', async () => {
      const results = await searchEngine.search({
        text: 'test',
        options: { sortBy: 'date', sortOrder: 'desc' }
      });

      const dates = results.map(r => r.metadata.lastModified?.getTime() || 0);
      expect(dates[0]).toBeGreaterThanOrEqual(dates[dates.length - 1]);
    });

    it('should sort by complexity', async () => {
      const results = await searchEngine.search({
        text: 'test',
        options: { sortBy: 'complexity', sortOrder: 'desc' }
      });

      expect(results[0].metadata.complexity).toBeGreaterThanOrEqual(
        results[results.length - 1].metadata.complexity || 0
      );
    });
  });

  describe('suggestions', () => {
    beforeEach(async () => {
      await searchEngine.indexFile('/test1.ts', 'function testFunction() {}');
      await searchEngine.indexFile('/test2.ts', 'function testMethod() {}');
      await searchEngine.indexFile('/test3.ts', 'const testing = true;');
      
      // Simulate search history
      await searchEngine.search({ text: 'testFunction' });
      await searchEngine.search({ text: 'testing' });
    });

    it('should provide suggestions for partial input', () => {
      const suggestions = searchEngine.getSuggestions('test', 5);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('test'))).toBe(true);
    });

    it('should prioritize search history in suggestions', () => {
      const suggestions = searchEngine.getSuggestions('test', 10);
      
      // Recent searches should appear first
      expect(suggestions[0]).toBe('testing');
      expect(suggestions[1]).toBe('testFunction');
    });

    it('should limit number of suggestions', () => {
      const suggestions = searchEngine.getSuggestions('test', 2);
      
      expect(suggestions).toHaveLength(2);
    });
  });

  describe('saved queries', () => {
    it('should save a query', () => {
      const query: SearchQuery = {
        text: 'important search',
        filters: { languages: ['typescript'] }
      };

      const saved = searchEngine.saveQuery('My Query', query, 'Description');
      
      expect(saved.name).toBe('My Query');
      expect(saved.description).toBe('Description');
      expect(saved.query).toEqual(query);
      expect(saved.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve saved queries', () => {
      searchEngine.saveQuery('Query 1', { text: 'test1' });
      searchEngine.saveQuery('Query 2', { text: 'test2' });
      
      const queries = searchEngine.getSavedQueries();
      
      expect(queries).toHaveLength(2);
      expect(queries.map(q => q.name)).toContain('Query 1');
      expect(queries.map(q => q.name)).toContain('Query 2');
    });

    it('should execute saved query', async () => {
      await searchEngine.indexFile('/test.ts', 'test content');
      
      const saved = searchEngine.saveQuery('Test Query', { text: 'test' });
      const results = await searchEngine.executeSavedQuery(saved.id);
      
      expect(results).toHaveLength(1);
      expect(saved.useCount).toBe(1);
      expect(saved.lastUsed).toBeInstanceOf(Date);
    });

    it('should throw error for invalid saved query', async () => {
      await expect(searchEngine.executeSavedQuery('invalid-id')).rejects.toThrow();
    });
  });

  describe('search history', () => {
    it('should record search history', async () => {
      await searchEngine.search({ text: 'first search' });
      await searchEngine.search({ text: 'second search' });
      
      const history = searchEngine.getSearchHistory();
      
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].query).toBe('second search'); // Most recent first
      expect(history[1].query).toBe('first search');
    });

    it('should include result count in history', async () => {
      await searchEngine.indexFile('/test.ts', 'test content');
      await searchEngine.search({ text: 'test' });
      
      const history = searchEngine.getSearchHistory();
      
      expect(history[0].resultCount).toBeGreaterThan(0);
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit history size', async () => {
      // Perform many searches
      for (let i = 0; i < 150; i++) {
        await searchEngine.search({ text: `search ${i}` });
      }
      
      const history = searchEngine.getSearchHistory(200);
      
      expect(history.length).toBeLessThanOrEqual(100); // Internal limit
    });
  });

  describe('clear index', () => {
    it('should clear all indexed data', async () => {
      await searchEngine.indexFile('/test.ts', 'test content');
      
      // Verify data exists
      let results = await searchEngine.search({ text: 'test' });
      expect(results.length).toBeGreaterThan(0);
      
      // Clear index
      searchEngine.clearIndex();
      
      // Verify data is cleared
      results = await searchEngine.search({ text: 'test' });
      expect(results).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of documents', async () => {
      const startTime = Date.now();
      
      // Index many files
      for (let i = 0; i < 100; i++) {
        await searchEngine.indexFile(
          `/test/file${i}.ts`,
          `function func${i}() { return ${i}; }`
        );
      }
      
      const indexTime = Date.now() - startTime;
      expect(indexTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Search should still be fast
      const searchStart = Date.now();
      const results = await searchEngine.search({ text: 'func50' });
      const searchTime = Date.now() - searchStart;
      
      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100); // Search should be under 100ms
    });
  });
});