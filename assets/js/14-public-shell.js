(function () {
    'use strict';

    function headerHtml() {
        return `
            <header id="public-site-header" class="fixed top-0 z-50 w-full border-b bg-white/90 backdrop-blur-xl">
                <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
                    <a href="index.html" class="flex items-center" aria-label="Arch Time Pro, homepage">
                        <span class="public-brand text-xl uppercase">Arch <span class="public-brand-accent">Time</span> Pro</span>
                    </a>
                    <div class="flex items-center gap-5 lg:gap-8">
                        <nav class="hidden items-center gap-7 lg:flex" aria-label="Navigazione principale">
                            <a href="index.html#prezzi" class="text-sm transition-colors">Prezzi</a>
                            <a href="metodo.html" class="text-sm transition-colors">Metodo</a>
                            <a href="calcolo-compenso-professionale-dlgs-36-2023.html" class="text-sm transition-colors">Preventivo</a>
                        </nav>
                        <a href="app.html" class="public-login-link hidden text-sm transition-colors sm:block">Accedi</a>
                        <a href="app.html" class="public-primary-cta px-4 py-2.5 text-xs font-bold uppercase transition-colors sm:px-5">Prova gratis</a>
                    </div>
                </div>
            </header>`;
    }

    function footerHtml() {
        return `
            <footer id="public-site-footer" class="py-10">
                <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-5 text-center sm:px-6 lg:flex-row lg:text-left">
                    <div>
                        <p class="public-footer-brand text-sm font-bold uppercase">Arch <span class="public-brand-accent">Time</span> Pro</p>
                        <p class="mt-2 text-xs">Controllo semplice di ore, costi e margini per studi tecnici.</p>
                        <p class="mt-3 text-xs leading-relaxed">Stefano Morelli · Via Brecce Bianche 29, 60131 Ancona (AN), Italia</p>
                        <p class="mt-1 text-xs leading-relaxed">P. IVA IT02603120425 · C.F. MRLSFN81T03A271G</p>
                    </div>
                    <nav class="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs" aria-label="Link nel piè di pagina">
                        <a href="calcolo-compenso-professionale-dlgs-36-2023.html">Preventivo normativo</a>
                        <a href="calcolo-margine-commessa.html">Calcolatore</a>
                        <a href="metodo.html">Metodo</a>
                        <a href="sicurezza.html">Sicurezza</a>
                        <a href="privacy.html">Privacy</a>
                        <a href="termini.html">Termini</a>
                        <a href="dpa.html">DPA</a>
                        <a href="subresponsabili.html">Fornitori</a>
                        <button type="button" data-public-cookie-settings>Cookie</button>
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

        if (window.lucide) window.lucide.createIcons();
    });
})();
