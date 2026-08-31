(function () {
    'use strict';

    function headerHtml() {
        return `
            <header id="public-site-header" class="fixed top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-xl">
                <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
                    <a href="index.html" class="flex items-center" aria-label="Arch Time Pro, homepage">
                        <span class="public-brand text-xl font-black uppercase text-slate-900">Arch <span class="text-indigo-600">Time</span> Pro</span>
                    </a>
                    <div class="flex items-center gap-5 lg:gap-8">
                        <nav class="hidden items-center gap-7 lg:flex" aria-label="Navigazione principale">
                            <a href="metodo.html" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Metodo</a>
                            <a href="chi-siamo.html" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Chi siamo</a>
                            <details class="public-tools-menu relative" data-public-tools-menu>
                                <summary class="flex cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">
                                    <span>Utility</span>
                                    <i data-lucide="chevron-down" class="public-tools-chevron h-3.5 w-3.5" aria-hidden="true"></i>
                                </summary>
                                <div class="public-tools-dropdown absolute left-1/2 top-full mt-3 w-72 -translate-x-1/2 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                                    <a href="calcolo-compenso-professionale-dlgs-36-2023.html" class="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                                        <i data-lucide="landmark" class="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true"></i>
                                        <span>Calcolo parcella professionale</span>
                                    </a>
                                    <a href="calcolo-margine-commessa.html" class="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
                                        <i data-lucide="chart-no-axes-combined" class="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true"></i>
                                        <span>Calcolatore margine</span>
                                    </a>
                                </div>
                            </details>
                            <a href="index.html#prezzi" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Prezzi</a>
                            <a href="download.html" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Download</a>
                        </nav>
                        <a href="app.html" class="hidden text-sm font-bold text-slate-600 transition-colors hover:text-slate-900 sm:block">Accedi</a>
                        <a href="app.html" class="public-primary-cta rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-black uppercase text-white shadow-lg transition-colors hover:bg-indigo-600 sm:px-5">Prova gratis</a>
                    </div>
                </div>
            </header>`;
    }

    function footerHtml() {
        return `
            <footer id="public-site-footer" class="bg-slate-950 py-10 text-white">
                <div class="mx-auto grid max-w-7xl gap-9 px-5 text-center sm:px-6 lg:grid-cols-[1.45fr_0.75fr_0.9fr_0.75fr] lg:text-left">
                    <div class="lg:max-w-sm">
                        <p class="text-sm font-black uppercase">Arch <span class="text-indigo-400">Time</span> Pro</p>
                        <p class="mt-2 text-xs text-slate-400">Controllo semplice di ore, costi e margini per studi tecnici.</p>
                        <p class="mt-3 text-xs leading-relaxed text-slate-500">Stefano Morelli · Via Brecce Bianche 29, 60131 Ancona (AN), Italia</p>
                        <p class="mt-1 text-xs leading-relaxed text-slate-500">P. IVA IT02603120425 · C.F. MRLSFN81T03A271G</p>
                    </div>
                    <nav class="public-footer-groups" aria-label="Prodotto">
                        <p class="mb-3 text-xs font-black uppercase text-white">Prodotto</p>
                        <div class="flex flex-col items-center gap-2.5 lg:items-start">
                            <a href="metodo.html">Metodo</a>
                            <a href="chi-siamo.html">Chi siamo</a>
                            <a href="index.html#prezzi">Prezzi</a>
                            <a href="download.html">Download</a>
                            <a href="sicurezza.html" class="hover:text-white">Sicurezza</a>
                            <a href="support.html" class="hover:text-white">Supporto</a>
                        </div>
                    </nav>
                    <nav class="public-footer-groups" aria-label="Utility">
                        <p class="mb-3 text-xs font-black uppercase text-white">Utility</p>
                        <div class="flex flex-col items-center gap-2.5 lg:items-start">
                            <a href="calcolo-compenso-professionale-dlgs-36-2023.html" class="hover:text-white">Calcolo parcella professionale</a>
                            <a href="calcolo-margine-commessa.html">Calcolatore margine</a>
                        </div>
                    </nav>
                    <nav class="public-footer-groups" aria-label="Informazioni legali">
                        <p class="mb-3 text-xs font-black uppercase text-white">Legale</p>
                        <div class="flex flex-col items-center gap-2.5 lg:items-start">
                        <a href="privacy.html" class="hover:text-white">Privacy</a>
                        <a href="termini.html" class="hover:text-white">Termini</a>
                        <a href="dpa.html" class="hover:text-white">DPA</a>
                        <a href="subresponsabili.html" class="hover:text-white">Fornitori</a>
                        <button type="button" data-public-cookie-settings class="font-bold hover:text-white">Cookie</button>
                        </div>
                    </nav>
                </div>
            </footer>`;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const header = document.querySelector('body > header');
        const footer = document.querySelector('body > footer');
        if (header) header.outerHTML = headerHtml();
        if (footer) footer.outerHTML = footerHtml();

        document.querySelector('[data-public-cookie-settings]')?.addEventListener('click', function () {
            window.archTimeAnalytics?.showPreferences();
        });

        const toolsMenu = document.querySelector('[data-public-tools-menu]');
        document.addEventListener('click', function (event) {
            if (toolsMenu?.open && !toolsMenu.contains(event.target)) toolsMenu.open = false;
        });
        toolsMenu?.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') return;
            toolsMenu.open = false;
            toolsMenu.querySelector('summary')?.focus();
        });

        if (window.lucide) window.lucide.createIcons();
    });
})();
