// Arch Time Pro - internal beta monitor
(function () {
    const PLATFORM_ADMIN_EMAILS = ['info@archtimepro.it', 'arch.morelli@estplatform.com'];
    const STATUS_LABELS = {
        new: 'Nuovo',
        active: 'Attivo',
        follow_up: 'Da ricontattare',
        not_interested: 'Non interessato',
        convertible: 'Convertibile'
    };

    const STATUS_CLASSES = {
        new: 'bg-slate-100 text-slate-700 border-slate-200',
        active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        follow_up: 'bg-amber-50 text-amber-700 border-amber-100',
        not_interested: 'bg-red-50 text-red-700 border-red-100',
        convertible: 'bg-indigo-50 text-indigo-700 border-indigo-100'
    };

    let client = null;
    let currentUser = null;
    let studios = [];
    let feedback = [];

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatDate(value) {
        if (!value || value === '1970-01-01T00:00:00+00:00') return 'Non disponibile';
        try {
            return new Intl.DateTimeFormat('it-IT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(value));
        } catch (error) {
            return 'Non disponibile';
        }
    }

    function businessTypeLabel(value) {
        if (value === 'company') return 'Impresa';
        if (value === 'studio') return 'Studio tecnico';
        return value || 'Non indicato';
    }

    function isAllowedEmail(email) {
        return PLATFORM_ADMIN_EMAILS.includes(String(email || '').toLowerCase());
    }

    function setVisible(id, visible) {
        const element = byId(id);
        if (!element) return;
        element.classList.toggle('hidden', !visible);
    }

    function setLoginStatus(message, type) {
        const status = byId('admin-login-status');
        if (!status) return;
        status.textContent = message;
        status.className = `text-sm font-bold ${type === 'error' ? 'text-red-600' : 'text-slate-500'}`;
        status.classList.remove('hidden');
    }

    function createClient() {
        const config = window.ARCH_TIME_CONFIG || {};
        if (!window.supabase || !config.supabaseUrl || !config.supabaseKey) return null;
        return window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
    }

    function updateShell() {
        const email = currentUser?.email || '';
        const emailElement = byId('admin-user-email');
        if (emailElement) emailElement.textContent = email;
        setVisible('admin-logout', Boolean(currentUser));
    }

    function showState(state) {
        setVisible('admin-login-panel', state === 'login');
        setVisible('admin-denied-panel', state === 'denied');
        setVisible('admin-dashboard', state === 'dashboard');
        updateShell();
        if (window.lucide) window.lucide.createIcons();
    }

    function statusSelectHtml(studio) {
        return `
            <select data-studio-status="${studio.studio_id}" class="admin-input max-w-[190px] text-xs font-black">
                ${Object.entries(STATUS_LABELS).map(([value, label]) => `
                    <option value="${value}" ${studio.beta_status === value ? 'selected' : ''}>${label}</option>
                `).join('')}
            </select>
        `;
    }

    function studioCardHtml(studio) {
        const status = studio.beta_status || 'new';
        const statusClass = STATUS_CLASSES[status] || STATUS_CLASSES.new;
        const lastActivity = studio.last_activity_at && !String(studio.last_activity_at).startsWith('1970-')
            ? formatDate(studio.last_activity_at)
            : 'Nessuna attività';

        return `
            <article class="p-5" data-studio-card="${studio.studio_id}">
                <div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <h3 class="text-lg font-black text-slate-950">${escapeHtml(studio.studio_name)}</h3>
                            <span class="inline-flex px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-wide ${statusClass}">
                                ${STATUS_LABELS[status] || 'Nuovo'}
                            </span>
                            <span class="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wide">
                                ${businessTypeLabel(studio.business_type)}
                            </span>
                        </div>
                        <div class="space-y-1">
                            <p class="text-sm font-black text-slate-700">${escapeHtml(studio.owner_name || 'Owner non indicato')}</p>
                            <p class="text-xs font-bold text-indigo-600">${escapeHtml(studio.owner_email || 'Email owner non disponibile')}</p>
                            <p class="text-xs font-bold text-slate-400">ID: ${escapeHtml(studio.studio_id)}</p>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        ${statusSelectHtml(studio)}
                        <button data-save-note="${studio.studio_id}" class="inline-flex items-center justify-center px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-indigo-600 transition">
                            Salva
                        </button>
                    </div>
                </div>

                <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="metric-label">Membri</p>
                        <p class="text-xl font-black mt-1">${studio.active_members_count}/${studio.members_count}</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="metric-label">Progetti</p>
                        <p class="text-xl font-black mt-1">${studio.active_projects_count}/${studio.projects_count}</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="metric-label">Registrazioni</p>
                        <p class="text-xl font-black mt-1">${studio.entries_count}</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="metric-label">Spese</p>
                        <p class="text-xl font-black mt-1">${studio.expenses_count}</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="metric-label">Ultima attività</p>
                        <p class="text-sm font-black mt-1">${lastActivity}</p>
                    </div>
                </div>

                <div class="mt-4">
                    <label class="metric-label block mb-2" for="note-${studio.studio_id}">Note interne</label>
                    <textarea id="note-${studio.studio_id}" data-studio-note="${studio.studio_id}" class="admin-input min-h-[82px] resize-y" placeholder="Aggiungi appunti, prossima azione o potenziale conversione">${escapeHtml(studio.internal_notes || '')}</textarea>
                </div>
            </article>
        `;
    }

    function renderStudios() {
        const list = byId('admin-studios-list');
        if (!list) return;

        const query = String(byId('admin-search')?.value || '').toLowerCase().trim();
        const filtered = studios.filter((studio) => {
            const haystack = [
                studio.studio_name,
                studio.owner_name,
                studio.owner_email,
                studio.business_type,
                STATUS_LABELS[studio.beta_status],
                studio.internal_notes
            ].join(' ').toLowerCase();
            return !query || haystack.includes(query);
        });

        list.innerHTML = filtered.length
            ? filtered.map(studioCardHtml).join('')
            : '<div class="p-6 text-sm font-bold text-slate-500">Nessuno studio trovato.</div>';
        if (window.lucide) window.lucide.createIcons();
    }

    function feedbackHtml(item) {
        return `
            <article class="rounded-xl border border-slate-200 p-4">
                <div class="flex items-center justify-between gap-3 mb-2">
                    <p class="text-sm font-black text-slate-900">${escapeHtml(item.name || item.email || 'Anonimo')}</p>
                    <span class="text-[11px] font-black text-slate-400">${formatDate(item.created_at)}</span>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed">${escapeHtml(item.message)}</p>
                <p class="text-xs font-bold text-slate-400 mt-3">${escapeHtml(item.profile || 'profilo non indicato')}</p>
            </article>
        `;
    }

    function renderFeedback() {
        const list = byId('admin-feedback-list');
        if (!list) return;
        list.innerHTML = feedback.length
            ? feedback.map(feedbackHtml).join('')
            : '<p class="text-sm font-bold text-slate-500">Nessun feedback ricevuto.</p>';
    }

    function updateMetrics() {
        const activeStudios = studios.filter((studio) => Number(studio.entries_count || 0) > 0 || Number(studio.projects_count || 0) > 0).length;
        const totalProjects = studios.reduce((sum, studio) => sum + Number(studio.projects_count || 0), 0);
        const totalEntries = studios.reduce((sum, studio) => sum + Number(studio.entries_count || 0), 0);

        byId('metric-studios').textContent = studios.length;
        byId('metric-active').textContent = activeStudios;
        byId('metric-projects').textContent = totalProjects;
        byId('metric-entries').textContent = totalEntries;
        byId('metric-feedback').textContent = feedback.length;
    }

    async function loadDashboard() {
        if (!client) return;

        const refreshButton = byId('admin-refresh');
        if (refreshButton) refreshButton.disabled = true;

        try {
            const [{ data: monitorData, error: monitorError }, { data: feedbackData, error: feedbackError }] = await Promise.all([
                client.rpc('get_platform_beta_monitor'),
                client.rpc('get_platform_feedback')
            ]);

            if (monitorError) throw monitorError;
            if (feedbackError) throw feedbackError;

            studios = monitorData || [];
            feedback = feedbackData || [];
            updateMetrics();
            renderStudios();
            renderFeedback();
        } catch (error) {
            console.error('Admin monitor load failed:', error);
            const list = byId('admin-studios-list');
            if (list) {
                list.innerHTML = '<div class="p-6 text-sm font-bold text-red-600">Monitor non configurato. Esegui prima lo script SQL dedicato su Supabase.</div>';
            }
        } finally {
            if (refreshButton) refreshButton.disabled = false;
        }
    }

    async function saveStudioNote(studioId) {
        const status = document.querySelector(`[data-studio-status="${studioId}"]`)?.value || 'new';
        const notes = document.querySelector(`[data-studio-note="${studioId}"]`)?.value || '';
        const button = document.querySelector(`[data-save-note="${studioId}"]`);

        if (button) {
            button.disabled = true;
            button.textContent = 'Salvo...';
        }

        try {
            const { error } = await client.rpc('update_platform_studio_note', {
                target_studio_id: studioId,
                new_beta_status: status,
                new_internal_notes: notes
            });
            if (error) throw error;
            await loadDashboard();
        } catch (error) {
            console.error('Admin note save failed:', error);
            alert('Non sono riuscito a salvare la nota. Controlla lo script SQL e i permessi.');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Salva';
            }
        }
    }

    async function handleLogin(event) {
        event.preventDefault();

        const email = byId('admin-email').value.trim().toLowerCase();
        const password = byId('admin-password').value;
        const submitButton = byId('admin-login-submit');

        if (submitButton) submitButton.disabled = true;
        setLoginStatus('Accesso in corso...', 'neutral');

        try {
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            currentUser = data.user;
            showState('dashboard');
            await loadDashboard();
        } catch (error) {
            console.error('Admin login failed:', error);
            setLoginStatus('Accesso non riuscito. Controlla email e password.', 'error');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    async function handleLogout() {
        await client.auth.signOut();
        currentUser = null;
        showState('login');
    }

    async function init() {
        client = createClient();
        if (!client) {
            setLoginStatus('Configurazione Supabase mancante. Riprova dopo il deploy.', 'error');
            showState('login');
            return;
        }

        byId('admin-login-form')?.addEventListener('submit', handleLogin);
        byId('admin-logout')?.addEventListener('click', handleLogout);
        byId('admin-refresh')?.addEventListener('click', loadDashboard);
        byId('admin-search')?.addEventListener('input', renderStudios);
        byId('admin-studios-list')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-save-note]');
            if (!button) return;
            saveStudioNote(button.dataset.saveNote);
        });

        const { data } = await client.auth.getUser();
        currentUser = data?.user || null;

        if (!currentUser) {
            showState('login');
            return;
        }

        if (!isAllowedEmail(currentUser.email)) {
            showState('denied');
            return;
        }

        showState('dashboard');
        await loadDashboard();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
