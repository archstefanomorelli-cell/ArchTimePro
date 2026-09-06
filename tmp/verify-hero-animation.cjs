const { chromium } = require('C:/Users/moroz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        await page.emulateMedia({ reducedMotion: 'reduce' });
        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto('http://127.0.0.1:8765/index.html');
            await page.evaluate(() => document.fonts.ready);
            const reject = page.getByRole('button', { name: 'Rifiuta', exact: true });
            if (await reject.isVisible()) await reject.click();
            await page.locator('.hero-control-visual').scrollIntoViewIfNeeded();
            const layout = await page.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > innerWidth,
                metrics: [...document.querySelectorAll('.hero-control-metric')].map(el => {
                    const value = el.querySelector('.hero-control-value').getBoundingClientRect();
                    const metric = el.getBoundingClientRect();
                    const fill = el.querySelector('.hero-control-fill').getBoundingClientRect();
                    const icon = el.querySelector('.hero-control-icon').getBoundingClientRect();
                    return { valid: value.left >= metric.left - 1 && value.right <= metric.right + 1 && fill.height > 10 && value.bottom < fill.top && fill.bottom <= icon.top + 1, value: value.toJSON(), metric: metric.toJSON(), fill: fill.toJSON(), icon: icon.toJSON() };
                })
            }));
            assert.equal(layout.overflow, false, 'Page overflow at ' + width);
            await page.screenshot({ path: 'tmp/hero-glass-' + width + '.png' });
            await page.locator('.hero-control-visual').screenshot({ path: 'tmp/hero-chart-' + width + '.png' });
            if (!layout.metrics.every(metric => metric.valid)) console.log(JSON.stringify(layout.metrics.filter(metric => !metric.valid)));
            assert(layout.metrics.every(metric => metric.valid), 'Metric overlap at ' + width);
            console.log('Layout OK: ' + width);
        }
        const values = () => page.locator('.hero-control-value').allTextContents();
        const reduced = await values();
        await page.waitForTimeout(500);
        assert.deepEqual(await values(), reduced, 'Reduced motion must be static');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const before = await values();
        await page.waitForTimeout(2500);
        const after = await values();
        assert.notDeepEqual(after, before, 'Animation must move');
        assert(parseInt(after[0]) > parseInt(before[0]), 'Hours should rise');
        assert(parseInt(after[3]) < parseInt(before[3]), 'Margin should fall');
        await page.locator('#public-site-footer').scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const paused = await values();
        await page.waitForTimeout(500);
        assert.deepEqual(await values(), paused, 'Offscreen animation must pause');
        assert.deepEqual(errors, [], 'Browser JS errors');
        console.log('Motion, reduced motion, offscreen pause and JS checks OK');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
