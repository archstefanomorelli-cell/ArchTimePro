const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const browserCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:8765/app.html?videoDemo=1');
    await page.waitForSelector('#app-container:not(.force-hide)');
    await page.waitForTimeout(500);

    const result = await page.evaluate(async () => {
        window.__timerQa = { alerts: [], stateCalls: [], saved: [] };
        window.appAlert = async (...args) => window.__timerQa.alerts.push(args);
        window.setMyTimerStateForApp = async state => window.__timerQa.stateCalls.push(state || {});
        window.saveEntry = async (...args) => window.__timerQa.saved.push(args);

        const startedAt = Date.now() - 15 * 60 * 1000;
        applyCloudTimerState({
            active_timer_start: String(startedAt),
            active_timer_project: '0',
            active_timer_task: 'Sopralluogo',
            active_timer_notes: 'Test mobile'
        });

        document.getElementById('project-select').value = '';
        await toggleTimer();

        const stoppedLocally = {
            alerts: window.__timerQa.alerts.length,
            stateCalls: window.__timerQa.stateCalls.length,
            saved: window.__timerQa.saved.length,
            savedProject: window.__timerQa.saved[0]?.[0]?.name,
            button: document.getElementById('btn-text').textContent.trim(),
            display: document.getElementById('timer-display').textContent.trim()
        };

        applyCloudTimerState({
            active_timer_start: String(Date.now() - 5 * 60 * 1000),
            active_timer_project: '0',
            active_timer_task: 'Riunioni',
            active_timer_notes: ''
        });
        window.fetchMyProfileForApp = async () => ({
            active_timer_start: null,
            active_timer_project: null,
            active_timer_task: null,
            active_timer_notes: null
        });
        await syncCloudTimerState();

        return {
            stoppedLocally,
            remoteStop: {
                button: document.getElementById('btn-text').textContent.trim(),
                display: document.getElementById('timer-display').textContent.trim(),
                runningClass: document.getElementById('btn-toggle-timer').classList.contains('is-running')
            }
        };
    });

    if (result.stoppedLocally.alerts !== 0) throw new Error(`Stop mobile bloccato: ${JSON.stringify(result)}`);
    if (result.stoppedLocally.stateCalls !== 1 || result.stoppedLocally.saved !== 1) throw new Error(`Stop mobile incompleto: ${JSON.stringify(result)}`);
    if (result.stoppedLocally.savedProject !== 'Villa Rossi') throw new Error(`Progetto timer perso: ${JSON.stringify(result)}`);
    if (result.stoppedLocally.button !== 'Avvia ora' || result.stoppedLocally.display !== '00:00:00') throw new Error(`UI stop mobile errata: ${JSON.stringify(result)}`);
    if (result.remoteStop.button !== 'Avvia ora' || result.remoteStop.display !== '00:00:00' || result.remoteStop.runningClass) throw new Error(`Stop remoto non sincronizzato: ${JSON.stringify(result)}`);

    console.log(JSON.stringify(result, null, 2));
    await browser.close();
})().catch(error => {
    console.error(error);
    process.exit(1);
});
