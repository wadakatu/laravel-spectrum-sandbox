const { chromium } = require('playwright');

(async () => {
  console.log('Starting Laravel Spectrum Sandbox UI Test...\n');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  const consoleErrors = [];
  
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      consoleErrors.push(text);
    }
  });
  
  try {
    // Step 1: Navigate to the application
    console.log('Step 1: Navigating to http://localhost:8085...');
    await page.goto('http://localhost:8085', { waitUntil: 'networkidle' });
    console.log('✓ Navigation successful\n');
    
    // Step 2: Clear cache and hard reload
    console.log('Step 2: Clearing cache and performing hard reload...');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });
    console.log('✓ Cache cleared and page reloaded\n');
    
    // Step 3: Check for JavaScript errors
    console.log('Step 3: Checking browser console for JavaScript errors...');
    await page.waitForTimeout(2000); // Wait for any delayed errors
    
    if (consoleErrors.length > 0) {
      console.log(`✗ Found ${consoleErrors.length} JavaScript errors:`);
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✓ No JavaScript errors found');
    }
    console.log('');
    
    // Step 4: Click spectrum:generate button
    console.log('Step 4: Looking for "spectrum:generate" button...');
    
    // Try multiple selectors
    const buttonSelectors = [
      'button:has-text("spectrum:generate")',
      'button:has-text("generate")',
      '[data-command="spectrum:generate"]',
      '.command-button:has-text("generate")'
    ];
    
    let generateButton = null;
    for (const selector of buttonSelectors) {
      try {
        generateButton = await page.locator(selector).first();
        if (await generateButton.isVisible({ timeout: 5000 })) {
          console.log(`✓ Found button using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (generateButton && await generateButton.isVisible()) {
      await generateButton.click();
      console.log('✓ Clicked spectrum:generate button\n');
    } else {
      console.log('✗ Could not find spectrum:generate button\n');
    }
    
    // Step 5: Check for terminal output
    console.log('Step 5: Checking for terminal output...');
    await page.waitForTimeout(3000); // Wait for terminal to update
    
    const terminalSelectors = [
      '#terminal-output',
      '.terminal-output',
      '#terminal',
      '.terminal',
      '[class*="terminal"]',
      'pre:has-text("Generating")',
      'pre:has-text("spectrum")'
    ];
    
    let terminalFound = false;
    let terminalContent = '';
    
    for (const selector of terminalSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          terminalContent = await element.textContent() || '';
          if (terminalContent.trim()) {
            console.log(`✓ Terminal output found using selector: ${selector}`);
            console.log(`  Content preview: ${terminalContent.substring(0, 100)}...`);
            terminalFound = true;
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!terminalFound) {
      console.log('✗ No terminal output found');
    }
    console.log('');
    
    // Step 6: Check for Swagger UI
    console.log('Step 6: Checking for Swagger UI...');
    await page.waitForTimeout(5000); // Wait for Swagger UI to load
    
    const swaggerSelectors = [
      '#swagger-ui',
      '.swagger-ui',
      '[id*="swagger"]',
      '[class*="swagger"]',
      'iframe[src*="swagger"]',
      'div:has-text("API Documentation")'
    ];
    
    let swaggerFound = false;
    
    for (const selector of swaggerSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✓ Swagger UI found using selector: ${selector}`);
          
          // Check if it's at the bottom
          const box = await element.boundingBox();
          const viewport = page.viewportSize();
          if (box && viewport) {
            const isAtBottom = box.y > viewport.height / 2;
            console.log(`  Position: ${isAtBottom ? 'Bottom half' : 'Top half'} of page`);
            console.log(`  Dimensions: ${box.width}x${box.height}`);
          }
          
          swaggerFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!swaggerFound) {
      console.log('✗ Swagger UI not found');
      
      // Check for any iframes
      const iframes = await page.locator('iframe').count();
      console.log(`  Found ${iframes} iframe(s) on the page`);
    }
    console.log('');
    
    // Step 7: Take screenshot
    console.log('Step 7: Taking screenshot...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `spectrum-sandbox-test-${timestamp}.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`✓ Screenshot saved: ${screenshotPath}\n`);
    
    // Summary
    console.log('=== TEST SUMMARY ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`JavaScript errors: ${consoleErrors.length}`);
    console.log(`Terminal output found: ${terminalFound ? 'Yes' : 'No'}`);
    console.log(`Swagger UI found: ${swaggerFound ? 'Yes' : 'No'}`);
    
    // Show all console messages
    if (consoleMessages.length > 0) {
      console.log('\n=== ALL CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\nPress Ctrl+C to close the browser and exit...');
    await new Promise(() => {}); // Keep process running
  }
})();