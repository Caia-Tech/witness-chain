/**
 * Unit tests for ActivityFeed component
 * Tests real-time activity display, filtering, and interaction
 */

import { render, fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';
import ActivityFeed from '../../src/lib/components/ActivityFeed.svelte';
import type { MonitorEvent } from '../../src/lib/monitoring/MultiDirectoryMonitor.js';
import { MonitorEventType } from '../../src/lib/monitoring/MultiDirectoryMonitor.js';

describe('ActivityFeed Component', () => {
  const mockEvents: MonitorEvent[] = [
    {
      type: MonitorEventType.FileCreated,
      filePath: '/test/new-file.ts',
      relativePath: 'new-file.ts',
      timestamp: Date.now() - 1000,
      analysis: {
        filePath: '/test/new-file.ts',
        language: 'typescript',
        size: 1024,
        lines: 45,
        symbols: [
          { name: 'TestFunction', type: 'function', line: 5 },
          { name: 'TestInterface', type: 'interface', line: 1 }
        ],
        dependencies: ['fs', 'path'],
        complexity: 3,
        lastModified: new Date()
      }
    },
    {
      type: MonitorEventType.FileModified,
      filePath: '/test/modified-file.js',
      relativePath: 'modified-file.js',
      timestamp: Date.now() - 2000,
      analysis: {
        filePath: '/test/modified-file.js',
        language: 'javascript',
        size: 800,
        lines: 35,
        symbols: [
          { name: 'modifiedFunction', type: 'function', line: 3 }
        ],
        dependencies: [],
        complexity: 2,
        lastModified: new Date()
      },
      previousAnalysis: {
        filePath: '/test/modified-file.js',
        language: 'javascript',
        size: 600,
        lines: 30,
        symbols: [
          { name: 'modifiedFunction', type: 'function', line: 3 }
        ],
        dependencies: [],
        complexity: 1,
        lastModified: new Date(Date.now() - 60000)
      }
    },
    {
      type: MonitorEventType.FileDeleted,
      filePath: '/test/deleted-file.py',
      relativePath: 'deleted-file.py',
      timestamp: Date.now() - 3000
    },
    {
      type: MonitorEventType.DirectoryCreated,
      filePath: '/test/new-dir',
      relativePath: 'new-dir',
      timestamp: Date.now() - 4000
    },
    {
      type: MonitorEventType.Error,
      filePath: '/test/error-file.rs',
      relativePath: 'error-file.rs',
      timestamp: Date.now() - 5000
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render empty state when no events provided', () => {
    const { getByText } = render(ActivityFeed, { events: [] });
    
    expect(getByText('No activity to display')).toBeInTheDocument();
    expect(getByText('File changes will appear here in real-time')).toBeInTheDocument();
  });

  test('should display events in reverse chronological order (newest first)', () => {
    const { container } = render(ActivityFeed, { events: mockEvents });
    
    const eventItems = container.querySelectorAll('.event-item');
    expect(eventItems).toHaveLength(5);
    
    // First event should be the most recent (FileCreated)
    const firstEvent = eventItems[0];
    expect(firstEvent.textContent).toContain('new-file.ts');
    expect(firstEvent.textContent).toContain('file created');
  });

  test('should show correct event icons and colors for different event types', () => {
    const { container } = render(ActivityFeed, { events: mockEvents });
    
    const eventItems = container.querySelectorAll('.event-item');
    
    // Check icons are present
    expect(container.textContent).toContain('➕'); // File created
    expect(container.textContent).toContain('✏️'); // File modified
    expect(container.textContent).toContain('🗑️'); // File deleted
    expect(container.textContent).toContain('📁'); // Directory created
    expect(container.textContent).toContain('⚠️'); // Error
  });

  test('should display language badges for files with analysis', () => {
    const { getByText, container } = render(ActivityFeed, { events: mockEvents });
    
    expect(getByText('typescript')).toBeInTheDocument();
    expect(getByText('javascript')).toBeInTheDocument();
    
    const languageBadges = container.querySelectorAll('.language-badge');
    expect(languageBadges).toHaveLength(2); // Two events have analysis with language
  });

  test('should format timestamps correctly', () => {
    const { container } = render(ActivityFeed, { events: mockEvents });
    
    // Should show relative time like "just now", "1m ago", etc.
    expect(container.textContent).toContain('just now');
  });

  test('should expand event details when expand button is clicked', async () => {
    const { container } = render(ActivityFeed, { events: mockEvents });
    
    const expandButton = container.querySelector('.expand-button');
    expect(expandButton).toBeInTheDocument();
    
    await fireEvent.click(expandButton!);
    
    // Should show expanded details
    expect(container.querySelector('.event-details')).toBeInTheDocument();
    expect(container.textContent).toContain('Lines:');
    expect(container.textContent).toContain('Complexity:');
    expect(container.textContent).toContain('Symbols:');
  });

  test('should show analysis information in expanded view', async () => {
    const { container, getByText } = render(ActivityFeed, { events: mockEvents });
    
    const expandButton = container.querySelector('.expand-button');
    await fireEvent.click(expandButton!);
    
    // Check analysis details are shown
    expect(getByText('45')).toBeInTheDocument(); // Lines count
    expect(getByText('3')).toBeInTheDocument(); // Complexity
    expect(getByText('TestFunction')).toBeInTheDocument(); // Symbol name
    expect(getByText('TestInterface')).toBeInTheDocument(); // Symbol name
  });

  test('should show diff information for modified files', async () => {
    const { container } = render(ActivityFeed, { 
      events: mockEvents,
      showDiffs: true 
    });
    
    // Find modified file event and expand it
    const eventItems = container.querySelectorAll('.event-item');
    const modifiedEvent = Array.from(eventItems).find(item => 
      item.textContent?.includes('modified-file.js')
    );
    
    expect(modifiedEvent).toBeDefined();
    
    const expandButton = modifiedEvent?.querySelector('.expand-button');
    await fireEvent.click(expandButton!);
    
    // Should show diff stats
    expect(container.textContent).toContain('Changes:');
    expect(container.textContent).toContain('+5 lines'); // 35 - 30 = 5
    expect(container.textContent).toContain('+1 complexity'); // 2 - 1 = 1
  });

  test('should filter events by type when filter buttons are clicked', async () => {
    const { container } = render(ActivityFeed, { events: mockEvents });
    
    // Initially should show all 5 events
    let eventItems = container.querySelectorAll('.event-item');
    expect(eventItems).toHaveLength(5);
    
    // Click the file created filter to toggle it off
    const filterButtons = container.querySelectorAll('.filter-button');
    const createdFilterButton = filterButtons[0]; // First button is file_created
    
    await fireEvent.click(createdFilterButton);
    
    // Should now show 4 events (excluding file_created)
    eventItems = container.querySelectorAll('.event-item');
    expect(eventItems).toHaveLength(4);
    
    // Should not contain the created file event
    expect(container.textContent).not.toContain('new-file.ts');
  });

  test('should emit eventSelect when event is clicked', async () => {
    const mockEventSelect = vi.fn();
    const component = render(ActivityFeed, { events: mockEvents });
    
    component.component.$on('eventSelect', mockEventSelect);
    
    const eventItem = component.container.querySelector('.event-item');
    await fireEvent.click(eventItem!);
    
    expect(mockEventSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          event: expect.objectContaining({
            type: MonitorEventType.FileCreated,
            filePath: '/test/new-file.ts'
          })
        })
      })
    );
  });

  test('should emit fileSelect when file link is clicked', async () => {
    const mockFileSelect = vi.fn();
    const component = render(ActivityFeed, { events: mockEvents });
    
    component.component.$on('fileSelect', mockFileSelect);
    
    const fileLink = component.container.querySelector('.file-link');
    await fireEvent.click(fileLink!);
    
    expect(mockFileSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          filePath: '/test/new-file.ts'
        })
      })
    );
  });

  test('should respect maxEvents limit', () => {
    const manyEvents = Array.from({ length: 20 }, (_, i) => ({
      type: MonitorEventType.FileCreated,
      filePath: `/test/file-${i}.ts`,
      relativePath: `file-${i}.ts`,
      timestamp: Date.now() - i * 1000
    }));

    const { container } = render(ActivityFeed, { 
      events: manyEvents,
      maxEvents: 10
    });
    
    const eventItems = container.querySelectorAll('.event-item');
    expect(eventItems).toHaveLength(10);
  });

  test('should toggle showDiffs option', async () => {
    const { container, getByLabelText } = render(ActivityFeed, { 
      events: mockEvents,
      showDiffs: true
    });
    
    const diffsToggle = getByLabelText('Show diffs');
    expect(diffsToggle).toBeChecked();
    
    await fireEvent.click(diffsToggle);
    expect(diffsToggle).not.toBeChecked();
  });

  test('should toggle autoScroll option', async () => {
    const { getByLabelText } = render(ActivityFeed, { 
      events: mockEvents,
      autoScroll: true
    });
    
    const autoScrollToggle = getByLabelText('Auto-scroll');
    expect(autoScrollToggle).toBeChecked();
    
    await fireEvent.click(autoScrollToggle);
    expect(autoScrollToggle).not.toBeChecked();
  });

  test('should show correct event statistics in footer', () => {
    const { getByText } = render(ActivityFeed, { events: mockEvents });
    
    expect(getByText('5')).toBeInTheDocument(); // Total events
    expect(getByText('5')).toBeInTheDocument(); // Showing (same as total when no filters)
  });

  test('should handle events without analysis gracefully', () => {
    const eventsWithoutAnalysis = [
      {
        type: MonitorEventType.FileDeleted,
        filePath: '/test/deleted.txt',
        relativePath: 'deleted.txt',
        timestamp: Date.now()
      }
    ];

    const { container, getByText } = render(ActivityFeed, { 
      events: eventsWithoutAnalysis 
    });
    
    expect(getByText('deleted.txt')).toBeInTheDocument();
    
    // Should not have expand button since no analysis
    const expandButton = container.querySelector('.expand-button');
    expect(expandButton).toBeNull();
  });

  test('should display symbols correctly with "more" indicator', async () => {
    const eventWithManySymbols = {
      ...mockEvents[0],
      analysis: {
        ...mockEvents[0].analysis!,
        symbols: [
          { name: 'Symbol1', type: 'function', line: 1 },
          { name: 'Symbol2', type: 'function', line: 2 },
          { name: 'Symbol3', type: 'function', line: 3 },
          { name: 'Symbol4', type: 'function', line: 4 },
          { name: 'Symbol5', type: 'function', line: 5 }
        ]
      }
    };

    const { container } = render(ActivityFeed, { events: [eventWithManySymbols] });
    
    const expandButton = container.querySelector('.expand-button');
    await fireEvent.click(expandButton!);
    
    // Should show first 3 symbols plus "more" indicator
    expect(container.textContent).toContain('Symbol1');
    expect(container.textContent).toContain('Symbol2');
    expect(container.textContent).toContain('Symbol3');
    expect(container.textContent).toContain('+2 more');
  });

  test('should format complexity levels with correct styling', async () => {
    const eventsWithDifferentComplexity = [
      {
        ...mockEvents[0],
        analysis: { ...mockEvents[0].analysis!, complexity: 2 } // low
      },
      {
        ...mockEvents[1],
        analysis: { ...mockEvents[1].analysis!, complexity: 7 } // medium
      },
      {
        type: MonitorEventType.FileCreated,
        filePath: '/test/complex.ts',
        relativePath: 'complex.ts',
        timestamp: Date.now(),
        analysis: {
          filePath: '/test/complex.ts',
          language: 'typescript',
          size: 2000,
          lines: 100,
          symbols: [],
          dependencies: [],
          complexity: 15, // high
          lastModified: new Date()
        }
      }
    ];

    const { container } = render(ActivityFeed, { events: eventsWithDifferentComplexity });
    
    // Expand all events to check complexity styling
    const expandButtons = container.querySelectorAll('.expand-button');
    for (const button of expandButtons) {
      await fireEvent.click(button);
    }
    
    expect(container.querySelector('.complexity-low')).toBeInTheDocument();
    expect(container.querySelector('.complexity-medium')).toBeInTheDocument();
    expect(container.querySelector('.complexity-high')).toBeInTheDocument();
  });

  test('should handle keyboard navigation for event items', async () => {
    const mockEventSelect = vi.fn();
    const component = render(ActivityFeed, { events: mockEvents });
    
    component.component.$on('eventSelect', mockEventSelect);
    
    const eventItem = component.container.querySelector('.event-item');
    
    await fireEvent.keyDown(eventItem!, { key: 'Enter' });
    
    expect(mockEventSelect).toHaveBeenCalled();
  });

  test('should stop event propagation when expand button is clicked', async () => {
    const mockEventSelect = vi.fn();
    const component = render(ActivityFeed, { events: mockEvents });
    
    component.component.$on('eventSelect', mockEventSelect);
    
    const expandButton = component.container.querySelector('.expand-button');
    await fireEvent.click(expandButton!);
    
    // Event select should not be triggered when expand button is clicked
    expect(mockEventSelect).not.toHaveBeenCalled();
  });

  test('should show file size when available', () => {
    const eventWithSize = {
      ...mockEvents[0],
      size: 2048 // 2KB
    };

    const { getByText } = render(ActivityFeed, { events: [eventWithSize] });
    
    expect(getByText('2.0KB')).toBeInTheDocument();
  });
});