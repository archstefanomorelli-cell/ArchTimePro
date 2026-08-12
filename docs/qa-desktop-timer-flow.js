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

const supabaseMock = `
window.__timerTest = {
  remoteProfile: {
    id: 'test-user', studio_id: 'test-studio', full_name: 'Test User',
    email: 'test@example.com', role: 'staff', is_owner: false,
    active_timer_start: null, active_timer_project: null,
    active_timer_task: null, active_timer_notes: null
  },
  projects: [
    { id: 'project-b', name: 'B Studio', tasks: ['Rilievo'], is_archived: false },
    { id: 'project-a', name: 'A Studio', tasks: ['Progetto'], is_archived: false }
  ],
  stateCalls: [],
  entries: []
};
window.supabase = {
  createClient() {
    return {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'test-user' } } }, error: null }),
        getUser: async () => ({ data: { user: { id: 'test-user' } }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ error: null })
      },
      rpc: async (name, payload = {}) => {
        if (name === 'get_my_profile_for_app') return { data: [{ ...window.__timerTest.remoteProfile }], error: null };
        if (name === 'get_projects_for_app') return { data: window.__timerTest.projects.map(item => ({ ...item })), error: null };
        if (name === 'set_my_timer_state') {
          window.__timerTest.stateCalls.push({ ...payload });
          window.__timerTest.remoteProfile.active_timer_start = payload.timer_start;
          window.__timerTest.remoteProfile.active_timer_project = payload.timer_project;
          window.__timerTest.remoteProfile.active_timer_task = payload.timer_task;
          window.__timerTest.remoteProfile.active_timer_notes = payload.timer_notes;
          return { data: null, error: null };
        }
        if (name === 'create_entry_for_app') {
          window.__timerTest.entries.push({ ...payload });
          return { data: 'test-entry', error: null };
        }
        return { data: null, error: { message: 'Unexpected RPC: ' + name } };
      },
      removeChannel() {}
    };
  }
};
`;

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 760, height: 760 } });

    await page.route('**/vendor/supabase-2.39.3.js', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: supabaseMock
    }));
    await page.route('https://www.archtimepro.it/assets/js/00-runtime-config.js**', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: "window.ARCH_TIME_CONFIG={supabaseUrl:'https://test.supabase.co',supabaseKey:'test-key'};"
    }));

    const fileUrl = `file:///${path.join(root, 'desktop-timer-tauri', 'frontend', 'index.html').replace(/\\/g, '/')}`;
    await page.goto(fileUrl);
    await page.waitForSelector('#timer-view:not(.hidden)');

    const projectNames = await page.locator('#project-select option').allTextContents();
    if (projectNames.join('|') !== 'A Studio|B Studio') throw new Error(`Progetti RPC non caricati: ${projectNames.join('|')}`);

    await page.click('#btn-toggle-timer');
    await page.waitForFunction(() => document.body.classList.contains('desktop-compact'));
    const started = await page.evaluate(() => ({
        running: document.getElementById('btn-toggle-timer').classList.contains('running'),
        stateCalls: window.__timerTest.stateCalls.length,
        start: window.__timerTest.remoteProfile.active_timer_start
    }));
    if (!started.running || started.stateCalls !== 1 || !started.start) throw new Error(`Avvio timer fallito: ${JSON.stringify(started)}`);

    await page.evaluate(() => { window.__timerTest.remoteProfile.active_timer_start = null; });
    await page.waitForFunction(() => !document.getElementById('btn-toggle-timer').classList.contains('running'), null, { timeout: 7000 });
    const remoteStopMessage = await page.locator('#app-status').textContent();
    if (!remoteStopMessage.includes('fermato da web')) throw new Error(`Stop remoto non rilevato: ${remoteStopMessage}`);

    await page.click('#btn-toggle-timer');
    await page.waitForTimeout(120);
    await page.click('#btn-toggle-timer');
    await page.waitForFunction(() => window.__timerTest.entries.length === 1);
    const saved = await page.evaluate(() => ({
        entries: window.__timerTest.entries,
        remoteStart: window.__timerTest.remoteProfile.active_timer_start,
        running: document.getElementById('btn-toggle-timer').classList.contains('running')
    }));
    if (saved.remoteStart !== null || saved.running || Number(saved.entries[0].entry_duration) <= 0) {
        throw new Error(`Arresto e salvataggio falliti: ${JSON.stringify(saved)}`);
    }

    console.log(JSON.stringify({ projectNames, started, remoteStopMessage, saved }, null, 2));
    await browser.close();
})().catch(error => {
    console.error(error);
    process.exit(1);
});
