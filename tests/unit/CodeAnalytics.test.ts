import { describe, it, expect, beforeEach } from 'vitest';
import { CodeAnalytics } from '../../src/lib/analytics/CodeAnalytics';
import type { FileAnalysis, Language, ImportExport, FunctionInfo, ClassInfo } from '../../src/lib/monitoring/FileAnalyzer';
import type { MonitorEvent, MonitorEventType } from '../../src/lib/monitoring/MultiDirectoryMonitor';

describe('CodeAnalytics', () => {
  let analytics: CodeAnalytics;

  beforeEach(() => {
    analytics = new CodeAnalytics();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(analytics).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customAnalytics = new CodeAnalytics({
        complexityThreshold: 20,
        hotspotScoreThreshold: 10,
        enableHotspotDetection: false
      });
      expect(customAnalytics).toBeDefined();
    });
  });

  describe('processFileAnalysis', () => {
    const mockAnalysis: FileAnalysis = {
      filePath: '/test/file.ts',
      language: 'typescript' as Language,
      size: 500,
      lines: 50,
      complexity: 8,
      symbols: [],
      dependencies: ['lodash'],
      imports: [{
        module: 'lodash',
        type: 'import',
        specifiers: ['map', 'filter'],
        line: 1,
        isDefault: false,
        isNamespace: false
      }] as ImportExport[],
      exports: [{
        module: '',
        type: 'export',
        specifiers: ['TestClass'],
        line: 10,
        isDefault: false,
        isNamespace: false
      }] as ImportExport[],
      functions: [{
        name: 'testFunction',
        line: 5,
        params: ['param1', 'param2'],
        complexity: 3,
        isAsync: false,
        isExported: true
      }] as FunctionInfo[],
      classes: [{
        name: 'TestClass',
        line: 10,
        methods: [{
          name: 'testMethod',
          line: 12,
          params: [],
          complexity: 2,
          isAsync: false,
          isExported: false
        }] as FunctionInfo[],
        properties: ['prop1'],
        isExported: true,
        extends: undefined,
        implements: []
      }] as ClassInfo[],
      lastModified: new Date(),
      encoding: 'utf-8',
      isBinary: false
    };

    const mockEvent: MonitorEvent = {
      type: 'file_created' as MonitorEventType,
      filePath: '/test/file.ts',
      relativePath: 'file.ts',
      analysis: mockAnalysis,
      timestamp: Date.now()
    };

    it('should process file analysis successfully', () => {
      expect(() => analytics.processFileAnalysis(mockAnalysis, mockEvent)).not.toThrow();
    });

    it('should update internal state when processing analysis', () => {
      analytics.processFileAnalysis(mockAnalysis, mockEvent);
      const fileAnalysis = analytics.getFileAnalysis('/test/file.ts');
      expect(fileAnalysis).toEqual(mockAnalysis);
    });
  });

  describe('generateReport', () => {
    const setupAnalytics = () => {
      const analyses = [
        createMockAnalysis('/src/utils.ts', 15, 100, 'typescript'),
        createMockAnalysis('/src/complex.ts', 25, 200, 'typescript'),
        createMockAnalysis('/src/simple.js', 5, 50, 'javascript'),
      ];

      analyses.forEach(analysis => {
        analytics.processFileAnalysis(analysis);
      });
    };

    it('should generate report with summary', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report).toBeDefined();
      expect(report.summary.totalFiles).toBe(3);
      expect(report.summary.averageComplexity).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should include hotspots in report', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report.hotspots).toBeDefined();
      expect(Array.isArray(report.hotspots)).toBe(true);
    });

    it('should include code smells in report', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report.codeSmells).toBeDefined();
      expect(Array.isArray(report.codeSmells)).toBe(true);
    });

    it('should include patterns in report', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report.patterns).toBeDefined();
      expect(Array.isArray(report.patterns)).toBe(true);
    });

    it('should include trends in report', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report.trends).toBeDefined();
      expect(Array.isArray(report.trends)).toBe(true);
    });

    it('should include dependencies in report', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report.dependencies).toBeDefined();
      expect(Array.isArray(report.dependencies)).toBe(true);
    });

    it('should include recommendations in report', () => {
      setupAnalytics();
      const report = analytics.generateReport();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('hotspot detection', () => {
    it('should detect high complexity hotspots', () => {
      const highComplexityAnalysis = createMockAnalysis('/src/complex.ts', 30, 100, 'typescript');
      analytics.processFileAnalysis(highComplexityAnalysis);

      const report = analytics.generateReport();
      const complexityHotspots = report.hotspots.filter(h => h.reason === 'high_complexity');
      
      expect(complexityHotspots.length).toBeGreaterThan(0);
      expect(complexityHotspots[0].severity).toBe('high');
    });

    it('should detect large file hotspots', () => {
      const largeFileAnalysis = createMockAnalysis('/src/large.ts', 10, 600, 'typescript');
      analytics.processFileAnalysis(largeFileAnalysis);

      const report = analytics.generateReport();
      const sizeHotspots = report.hotspots.filter(h => h.reason === 'large_file');
      
      expect(sizeHotspots.length).toBeGreaterThan(0);
    });

    it('should calculate hotspot scores correctly', () => {
      const analysis = createMockAnalysis('/src/test.ts', 20, 400, 'typescript');
      analytics.processFileAnalysis(analysis);

      const report = analytics.generateReport();
      
      if (report.hotspots.length > 0) {
        expect(report.hotspots[0].score).toBeGreaterThan(0);
        expect(typeof report.hotspots[0].score).toBe('number');
      }
    });
  });

  describe('code smell detection', () => {
    it('should detect long method smells', () => {
      const analysis = createMockAnalysis('/src/test.ts', 10, 100, 'typescript', {
        functions: [{
          name: 'veryComplexFunction',
          line: 10,
          params: ['a', 'b', 'c', 'd', 'e'],
          complexity: 20,
          isAsync: false,
          isExported: true
        }]
      });
      analytics.processFileAnalysis(analysis);

      const report = analytics.generateReport();
      const longMethodSmells = report.codeSmells.filter(s => s.type === 'long_method');
      
      expect(longMethodSmells.length).toBeGreaterThan(0);
      expect(longMethodSmells[0].severity).toBeDefined();
    });

    it('should detect large class smells', () => {
      const largeMethods = Array.from({ length: 25 }, (_, i) => ({
        name: `method${i}`,
        line: i + 5,
        params: [],
        complexity: 2,
        isAsync: false,
        isExported: false
      }));

      const analysis = createMockAnalysis('/src/test.ts', 10, 200, 'typescript', {
        classes: [{
          name: 'LargeClass',
          line: 1,
          methods: largeMethods,
          properties: ['prop1', 'prop2'],
          isExported: true
        }]
      });
      analytics.processFileAnalysis(analysis);

      const report = analytics.generateReport();
      const largeClassSmells = report.codeSmells.filter(s => s.type === 'large_class');
      
      expect(largeClassSmells.length).toBeGreaterThan(0);
    });

    it('should detect complex conditional smells', () => {
      const analysis = createMockAnalysis('/src/test.ts', 25, 80, 'typescript');
      analytics.processFileAnalysis(analysis);

      const report = analytics.generateReport();
      const complexConditionalSmells = report.codeSmells.filter(s => s.type === 'complex_conditional');
      
      expect(complexConditionalSmells.length).toBeGreaterThan(0);
    });
  });

  describe('pattern recognition', () => {
    it('should detect singleton pattern', () => {
      const singletonAnalysis = createMockAnalysis('/src/singleton.ts', 5, 50, 'typescript', {
        classes: [{
          name: 'DatabaseConnection',
          line: 1,
          methods: [{
            name: 'getInstance',
            line: 5,
            params: [],
            complexity: 2,
            isAsync: false,
            isExported: false
          }],
          properties: ['instance'],
          isExported: true
        }]
      });
      analytics.processFileAnalysis(singletonAnalysis);

      const report = analytics.generateReport();
      const singletonPatterns = report.patterns.filter(p => p.name.includes('Singleton'));
      
      expect(singletonPatterns.length).toBeGreaterThan(0);
    });

    it('should detect observer pattern', () => {
      const observerAnalysis = createMockAnalysis('/src/observer.ts', 8, 80, 'typescript', {
        functions: [
          {
            name: 'subscribe',
            line: 5,
            params: ['callback'],
            complexity: 2,
            isAsync: false,
            isExported: true
          },
          {
            name: 'notify',
            line: 10,
            params: ['data'],
            complexity: 3,
            isAsync: false,
            isExported: true
          }
        ]
      });
      analytics.processFileAnalysis(observerAnalysis);

      const report = analytics.generateReport();
      const observerPatterns = report.patterns.filter(p => p.name.includes('Observer'));
      
      expect(observerPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('dependency tracking', () => {
    it('should track import dependencies', () => {
      const analysisWithImports = createMockAnalysis('/src/test.ts', 5, 50, 'typescript', {
        imports: [
          {
            module: 'lodash',
            type: 'import',
            specifiers: ['map', 'filter'],
            line: 1,
            isDefault: false,
            isNamespace: false
          },
          {
            module: './utils',
            type: 'import',
            specifiers: ['helper'],
            line: 2,
            isDefault: false,
            isNamespace: false
          }
        ]
      });
      analytics.processFileAnalysis(analysisWithImports);

      const dependencyGraph = analytics.getDependencyGraph();
      
      expect(dependencyGraph.nodes.length).toBeGreaterThan(0);
      expect(dependencyGraph.edges.length).toBeGreaterThan(0);
    });

    it('should track export dependencies', () => {
      const analysisWithExports = createMockAnalysis('/src/test.ts', 5, 50, 'typescript', {
        exports: [
          {
            module: '',
            type: 'export',
            specifiers: ['TestFunction'],
            line: 10,
            isDefault: false,
            isNamespace: false
          },
          {
            module: '',
            type: 'export',
            specifiers: ['default'],
            line: 15,
            isDefault: true,
            isNamespace: false
          }
        ]
      });
      analytics.processFileAnalysis(analysisWithExports);

      const dependencyGraph = analytics.getDependencyGraph();
      
      expect(dependencyGraph.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('complexity trend analysis', () => {
    it('should track complexity changes over time', () => {
      const analysis1 = createMockAnalysis('/src/test.ts', 10, 100, 'typescript');
      const analysis2 = { ...analysis1, complexity: 15, timestamp: new Date(Date.now() + 1000) };

      analytics.processFileAnalysis(analysis1);
      analytics.processFileAnalysis(analysis2);

      const history = analytics.getComplexityHistory('/src/test.ts');
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].complexity).toBeDefined();
    });

    it('should track change frequency', () => {
      const analysis = createMockAnalysis('/src/test.ts', 5, 50, 'typescript');
      const event: MonitorEvent = {
        type: 'file_modified' as MonitorEventType,
        filePath: '/src/test.ts',
        relativePath: 'test.ts',
        timestamp: Date.now()
      };

      analytics.processFileAnalysis(analysis, event);
      analytics.processFileAnalysis(analysis, event);

      const changeFreq = analytics.getChangeFrequency('/src/test.ts');
      
      expect(changeFreq).toBeGreaterThan(0);
    });
  });

  // Helper function to create mock analyses
  function createMockAnalysis(
    filePath: string, 
    complexity: number, 
    lines: number, 
    language: string,
    overrides: Partial<FileAnalysis> = {}
  ): FileAnalysis {
    return {
      filePath,
      language: language as Language,
      size: lines * 10,
      lines,
      complexity,
      symbols: [],
      dependencies: [],
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      lastModified: new Date(),
      encoding: 'utf-8',
      isBinary: false,
      ...overrides
    };
  }
});

describe('CodeAnalytics Integration', () => {
  it('should handle a complete analysis workflow', () => {
    const analytics = new CodeAnalytics({
      complexityThreshold: 10,
      hotspotScoreThreshold: 5,
      enableHotspotDetection: true,
      enableCodeSmellDetection: true,
      enablePatternRecognition: true
    });

    // Simulate analyzing multiple files
    const files = [
      {
        path: '/src/components/Button.tsx',
        complexity: 8,
        lines: 120,
        language: 'typescript'
      },
      {
        path: '/src/utils/helpers.ts',
        complexity: 15,
        lines: 200,
        language: 'typescript'
      },
      {
        path: '/src/services/api.js',
        complexity: 20,
        lines: 300,
        language: 'javascript'
      }
    ];

    files.forEach(file => {
      const analysis = createMockAnalysis(
        file.path,
        file.complexity,
        file.lines,
        file.language
      );
      analytics.processFileAnalysis(analysis);
    });

    // Generate comprehensive report
    const report = analytics.generateReport();

    // Verify all components are working together
    expect(report.summary.totalFiles).toBe(3);
    expect(report.summary.averageComplexity).toBeCloseTo(14.33, 1);
    expect(report.hotspots.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.timestamp).toBeInstanceOf(Date);
  });

  function createMockAnalysis(
    filePath: string,
    complexity: number,
    lines: number,
    language: string
  ): FileAnalysis {
    return {
      filePath,
      language: language as Language,
      size: lines * 10,
      lines,
      complexity,
      symbols: [],
      dependencies: [],
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      lastModified: new Date(),
      encoding: 'utf-8',
      isBinary: false
    };
  }
});