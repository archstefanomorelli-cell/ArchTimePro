const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");

const root = __dirname;
const out = path.join(root, "output");
const chrome = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const ffmpeg = require("ffmpeg-static");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const base = pathToFileURL(path.join(root, "preview.html")).href;

  for (let slide = 1; slide <= 7; slide += 1) {
    await page.goto(`${base}?type=carousel&slide=${slide}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#artboard").screenshot({ path: path.join(out, `carosello-01-slide-${String(slide).padStart(2, "0")}.png`) });
  }

  await page.setViewportSize({ width: 1800, height: 2180 });
  const slides = Array.from({ length: 7 }, (_, index) => pathToFileURL(path.join(out, `carosello-01-slide-${String(index + 1).padStart(2, "0")}.png`)).href);
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;padding:64px;background:#dfe2e9;font-family:Arial,sans-serif}h1{margin:0 0 42px;color:#151d31;font-size:38px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:34px}.grid img{display:block;width:100%;border-radius:10px;box-shadow:0 12px 35px rgba(21,29,49,.13)}</style><h1>Carosello 01 · Anteprima completa</h1><div class="grid">${slides.map((src) => `<img src="${src}">`).join("")}</div>`);
  await page.screenshot({ path: path.join(out, "carosello-01-anteprima-completa.png"), fullPage: true });

  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto(`${base}?type=reel-reach`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#artboard").screenshot({ path: path.join(out, "reel-01-cover.png") });
  await page.goto(`${base}?type=reel`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#artboard").screenshot({ path: path.join(out, "reel-02-prodotto-cover.png") });
  await browser.close();

  async function recordReel({ type, name, waitMs, duration }) {
    const videoDir = path.join(out, `video-temp-${name}`);
    fs.mkdirSync(videoDir, { recursive: true });
    const videoBrowser = await chromium.launch({ headless: true, executablePath: chrome });
    const context = await videoBrowser.newContext({
      viewport: { width: 1080, height: 1920 },
      recordVideo: { dir: videoDir, size: { width: 1080, height: 1920 } }
    });
    const videoPage = await context.newPage();
    await videoPage.goto(`${base}?type=${type}`);
    await videoPage.evaluate(() => document.fonts.ready);
    await videoPage.waitForTimeout(waitMs);
    const video = videoPage.video();
    await context.close();
    await videoBrowser.close();
    const source = await video.path();
    const webm = path.join(out, `${name}-preview.webm`);
    const mp4 = path.join(out, `${name}.mp4`);
    fs.copyFileSync(source, webm);
    execFileSync(ffmpeg, [
      "-y", "-i", webm,
      "-vf", "trim=start=0.55,setpts=PTS-STARTPTS",
      "-t", String(duration),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-an", mp4
    ], { stdio: "inherit" });
    fs.rmSync(videoDir, { recursive: true, force: true });
  }

  await recordReel({ type: "reel-reach", name: "reel-01-instagram", waitMs: 15600, duration: 14.2 });
  await recordReel({ type: "reel", name: "reel-02-prodotto", waitMs: 16100, duration: 15 });
  console.log(`Output creati in ${out}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
