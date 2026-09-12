const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const iconsDir = path.join(root, 'assets', 'icons');
const tempDir = path.join(root, 'tmp', 'brand-assets');
const markSvg = path.join(iconsDir, 'archtimepro-mark-20260912.svg');
const appIconSvg = path.join(iconsDir, 'archtimepro-app-icon-20260912.svg');
const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

function svgDataUrl(filePath) {
  return `data:image/svg+xml;base64,${fs.readFileSync(filePath).toString('base64')}`;
}

async function renderPng(page, source, size, target) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${size}px;height:${size}px;background:transparent;overflow:hidden}img{display:block;width:${size}px;height:${size}px}</style><img src="${svgDataUrl(source)}" alt="">`);
  await page.locator('img').screenshot({ path: target, omitBackground: true, scale: 'css' });
}

function writePngIco(pngFiles, target) {
  const images = pngFiles.map(({ size, file }) => ({ size, data: fs.readFileSync(file) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(images.length * 16);
  let offset = 6 + entries.length;
  images.forEach((image, index) => {
    const entryOffset = index * 16;
    entries.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset);
    entries.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2);
    entries.writeUInt8(0, entryOffset + 3);
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(image.data.length, entryOffset + 8);
    entries.writeUInt32LE(offset, entryOffset + 12);
    offset += image.data.length;
  });

  fs.writeFileSync(target, Buffer.concat([header, entries, ...images.map((image) => image.data)]));
}

async function main() {
  if (!executablePath) throw new Error('Chrome o Edge non trovato.');
  fs.mkdirSync(tempDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

  const appSizes = [16, 24, 32, 48, 64, 120, 128, 152, 167, 180, 192, 256, 300, 512, 1080];
  const generated = new Map();
  for (const size of appSizes) {
    const target = path.join(tempDir, `archtimepro-app-icon-${size}.png`);
    await renderPng(page, appIconSvg, size, target);
    generated.set(size, target);
  }
  await renderPng(page, markSvg, 32, path.join(iconsDir, 'favicon-32-archtime-bars-20260912.png'));

  const rootCopies = new Map([
    ['apple-touch-icon.png', 180],
    ['apple-touch-icon-precomposed.png', 180],
    ['apple-touch-icon-bars-20260912.png', 180],
    ['apple-touch-icon-120.png', 120],
    ['apple-touch-icon-152.png', 152],
    ['apple-touch-icon-167.png', 167],
    ['apple-touch-icon-180.png', 180]
  ]);
  rootCopies.forEach((size, filename) => fs.copyFileSync(generated.get(size), path.join(root, filename)));

  fs.copyFileSync(generated.get(192), path.join(iconsDir, 'icon-192-archtime-bars-20260912.png'));
  fs.copyFileSync(generated.get(512), path.join(iconsDir, 'icon-512-archtime-bars-20260912.png'));
  fs.copyFileSync(generated.get(1080), path.join(iconsDir, 'archtimepro-app-icon-1080-20260912.png'));

  const desktopTargets = [
    path.join(root, 'desktop-timer-tauri', 'frontend', 'icon.png'),
    path.join(root, 'desktop-timer', 'assets', 'icon.png')
  ];
  desktopTargets.forEach((target) => fs.copyFileSync(generated.get(512), target));

  const icoSources = [16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, file: generated.get(size) }));
  writePngIco(icoSources, path.join(root, 'desktop-timer-tauri', 'src-tauri', 'icons', 'icon.ico'));
  writePngIco(icoSources, path.join(root, 'desktop-timer', 'assets', 'icon.ico'));

  await browser.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Nuovi asset Arch Time Pro generati.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
