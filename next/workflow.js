// A workflow study on the real October prototype DOM and demo data.
(() => {
    const views = {
        today: { title: 'Oggi', subtitle: 'Riprendi il lavoro e controlla le registrazioni recenti.' },
        projects: { title: 'Commesse', subtitle: 'Budget, costi, incassi e stato di tutti i lavori.' },
        log: { title: 'Registro attività', subtitle: 'Ore e note dello studio, organizzate per settimana.' },
        analytics: { title: 'Analisi', subtitle: 'Margini, andamento e segnali economici dello studio.' },
        studio: { title: 'Studio', subtitle: 'Identità, attività, team e clienti in un unico spazio.' }
    };
    const icons = { today: 'house', projects: 'briefcase-business', log: 'calendar-days', analytics: 'chart-no-axes-combined', studio: 'settings-2' };
    const labels = { today: 'Oggi', projects: 'Commesse', log: 'Registro', analytics: 'Analisi', studio: 'Studio' };
    let activeView = 'today';
    let ownerProfile;

    const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;

    function createNav(className) {
        const nav = document.createElement('nav');
        nav.className = className;
        nav.setAttribute('aria-label', 'Sezioni dell’app');
        nav.innerHTML = Object.keys(labels).map(name => `
            <button type="button" data-workflow-target="${name}" aria-label="${labels[name]}" aria-current="${name === 'today' ? 'page' : 'false'}">
                ${icon(icons[name])}<span class="workflow-nav-label" aria-hidden="true">${labels[name]}</span>
            </button>
        `).join('');
        nav.addEventListener('click', event => {
            const button = event.target.closest('[data-workflow-target]');
            if (button) openView(button.dataset.workflowTarget);
        });
        return nav;
    }

    function populateTimerFromRecentWork() {
        const select = document.getElementById('project-select');
        const taskSelect = document.getElementById('task-select');
        if (!select || !taskSelect || select.value || !Array.isArray(entries)) return;
        const recent = entries
            .filter(entry => (!document.body.classList.contains('workflow-staff') || entry.user_email === userProfile.email)
                && projects.some(project => project.id === entry.project_id && !project.is_archived))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (!recent) return;
        const index = projects.findIndex(project => project.id === recent.project_id);
        if (index < 0 || ![...select.options].some(option => option.value === String(index))) return;
        select.value = String(index);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if ([...taskSelect.options].some(option => option.value === recent.task)) taskSelect.value = recent.task;
        const note = document.getElementById('workflow-last-work');
        if (note) note.textContent = `Ultima attività: ${recent.task} · ${recent.project_name}`;
    }

    function renderFocus() {
        const focus = document.getElementById('workflow-focus');
        if (!focus || !Array.isArray(entries)) return;
        const today = new Date().toDateString();
        const staff = document.body.classList.contains('workflow-staff');
        const todayEntries = entries.filter(entry => new Date(entry.created_at).toDateString() === today
            && (!staff || entry.user_email === userProfile.email));
        const hours = todayEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
        const text = focus.querySelector('.workflow-focus-copy');
        if (todayEntries.length) {
            const amount = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(hours);
            text.innerHTML = `<strong>${staff ? 'Hai' : 'Lo studio ha'} registrato ${amount} ore oggi</strong><span>Controlla le attività della giornata prima di continuare.</span>`;
        } else {
            text.innerHTML = `<strong>${staff ? 'Non hai registrato ore oggi' : 'Nessuna ora registrata oggi'}</strong><span>Riprendi il timer o inserisci il lavoro già svolto.</span>`;
        }
    }

    function renderStaffWeek() {
        const panel = document.getElementById('workflow-staff-week');
        if (!panel) return;
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const mine = entries.filter(entry => entry.user_email === userProfile.email && new Date(entry.created_at) >= monday);
        const hours = mine.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
        const projectCount = new Set(mine.map(entry => entry.project_id)).size;
        panel.querySelector('[data-staff-hours]').textContent = `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(hours)} h`;
        panel.querySelector('[data-staff-projects]').textContent = String(projectCount);
    }

    function renderOwnerWeek() {
        const panel = document.getElementById('workflow-owner-week');
        if (!panel || !ownerProfile) return;
        const monday = new Date();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const mine = entries.filter(entry => entry.user_email === ownerProfile.email && new Date(entry.created_at) >= monday);
        const hours = mine.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
        panel.querySelector('[data-owner-hours]').textContent = `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(hours)} h`;
        panel.querySelector('[data-owner-projects]').textContent = `${new Set(mine.map(entry => entry.project_id)).size} commesse`;
    }

    function renderStaffProjects() {
        if (!document.body.classList.contains('workflow-staff')) return;
        const container = document.getElementById('projects-list');
        if (!container) return;
        container.className = 'workflow-staff-projects';
        container.replaceChildren();
        projects.filter(project => !project.is_archived).forEach(project => {
            const card = document.createElement('article');
            card.className = 'workflow-staff-project-card';
            const intro = document.createElement('div');
            intro.className = 'workflow-staff-project-intro';
            const title = document.createElement('h3');
            title.textContent = project.name;
            const client = document.createElement('p');
            client.textContent = project.client || 'Lavoro interno';
            intro.append(title, client);
            const myHours = entries.filter(entry => entry.project_id === project.id && entry.user_email === userProfile.email)
                .reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
            const metric = document.createElement('div');
            metric.className = 'workflow-staff-project-hours';
            metric.innerHTML = `<strong>${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(myHours)} h</strong><span>mie ore</span>`;
            const tasks = document.createElement('p');
            tasks.className = 'workflow-staff-project-tasks';
            tasks.textContent = `Attività: ${(project.tasks || []).join(' · ')}`;
            const button = document.createElement('button');
            button.type = 'button';
            button.innerHTML = `Riprendi qui ${icon('arrow-right')}`;
            button.addEventListener('click', () => {
                openView('today');
                const index = projects.findIndex(item => item.id === project.id);
                const select = document.getElementById('project-select');
                select.value = String(index);
                select.dispatchEvent(new Event('change', { bubbles: true }));
                const task = (project.tasks || [])[0];
                const taskSelect = document.getElementById('task-select');
                if (task && [...taskSelect.options].some(option => option.value === task)) taskSelect.value = task;
                document.getElementById('workflow-last-work').textContent = `Commessa selezionata: ${project.name}`;
                document.getElementById('timer-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            card.append(intro, metric, tasks, button);
            container.append(card);
        });
        window.lucide?.createIcons();
    }

    function setPersona(staff) {
        if (typeof timerRunning !== 'undefined' && timerRunning) {
            appAlert('Timer attivo', 'Termina il timer prima di cambiare la vista del prototipo.');
            return;
        }
        document.body.classList.toggle('workflow-staff', staff);
        document.body.classList.toggle('is-admin', !staff);
        userProfile = staff ? { ...profiles.find(profile => profile.full_name === 'Laura Bianchi') } : { ...ownerProfile };
        document.getElementById('user-display').textContent = staff ? 'Laura' : 'Stefano';
        document.getElementById('header-user-role').textContent = staff ? 'Collaboratore' : 'Admin';
        const switcher = document.getElementById('workflow-persona-switch');
        switcher.innerHTML = staff ? `${icon('refresh-cw')} Vista owner` : `${icon('refresh-cw')} Vista collaboratore`;
        switcher.setAttribute('aria-pressed', String(staff));
        switcher.setAttribute('aria-label', staff ? 'Mostra vista owner' : 'Mostra vista collaboratore');
        document.querySelectorAll('[data-workflow-target="studio"]').forEach(button => {
            button.innerHTML = `${icon(staff ? 'user-round' : 'settings-2')}<span class="workflow-nav-label" aria-hidden="true">${staff ? 'Profilo' : 'Studio'}</span>`;
            button.setAttribute('aria-label', staff ? 'Profilo' : 'Studio');
        });
        renderProjects();
        if (staff) renderStaffProjects();
        renderEntries();
        document.getElementById('project-select').value = '';
        populateTimerFromRecentWork();
        renderFocus();
        renderStaffWeek();
        renderOwnerWeek();
        openView('today');
        window.lucide?.createIcons();
    }

    function openView(requested) {
        const view = requested === 'analytics' && document.body.classList.contains('workflow-staff')
            ? 'today'
            : (views[requested] ? requested : 'today');
        activeView = view;
        const app = document.getElementById('app-container');
        app.dataset.workflowView = view;
        const staff = document.body.classList.contains('workflow-staff');
        document.getElementById('workflow-title').textContent = view === 'studio' && staff ? 'Profilo' : views[view].title;
        document.getElementById('workflow-subtitle').textContent = view === 'studio' && staff
            ? 'Il tuo spazio nello studio e le informazioni di accesso.'
            : views[view].subtitle;
        const sectionTitles = {
            finance: view === 'today' ? 'Sintesi dello studio' : 'Analisi finanziaria',
            projects: view === 'today' ? 'Commesse in evidenza' : 'Commesse',
            log: view === 'today' ? 'Attività recenti' : 'Registro Attività'
        };
        document.querySelector('.workflow-finance .analytics-section-heading h2').textContent = sectionTitles.finance;
        document.querySelector('.workflow-projects .projects-section-heading h2').textContent = document.body.classList.contains('workflow-staff')
            ? 'Commesse disponibili'
            : sectionTitles.projects;
        document.querySelector('.workflow-log .activity-section-heading h2').textContent = sectionTitles.log;
        document.querySelector('.workflow-log .activity-section-heading p').textContent = document.body.classList.contains('workflow-staff')
            ? 'Le tue ore e note, organizzate per settimana.'
            : 'Ore e note dello studio, organizzate per settimana.';
        const action = document.getElementById('workflow-heading-action');
        if (action) {
            const actionContent = view === 'analytics'
                ? `${icon('file-text')}<span>Report studio</span>`
                : `${icon('pencil-line')}<span>Inserisci ore</span>`;
            action.innerHTML = actionContent;
            action.setAttribute('aria-label', view === 'analytics' ? 'Apri report studio' : 'Inserisci ore');
            window.lucide?.createIcons();
        }
        document.querySelectorAll('[data-workflow-target]').forEach(button => {
            const selected = button.dataset.workflowTarget === view;
            button.classList.toggle('is-active', selected);
            button.setAttribute('aria-current', selected ? 'page' : 'false');
        });
        const studioPage = document.getElementById('modal-studio-management');
        studioPage?.classList.add('force-hide');
        if (view === 'studio') {
            if (staff) {
                const profile = document.getElementById('workflow-profile-page');
                profile.querySelector('[data-profile-name]').textContent = userProfile.full_name;
                profile.querySelector('[data-profile-email]').textContent = userProfile.email;
                profile.querySelector('[data-profile-studio]').textContent = studioData.name;
            } else {
                renderStudioManagementSummary();
                switchStudioManagementTab('identity');
                studioPage?.classList.remove('force-hide');
            }
        }
        if (view === 'analytics') {
            const detailsToggle = document.getElementById('btn-toggle-analytics');
            if (detailsToggle?.getAttribute('aria-expanded') === 'false') detailsToggle.click();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function install() {
        const app = document.getElementById('app-container');
        const main = app?.querySelector(':scope > main');
        const header = app?.querySelector(':scope > header');
        const columns = [...(main?.children || [])];
        const left = columns.find(node => node.classList?.contains('lg:col-span-4'));
        const right = columns.find(node => node.classList?.contains('lg:col-span-8'));
        if (!app || !main || !header || !left || !right) return;
        ownerProfile = { ...userProfile };

        document.body.classList.add('workflow-2026');
        app.classList.add('workflow-2026');
        left.classList.add('workflow-left');
        right.classList.add('workflow-right');

        const timer = document.getElementById('timer-panel');
        const management = left.querySelector('.studio-management-summary');
        const finance = right.querySelector('[data-tab="analyze"]');
        const projectsSection = right.querySelector('[data-tab="operate"]');
        const log = right.querySelectorAll('[data-tab="operate"]')[1];
        timer?.classList.add('workflow-timer');
        management?.classList.add('workflow-management');
        finance?.classList.add('workflow-finance');
        projectsSection?.classList.add('workflow-projects');
        log?.classList.add('workflow-log');
        // Commesse continues beneath the two-column workspace, across the full page.
        if (projectsSection) main.appendChild(projectsSection);

        const projectsList = document.getElementById('projects-list');
        new MutationObserver(() => {
            if (document.body.classList.contains('workflow-staff')
                && projectsList?.firstElementChild
                && !projectsList.firstElementChild.classList.contains('workflow-staff-project-card')) renderStaffProjects();
        }).observe(projectsList, { childList: true });

        const topNav = createNav('workflow-nav workflow-nav-desktop');
        app.insertBefore(topNav, main);
        app.appendChild(createNav('workflow-nav workflow-nav-mobile'));
        const syncHeaderHeight = () => document.documentElement.style.setProperty('--workflow-header-height', `${header.getBoundingClientRect().height}px`);
        syncHeaderHeight();
        new ResizeObserver(syncHeaderHeight).observe(header);
        const persona = document.createElement('button');
        persona.id = 'workflow-persona-switch';
        persona.type = 'button';
        persona.setAttribute('aria-pressed', 'false');
        persona.setAttribute('aria-label', 'Mostra vista collaboratore');
        persona.innerHTML = `${icon('refresh-cw')} Vista collaboratore`;
        header.querySelector('.max-w-7xl > div:last-child')?.insertBefore(persona, document.getElementById('btn-open-account'));
        persona.remove();

        const heading = document.createElement('div');
        heading.className = 'workflow-view-heading';
        heading.innerHTML = `
            <div><p class="workflow-date"></p><h2 id="workflow-title">Oggi</h2><p id="workflow-subtitle">${views.today.subtitle}</p></div>
            <button type="button" id="workflow-heading-action" class="secondary-action">${icon('pencil-line')}<span>Inserisci ore</span></button>
        `;
        heading.querySelector('.workflow-date').textContent = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
        main.insertBefore(heading, main.firstChild);
        heading.querySelector('#workflow-heading-action').addEventListener('click', () => {
            if (activeView === 'analytics') document.getElementById('btn-header-pdf')?.click();
            else document.getElementById('btn-open-manual-entry')?.click();
        });

        const studioPage = document.getElementById('modal-studio-management');
        studioPage.classList.remove('modal');
        studioPage.classList.add('workflow-studio-page');
        main.appendChild(studioPage);
        studioPage.addEventListener('click', event => {
            if (event.target === studioPage) event.stopImmediatePropagation();
        }, true);
        const profilePage = document.createElement('section');
        profilePage.id = 'workflow-profile-page';
        profilePage.innerHTML = `
            <div class="workflow-profile-card">
                <div class="workflow-profile-avatar">${icon('user-round')}</div>
                <div><p>Collaboratore</p><h3 data-profile-name></h3><span data-profile-email></span></div>
            </div>
            <div class="workflow-profile-detail"><span>Studio</span><strong data-profile-studio></strong></div>
            <div class="workflow-profile-detail"><span>Ruolo</span><strong>Collaboratore</strong></div>
        `;
        main.appendChild(profilePage);
        document.addEventListener('keydown', event => {
            if (window.ArchTimeGuide?.isActive?.()) return;
            if (event.key !== 'Escape' || activeView !== 'studio' || document.body.classList.contains('workflow-staff')) return;
            const otherModal = [...document.querySelectorAll('.modal:not(.force-hide)')]
                .some(modal => modal.id !== 'modal-studio-management');
            if (!otherModal) {
                event.preventDefault();
                event.stopImmediatePropagation();
                openView('today');
            }
        }, true);

        const focus = document.createElement('section');
        focus.id = 'workflow-focus';
        focus.className = 'workflow-focus';
        focus.innerHTML = `${icon('circle-alert')}<div class="workflow-focus-copy"></div><button type="button">Apri registro ${icon('arrow-right')}</button>`;
        main.insertBefore(focus, left);
        focus.querySelector('button').addEventListener('click', () => openView('log'));
        renderFocus();

        const staffWeek = document.createElement('section');
        staffWeek.id = 'workflow-staff-week';
        staffWeek.innerHTML = `
            <div><p>Questa settimana</p><h2>Il tuo lavoro</h2><span>Ore registrate nelle commesse dello studio.</span></div>
            <div><small>Ore registrate</small><strong data-staff-hours>0 h</strong></div>
            <div><small>Commesse utilizzate</small><strong data-staff-projects>0</strong></div>
            <button type="button">Apri registro ${icon('arrow-right')}</button>
        `;
        right.insertBefore(staffWeek, right.firstChild);
        staffWeek.querySelector('button').addEventListener('click', () => openView('log'));
        renderStaffWeek();

        timer?.querySelector('h2')?.replaceChildren();
        if (timer?.querySelector('h2')) timer.querySelector('h2').innerHTML = `${icon('clock-3')} Riprendi il lavoro`;
        const recentNote = document.createElement('p');
        recentNote.id = 'workflow-last-work';
        recentNote.className = 'workflow-last-work';
        recentNote.textContent = 'Scegli una commessa per iniziare.';
        timer?.querySelector('h2')?.parentElement?.after(recentNote);
        const ownerWeek = document.createElement('div');
        ownerWeek.id = 'workflow-owner-week';
        ownerWeek.innerHTML = `${icon('calendar-check')}<div><span>La tua settimana</span><strong data-owner-hours>0 h</strong></div><small data-owner-projects>0 commesse</small>`;
        timer?.querySelector('.space-y-4')?.after(ownerWeek);
        renderOwnerWeek();
        populateTimerFromRecentWork();

        const financeHeading = finance?.querySelector('.analytics-section-heading');
        if (financeHeading) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'workflow-section-link';
            button.innerHTML = `Analisi completa ${icon('arrow-right')}`;
            button.addEventListener('click', () => openView('analytics'));
            financeHeading.appendChild(button);
        }
        const projectsHeading = projectsSection?.querySelector('.projects-section-heading');
        if (projectsHeading) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'workflow-section-link';
            button.innerHTML = `Tutte le commesse ${icon('arrow-right')}`;
            button.addEventListener('click', () => openView('projects'));
            projectsHeading.appendChild(button);
        }
        const logHeading = log?.querySelector('.activity-section-heading');
        if (logHeading) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'workflow-section-link';
            button.innerHTML = `Apri registro ${icon('arrow-right')}`;
            button.addEventListener('click', () => openView('log'));
            logHeading.appendChild(button);
        }

        window.addEventListener('archtime:entry-created', () => {
            renderFocus();
            renderStaffWeek();
            renderOwnerWeek();
            if (document.body.classList.contains('workflow-staff')) renderStaffProjects();
        });
        openView('today');
        window.lucide?.createIcons();
        window.__ARCHTIME_WORKFLOW_READY__ = true;
    }

    let attempts = 0;
    const wait = setInterval(() => {
        attempts += 1;
        if (window.__ARCHTIME_NEXT_READY__ === true) {
            clearInterval(wait);
            install();
        }
    }, 40);
})();
