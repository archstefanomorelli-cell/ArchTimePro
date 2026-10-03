// Loaded before bootstrap: fail closed before profile/studio/data loading.
(() => {
    const baseCheckUser = checkUser;
    checkUser = async function () {
        try {
            const { data, error } = await supabaseClient.auth.getUser();
            if (!data?.user && (!error || error.name === 'AuthSessionMissingError')) return;
            if (error) throw error;
            if (!data?.user) return;
            const access = await supabaseClient.rpc('has_archtime_next_access');
            if (access.error || access.data !== true) {
                await appAlert('Accesso non abilitato', access.error ? 'Non è possibile verificare l’accesso a Next. Riprova più tardi.' : 'Questa beta è riservata all’account di prova autorizzato.', 'danger');
                return;
            }
            await baseCheckUser();
        } catch (error) { await appAlert('Accesso non riuscito', 'Non è stato possibile verificare la sessione. Riprova.', 'danger'); }
    };
    const baseInitApp = initApp;
    initApp = async function () {
        const access = await supabaseClient.rpc('has_archtime_next_access');
        if (access.error || access.data !== true) throw new Error('NEXT_ACCESS_DENIED');
        await window.ArchTimeNextFlow.loadClients();
        await baseInitApp();
        window.__ARCHTIME_NEXT_READY__ = true;
    };
    // Existing account beta: no signup, demo seeding or local-only onboarding.
    checkAndGenerateDemoData = async () => {};
    shouldShowOwnerOnboarding = () => false;
    const baseSwitchAuthTab = switchAuthTab;
    switchAuthTab = () => baseSwitchAuthTab('login');
    const baseHandleAuthAction = handleAuthAction;
    handleAuthAction = async () => { isSignupMode = false; return baseHandleAuthAction(); };
    document.getElementById('tab-signup')?.classList.add('force-hide');
    const copy = document.getElementById('auth-context-copy');
    if (copy) copy.textContent = 'ArchTime Pro Next · beta riservata. Accedi con il tuo account di prova. Le modifiche vengono salvate nei dati reali.';
    const launch = document.querySelector('#app-container > header > div');
    launch?.setAttribute('title', 'Next beta: dati reali, accesso gratuito di prova');
})();
