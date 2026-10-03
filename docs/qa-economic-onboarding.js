const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tmp', 'economic-onboarding-qa');
const executablePath = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find(file => fs.existsSync(file));

async function freshApp(browser, file, viewport) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('archtime_analytics_consent_v1', 'denied'));
    // Test fixtures never reach real accounts or send telemetry.
    await page.route('https://*.supabase.co/**', route => route.abort());
    await page.goto(`http://127.0.0.1:8765/${file}?videoDemo=1${file.includes('prototipo') ? '&prototypeFlow=1' : ''}`, { waitUntil: 'load' });
    try { await page.waitForFunction(() => window.__ARCHTIME_VIDEO_DEMO_READY__ === true); }
    catch (error) { throw new Error(`Demo boot failed (${file}): ${JSON.stringify(errors)}; ${error.message}`); }
    await page.evaluate(() => {
        userProfile.hourly_cost = 0;
        profiles.find(profile => profile.id === userProfile.id).hourly_cost = 0;
        projects = [];
        entries = [];
        expenses = [];
        window.__alerts = [];
        appAlert = async (title, message) => { window.__alerts.push(message); };
        recordOnboardingEvent = async () => true;
        trackAcquisitionMilestone = async () => false;
        renderProjects();
        renderStrategicCharts();
    });
    return { page, errors };
}

async function checkLayout(page, selector, name) {
    await page.locator(selector).screenshot({ path: path.join(output, `${name}.png`) });
    const overflow = await page.locator(selector).evaluate(element => ({
        viewport: document.documentElement.scrollWidth > window.innerWidth,
        modal: element.scrollWidth > element.clientWidth + 1,
        fields: [...element.querySelectorAll('input, button, label')].filter(child => {
            const bounds = child.getBoundingClientRect();
            return bounds.width && (bounds.left < 0 || bounds.right > window.innerWidth + 1);
        }).map(child => child.id || child.textContent)
    }));
    assert.equal(overflow.viewport, false, `${name}: page overflow`);
    assert.equal(overflow.modal, false, `${name}: modal overflow`);
    assert.deepEqual(overflow.fields, [], `${name}: fields outside viewport`);
}

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true, executablePath });
    let checks = 0;
    try {
        for (const file of ['app.html', 'app-prototipo-flusso-economico.html']) {
            for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
                const { page, errors } = await freshApp(browser, file, viewport);
                const name = `${file.includes('prototipo') ? 'prototype' : 'app'}-${viewport.width}`;
                await page.evaluate(() => openOwnerOnboarding());
                assert.equal(await page.locator('#onboarding-hourly-cost').inputValue(), '');
                await page.locator('#onboarding-project-name').fill('Prima commessa reale');
                await page.locator('#onboarding-project-budget').fill('12000');
                await checkLayout(page, '#modal-owner-onboarding > div', `${name}-onboarding`);
                await page.locator('#btn-prepare-first-project').click();
                assert.equal(await page.evaluate(() => projects.length), 0, 'No implicit default cost');
                await page.locator('#onboarding-hourly-cost').fill('40');
                await page.locator('#btn-prepare-first-project').click();
                await page.waitForFunction(() => projects.length === 1);
                assert.deepEqual(await page.evaluate(() => ({ mode: projects[0].cost_mode, projectCost: projects[0].project_hourly_cost, teamCost: userProfile.hourly_cost })),
                    { mode: 'project', projectCost: 40, teamCost: 0 }, 'The default cost belongs to the project, not the owner');
                const projectId = await page.evaluate(() => projects[0].id);
                await page.evaluate(async id => {
                    await saveEntry(projects.find(project => project.id === id), projects[0].tasks[0], 2, null, '', 'manual');
                }, projectId);
                assert.equal((await page.locator('#first-value-margin').textContent()).replace(/\s/g, ' '), '11.920,00 €');
                assert.equal(await page.evaluate(() => getProjectCostSummary(projects[0]).totalCost), 80, 'Entry rate is total cost, not hourly price');
                await checkLayout(page, '#modal-first-value > div', `${name}-result`);
                await page.evaluate(() => {
                    closeFirstValueMoment();
                    userProfile.hourly_cost = 0;
                    entries[0].rate = 0;
                    localStorage.removeItem(firstValueStorageKey());
                    renderProjects();
                    renderStrategicCharts();
                });
                assert.equal(await page.locator('#kpi-margin').innerText(), 'Da completare');
                await page.evaluate(id => showFirstValueMoment(id, true), projectId);
                assert.equal(await page.locator('#first-value-margin').textContent(), 'Da definire');
                await page.locator('#first-value-setup-cost').fill('50');
                await page.locator('#btn-save-first-value-setup').click();
                await page.waitForFunction(() => projects[0].project_hourly_cost === 50);
                assert.equal(await page.evaluate(() => entries[0].rate), 0, 'Existing entries are never repriced');
                assert.equal(await page.evaluate(() => getProjectCostSummary(projects[0]).economicReady), false);
                assert.equal(await page.evaluate(() => localStorage.getItem(firstValueStorageKey())), null, 'Missing costs are not a valid activation');
                await checkLayout(page, '#modal-first-value > div', `${name}-missing-cost`);
                await page.evaluate(() => { closeFirstValueMoment(); showProjectDetail(projects[0].id); });
                assert.ok(await page.locator('#detail-content [data-ui-action="set-task-status"]').count(), 'Task status controls remain available');
                assert.deepEqual(errors, [], `${name}: runtime errors`);
                await page.close();
                checks += 12;
            }
            const { page, errors } = await freshApp(browser, file, { width: 390, height: 844 });
            await page.evaluate(() => openOwnerOnboarding());
            await page.locator('#onboarding-project-name').fill('Solo ore');
            await page.locator('#btn-onboarding-hours-only').click();
            await page.waitForFunction(() => projects.length === 1);
            assert.equal(await page.evaluate(() => userProfile.hourly_cost), 0);
            assert.equal(await page.evaluate(() => projects[0].budget), 0);
            const dateCheck = await page.evaluate(() => {
                const today = formatDateInputValue(new Date());
                return {
                    fresh: Math.abs(new Date(entryDateToIso(today, true)).getTime() - Date.now()) < 2000,
                    unchanged: entryDateToIso('2026-09-15') === '2026-09-15T12:00:00.000Z'
                };
            });
            assert.deepEqual(dateCheck, { fresh: true, unchanged: true });
            await page.evaluate(() => {
                document.body.classList.remove('is-admin');
                userProfile.role = 'staff'; userProfile.is_owner = false;
            });
            await page.evaluate(() => showFirstValueMoment(projects[0].id));
            assert.equal(await page.locator('#modal-first-value').isVisible(), false, 'Staff do not see economic onboarding');
            assert.deepEqual(errors, []);
            await page.close();
            checks += 6;

            const legacy = await freshApp(browser, file, { width: 390, height: 844 });
            await legacy.page.evaluate(() => {
                projects = [{ id: 'legacy-real-project', name: 'Commessa esistente', tasks: ['Progetto'], budget: 12000, is_demo: false }];
                entries = [{ project_id: projects[0].id, duration: 2, rate: 0 }];
                localStorage.setItem(`archtime-first-value:${userProfile.studio_id}`, 'done');
                history.replaceState(null, '', location.pathname);
                recordEconomicActivation = async () => false;
            });
            await legacy.page.addScriptTag({ path: path.join(root, 'assets/js/17-activation-checklist.js') });
            await legacy.page.waitForFunction(() => !document.getElementById('activation-checklist').classList.contains('force-hide'));
            assert.match(await legacy.page.locator('#activation-next-action').innerText(), /Completa il costo orario/);
            await legacy.page.locator('#activation-next-action').click();
            assert.equal(await legacy.page.locator('#first-value-setup-cost').isVisible(), true);
            assert.equal(await legacy.page.evaluate(() => entries[0].rate), 0);
            await legacy.page.evaluate(() => {
                closeFirstValueMoment();
                userProfile.hourly_cost = 40;
                entries[0].rate = 80;
                localStorage.setItem(firstValueStorageKey(), 'done');
                window.dispatchEvent(new CustomEvent('archtime:economic-setup-changed'));
            });
            await legacy.page.waitForFunction(() => document.getElementById('activation-checklist').classList.contains('force-hide'));
            assert.deepEqual(legacy.errors, []);
            await legacy.page.close();
            checks += 5;
        }
        console.log(JSON.stringify({ passed: checks, screenshots: output, productionWrites: 0 }, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
