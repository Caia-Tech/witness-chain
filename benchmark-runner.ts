#!/usr/bin/env ts-node

/**
 * Benchmark Runner for WitnessChain
 * Executes comprehensive performance testing suite
 */

import { BenchmarkSuite } from './src/lib/testing/BenchmarkSuite';
import { generator } from './test-data/generator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

class BenchmarkRunner {
  private suite: BenchmarkSuite;
  private outputDir = './benchmark-results';

  constructor() {
    this.suite = new BenchmarkSuite();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting WitnessChain Benchmark Suite');
    console.log('=====================================\n');

    try {
      // Create output directory
      mkdirSync(this.outputDir, { recursive: true });

      // Phase 1: Generate test data
      console.log('📊 Phase 1: Generating test data...');
      await this.generateTestData();

      // Phase 2: Run benchmarks
      console.log('⚡ Phase 2: Running performance benchmarks...');
      const results = await this.runBenchmarks();

      // Phase 3: Generate reports
      console.log('📈 Phase 3: Generating reports...');
      await this.generateReports(results);

      console.log('\n✅ Benchmark suite completed successfully!');
      console.log(`📁 Results saved to: ${this.outputDir}`);

    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      process.exit(1);
    }
  }

  private async generateTestData(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await generator.generateAllTestData();
      const duration = Date.now() - startTime;
      console.log(`✅ Test data generated in ${duration}ms`);
    } catch (error) {
      console.error('Failed to generate test data:', error);
      throw error;
    }
  }

  private async runBenchmarks(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const results = await this.suite.runAllBenchmarks();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Benchmarks completed in ${duration}ms`);
      console.log(`📊 Total tests: ${this.getTotalTestCount(results)}`);
      console.log(`⚡ Average performance: ${this.getAveragePerformance(results)}`);
      
      return results;
    } catch (error) {
      console.error('Failed to run benchmarks:', error);
      throw error;
    }
  }

  private async generateReports(results: any): Promise<void> {
    try {
      // Generate JSON report
      const jsonReport = this.generateJsonReport(results);
      writeFileSync(
        join(this.outputDir, 'benchmark-results.json'),
        JSON.stringify(jsonReport, null, 2)
      );

      // Generate HTML report
      const htmlReport = this.generateHtmlReport(results);
      writeFileSync(
        join(this.outputDir, 'benchmark-report.html'),
        htmlReport
      );

      // Generate CSV report
      const csvReport = this.generateCsvReport(results);
      writeFileSync(
        join(this.outputDir, 'benchmark-data.csv'),
        csvReport
      );

      // Generate markdown summary
      const markdownReport = this.generateMarkdownReport(results);
      writeFileSync(
        join(this.outputDir, 'README.md'),
        markdownReport
      );

      console.log('✅ Reports generated successfully');
    } catch (error) {
      console.error('Failed to generate reports:', error);
      throw error;
    }
  }

  private getTotalTestCount(results: any): number {
    let total = 0;
    for (const category of Object.values(results) as any[]) {
      if (category.results && Array.isArray(category.results)) {
        total += category.results.length;
      }
    }
    return total;
  }

  private getAveragePerformance(results: any): string {
    const times: number[] = [];
    
    for (const category of Object.values(results) as any[]) {
      if (category.results && Array.isArray(category.results)) {
        for (const result of category.results) {
          if (result.executionTime) {
            times.push(result.executionTime);
          }
        }
      }
    }

    if (times.length === 0) return 'N/A';
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return `${average.toFixed(2)}ms`;
  }

  private generateJsonReport(results: any): any {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.getTotalTestCount(results),
        averagePerformance: this.getAveragePerformance(results),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      },
      results
    };
  }

  private generateHtmlReport(results: any): string {
    const summary = this.generateJsonReport(results).summary;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WitnessChain Benchmark Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f7fa;
            color: #2d3748;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        
        .header p {
            margin: 0.5rem 0 0 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .metric-card {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        
        .metric-label {
            color: #718096;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .results-section {
            background: white;
            border-radius: 10px;
            padding: 2rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
        }
        
        .results-section h2 {
            margin-top: 0;
            color: #2d3748;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
        }
        
        .chart-container {
            position: relative;
            height: 400px;
            margin: 2rem 0;
        }
        
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .test-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
        }
        
        .test-name {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #2d3748;
        }
        
        .test-metric {
            display: flex;
            justify-content: space-between;
            margin: 0.25rem 0;
            font-size: 0.9rem;
        }
        
        .test-metric .label {
            color: #718096;
        }
        
        .test-metric .value {
            color: #2d3748;
            font-weight: 500;
        }
        
        .performance-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .performance-excellent {
            background: #c6f6d5;
            color: #22543d;
        }
        
        .performance-good {
            background: #fed7d7;
            color: #c53030;
        }
        
        .performance-poor {
            background: #feb2b2;
            color: #9b2c2c;
        }
        
        .footer {
            text-align: center;
            color: #718096;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 WitnessChain Benchmark Report</h1>
        <p>Performance Analysis & Testing Results</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="summary">
        <div class="metric-card">
            <div class="metric-value">${summary.totalTests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${summary.averagePerformance}</div>
            <div class="metric-label">Avg Performance</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${summary.environment.nodeVersion}</div>
            <div class="metric-label">Node Version</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${summary.environment.memory}</div>
            <div class="metric-label">Memory Usage</div>
        </div>
    </div>

    ${this.generateHtmlResultsSection(results)}

    <div class="footer">
        <p>Generated by WitnessChain Benchmark Suite</p>
        <p>Environment: ${summary.environment.platform} (${summary.environment.arch})</p>
    </div>

    <script>
        // Add interactive charts here if needed
        ${this.generateChartScript(results)}
    </script>
</body>
</html>`;
  }

  private generateHtmlResultsSection(results: any): string {
    let html = '';
    
    for (const [categoryName, category] of Object.entries(results) as any[]) {
      if (!category.results) continue;
      
      html += `
        <div class="results-section">
            <h2>${this.formatCategoryName(categoryName)}</h2>
            <div class="chart-container">
                <canvas id="chart-${categoryName}"></canvas>
            </div>
            <div class="test-grid">
                ${category.results.map((result: any) => this.generateTestCard(result)).join('')}
            </div>
        </div>
      `;
    }
    
    return html;
  }

  private generateTestCard(result: any): string {
    const performanceBadge = this.getPerformanceBadge(result.executionTime);
    
    return `
        <div class="test-card">
            <div class="test-name">${result.name}</div>
            ${performanceBadge}
            <div class="test-metric">
                <span class="label">Execution Time:</span>
                <span class="value">${result.executionTime || 'N/A'}ms</span>
            </div>
            <div class="test-metric">
                <span class="label">Memory Used:</span>
                <span class="value">${result.memoryUsed || 'N/A'}MB</span>
            </div>
            <div class="test-metric">
                <span class="label">Success Rate:</span>
                <span class="value">${result.successRate || 'N/A'}%</span>
            </div>
        </div>
    `;
  }

  private getPerformanceBadge(executionTime: number): string {
    if (!executionTime) return '';
    
    if (executionTime < 100) {
      return '<span class="performance-badge performance-excellent">Excellent</span>';
    } else if (executionTime < 500) {
      return '<span class="performance-badge performance-good">Good</span>';
    } else {
      return '<span class="performance-badge performance-poor">Needs Improvement</span>';
    }
  }

  private formatCategoryName(name: string): string {
    return name
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateChartScript(results: any): string {
    let script = '';
    
    for (const [categoryName, category] of Object.entries(results) as any[]) {
      if (!category.results) continue;
      
      script += `
        {
          const ctx = document.getElementById('chart-${categoryName}');
          if (ctx) {
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ${JSON.stringify(category.results.map((r: any) => r.name))},
                datasets: [{
                  label: 'Execution Time (ms)',
                  data: ${JSON.stringify(category.results.map((r: any) => r.executionTime || 0))},
                  backgroundColor: 'rgba(102, 126, 234, 0.6)',
                  borderColor: 'rgba(102, 126, 234, 1)',
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Execution Time (ms)'
                    }
                  }
                }
              }
            });
          }
        }
      `;
    }
    
    return script;
  }

  private generateCsvReport(results: any): string {
    let csv = 'Category,Test Name,Execution Time (ms),Memory Used (MB),Success Rate (%),Notes\n';
    
    for (const [categoryName, category] of Object.entries(results) as any[]) {
      if (!category.results) continue;
      
      for (const result of category.results) {
        csv += `${categoryName},${result.name},${result.executionTime || ''},${result.memoryUsed || ''},${result.successRate || ''},"${result.notes || ''}"\n`;
      }
    }
    
    return csv;
  }

  private generateMarkdownReport(results: any): string {
    const summary = this.generateJsonReport(results).summary;
    
    let markdown = `# WitnessChain Benchmark Report

Generated on: ${new Date().toLocaleDateString()}

## Summary

- **Total Tests**: ${summary.totalTests}
- **Average Performance**: ${summary.averagePerformance}
- **Environment**: ${summary.environment.platform} (${summary.environment.arch})
- **Node Version**: ${summary.environment.nodeVersion}
- **Memory Usage**: ${summary.environment.memory}

## Results by Category

`;

    for (const [categoryName, category] of Object.entries(results) as any[]) {
      if (!category.results) continue;
      
      markdown += `### ${this.formatCategoryName(categoryName)}\n\n`;
      markdown += `| Test Name | Execution Time (ms) | Memory Used (MB) | Success Rate (%) |\n`;
      markdown += `|-----------|--------------------|-----------------|-----------------|\n`;
      
      for (const result of category.results) {
        markdown += `| ${result.name} | ${result.executionTime || 'N/A'} | ${result.memoryUsed || 'N/A'} | ${result.successRate || 'N/A'} |\n`;
      }
      
      markdown += '\n';
    }

    markdown += `## Performance Analysis

### Key Findings

${this.generatePerformanceAnalysis(results)}

### Recommendations

${this.generateRecommendations(results)}

---

*Generated by WitnessChain Benchmark Suite*
`;

    return markdown;
  }

  private generatePerformanceAnalysis(results: any): string {
    const analyses: string[] = [];
    
    // Analyze execution times
    const executionTimes: number[] = [];
    for (const category of Object.values(results) as any[]) {
      if (category.results) {
        for (const result of category.results) {
          if (result.executionTime) {
            executionTimes.push(result.executionTime);
          }
        }
      }
    }
    
    if (executionTimes.length > 0) {
      const min = Math.min(...executionTimes);
      const max = Math.max(...executionTimes);
      const avg = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      
      analyses.push(`- **Execution Time Range**: ${min}ms - ${max}ms`);
      analyses.push(`- **Average Execution Time**: ${avg.toFixed(2)}ms`);
      
      const fastTests = executionTimes.filter(time => time < 100).length;
      const slowTests = executionTimes.filter(time => time > 500).length;
      
      analyses.push(`- **Fast Tests** (< 100ms): ${fastTests} (${((fastTests / executionTimes.length) * 100).toFixed(1)}%)`);
      analyses.push(`- **Slow Tests** (> 500ms): ${slowTests} (${((slowTests / executionTimes.length) * 100).toFixed(1)}%)`);
    }
    
    return analyses.join('\n');
  }

  private generateRecommendations(results: any): string {
    const recommendations: string[] = [];
    
    // Analyze for slow tests
    let hasSlowTests = false;
    for (const category of Object.values(results) as any[]) {
      if (category.results) {
        for (const result of category.results) {
          if (result.executionTime && result.executionTime > 500) {
            hasSlowTests = true;
            break;
          }
        }
      }
    }
    
    if (hasSlowTests) {
      recommendations.push('- **Optimize slow tests**: Consider caching, batching, or algorithm improvements for tests > 500ms');
    }
    
    recommendations.push('- **Monitor memory usage**: Track heap usage to identify potential memory leaks');
    recommendations.push('- **Implement caching**: Add intelligent caching for frequently accessed data');
    recommendations.push('- **Consider indexing**: Optimize search performance with better indexing strategies');
    recommendations.push('- **Profile bottlenecks**: Use profiling tools to identify performance hotspots');
    
    return recommendations.join('\n');
  }
}

// Run the benchmark suite
if (require.main === module) {
  const runner = new BenchmarkRunner();
  runner.run().catch(console.error);
}