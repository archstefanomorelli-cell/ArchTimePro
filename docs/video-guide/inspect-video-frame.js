const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

async function main() {
    const input = path.resolve(process.argv[2]);
    const output = path.resolve(process.argv[3]);
    const framePosition = Math.min(0.95, Math.max(0.05, Number(process.argv[4]) || 0.58));
    const executablePath = [
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ].find(candidate => fs.existsSync(candidate));
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1120, height: 840 } });
    const videoSource = `data:video/webm;base64,${fs.readFileSync(input).toString('base64')}`;
    await page.setContent(`<style>*{box-sizing:border-box}html,body,video{margin:0;width:100%;height:100%;background:#fff}video{object-fit:contain}</style><video muted></video>`);
    await page.locator('video').evaluate((video, source) => { video.src = source; }, videoSource);
    const metadata = await page.locator('video').evaluate(video => new Promise((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration
        }), { once: true });
        video.addEventListener('error', () => reject(new Error('Video non leggibile')), { once: true });
        video.load();
    }));
    await page.locator('video').evaluate((video, targetTime) => new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true });
        video.currentTime = targetTime;
    }), Math.max(0.1, metadata.duration * framePosition));
    await page.screenshot({ path: output });
    console.log(JSON.stringify(metadata));
    await browser.close();
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
