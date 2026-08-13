(function () {
    let installPrompt = null;

    const installButton = document.getElementById('btn-install-timer-pwa');
    const installHint = document.getElementById('timer-install-hint');

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function setInstalledUi() {
        installButton?.classList.add('hidden');
        installHint?.classList.add('hidden');
    }

    function showInstallHelp() {
        const browserName = navigator.userAgent.includes('Edg/') ? 'Edge' : 'Chrome';
        if (!installHint) return;
        installHint.textContent = `In ${browserName}, apri il menu del browser e scegli "Installa Arch Time Mini Timer".`;
        installHint.classList.remove('hidden');
    }

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installPrompt = event;
        installButton?.classList.remove('hidden');
        installHint?.classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        setInstalledUi();
    });

    installButton?.addEventListener('click', async () => {
        if (isStandalone()) return setInstalledUi();
        if (!installPrompt) return showInstallHelp();

        await installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
    });

    if (isStandalone()) setInstalledUi();
    else installButton?.classList.remove('hidden');

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(error => {
                console.warn('Service worker del Mini Timer non disponibile', error);
            });
        });
    }
})();
