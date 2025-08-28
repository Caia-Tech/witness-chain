/**
 * Advanced Code Analytics Engine for WitnessChain
 * Provides dependency analysis, complexity trends, hotspot detection, and code intelligence
 */

import type { FileAnalysis, Language, Symbol } from '../monitoring/FileAnalyzer.js';
import type { MonitorEvent } from '../monitoring/MultiDirectoryMonitor.js';

export interface DependencyRelation {
  from: string;
  to: string;
  type: 'import' | 'export' | 'dynamic_import' | 'require';
  line: number;
  strength: number; // How often this dependency is used
  isCircular: boolean;
}

export interface CodeHotspot {
  filePath: string;
  reason: 'high_complexity' | 'frequent_changes' | 'large_file' | 'many_dependencies';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  details: {
    complexity?: number;
    changeFrequency?: number;
    size?: number;
    dependencyCount?: number;
    lastModified?: Date;
  };
  recommendations: string[];
}

export interface CodeSmell {
  filePath: string;
  type: 'long_method' | 'large_class' | 'duplicate_code' | 'complex_conditional' | 'dead_code';
  severity: 'minor' | 'major' | 'critical';
  line: number;
  description: string;
  suggestion: string;
}

export interface CodePattern {
  name: string;
  type: 'design_pattern' | 'anti_pattern' | 'architectural_pattern';
  files: string[];
  confidence: number; // 0-1
  description: string;
  examples: Array<{
    file: string;
    lines: number[];
    code: string;
  }>;
}

export interface ComplexityTrend {
  timestamp: Date;
  filePath: string;
  complexity: number;
  lines: number;
  functions: number;
  classes: number;
  changeType: 'added' | 'modified' | 'deleted';
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: 'file' | 'module' | 'package';
    language: Language;
    size: number;
    complexity: number;
    centrality: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
  clusters: Array<{
    id: string;
    name: string;
    files: string[];
    cohesion: number;
  }>;
}

export interface AnalyticsConfig {
  enableDependencyTracking: boolean;
  enableHotspotDetection: boolean;
  enableCodeSmellDetection: boolean;
  enablePatternRecognition: boolean;
  complexityThreshold: number;
  hotspotScoreThreshold: number;
  trendWindowDays: number;
  maxDependencyDepth: number;
}

export interface AnalyticsReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    averageComplexity: number;
    hotspotsCount: number;
    codeSmellsCount: number;
    patternsDetected: number;
    dependenciesCount: number;
    circularDependencies: number;
  };
  hotspots: CodeHotspot[];
  codeSmells: CodeSmell[];
  patterns: CodePattern[];
  trends: ComplexityTrend[];
  dependencies: DependencyRelation[];
  recommendations: string[];
}

export class CodeAnalytics {
  private config: AnalyticsConfig;
  private fileAnalyses: Map<string, FileAnalysis> = new Map();
  private dependencyGraph: DependencyGraph;
  private complexityHistory: Map<string, ComplexityTrend[]> = new Map();
  private changeFrequency: Map<string, number> = new Map();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableDependencyTracking: true,
      enableHotspotDetection: true,
      enableCodeSmellDetection: true,
      enablePatternRecognition: true,
      complexityThreshold: 10,
      hotspotScoreThreshold: 7.5,
      trendWindowDays: 30,
      maxDependencyDepth: 5,
      ...config
    };

    this.dependencyGraph = {
      nodes: [],
      edges: [],
      clusters: []
    };
  }

  /**
   * Process a file analysis and update analytics
   */
  processFileAnalysis(analysis: FileAnalysis, event?: MonitorEvent): void {
    this.fileAnalyses.set(analysis.filePath, analysis);
    
    if (this.config.enableDependencyTracking) {
      this.updateDependencyGraph(analysis);
    }

    this.updateComplexityHistory(analysis, event);
    this.updateChangeFrequency(analysis.filePath, event);
  }

  /**
   * Generate comprehensive analytics report
   */
  generateReport(): AnalyticsReport {
    const hotspots = this.config.enableHotspotDetection ? this.detectHotspots() : [];
    const codeSmells = this.config.enableCodeSmellDetection ? this.detectCodeSmells() : [];
    const patterns = this.config.enablePatternRecognition ? this.recognizePatterns() : [];
    const dependencies = this.extractDependencies();
    const trends = this.getComplexityTrends();

    const circularDeps = dependencies.filter(d => d.isCircular).length;
    const totalComplexity = Array.from(this.fileAnalyses.values())
      .reduce((sum, analysis) => sum + (analysis.complexity || 0), 0);
    const avgComplexity = this.fileAnalyses.size > 0 ? totalComplexity / this.fileAnalyses.size : 0;

    return {
      timestamp: new Date(),
      summary: {
        totalFiles: this.fileAnalyses.size,
        averageComplexity: Math.round(avgComplexity * 100) / 100,
        hotspotsCount: hotspots.length,
        codeSmellsCount: codeSmells.length,
        patternsDetected: patterns.length,
        dependenciesCount: dependencies.length,
        circularDependencies: circularDeps
      },
      hotspots,
      codeSmells,
      patterns,
      trends,
      dependencies,
      recommendations: this.generateRecommendations(hotspots, codeSmells, patterns)
    };
  }

  /**
   * Detect code hotspots based on complexity, change frequency, and dependencies
   */
  private detectHotspots(): CodeHotspot[] {
    const hotspots: CodeHotspot[] = [];

    for (const [filePath, analysis] of this.fileAnalyses) {
      const changeFreq = this.changeFrequency.get(filePath) || 0;
      const complexity = analysis.complexity || 0;
      const size = analysis.size;
      const depCount = this.getDependencyCount(filePath);

      // Calculate hotspot score using weighted factors
      let score = 0;
      let reasons: CodeHotspot['reason'][] = [];
      
      // High complexity factor
      if (complexity > this.config.complexityThreshold) {
        score += (complexity / this.config.complexityThreshold) * 3;
        reasons.push('high_complexity');
      }

      // Change frequency factor
      if (changeFreq > 5) {
        score += Math.min(changeFreq / 5, 3) * 2;
        reasons.push('frequent_changes');
      }

      // File size factor
      if (size > 500) {
        score += Math.min(size / 500, 2) * 1.5;
        reasons.push('large_file');
      }

      // Dependency count factor
      if (depCount > 10) {
        score += Math.min(depCount / 10, 2) * 1;
        reasons.push('many_dependencies');
      }

      if (score >= this.config.hotspotScoreThreshold && reasons.length > 0) {
        hotspots.push({
          filePath,
          reason: reasons[0], // Primary reason
          severity: this.getHotspotSeverity(score),
          score: Math.round(score * 100) / 100,
          details: {
            complexity,
            changeFrequency: changeFreq,
            size,
            dependencyCount: depCount,
            lastModified: new Date()
          },
          recommendations: this.getHotspotRecommendations(reasons, score)
        });
      }
    }

    return hotspots.sort((a, b) => b.score - a.score);
  }

  /**
   * Detect code smells in analyzed files
   */
  private detectCodeSmells(): CodeSmell[] {
    const smells: CodeSmell[] = [];

    for (const [filePath, analysis] of this.fileAnalyses) {
      // Long method detection
      if (analysis.functions) {
        for (const func of analysis.functions) {
          if (func.complexity && func.complexity > 15) {
            smells.push({
              filePath,
              type: 'long_method',
              severity: func.complexity > 25 ? 'critical' : func.complexity > 20 ? 'major' : 'minor',
              line: func.line,
              description: `Function '${func.name}' has high complexity (${func.complexity})`,
              suggestion: 'Consider breaking this function into smaller, more focused functions'
            });
          }
        }
      }

      // Large class detection
      if (analysis.classes) {
        for (const cls of analysis.classes) {
          if (cls.methods && cls.methods.length > 20) {
            smells.push({
              filePath,
              type: 'large_class',
              severity: cls.methods.length > 35 ? 'critical' : cls.methods.length > 25 ? 'major' : 'minor',
              line: cls.line,
              description: `Class '${cls.name}' has too many methods (${cls.methods.length})`,
              suggestion: 'Consider splitting this class using Single Responsibility Principle'
            });
          }
        }
      }

      // Complex conditional detection
      if (analysis.complexity && analysis.complexity > 20 && analysis.lines < 100) {
        smells.push({
          filePath,
          type: 'complex_conditional',
          severity: 'major',
          line: 1,
          description: `File has high complexity (${analysis.complexity}) for its size (${analysis.lines} lines)`,
          suggestion: 'Simplify complex conditional logic and nested structures'
        });
      }
    }

    return smells;
  }

  /**
   * Recognize common code patterns and anti-patterns
   */
  private recognizePatterns(): CodePattern[] {
    const patterns: CodePattern[] = [];
    const filesByLanguage = this.groupFilesByLanguage();

    // Singleton pattern detection
    for (const [language, files] of filesByLanguage) {
      if (language === 'typescript' || language === 'javascript') {
        const singletonFiles = this.detectSingletonPattern(files);
        if (singletonFiles.length > 0) {
          patterns.push({
            name: 'Singleton Pattern',
            type: 'design_pattern',
            files: singletonFiles.map(f => f.filePath),
            confidence: 0.8,
            description: 'Singleton pattern implementation detected',
            examples: singletonFiles.map(f => ({
              file: f.filePath,
              lines: [1, 10], // Simplified
              code: 'class Singleton { private static instance: Singleton; }'
            }))
          });
        }
      }
    }

    // Observer pattern detection
    const observerFiles = this.detectObserverPattern();
    if (observerFiles.length > 0) {
      patterns.push({
        name: 'Observer Pattern',
        type: 'design_pattern',
        files: observerFiles,
        confidence: 0.7,
        description: 'Observer/Event pattern implementation detected',
        examples: []
      });
    }

    return patterns;
  }

  /**
   * Update dependency graph with new file analysis
   */
  private updateDependencyGraph(analysis: FileAnalysis): void {
    // Add or update node
    const existingNodeIndex = this.dependencyGraph.nodes.findIndex(n => n.id === analysis.filePath);
    const node = {
      id: analysis.filePath,
      label: analysis.filePath.split('/').pop() || analysis.filePath,
      type: 'file' as const,
      language: analysis.language,
      size: analysis.size,
      complexity: analysis.complexity || 0,
      centrality: 0
    };

    if (existingNodeIndex >= 0) {
      this.dependencyGraph.nodes[existingNodeIndex] = node;
    } else {
      this.dependencyGraph.nodes.push(node);
    }

    // Update edges based on imports/exports
    if (analysis.imports) {
      for (const imp of analysis.imports) {
        const targetPath = this.resolveImportPath(imp.module, analysis.filePath);
        if (targetPath && this.fileAnalyses.has(targetPath)) {
          this.addOrUpdateEdge(analysis.filePath, targetPath, 'import', 1);
        }
      }
    }
  }

  /**
   * Add or update dependency edge
   */
  private addOrUpdateEdge(source: string, target: string, type: string, weight: number): void {
    const existingEdge = this.dependencyGraph.edges.find(
      e => e.source === source && e.target === target && e.type === type
    );

    if (existingEdge) {
      existingEdge.weight += weight;
    } else {
      this.dependencyGraph.edges.push({
        source,
        target,
        type,
        weight
      });
    }
  }

  /**
   * Update complexity history for trend analysis
   */
  private updateComplexityHistory(analysis: FileAnalysis, event?: MonitorEvent): void {
    const trend: ComplexityTrend = {
      timestamp: new Date(),
      filePath: analysis.filePath,
      complexity: analysis.complexity || 0,
      lines: analysis.lines,
      functions: analysis.functions?.length || 0,
      classes: analysis.classes?.length || 0,
      changeType: event ? this.getChangeType(event) : 'modified'
    };

    const history = this.complexityHistory.get(analysis.filePath) || [];
    history.push(trend);

    // Keep only trends within the configured window
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.trendWindowDays);
    
    const filteredHistory = history.filter(t => t.timestamp >= cutoffDate);
    this.complexityHistory.set(analysis.filePath, filteredHistory);
  }

  /**
   * Update change frequency tracking
   */
  private updateChangeFrequency(filePath: string, event?: MonitorEvent): void {
    if (event && (event.type === 'file_modified' || event.type === 'file_created')) {
      const current = this.changeFrequency.get(filePath) || 0;
      this.changeFrequency.set(filePath, current + 1);
    }
  }

  /**
   * Extract all dependency relations
   */
  private extractDependencies(): DependencyRelation[] {
    const dependencies: DependencyRelation[] = [];
    
    for (const edge of this.dependencyGraph.edges) {
      const isCircular = this.detectCircularDependency(edge.source, edge.target);
      
      dependencies.push({
        from: edge.source,
        to: edge.target,
        type: edge.type as DependencyRelation['type'],
        line: 1, // Simplified
        strength: edge.weight,
        isCircular
      });
    }

    return dependencies;
  }

  /**
   * Get complexity trends for all files
   */
  private getComplexityTrends(): ComplexityTrend[] {
    const allTrends: ComplexityTrend[] = [];
    
    for (const trends of this.complexityHistory.values()) {
      allTrends.push(...trends);
    }

    return allTrends.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Helper methods
  private getHotspotSeverity(score: number): CodeHotspot['severity'] {
    if (score >= 15) return 'critical';
    if (score >= 12) return 'high';
    if (score >= 8) return 'medium';
    return 'low';
  }

  private getHotspotRecommendations(reasons: CodeHotspot['reason'][], score: number): string[] {
    const recommendations: string[] = [];
    
    if (reasons.includes('high_complexity')) {
      recommendations.push('Refactor complex functions into smaller, more focused units');
    }
    if (reasons.includes('frequent_changes')) {
      recommendations.push('Consider stabilizing this frequently changed code with better tests');
    }
    if (reasons.includes('large_file')) {
      recommendations.push('Split large file into multiple focused modules');
    }
    if (reasons.includes('many_dependencies')) {
      recommendations.push('Reduce coupling by implementing dependency inversion');
    }

    return recommendations;
  }

  private getDependencyCount(filePath: string): number {
    return this.dependencyGraph.edges.filter(e => e.source === filePath).length;
  }

  private getChangeType(event: MonitorEvent): ComplexityTrend['changeType'] {
    switch (event.type) {
      case 'file_created': return 'added';
      case 'file_deleted': return 'deleted';
      default: return 'modified';
    }
  }

  private groupFilesByLanguage(): Map<Language, FileAnalysis[]> {
    const grouped = new Map<Language, FileAnalysis[]>();
    
    for (const analysis of this.fileAnalyses.values()) {
      const files = grouped.get(analysis.language) || [];
      files.push(analysis);
      grouped.set(analysis.language, files);
    }

    return grouped;
  }

  private detectSingletonPattern(files: FileAnalysis[]): FileAnalysis[] {
    // Simplified singleton pattern detection
    return files.filter(f => 
      f.classes && f.classes.some(c => 
        c.name.toLowerCase().includes('singleton') || 
        (c.methods && c.methods.some(m => m.name === 'getInstance'))
      )
    );
  }

  private detectObserverPattern(): string[] {
    // Simplified observer pattern detection
    const observerFiles: string[] = [];
    
    for (const [filePath, analysis] of this.fileAnalyses) {
      if (analysis.functions) {
        const hasObserverMethods = analysis.functions.some(f => 
          ['subscribe', 'unsubscribe', 'notify', 'emit', 'on', 'off'].includes(f.name.toLowerCase())
        );
        if (hasObserverMethods) {
          observerFiles.push(filePath);
        }
      }
    }

    return observerFiles;
  }

  private resolveImportPath(module: string, currentFile: string): string | null {
    // Simplified import resolution
    if (module.startsWith('./') || module.startsWith('../')) {
      // Relative import - would need proper path resolution
      return null;
    }
    // For now, return null for external modules
    return null;
  }

  private detectCircularDependency(source: string, target: string): boolean {
    // Simplified circular dependency detection
    const visited = new Set<string>();
    
    const hasPath = (from: string, to: string): boolean => {
      if (visited.has(from)) return false;
      visited.add(from);
      
      const outgoingEdges = this.dependencyGraph.edges.filter(e => e.source === from);
      
      for (const edge of outgoingEdges) {
        if (edge.target === to) return true;
        if (hasPath(edge.target, to)) return true;
      }
      
      return false;
    };

    return hasPath(target, source);
  }

  private generateRecommendations(hotspots: CodeHotspot[], codeSmells: CodeSmell[], patterns: CodePattern[]): string[] {
    const recommendations: string[] = [];

    if (hotspots.length > 0) {
      recommendations.push(`Address ${hotspots.length} code hotspots to improve maintainability`);
    }

    if (codeSmells.length > 0) {
      const criticalSmells = codeSmells.filter(s => s.severity === 'critical').length;
      if (criticalSmells > 0) {
        recommendations.push(`Fix ${criticalSmells} critical code smells immediately`);
      }
    }

    const antiPatterns = patterns.filter(p => p.type === 'anti_pattern').length;
    if (antiPatterns > 0) {
      recommendations.push(`Refactor ${antiPatterns} anti-patterns to improve code quality`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Code quality is good - continue following best practices');
    }

    return recommendations;
  }

  /**
   * Get dependency graph for visualization
   */
  getDependencyGraph(): DependencyGraph {
    return { ...this.dependencyGraph };
  }

  /**
   * Get file analysis by path
   */
  getFileAnalysis(filePath: string): FileAnalysis | undefined {
    return this.fileAnalyses.get(filePath);
  }

  /**
   * Get change frequency for a file
   */
  getChangeFrequency(filePath: string): number {
    return this.changeFrequency.get(filePath) || 0;
  }

  /**
   * Get complexity history for a file
   */
  getComplexityHistory(filePath: string): ComplexityTrend[] {
    return this.complexityHistory.get(filePath) || [];
  }
}