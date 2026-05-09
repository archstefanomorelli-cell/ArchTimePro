const { spawn } = require('child_process');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..');
const serverScript = path.join(__dirname, 'server.js');
const outputDir = path.join(__dirname, 'videos-real');
const baseUrl = 'http://127.0.0.1:8765/app.html?videoDemo=1';
const browserCandidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserExecutable = browserCandidates.find(file => fsSync.existsSync(file));

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

const clips = [
    {
        file: '01-dashboard-timer.webm',
        scene: 'dashboard',
        steps: [
            ['Guarda subito margini, progetti attivi e lavoro della settimana.', async page => moveCursor(page, '#kpi-margin')],
            ['Scegli il progetto su cui stai lavorando.', async page => guidedSelect(page, '#project-select', '0')],
            ['Scegli l\'attivita e premi Avvia ora.', async page => {
                await guidedSelect(page, '#task-select', 'Progetto definitivo');
                await guidedClick(page, '#btn-toggle-timer', () => page.evaluate(() => {
                    document.getElementById('timer-display').innerText = '00:18:42';
                    document.getElementById('btn-text').innerText = 'Ferma timer';
                }));
            }]
        ]
    },
    {
        file: '02-nuovo-progetto.webm',
        scene: 'dashboard',
        steps: [
            ['Dalla dashboard apri il modale per creare un nuovo progetto.', async page => {
                await guidedClick(page, '#btn-open-project-modal');
            }],
            ['Scrivi nome progetto, cliente e budget iniziale.', async page => {
                await guidedFill(page, '#edit-modal-name', 'Ristrutturazione Bianchi');
                await guidedFill(page, '#edit-modal-client', 'Famiglia Bianchi');
                await guidedFill(page, '#edit-modal-budget', '15000');
            }],
            ['Scegli un template per partire da una lista attivita gia pronta.', async page => guidedSelect(page, '#new-proj-template', '0')],
            ['Le attivita restano modificabili e ordinabili prima di salvare.', async page => moveCursor(page, '#edit-proj-selected-tasks')]
        ]
    },
    {
        file: '03-budget-libero-somma-attivita.webm',
        scene: 'dashboard',
        steps: [
            ['Apri un nuovo progetto dalla dashboard.', async page => {
                await guidedClick(page, '#btn-open-project-modal');
                await guidedFill(page, '#edit-modal-name', 'Casa sul parco');
                await guidedFill(page, '#edit-modal-client', 'Cliente demo');
                await guidedSelect(page, '#new-proj-template', '0');
            }],
            ['Budget libero: inserisci una cifra unica di progetto.', async page => {
                await guidedClick(page, '#budget-mode-manual');
                await guidedFill(page, '#edit-modal-budget', '12000');
            }],
            ['In questa modalita non compili i costi delle singole attivita.', async page => moveCursor(page, '#edit-proj-selected-tasks')],
            ['Somma attivita: ogni voce puo avere un importo e il totale si aggiorna da solo.', async page => {
                await guidedClick(page, '#budget-mode-auto');
                await page.waitForTimeout(350);
                await guidedFill(page, 'input.task-budget-input[data-task="Progetto definitivo"]', '4000');
                await guidedFill(page, 'input.task-budget-input[data-task="Direzione lavori"]', '8000');
            }],
            ['Le attivita senza importo restano fuori piano e non pesano sul ritmo progetto.', async page => moveCursor(page, '#project-budget-mode-note')]
        ]
    },
    {
        file: '04-ore-manuali.webm',
        scene: 'dashboard',
        steps: [
            ['Dalla dashboard apri l\'inserimento manuale delle ore.', async page => guidedClick(page, '#btn-open-manual-entry')],
            ['Scegli progetto e attivita da registrare.', async page => {
                await guidedSelect(page, '#manual-project', '0');
                await guidedSelect(page, '#manual-task', 'Progetto definitivo');
            }],
            ['Inserisci ora di inizio e ora di fine: la durata viene calcolata in ore:minuti.', async page => {
                await guidedFill(page, '#manual-start', '09:00');
                await guidedFill(page, '#manual-end', '11:30');
            }],
            ['Salva: il tempo finisce nel registro e nei margini del progetto.', async page => moveCursor(page, '#btn-save-manual-entry')]
        ]
    },
    {
        file: '05-dettaglio-progetto.webm',
        scene: 'dashboard',
        steps: [
            ['Dalla dashboard apri un progetto per leggere budget, costi, margine e ritmo.', async page => guidedClick(page, '[data-ui-action="show-project-detail"][data-project-id="demo-villa"]')],
            ['Scorri: trovi attivita, ore, costi e spese dello stesso progetto.', async page => {
                await page.locator('#modal-detail > div').first().evaluate(el => { el.scrollTop = 360; });
                await moveCursor(page, '#modal-detail');
            }]
        ]
    },
    {
        file: '06-team-costi.webm',
        scene: 'dashboard',
        steps: [
            ['Scorri fino al team e apri un collaboratore.', async page => guidedClick(page, '[data-ui-action="edit-team-member"][data-profile-id="demo-laura"]')],
            ['Scrivi il costo orario interno del collaboratore.', async page => guidedFill(page, '#edit-team-cost', '42')],
            ['Da quel momento le sue ore entrano nel margine reale dei progetti.', async page => moveCursor(page, '#btn-save-team-edit')],
            ['Invita nuovi collaboratori con codice o email, senza creare account a mano.', async page => {
                await page.keyboard.press('Escape');
                await moveCursor(page, '#btn-generate-invite');
            }]
        ]
    },
    {
        file: '07-analisi.webm',
        scene: 'dashboard',
        steps: [
            ['Dalla dashboard apri il dettaglio analisi solo quando vuoi approfondire i numeri.', async page => guidedClick(page, '#btn-open-analytics-detail')],
            ['Scorri per vedere quali lavori e attivita assorbono piu risorse.', async page => {
                await page.locator('#modal-analytics-detail > div').first().evaluate(el => { el.scrollTop = 420; });
                await moveCursor(page, '#modal-analytics-detail');
            }]
        ]
    }
];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function installRoutes(page) {
    if (process.env.ARCHTIME_CDN_FALLBACK !== '1') return;
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

async function setupGuideOverlay(page) {
    await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
            #video-caption-overlay {
                position: fixed;
                left: 32px;
                bottom: 32px;
                z-index: 99998;
                max-width: 650px;
                background: rgba(15,23,42,.94);
                color: white;
                border: 1px solid rgba(255,255,255,.16);
                box-shadow: 0 24px 60px rgba(15,23,42,.26);
                border-radius: 18px;
                padding: 18px 22px;
                font: 800 24px/1.25 Inter, Arial, sans-serif;
            }
            #video-demo-cursor {
                position: fixed;
                left: 0;
                top: 0;
                z-index: 100000;
                width: 34px;
                height: 34px;
                pointer-events: none;
                transform: translate3d(110px, 110px, 0);
                transition: transform 780ms cubic-bezier(.2,.8,.2,1);
                filter: drop-shadow(0 10px 12px rgba(15,23,42,.28));
            }
            #video-demo-cursor svg { width: 34px; height: 34px; display: block; }
            .video-demo-pulse {
                position: fixed;
                z-index: 99999;
                width: 72px;
                height: 72px;
                border: 4px solid rgba(79,70,229,.72);
                border-radius: 999px;
                pointer-events: none;
                transform: translate(-50%, -50%) scale(.3);
                animation: videoPulse 620ms ease-out forwards;
            }
            @keyframes videoPulse {
                to { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
            }
        `;
        document.head.appendChild(style);

        const caption = document.createElement('div');
        caption.id = 'video-caption-overlay';
        document.body.appendChild(caption);

        const cursor = document.createElement('div');
        cursor.id = 'video-demo-cursor';
        cursor.innerHTML = `
            <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M6 3l19 17-10 1-5 8L6 3z" fill="#fff" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
            </svg>
        `;
        document.body.appendChild(cursor);
    });
}

async function setCaption(page, text) {
    await page.evaluate(caption => {
        document.getElementById('video-caption-overlay').textContent = caption;
    }, text);
}

async function elementCenter(page, selector) {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Cannot find visible box for ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 90) };
}

async function moveCursor(page, selector) {
    const point = await elementCenter(page, selector);
    await page.evaluate(({ x, y }) => {
        document.getElementById('video-demo-cursor').style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }, point);
    await page.mouse.move(point.x, point.y, { steps: 18 });
    await page.waitForTimeout(850);
}

async function pulseAt(page, selector) {
    const point = await elementCenter(page, selector);
    await page.evaluate(({ x, y }) => {
        const pulse = document.createElement('div');
        pulse.className = 'video-demo-pulse';
        pulse.style.left = `${x}px`;
        pulse.style.top = `${y}px`;
        document.body.appendChild(pulse);
        window.setTimeout(() => pulse.remove(), 700);
    }, point);
    await page.waitForTimeout(250);
}

async function guidedClick(page, selector, afterClick) {
    await moveCursor(page, selector);
    await pulseAt(page, selector);
    if (afterClick) await afterClick();
    else await page.locator(selector).first().click({ force: true });
    await page.waitForTimeout(650);
}

async function guidedFill(page, selector, value) {
    await moveCursor(page, selector);
    await pulseAt(page, selector);
    const locator = page.locator(selector).first();
    await locator.click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.type(String(value), { delay: 55 });
    await locator.evaluate(element => {
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
}

async function guidedSelect(page, selector, value) {
    await moveCursor(page, selector);
    await pulseAt(page, selector);
    await page.selectOption(selector, value);
    await page.waitForTimeout(450);
}

async function recordClip(browser, clip) {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } }
    });
    const page = await context.newPage();
    await installRoutes(page);
    await page.goto(`${baseUrl}&scene=${encodeURIComponent(clip.scene)}&v=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ARCHTIME_VIDEO_DEMO_READY__ === true, null, { timeout: 10000 });
    await setupGuideOverlay(page);
    await page.waitForTimeout(700);

    for (const [caption, action] of clip.steps) {
        await setCaption(page, caption);
        await page.waitForTimeout(900);
        await action(page);
        await page.waitForTimeout(1750);
    }

    const video = page.video();
    await context.close();
    const target = path.join(outputDir, clip.file);
    await fs.rm(target, { force: true });
    await video.saveAs(target);
    console.log(target);
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

    try {
        for (const clip of clips) {
            await recordClip(browser, clip);
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
