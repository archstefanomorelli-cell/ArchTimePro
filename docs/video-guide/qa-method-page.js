const fs = require('fs');
const { chromium } = require('playwright');

const browserExecutable = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(candidate => fs.existsSync(candidate));

async function inspectViewport(browser, name, viewport) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:8765/metodo.html', { waitUntil: 'networkidle' });
    const videos = page.locator('.method-demo-video');
    const count = await videos.count();
    if (count !== 5) throw new Error(`${name}: attesi 5 video, trovati ${count}`);

    const results = [];
    for (let index = 0; index < count; index += 1) {
        const video = videos.nth(index);
        await video.scrollIntoViewIfNeeded();
        await page.waitForFunction(videoIndex => {
            const element = document.querySelectorAll('.method-demo-video')[videoIndex];
            return element && element.dataset.demoPrepared === 'true' && Boolean(element.currentSrc);
        }, index);
        await video.evaluate(element => new Promise((resolve, reject) => {
            if (element.readyState >= 1) return resolve();
            element.addEventListener('loadedmetadata', resolve, { once: true });
            element.addEventListener('error', () => reject(new Error(`video ${index + 1} non caricabile`)), { once: true });
        }));
        await page.waitForFunction(videoIndex => {
            const element = document.querySelectorAll('.method-demo-video')[videoIndex];
            return element && element.currentTime >= 1.9;
        }, index);
        const result = await video.evaluate(element => ({
            width: element.videoWidth,
            height: element.videoHeight,
            duration: element.duration,
            source: element.currentSrc
        }));
        if (result.width !== 840 || result.height !== 630 || result.duration <= 0) {
            throw new Error(`${name}: video ${index + 1} non valido ${JSON.stringify(result)}`);
        }
        results.push(result);
    }

    const firstVideo = videos.first();
    await firstVideo.evaluate(element => {
        element.currentTime = Math.max(0, element.duration - 0.05);
        return element.play();
    });
    await page.waitForFunction(() => {
        const element = document.querySelector('.method-demo-video');
        return element && element.currentTime >= 2 && element.currentTime < 4;
    });

    console.log(`${name}: ${results.length} video HD caricati, avviati e ripetuti correttamente`);
    await page.close();
}

async function main() {
    const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
    try {
        await inspectViewport(browser, 'desktop', { width: 1440, height: 900 });
        await inspectViewport(browser, 'mobile', { width: 390, height: 844 });
    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
