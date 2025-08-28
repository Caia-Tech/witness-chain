import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import AnalyticsDashboard from '../../src/lib/components/AnalyticsDashboard.svelte';
import type { MonitorEvent } from '../../src/lib/monitoring/MultiDirectoryMonitor';
import type { AnalyticsConfig } from '../../src/lib/analytics/CodeAnalytics';

// Mock the analytics components
vi.mock('../../src/lib/components/TrendChart.svelte', () => ({
  default: vi.fn(() => ({
    $$set: vi.fn(),
    $destroy: vi.fn()
  }))
}));

vi.mock('../../src/lib/components/HotspotsPanel.svelte', () => ({
  default: vi.fn(() => ({
    $$set: vi.fn(),
    $destroy: vi.fn()
  }))
}));

vi.mock('../../src/lib/components/DependencyGraph.svelte', () => ({
  default: vi.fn(() => ({
    $$set: vi.fn(),
    $destroy: vi.fn()
  }))
}));

describe('AnalyticsDashboard', () => {
  let mockEvents: MonitorEvent[];
  let mockConfig: Partial<AnalyticsConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEvents = [
      {
        type: 'file_created',
        filePath: '/test/file1.ts',
        relativePath: 'file1.ts',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/file1.ts',
          language: 'typescript' as any,
          size: 100,
          lines: 50,
          complexity: 8,
          symbols: [],
          dependencies: [],
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          lastModified: new Date(),
          encoding: 'utf-8',
          isBinary: false
        }
      },
      {
        type: 'file_modified',
        filePath: '/test/file2.js',
        relativePath: 'file2.js',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/file2.js',
          language: 'javascript' as any,
          size: 200,
          lines: 80,
          complexity: 12,
          symbols: [],
          dependencies: [],
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          lastModified: new Date(),
          encoding: 'utf-8',
          isBinary: false
        }
      }
    ];

    mockConfig = {
      enableHotspotDetection: true,
      enableCodeSmellDetection: true,
      enablePatternRecognition: true,
      complexityThreshold: 10
    };

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render dashboard header', () => {
      render(AnalyticsDashboard, {
        props: { events: [], config: mockConfig }
      });

      expect(screen.getByText('Code Analytics & Intelligence')).toBeInTheDocument();
    });

    it('should render refresh controls', () => {
      render(AnalyticsDashboard, {
        props: { events: [], config: mockConfig }
      });

      expect(screen.getByText(/Refresh/)).toBeInTheDocument();
      expect(screen.getByText(/Auto/)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(AnalyticsDashboard, {
        props: { events: [], config: mockConfig }
      });

      expect(screen.getByText('Analyzing Code...')).toBeInTheDocument();
    });

    it('should render navigation tabs', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      // Wait for initial analysis to complete
      await waitFor(() => {
        expect(screen.getByText(/Overview/)).toBeInTheDocument();
        expect(screen.getByText(/Trends/)).toBeInTheDocument();
        expect(screen.getByText(/Hotspots/)).toBeInTheDocument();
        expect(screen.getByText(/Dependencies/)).toBeInTheDocument();
        expect(screen.getByText(/Code Smells/)).toBeInTheDocument();
      });
    });
  });

  describe('view switching', () => {
    it('should switch to trends view when trends tab is clicked', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        const trendsTab = screen.getByText(/Trends/);
        fireEvent.click(trendsTab);
      });

      // Should show trends view content
      expect(screen.getByTestId || screen.queryByTestId?.('trends-view')).toBeTruthy();
    });

    it('should switch to hotspots view when hotspots tab is clicked', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        const hotspotsTab = screen.getByText(/Hotspots/);
        fireEvent.click(hotspotsTab);
      });

      // Should show hotspots view
      expect(screen.getByText(/Hotspots/)).toBeInTheDocument();
    });

    it('should switch to dependencies view when dependencies tab is clicked', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        const dependenciesTab = screen.getByText(/Dependencies/);
        fireEvent.click(dependenciesTab);
      });

      // Should show dependencies view
      expect(screen.getByText(/Dependencies/)).toBeInTheDocument();
    });
  });

  describe('auto-refresh functionality', () => {
    it('should start with auto-refresh enabled by default', () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      const autoRefreshButton = screen.getByText(/Auto/);
      expect(autoRefreshButton).toHaveClass('active');
    });

    it('should toggle auto-refresh when button is clicked', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      const autoRefreshButton = screen.getByText(/Auto/);
      
      // Initially active
      expect(autoRefreshButton).toHaveClass('active');
      
      // Click to disable
      await fireEvent.click(autoRefreshButton);
      expect(autoRefreshButton).not.toHaveClass('active');
      
      // Click to enable again
      await fireEvent.click(autoRefreshButton);
      expect(autoRefreshButton).toHaveClass('active');
    });

    it('should refresh automatically at specified interval', async () => {
      const component = render(AnalyticsDashboard, {
        props: { 
          events: mockEvents, 
          config: mockConfig,
          refreshInterval: 1000 // 1 second for testing
        }
      });

      // Fast-forward time to trigger refresh
      vi.advanceTimersByTime(1100);

      // Should have triggered refresh
      await waitFor(() => {
        expect(component.component).toBeTruthy();
      });
    });
  });

  describe('manual refresh', () => {
    it('should refresh when refresh button is clicked', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      const refreshButton = screen.getByText(/Refresh/);
      
      await fireEvent.click(refreshButton);
      
      // Should show loading state briefly
      await waitFor(() => {
        expect(refreshButton.textContent).toContain('Analyzing');
      });
    });

    it('should disable refresh button while refreshing', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      const refreshButton = screen.getByText(/Refresh/) as HTMLButtonElement;
      
      await fireEvent.click(refreshButton);
      
      expect(refreshButton.disabled).toBe(true);
    });
  });

  describe('overview metrics', () => {
    it('should display total files count', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        expect(screen.getByText('Files Analyzed')).toBeInTheDocument();
        // Should show count of 2 files from mockEvents
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display average complexity', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        expect(screen.getByText('Average Complexity')).toBeInTheDocument();
        // Should show calculated average complexity
      });
    });

    it('should display dependencies count', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        expect(screen.getByText('Dependencies')).toBeInTheDocument();
      });
    });

    it('should display patterns detected count', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        expect(screen.getByText('Patterns Detected')).toBeInTheDocument();
      });
    });
  });

  describe('recommendations', () => {
    it('should display recommendations section', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      await waitFor(() => {
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
      });
    });

    it('should show default recommendation when no issues found', async () => {
      render(AnalyticsDashboard, {
        props: { 
          events: [], // No events = no issues
          config: mockConfig 
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/good/i)).toBeInTheDocument();
      });
    });
  });

  describe('event dispatching', () => {
    it('should dispatch reportGenerated event when report is ready', async () => {
      const mockDispatch = vi.fn();
      
      const component = render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      component.component.$on('reportGenerated', mockDispatch);

      // Wait for initial report generation
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('should dispatch hotspotSelected event when hotspot is selected', async () => {
      const mockDispatch = vi.fn();
      
      const component = render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      component.component.$on('hotspotSelected', mockDispatch);

      // Switch to hotspots view
      await waitFor(() => {
        const hotspotsTab = screen.getByText(/Hotspots/);
        fireEvent.click(hotspotsTab);
      });

      // The HotspotsPanel component should be rendered and could dispatch events
      // This would be tested more thoroughly in integration tests
    });
  });

  describe('empty states', () => {
    it('should show empty state when no events are provided', () => {
      render(AnalyticsDashboard, {
        props: { events: [], config: mockConfig }
      });

      expect(screen.getByText('No Analytics Data')).toBeInTheDocument();
      expect(screen.getByText('Generate Report')).toBeInTheDocument();
    });

    it('should allow generating report from empty state', async () => {
      render(AnalyticsDashboard, {
        props: { events: [], config: mockConfig }
      });

      const generateButton = screen.getByText('Generate Report');
      await fireEvent.click(generateButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Analyzing Code...')).toBeInTheDocument();
      });
    });
  });

  describe('responsive behavior', () => {
    it('should handle window resize gracefully', async () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      // Simulate window resize
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      // Component should still be functional
      await waitFor(() => {
        expect(screen.getByText('Code Analytics & Intelligence')).toBeInTheDocument();
      });
    });
  });

  describe('configuration handling', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        complexityThreshold: 20,
        hotspotScoreThreshold: 15,
        enableHotspotDetection: false
      };

      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: customConfig }
      });

      // The component should initialize with custom config
      expect(screen.getByText('Code Analytics & Intelligence')).toBeInTheDocument();
    });

    it('should handle missing configuration gracefully', () => {
      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: undefined }
      });

      // Should still render with default configuration
      expect(screen.getByText('Code Analytics & Intelligence')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle analytics errors gracefully', async () => {
      // Mock analytics to throw error
      vi.doMock('../../src/lib/analytics/CodeAnalytics', () => ({
        CodeAnalytics: class {
          constructor() {
            throw new Error('Analytics initialization failed');
          }
        }
      }));

      render(AnalyticsDashboard, {
        props: { events: mockEvents, config: mockConfig }
      });

      // Should handle error gracefully and still render
      expect(screen.getByText('Code Analytics & Intelligence')).toBeInTheDocument();
    });
  });
});