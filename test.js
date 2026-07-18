const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error));
  
  await page.goto('http://localhost:8080/');
  
  // Login with Apps script url
  await page.fill('#login-sheet-url', 'https://script.google.com/macros/s/AKfycbwXYZ/exec');
  await page.click('#login-connect-btn');
  
  // Wait for app to be visible
  await page.waitForSelector('#app:visible', { timeout: 5000 });
  
  // Intercept the download
  page.on('download', download => console.log('DOWNLOAD STARTED:', download.suggestedFilename()));
  
  // Observe DOM for toasts
  await page.exposeFunction('logToast', text => console.log('TOAST:', text));
  await page.evaluate(() => {
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.addedNodes.length) {
          m.addedNodes.forEach(n => {
            if (n.classList && n.classList.contains('toast')) {
              window.logToast(n.innerText);
            }
          });
        }
      });
    });
    observer.observe(document.getElementById('toast-container'), { childList: true });
  });

  // Click sync icon
  await page.click('#sync-status');
  
  // Wait a bit
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
