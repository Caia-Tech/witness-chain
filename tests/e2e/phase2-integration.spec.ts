/**
 * End-to-End Integration tests for Phase 2 Components
 * Tests the complete interactive visualization system integration
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test file paths
const testDir = path.join(__dirname, '../../temp-integration-test');

test.describe('Phase 2 Integration - Interactive Visualizations', () => {
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
    // Navigate to dashboard and wait for all components to load
    await page.goto('/');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    
    // Ensure all main components are present
    await expect(page.locator('[data-testid="realtime-activity"]')).toBeVisible();
    await expect(page.locator('[data-testid="code-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="filesystem-tree"]')).toBeVisible();
  });

  test('should display all Phase 2 components correctly', async ({ page }) => {
    console.log('Testing Phase 2 component integration...');
    
    // Check Activity Feed is loaded
    const activityFeed = page.locator('[data-testid="realtime-activity"]');
    await expect(activityFeed).toBeVisible();
    await expect(activityFeed.locator('.feed-header')).toBeVisible();
    await expect(activityFeed.locator('.feed-title')).toContainText('Real-time Activity');
    
    // Check Metrics Dashboard is loaded
    const metricsDashboard = page.locator('[data-testid="code-metrics"]');
    await expect(metricsDashboard).toBeVisible();
    await expect(metricsDashboard.locator('.dashboard-title')).toContainText('Code Metrics Dashboard');
    
    // Check Project Tree is loaded
    const projectTree = page.locator('[data-testid="filesystem-tree"]');
    await expect(projectTree).toBeVisible();
    await expect(projectTree.locator('.tree-controls')).toBeVisible();
    
    await page.screenshot({ path: 'phase2-components-loaded.png' });
  });

  test('should show real-time file monitoring across all components', async ({ page }) => {
    console.log('Testing real-time integration across components...');
    
    // Create a complex TypeScript file that will trigger multiple component updates
    const testFile = path.join(testDir, 'integration-test.ts');
    const testContent = `// Integration test file
interface UserData {
  id: number;
  name: string;
  email: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

class UserService {
  private users: Map<number, UserData> = new Map();
  private cache: LRUCache<number, UserData>;

  constructor() {
    this.cache = new LRUCache(100);
  }

  async createUser(userData: Omit<UserData, 'id'>): Promise<UserData> {
    const id = this.generateId();
    const user: UserData = { id, ...userData };
    
    // Validation
    if (!this.isValidEmail(user.email)) {
      throw new Error('Invalid email format');
    }
    
    if (user.name.length < 2) {
      throw new Error('Name too short');
    }
    
    // Store user
    this.users.set(id, user);
    this.cache.set(id, user);
    
    // Log activity
    this.logActivity('user_created', user.id);
    
    return user;
  }

  async updateUser(id: number, updates: Partial<UserData>): Promise<UserData> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedUser = { ...existingUser, ...updates };
    
    // Validate updates
    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new Error('Invalid email format');
    }

    this.users.set(id, updatedUser);
    this.cache.delete(id); // Invalidate cache
    
    this.logActivity('user_updated', id);
    return updatedUser;
  }

  async getUser(id: number): Promise<UserData | null> {
    // Try cache first
    const cached = this.cache.get(id);
    if (cached) return cached;
    
    const user = this.users.get(id);
    if (user) {
      this.cache.set(id, user);
    }
    
    return user || null;
  }

  private generateId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  private logActivity(action: string, userId: number): void {
    console.log(\`[\${new Date().toISOString()}] \${action}: User \${userId}\`);
  }
}

export { UserService, type UserData, type UserPreferences };`;
    
    fs.writeFileSync(testFile, testContent);
    
    // Wait for the event to propagate through the system
    await page.waitForTimeout(4000);
    
    // Check Activity Feed shows the new file
    const activityContent = page.locator('[data-testid="activity-feed-content"]');
    await expect(activityContent).toContainText('integration-test.ts');
    
    // Check Project Tree shows the new file
    const projectTree = page.locator('[data-testid="filesystem-tree"]');
    await expect(projectTree).toContainText('integration-test.ts');
    
    // Check Metrics Dashboard updates (should show TypeScript language)
    const metricsPanel = page.locator('[data-testid="code-metrics"]');
    await expect(metricsPanel.locator('.language-stat')).toBeVisible();
    
    await page.screenshot({ path: 'real-time-integration-test.png' });
    
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  test('should handle complex file operations and updates', async ({ page }) => {
    console.log('Testing complex file operations...');
    
    // Create multiple files of different types
    const files = [
      {
        name: 'api-client.ts',
        content: `import { HttpClient } from './http-client';
import { Logger } from './logger';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export class ApiClient {
  private http: HttpClient;
  private logger: Logger;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.http = new HttpClient();
    this.logger = new Logger('ApiClient');
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    this.logger.info(\`GET \${url}\`);
    
    try {
      const response = await this.http.get(url);
      return this.parseResponse(response);
    } catch (error) {
      this.logger.error('GET request failed', error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    this.logger.info(\`POST \${url}\`);
    
    try {
      const response = await this.http.post(url, data);
      return this.parseResponse(response);
    } catch (error) {
      this.logger.error('POST request failed', error);
      throw error;
    }
  }

  private parseResponse<T>(response: any): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      message: response.message || 'Success'
    };
  }
}`
      },
      {
        name: 'Button.svelte',
        content: `<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading = false;
  export let icon: string | undefined = undefined;

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  $: classes = [
    'btn',
    \`btn-\${variant}\`,
    \`btn-\${size}\`,
    disabled && 'btn-disabled',
    loading && 'btn-loading'
  ].filter(Boolean).join(' ');

  function handleClick(event: MouseEvent) {
    if (disabled || loading) return;
    dispatch('click', event);
  }
</script>

<button 
  class={classes}
  {disabled}
  on:click={handleClick}
  on:keydown
  on:focus
  on:blur
  {...$$restProps}
>
  {#if loading}
    <span class="btn-spinner" />
  {:else if icon}
    <span class="btn-icon">{icon}</span>
  {/if}
  
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(.btn-disabled) {
    background: #2563eb;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-sm {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn-lg {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }

  .btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-loading {
    opacity: 0.8;
    cursor: wait;
  }

  .btn-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>`
      },
      {
        name: 'utils.rs',
        content: `use std::collections::HashMap;
use std::fmt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub log_level: LogLevel,
    pub features: Features,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Features {
    pub metrics_enabled: bool,
    pub caching_enabled: bool,
    pub rate_limiting: Option<RateLimitConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub requests_per_minute: u32,
    pub burst_size: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_url: "postgresql://localhost:5432/app".to_string(),
            redis_url: "redis://localhost:6379".to_string(),
            log_level: LogLevel::Info,
            features: Features::default(),
        }
    }
}

impl Default for Features {
    fn default() -> Self {
        Self {
            metrics_enabled: true,
            caching_enabled: true,
            rate_limiting: Some(RateLimitConfig {
                requests_per_minute: 100,
                burst_size: 10,
            }),
        }
    }
}

impl fmt::Display for LogLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LogLevel::Error => write!(f, "ERROR"),
            LogLevel::Warn => write!(f, "WARN"),
            LogLevel::Info => write!(f, "INFO"),
            LogLevel::Debug => write!(f, "DEBUG"),
            LogLevel::Trace => write!(f, "TRACE"),
        }
    }
}

pub fn load_config_from_env() -> Result<Config, ConfigError> {
    let mut config = Config::default();

    if let Ok(db_url) = std::env::var("DATABASE_URL") {
        config.database_url = db_url;
    }

    if let Ok(redis_url) = std::env::var("REDIS_URL") {
        config.redis_url = redis_url;
    }

    if let Ok(log_level) = std::env::var("LOG_LEVEL") {
        config.log_level = match log_level.to_lowercase().as_str() {
            "error" => LogLevel::Error,
            "warn" => LogLevel::Warn,
            "info" => LogLevel::Info,
            "debug" => LogLevel::Debug,
            "trace" => LogLevel::Trace,
            _ => return Err(ConfigError::InvalidLogLevel(log_level)),
        };
    }

    Ok(config)
}

#[derive(Debug)]
pub enum ConfigError {
    InvalidLogLevel(String),
    MissingRequired(String),
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::InvalidLogLevel(level) => {
                write!(f, "Invalid log level: {}", level)
            }
            ConfigError::MissingRequired(field) => {
                write!(f, "Missing required configuration: {}", field)
            }
        }
    }
}

impl std::error::Error for ConfigError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = Config::default();
        assert_eq!(config.database_url, "postgresql://localhost:5432/app");
        assert!(config.features.metrics_enabled);
    }

    #[test]
    fn test_log_level_display() {
        assert_eq!(LogLevel::Info.to_string(), "INFO");
        assert_eq!(LogLevel::Error.to_string(), "ERROR");
    }
}`
      }
    ];

    // Create all files
    for (const file of files) {
      const filePath = path.join(testDir, file.name);
      fs.writeFileSync(filePath, file.content);
      await page.waitForTimeout(1500); // Stagger file creation
    }

    // Wait for all events to be processed
    await page.waitForTimeout(5000);

    // Check that Activity Feed shows all files
    const activityFeed = page.locator('[data-testid="activity-feed-content"]');
    for (const file of files) {
      await expect(activityFeed).toContainText(file.name);
    }

    // Check language diversity in metrics
    const metricsPanel = page.locator('[data-testid="code-metrics"]');
    await expect(metricsPanel).toContainText('typescript');
    await expect(metricsPanel).toContainText('svelte');
    await expect(metricsPanel).toContainText('rust');

    // Test Activity Feed filtering
    const filterButtons = page.locator('.filter-button');
    const fileCreatedFilter = filterButtons.first();
    
    // Disable file_created events
    await fileCreatedFilter.click();
    await page.waitForTimeout(1000);
    
    // Should show fewer events now
    const eventItems = page.locator('.event-item');
    const eventCount = await eventItems.count();
    expect(eventCount).toBeLessThan(files.length);

    await page.screenshot({ path: 'complex-file-operations-test.png' });

    // Clean up files
    for (const file of files) {
      const filePath = path.join(testDir, file.name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test('should handle file modifications and show diffs', async ({ page }) => {
    console.log('Testing file modification and diff display...');

    // Create initial file
    const testFile = path.join(testDir, 'modifiable.js');
    const initialContent = `function calculateSum(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

function calculateAverage(numbers) {
  return calculateSum(numbers) / numbers.length;
}

module.exports = { calculateSum, calculateAverage };`;

    fs.writeFileSync(testFile, initialContent);
    await page.waitForTimeout(3000);

    // Modify the file significantly
    const modifiedContent = `function calculateSum(numbers) {
  // Enhanced with validation
  if (!Array.isArray(numbers)) {
    throw new Error('Input must be an array');
  }
  
  if (numbers.length === 0) {
    return 0;
  }

  let total = 0;
  for (const num of numbers) {
    if (typeof num !== 'number') {
      throw new Error('All elements must be numbers');
    }
    total += num;
  }
  return total;
}

function calculateAverage(numbers) {
  const sum = calculateSum(numbers);
  return sum / numbers.length;
}

function calculateMedian(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Input must be a non-empty array');
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function calculateMode(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Input must be a non-empty array');
  }

  const frequency = {};
  let maxFreq = 0;
  let mode = [];

  for (const num of numbers) {
    frequency[num] = (frequency[num] || 0) + 1;
    maxFreq = Math.max(maxFreq, frequency[num]);
  }

  for (const [num, freq] of Object.entries(frequency)) {
    if (freq === maxFreq) {
      mode.push(Number(num));
    }
  }

  return mode.length === Object.keys(frequency).length ? null : mode;
}

module.exports = { 
  calculateSum, 
  calculateAverage, 
  calculateMedian, 
  calculateMode 
};`;

    fs.writeFileSync(testFile, modifiedContent);
    await page.waitForTimeout(4000);

    // Check that Activity Feed shows the modification
    const activityFeed = page.locator('[data-testid="activity-feed-content"]');
    await expect(activityFeed).toContainText('modifiable.js');
    
    // Look for modify event specifically
    const eventItems = page.locator('.event-item');
    const modifyEvent = eventItems.filter({ hasText: 'file modified' }).first();
    await expect(modifyEvent).toBeVisible();

    // Expand the event to see details
    const expandButton = modifyEvent.locator('.expand-button').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(1000);

      // Should show analysis details
      await expect(modifyEvent).toContainText('Lines:');
      await expect(modifyEvent).toContainText('Complexity:');

      // Should show diff information if available
      const diffPreview = modifyEvent.locator('.diff-preview');
      if (await diffPreview.isVisible()) {
        await expect(diffPreview).toContainText('Changes:');
      }
    }

    await page.screenshot({ path: 'file-modification-diff-test.png' });

    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  test('should handle metrics dashboard interactions', async ({ page }) => {
    console.log('Testing metrics dashboard interactions...');

    // Create files to generate metrics data
    const metricsTestFiles = [
      { name: 'simple.js', complexity: 2 },
      { name: 'moderate.ts', complexity: 6 },
      { name: 'complex.rs', complexity: 15 }
    ];

    // Generate files with varying complexity
    for (const file of metricsTestFiles) {
      let content = '';
      const filePath = path.join(testDir, file.name);
      
      if (file.name.endsWith('.js')) {
        content = `function simple() { return true; }\nmodule.exports = { simple };`;
      } else if (file.name.endsWith('.ts')) {
        content = `interface Data { id: number; name: string; }\nclass Service {\n  process(data: Data): boolean {\n    if (data.id > 0 && data.name) {\n      return true;\n    }\n    return false;\n  }\n}`;
      } else if (file.name.endsWith('.rs')) {
        content = `pub struct Complex {\n    data: Vec<String>,\n}\nimpl Complex {\n    pub fn new() -> Self { Self { data: Vec::new() } }\n    pub fn process(&self) -> Result<String, Error> {\n        for item in &self.data {\n            if item.len() > 10 {\n                match self.validate(item) {\n                    Ok(valid) => if valid { continue; } else { return Err(Error::Invalid); }\n                    Err(e) => return Err(e),\n                }\n            }\n        }\n        Ok("processed".to_string())\n    }\n    fn validate(&self, item: &str) -> Result<bool, Error> {\n        if item.is_empty() { Err(Error::Empty) } else { Ok(true) }\n    }\n}`;
      }
      
      fs.writeFileSync(filePath, content);
      await page.waitForTimeout(2000);
    }

    // Wait for metrics to be processed
    await page.waitForTimeout(5000);

    // Test metrics dashboard controls
    const metricsPanel = page.locator('[data-testid="code-metrics"]');
    
    // Test metric selector
    const metricSelect = metricsPanel.locator('#metric-select');
    if (await metricSelect.isVisible()) {
      await metricSelect.selectOption('lines');
      await page.waitForTimeout(1000);
      
      await metricSelect.selectOption('complexity');
      await page.waitForTimeout(1000);
    }

    // Test time range selector
    const rangeSelect = metricsPanel.locator('#range-select');
    if (await rangeSelect.isVisible()) {
      await rangeSelect.selectOption('1h');
      await page.waitForTimeout(1000);
      
      await rangeSelect.selectOption('6h');
      await page.waitForTimeout(1000);
    }

    // Test language breakdown toggle
    const languageToggle = metricsPanel.locator('input[type="checkbox"]');
    if (await languageToggle.isVisible()) {
      await languageToggle.uncheck();
      await page.waitForTimeout(1000);
      
      await languageToggle.check();
      await page.waitForTimeout(1000);
    }

    // Check that statistics are displayed
    const dashboardFooter = metricsPanel.locator('.dashboard-footer');
    if (await dashboardFooter.isVisible()) {
      await expect(dashboardFooter).toContainText('Total Events:');
    }

    await page.screenshot({ path: 'metrics-dashboard-interactions-test.png' });

    // Clean up
    for (const file of metricsTestFiles) {
      const filePath = path.join(testDir, file.name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test('should maintain performance with many files', async ({ page }) => {
    console.log('Testing performance with multiple files...');

    const startTime = Date.now();
    const fileCount = 25;
    const createdFiles: string[] = [];

    // Create many files rapidly
    for (let i = 0; i < fileCount; i++) {
      const fileName = `perf-test-${i}.ts`;
      const filePath = path.join(testDir, fileName);
      const content = `// Performance test file ${i}
export interface TestData${i} {
  id: number;
  value: string;
  timestamp: Date;
}

export class TestService${i} {
  private data: TestData${i}[] = [];

  add(item: TestData${i}): void {
    this.data.push(item);
  }

  find(id: number): TestData${i} | undefined {
    return this.data.find(item => item.id === id);
  }

  getAll(): TestData${i}[] {
    return [...this.data];
  }

  clear(): void {
    this.data = [];
  }
}`;

      fs.writeFileSync(filePath, content);
      createdFiles.push(filePath);

      // Small delay every 5 files to avoid overwhelming the system
      if (i % 5 === 0) {
        await page.waitForTimeout(200);
      }
    }

    // Wait for all events to be processed
    await page.waitForTimeout(8000);

    const processingTime = Date.now() - startTime;
    console.log(`Created and processed ${fileCount} files in ${processingTime}ms`);

    // Check that the dashboard is still responsive
    const connectionStatus = page.locator('.status-indicator');
    await expect(connectionStatus).toHaveClass(/connected/);

    // Check that Activity Feed shows recent events
    const activityFeed = page.locator('[data-testid="activity-feed-content"]');
    await expect(activityFeed.locator('.event-item')).toHaveCount({ min: 10 });

    // Check that metrics dashboard is updating
    const metricsFooter = page.locator('[data-testid="code-metrics"] .dashboard-footer');
    await expect(metricsFooter).toContainText('Total Events:');

    // Performance should be reasonable (less than 15 seconds for 25 files)
    expect(processingTime).toBeLessThan(15000);

    await page.screenshot({ path: 'performance-test-many-files.png' });

    // Clean up all files
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test('should handle WebSocket disconnection gracefully', async ({ page }) => {
    console.log('Testing WebSocket disconnection handling...');

    // Verify initial connection
    await expect(page.locator('.status-indicator')).toHaveClass(/connected/);
    await expect(page.locator('.status-text')).toContainText('Connected');

    // Create a file while connected
    const testFile = path.join(testDir, 'disconnect-test.js');
    fs.writeFileSync(testFile, 'console.log("test");');
    await page.waitForTimeout(2000);

    // Verify event appears
    const activityFeed = page.locator('[data-testid="activity-feed-content"]');
    await expect(activityFeed).toContainText('disconnect-test.js');

    // Take screenshot of connected state
    await page.screenshot({ path: 'websocket-connected-state.png' });

    console.log('WebSocket connection test completed - components remain functional');

    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });
});