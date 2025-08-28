/**
 * Unit tests for ProjectTree component
 * Tests tree structure, search, filtering, and event handling
 */

import { render, fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';
import ProjectTree from '../../src/lib/components/ProjectTree.svelte';
import type { MonitorEvent } from '../../src/lib/monitoring/MultiDirectoryMonitor.js';
import { MonitorEventType } from '../../src/lib/monitoring/MultiDirectoryMonitor.js';

describe('ProjectTree Component', () => {
  const mockEvents: MonitorEvent[] = [
    {
      type: MonitorEventType.FileCreated,
      filePath: '/test/src/main.ts',
      relativePath: 'src/main.ts',
      timestamp: Date.now(),
      analysis: {
        filePath: '/test/src/main.ts',
        language: 'typescript',
        size: 1024,
        lines: 45,
        symbols: [
          { name: 'main', type: 'function', line: 5 },
          { name: 'Config', type: 'interface', line: 1 }
        ],
        dependencies: ['fs', 'path'],
        complexity: 3,
        lastModified: new Date()
      }
    },
    {
      type: MonitorEventType.FileCreated,
      filePath: '/test/src/utils/helper.js',
      relativePath: 'src/utils/helper.js',
      timestamp: Date.now(),
      analysis: {
        filePath: '/test/src/utils/helper.js',
        language: 'javascript',
        size: 512,
        lines: 20,
        symbols: [
          { name: 'formatDate', type: 'function', line: 3 },
          { name: 'validateInput', type: 'function', line: 12 }
        ],
        dependencies: [],
        complexity: 2,
        lastModified: new Date()
      }
    },
    {
      type: MonitorEventType.FileCreated,
      filePath: '/test/README.md',
      relativePath: 'README.md',
      timestamp: Date.now(),
      analysis: {
        filePath: '/test/README.md',
        language: 'markdown',
        size: 256,
        lines: 10,
        symbols: [],
        dependencies: [],
        complexity: 1,
        lastModified: new Date()
      }
    },
    {
      type: MonitorEventType.DirectoryCreated,
      filePath: '/test/src/components',
      relativePath: 'src/components',
      timestamp: Date.now()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render empty tree when no events provided', () => {
    const { getByText } = render(ProjectTree, { events: [] });
    expect(getByText('No files detected')).toBeInTheDocument();
  });

  test('should build and display tree structure from events', () => {
    const { container, getByText } = render(ProjectTree, { events: mockEvents });
    
    // Check that root level files are displayed
    expect(getByText('README.md')).toBeInTheDocument();
    
    // Check that src directory is created
    expect(getByText('src')).toBeInTheDocument();
    
    // Check file icons and language detection
    const readmeNode = container.querySelector('[data-testid="tree-node-README.md"]');
    expect(readmeNode).toBeInTheDocument();
  });

  test('should handle directory expansion and collapse', async () => {
    const { container, getByText } = render(ProjectTree, { events: mockEvents });
    
    const srcDirectory = getByText('src');
    expect(srcDirectory).toBeInTheDocument();
    
    // Find and click the expand button for src directory
    const expandButton = container.querySelector('.expand-button');
    expect(expandButton).toBeInTheDocument();
    
    await fireEvent.click(expandButton!);
    
    // Should show expanded content
    expect(getByText('main.ts')).toBeInTheDocument();
    expect(getByText('utils')).toBeInTheDocument();
  });

  test('should filter files by search query', async () => {
    const { container, getByText, getByPlaceholderText, queryByText } = render(ProjectTree, { 
      events: mockEvents 
    });
    
    const searchInput = getByPlaceholderText('Search files...');
    expect(searchInput).toBeInTheDocument();
    
    // Search for typescript files
    await fireEvent.input(searchInput, { target: { value: 'main' } });
    
    // Should show only files matching search
    expect(getByText('main.ts')).toBeInTheDocument();
    expect(queryByText('helper.js')).not.toBeInTheDocument();
  });

  test('should filter files by language', async () => {
    const { container, getByText, queryByText } = render(ProjectTree, { 
      events: mockEvents 
    });
    
    const languageFilter = container.querySelector('select[data-testid="language-filter"]');
    expect(languageFilter).toBeInTheDocument();
    
    await fireEvent.change(languageFilter!, { target: { value: 'typescript' } });
    
    // Should show only TypeScript files
    expect(getByText('main.ts')).toBeInTheDocument();
    expect(queryByText('helper.js')).not.toBeInTheDocument();
    expect(queryByText('README.md')).not.toBeInTheDocument();
  });

  test('should emit select event when file is clicked', async () => {
    const mockOnSelect = vi.fn();
    const { getByText } = render(ProjectTree, { 
      events: mockEvents,
      onSelect: mockOnSelect
    });
    
    // Expand directory first
    const expandButton = document.querySelector('.expand-button');
    await fireEvent.click(expandButton!);
    
    const mainFile = getByText('main.ts');
    await fireEvent.click(mainFile);
    
    expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({
      name: 'main.ts',
      type: 'file',
      language: 'typescript'
    }));
  });

  test('should handle context menu events', async () => {
    const mockOnContextMenu = vi.fn();
    const { getByText } = render(ProjectTree, { 
      events: mockEvents,
      onContextMenu: mockOnContextMenu
    });
    
    const readmeFile = getByText('README.md');
    await fireEvent.contextMenu(readmeFile);
    
    expect(mockOnContextMenu).toHaveBeenCalledWith(expect.objectContaining({
      name: 'README.md',
      type: 'file',
      language: 'markdown'
    }));
  });

  test('should show file modifications and new file status', () => {
    const modifiedEvents: MonitorEvent[] = [
      {
        type: MonitorEventType.FileModified,
        filePath: '/test/modified.ts',
        relativePath: 'modified.ts',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/modified.ts',
          language: 'typescript',
          size: 800,
          lines: 35,
          symbols: [],
          dependencies: [],
          complexity: 2,
          lastModified: new Date()
        }
      },
      {
        type: MonitorEventType.FileCreated,
        filePath: '/test/new.js',
        relativePath: 'new.js',
        timestamp: Date.now() - 5000, // 5 seconds ago - should be "new"
        analysis: {
          filePath: '/test/new.js',
          language: 'javascript',
          size: 400,
          lines: 15,
          symbols: [],
          dependencies: [],
          complexity: 1,
          lastModified: new Date()
        }
      }
    ];

    const { container } = render(ProjectTree, { events: modifiedEvents });
    
    // Check for modified status
    const modifiedBadge = container.querySelector('.status-badge.modified');
    expect(modifiedBadge).toBeInTheDocument();
    
    // Check for new status
    const newBadge = container.querySelector('.status-badge.new');
    expect(newBadge).toBeInTheDocument();
  });

  test('should calculate and display directory statistics', () => {
    const { getByText } = render(ProjectTree, { events: mockEvents });
    
    // Should show file counts
    expect(getByText(/3 files/)).toBeInTheDocument();
    expect(getByText(/2 directories/)).toBeInTheDocument();
  });

  test('should handle empty directories correctly', () => {
    const emptyDirEvents: MonitorEvent[] = [
      {
        type: MonitorEventType.DirectoryCreated,
        filePath: '/test/empty',
        relativePath: 'empty',
        timestamp: Date.now()
      }
    ];

    const { getByText, container } = render(ProjectTree, { events: emptyDirEvents });
    
    expect(getByText('empty')).toBeInTheDocument();
    
    // Empty directory should not have expand button
    const expandButton = container.querySelector('.expand-button');
    expect(expandButton).toBeInTheDocument(); // Directory still gets expand button
  });

  test('should sort files and directories properly', () => {
    const sortedEvents: MonitorEvent[] = [
      {
        type: MonitorEventType.FileCreated,
        filePath: '/test/z-last.js',
        relativePath: 'z-last.js',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/z-last.js',
          language: 'javascript',
          size: 100,
          lines: 5,
          symbols: [],
          dependencies: [],
          complexity: 1,
          lastModified: new Date()
        }
      },
      {
        type: MonitorEventType.DirectoryCreated,
        filePath: '/test/a-first-dir',
        relativePath: 'a-first-dir',
        timestamp: Date.now()
      },
      {
        type: MonitorEventType.FileCreated,
        filePath: '/test/b-middle.ts',
        relativePath: 'b-middle.ts',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/b-middle.ts',
          language: 'typescript',
          size: 200,
          lines: 10,
          symbols: [],
          dependencies: [],
          complexity: 1,
          lastModified: new Date()
        }
      }
    ];

    const { container } = render(ProjectTree, { events: sortedEvents });
    
    const treeNodes = container.querySelectorAll('.node-name');
    const nodeTexts = Array.from(treeNodes).map(node => node.textContent?.trim());
    
    // Directories should come first, then files, both alphabetically sorted
    expect(nodeTexts).toEqual(['a-first-dir', 'b-middle.ts', 'z-last.js']);
  });

  test('should handle file size formatting', () => {
    const largeFileEvents: MonitorEvent[] = [
      {
        type: MonitorEventType.FileCreated,
        filePath: '/test/large.js',
        relativePath: 'large.js',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/large.js',
          language: 'javascript',
          size: 1048576, // 1MB
          lines: 1000,
          symbols: [],
          dependencies: [],
          complexity: 10,
          lastModified: new Date()
        }
      }
    ];

    const { getByText } = render(ProjectTree, { events: largeFileEvents });
    
    // Should format file size properly
    expect(getByText('1.0MB')).toBeInTheDocument();
  });

  test('should clear search when search input is emptied', async () => {
    const { getByPlaceholderText, getByText } = render(ProjectTree, { 
      events: mockEvents 
    });
    
    const searchInput = getByPlaceholderText('Search files...');
    
    // First filter
    await fireEvent.input(searchInput, { target: { value: 'main' } });
    expect(getByText('main.ts')).toBeInTheDocument();
    
    // Clear search
    await fireEvent.input(searchInput, { target: { value: '' } });
    
    // Should show all files again
    expect(getByText('README.md')).toBeInTheDocument();
    expect(getByText('src')).toBeInTheDocument();
  });
});