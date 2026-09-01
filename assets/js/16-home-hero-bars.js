(function () {
    const metrics = [...document.querySelectorAll('.hero-control-metric[data-counter-min]')];
    if (!metrics.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const formatters = new Map();
    const palettes = new WeakMap();

    const formatterFor = decimals => {
        if (!formatters.has(decimals)) {
            formatters.set(decimals, new Intl.NumberFormat('it-IT', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }));
        }
        return formatters.get(decimals);
    };

    const readScale = fill => {
        const transform = window.getComputedStyle(fill).transform;
        if (!transform || transform === 'none') return 1;
        const values = transform.match(/matrix(?:3d)?\(([^)]+)\)/)?.[1].split(',').map(Number) || [];
        return transform.startsWith('matrix3d') ? (values[5] || 1) : (values[3] || 1);
    };

    const readRgb = (fill, property) => window.getComputedStyle(fill)
        .getPropertyValue(property)
        .split(',')
        .map(channel => Number(channel.trim()));

    const mixRgb = (light, dark, progress) => light.map((channel, index) =>
        Math.round(channel + (dark[index] - channel) * progress)
    );

    const updateCounters = () => {
        metrics.forEach(metric => {
            const fill = metric.querySelector('.hero-control-fill');
            const output = metric.querySelector('.hero-control-value');
            if (!fill || !output) return;

            const min = Number(metric.dataset.counterMin || 0);
            const max = Number(metric.dataset.counterMax || min);
            const decimals = Number(metric.dataset.counterDecimals || 0);
            const progress = reducedMotion ? 1 : Math.max(0, Math.min(1, (readScale(fill) - 0.34) / 0.66));
            const value = min + (max - min) * progress;
            output.textContent = `${metric.dataset.counterPrefix || ''}${formatterFor(decimals).format(value)}${metric.dataset.counterSuffix || ''}`;

            if (!palettes.has(fill)) {
                palettes.set(fill, {
                    light: readRgb(fill, '--bar-light-rgb'),
                    dark: readRgb(fill, '--bar-dark-rgb')
                });
            }
            const { light, dark } = palettes.get(fill);
            if (light.length === 3 && dark.length === 3) {
                fill.style.backgroundColor = `rgb(${mixRgb(light, dark, progress).join(', ')})`;
            }
        });

        if (!reducedMotion) window.requestAnimationFrame(updateCounters);
    };

    updateCounters();
})();
