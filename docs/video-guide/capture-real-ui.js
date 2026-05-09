const { spawn } = require('child_process');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..');
const serverScript = path.join(__dirname, 'server.js');
const outputDir = path.join(__dirname, 'frames-real');
const baseUrl = 'http://127.0.0.1:8765/app.html?videoDemo=1';
const browserCandidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserExecutable = browserCandidates.find(file => fsSync.existsSync(file));

const shots = [
    ['01-dashboard', 'dashboard'],
    ['02-project-modal', 'project-modal'],
    ['03-manual-entry', 'manual-entry'],
    ['04-project-detail', 'project-detail'],
    ['05-team-costs', 'team'],
    ['06-analytics', 'analytics'],
    ['07-onboarding', 'onboarding'],
    ['08-timer-running', 'timer-running']
];

const cdnFallbacks = {
    'cdn.tailwindcss.com': 'window.tailwind = window.tailwind || {};',
    'unpkg.com/@supabase/supabase-js@2': `
        window.supabase = {
            createClient() {
                const chain = {
                    select() { return chain; },
                    update() { return chain; },
                    insert() { return chain; },
                    delete() { return chain; },
                    eq() { return chain; },
                    order() { return chain; },
                    single() { return Promise.resolve({ data: null, error: null }); },
                    then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); }
                };
                return {
                    auth: {
                        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
                        signUp: () => Promise.resolve({ error: null }),
                        signInWithPassword: () => Promise.resolve({ error: null }),
                        signOut: () => Promise.resolve({ error: null }),
                        resetPasswordForEmail: () => Promise.resolve({ error: null }),
                        updateUser: () => Promise.resolve({ data: {}, error: null }),
                        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
                    },
                    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
                    from: () => chain,
                    rpc: () => Promise.resolve({ data: null, error: null })
                };
            }
        };
    `,
    'unpkg.com/lucide@latest': 'window.lucide = { createIcons() {} };',
    'cdn.jsdelivr.net/npm/chart.js': `
        window.Chart = class {
            constructor(canvas, config) {
                this.canvas = canvas;
                const ctx = canvas?.getContext?.('2d');
                if (!ctx) return;
                const width = canvas.width || canvas.clientWidth || 420;
                const height = canvas.height || canvas.clientHeight || 220;
                ctx.clearRect(0, 0, width, height);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(24, height - 28);
                ctx.lineTo(width - 16, height - 28);
                ctx.stroke();
                const labels = config?.data?.labels || ['A', 'B', 'C'];
                const values = config?.data?.datasets?.[0]?.data || [35, 62, 48];
                const max = Math.max(...values, 1);
                const barWidth = Math.max(18, (width - 80) / values.length - 12);
                values.forEach((value, index) => {
                    const x = 34 + index * (barWidth + 12);
                    const barHeight = Math.max(12, (height - 70) * value / max);
                    ctx.fillStyle = ['#4f46e5', '#10b981', '#f59e0b', '#64748b'][index % 4];
                    ctx.fillRect(x, height - 28 - barHeight, barWidth, barHeight);
                    ctx.fillStyle = '#64748b';
                    ctx.font = '11px Arial';
                    ctx.fillText(String(labels[index] || ''), x, height - 10);
                });
            }
            destroy() {}
            update() {}
        };
        window.Chart.defaults = { font: {} };
    `,
    'cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': 'window.jspdf = { jsPDF: class {} };',
    'cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js': ''
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    await fs.mkdir(outputDir, { recursive: true });
    const server = spawn(process.execPath, [serverScript], {
        cwd: root,
        stdio: 'ignore',
        detached: false
    });
    await delay(900);

    const browser = await chromium.launch({
        headless: true,
        executablePath: browserExecutable,
        args: ['--disable-gpu', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    if (process.env.ARCHTIME_CDN_FALLBACK === '1') {
        await page.route('**/*', route => {
            const url = route.request().url();
            const fallbackKey = Object.keys(cdnFallbacks).find(key => url.includes(key));
            if (fallbackKey) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/javascript',
                    body: cdnFallbacks[fallbackKey]
                });
            }
            return route.continue();
        });
    }

    try {
        for (const [name, scene] of shots) {
            const url = `${baseUrl}&scene=${encodeURIComponent(scene)}&v=${Date.now()}`;
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForFunction(() => window.__ARCHTIME_VIDEO_DEMO_READY__ === true, null, { timeout: 10000 });
            await page.waitForTimeout(450);
            const file = path.join(outputDir, `${name}.png`);
            await page.screenshot({ path: file, fullPage: false });
            console.log(file);
        }
    } finally {
        await browser.close();
        server.kill();
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
