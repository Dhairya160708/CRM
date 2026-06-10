import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

// Login page
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'C:/Users/dhair/AppData/Local/Temp/crm-login.png' });
console.log('login done');

// Sign in
await page.fill('input[type="email"]', 'admin@medtrade.com');
await page.fill('input[type="password"]', 'Admin@1234');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 30000 });
await page.waitForLoadState('networkidle');
await page.screenshot({ path: 'C:/Users/dhair/AppData/Local/Temp/crm-dashboard.png' });
console.log('dashboard done');

// Orders — wait for spinner to disappear (data loaded)
await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'C:/Users/dhair/AppData/Local/Temp/crm-orders.png' });
console.log('orders done');

// Clients
await page.goto('http://localhost:3000/clients', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'C:/Users/dhair/AppData/Local/Temp/crm-clients.png' });
console.log('clients done');

// Order detail — first order
await page.goto('http://localhost:3000/orders', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const firstOrderLink = page.locator('table tbody tr:first-child td a').first();
const href = await firstOrderLink.getAttribute('href').catch(() => null);
if (href) {
  await page.goto('http://localhost:3000' + href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/dhair/AppData/Local/Temp/crm-order-detail.png' });
  console.log('order detail done');
}

await browser.close();
