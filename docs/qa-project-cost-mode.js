const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const browserPath = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find(candidate => fs.existsSync(candidate));

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: browserPath });
    const results = [];
    try {
        for (const width of [1440, 390]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            const errors = [];
            const backendCalls = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => localStorage.setItem('archtime_analytics_consent_v1', 'denied'));
            await page.route('https://*.supabase.co/**', route => { backendCalls.push(route.request().url()); route.abort(); });
            await page.goto('http://127.0.0.1:8765/app.html?videoDemo=1', { waitUntil: 'load' });
            await page.waitForFunction(() => window.__ARCHTIME_VIDEO_DEMO_READY__ === true);

            await page.evaluate(() => openCreateProjectModal('studio'));
            const modal = page.locator('#modal-edit-project');
            const mode = modal.locator('select[data-cost-mode]');
            assert.equal(await mode.inputValue(), 'project');
            assert.equal(await modal.locator('[data-project-cost-amount]').isVisible(), true);
            await mode.selectOption('team');
            assert.equal(await modal.locator('[data-project-cost-amount]').isVisible(), false);
            assert.equal(await modal.locator('[data-project-team-cost-note]').isVisible(), true);
            await mode.selectOption('project');
            await modal.locator('#edit-modal-project-hourly-cost').fill('45');
            assert.deepEqual(await page.evaluate(() => readProjectCostControls()), { cost_mode: 'project', project_hourly_cost: 45 });
            await modal.screenshot({ path: path.join(root, 'tmp', `project-cost-modal-${width}.png`) });

            await page.evaluate(() => closeEditProjectModal(true));
            await page.evaluate(() => openQuickProjectModal());
            await page.locator('#quick-project-name').fill(`Commessa ${width}`);
            await page.locator('#quick-project-hourly-cost').fill('37');
            await page.locator('#btn-create-quick-project').click();
            await page.waitForFunction(() => projects.some(project => project.name.startsWith('Commessa ')));
            const amounts = await page.evaluate(async () => {
                const project = projects.find(item => item.name.startsWith('Commessa '));
                await saveEntry(project, project.tasks[0], 2, null, '', 'manual');
                const oldRate = entries.find(entry => entry.project_id === project.id).rate;
                project.cost_mode = 'team';
                project.project_hourly_cost = null;
                userProfile.hourly_cost = 30;
                await saveEntry(project, project.tasks[0], 1, null, '', 'manual');
                return { mode: project.cost_mode, oldRate, newRate: entries.find(entry => entry.project_id === project.id && entry.duration === 1).rate };
            });
            assert.deepEqual(amounts, { mode: 'team', oldRate: 74, newRate: 30 });
            assert.deepEqual(errors, []);
            assert.deepEqual(backendCalls, []);
            results.push({ width, checks: 'dropdown, visibility, quick creation, cost snapshot, team switch', errors: errors.length, backendCalls: backendCalls.length });
            await page.close();
        }
        const prototype = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const prototypeErrors = [];
        const prototypeBackendCalls = [];
        prototype.on('pageerror', error => prototypeErrors.push(error.message));
        await prototype.addInitScript(() => localStorage.setItem('archtime_analytics_consent_v1', 'denied'));
        await prototype.route('https://*.supabase.co/**', route => { prototypeBackendCalls.push(route.request().url()); route.abort(); });
        await prototype.goto('http://127.0.0.1:8765/prototipi/dashboard-ottobre-reale/', { waitUntil: 'load' });
        await prototype.waitForFunction(() => window.__ARCHTIME_WORKFLOW_READY__ === true);
        await prototype.evaluate(() => document.querySelector('[data-prototype-action="open-quick-project"]').click());
        const quick = prototype.locator('#modal-prototype-quick-project');
        assert.equal(await quick.locator('select[data-cost-mode]').inputValue(), 'project');
        await quick.locator('select[data-cost-mode]').selectOption('team');
        assert.equal(await quick.locator('[data-project-cost-amount]').isVisible(), false);
        await quick.locator('select[data-cost-mode]').selectOption('project');
        await quick.locator('#prototype-quick-project-name').fill('Nuova commessa ottobre');
        await quick.locator('#prototype-quick-project-hourly-cost').fill('48');
        await quick.locator('button[type="submit"]').click();
        assert.deepEqual(await prototype.evaluate(() => {
            const project = projects.find(item => item.name === 'Nuova commessa ottobre');
            return { mode: project?.cost_mode, hourlyCost: project?.project_hourly_cost };
        }), { mode: 'project', hourlyCost: 48 });
        assert.deepEqual(prototypeErrors, []);
        assert.deepEqual(prototypeBackendCalls, []);
        results.push({ prototype: 'october', checks: 'quick dropdown and project cost', errors: 0, backendCalls: 0 });
        await prototype.close();
    } finally { await browser.close(); }
    console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
