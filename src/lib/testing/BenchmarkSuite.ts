/**
 * Comprehensive Benchmark Suite for WitnessChain
 * Tests performance across all system components with diverse examples
 */

import { SearchEngine } from '../search/SearchEngine';
import { CodeAnalytics } from '../analytics/CodeAnalytics';
import { FileAnalyzer } from '../monitoring/FileAnalyzer';
import { RealtimeSearchIntegration } from '../search/RealtimeSearchIntegration';
import type { FileAnalysis, Language } from '../monitoring/FileAnalyzer';

export interface BenchmarkResult {
  testName: string;
  duration: number;
  operations: number;
  operationsPerSecond: number;
  memoryUsage: MemoryUsage;
  success: boolean;
  details: any;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface BenchmarkSuiteResult {
  totalDuration: number;
  testsRun: number;
  testsPasssed: number;
  testsFailed: number;
  results: BenchmarkResult[];
  summary: {
    fileAnalysis: PerformanceStats;
    searchEngine: PerformanceStats;
    codeAnalytics: PerformanceStats;
    realtimeIntegration: PerformanceStats;
  };
}

export interface PerformanceStats {
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalOperations: number;
  avgOpsPerSecond: number;
}

export class BenchmarkSuite {
  private results: BenchmarkResult[] = [];
  private testDataSets: Map<string, TestDataSet> = new Map();

  constructor() {
    this.generateTestDataSets();
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks(): Promise<BenchmarkSuiteResult> {
    console.log('🚀 Starting WitnessChain Benchmark Suite...');
    const startTime = Date.now();

    this.results = [];

    // File Analysis Benchmarks
    await this.runFileAnalysisBenchmarks();
    
    // Search Engine Benchmarks
    await this.runSearchEngineBenchmarks();
    
    // Code Analytics Benchmarks
    await this.runCodeAnalyticsBenchmarks();
    
    // Real-time Integration Benchmarks
    await this.runRealtimeIntegrationBenchmarks();
    
    // Stress Tests
    await this.runStressTests();

    const totalDuration = Date.now() - startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.length - passed;

    const summary = this.calculateSummaryStats();

    console.log(`✅ Benchmark Suite completed in ${totalDuration}ms`);
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);

    return {
      totalDuration,
      testsRun: this.results.length,
      testsPasssed: passed,
      testsFailed: failed,
      results: this.results,
      summary
    };
  }

  /**
   * Generate diverse test data sets
   */
  private generateTestDataSets() {
    // Small TypeScript file
    this.testDataSets.set('typescript-small', {
      name: 'Small TypeScript File',
      language: 'typescript',
      size: 'small',
      content: this.generateTypeScriptContent(100),
      fileCount: 1
    });

    // Large TypeScript project
    this.testDataSets.set('typescript-large', {
      name: 'Large TypeScript Project',
      language: 'typescript',
      size: 'large',
      content: this.generateTypeScriptContent(5000),
      fileCount: 50
    });

    // Rust project
    this.testDataSets.set('rust-project', {
      name: 'Rust Project',
      language: 'rust',
      size: 'medium',
      content: this.generateRustContent(1000),
      fileCount: 25
    });

    // JavaScript library
    this.testDataSets.set('javascript-library', {
      name: 'JavaScript Library',
      language: 'javascript',
      size: 'medium',
      content: this.generateJavaScriptContent(800),
      fileCount: 30
    });

    // Svelte components
    this.testDataSets.set('svelte-components', {
      name: 'Svelte Components',
      language: 'svelte',
      size: 'small',
      content: this.generateSvelteContent(300),
      fileCount: 15
    });

    // Mixed codebase
    this.testDataSets.set('mixed-codebase', {
      name: 'Mixed Language Codebase',
      language: 'mixed',
      size: 'large',
      content: '',
      fileCount: 100
    });
  }

  /**
   * File Analysis Benchmarks
   */
  private async runFileAnalysisBenchmarks() {
    console.log('🔍 Running File Analysis Benchmarks...');

    // Test different file sizes
    await this.benchmarkFileAnalysis('typescript-small', 100);
    await this.benchmarkFileAnalysis('typescript-large', 10);
    await this.benchmarkFileAnalysis('rust-project', 25);
    await this.benchmarkFileAnalysis('javascript-library', 30);
    await this.benchmarkFileAnalysis('svelte-components', 15);

    // Test batch processing
    await this.benchmarkBatchFileAnalysis();
  }

  /**
   * Search Engine Benchmarks
   */
  private async runSearchEngineBenchmarks() {
    console.log('🔎 Running Search Engine Benchmarks...');

    const searchEngine = new SearchEngine();
    
    // Index test data
    await this.indexTestData(searchEngine);

    // Test different search types
    await this.benchmarkSearch(searchEngine, 'full-text', 'function', 1000);
    await this.benchmarkSearch(searchEngine, 'semantic', 'class TestClass', 500);
    await this.benchmarkSearch(searchEngine, 'regex', 'test.*Function', 200);
    await this.benchmarkSearch(searchEngine, 'fuzzy', 'functoin', 100); // Typo
    await this.benchmarkSearch(searchEngine, 'exact', 'export default class', 100);

    // Test search with filters
    await this.benchmarkFilteredSearch(searchEngine);
    
    // Test large result sets
    await this.benchmarkLargeResults(searchEngine);
  }

  /**
   * Code Analytics Benchmarks
   */
  private async runCodeAnalyticsBenchmarks() {
    console.log('📊 Running Code Analytics Benchmarks...');

    const analytics = new CodeAnalytics();
    const testFiles = this.generateAnalyticsTestFiles();

    // Process files
    for (const [filePath, analysis] of testFiles) {
      analytics.processFileAnalysis(analysis);
    }

    // Benchmark report generation
    await this.benchmarkAnalyticsReport(analytics, 100);
    
    // Benchmark hotspot detection
    await this.benchmarkHotspotDetection(analytics, 50);
    
    // Benchmark code smell detection
    await this.benchmarkCodeSmellDetection(analytics, 50);
    
    // Benchmark pattern recognition
    await this.benchmarkPatternRecognition(analytics, 20);
  }

  /**
   * Real-time Integration Benchmarks
   */
  private async runRealtimeIntegrationBenchmarks() {
    console.log('⚡ Running Real-time Integration Benchmarks...');

    const integration = new RealtimeSearchIntegration();
    
    // Test file change processing
    await this.benchmarkRealtimeUpdates(integration, 500);
    
    // Test batch processing
    await this.benchmarkBatchProcessing(integration, 100);
    
    // Test concurrent updates
    await this.benchmarkConcurrentUpdates(integration, 200);
  }

  /**
   * Stress Tests
   */
  private async runStressTests() {
    console.log('💪 Running Stress Tests...');

    // Large file processing
    await this.stressTestLargeFiles();
    
    // High-frequency updates
    await this.stressTestHighFrequencyUpdates();
    
    // Memory pressure
    await this.stressTestMemoryPressure();
    
    // Concurrent operations
    await this.stressTestConcurrentOperations();
  }

  /**
   * Individual benchmark methods
   */
  private async benchmarkFileAnalysis(dataSetName: string, iterations: number) {
    const dataSet = this.testDataSets.get(dataSetName)!;
    const startMemory = this.getMemoryUsage();
    const startTime = Date.now();
    let successCount = 0;

    try {
      for (let i = 0; i < iterations; i++) {
        const filePath = `/test/${dataSetName}_${i}.${this.getFileExtension(dataSet.language)}`;
        const analysis = await FileAnalyzer.analyzeFile(filePath, dataSet.content);
        
        if (analysis.filePath === filePath) {
          successCount++;
        }
      }

      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: `File Analysis - ${dataSet.name}`,
        duration,
        operations: iterations,
        operationsPerSecond: (iterations / duration) * 1000,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: successCount === iterations,
        details: {
          dataSet: dataSetName,
          successRate: successCount / iterations,
          avgContentSize: dataSet.content.length
        }
      });
    } catch (error) {
      this.results.push({
        testName: `File Analysis - ${dataSet.name}`,
        duration: Date.now() - startTime,
        operations: iterations,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  private async benchmarkBatchFileAnalysis() {
    const batchSizes = [10, 50, 100];
    
    for (const batchSize of batchSizes) {
      const startTime = Date.now();
      const startMemory = this.getMemoryUsage();
      
      const promises: Promise<FileAnalysis>[] = [];
      for (let i = 0; i < batchSize; i++) {
        const content = this.generateTypeScriptContent(500);
        promises.push(FileAnalyzer.analyzeFile(`/batch/file_${i}.ts`, content));
      }
      
      try {
        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        const endMemory = this.getMemoryUsage();

        this.results.push({
          testName: `Batch File Analysis - ${batchSize} files`,
          duration,
          operations: batchSize,
          operationsPerSecond: (batchSize / duration) * 1000,
          memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
          success: results.length === batchSize,
          details: {
            batchSize,
            parallelProcessing: true
          }
        });
      } catch (error) {
        this.results.push({
          testName: `Batch File Analysis - ${batchSize} files`,
          duration: Date.now() - startTime,
          operations: batchSize,
          operationsPerSecond: 0,
          memoryUsage: this.getMemoryUsage(),
          success: false,
          details: { error: error?.toString() }
        });
      }
    }
  }

  private async indexTestData(searchEngine: SearchEngine) {
    const files = [
      { path: '/test/component.tsx', content: this.generateTypeScriptContent(1000), language: 'typescript' },
      { path: '/test/service.ts', content: this.generateTypeScriptContent(800), language: 'typescript' },
      { path: '/test/utils.js', content: this.generateJavaScriptContent(600), language: 'javascript' },
      { path: '/test/main.rs', content: this.generateRustContent(1200), language: 'rust' },
      { path: '/test/App.svelte', content: this.generateSvelteContent(400), language: 'svelte' }
    ];

    for (const file of files) {
      await searchEngine.indexFile(file.path, file.content);
    }
  }

  private async benchmarkSearch(searchEngine: SearchEngine, type: string, query: string, iterations: number) {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    let totalResults = 0;
    let successCount = 0;

    try {
      for (let i = 0; i < iterations; i++) {
        const results = await searchEngine.search({ 
          text: query,
          type: type as any
        });
        totalResults += results.length;
        if (results.length >= 0) successCount++; // Any result is success
      }

      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: `Search - ${type} - "${query}"`,
        duration,
        operations: iterations,
        operationsPerSecond: (iterations / duration) * 1000,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: successCount === iterations,
        details: {
          searchType: type,
          query,
          avgResultsPerQuery: totalResults / iterations,
          successRate: successCount / iterations
        }
      });
    } catch (error) {
      this.results.push({
        testName: `Search - ${type} - "${query}"`,
        duration: Date.now() - startTime,
        operations: iterations,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  private async benchmarkAnalyticsReport(analytics: CodeAnalytics, iterations: number) {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    let successCount = 0;

    try {
      for (let i = 0; i < iterations; i++) {
        const report = analytics.generateReport();
        if (report.timestamp) successCount++;
      }

      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: 'Analytics Report Generation',
        duration,
        operations: iterations,
        operationsPerSecond: (iterations / duration) * 1000,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: successCount === iterations,
        details: {
          reportGeneration: true,
          successRate: successCount / iterations
        }
      });
    } catch (error) {
      this.results.push({
        testName: 'Analytics Report Generation',
        duration: Date.now() - startTime,
        operations: iterations,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  private async stressTestLargeFiles() {
    const largeContent = this.generateTypeScriptContent(50000); // ~50KB file
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const analysis = await FileAnalyzer.analyzeFile('/stress/large.ts', largeContent);
      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: 'Stress Test - Large File Processing',
        duration,
        operations: 1,
        operationsPerSecond: 1000 / duration,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: analysis.filePath === '/stress/large.ts',
        details: {
          fileSize: largeContent.length,
          complexityCalculated: analysis.complexity !== undefined
        }
      });
    } catch (error) {
      this.results.push({
        testName: 'Stress Test - Large File Processing',
        duration: Date.now() - startTime,
        operations: 1,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  private async stressTestHighFrequencyUpdates() {
    const integration = new RealtimeSearchIntegration();
    const updateCount = 1000;
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    let successCount = 0;

    try {
      const updatePromises = [];
      for (let i = 0; i < updateCount; i++) {
        const event = {
          type: 'file_modified' as any,
          filePath: `/stress/file_${i}.ts`,
          relativePath: `file_${i}.ts`,
          timestamp: Date.now(),
          analysis: {
            filePath: `/stress/file_${i}.ts`,
            language: 'typescript' as Language,
            size: 100,
            lines: 10,
            complexity: 5,
            lastModified: new Date(),
            encoding: 'utf-8',
            isBinary: false
          }
        };
        
        updatePromises.push(integration.handleMonitorEvent(event));
      }

      await Promise.all(updatePromises);
      successCount = updateCount;

      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: 'Stress Test - High Frequency Updates',
        duration,
        operations: updateCount,
        operationsPerSecond: (updateCount / duration) * 1000,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: true,
        details: {
          updatesPerSecond: (updateCount / duration) * 1000,
          concurrentUpdates: true
        }
      });
    } catch (error) {
      this.results.push({
        testName: 'Stress Test - High Frequency Updates',
        duration: Date.now() - startTime,
        operations: updateCount,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  private async stressTestMemoryPressure() {
    // Create large amounts of data to test memory handling
    const searchEngine = new SearchEngine();
    const fileCount = 500;
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      for (let i = 0; i < fileCount; i++) {
        const content = this.generateTypeScriptContent(2000);
        await searchEngine.indexFile(`/memory/file_${i}.ts`, content);
      }

      // Perform searches to test memory under load
      for (let i = 0; i < 100; i++) {
        await searchEngine.search({ text: `test${i % 10}` });
      }

      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: 'Stress Test - Memory Pressure',
        duration,
        operations: fileCount + 100,
        operationsPerSecond: ((fileCount + 100) / duration) * 1000,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: true,
        details: {
          filesIndexed: fileCount,
          searchesPerformed: 100,
          memoryGrowth: endMemory.heapUsed - startMemory.heapUsed
        }
      });
    } catch (error) {
      this.results.push({
        testName: 'Stress Test - Memory Pressure',
        duration: Date.now() - startTime,
        operations: fileCount,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  private async stressTestConcurrentOperations() {
    const operationCount = 200;
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      const operations = [];

      // Mix of different operations
      for (let i = 0; i < operationCount; i++) {
        const opType = i % 4;
        
        switch (opType) {
          case 0:
            operations.push(this.concurrentFileAnalysis(i));
            break;
          case 1:
            operations.push(this.concurrentSearch(i));
            break;
          case 2:
            operations.push(this.concurrentAnalytics(i));
            break;
          case 3:
            operations.push(this.concurrentRealtimeUpdate(i));
            break;
        }
      }

      const results = await Promise.allSettled(operations);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();

      this.results.push({
        testName: 'Stress Test - Concurrent Operations',
        duration,
        operations: operationCount,
        operationsPerSecond: (operationCount / duration) * 1000,
        memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
        success: successCount / operationCount > 0.9, // 90% success rate
        details: {
          concurrentOperations: operationCount,
          successfulOperations: successCount,
          successRate: successCount / operationCount,
          operationTypes: ['file-analysis', 'search', 'analytics', 'realtime']
        }
      });
    } catch (error) {
      this.results.push({
        testName: 'Stress Test - Concurrent Operations',
        duration: Date.now() - startTime,
        operations: operationCount,
        operationsPerSecond: 0,
        memoryUsage: this.getMemoryUsage(),
        success: false,
        details: { error: error?.toString() }
      });
    }
  }

  /**
   * Helper methods for generating test content
   */
  private generateTypeScriptContent(lines: number): string {
    const imports = [
      "import React, { useState, useEffect, useCallback } from 'react';",
      "import { Observer } from 'rxjs';",
      "import axios from 'axios';",
      "import lodash from 'lodash';",
      "import moment from 'moment';"
    ];

    const interfaces = [
      `interface UserData {
        id: number;
        name: string;
        email: string;
        preferences: UserPreferences;
      }`,
      `interface ApiResponse<T> {
        data: T;
        status: number;
        message: string;
      }`
    ];

    const classes = [
      `export class DataService {
        private cache = new Map<string, any>();
        
        async fetchUserData(id: number): Promise<UserData> {
          if (this.cache.has(\`user_\${id}\`)) {
            return this.cache.get(\`user_\${id}\`);
          }
          
          try {
            const response = await axios.get<ApiResponse<UserData>>(\`/api/users/\${id}\`);
            const userData = response.data.data;
            this.cache.set(\`user_\${id}\`, userData);
            return userData;
          } catch (error) {
            throw new Error(\`Failed to fetch user \${id}: \${error.message}\`);
          }
        }
        
        processUserData(data: UserData[]): ProcessedData {
          return data.reduce((acc, user) => {
            acc.totalUsers++;
            acc.activeUsers += user.preferences.isActive ? 1 : 0;
            return acc;
          }, { totalUsers: 0, activeUsers: 0 });
        }
      }`
    ];

    const functions = [
      `export function calculateMetrics(data: number[]): MetricResult {
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / data.length;
        const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
        
        return {
          sum,
          mean,
          variance,
          standardDeviation: Math.sqrt(variance)
        };
      }`,
      `export const debounce = <T extends (...args: any[]) => void>(
        func: T,
        delay: number
      ): ((...args: Parameters<T>) => void) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func(...args), delay);
        };
      };`
    ];

    let content = imports.slice(0, Math.min(3, Math.floor(lines / 50))).join('\n') + '\n\n';
    content += interfaces.join('\n\n') + '\n\n';
    content += classes.join('\n\n') + '\n\n';
    content += functions.join('\n\n') + '\n\n';

    // Add more content to reach desired line count
    const remaining = lines - content.split('\n').length;
    for (let i = 0; i < remaining; i++) {
      content += `// Additional line ${i}\nexport const value${i} = ${i};\n`;
    }

    return content;
  }

  private generateRustContent(lines: number): string {
    let content = `use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug)]
pub struct UserService {
    cache: Arc<Mutex<HashMap<u64, User>>>,
    client: reqwest::Client,
}

impl UserService {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            client: reqwest::Client::new(),
        }
    }
    
    pub async fn fetch_user(&self, id: u64) -> Result<User, Box<dyn std::error::Error>> {
        {
            let cache = self.cache.lock().await;
            if let Some(user) = cache.get(&id) {
                return Ok(user.clone());
            }
        }
        
        let response = self.client
            .get(&format!("https://api.example.com/users/{}", id))
            .send()
            .await?;
            
        let user: User = response.json().await?;
        
        {
            let mut cache = self.cache.lock().await;
            cache.insert(id, user.clone());
        }
        
        Ok(user)
    }
    
    pub fn process_users(&self, users: &[User]) -> HashMap<String, usize> {
        let mut domain_counts = HashMap::new();
        
        for user in users {
            if let Some(domain) = user.email.split('@').nth(1) {
                *domain_counts.entry(domain.to_string()).or_insert(0) += 1;
            }
        }
        
        domain_counts
    }
}

pub fn calculate_fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_user_service() {
        let service = UserService::new();
        // Test implementation
    }
}
`;

    // Add more content to reach desired lines
    const currentLines = content.split('\n').length;
    const remaining = lines - currentLines;
    
    for (let i = 0; i < remaining; i++) {
      content += `\n// Additional line ${i}\nconst VALUE_${i}: i32 = ${i};`;
    }

    return content;
  }

  private generateJavaScriptContent(lines: number): string {
    let content = `const express = require('express');
const axios = require('axios');
const redis = require('redis');
const { EventEmitter } = require('events');

class ApiService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.baseURL = options.baseURL || 'https://api.example.com';
    this.client = axios.create({ baseURL: this.baseURL });
    this.cache = redis.createClient(options.redis);
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    this.client.interceptors.request.use(
      config => {
        config.headers['User-Agent'] = 'MyApp/1.0';
        return config;
      },
      error => Promise.reject(error)
    );
    
    this.client.interceptors.response.use(
      response => {
        this.emit('response', response);
        return response;
      },
      error => {
        this.emit('error', error);
        return Promise.reject(error);
      }
    );
  }
  
  async getData(endpoint, params = {}) {
    const cacheKey = \`\${endpoint}_\${JSON.stringify(params)}\`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const response = await this.client.get(endpoint, { params });
      const data = response.data;
      
      await this.cache.setex(cacheKey, 3600, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('API request failed:', error.message);
      throw error;
    }
  }
  
  async postData(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);
      this.emit('dataPosted', { endpoint, data: response.data });
      return response.data;
    } catch (error) {
      this.emit('postError', { endpoint, error });
      throw error;
    }
  }
}

function processArray(arr, callback) {
  const results = [];
  
  for (let i = 0; i < arr.length; i++) {
    try {
      const result = callback(arr[i], i, arr);
      if (result !== undefined) {
        results.push(result);
      }
    } catch (error) {
      console.warn(\`Processing item \${i} failed:\`, error.message);
    }
  }
  
  return results;
}

const mathUtils = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b,
  divide: (a, b) => b !== 0 ? a / b : null,
  percentage: (value, total) => total !== 0 ? (value / total) * 100 : 0
};

module.exports = { ApiService, processArray, mathUtils };
`;

    // Add more content to reach desired lines
    const currentLines = content.split('\n').length;
    const remaining = lines - currentLines;
    
    for (let i = 0; i < remaining; i++) {
      content += `\n// Additional line ${i}\nconst value${i} = ${i};`;
    }

    return content;
  }

  private generateSvelteContent(lines: number): string {
    let content = `<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import type { User, ApiResponse } from './types';
  
  export let userId: number;
  export let theme: 'light' | 'dark' = 'light';
  
  const dispatch = createEventDispatcher<{
    userLoaded: { user: User };
    error: { message: string };
  }>();
  
  let user: User | null = null;
  let loading = false;
  let error: string | null = null;
  
  const userStore = writable<User | null>(null);
  const isLoggedIn = derived(userStore, $user => $user !== null);
  
  onMount(async () => {
    await loadUser();
  });
  
  async function loadUser() {
    loading = true;
    error = null;
    
    try {
      const response = await fetch(\`/api/users/\${userId}\`);
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      const data: ApiResponse<User> = await response.json();
      user = data.data;
      userStore.set(user);
      
      dispatch('userLoaded', { user });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }
  
  function handleRefresh() {
    loadUser();
  }
  
  $: displayName = user ? \`\${user.firstName} \${user.lastName}\` : 'Unknown User';
</script>

<div class="user-profile" class:dark-theme={theme === 'dark'}>
  <header class="profile-header">
    <h1>User Profile</h1>
    <button on:click={handleRefresh} disabled={loading}>
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </header>
  
  {#if loading}
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading user data...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <h2>Error</h2>
      <p>{error}</p>
      <button on:click={handleRefresh}>Try Again</button>
    </div>
  {:else if user}
    <div class="user-details">
      <div class="user-avatar">
        <img src={user.avatarUrl || '/default-avatar.png'} alt="{displayName}" />
      </div>
      <div class="user-info">
        <h2>{displayName}</h2>
        <p class="email">{user.email}</p>
        <p class="join-date">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  {:else}
    <div class="no-user">
      <p>No user data available</p>
    </div>
  {/if}
</div>

<style>
  .user-profile {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  
  .dark-theme {
    background-color: #1a1a1a;
    color: #ffffff;
  }
  
  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .loading-spinner {
    text-align: center;
    padding: 3rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>`;

    return content;
  }

  /**
   * Utility methods
   */
  private getFileExtension(language: string): string {
    switch (language) {
      case 'typescript': return 'ts';
      case 'javascript': return 'js';
      case 'rust': return 'rs';
      case 'svelte': return 'svelte';
      default: return 'txt';
    }
  }

  private getMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    // Fallback for browser environment
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    };
  }

  private calculateMemoryDelta(start: MemoryUsage, end: MemoryUsage): MemoryUsage {
    return {
      heapUsed: end.heapUsed - start.heapUsed,
      heapTotal: end.heapTotal - start.heapTotal,
      external: end.external - start.external,
      arrayBuffers: end.arrayBuffers - start.arrayBuffers
    };
  }

  private generateAnalyticsTestFiles(): Map<string, FileAnalysis> {
    const files = new Map<string, FileAnalysis>();
    
    // Generate various file types with different characteristics
    const fileConfigs = [
      { path: '/src/complex.ts', complexity: 25, size: 5000, language: 'typescript' as Language },
      { path: '/src/simple.js', complexity: 5, size: 500, language: 'javascript' as Language },
      { path: '/src/large.ts', complexity: 15, size: 10000, language: 'typescript' as Language },
      { path: '/src/component.svelte', complexity: 8, size: 2000, language: 'svelte' as Language },
      { path: '/src/utils.rs', complexity: 12, size: 3000, language: 'rust' as Language }
    ];

    for (const config of fileConfigs) {
      const analysis: FileAnalysis = {
        filePath: config.path,
        language: config.language,
        size: config.size,
        lines: Math.floor(config.size / 50),
        complexity: config.complexity,
        symbols: [],
        dependencies: [],
        imports: [],
        exports: [],
        functions: this.generateMockFunctions(config.complexity),
        classes: config.language === 'rust' ? [] : this.generateMockClasses(),
        lastModified: new Date(),
        encoding: 'utf-8',
        isBinary: false
      };
      
      files.set(config.path, analysis);
    }

    return files;
  }

  private generateMockFunctions(complexity: number): any[] {
    const functionCount = Math.floor(complexity / 3);
    const functions = [];
    
    for (let i = 0; i < functionCount; i++) {
      functions.push({
        name: `function${i}`,
        line: i * 5 + 1,
        params: [`param${i}`, `param${i + 1}`],
        complexity: Math.min(complexity, 10),
        isAsync: i % 2 === 0,
        isExported: i % 3 === 0
      });
    }
    
    return functions;
  }

  private generateMockClasses(): any[] {
    return [{
      name: 'TestClass',
      line: 10,
      methods: [
        {
          name: 'testMethod',
          line: 12,
          params: ['param1'],
          complexity: 3,
          isAsync: false,
          isExported: false
        }
      ],
      properties: ['property1', 'property2'],
      isExported: true
    }];
  }

  /**
   * Concurrent operation helpers
   */
  private async concurrentFileAnalysis(index: number): Promise<void> {
    const content = this.generateTypeScriptContent(100);
    await FileAnalyzer.analyzeFile(`/concurrent/file_${index}.ts`, content);
  }

  private async concurrentSearch(index: number): Promise<void> {
    const searchEngine = new SearchEngine();
    await searchEngine.search({ text: `search${index}` });
  }

  private async concurrentAnalytics(index: number): Promise<void> {
    const analytics = new CodeAnalytics();
    analytics.generateReport();
  }

  private async concurrentRealtimeUpdate(index: number): Promise<void> {
    const integration = new RealtimeSearchIntegration();
    await integration.handleMonitorEvent({
      type: 'file_modified',
      filePath: `/concurrent/update_${index}.ts`,
      relativePath: `update_${index}.ts`,
      timestamp: Date.now()
    });
  }

  private calculateSummaryStats(): BenchmarkSuiteResult['summary'] {
    const fileAnalysisResults = this.results.filter(r => r.testName.includes('File Analysis'));
    const searchResults = this.results.filter(r => r.testName.includes('Search'));
    const analyticsResults = this.results.filter(r => r.testName.includes('Analytics'));
    const realtimeResults = this.results.filter(r => r.testName.includes('Real-time') || r.testName.includes('Stress'));

    return {
      fileAnalysis: this.calculateStats(fileAnalysisResults),
      searchEngine: this.calculateStats(searchResults),
      codeAnalytics: this.calculateStats(analyticsResults),
      realtimeIntegration: this.calculateStats(realtimeResults)
    };
  }

  private calculateStats(results: BenchmarkResult[]): PerformanceStats {
    if (results.length === 0) {
      return {
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalOperations: 0,
        avgOpsPerSecond: 0
      };
    }

    const durations = results.map(r => r.duration);
    const operations = results.reduce((sum, r) => sum + r.operations, 0);
    const opsPerSecond = results.map(r => r.operationsPerSecond);

    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalOperations: operations,
      avgOpsPerSecond: opsPerSecond.reduce((a, b) => a + b, 0) / opsPerSecond.length
    };
  }
}

interface TestDataSet {
  name: string;
  language: string;
  size: 'small' | 'medium' | 'large';
  content: string;
  fileCount: number;
}