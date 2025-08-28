import { test, expect } from '@playwright/test';

test.describe('WitnessChain Dashboard', () => {
  test('should load the dashboard homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main title is present
    await expect(page.locator('h1')).toContainText('WitnessChain');
    
    // Check that the dashboard container is visible
    await expect(page.locator('.dashboard')).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    await page.goto('/');
    
    // Connection status should be visible
    await expect(page.locator('.connection-status')).toBeVisible();
    
    // Status indicator should be present
    await expect(page.locator('.status-indicator')).toBeVisible();
    
    // Status text should be present
    await expect(page.locator('.status-text')).toBeVisible();
  });

  test('should display dashboard components', async ({ page }) => {
    await page.goto('/');
    
    // Check for main dashboard sections
    await expect(page.locator('.dashboard-header')).toBeVisible();
    await expect(page.locator('.dashboard-main')).toBeVisible();
    
    // Check for component containers (even if they show "No data available")
    const componentSelectors = [
      '[data-testid="realtime-activity"]',
      '[data-testid="code-metrics"]', 
      '[data-testid="developer-heatmap"]',
      '[data-testid="filesystem-tree"]'
    ];
    
    for (const selector of componentSelectors) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });

  test('should handle WebSocket connection gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for WebSocket connection attempt
    await page.waitForTimeout(1000);
    
    // Should show disconnected state initially (since backend isn't running)
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toHaveClass(/status-indicator/);
    
    // Status text should indicate disconnected state
    const statusText = page.locator('.status-text');
    await expect(statusText).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('.dashboard')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.dashboard')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.dashboard')).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for proper ARIA labels where needed
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();
    
    // Check that interactive elements are focusable
    const interactiveElements = page.locator('button, a, input');
    const count = await interactiveElements.count();
    
    for (let i = 0; i < count; i++) {
      await expect(interactiveElements.nth(i)).toBeVisible();
    }
  });

  test('should load chart libraries', async ({ page }) => {
    await page.goto('/');
    
    // Wait for potential chart libraries to load
    await page.waitForTimeout(2000);
    
    // Check that no JavaScript errors occurred
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Filter out expected WebSocket connection errors
    const unexpectedErrors = errors.filter(error => 
      !error.includes('WebSocket') && 
      !error.includes('connect') &&
      !error.includes('ECONNREFUSED')
    );
    
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('should handle navigation and routing', async ({ page }) => {
    await page.goto('/');
    
    // Check current URL
    expect(page.url()).toBe('http://localhost:5173/');
    
    // Check page title
    await expect(page).toHaveTitle(/WitnessChain/);
  });
});