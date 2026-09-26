// Arch Time Pro - first-value activation path shared by the live app and October prototype.
(() => {
    const container = document.getElementById('activation-checklist');
    const actionButton = document.getElementById('activation-next-action');
    if (!container || !actionButton) return;

    const params = new URLSearchParams(window.location.search);
    const isPrototype = params.get('prototypeFlow') === '1' || window.location.pathname.includes('prototipo');
    let lastSignature = '';

    function studioId() {
        try {
            return userProfile?.studio_id || (isPrototype ? 'prototype' : 'pending');
        } catch (_) {
            return isPrototype ? 'prototype' : 'pending';
        }
    }

    function firstValueKey() {
        return `archtime-first-value:${studioId()}`;
    }

    function isDemoProject(project) {
        if (!project) return true;
        if (project.is_demo === true || String(project.id || '').startsWith('demo-')) return true;
        try {
            const theme = typeof THEMES !== 'undefined' ? THEMES[currentBusinessType] : null;
            return studioData?.demo_generated === true
                && project.name === theme?.demoProject
                && project.client === theme?.demoClient;
        } catch (_) {
            return false;
        }
    }

    function realProjects() {
        try {
            return Array.isArray(projects) ? projects.filter(project => !isDemoProject(project)) : [];
        } catch (_) {
            return [];
        }
    }

    function realEntries(projectList) {
        try {
            const ids = new Set(projectList.map(project => String(project.id)));
            return Array.isArray(entries)
                ? entries.filter(entry => ids.has(String(entry.project_id)) && Number(entry.duration || 0) > 0)
                : [];
        } catch (_) {
            return [];
        }
    }

    function appIsReady() {
        const app = document.getElementById('app-container');
        return Boolean(app && !app.classList.contains('force-hide'));
    }

    function ownerCanSeeChecklist() {
        if (isPrototype) return true;
        try {
            return Boolean(userProfile?.is_owner || userProfile?.role === 'admin');
        } catch (_) {
            return false;
        }
    }

    function currentProgress() {
        const projectList = realProjects();
        const entryList = realEntries(projectList);
        let running = false;
        try { running = Boolean(timerRunning); } catch (_) {}
        const valueSeen = localStorage.getItem(firstValueKey()) === 'done';
        return {
            projectList,
            entryList,
            running,
            project: projectList.length > 0,
            entry: entryList.length > 0,
            value: valueSeen
        };
    }

    function nextProject(progress) {
        if (!progress.projectList.length) return null;
        return [...progress.projectList].sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return bTime - aTime;
        })[0];
    }

    function focusProjectWork(project, running = false) {
        if (!project) return;
        if (typeof switchAppTab === 'function') switchAppTab('operate');
        const projectIndex = projects.findIndex(item => String(item.id) === String(project.id));
        const projectSelect = document.getElementById('project-select');
        if (projectSelect && projectIndex >= 0) {
            projectSelect.value = String(projectIndex);
            if (typeof updateTaskDropdown === 'function') updateTaskDropdown();
        }
        const panel = document.getElementById('timer-panel');
        panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => document.getElementById(running ? 'btn-toggle-timer' : 'quick-hours')?.focus({ preventScroll: true }), 450);
    }

    async function runNextAction() {
        const progress = currentProgress();
        const project = nextProject(progress);
        if (!progress.project) {
            if (typeof openOwnerOnboarding === 'function') await openOwnerOnboarding();
            else document.getElementById('btn-open-project-modal')?.click();
            return;
        }
        if (!progress.entry) {
            focusProjectWork(project, progress.running);
            return;
        }
        if (!progress.value && typeof showFirstValueMoment === 'function') {
            await showFirstValueMoment(project.id);
            render();
        }
    }

    function render() {
        if (!appIsReady() || !ownerCanSeeChecklist()) {
            container.classList.add('force-hide');
            return;
        }

        const progress = currentProgress();
        const completed = ['project', 'entry', 'value'].filter(step => progress[step]);
        const signature = [completed.join(','), progress.running].join('|');
        if (signature === lastSignature && !container.classList.contains('force-hide')) return;
        lastSignature = signature;

        if (completed.length === 3) {
            container.classList.add('force-hide');
            return;
        }

        container.classList.remove('force-hide');
        document.getElementById('activation-checklist-progress').textContent = `${completed.length} di 3 passaggi completati`;
        container.querySelectorAll('[data-activation-step]').forEach(item => {
            const done = Boolean(progress[item.dataset.activationStep]);
            item.classList.toggle('is-complete', done);
            item.setAttribute('aria-current', done ? 'false' : 'step');
        });

        const label = actionButton.querySelector('span');
        if (!progress.project) label.textContent = 'Crea la prima commessa';
        else if (!progress.entry && progress.running) label.textContent = 'Torna al timer attivo';
        else if (!progress.entry) label.textContent = 'Registra le prime ore';
        else label.textContent = 'Controlla l’andamento';
        lucide?.createIcons?.();
    }

    actionButton.addEventListener('click', runNextAction);
    window.addEventListener('archtime:onboarding-complete', () => window.setTimeout(render, 100));
    window.addEventListener('archtime:timer-started', render);
    window.addEventListener('archtime:entry-created', () => window.setTimeout(render, 100));
    document.getElementById('btn-continue-first-value')?.addEventListener('click', render);

    const initialTimer = window.setInterval(() => {
        render();
        if (appIsReady() && currentProgress().value) window.clearInterval(initialTimer);
    }, 900);
    render();
})();
