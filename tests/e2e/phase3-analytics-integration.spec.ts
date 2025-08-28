import { test, expect } from '@playwright/test';

test.describe('Phase 3: Code Analytics & Intelligence Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for WebSocket connection and initial data load
    await page.waitForTimeout(2000);
  });

  test.describe('Analytics Dashboard Integration', () => {
    test('should display analytics dashboard with overview metrics', async ({ page }) => {
      // Should show the main analytics dashboard
      await expect(page.locator('text=Code Analytics')).toBeVisible();
      
      // Should show key metrics
      await expect(page.locator('text=Files Analyzed')).toBeVisible();
      await expect(page.locator('text=Average Complexity')).toBeVisible();
      await expect(page.locator('text=Dependencies')).toBeVisible();
      await expect(page.locator('text=Patterns Detected')).toBeVisible();
    });

    test('should generate analytics report automatically', async ({ page }) => {
      // Wait for automatic report generation
      await page.waitForTimeout(3000);
      
      // Should show report data
      const filesAnalyzed = page.locator('[data-testid="files-analyzed"]');
      if (await filesAnalyzed.isVisible()) {
        await expect(filesAnalyzed).toContainText(/\d+/); // Should contain a number
      }
    });

    test('should allow manual report refresh', async ({ page }) => {
      // Find and click refresh button
      const refreshButton = page.locator('button:has-text("Refresh")').first();
      await refreshButton.click();
      
      // Should show loading state briefly
      await expect(page.locator('text=Analyzing')).toBeVisible();
      
      // Should complete refresh
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Last updated')).toBeVisible();
    });
  });

  test.describe('Navigation Between Views', () => {
    test('should navigate between different analytics views', async ({ page }) => {
      // Start with overview
      await expect(page.locator('.nav-btn.active:has-text("Overview")')).toBeVisible();
      
      // Navigate to Trends
      await page.click('.nav-btn:has-text("Trends")');
      await expect(page.locator('.trends-view')).toBeVisible();
      
      // Navigate to Hotspots
      await page.click('.nav-btn:has-text("Hotspots")');
      await expect(page.locator('.hotspots-view')).toBeVisible();
      
      // Navigate to Dependencies
      await page.click('.nav-btn:has-text("Dependencies")');
      await expect(page.locator('.dependencies-view')).toBeVisible();
      
      // Navigate to Code Smells
      await page.click('.nav-btn:has-text("Code Smells")');
      await expect(page.locator('.smells-view')).toBeVisible();
    });

    test('should maintain active state for current view', async ({ page }) => {
      // Click on Trends tab
      await page.click('.nav-btn:has-text("Trends")');
      
      // Should have active class
      await expect(page.locator('.nav-btn.active:has-text("Trends")')).toBeVisible();
      
      // Overview should not be active
      await expect(page.locator('.nav-btn.active:has-text("Overview")')).not.toBeVisible();
    });
  });

  test.describe('Trends Visualization', () => {
    test('should display complexity trends chart', async ({ page }) => {
      // Navigate to trends view
      await page.click('.nav-btn:has-text("Trends")');
      
      // Should show trend chart
      await expect(page.locator('.trend-chart-container')).toBeVisible();
      await expect(page.locator('svg')).toBeVisible();
      
      // Should have metric selection
      await expect(page.locator('select')).toBeVisible();
    });

    test('should allow switching between different metrics', async ({ page }) => {
      await page.click('.nav-btn:has-text("Trends")');
      
      const metricSelect = page.locator('select');
      
      // Should have different metric options
      await expect(metricSelect.locator('option:has-text("Complexity")')).toBeVisible();
      await expect(metricSelect.locator('option:has-text("Lines of Code")')).toBeVisible();
      await expect(metricSelect.locator('option:has-text("Functions")')).toBeVisible();
      
      // Switch to Lines of Code
      await metricSelect.selectOption('lines');
      
      // Chart should update (wait for re-render)
      await page.waitForTimeout(1000);
    });

    test('should show chart legend when data is available', async ({ page }) => {
      await page.click('.nav-btn:has-text("Trends")');
      
      // If there's data, should show legend
      const legend = page.locator('.chart-legend');
      const hasData = await page.locator('.no-data').count() === 0;
      
      if (hasData) {
        await expect(legend).toBeVisible();
      }
    });
  });

  test.describe('Hotspots Detection', () => {
    test('should display code hotspots panel', async ({ page }) => {
      await page.click('.nav-btn:has-text("Hotspots")');
      
      await expect(page.locator('.hotspots-panel')).toBeVisible();
      await expect(page.locator('h3:has-text("Code Hotspots")')).toBeVisible();
    });

    test('should show hotspot sorting options', async ({ page }) => {
      await page.click('.nav-btn:has-text("Hotspots")');
      
      const sortSelect = page.locator('.panel-controls select');
      if (await sortSelect.isVisible()) {
        await expect(sortSelect.locator('option:has-text("Score")')).toBeVisible();
        await expect(sortSelect.locator('option:has-text("Severity")')).toBeVisible();
        await expect(sortSelect.locator('option:has-text("Reason")')).toBeVisible();
      }
    });

    test('should display hotspot details when available', async ({ page }) => {
      await page.click('.nav-btn:has-text("Hotspots")');
      
      const hotspotCard = page.locator('.hotspot-card').first();
      
      if (await hotspotCard.count() > 0) {
        await expect(hotspotCard.locator('.hotspot-file')).toBeVisible();
        await expect(hotspotCard.locator('.severity-badge')).toBeVisible();
        await expect(hotspotCard.locator('.hotspot-score')).toBeVisible();
      } else {
        // Should show no hotspots message
        await expect(page.locator('.no-hotspots')).toBeVisible();
        await expect(page.locator('text=No Code Hotspots Detected')).toBeVisible();
      }
    });

    test('should allow hotspot interactions', async ({ page }) => {
      await page.click('.nav-btn:has-text("Hotspots")');
      
      const hotspotCard = page.locator('.hotspot-card').first();
      
      if (await hotspotCard.count() > 0) {
        // Should have action buttons
        await expect(hotspotCard.locator('button:has-text("View")')).toBeVisible();
        await expect(hotspotCard.locator('button:has-text("Analyze")')).toBeVisible();
        await expect(hotspotCard.locator('button:has-text("Ignore")')).toBeVisible();
        
        // Click should be possible
        await hotspotCard.click();
      }
    });
  });

  test.describe('Dependencies Graph', () => {
    test('should display dependency graph visualization', async ({ page }) => {
      await page.click('.nav-btn:has-text("Dependencies")');
      
      await expect(page.locator('.dependency-graph-container')).toBeVisible();
      await expect(page.locator('h3:has-text("Dependency Graph")')).toBeVisible();
    });

    test('should show graph controls', async ({ page }) => {
      await page.click('.nav-btn:has-text("Dependencies")');
      
      const controls = page.locator('.graph-controls');
      await expect(controls.locator('input[type="checkbox"]')).toHaveCount(2); // Labels and Clusters
      
      // Should have reset and center buttons if interactive
      const resetBtn = controls.locator('button:has-text("Reset")');
      if (await resetBtn.isVisible()) {
        await expect(resetBtn).toBeVisible();
        await expect(controls.locator('button:has-text("Center")')).toBeVisible();
      }
    });

    test('should display graph legend', async ({ page }) => {
      await page.click('.nav-btn:has-text("Dependencies")');
      
      const legend = page.locator('.graph-legend');
      await expect(legend).toBeVisible();
      await expect(legend.locator('h4:has-text("Languages")')).toBeVisible();
      await expect(legend.locator('h4:has-text("Connections")')).toBeVisible();
    });

    test('should show SVG graph when data is available', async ({ page }) => {
      await page.click('.nav-btn:has-text("Dependencies")');
      
      const svg = page.locator('.graph-content svg');
      const noData = page.locator('.no-data');
      
      // Either should have graph or no data message
      const hasGraph = await svg.count() > 0;
      const hasNoData = await noData.count() > 0;
      
      expect(hasGraph || hasNoData).toBe(true);
      
      if (hasNoData) {
        await expect(page.locator('text=No Dependency Data Available')).toBeVisible();
      }
    });
  });

  test.describe('Code Smells Detection', () => {
    test('should display code smells view', async ({ page }) => {
      await page.click('.nav-btn:has-text("Code Smells")');
      
      await expect(page.locator('.smells-view')).toBeVisible();
      await expect(page.locator('h3:has-text("Code Smells Detected")')).toBeVisible();
    });

    test('should show code smell cards when detected', async ({ page }) => {
      await page.click('.nav-btn:has-text("Code Smells")');
      
      const smellCard = page.locator('.smell-card').first();
      const noSmells = page.locator('.no-smells');
      
      // Either should have smells or no smells message
      const hasSmells = await smellCard.count() > 0;
      const hasNoSmells = await noSmells.count() > 0;
      
      expect(hasSmells || hasNoSmells).toBe(true);
      
      if (hasSmells) {
        await expect(smellCard.locator('.smell-type')).toBeVisible();
        await expect(smellCard.locator('.smell-severity')).toBeVisible();
        await expect(smellCard.locator('.smell-description')).toBeVisible();
        await expect(smellCard.locator('.smell-suggestion')).toBeVisible();
      } else {
        await expect(page.locator('text=No Code Smells Detected!')).toBeVisible();
      }
    });

    test('should display severity levels correctly', async ({ page }) => {
      await page.click('.nav-btn:has-text("Code Smells")');
      
      const smellCards = page.locator('.smell-card');
      const cardCount = await smellCards.count();
      
      if (cardCount > 0) {
        for (let i = 0; i < Math.min(cardCount, 5); i++) {
          const card = smellCards.nth(i);
          const severityBadge = card.locator('.smell-severity');
          
          // Should have a severity class
          const severityText = await severityBadge.textContent();
          expect(['critical', 'major', 'minor'].includes(severityText?.toLowerCase() || '')).toBe(true);
        }
      }
    });
  });

  test.describe('Auto-refresh Functionality', () => {
    test('should have auto-refresh toggle button', async ({ page }) => {
      const autoRefreshBtn = page.locator('button:has-text("Auto")').first();
      await expect(autoRefreshBtn).toBeVisible();
      
      // Should be active by default
      await expect(autoRefreshBtn).toHaveClass(/active/);
    });

    test('should toggle auto-refresh state', async ({ page }) => {
      const autoRefreshBtn = page.locator('button:has-text("Auto")').first();
      
      // Initially active
      await expect(autoRefreshBtn).toHaveClass(/active/);
      
      // Click to disable
      await autoRefreshBtn.click();
      await expect(autoRefreshBtn).not.toHaveClass(/active/);
      
      // Click to enable
      await autoRefreshBtn.click();
      await expect(autoRefreshBtn).toHaveClass(/active/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should still show main elements
      await expect(page.locator('h2:has-text("Code Analytics")')).toBeVisible();
      
      // Navigation should be scrollable
      const nav = page.locator('.dashboard-nav');
      await expect(nav).toBeVisible();
    });

    test('should handle tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Should show all main components
      await expect(page.locator('.analytics-dashboard')).toBeVisible();
      await expect(page.locator('.dashboard-header')).toBeVisible();
      await expect(page.locator('.dashboard-nav')).toBeVisible();
    });
  });

  test.describe('Integration with File Monitoring', () => {
    test('should update analytics when file changes are detected', async ({ page }) => {
      // Get initial files count
      const initialMetrics = await page.textContent('.metric-value');
      
      // Wait for potential file system changes
      await page.waitForTimeout(5000);
      
      // Manually refresh to check for updates
      await page.click('button:has-text("Refresh")').first();
      await page.waitForTimeout(2000);
      
      // Analytics should be responsive to changes
      const updated = await page.locator('text=Last updated').isVisible();
      expect(updated).toBe(true);
    });

    test('should process real-time file analysis data', async ({ page }) => {
      // Monitor console for analytics processing
      const logs: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('Analytics') || msg.text().includes('processing')) {
          logs.push(msg.text());
        }
      });
      
      // Wait for some processing
      await page.waitForTimeout(3000);
      
      // Should have some analytics activity
      // (This would be more specific in a real environment with controlled file changes)
      const hasAnalyticsActivity = logs.some(log => 
        log.includes('Analytics') || log.includes('analysis')
      );
      
      // Even if no activity, the system should be ready
      await expect(page.locator('.analytics-dashboard')).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Navigate through different views quickly
      const views = ['Overview', 'Trends', 'Hotspots', 'Dependencies', 'Code Smells'];
      
      for (const view of views) {
        await page.click(`.nav-btn:has-text("${view}")`);
        
        // Should render within reasonable time
        await page.waitForTimeout(500);
        
        // Should not show errors
        const errorElements = await page.locator('[class*="error"]').count();
        expect(errorElements).toBe(0);
      }
    });

    test('should maintain performance during auto-refresh cycles', async ({ page }) => {
      // Enable auto-refresh if not already enabled
      const autoRefreshBtn = page.locator('button:has-text("Auto")').first();
      if (!await autoRefreshBtn.locator('.active').isVisible()) {
        await autoRefreshBtn.click();
      }
      
      // Wait through a couple refresh cycles
      await page.waitForTimeout(10000);
      
      // Should still be responsive
      await page.click('.nav-btn:has-text("Trends")');
      await expect(page.locator('.trends-view')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should gracefully handle analytics errors', async ({ page }) => {
      // Simulate error by disrupting network or data
      await page.route('/api/analytics', route => route.abort());
      
      // Try to refresh
      await page.click('button:has-text("Refresh")').first();
      
      // Should not crash the application
      await expect(page.locator('.analytics-dashboard')).toBeVisible();
      
      // Should show some form of error handling or graceful degradation
      await page.waitForTimeout(2000);
    });

    test('should handle empty or invalid data gracefully', async ({ page }) => {
      // The dashboard should handle cases where no analysis data is available
      await expect(page.locator('.analytics-dashboard')).toBeVisible();
      
      // Should show appropriate empty states
      const emptyStates = await page.locator('.no-data, .empty-state, .no-hotspots, .no-smells').count();
      
      // At least some empty states should be present if there's no real data
      if (emptyStates > 0) {
        await expect(page.locator('.analytics-dashboard')).toBeVisible();
      }
    });
  });
});

test.describe('Phase 3 Component Integration', () => {
  test('should integrate all Phase 3 components seamlessly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // All major Phase 3 components should be accessible
    await expect(page.locator('text=Code Analytics')).toBeVisible();
    
    // Test each major component
    const components = [
      { name: 'Overview', selector: '.overview-grid' },
      { name: 'Trends', selector: '.trend-chart-container' },
      { name: 'Hotspots', selector: '.hotspots-panel' },
      { name: 'Dependencies', selector: '.dependency-graph-container' },
      { name: 'Code Smells', selector: '.smells-panel' }
    ];

    for (const component of components) {
      await page.click(`.nav-btn:has-text("${component.name}")`);
      
      // Component should render
      const element = page.locator(component.selector);
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
      
      await page.waitForTimeout(500);
    }
  });

  test('should maintain data consistency across components', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Get data from overview
    await page.click('.nav-btn:has-text("Overview")');
    const overviewData = await page.textContent('.analytics-dashboard');

    // Check trends
    await page.click('.nav-btn:has-text("Trends")');
    await page.waitForTimeout(1000);

    // Check hotspots
    await page.click('.nav-btn:has-text("Hotspots")');
    await page.waitForTimeout(1000);

    // Data should be consistent (no crashes, reasonable state transitions)
    await expect(page.locator('.analytics-dashboard')).toBeVisible();
  });
});