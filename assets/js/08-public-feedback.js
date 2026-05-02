// Arch Time Pro - public beta feedback form
(function () {
    const FEEDBACK_TABLE = 'beta_feedback';

    function getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    }

    function setStatus(message, type) {
        const status = document.getElementById('feedback-form-status');
        if (!status) return;
        const colors = {
            success: 'text-emerald-700 bg-emerald-50 border-emerald-100',
            error: 'text-red-700 bg-red-50 border-red-100',
            neutral: 'text-slate-600 bg-slate-50 border-slate-200'
        };
        status.className = `mt-4 border rounded-xl p-3 text-sm font-bold ${colors[type] || colors.neutral}`;
        status.textContent = message;
        status.classList.remove('hidden');
    }

    function createClient() {
        const config = window.ARCH_TIME_CONFIG || {};
        if (!window.supabase || !config.supabaseUrl || !config.supabaseKey) return null;
        return window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    }

    async function handleFeedbackSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const submitButton = document.getElementById('feedback-submit');
        const honeypot = getValue('feedback-company');

        if (honeypot) {
            form.reset();
            setStatus('Grazie, feedback inviato correttamente.', 'success');
            return;
        }

        const message = getValue('feedback-message');
        if (message.length < 10) {
            setStatus('Scrivi almeno 10 caratteri per inviare un feedback utile.', 'error');
            return;
        }

        const client = createClient();
        if (!client) {
            setStatus('Invio feedback non configurato. Riprova dopo il prossimo deploy.', 'error');
            return;
        }

        const payload = {
            name: getValue('feedback-name') || null,
            email: getValue('feedback-email') || null,
            profile: getValue('feedback-profile') || null,
            message,
            page_url: window.location.href,
            user_agent: window.navigator.userAgent
        };

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Invio in corso...';
            }

            const { error } = await client.from(FEEDBACK_TABLE).insert(payload);
            if (error) throw error;

            form.reset();
            setStatus('Grazie, feedback salvato. Lo leggeremo nella lista beta.', 'success');
        } catch (error) {
            console.error('Feedback submit failed:', error);
            setStatus('Non siamo riusciti a salvare il feedback. Riprova tra poco.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Invia feedback';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const form = document.getElementById('beta-feedback-form');
        if (!form) return;
        form.addEventListener('submit', handleFeedbackSubmit);
    });
})();
