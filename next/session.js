// Isolate Next login/logout from the public application's browser session.
window.__ARCHTIME_NEXT_LIVE__ = true;
(() => {
    const createClient = window.supabase.createClient;
    window.supabase.createClient = (url, key, options = {}) => createClient(url, key, {
        ...options, auth: { ...options.auth, storageKey: 'archtime-next-auth' }
    });
})();
