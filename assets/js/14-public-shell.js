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
                            <a href="index.html#perche" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Perché</a>
                            <a href="metodo.html" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Metodo</a>
                            <a href="index.html#prezzi" class="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">Prezzi</a>
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
                <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-5 text-center sm:px-6 lg:flex-row lg:text-left">
                    <div>
                        <p class="text-sm font-black uppercase">Arch <span class="text-indigo-400">Time</span> Pro</p>
                        <p class="mt-2 text-xs text-slate-400">Controllo semplice di ore, costi e margini per studi tecnici.</p>
                        <p class="mt-3 text-xs leading-relaxed text-slate-500">Stefano Morelli · Via Brecce Bianche 29, 60131 Ancona (AN), Italia</p>
                        <p class="mt-1 text-xs leading-relaxed text-slate-500">P. IVA IT02603120425 · C.F. MRLSFN81T03A271G</p>
                    </div>
                    <nav class="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-bold text-slate-400" aria-label="Link nel piè di pagina">
                        <a href="calcolo-margine-commessa.html" class="hover:text-white">Calcolatore</a>
                        <a href="metodo.html" class="hover:text-white">Metodo</a>
                        <a href="sicurezza.html" class="hover:text-white">Sicurezza</a>
                        <a href="privacy.html" class="hover:text-white">Privacy</a>
                        <a href="termini.html" class="hover:text-white">Termini</a>
                        <button type="button" data-public-cookie-settings class="font-bold hover:text-white">Cookie</button>
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
