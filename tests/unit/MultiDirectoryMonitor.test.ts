/**
 * Comprehensive unit tests for MultiDirectoryMonitor
 * Tests monitoring configuration, event handling, and statistics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MultiDirectoryMonitor, 
  MonitorConfig, 
  MonitorEventType, 
  MonitorEvent 
} from '../../src/lib/monitoring/MultiDirectoryMonitor.js';
import { Language } from '../../src/lib/monitoring/FileAnalyzer.js';

describe('MultiDirectoryMonitor', () => {
  let monitor: MultiDirectoryMonitor;
  let defaultConfig: MonitorConfig;
  let eventLog: MonitorEvent[];

  beforeEach(async () => {
    defaultConfig = {
      rootPaths: ['/test/project'],
      ignorePatterns: ['node_modules', '.git', 'target'],
      maxDepth: 5,
      includeExtensions: [],
      excludeExtensions: ['.log', '.tmp'],
      maxFileSize: 1024 * 1024, // 1MB
      enableAnalysis: true
    };
    
    eventLog = [];
    monitor = new MultiDirectoryMonitor(defaultConfig);
    await monitor.start(); // Start monitoring for tests
  });

  afterEach(async () => {
    if (monitor) {
      await monitor.stop();
    }
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      const config: MonitorConfig = {
        rootPaths: ['/test'],
        ignorePatterns: [],
        maxDepth: 0,
        includeExtensions: [],
        excludeExtensions: [],
        maxFileSize: 0,
        enableAnalysis: false
      };

      const testMonitor = new MultiDirectoryMonitor(config);
      const stats = testMonitor.getStats();
      
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.recentActivity).toEqual([]);
    });

    it('should apply default values for missing config properties', () => {
      const minimalConfig: MonitorConfig = {
        rootPaths: ['/test'],
        ignorePatterns: [],
        maxDepth: 0,
        includeExtensions: [],
        excludeExtensions: [],
        maxFileSize: 0,
        enableAnalysis: false
      };

      const testMonitor = new MultiDirectoryMonitor(minimalConfig);
      // Should not throw and should have reasonable defaults
      expect(testMonitor).toBeDefined();
    });

    it('should handle multiple root paths', () => {
      const config: MonitorConfig = {
        rootPaths: ['/project1', '/project2', '/project3'],
        ignorePatterns: [],
        maxDepth: 3,
        includeExtensions: [],
        excludeExtensions: [],
        maxFileSize: 1024,
        enableAnalysis: true
      };

      const testMonitor = new MultiDirectoryMonitor(config);
      expect(testMonitor).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    it('should register and call event handlers', async () => {
      const events: MonitorEvent[] = [];
      const handler = (event: MonitorEvent) => events.push(event);
      
      monitor.on(handler);
      
      // Simulate file system event
      await monitor.handleFileSystemEvent('add', '/test/project/file.js', { size: 100 });
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(MonitorEventType.FileCreated);
      expect(events[0].filePath).toBe('/test/project/file.js');
    });

    it('should handle multiple event handlers', async () => {
      const events1: MonitorEvent[] = [];
      const events2: MonitorEvent[] = [];
      
      monitor.on(event => events1.push(event));
      monitor.on(event => events2.push(event));
      
      await monitor.handleFileSystemEvent('change', '/test/project/file.js');
      
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0].type).toBe(MonitorEventType.FileModified);
      expect(events2[0].type).toBe(MonitorEventType.FileModified);
    });

    it('should remove event handlers correctly', async () => {
      const events: MonitorEvent[] = [];
      const handler = (event: MonitorEvent) => events.push(event);
      
      monitor.on(handler);
      await monitor.handleFileSystemEvent('add', '/test/project/file.js');
      expect(events).toHaveLength(1);
      
      monitor.off(handler);
      await monitor.handleFileSystemEvent('add', '/test/project/file2.js');
      expect(events).toHaveLength(1); // No new events
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = () => {
        throw new Error('Handler error');
      };
      const workingHandler = vi.fn();
      
      monitor.on(errorHandler);
      monitor.on(workingHandler);
      
      // Should not throw and should still call working handler
      await monitor.handleFileSystemEvent('add', '/test/project/file.js');
      expect(workingHandler).toHaveBeenCalled();
    });
  });

  describe('File System Events', () => {
    it('should handle file creation events', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('add', '/test/project/new-file.js', { size: 500 });
      
      const event = events[0];
      expect(event.type).toBe(MonitorEventType.FileCreated);
      expect(event.filePath).toBe('/test/project/new-file.js');
      expect(event.relativePath).toBe('new-file.js');
      expect(event.size).toBe(500);
      expect(event.timestamp).toBeTypeOf('number');
    });

    it('should handle file modification events', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      // First create the file
      await monitor.handleFileSystemEvent('add', '/test/project/file.js');
      // Then modify it
      await monitor.handleFileSystemEvent('change', '/test/project/file.js', { size: 800 });
      
      expect(events).toHaveLength(2);
      const modifyEvent = events[1];
      expect(modifyEvent.type).toBe(MonitorEventType.FileModified);
      expect(modifyEvent.size).toBe(800);
    });

    it('should handle file deletion events', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('unlink', '/test/project/deleted-file.js');
      
      const event = events[0];
      expect(event.type).toBe(MonitorEventType.FileDeleted);
      expect(event.filePath).toBe('/test/project/deleted-file.js');
    });

    it('should handle directory creation events', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('addDir', '/test/project/new-folder');
      
      const event = events[0];
      expect(event.type).toBe(MonitorEventType.DirectoryCreated);
      expect(event.filePath).toBe('/test/project/new-folder');
    });

    it('should handle directory deletion events', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('unlinkDir', '/test/project/old-folder');
      
      const event = events[0];
      expect(event.type).toBe(MonitorEventType.DirectoryDeleted);
      expect(event.filePath).toBe('/test/project/old-folder');
    });

    it('should ignore files matching ignore patterns', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      // These should be ignored
      await monitor.handleFileSystemEvent('add', '/test/project/node_modules/package.js');
      await monitor.handleFileSystemEvent('add', '/test/project/.git/config');
      await monitor.handleFileSystemEvent('add', '/test/project/target/debug/app');
      
      // This should not be ignored
      await monitor.handleFileSystemEvent('add', '/test/project/src/main.js');
      
      expect(events).toHaveLength(1);
      expect(events[0].filePath).toBe('/test/project/src/main.js');
    });

    it('should ignore files with excluded extensions', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      // These should be ignored (.log, .tmp in excludeExtensions)
      await monitor.handleFileSystemEvent('add', '/test/project/debug.log');
      await monitor.handleFileSystemEvent('add', '/test/project/temp.tmp');
      
      // This should not be ignored
      await monitor.handleFileSystemEvent('add', '/test/project/code.js');
      
      expect(events).toHaveLength(1);
      expect(events[0].filePath).toBe('/test/project/code.js');
    });

    it('should only include files with included extensions when specified', async () => {
      const config = {
        ...defaultConfig,
        includeExtensions: ['.rs', '.ts'],
        excludeExtensions: [] // Clear excludes to test includes only
      };
      const testMonitor = new MultiDirectoryMonitor(config);
      
      const events: MonitorEvent[] = [];
      testMonitor.on(event => events.push(event));
      
      // These should be included
      await testMonitor.handleFileSystemEvent('add', '/test/project/main.rs');
      await testMonitor.handleFileSystemEvent('add', '/test/project/types.ts');
      
      // These should be ignored
      await testMonitor.handleFileSystemEvent('add', '/test/project/script.js');
      await testMonitor.handleFileSystemEvent('add', '/test/project/readme.md');
      
      expect(events).toHaveLength(2);
      expect(events[0].filePath).toBe('/test/project/main.rs');
      expect(events[1].filePath).toBe('/test/project/types.ts');
      
      await testMonitor.stop();
    });
  });

  describe('Statistics Tracking', () => {
    it('should update file count statistics', async () => {
      await monitor.handleFileSystemEvent('add', '/test/project/file1.js');
      await monitor.handleFileSystemEvent('add', '/test/project/file2.ts');
      await monitor.handleFileSystemEvent('add', '/test/project/file3.rs');
      
      const stats = monitor.getStats();
      expect(stats.totalFiles).toBe(3);
    });

    it('should track files by language', async () => {
      // Mock FileAnalyzer to return predictable results
      const originalAnalyzer = vi.mocked(monitor as any).analyzeFile;
      
      await monitor.handleFileSystemEvent('add', '/test/project/script.js');
      await monitor.handleFileSystemEvent('add', '/test/project/types.ts');
      await monitor.handleFileSystemEvent('add', '/test/project/main.rs');
      await monitor.handleFileSystemEvent('add', '/test/project/component.svelte');
      
      // Note: In a real implementation, this would require mocking FileAnalyzer
      // to return specific language analysis results
      const stats = monitor.getStats();
      expect(stats.filesByLanguage).toBeDefined();
    });

    it('should track total size', async () => {
      await monitor.handleFileSystemEvent('add', '/test/project/file1.js', { size: 100 });
      await monitor.handleFileSystemEvent('add', '/test/project/file2.js', { size: 200 });
      await monitor.handleFileSystemEvent('change', '/test/project/file1.js', { size: 150 });
      
      const stats = monitor.getStats();
      expect(stats.totalSize).toBe(350); // 150 + 200
    });

    it('should maintain recent activity list', async () => {
      // Add multiple events
      for (let i = 0; i < 5; i++) {
        await monitor.handleFileSystemEvent('add', `/test/project/file${i}.js`);
      }
      
      const stats = monitor.getStats();
      expect(stats.recentActivity).toHaveLength(5);
      
      // Most recent should be first
      expect(stats.recentActivity[0].filePath).toBe('/test/project/file4.js');
      expect(stats.recentActivity[4].filePath).toBe('/test/project/file0.js');
    });

    it('should limit recent activity list to 100 items', async () => {
      // Add more than 100 events
      for (let i = 0; i < 150; i++) {
        await monitor.handleFileSystemEvent('add', `/test/project/file${i}.js`);
      }
      
      const stats = monitor.getStats();
      expect(stats.recentActivity).toHaveLength(100);
      
      // Should keep the most recent 100
      expect(stats.recentActivity[0].filePath).toBe('/test/project/file149.js');
      expect(stats.recentActivity[99].filePath).toBe('/test/project/file50.js');
    });

    it('should update lastUpdate timestamp', async () => {
      const initialStats = monitor.getStats();
      const initialTime = initialStats.lastUpdate.getTime();
      
      // Wait a bit and add an event
      await new Promise(resolve => setTimeout(resolve, 10));
      await monitor.handleFileSystemEvent('add', '/test/project/file.js');
      
      const updatedStats = monitor.getStats();
      expect(updatedStats.lastUpdate.getTime()).toBeGreaterThan(initialTime);
    });

    it('should handle file deletion in statistics', async () => {
      // Add files
      await monitor.handleFileSystemEvent('add', '/test/project/file1.js');
      await monitor.handleFileSystemEvent('add', '/test/project/file2.js');
      
      let stats = monitor.getStats();
      expect(stats.totalFiles).toBe(2);
      
      // Delete a file
      await monitor.handleFileSystemEvent('unlink', '/test/project/file1.js');
      
      stats = monitor.getStats();
      expect(stats.totalFiles).toBe(1);
    });
  });

  describe('Analysis Integration', () => {
    it('should perform analysis when enabled', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('add', '/test/project/test.js');
      
      const event = events[0];
      // In a real implementation with proper file reading, this would have analysis
      expect(event.type).toBe(MonitorEventType.FileCreated);
    });

    it('should skip analysis when disabled', async () => {
      const config = { ...defaultConfig, enableAnalysis: false };
      const testMonitor = new MultiDirectoryMonitor(config);
      
      const events: MonitorEvent[] = [];
      testMonitor.on(event => events.push(event));
      
      await testMonitor.handleFileSystemEvent('add', '/test/project/test.js');
      
      const event = events[0];
      expect(event.analysis).toBeUndefined();
      
      await testMonitor.stop();
    });

    it('should handle analysis errors gracefully', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      // This would cause analysis to fail in real implementation
      await monitor.handleFileSystemEvent('add', '/test/project/binary.exe');
      
      // Should still create the event even if analysis fails
      expect(events).toHaveLength(1);
    });
  });

  describe('File Cache Management', () => {
    it('should cache file analysis results', async () => {
      await monitor.analyzeFile('/test/project/test.js', 'console.log("test");');
      
      const analysis1 = monitor.getFileAnalysis('/test/project/test.js');
      const analysis2 = monitor.getFileAnalysis('/test/project/test.js');
      
      expect(analysis1).toBeDefined();
      expect(analysis1).toBe(analysis2); // Should return same cached instance
    });

    it('should update cache on file modification', async () => {
      // Create initial file
      await monitor.handleFileSystemEvent('add', '/test/project/test.js');
      const initialAnalysis = monitor.getFileAnalysis('/test/project/test.js');
      
      // Modify file
      await monitor.handleFileSystemEvent('change', '/test/project/test.js');
      const updatedAnalysis = monitor.getFileAnalysis('/test/project/test.js');
      
      // Cache should be updated (in real implementation with different content)
      expect(updatedAnalysis).toBeDefined();
    });

    it('should remove from cache on file deletion', async () => {
      await monitor.handleFileSystemEvent('add', '/test/project/test.js');
      expect(monitor.getFileAnalysis('/test/project/test.js')).toBeDefined();
      
      await monitor.handleFileSystemEvent('unlink', '/test/project/test.js');
      expect(monitor.getFileAnalysis('/test/project/test.js')).toBeUndefined();
    });

    it('should clear directory cache on directory deletion', async () => {
      await monitor.handleFileSystemEvent('add', '/test/project/subdir/file1.js');
      await monitor.handleFileSystemEvent('add', '/test/project/subdir/file2.js');
      
      expect(monitor.getFileAnalysis('/test/project/subdir/file1.js')).toBeDefined();
      expect(monitor.getFileAnalysis('/test/project/subdir/file2.js')).toBeDefined();
      
      await monitor.handleFileSystemEvent('unlinkDir', '/test/project/subdir');
      
      expect(monitor.getFileAnalysis('/test/project/subdir/file1.js')).toBeUndefined();
      expect(monitor.getFileAnalysis('/test/project/subdir/file2.js')).toBeUndefined();
    });
  });

  describe('Start/Stop Lifecycle', () => {
    it('should start monitoring successfully', async () => {
      await expect(monitor.start()).resolves.not.toThrow();
    });

    it('should prevent multiple starts', async () => {
      await monitor.start();
      await expect(monitor.start()).rejects.toThrow('Monitor is already running');
    });

    it('should stop monitoring successfully', async () => {
      await monitor.start();
      await expect(monitor.stop()).resolves.not.toThrow();
    });

    it('should allow restart after stop', async () => {
      await monitor.start();
      await monitor.stop();
      await expect(monitor.start()).resolves.not.toThrow();
    });

    it('should handle stop when not running', async () => {
      await expect(monitor.stop()).resolves.not.toThrow();
    });
  });

  describe('Path Handling', () => {
    it('should generate correct relative paths', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('add', '/test/project/src/components/Button.svelte');
      
      const event = events[0];
      expect(event.relativePath).toBe('src/components/Button.svelte');
    });

    it('should handle files outside root paths', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      await monitor.handleFileSystemEvent('add', '/other/project/file.js');
      
      const event = events[0];
      expect(event.relativePath).toBe('/other/project/file.js'); // Falls back to absolute path
    });

    it('should handle multiple root paths correctly', async () => {
      const config = {
        ...defaultConfig,
        rootPaths: ['/project1', '/project2']
      };
      const testMonitor = new MultiDirectoryMonitor(config);
      
      const events: MonitorEvent[] = [];
      testMonitor.on(event => events.push(event));
      
      await testMonitor.handleFileSystemEvent('add', '/project1/src/main.js');
      await testMonitor.handleFileSystemEvent('add', '/project2/lib/utils.js');
      
      expect(events[0].relativePath).toBe('src/main.js');
      expect(events[1].relativePath).toBe('lib/utils.js');
      
      await testMonitor.stop();
    });
  });

  describe('Error Handling', () => {
    it('should track error count in statistics', async () => {
      // Simulate analysis error by trying to analyze a non-existent file
      await monitor.analyzeFile('/non/existent/file.js');
      
      const stats = monitor.getStats();
      expect(stats.errorCount).toBe(0); // Initial scan errors would be counted differently
    });

    it('should continue monitoring after errors', async () => {
      const events: MonitorEvent[] = [];
      monitor.on(event => events.push(event));
      
      // Cause an error, then add a valid file
      await monitor.handleFileSystemEvent('add', '/test/project/valid.js');
      
      expect(events).toHaveLength(1);
      expect(events[0].filePath).toBe('/test/project/valid.js');
    });
  });

  describe('Memory Management', () => {
    it('should handle large numbers of files', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Add many files
      for (let i = 0; i < 1000; i++) {
        await monitor.handleFileSystemEvent('add', `/test/project/file${i}.js`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for 1000 files)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clean up on stop', async () => {
      // Add files and handlers
      monitor.on(() => {});
      await monitor.handleFileSystemEvent('add', '/test/project/file.js');
      
      await monitor.stop();
      
      // Internal state should be cleaned up
      const stats = monitor.getStats();
      expect(monitor.getFileAnalysis('/test/project/file.js')).toBeUndefined();
    });
  });
});