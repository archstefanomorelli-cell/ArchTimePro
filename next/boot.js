// Reveal only the finished Next layout, never the legacy intermediate dashboard.
(() => {
    let timeout;
    const root = document.documentElement;
    const reveal = () => {
        clearTimeout(timeout);
        requestAnimationFrame(() => {
            root.classList.remove('next-layout-pending');
            document.getElementById('next-layout-loader')?.remove();
        });
    };
    window.addEventListener('archtime:next-context-ready', reveal, { once: true });
    document.addEventListener('DOMContentLoaded', () => {
        if (window.__ARCHTIME_CONTEXT_READY__) return reveal();
        const app = document.getElementById('app-container');
        const loader = document.getElementById('next-layout-loader');
        if (!app || !loader) return;
        const observer = new MutationObserver(() => {
            if (app.classList.contains('force-hide')) return;
            observer.disconnect();
            if (!root.classList.contains('next-layout-pending')) return;
            timeout = setTimeout(() => {
                if (!root.classList.contains('next-layout-pending')) return;
                loader.querySelector('p').textContent = 'Il caricamento richiede più tempo del previsto. Ricarica la pagina per riprovare.';
                loader.querySelector('button').hidden = false;
            }, 20000);
        });
        observer.observe(app, { attributes: true, attributeFilter: ['class'] });
        loader.querySelector('button').addEventListener('click', () => location.reload());
    }, { once: true });
})();
