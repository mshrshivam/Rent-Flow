const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => {
    console.log('PAGE LOG>', msg.type(), msg.text());
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR>', error);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('BAD RESPONSE>', response.status(), response.url());
    }
  });
  await page.goto('http://localhost:8080');
  // wait a bit to capture
  await page.waitForTimeout(5000);
  await browser.close();
})();