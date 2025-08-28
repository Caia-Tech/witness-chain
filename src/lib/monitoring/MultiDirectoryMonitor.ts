/**
 * Multi-directory monitoring system for WitnessChain
 * Handles monitoring multiple directories with intelligent filtering
 */

import type { FileAnalysis, Language } from './FileAnalyzer.js';
import { FileAnalyzer } from './FileAnalyzer.js';

export interface MonitorConfig {
  rootPaths: string[];
  ignorePatterns: string[];
  maxDepth: number;
  includeExtensions: string[];
  excludeExtensions: string[];
  maxFileSize: number; // in bytes
  enableAnalysis: boolean;
}

export interface MonitorEvent {
  type: MonitorEventType;
  filePath: string;
  relativePath: string;
  analysis?: FileAnalysis;
  timestamp: number;
  size?: number;
  previousAnalysis?: FileAnalysis;
}

export enum MonitorEventType {
  FileCreated = 'file_created',
  FileModified = 'file_modified',
  FileDeleted = 'file_deleted',
  DirectoryCreated = 'directory_created',
  DirectoryDeleted = 'directory_deleted',
  FileRenamed = 'file_renamed',
  AnalysisComplete = 'analysis_complete',
  Error = 'error'
}

export interface MonitorStats {
  totalFiles: number;
  filesByLanguage: Record<Language, number>;
  totalSize: number;
  averageComplexity: number;
  mostComplexFiles: Array<{ path: string; complexity: number }>;
  recentActivity: MonitorEvent[];
  errorCount: number;
  lastUpdate: Date;
}

export type MonitorEventHandler = (event: MonitorEvent) => void;

export class MultiDirectoryMonitor {
  private config: MonitorConfig;
  private eventHandlers: Set<MonitorEventHandler> = new Set();
  private fileCache: Map<string, FileAnalysis> = new Map();
  private stats: MonitorStats;
  private isRunning = false;

  constructor(config: MonitorConfig) {
    this.config = {
      maxDepth: 10,
      maxFileSize: 1024 * 1024, // 1MB
      enableAnalysis: true,
      ...config
    };
    
    this.stats = this.initializeStats();
  }

  /**
   * Start monitoring all configured directories
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Monitor is already running');
    }

    console.log('[MultiDirectoryMonitor] Starting monitoring for paths:', this.config.rootPaths);
    this.isRunning = true;
    
    // Initial scan of all directories
    await this.performInitialScan();
    
    // Set up file watchers (this would integrate with the Node.js file watcher)
    this.setupWatchers();
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[MultiDirectoryMonitor] Stopping monitoring');
    this.isRunning = false;
    
    // Clean up watchers and resources
    this.cleanup();
  }

  /**
   * Add event handler
   */
  on(handler: MonitorEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: MonitorEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Get current monitoring statistics
   */
  getStats(): MonitorStats {
    return { ...this.stats };
  }

  /**
   * Get file analysis by path
   */
  getFileAnalysis(filePath: string): FileAnalysis | undefined {
    return this.fileCache.get(filePath);
  }

  /**
   * Force analysis of a specific file
   */
  async analyzeFile(filePath: string, content?: string): Promise<FileAnalysis | null> {
    try {
      if (!this.shouldMonitorFile(filePath)) {
        return null;
      }

      // If content not provided, we'd read it from the file system
      // For now, we'll simulate this
      const fileContent = content || await this.readFileContent(filePath);
      const analysis = await FileAnalyzer.analyzeFile(filePath, fileContent);
      
      this.fileCache.set(filePath, analysis);
      this.updateStats(analysis);
      
      this.emitEvent({
        type: MonitorEventType.AnalysisComplete,
        filePath,
        relativePath: this.getRelativePath(filePath),
        analysis,
        timestamp: Date.now()
      });

      return analysis;
    } catch (error) {
      console.error('[MultiDirectoryMonitor] Error analyzing file:', filePath, error);
      this.emitEvent({
        type: MonitorEventType.Error,
        filePath,
        relativePath: this.getRelativePath(filePath),
        timestamp: Date.now()
      });
      return null;
    }
  }

  /**
   * Handle file system events
   */
  async handleFileSystemEvent(
    eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
    filePath: string,
    stats?: any
  ): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // For directories, we always process the event
    if (eventType === 'addDir' || eventType === 'unlinkDir') {
      // Process directory events below
    } else if (!this.shouldMonitorFile(filePath)) {
      return;
    }

    const relativePath = this.getRelativePath(filePath);
    let monitorEvent: MonitorEvent;

    switch (eventType) {
      case 'add':
        monitorEvent = {
          type: MonitorEventType.FileCreated,
          filePath,
          relativePath,
          timestamp: Date.now(),
          size: stats?.size
        };
        
        if (this.config.enableAnalysis) {
          try {
            const content = await this.readFileContent(filePath);
            const analysis = await FileAnalyzer.analyzeFile(filePath, content);
            monitorEvent.analysis = analysis;
            this.fileCache.set(filePath, analysis);
            this.updateStats(analysis);
          } catch (error) {
            console.error('[MultiDirectoryMonitor] Error analyzing new file:', error);
          }
        }
        break;

      case 'change':
        const previousAnalysis = this.fileCache.get(filePath);
        monitorEvent = {
          type: MonitorEventType.FileModified,
          filePath,
          relativePath,
          timestamp: Date.now(),
          size: stats?.size,
          previousAnalysis
        };
        
        if (this.config.enableAnalysis) {
          try {
            const content = await this.readFileContent(filePath);
            const analysis = await FileAnalyzer.analyzeFile(filePath, content);
            monitorEvent.analysis = analysis;
            this.fileCache.set(filePath, analysis);
            this.updateStats(analysis, previousAnalysis);
          } catch (error) {
            console.error('[MultiDirectoryMonitor] Error analyzing modified file:', error);
          }
        }
        break;

      case 'unlink':
        this.fileCache.delete(filePath);
        monitorEvent = {
          type: MonitorEventType.FileDeleted,
          filePath,
          relativePath,
          timestamp: Date.now()
        };
        this.updateStatsForDeletion(filePath);
        break;

      case 'addDir':
        monitorEvent = {
          type: MonitorEventType.DirectoryCreated,
          filePath,
          relativePath,
          timestamp: Date.now()
        };
        break;

      case 'unlinkDir':
        // Remove all cached files in this directory
        for (const cachedPath of this.fileCache.keys()) {
          if (cachedPath.startsWith(filePath)) {
            this.fileCache.delete(cachedPath);
          }
        }
        monitorEvent = {
          type: MonitorEventType.DirectoryDeleted,
          filePath,
          relativePath,
          timestamp: Date.now()
        };
        break;

      default:
        return;
    }

    this.emitEvent(monitorEvent);
    this.stats.recentActivity.unshift(monitorEvent);
    
    // Keep only last 100 activities
    if (this.stats.recentActivity.length > 100) {
      this.stats.recentActivity = this.stats.recentActivity.slice(0, 100);
    }
    
    this.stats.lastUpdate = new Date();
  }

  /**
   * Check if file should be monitored based on config
   */
  private shouldMonitorFile(filePath: string): boolean {
    // Check ignore patterns
    for (const pattern of this.config.ignorePatterns) {
      if (filePath.includes(pattern)) {
        return false;
      }
    }

    // Check file extension
    const ext = this.getFileExtension(filePath);
    
    if (this.config.includeExtensions.length > 0) {
      return this.config.includeExtensions.includes(ext);
    }
    
    if (this.config.excludeExtensions.length > 0) {
      return !this.config.excludeExtensions.includes(ext);
    }

    return true;
  }

  /**
   * Perform initial scan of all directories
   */
  private async performInitialScan(): Promise<void> {
    console.log('[MultiDirectoryMonitor] Performing initial directory scan...');
    
    for (const rootPath of this.config.rootPaths) {
      try {
        await this.scanDirectory(rootPath, 0);
      } catch (error) {
        console.error('[MultiDirectoryMonitor] Error scanning directory:', rootPath, error);
        this.stats.errorCount++;
      }
    }
    
    console.log(`[MultiDirectoryMonitor] Initial scan complete. Found ${this.stats.totalFiles} files.`);
  }

  /**
   * Recursively scan directory
   */
  private async scanDirectory(dirPath: string, depth: number): Promise<void> {
    if (depth >= this.config.maxDepth) {
      return;
    }

    // This would use actual file system APIs in a real implementation
    // For now, we'll simulate the scanning process
    console.log(`[MultiDirectoryMonitor] Scanning directory: ${dirPath} (depth: ${depth})`);
  }

  /**
   * Set up file watchers for all root paths
   */
  private setupWatchers(): void {
    // This would integrate with the actual file watching system
    // The integration point would be here to connect with the chokidar watcher
    console.log('[MultiDirectoryMonitor] Setting up file watchers...');
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.eventHandlers.clear();
    this.fileCache.clear();
  }

  /**
   * Emit event to all handlers
   */
  private emitEvent(event: MonitorEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[MultiDirectoryMonitor] Error in event handler:', error);
      }
    }
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): MonitorStats {
    return {
      totalFiles: 0,
      filesByLanguage: {} as Record<Language, number>,
      totalSize: 0,
      averageComplexity: 0,
      mostComplexFiles: [],
      recentActivity: [],
      errorCount: 0,
      lastUpdate: new Date()
    };
  }

  /**
   * Update statistics with new file analysis
   */
  private updateStats(analysis: FileAnalysis, previousAnalysis?: FileAnalysis): void {
    if (previousAnalysis) {
      // Update existing file stats
      this.stats.totalSize += analysis.size - previousAnalysis.size;
      
      // Update language counts
      if (previousAnalysis.language !== analysis.language) {
        this.stats.filesByLanguage[previousAnalysis.language] = 
          Math.max(0, (this.stats.filesByLanguage[previousAnalysis.language] || 0) - 1);
        this.stats.filesByLanguage[analysis.language] = 
          (this.stats.filesByLanguage[analysis.language] || 0) + 1;
      }
    } else {
      // New file stats
      this.stats.totalFiles++;
      this.stats.totalSize += analysis.size;
      this.stats.filesByLanguage[analysis.language] = 
        (this.stats.filesByLanguage[analysis.language] || 0) + 1;
    }

    // Update complexity stats
    if (analysis.complexity) {
      this.updateComplexityStats(analysis);
    }
  }

  /**
   * Update complexity-related statistics
   */
  private updateComplexityStats(analysis: FileAnalysis): void {
    if (!analysis.complexity) return;

    // Update most complex files list
    this.stats.mostComplexFiles.push({
      path: analysis.filePath,
      complexity: analysis.complexity
    });

    // Sort and keep top 10
    this.stats.mostComplexFiles.sort((a, b) => b.complexity - a.complexity);
    this.stats.mostComplexFiles = this.stats.mostComplexFiles.slice(0, 10);

    // Calculate average complexity
    const complexFiles = Array.from(this.fileCache.values())
      .filter(f => f.complexity !== undefined);
    
    if (complexFiles.length > 0) {
      this.stats.averageComplexity = complexFiles
        .reduce((sum, f) => sum + (f.complexity || 0), 0) / complexFiles.length;
    }
  }

  /**
   * Update stats for file deletion
   */
  private updateStatsForDeletion(filePath: string): void {
    // This would remove the file from stats calculations
    this.stats.totalFiles = Math.max(0, this.stats.totalFiles - 1);
    
    // Remove from most complex files
    this.stats.mostComplexFiles = this.stats.mostComplexFiles
      .filter(f => f.path !== filePath);
  }

  /**
   * Get relative path from absolute path
   */
  private getRelativePath(absolutePath: string): string {
    for (const rootPath of this.config.rootPaths) {
      if (absolutePath.startsWith(rootPath)) {
        return absolutePath.substring(rootPath.length + 1);
      }
    }
    return absolutePath;
  }

  /**
   * Get file extension
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.substring(lastDot).toLowerCase();
  }

  /**
   * Read file content (placeholder - would use actual file system in real implementation)
   */
  private async readFileContent(filePath: string): Promise<string> {
    // This would use actual file system APIs
    // For testing, return sample content based on file extension
    const ext = this.getFileExtension(filePath);
    const fileName = filePath.split('/').pop() || 'file';
    
    switch (ext) {
      case '.js':
      case '.jsx':
        return `// JavaScript file: ${fileName}\nfunction example() {\n  return 'Hello World';\n}\nexport default example;`;
      
      case '.ts':
      case '.tsx':
        return `// TypeScript file: ${fileName}\ninterface Example {\n  value: string;\n}\nexport class ExampleClass {\n  getValue(): string { return 'test'; }\n}`;
        
      case '.rs':
        return `// Rust file: ${fileName}\npub fn example() -> String {\n    "Hello Rust".to_string()\n}\n\npub struct Data {\n    pub field: i32,\n}`;
        
      case '.svelte':
        return `<script>\n  export let title = 'Example';\n  \n  function handleClick() {\n    console.log('clicked');\n  }\n  \n  $: computed = title.toUpperCase();\n</script>\n\n<h1>{title}</h1>`;
        
      default:
        return `// File: ${fileName}\nconsole.log('Sample content');`;
    }
  }
}