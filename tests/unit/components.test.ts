import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RealTimeActivityFeed from '$lib/components/RealTimeActivityFeed.svelte';
import CodeMetricsChart from '$lib/components/CodeMetricsChart.svelte';
import DeveloperActivityHeatmap from '$lib/components/DeveloperActivityHeatmap.svelte';
import FileSystemTree from '$lib/components/FileSystemTree.svelte';

describe('Dashboard Components', () => {
  describe('RealTimeActivityFeed', () => {
    it('should render without events', () => {
      render(RealTimeActivityFeed);
      expect(screen.getByText('Real-time Activity')).toBeInTheDocument();
    });

    it('should display events when provided', () => {
      const events = [
        {
          id: '1',
          timestamp: '2024-01-01T10:00:00Z',
          type: 'file_modified',
          file: 'src/test.ts',
          author: 'developer',
          message: 'Modified file'
        }
      ];
      
      render(RealTimeActivityFeed, { events });
      expect(screen.getByText('Real-time Activity')).toBeInTheDocument();
    });

    it('should handle empty event list gracefully', () => {
      render(RealTimeActivityFeed, { events: [] });
      expect(screen.getByText('Real-time Activity')).toBeInTheDocument();
    });
  });

  describe('CodeMetricsChart', () => {
    it('should render chart container', () => {
      render(CodeMetricsChart);
      expect(screen.getByText('Code Metrics Over Time')).toBeInTheDocument();
    });

    it('should handle metrics data', () => {
      const metrics = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          filesChanged: 10,
          linesAdded: 250,
          linesRemoved: 50,
          commits: 3
        }
      ];
      
      render(CodeMetricsChart, { metrics });
      expect(screen.getByText('Code Metrics Over Time')).toBeInTheDocument();
    });

    it('should display no data message when metrics are empty', () => {
      render(CodeMetricsChart, { metrics: [] });
      expect(screen.getByText('No code metrics data available for the selected time range')).toBeInTheDocument();
    });
  });

  describe('DeveloperActivityHeatmap', () => {
    it('should render heatmap container', () => {
      render(DeveloperActivityHeatmap);
      expect(screen.getByText('Developer Activity Heatmap')).toBeInTheDocument();
    });

    it('should handle activity data', () => {
      const events = [
        {
          id: '1',
          timestamp: '2024-01-01T10:00:00Z',
          type: 'file_modified',
          file: 'src/test.ts',
          author: 'developer',
          message: 'Modified file'
        }
      ];
      
      render(DeveloperActivityHeatmap, { events });
      expect(screen.getByText('Developer Activity Heatmap')).toBeInTheDocument();
    });
  });

  describe('FileSystemTree', () => {
    it('should render tree container', () => {
      const mockFileStructure = {
        name: 'root',
        path: '/',
        type: 'directory' as const,
        children: []
      };
      
      render(FileSystemTree, { fileStructure: mockFileStructure });
      expect(screen.getByText('Project Structure')).toBeInTheDocument();
    });

    it('should handle file tree data', () => {
      const fileStructure = {
        name: 'src',
        path: '/src',
        type: 'directory' as const,
        children: [
          {
            name: 'components',
            path: '/src/components',
            type: 'directory' as const,
            children: [
              {
                name: 'Button.svelte',
                path: '/src/components/Button.svelte',
                type: 'file' as const,
                children: []
              }
            ]
          }
        ]
      };
      
      render(FileSystemTree, { fileStructure });
      expect(screen.getByText('Project Structure')).toBeInTheDocument();
    });

    it('should handle missing file structure gracefully', () => {
      const emptyFileStructure = {
        name: 'empty',
        path: '/empty',
        type: 'directory' as const,
        children: []
      };
      
      render(FileSystemTree, { fileStructure: emptyFileStructure });
      expect(screen.getByText('Project Structure')).toBeInTheDocument();
    });
  });
});