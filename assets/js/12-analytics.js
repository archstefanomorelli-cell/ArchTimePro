(function () {
    'use strict';

    const MEASUREMENT_ID = 'G-96GHF6505E';
    const CONSENT_KEY = 'archtime_analytics_consent_v1';
    let googleTagLoaded = false;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
    });

    function getConsent() {
        try { return localStorage.getItem(CONSENT_KEY); }
        catch (error) { return null; }
    }

    function loadGoogleTag() {
        if (googleTagLoaded || getConsent() !== 'granted') return;
        googleTagLoaded = true;
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
        window.gtag('js', new Date());
        window.gtag('config', MEASUREMENT_ID, {
            send_page_view: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        });

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
        document.head.appendChild(script);
    }

    function clearAnalyticsCookies() {
        document.cookie.split(';').forEach(function (cookie) {
            const name = cookie.split('=')[0].trim();
            if (!name.startsWith('_ga')) return;
            document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
            document.cookie = name + '=; Max-Age=0; path=/; domain=.archtimepro.it; SameSite=Lax';
        });
    }

    function createBanner() {
        const banner = document.createElement('section');
        banner.id = 'analytics-consent-banner';
        banner.hidden = true;
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Preferenze cookie');
        banner.className = 'fixed bottom-0 left-0 z-[9999] w-full border-t border-slate-700 bg-slate-950 px-5 py-4 text-white shadow-2xl';
        banner.innerHTML =
            '<div class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">' +
                '<p class="max-w-3xl text-xs leading-relaxed text-slate-300">' +
                    '<strong class="text-white">Le statistiche, solo se vuoi.</strong> Usiamo cookie tecnici necessari e, con il tuo consenso, Google Analytics per capire quali pagine sono utili e migliorare Arch Time Pro. Puoi rifiutare senza limitazioni. ' +
                    '<a href="privacy.html" class="font-bold text-white underline underline-offset-2">Privacy Policy</a>.' +
                '</p>' +
                '<div class="flex shrink-0 gap-2">' +
                    '<button type="button" data-analytics-reject class="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800">Rifiuta</button>' +
                    '<button type="button" data-analytics-accept class="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-indigo-400">Accetta statistiche</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(banner);
        return banner;
    }

    function showBanner() {
        const banner = document.getElementById('analytics-consent-banner') || createBanner();
        banner.hidden = false;
    }

    function hideBanner() {
        const banner = document.getElementById('analytics-consent-banner');
        if (banner) banner.hidden = true;
    }

    function setConsent(choice) {
        try { localStorage.setItem(CONSENT_KEY, choice); }
        catch (error) { /* Consent still applies to the current page. */ }

        if (choice === 'granted') {
            window.gtag('consent', 'update', { analytics_storage: 'granted' });
            loadGoogleTag();
        } else {
            window.gtag('consent', 'update', { analytics_storage: 'denied' });
            clearAnalyticsCookies();
        }
        hideBanner();
    }

    function track(eventName, parameters) {
        if (getConsent() !== 'granted') return;
        loadGoogleTag();
        window.gtag('event', eventName, parameters || {});
    }

    window.archTimeAnalytics = {
        accept: function () { setConsent('granted'); },
        reject: function () { setConsent('denied'); },
        getConsent: getConsent,
        showPreferences: showBanner,
        track: track
    };

    document.addEventListener('DOMContentLoaded', function () {
        const banner = document.getElementById('analytics-consent-banner') || createBanner();
        banner.querySelector('[data-analytics-accept]')?.addEventListener('click', window.archTimeAnalytics.accept);
        banner.querySelector('[data-analytics-reject]')?.addEventListener('click', window.archTimeAnalytics.reject);

        document.querySelectorAll('[data-analytics-consent-settings]').forEach(function (button) {
            button.addEventListener('click', showBanner);
        });

        const consent = getConsent();
        if (consent === 'granted') loadGoogleTag();
        else if (consent !== 'denied') showBanner();

        document.addEventListener('click', function (event) {
            const link = event.target.closest('a[href]');
            if (!link) return;
            let destination;
            try { destination = new URL(link.href, window.location.href); }
            catch (error) { return; }

            if (destination.pathname.endsWith('/calcolo-margine-commessa.html')) {
                track('calculator_cta_click', {
                    cta_text: (link.textContent || 'Apri calcolatore').trim().replace(/\s+/g, ' ').slice(0, 80),
                    source_page: window.location.pathname,
                    destination: destination.pathname
                });
                return;
            }

            if (!destination.pathname.endsWith('/app.html')) return;

            track('cta_click', {
                cta_text: (link.textContent || 'Apri app').trim().replace(/\s+/g, ' ').slice(0, 80),
                source_page: window.location.pathname,
                destination: destination.pathname
            });
        }, true);
    });
})();
