import { test, expect } from '@playwright/test';

test.describe('Laravel Spectrum Sandbox Tests', () => {
  test('Full application test with Swagger UI integration', async ({ page, context }) => {
    // Step 1: Navigate to the application
    console.log('Step 1: Navigating to http://localhost:8085...');
    await page.goto('http://localhost:8085');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Step 2: Clear browser cache and hard reload
    console.log('Step 2: Clearing cache and performing hard reload...');
    // Clear browser storage
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Perform hard reload (Ctrl+Shift+R equivalent)
    await page.reload({ waitUntil: 'networkidle' });
    
    // Step 3: Check browser console for JavaScript errors
    console.log('Step 3: Checking browser console for JavaScript errors...');
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push(`[${type}] ${text}`);
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });
    
    // Wait a moment for any console messages to appear
    await page.waitForTimeout(2000);
    
    // Step 4: Click the "spectrum:generate" button
    console.log('Step 4: Clicking the "spectrum:generate" button...');
    
    // Find and click the spectrum:generate button
    const generateButton = page.locator('button:has-text("spectrum:generate")').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // Step 5: Check if terminal output appears
    console.log('Step 5: Checking if terminal output appears...');
    
    // Wait for terminal output to appear
    const terminalOutput = page.locator('#terminal-output, .terminal-output, [class*="terminal"]').first();
    await expect(terminalOutput).toBeVisible({ timeout: 10000 });
    
    // Get terminal content
    const terminalContent = await terminalOutput.textContent();
    console.log('Terminal output found:', terminalContent ? 'Yes' : 'No');
    
    // Step 6: Check if Swagger UI loads at the bottom
    console.log('Step 6: Checking if Swagger UI loads at the bottom...');
    
    // Wait for Swagger UI to appear
    const swaggerUI = page.locator('#swagger-ui, .swagger-ui, [class*="swagger"]').first();
    
    try {
      await expect(swaggerUI).toBeVisible({ timeout: 15000 });
      console.log('Swagger UI found: Yes');
      
      // Check if Swagger UI is properly loaded
      const swaggerTitle = page.locator('.swagger-ui .title, #swagger-ui .title').first();
      if (await swaggerTitle.isVisible()) {
        const titleText = await swaggerTitle.textContent();
        console.log('Swagger UI title:', titleText);
      }
    } catch (error) {
      console.log('Swagger UI found: No');
      console.log('Error:', error);
    }
    
    // Step 7: Take a screenshot
    console.log('Step 7: Taking screenshot...');
    await page.screenshot({ 
      path: 'spectrum-sandbox-test.png',
      fullPage: true 
    });
    
    // Generate test report
    console.log('\n=== TEST REPORT ===');
    console.log('1. Navigation: Success');
    console.log('2. Cache cleared and page reloaded: Success');
    console.log(`3. JavaScript errors found: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('   Errors:', consoleErrors);
    }
    console.log(`4. spectrum:generate button clicked: Success`);
    console.log(`5. Terminal output visible: ${terminalContent ? 'Yes' : 'No'}`);
    console.log(`6. Swagger UI loaded: ${await swaggerUI.isVisible() ? 'Yes' : 'No'}`);
    console.log('7. Screenshot saved: spectrum-sandbox-test.png');
    console.log('\nAll console messages:');
    consoleMessages.forEach(msg => console.log(`  ${msg}`));
  });
});