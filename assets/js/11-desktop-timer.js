// Arch Time Pro - Mini desktop timer
(function () {
    const config = window.ARCH_TIME_CONFIG || {};
    const supabaseUrl = config.supabaseUrl || '';
    const supabaseKey = config.supabaseKey || '';

    let client = null;
    let user = null;
    let profile = null;
    let projects = [];
    let timerRunning = false;
    let timerStart = null;
    let timerTickHandle = null;

    const $ = id => document.getElementById(id);

    function setStatus(targetId, message, type = 'neutral') {
        const target = $(targetId);
        if (!target) return;
        target.textContent = message;
        target.className = `notice ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
        target.classList.toggle('hidden', !message);
    }

    function showView(view) {
        $('login-view').classList.toggle('hidden', view !== 'login');
        $('timer-view').classList.toggle('hidden', view !== 'timer');
    }

    function formatTime(hours) {
        const totalMinutes = Math.round((Number(hours) || 0) * 60);
        return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    }

    function parseDurationInput(value) {
        const raw = String(value || '').trim().replace(',', '.');
        if (!raw) return NaN;
        const match = raw.match(/^(\d{1,3}):([0-5]\d)$/);
        if (match) return Number(match[1]) + Number(match[2]) / 60;
        const decimal = Number(raw);
        return Number.isFinite(decimal) ? decimal : NaN;
    }

    function formatTimer(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function clearTimerTick() {
        if (timerTickHandle) {
            clearTimeout(timerTickHandle);
            timerTickHandle = null;
        }
    }

    function updateTimerDisplay() {
        if (!timerRunning || !timerStart) return;

        const elapsed = Date.now() - timerStart;
        $('timer-display').textContent = formatTimer(elapsed);
        const delayToNextSecond = 1000 - (elapsed % 1000);
        timerTickHandle = setTimeout(updateTimerDisplay, Math.max(80, delayToNextSecond + 12));
    }

    function todayInputValue() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function entryDateToIso(dateValue) {
        return dateValue ? new Date(`${dateValue}T12:00:00Z`).toISOString() : null;
    }

    function getSelectedProjectIndex() {
        return Number($('project-select').value);
    }

    function getSelectedProject() {
        return projects[getSelectedProjectIndex()];
    }

    function renderProjects() {
        const projectSelect = $('project-select');
        const activeProjects = projects.filter(project => project.is_archived !== true);
        projectSelect.innerHTML = activeProjects.length
            ? activeProjects.map(project => {
                const index = projects.indexOf(project);
                return `<option value="${index}">${escapeHtml(project.name)}</option>`;
            }).join('')
            : '<option value="">Nessun progetto attivo</option>';
        renderTasks();
    }

    function renderTasks() {
        const project = getSelectedProject();
        const tasks = project?.tasks?.length ? project.tasks : ['Generico'];
        $('task-select').innerHTML = tasks.map(task => `<option value="${escapeAttr(task)}">${escapeHtml(task)}</option>`).join('');
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#096;');
    }

    async function loadProjects() {
        const { data, error } = await client
            .from('projects')
            .select('id,name,tasks,is_archived')
            .eq('studio_id', profile.studio_id)
            .order('name');
        if (error) throw error;
        projects = data || [];
        renderProjects();
    }

    async function loadProfile() {
        const { data: userData, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        user = userData.user;
        if (!user) return null;

        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (error) throw error;
        profile = data;
        return profile;
    }

    async function createEntryViaRpc(project, task, hours, customDate, notes) {
        const { error } = await client.rpc('create_entry_for_app', {
            entry_project_id: project.id,
            entry_task: task,
            entry_duration: hours,
            entry_notes: notes || '',
            entry_created_at: entryDateToIso(customDate)
        });
        return !error;
    }

    async function saveEntry(project, task, hours, customDate = null, notes = '') {
        if (!project || !hours || hours <= 0) throw new Error('Seleziona progetto e ore valide.');

        const createdViaRpc = await createEntryViaRpc(project, task, hours, customDate, notes);
        if (createdViaRpc) return;

        const payload = {
            project_id: project.id,
            project_name: project.name,
            task,
            duration: hours,
            user_email: profile.email,
            user_name: profile.full_name,
            rate: Number(profile.hourly_cost || 0) * hours,
            studio_id: profile.studio_id,
            notes
        };
        if (customDate) payload.created_at = entryDateToIso(customDate);
        const { error } = await client.from('entries').insert([payload]);
        if (error) throw error;
    }

    async function restoreTimer() {
        if (!profile?.active_timer_start) return;

        timerRunning = true;
        timerStart = Number(profile.active_timer_start);
        const activeIndex = profile.active_timer_project;
        const activeTask = profile.active_timer_task;
        if (activeIndex !== null && activeIndex !== '' && projects[Number(activeIndex)]) {
            $('project-select').value = String(activeIndex);
            renderTasks();
        }
        if (activeTask) $('task-select').value = activeTask;
        if (profile.active_timer_notes) $('notes').value = profile.active_timer_notes;
        startTimerUi();
    }

    function startTimerUi() {
        $('btn-toggle-timer').classList.add('running');
        $('btn-toggle-timer').innerHTML = '<i data-lucide="square" width="17" height="17"></i><span>Ferma e salva</span>';
        $('timer-status').textContent = 'Timer attivo';
        clearTimerTick();
        updateTimerDisplay();
        lucide.createIcons();
    }

    function stopTimerUi() {
        clearTimerTick();
        $('timer-display').textContent = '00:00:00';
        $('timer-status').textContent = 'Pronto';
        $('btn-toggle-timer').classList.remove('running');
        $('btn-toggle-timer').innerHTML = '<i data-lucide="play-circle" width="17" height="17"></i><span>Avvia</span>';
        lucide.createIcons();
    }

    async function toggleTimer() {
        const project = getSelectedProject();
        const projectIndex = getSelectedProjectIndex();
        const task = $('task-select').value || 'Generico';
        const notes = $('notes').value.trim();
        if (!project) return setStatus('app-status', 'Seleziona un progetto attivo.', 'error');

        if (!timerRunning) {
            timerRunning = true;
            timerStart = Date.now();
            const { error } = await client.from('profiles').update({
                active_timer_start: String(timerStart),
                active_timer_project: String(projectIndex),
                active_timer_task: task,
                active_timer_notes: notes,
                active_timer_reminder_sent_at: null
            }).eq('id', profile.id);
            if (error) throw error;
            startTimerUi();
            setStatus('app-status', 'Timer avviato.', 'success');
            return;
        }

        timerRunning = false;
        const startedAt = new Date(timerStart);
        const endedAt = new Date();
        const hours = (Date.now() - timerStart) / 3600000;
        const startLabel = startedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const endLabel = endedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const timedNotes = notes ? `[${startLabel} - ${endLabel}] ${notes}` : `[${startLabel} - ${endLabel}]`;

        const { error } = await client.from('profiles').update({
            active_timer_start: null,
            active_timer_project: null,
            active_timer_task: null,
            active_timer_notes: null,
            active_timer_reminder_sent_at: null
        }).eq('id', profile.id);
        if (error) throw error;

        await saveEntry(project, task, hours, null, timedNotes);
        $('notes').value = '';
        stopTimerUi();
        setStatus('app-status', `Ore salvate: ${formatTime(hours)}.`, 'success');
    }

    function calculateManualHours() {
        const start = $('manual-start').value;
        const end = $('manual-end').value;
        if (!start || !end) return;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        const diff = (eH * 60 + eM) - (sH * 60 + sM);
        if (diff > 0) $('manual-hours').value = formatTime(diff / 60);
    }

    async function saveManual() {
        const project = getSelectedProject();
        const task = $('task-select').value || 'Generico';
        const date = $('manual-date').value;
        const hours = parseDurationInput($('manual-hours').value);
        const notes = $('notes').value.trim();
        const start = $('manual-start').value;
        const end = $('manual-end').value;
        if (!project || !date || !hours || hours <= 0) {
            return setStatus('app-status', 'Completa progetto, data e ore.', 'error');
        }
        const timedNotes = start && end ? (notes ? `[${start} - ${end}] ${notes}` : `[${start} - ${end}]`) : notes;
        await saveEntry(project, task, hours, date, timedNotes);
        $('manual-hours').value = '';
        $('manual-start').value = '';
        $('manual-end').value = '';
        $('notes').value = '';
        setStatus('app-status', `Ore salvate: ${formatTime(hours)}.`, 'success');
    }

    function switchPanel(name) {
        const isTimer = name === 'timer';
        $('timer-panel').classList.toggle('hidden', !isTimer);
        $('manual-panel').classList.toggle('hidden', isTimer);
        $('tab-timer').classList.toggle('active', isTimer);
        $('tab-manual').classList.toggle('active', !isTimer);
    }

    async function login() {
        setStatus('login-status', 'Accesso in corso...');
        const email = $('login-email').value.trim();
        const password = $('login-password').value;
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            setStatus('login-status', 'Credenziali errate o account non confermato.', 'error');
            return;
        }
        await bootAuthenticated();
    }

    async function logout() {
        await client.auth.signOut();
        user = null;
        profile = null;
        projects = [];
        stopTimerUi();
        showView('login');
    }

    async function bootAuthenticated() {
        try {
            const loadedProfile = await loadProfile();
            if (!loadedProfile) return showView('login');
            if (!loadedProfile.studio_id) {
                showView('login');
                setStatus('login-status', 'Questo account non è ancora collegato a uno studio.', 'error');
                return;
            }
            $('user-label').textContent = loadedProfile.full_name || loadedProfile.email;
            $('manual-date').value = todayInputValue();
            await loadProjects();
            showView('timer');
            await restoreTimer();
            setStatus('app-status', '');
        } catch (error) {
            console.error(error);
            setStatus('login-status', error.message || 'Accesso non riuscito.', 'error');
        }
    }

    async function init() {
        lucide.createIcons();
        if (!supabaseUrl || !supabaseKey || !window.supabase) {
            setStatus('login-status', 'Configurazione Supabase mancante.', 'error');
            return;
        }

        client = window.supabase.createClient(supabaseUrl, supabaseKey);
        $('btn-login').addEventListener('click', login);
        $('btn-logout').addEventListener('click', logout);
        $('btn-toggle-timer').addEventListener('click', () => toggleTimer().catch(error => setStatus('app-status', error.message, 'error')));
        $('btn-save-manual').addEventListener('click', () => saveManual().catch(error => setStatus('app-status', error.message, 'error')));
        $('btn-refresh').addEventListener('click', () => loadProjects().then(() => setStatus('app-status', 'Progetti aggiornati.', 'success')).catch(error => setStatus('app-status', error.message, 'error')));
        $('project-select').addEventListener('change', renderTasks);
        $('manual-start').addEventListener('change', calculateManualHours);
        $('manual-end').addEventListener('change', calculateManualHours);
        $('tab-timer').addEventListener('click', () => switchPanel('timer'));
        $('tab-manual').addEventListener('click', () => switchPanel('manual'));

        const { data } = await client.auth.getSession();
        if (data.session) await bootAuthenticated();
        else showView('login');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
