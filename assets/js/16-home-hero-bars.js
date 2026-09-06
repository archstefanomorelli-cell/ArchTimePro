(function () {
    const visual = document.querySelector('.hero-control-visual');
    if (!visual) return;
    const metrics = [...visual.querySelectorAll('.hero-control-metric')];
    if (metrics.length !== 4) return;
    const outputs = metrics.map(metric => metric.querySelector('.hero-control-value'));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const money = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    let frame = 0;
    let visible = true;
    let elapsed = 0;
    let lastTime = 0;

    // One illustrative budget keeps hours, costs and margin consistent.
    function render(time) {
        const workload = (1 - Math.cos(time * Math.PI * 2 / 12000)) / 2;
        const hours = Math.round(84 + workload * 112);
        const costs = hours * 58 + 900;
        const margin = (18000 - costs) / 18000;
        const teamProgress = (1 - Math.cos(time * Math.PI * 2 / 20000)) / 2;
        const team = 3 + Math.round(teamProgress * 4);
        const values = [hours + 'h', money.format(costs / 1000) + 'k €', String(team), Math.round(margin * 100) + '%'];
        const levels = [(84 + workload * 112) / 240, costs / 15000, (3 + teamProgress * 4) / 9, margin];
        metrics.forEach((metric, index) => {
            metric.style.setProperty('--level', levels[index].toFixed(4));
            if (outputs[index].textContent !== values[index]) outputs[index].textContent = values[index];
        });
    }

    function tick(time) {
        if (lastTime) elapsed += Math.min(time - lastTime, 100);
        lastTime = time;
        render(elapsed);
        frame = window.requestAnimationFrame(tick);
    }

    function syncPlayback() {
        window.cancelAnimationFrame(frame);
        lastTime = 0;
        if (motion.matches) {
            render(4000);
        } else if (visible && !document.hidden) {
            frame = window.requestAnimationFrame(tick);
        }
    }

    render(0);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            syncPlayback();
        }).observe(visual);
    }
    document.addEventListener('visibilitychange', syncPlayback);
    motion.addEventListener('change', syncPlayback);
    syncPlayback();
})();
