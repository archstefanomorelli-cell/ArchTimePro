const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const browserCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 292, height: 92 } });
    await page.goto(`file:///${path.join(root, 'desktop-timer-tauri', 'frontend', 'index.html').replace(/\\/g, '/')}`);

    await page.evaluate(() => {
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('timer-view').classList.remove('hidden');
        document.body.classList.add('desktop-compact');
        document.getElementById('compact-context').textContent = 'Casa Rossi · Progettazione esecutiva';
        document.getElementById('timer-display').textContent = '08:59:59';
        const button = document.getElementById('btn-toggle-timer');
        button.classList.add('running');
        button.innerHTML = '<span>Ferma e salva</span>';
    });

    const compact = await page.evaluate(() => {
        const timer = document.getElementById('timer-display').getBoundingClientRect();
        const expand = document.getElementById('btn-expand-compact').getBoundingClientRect();
        const button = document.getElementById('btn-toggle-timer').getBoundingClientRect();
        return {
            timerRight: timer.right,
            expandLeft: expand.left,
            expandRight: expand.right,
            buttonLeft: button.left,
            timerGap: expand.left - timer.right,
            buttonGap: button.left - expand.right,
            overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
    });

    if (compact.timerGap < 8 || compact.buttonGap < 8 || compact.overflowX) {
        throw new Error(`Layout compatto non valido: ${JSON.stringify(compact)}`);
    }

    const primaryColor = await page.evaluate(() => {
        document.body.classList.remove('desktop-compact');
        const button = document.getElementById('btn-toggle-timer');
        button.classList.remove('running');
        return getComputedStyle(button).backgroundColor;
    });

    if (primaryColor !== 'rgb(15, 23, 42)') {
        throw new Error(`Colore timer inatteso: ${primaryColor}`);
    }

    console.log(JSON.stringify({ compact, primaryColor }, null, 2));
    await browser.close();
})().catch(error => {
    console.error(error);
    process.exit(1);
});
