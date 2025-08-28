/**
 * End-to-End tests for Enhanced WitnessChain Monitoring System
 * Tests real-time file analysis, multi-language support, and dashboard integration
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test file paths
const testDir = path.join(__dirname, '../../temp-test-files');

test.describe('Enhanced WitnessChain Monitoring', () => {
  test.beforeAll(async () => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  test.afterAll(async () => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Go to dashboard and wait for WebSocket connection
    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for WebSocket connection
  });

  test('should detect Rust file creation and analysis', async ({ page }) => {
    console.log('Testing Rust file monitoring...');
    
    // Get initial event count
    const initialCount = await page.locator('.footer-value').first().textContent();
    console.log('Initial event count:', initialCount);
    
    // Create a Rust file
    const rustFile = path.join(testDir, 'test.rs');
    const rustContent = `pub struct User {
    pub name: String,
    pub age: u32,
}

pub fn create_user(name: String, age: u32) -> User {
    User { name, age }
}

impl User {
    pub fn greet(&self) -> String {
        if self.age >= 18 {
            format!("Hello, I'm {}", self.name)
        } else {
            format!("Hi, I'm {} and I'm {} years old", self.name, self.age)
        }
    }
}`;
    
    fs.writeFileSync(rustFile, rustContent);
    
    // Wait for file system event to be processed
    await page.waitForTimeout(3000);
    
    // Check if event count increased
    const newCount = await page.locator('.footer-value').first().textContent();
    console.log('New event count:', newCount);
    
    // Check if activity feed shows the new file
    const activityPanel = page.locator('[data-testid="realtime-activity"]');
    const activityContent = await activityPanel.textContent();
    
    console.log('Activity panel content:', activityContent);
    
    // Should show file creation event
    expect(activityContent).toContain('test.rs');
    
    // Take screenshot for verification
    await page.screenshot({ path: 'debug-rust-monitoring.png' });
    
    // Clean up
    if (fs.existsSync(rustFile)) {
      fs.unlinkSync(rustFile);
    }
  });

  test('should detect TypeScript file modification', async ({ page }) => {
    console.log('Testing TypeScript file monitoring...');
    
    // Create initial TypeScript file
    const tsFile = path.join(testDir, 'component.ts');
    const initialContent = `interface User {
  id: number;
  name: string;
}

export class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
}`;
    
    fs.writeFileSync(tsFile, initialContent);
    await page.waitForTimeout(2000);
    
    // Modify the file
    const modifiedContent = initialContent + `
    
export function validateUser(user: User): boolean {
  return user.id > 0 && user.name.length > 0;
}

export async function fetchUser(id: number): Promise<User | null> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  return { id, name: 'Test User' };
}`;
    
    fs.writeFileSync(tsFile, modifiedContent);
    await page.waitForTimeout(3000);
    
    // Check activity feed for modification
    const activityPanel = page.locator('[data-testid="realtime-activity"]');
    const activityContent = await activityPanel.textContent();
    
    console.log('Activity after TypeScript modification:', activityContent);
    expect(activityContent).toContain('component.ts');
    
    // Clean up
    if (fs.existsSync(tsFile)) {
      fs.unlinkSync(tsFile);
    }
  });

  test('should detect multiple file types simultaneously', async ({ page }) => {
    console.log('Testing multi-file monitoring...');
    
    const files = [
      {
        path: path.join(testDir, 'main.rs'),
        content: `fn main() {
    println!("Hello, Rust!");
    let numbers = vec![1, 2, 3, 4, 5];
    for num in numbers {
        if num % 2 == 0 {
            println!("{} is even", num);
        }
    }
}`
      },
      {
        path: path.join(testDir, 'utils.ts'),
        content: `export function calculateSum(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
}

export interface Config {
    apiUrl: string;
    timeout: number;
}

export class ApiClient {
    constructor(private config: Config) {}
    
    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(\`\${this.config.apiUrl}\${endpoint}\`);
        return response.json();
    }
}`
      },
      {
        path: path.join(testDir, 'Button.svelte'),
        content: `<script lang="ts">
  export let label: string = 'Click me';
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled: boolean = false;
  
  let clickCount = 0;
  
  function handleClick() {
    clickCount++;
    console.log(\`Button clicked \${clickCount} times\`);
  }
  
  $: buttonClass = \`btn btn-\${variant} \${disabled ? 'disabled' : ''}\`;
</script>

<button class={buttonClass} on:click={handleClick} {disabled}>
  {label} {#if clickCount > 0}({clickCount}){/if}
</button>

<style>
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-primary {
    background-color: #007bff;
    color: white;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }
  
  .disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>`
      }
    ];
    
    // Create all files simultaneously
    files.forEach(file => {
      fs.writeFileSync(file.path, file.content);
    });
    
    // Wait for all events to be processed
    await page.waitForTimeout(5000);
    
    // Check that all files are detected
    const activityPanel = page.locator('[data-testid="realtime-activity"]');
    const activityContent = await activityPanel.textContent();
    
    console.log('Multi-file activity content:', activityContent);
    
    // Should contain all three files
    expect(activityContent).toContain('main.rs');
    expect(activityContent).toContain('utils.ts');
    expect(activityContent).toContain('Button.svelte');
    
    // Check metrics panel for updated counts
    const metricsPanel = page.locator('[data-testid="code-metrics"]');
    const metricsContent = await metricsPanel.textContent();
    
    console.log('Metrics panel content:', metricsContent);
    
    // Clean up
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  });

  test('should handle file deletion events', async ({ page }) => {
    console.log('Testing file deletion monitoring...');
    
    // Create a file first
    const testFile = path.join(testDir, 'temporary.js');
    const content = `function temporaryFunction() {
  console.log('This file will be deleted');
  return 'temporary';
}

export default temporaryFunction;`;
    
    fs.writeFileSync(testFile, content);
    await page.waitForTimeout(2000);
    
    // Delete the file
    fs.unlinkSync(testFile);
    await page.waitForTimeout(3000);
    
    // Check activity feed for deletion event
    const activityPanel = page.locator('[data-testid="realtime-activity"]');
    const activityContent = await activityPanel.textContent();
    
    console.log('Activity after file deletion:', activityContent);
    expect(activityContent).toContain('temporary.js');
  });

  test('should show connection status correctly', async ({ page }) => {
    console.log('Testing connection status...');
    
    // Check initial connection status
    const statusIndicator = page.locator('.status-indicator');
    const statusText = page.locator('.status-text');
    
    // Wait for connection to establish
    await page.waitForTimeout(3000);
    
    const indicatorClass = await statusIndicator.getAttribute('class');
    const statusTextContent = await statusText.textContent();
    
    console.log('Connection status:', { indicatorClass, statusTextContent });
    
    // Should be connected
    expect(indicatorClass).toContain('connected');
    expect(statusTextContent).toBe('Connected');
  });

  test('should update metrics in real-time', async ({ page }) => {
    console.log('Testing real-time metrics updates...');
    
    // Get initial metrics
    const metricsPanel = page.locator('[data-testid="code-metrics"]');
    let initialMetrics = await metricsPanel.textContent();
    console.log('Initial metrics:', initialMetrics);
    
    // Create multiple files to trigger metrics updates
    const files = [
      { name: 'service.ts', ext: 'ts' },
      { name: 'component.svelte', ext: 'svelte' },
      { name: 'utils.js', ext: 'js' },
    ];
    
    for (const file of files) {
      const filePath = path.join(testDir, file.name);
      let content = '';
      
      switch (file.ext) {
        case 'ts':
          content = 'export interface Data { id: number; } export class Service {}';
          break;
        case 'svelte':
          content = '<script>let count = 0;</script><button on:click={() => count++}>{count}</button>';
          break;
        case 'js':
          content = 'function helper() { return "helper"; } export { helper };';
          break;
      }
      
      fs.writeFileSync(filePath, content);
      await page.waitForTimeout(1000);
    }
    
    // Wait for metrics to update
    await page.waitForTimeout(3000);
    
    // Check updated metrics
    let updatedMetrics = await metricsPanel.textContent();
    console.log('Updated metrics:', updatedMetrics);
    
    // Should show some metrics data
    expect(updatedMetrics).not.toBe(initialMetrics);
    
    // Clean up
    files.forEach(file => {
      const filePath = path.join(testDir, file.name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  test('should handle large numbers of files efficiently', async ({ page }) => {
    console.log('Testing performance with many files...');
    
    const startTime = Date.now();
    
    // Create 50 small files quickly
    const files: string[] = [];
    for (let i = 0; i < 50; i++) {
      const fileName = `test-${i}.js`;
      const filePath = path.join(testDir, fileName);
      const content = `// Test file ${i}
function test${i}() {
  return ${i};
}
export default test${i};`;
      
      fs.writeFileSync(filePath, content);
      files.push(filePath);
      
      // Small delay to avoid overwhelming the system
      if (i % 10 === 0) {
        await page.waitForTimeout(100);
      }
    }
    
    // Wait for all events to be processed
    await page.waitForTimeout(5000);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`Processed 50 files in ${processingTime}ms`);
    
    // Check that the system is still responsive
    const eventCount = await page.locator('.footer-value').first().textContent();
    console.log('Final event count:', eventCount);
    
    // Performance should be reasonable (less than 15 seconds for 50 files)
    expect(processingTime).toBeLessThan(15000);
    
    // Clean up
    files.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  test('should maintain dashboard responsiveness during monitoring', async ({ page }) => {
    console.log('Testing dashboard responsiveness...');
    
    // Measure initial page responsiveness
    const startTime = performance.now();
    
    // Perform UI interactions while monitoring is active
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();
    
    const dashboardTitle = page.locator('h1');
    await expect(dashboardTitle).toContainText('WitnessChain');
    
    // Create some files to trigger monitoring activity
    for (let i = 0; i < 5; i++) {
      const filePath = path.join(testDir, `responsive-test-${i}.ts`);
      fs.writeFileSync(filePath, `export const value${i} = ${i};`);
    }
    
    // Wait a bit then check if UI is still responsive
    await page.waitForTimeout(2000);
    
    // UI should still respond quickly
    const activityPanel = page.locator('[data-testid="realtime-activity"]');
    await expect(activityPanel).toBeVisible();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.log(`UI remained responsive: ${responseTime}ms`);
    
    // Should respond within 500ms
    expect(responseTime).toBeLessThan(500);
    
    // Clean up
    for (let i = 0; i < 5; i++) {
      const filePath = path.join(testDir, `responsive-test-${i}.ts`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
});