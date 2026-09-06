const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'store-assets');
const finalDir = path.join(outputDir, 'microsoft-store');
const appUrl = 'http://127.0.0.1:8765/desktop-timer-tauri/frontend/index.html';
const composerUrl = 'http://127.0.0.1:8765/desktop-timer-tauri/store-assets/store-shot-composer.html';
const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
const supabaseMock = `
window.__storeShot = {
  profile: {
    id: 'store-review', studio_id: 'store-demo', full_name: 'Microsoft Store Reviewer',
    email: 'store-review@archtimepro.it', role: 'owner', is_owner: true,
    active_timer_start: null, active_timer_project: null,
    active_timer_task: null, active_timer_notes: null
  },
  projects: [
    {
      id: 'project-one', name: 'Ristrutturazione Via Roma',
      tasks: ['Sopralluogo', 'Progetto preliminare', 'Progetto definitivo', 'Direzione lavori'],
      is_archived: false
    },
    {
      id: 'project-two', name: 'Nuovi uffici',
      tasks: ['Rilievo', 'Progetto preliminare', 'Riunioni'],
      is_archived: false
    }
  ]
};
window.supabase = {
  createClient() {
    return {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'store-review' } } }, error: null }),
        getUser: async () => ({ data: { user: { id: 'store-review' } }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ error: null })
      },
      rpc: async (name, payload = {}) => {
        if (name === 'get_my_profile_for_app') return { data: [{ ...window.__storeShot.profile }], error: null };
        if (name === 'get_projects_for_app') return { data: window.__storeShot.projects.map(item => ({ ...item })), error: null };
        if (name === 'set_my_timer_state') {
          window.__storeShot.profile.active_timer_start = payload.timer_start;
          window.__storeShot.profile.active_timer_project = payload.timer_project;
          window.__storeShot.profile.active_timer_task = payload.timer_task;
          window.__storeShot.profile.active_timer_notes = payload.timer_notes;
          return { data: null, error: null };
        }
        if (name === 'create_entry_for_app') return { data: 'store-shot-entry', error: null };
        return { data: null, error: { message: 'RPC non prevista: ' + name } };
      },
      removeChannel() {}
    };
  }
};
`;

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(finalDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 430, height: 740 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.route('**/vendor/supabase-2.39.3.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: supabaseMock
  }));
  await page.route('https://www.archtimepro.it/assets/js/00-runtime-config.js**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "window.ARCH_TIME_CONFIG={supabaseUrl:'https://store-shot.supabase.co',supabaseKey:'store-shot-key'};"
  }));
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Registra tempo' }).waitFor();

  await page.getByLabel('Progetto').selectOption({ label: 'Ristrutturazione Via Roma' });
  await page.getByLabel('Attività').selectOption({ label: 'Progetto preliminare' });
  await page.getByLabel('Note').fill('Sviluppo concept');
  await page.getByRole('heading', { name: 'Registra tempo' }).click();
  await page.screenshot({ path: path.join(outputDir, 'timer-window-full.png') });

  await page.getByRole('button', { name: 'Avvia' }).click();
  await page.waitForTimeout(2200);
  await page.setViewportSize({ width: 292, height: 92 });
  await page.screenshot({ path: path.join(outputDir, 'timer-window-compact.png'), omitBackground: true });
  await page.locator('#btn-toggle-timer').click();
  await page.waitForTimeout(800);

  await page.setViewportSize({ width: 1366, height: 768 });
  for (const shot of [1, 2]) {
    await page.goto(`${composerUrl}?shot=${shot}`, { waitUntil: 'networkidle' });
    const filename = shot === 1
      ? '01-timer-desktop-1366x768.png'
      : '02-modalita-compatta-1366x768.png';
    await page.screenshot({ path: path.join(finalDir, filename) });
  }

  fs.copyFileSync(path.join(projectRoot, 'frontend', 'icon.png'), path.join(finalDir, 'logo-512x512.png'));
  fs.copyFileSync(path.join(projectRoot, 'Assets', 'MedTile.scale-200.png'), path.join(finalDir, 'logo-300x300.png'));

  await browser.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
