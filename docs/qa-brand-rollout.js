const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tmp', 'brand-qa');
const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

async function inspect(page, name, url, viewport, selector) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator(selector).waitFor({ state: 'visible' });
  const report = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    brokenImages: [...document.images]
      .filter((image) => image.getAttribute('src'))
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute('src'))
  }));
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  if (report.overflow || report.brokenImages.length) throw new Error(`${name}: ${JSON.stringify(report)}`);
  return report;
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('archtime_analytics_consent_v1', 'denied'));
  const base = 'http://127.0.0.1:8765';

  const results = {};
  results.homeDesktop = await inspect(page, 'home-desktop', `${base}/index.html`, { width: 1440, height: 900 }, '.public-brand-mark');
  await page.locator('#public-site-footer').screenshot({ path: path.join(output, 'home-footer.png') });
  results.homeMobile = await inspect(page, 'home-mobile', `${base}/index.html`, { width: 390, height: 844 }, '.public-brand-mark');
  results.appDesktop = await inspect(page, 'app-login-desktop', `${base}/app.html`, { width: 1440, height: 900 }, '#landing-title img');
  results.appMobile = await inspect(page, 'app-login-mobile', `${base}/app.html`, { width: 390, height: 844 }, '.app-auth-brand-mobile img');
  results.appDashboard = await inspect(page, 'app-dashboard', `${base}/app.html?videoDemo=1`, { width: 1440, height: 900 }, '#header-title img');
  results.appHeader = await page.evaluate(() => ({
    studioLogoPresent: Boolean(document.getElementById('header-logo')),
    productMarkVisible: Boolean(document.querySelector('#header-title img'))
  }));
  if (results.appHeader.studioLogoPresent || !results.appHeader.productMarkVisible) {
    throw new Error(`app-header: ${JSON.stringify(results.appHeader)}`);
  }
  results.octoberPrototype = await inspect(page, 'october-prototype', `${base}/app-prototipo-flusso-economico.html?videoDemo=1`, { width: 1440, height: 900 }, '#header-title img');
  results.octoberPrototypeHeader = await page.evaluate(() => ({
    studioLogoPresent: Boolean(document.getElementById('header-logo')),
    productMarkVisible: Boolean(document.querySelector('#header-title img'))
  }));
  if (results.octoberPrototypeHeader.studioLogoPresent || !results.octoberPrototypeHeader.productMarkVisible) {
    throw new Error(`october-prototype-header: ${JSON.stringify(results.octoberPrototypeHeader)}`);
  }
  results.offline = await inspect(page, 'offline', `${base}/offline.html`, { width: 390, height: 844 }, '.mark');
  results.desktopTimer = await inspect(page, 'desktop-timer', `${base}/desktop-timer-tauri/frontend/index.html`, { width: 430, height: 740 }, '.brand-mark img');

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
