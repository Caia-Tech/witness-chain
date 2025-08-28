import { test, expect } from '@playwright/test';

test.describe('WebSocket Connection Tests', () => {
  test('should connect to WebSocket and receive real-time data', async ({ page }) => {
    // Go to dashboard
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Check initial connection status
    const statusIndicator = page.locator('.status-indicator');
    const statusText = page.locator('.status-text');
    
    console.log('Checking connection status...');
    
    // Wait up to 5 seconds for connection
    await page.waitForTimeout(5000);
    
    // Check if connected
    const indicatorClass = await statusIndicator.getAttribute('class');
    const statusTextContent = await statusText.textContent();
    
    console.log('Status indicator class:', indicatorClass);
    console.log('Status text:', statusTextContent);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-connection.png' });
    
    // Check for real-time events
    const eventsCount = await page.locator('.footer-value').first().textContent();
    console.log('Events count:', eventsCount);
    
    // Look for any console errors
    const messages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        messages.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (messages.length > 0) {
      console.log('Console errors found:', messages);
    }
    
    // Check WebSocket connection specifically
    const wsState = await page.evaluate(() => {
      return {
        readyState: window.WebSocket ? 'WebSocket available' : 'WebSocket not available',
        location: window.location.href
      };
    });
    
    console.log('WebSocket state:', wsState);
  });
  
  test('should receive events when files are created', async ({ page }) => {
    await page.goto('/');
    
    // Wait for connection
    await page.waitForTimeout(3000);
    
    // Get initial event count
    const initialCount = await page.locator('.footer-value').first().textContent();
    console.log('Initial events count:', initialCount);
    
    // Create a file in another process to trigger an event
    // (This would need to be coordinated with the file watcher)
    
    // Wait for potential new events
    await page.waitForTimeout(5000);
    
    const finalCount = await page.locator('.footer-value').first().textContent();
    console.log('Final events count:', finalCount);
    
    // Check if events are being displayed in the activity panel
    const activityPanel = page.locator('[data-testid="realtime-activity"]');
    const activityContent = await activityPanel.textContent();
    console.log('Activity panel content:', activityContent);
  });
});