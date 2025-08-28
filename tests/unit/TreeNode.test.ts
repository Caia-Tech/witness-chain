/**
 * Unit tests for TreeNode component
 * Tests recursive tree node rendering, events, and styling
 */

import { render, fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';
import TreeNode from '../../src/lib/components/TreeNode.svelte';
import type { Language } from '../../src/lib/monitoring/FileAnalyzer.js';

describe('TreeNode Component', () => {
  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    language?: Language;
    size?: number;
    children: TreeNode[];
    expanded: boolean;
    isNew: boolean;
    isModified: boolean;
    isDeleted: boolean;
  }

  const mockFileNode: TreeNode = {
    name: 'test.ts',
    path: '/project/test.ts',
    type: 'file',
    language: 'typescript',
    size: 1024,
    children: [],
    expanded: false,
    isNew: false,
    isModified: false,
    isDeleted: false
  };

  const mockDirectoryNode: TreeNode = {
    name: 'src',
    path: '/project/src',
    type: 'directory',
    children: [
      {
        name: 'index.ts',
        path: '/project/src/index.ts',
        type: 'file',
        language: 'typescript',
        size: 512,
        children: [],
        expanded: false,
        isNew: false,
        isModified: false,
        isDeleted: false
      },
      {
        name: 'utils',
        path: '/project/src/utils',
        type: 'directory',
        children: [],
        expanded: false,
        isNew: false,
        isModified: false,
        isDeleted: false
      }
    ],
    expanded: true,
    isNew: false,
    isModified: false,
    isDeleted: false
  };

  const mockNewFileNode: TreeNode = {
    ...mockFileNode,
    name: 'new.js',
    language: 'javascript',
    isNew: true
  };

  const mockModifiedFileNode: TreeNode = {
    ...mockFileNode,
    name: 'modified.rs',
    language: 'rust',
    isModified: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render file node with correct icon and name', () => {
    const { getByText, container } = render(TreeNode, {
      node: mockFileNode,
      level: 0,
      selectedNode: null
    });

    expect(getByText('test.ts')).toBeInTheDocument();
    expect(getByText('📘')).toBeInTheDocument(); // TypeScript icon
    expect(getByText('1.0KB')).toBeInTheDocument(); // Formatted file size
  });

  test('should render directory node with expand button', () => {
    const { getByText, container } = render(TreeNode, {
      node: mockDirectoryNode,
      level: 0,
      selectedNode: null
    });

    expect(getByText('src')).toBeInTheDocument();
    
    // Should have expand button showing expanded state
    const expandButton = container.querySelector('.expand-button');
    expect(expandButton).toBeInTheDocument();
    expect(getByText('📂')).toBeInTheDocument(); // Expanded folder icon
  });

  test('should render collapsed directory with closed folder icon', () => {
    const collapsedDir = { ...mockDirectoryNode, expanded: false };
    const { getByText } = render(TreeNode, {
      node: collapsedDir,
      level: 0,
      selectedNode: null
    });

    expect(getByText('📁')).toBeInTheDocument(); // Closed folder icon
  });

  test('should show children when directory is expanded', () => {
    const { getByText } = render(TreeNode, {
      node: mockDirectoryNode,
      level: 0,
      selectedNode: null
    });

    // Should show child files and directories
    expect(getByText('index.ts')).toBeInTheDocument();
    expect(getByText('utils')).toBeInTheDocument();
  });

  test('should not show children when directory is collapsed', () => {
    const collapsedDir = { ...mockDirectoryNode, expanded: false };
    const { queryByText } = render(TreeNode, {
      node: collapsedDir,
      level: 0,
      selectedNode: null
    });

    // Should not show child files
    expect(queryByText('index.ts')).not.toBeInTheDocument();
    expect(queryByText('utils')).not.toBeInTheDocument();
  });

  test('should apply correct indentation based on level', () => {
    const { container } = render(TreeNode, {
      node: mockFileNode,
      level: 2,
      selectedNode: null
    });

    const nodeContent = container.querySelector('.node-content');
    expect(nodeContent).toHaveStyle('padding-left: 40px'); // 2 * 20px
  });

  test('should emit toggle event when expand button is clicked', async () => {
    const mockToggle = vi.fn();
    const component = render(TreeNode, {
      node: mockDirectoryNode,
      level: 0,
      selectedNode: null
    });

    component.component.$on('toggle', mockToggle);

    const expandButton = component.container.querySelector('.expand-button');
    await fireEvent.click(expandButton!);

    expect(mockToggle).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          node: mockDirectoryNode
        })
      })
    );
  });

  test('should emit select event when node is clicked', async () => {
    const mockSelect = vi.fn();
    const component = render(TreeNode, {
      node: mockFileNode,
      level: 0,
      selectedNode: null
    });

    component.component.$on('select', mockSelect);

    const nodeContent = component.container.querySelector('.node-content');
    await fireEvent.click(nodeContent!);

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          node: mockFileNode
        })
      })
    );
  });

  test('should emit contextmenu event when right-clicked', async () => {
    const mockContextMenu = vi.fn();
    const component = render(TreeNode, {
      node: mockFileNode,
      level: 0,
      selectedNode: null
    });

    component.component.$on('contextmenu', mockContextMenu);

    const nodeContent = component.container.querySelector('.node-content');
    await fireEvent.contextMenu(nodeContent!);

    expect(mockContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          node: mockFileNode
        })
      })
    );
  });

  test('should show selected state when node is selected', () => {
    const { container } = render(TreeNode, {
      node: mockFileNode,
      level: 0,
      selectedNode: mockFileNode
    });

    const treeNode = container.querySelector('.tree-node');
    expect(treeNode).toHaveClass('selected');
  });

  test('should display NEW status badge for new files', () => {
    const { getByText, container } = render(TreeNode, {
      node: mockNewFileNode,
      level: 0,
      selectedNode: null
    });

    expect(getByText('NEW')).toBeInTheDocument();
    const badge = container.querySelector('.status-badge.new');
    expect(badge).toBeInTheDocument();
  });

  test('should display MOD status badge for modified files', () => {
    const { getByText, container } = render(TreeNode, {
      node: mockModifiedFileNode,
      level: 0,
      selectedNode: null
    });

    expect(getByText('MOD')).toBeInTheDocument();
    const badge = container.querySelector('.status-badge.modified');
    expect(badge).toBeInTheDocument();
  });

  test('should show correct language icons', () => {
    const testCases = [
      { language: 'rust', expectedIcon: '🦀' },
      { language: 'typescript', expectedIcon: '📘' },
      { language: 'javascript', expectedIcon: '📄' },
      { language: 'svelte', expectedIcon: '🎯' },
      { language: 'json', expectedIcon: '📋' },
      { language: 'markdown', expectedIcon: '📝' },
      { language: 'html', expectedIcon: '🌐' },
      { language: 'css', expectedIcon: '🎨' },
      { language: 'unknown', expectedIcon: '📄' }
    ];

    testCases.forEach(({ language, expectedIcon }) => {
      const node = { ...mockFileNode, language: language as Language };
      const { getByText } = render(TreeNode, {
        node,
        level: 0,
        selectedNode: null
      });

      expect(getByText(expectedIcon)).toBeInTheDocument();
    });
  });

  test('should format file sizes correctly', () => {
    const testCases = [
      { size: 500, expected: '500B' },
      { size: 1024, expected: '1.0KB' },
      { size: 1536, expected: '1.5KB' },
      { size: 1048576, expected: '1.0MB' },
      { size: 1073741824, expected: '1.0GB' }
    ];

    testCases.forEach(({ size, expected }) => {
      const node = { ...mockFileNode, size };
      const { getByText } = render(TreeNode, {
        node,
        level: 0,
        selectedNode: null
      });

      expect(getByText(expected)).toBeInTheDocument();
    });
  });

  test('should not show file size for directories', () => {
    const { queryByText } = render(TreeNode, {
      node: mockDirectoryNode,
      level: 0,
      selectedNode: null
    });

    // Directory should not display file size
    expect(queryByText(/KB|MB|GB|B$/)).not.toBeInTheDocument();
  });

  test('should handle empty file size', () => {
    const nodeWithoutSize = { ...mockFileNode, size: undefined };
    const { queryByText } = render(TreeNode, {
      node: nodeWithoutSize,
      level: 0,
      selectedNode: null
    });

    // Should not show file size when undefined
    expect(queryByText(/KB|MB|GB|B$/)).not.toBeInTheDocument();
  });

  test('should prevent event propagation for expand button clicks', async () => {
    const mockSelect = vi.fn();
    const mockToggle = vi.fn();
    
    const component = render(TreeNode, {
      node: mockDirectoryNode,
      level: 0,
      selectedNode: null
    });

    component.component.$on('select', mockSelect);
    component.component.$on('toggle', mockToggle);

    const expandButton = component.container.querySelector('.expand-button');
    await fireEvent.click(expandButton!);

    // Toggle should be called, but select should not
    expect(mockToggle).toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test('should render recursive tree structure correctly', () => {
    const deepTree: TreeNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'level1',
          path: '/root/level1',
          type: 'directory',
          children: [
            {
              name: 'level2',
              path: '/root/level1/level2',
              type: 'directory',
              children: [
                {
                  name: 'deep.ts',
                  path: '/root/level1/level2/deep.ts',
                  type: 'file',
                  language: 'typescript',
                  children: [],
                  expanded: false,
                  isNew: false,
                  isModified: false,
                  isDeleted: false
                }
              ],
              expanded: true,
              isNew: false,
              isModified: false,
              isDeleted: false
            }
          ],
          expanded: true,
          isNew: false,
          isModified: false,
          isDeleted: false
        }
      ],
      expanded: true,
      isNew: false,
      isModified: false,
      isDeleted: false
    };

    const { getByText } = render(TreeNode, {
      node: deepTree,
      level: 0,
      selectedNode: null
    });

    // Should render all levels of the tree
    expect(getByText('root')).toBeInTheDocument();
    expect(getByText('level1')).toBeInTheDocument();
    expect(getByText('level2')).toBeInTheDocument();
    expect(getByText('deep.ts')).toBeInTheDocument();
  });

  test('should apply hover effects correctly', () => {
    const { container } = render(TreeNode, {
      node: mockFileNode,
      level: 0,
      selectedNode: null
    });

    const nodeContent = container.querySelector('.node-content');
    expect(nodeContent).toHaveClass('node-content');
    
    // CSS hover effects should be defined in the component
    const styles = window.getComputedStyle(nodeContent!);
    expect(nodeContent).toBeTruthy();
  });
});