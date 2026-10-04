// Desktop-only composition of the isolated Next prototype.
(() => {
    const desktop = matchMedia('(min-width: 1024px)');
    const el = id => document.getElementById(id);
    const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
    let installed = false;

    function install() {
        if (installed) return;
        installed = true;
        const app = el('app-container');
        const left = document.querySelector('.workflow-left');
        const right = document.querySelector('.workflow-right');
        right.append(el('workflow-focus'));
        const timer = el('timer-panel');
        const manual = el('modal-manual');
        const studio = el('modal-studio-management');
        const tabs = studio.querySelector('.studio-management-tabs');
        const projectSection = document.querySelector('.workflow-projects');
        const projectCollator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
        const baseGetVisibleProjects = getVisibleProjects;
        getVisibleProjects = function () {
            return baseGetVisibleProjects.apply(this, arguments).sort((a, b) =>
                Number(Boolean(a.is_archived)) - Number(Boolean(b.is_archived))
                || projectCollator.compare(String(a.name || '').trim(), String(b.name || '').trim())
            );
        };
        // Sort only the rendered staff cards; project indexes remain unchanged
        // because the timer and manual-entry selectors use those indexes.
        const projectList = el('projects-list');
        function sortStaffProjectCards() {
            const cards = Array.from(projectList.querySelectorAll(':scope > .workflow-staff-project-card'));
            const sorted = [...cards].sort((a, b) => projectCollator.compare(a.querySelector('h3').textContent.trim(), b.querySelector('h3').textContent.trim()));
            if (cards.some((card, index) => card !== sorted[index])) projectList.append(...sorted);
        }
        new MutationObserver(sortStaffProjectCards).observe(projectList, { childList: true });
        renderProjects();
        sortStaffProjectCards();
        const highlights = document.createElement('div');
        highlights.id = 'context-project-highlights';
        highlights.hidden = true;
        projectList.before(highlights);
        projectSection.firstElementChild.lastElementChild.classList.add('context-project-toolbar');
        const projectDescription = projectSection.querySelector('.projects-section-heading > p');
        const originalProjectDescription = projectDescription.textContent;
        function renderProjectHighlights() {
            const visible = app.dataset.workflowView === 'today' && !document.body.classList.contains('workflow-staff');
            highlights.hidden = !visible;
            if (!visible) {
                projectDescription.textContent = originalProjectDescription;
                return;
            }
            projectSection.querySelector('.projects-section-heading h2').textContent = 'Commesse in evidenza';
            projectDescription.textContent = 'Le priorità da controllare, senza aprire ogni commessa.';
            const flow = window.archTimeFlowPrototype;
            const candidates = projects.filter(project => !project.is_archived).map(project => {
                const summary = getProjectCostSummary(project);
                const reasons = [];
                const rhythm = summary.economicReady ? getProjectRhythmSummary(project, summary) : null;
                if (rhythm && rhythm.statusTone !== 'healthy') reasons.push({ priority: rhythm.statusTone === 'danger' ? 50 : 40, tone: rhythm.statusTone, symbol: rhythm.statusTone === 'danger' ? 'activity' : 'circle-alert', text: rhythm.label, value: rhythm.description });
                if (flow?.hasPaymentPlan(project)) {
                    const payments = flow.projectMeta(project).payments;
                    const ready = payments.filter(payment => payment.status === 'pending' && flow.paymentMaturity(project, payment).ready);
                    if (ready.length) reasons.push({ priority: 25, tone: 'action', symbol: 'file-plus-2', text: 'Attività pronte da fatturare', value: `${formatMoney(ready.reduce((sum, payment) => sum + Number(project.budget || 0) * Number(payment.percent || 0) / 100, 0))} da fatturare` });
                }
                if (!(summary.budget > 0)) reasons.push({ priority: 10, tone: 'quiet', symbol: 'sliders-horizontal', text: 'Budget da impostare', value: 'Definisci il compenso della commessa' });
                const missingCost = summary.uncostedHours > 0 || (projectCostMode(project) === 'project' ? !(Number(project.project_hourly_cost) > 0) : !(summary.totalHours > 0) && !(Number(userProfile?.hourly_cost) > 0));
                if (missingCost) reasons.push({ priority: 9, tone: 'quiet', symbol: 'sliders-horizontal', text: 'Costo orario da impostare', value: summary.uncostedHours > 0 ? 'Ci sono ore senza costo valorizzato' : 'Completa il costo delle ore' });
                reasons.sort((a, b) => b.priority - a.priority);
                return { project, reason: reasons[0], additional: reasons.slice(1).map(reason => reason.text) };
            }).filter(item => item.reason).sort((a, b) => b.reason.priority - a.reason.priority || projectCollator.compare(a.project.name, b.project.name));
            highlights.replaceChildren();
            if (!candidates.length) {
                highlights.innerHTML = `<div class="context-highlights-empty">${icon('circle-check')}<div><strong>Nessuna commessa richiede attenzione</strong><p>Non risultano avvisi sul ritmo, attività da fatturare o dati economici da completare.</p></div></div>`;
            } else {
                candidates.slice(0, 3).forEach(({ project, reason, additional }) => {
                    const card = document.createElement('button');
                    card.type = 'button';
                    card.className = `context-highlight-card is-${reason.tone}`;
                    card.dataset.uiAction = 'show-project-detail';
                    card.dataset.projectId = project.id;
                    card.setAttribute('aria-label', `Apri ${project.name}: ${reason.text}`);
                    card.innerHTML = `<span class="context-highlight-icon">${icon(reason.symbol)}</span><span class="context-highlight-content"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.client || 'Lavoro interno')}</small><span>${escapeHtml(reason.text)}</span>${additional.length ? `<small>${escapeHtml(additional.join(' · '))}</small>` : ''}</span><span class="context-highlight-value">${escapeHtml(reason.value)}</span>${icon('chevron-right')}`;
                    highlights.append(card);
                });
                if (candidates.length > 3) {
                    const note = document.createElement('p');
                    note.className = 'context-highlight-more';
                    note.textContent = `3 di ${candidates.length} commesse da controllare. Le altre sono in Tutte le commesse.`;
                    highlights.append(note);
                }
            }
            window.lucide?.createIcons();
        }
        new MutationObserver(renderProjectHighlights).observe(projectList, { childList: true });
        window.addEventListener('archtime:entry-created', renderProjectHighlights);
        const archivedToggle = el('toggle-archived-btn');
        el('projects-list').after(archivedToggle);
        archivedToggle.className = 'context-show-archived';
        archivedToggle.setAttribute('aria-controls', 'projects-list');
        function syncArchivedToggle() {
            archivedToggle.innerHTML = `${icon(showArchived ? 'eye' : 'eye-off')}<span>${showArchived ? 'Nascondi archiviati' : 'Mostra archiviati'}</span>`;
            archivedToggle.setAttribute('aria-expanded', String(showArchived));
            window.lucide?.createIcons();
        }
        archivedToggle.addEventListener('click', syncArchivedToggle);
        syncArchivedToggle();
        const profile = el('workflow-profile-page');
        const quick = el('modal-prototype-quick-project');
        const quickForm = el('prototype-quick-project-form');
        const slots = new Map();
        [manual, tabs, studio, projectSection, profile, quick].forEach(node => {
            const slot = document.createComment(`Next: ${node.id || node.className}`);
            node.before(slot);
            slots.set(node, slot);
        });
        const restore = node => slots.get(node).after(node);
        document.body.classList.add('workflow-contextual');
        // Normalize known UI labels, never project names or activity names.
        const commessaLabels = new Map([
            ['Progetto', 'Commessa'], ['Progetti', 'Commesse'],
            ['Nuovo progetto', 'Nuova commessa'], ['Modifica progetto', 'Modifica commessa'],
            ['Crea progetto', 'Crea commessa']
        ]);
        ['lbl-timer-project', 'project-modal-title', 'btn-save-project-edit', 'project-quote-format-name'].forEach(id => {
            const node = el(id);
            if (!node) return;
            const normalize = () => {
                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
                let text;
                while ((text = walker.nextNode())) {
                    const translated = commessaLabels.get(text.textContent.trim());
                    if (translated) text.textContent = text.textContent.replace(text.textContent.trim(), translated);
                }
            };
            normalize();
            new MutationObserver(normalize).observe(node, { childList: true, subtree: true, characterData: true });
        });
        const baseTeamMemberCardHtml = teamMemberCardHtml;
        teamMemberCardHtml = profile => {
            const html = baseTeamMemberCardHtml(profile);
            if (!isAdminUser()) return html;
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            const cost = Number(profile.hourly_cost);
            const summary = document.createElement('p');
            summary.className = 'context-team-hourly-cost';
            summary.innerHTML = `<span>Costo orario</span><strong>${Number.isFinite(cost) && cost > 0 ? `${escapeHtml(formatMoney(cost, 2))}/h` : 'Non impostato'}</strong>`;
            template.content.firstElementChild.firstElementChild.append(summary);
            const edit = template.content.querySelector('[data-ui-action="edit-team-member"]');
            edit.setAttribute('aria-label', `Modifica ${profile.full_name || 'membro'}`);
            edit.title = 'Modifica membro';
            return template.innerHTML;
        };
        renderProfiles();
        const headerInvite = el('btn-header-invite');
        el('next-header-separator').before(headerInvite);
        headerInvite.setAttribute('aria-label', 'Invita membro');
        headerInvite.title = 'Invita membro';
        headerInvite.querySelector('span').textContent = 'Invita membro';
        const clientList = el('prototype-client-list');
        const clientCollator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });
        function sortClientCards() {
            const cards = Array.from(clientList.querySelectorAll('.prototype-client-row'));
            const sorted = [...cards].sort((a, b) => clientCollator.compare(a.querySelector('strong').textContent.trim(), b.querySelector('strong').textContent.trim()));
            if (cards.some((card, index) => card !== sorted[index])) clientList.append(...sorted);
        }
        new MutationObserver(sortClientCards).observe(clientList, { childList: true });
        sortClientCards();
        document.querySelector('.flow-demo-chip').textContent = 'Next · beta / dati reali';
        timer.classList.add('context-side-panel');
        timer.querySelector('h2').innerHTML = `${icon('clock-3')} Timer`;
        manual.firstElementChild.classList.add('context-side-panel');
        quick.firstElementChild.classList.add('context-side-panel');
        const quickHeading = quick.querySelector('h2');
        const quickDescription = quickHeading.nextElementSibling;
        const quickSubmitLabel = quickForm.querySelector('[type="submit"] span');
        const originalQuickCopy = [quickHeading.innerHTML, quickDescription.textContent, quickSubmitLabel.textContent];
        const chooserHeading = el('prototype-project-entry-copy').querySelector('h2');
        const chooserDescription = el('prototype-project-entry-copy').querySelector('p');
        const originalChooserCopy = [chooserHeading.innerHTML, chooserDescription.textContent];
        const projectButtonLabel = el('btn-open-project-modal').querySelector('span');
        const originalProjectButtonLabel = projectButtonLabel.textContent;
        const quickStatus = document.createElement('p');
        quickStatus.id = 'workflow-quick-status';
        quickStatus.setAttribute('role', 'status');
        quickStatus.hidden = true;
        quickForm.append(quickStatus);
        if (!el('prototype-quick-project-task').options.length) {
            getQuickProjectTasks().forEach(task => el('prototype-quick-project-task').add(new Option(task, task)));
        }
        let quickSubmission;
        quickForm.addEventListener('submit', () => {
            if (!quick.classList.contains('context-inline-quick')) return;
            quickSubmission = {
                count: projects.length,
                running: timerRunning,
                projectId: projects[el('project-select').value]?.id,
                task: el('task-select').value,
                notes: el('timer-notes').value
            };
        }, true);
        // Runs after the prototype's existing synchronous creation handler.
        quickForm.addEventListener('submit', () => {
            if (!quick.classList.contains('context-inline-quick') || !quickSubmission) return;
            const submitted = quickSubmission;
            quickSubmission = null;
            if (projects.length !== submitted.count + 1) return;
            const created = projects[0];
            if (submitted.running) {
                const activeIndex = projects.findIndex(project => project.id === submitted.projectId);
                el('project-select').value = String(activeIndex);
                cloudTimerProjectIndex = activeIndex;
                updateTaskDropdown();
                el('task-select').value = submitted.task;
                el('timer-notes').value = submitted.notes;
                el('prototype-quick-ready').classList.add('force-hide');
            }
            quickForm.reset();
            refreshProjectCostModeUI(quickForm);
            quickForm.querySelector('details').open = false;
            quickStatus.textContent = `«${created.name}» creata. La trovi nell’elenco.`;
            quickStatus.hidden = false;
            el('prototype-quick-project-name').focus({ preventScroll: true });
        });
        quick.addEventListener('click', event => {
            if (event.target === quick && quick.classList.contains('context-inline-quick')) event.stopImmediatePropagation();
        }, true);

        const analyticsTool = document.createElement('section');
        analyticsTool.id = 'workflow-analytics-tool';
        analyticsTool.className = 'context-tool';
        analyticsTool.innerHTML = `
            <p class="context-eyebrow">ANALISI DELLE ORE</p>
            <h2>${icon('sliders-horizontal')} Imposta la vista</h2>
            <p class="context-description">Scegli il lavoro da confrontare.</p>
            <label for="context-period">Periodo</label>
            <select id="context-period"><option value="week">Questa settimana</option><option value="month" selected>Questo mese</option><option value="custom">Periodo personalizzato</option></select>
            <div id="context-custom-period" hidden>
                <label for="context-date-from">Dal</label><input type="date" id="context-date-from" aria-describedby="context-date-error">
                <label for="context-date-to">Al</label><input type="date" id="context-date-to" aria-describedby="context-date-error">
                <p id="context-date-error" class="context-date-error" role="status" hidden></p>
            </div>
            <label for="context-project">Commessa</label><select id="context-project"></select>
            <label for="context-member">Membro del team</label><select id="context-member"></select>
            <p class="context-scope-note">I filtri riguardano le ore e i relativi costi. Il quadro economico sotto mostra l’intera durata delle commesse.</p>
            <button type="button" id="context-report" class="context-secondary">${icon('file-text')} Report studio</button>`;
        left.append(analyticsTool);
        const registerFilters = document.createElement('div');
        registerFilters.id = 'context-register-filters';
        registerFilters.innerHTML = `<label for="context-register-project">Commessa<select id="context-register-project"></select></label><label for="context-register-member" id="context-register-member-field">Membro del team<select id="context-register-member"></select></label>`;
        const registerHeading = document.querySelector('.workflow-log .activity-register-heading-row');
        registerHeading.insertBefore(registerFilters, registerHeading.querySelector('.activity-week-control'));
        ['context-register-project', 'context-register-member'].forEach(id => el(id).addEventListener('change', () => renderEntries()));
        const baseWeeklyEntries = getWeeklyEntries;
        getWeeklyEntries = function () {
            const rows = baseWeeklyEntries.apply(this, arguments);
            if (app.dataset.workflowView !== 'log') return rows;
            const project = el('context-register-project').value;
            const member = el('context-register-member').value;
            return rows.filter(row => (!project || String(row.project_id) === project) && (!member || row.user_email === member));
        };
        const baseRenderEntries = renderEntries;
        renderEntries = function () {
            const result = baseRenderEntries.apply(this, arguments);
            document.querySelectorAll('.workflow-log th').forEach(cell => {
                if (cell.textContent.trim() === 'Progetto') cell.textContent = 'Commessa';
            });
            const filtered = el('context-register-project').value || el('context-register-member').value;
            const empty = el('entries-empty-state');
            if (app.dataset.workflowView === 'log' && filtered && !empty.classList.contains('force-hide')) {
                empty.innerHTML = richEmptyStateHtml('list-filter', 'Nessuna registrazione con questi filtri', 'Cambia commessa o membro del team per questa settimana.', 'Azzera filtri', 'id="context-reset-register"');
                el('context-reset-register').addEventListener('click', () => {
                    el('context-register-project').value = '';
                    el('context-register-member').value = '';
                    renderEntries();
                });
                window.lucide?.createIcons();
            }
            return result;
        };
        const analysis = document.createElement('section');
        analysis.id = 'workflow-hours-analysis';
        analysis.innerHTML = `
            <div class="context-results-heading"><div><h2>Ore del periodo</h2><p id="context-analysis-scope"></p></div>${icon('calendar-range')}</div>
            <div class="context-hours-metrics"><div><span>Ore registrate</span><strong id="context-total-hours"></strong></div><div><span>Costo delle ore</span><strong id="context-total-cost"></strong></div><div><span>Registrazioni</span><strong id="context-total-entries"></strong></div></div>
            <div id="context-task-breakdown" aria-live="polite"></div>`;
        right.prepend(analysis);
        const localDateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const today = new Date();
        el('context-date-from').value = localDateValue(new Date(today.getFullYear(), today.getMonth(), 1));
        el('context-date-to').value = localDateValue(today);
        ['context-date-from', 'context-date-to'].forEach(id => el(id).addEventListener('change', renderHours));
        ['context-period', 'context-project', 'context-member'].forEach(id => el(id).addEventListener('change', renderHours));
        el('context-report').addEventListener('click', () => el('btn-header-pdf').click());

        const studioTool = document.createElement('section');
        studioTool.id = 'workflow-studio-tool';
        studioTool.className = 'context-tool';
        studioTool.innerHTML = `<p class="context-eyebrow">ORGANIZZA LO STUDIO</p><h2>${icon('building-2')} Studio</h2><p class="context-description">Identità, attività e persone.</p><div id="context-studio-tabs"></div><div id="context-studio-action"></div>`;
        left.append(studioTool);
        const staffTool = document.createElement('section');
        staffTool.id = 'workflow-profile-tool';
        staffTool.className = 'context-tool';
        staffTool.innerHTML = `<p class="context-eyebrow">IL TUO ACCOUNT</p><h2>${icon('user-round')} Profilo</h2><p class="context-description">Gestisci le informazioni personali e l’accesso.</p><button type="button" class="context-secondary">${icon('settings-2')} Impostazioni account</button>`;
        staffTool.querySelector('button').addEventListener('click', () => el('btn-open-account').click());
        left.append(staffTool);
        const staffProjectsTool = document.createElement('section');
        staffProjectsTool.id = 'workflow-staff-projects-tool';
        staffProjectsTool.className = 'context-tool';
        staffProjectsTool.innerHTML = `<p class="context-eyebrow">REGISTRA IL LAVORO</p><h2>${icon('clock-3')} Le tue attività</h2><p class="context-description">Consulta le commesse e riprendi il lavoro nella pagina Oggi.</p><button type="button" class="context-secondary">${icon('arrow-right')} Apri timer</button>`;
        staffProjectsTool.querySelector('button').addEventListener('click', () => document.querySelector('.workflow-nav-desktop [data-workflow-target="today"]').click());
        left.append(staffProjectsTool);
        [analyticsTool, studioTool, staffTool, staffProjectsTool].forEach(node => node.classList.add('context-side-panel'));

        const liveTimer = document.createElement('button');
        liveTimer.id = 'workflow-live-timer';
        liveTimer.type = 'button';
        liveTimer.innerHTML = `${icon('timer')}<span></span>${icon('square')}`;
        liveTimer.setAttribute('aria-label', 'Ferma e registra il timer in corso');
        el('btn-header-invite').before(liveTimer);
        liveTimer.addEventListener('click', () => el('btn-toggle-timer').click());
        const syncTimer = () => {
            const running = typeof timerRunning !== 'undefined' && timerRunning;
            const view = app.dataset.workflowView;
            liveTimer.hidden = !desktop.matches || !running || view === 'today';
            liveTimer.querySelector('span').textContent = el('timer-display').textContent;
            const selected = projects[el('project-select').value];
            liveTimer.title = `${selected?.name || 'Timer'} · Ferma e registra`;
        };
        new MutationObserver(syncTimer).observe(el('timer-display'), { childList: true, subtree: true });
        new MutationObserver(syncTimer).observe(el('btn-toggle-timer'), { attributes: true, attributeFilter: ['class'] });

        let manualInitialized = false;
        const baseOpenManual = openManualEntry;
        const baseCloseManual = closeManualEntry;
        openManualEntry = function () {
            if (manual.classList.contains('context-inline-manual')) {
                el('manual-hours').focus();
                return;
            }
            return baseOpenManual.apply(this, arguments);
        };
        closeManualEntry = function () {
            if (manual.classList.contains('context-inline-manual')) {
                ['manual-hours', 'manual-start', 'manual-end', 'manual-notes'].forEach(id => { el(id).value = ''; });
                return;
            }
            return baseCloseManual.apply(this, arguments);
        };
        manual.addEventListener('click', event => {
            if (event.target === manual && manual.classList.contains('context-inline-manual')) event.stopImmediatePropagation();
        }, true);
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !manual.classList.contains('context-inline-manual')) return;
            const otherModal = [...document.querySelectorAll('.modal:not(.force-hide)')].some(node => node.id !== 'modal-manual');
            if (!otherModal) event.stopImmediatePropagation();
        }, true);

        const baseSwitchStudioTab = switchStudioManagementTab;
        switchStudioManagementTab = function () {
            const result = baseSwitchStudioTab.apply(this, arguments);
            renderStudioAction();
            return result;
        };

        function renderStudioAction() {
            el('context-studio-action').replaceChildren();
        }

        function updateOptions() {
            for (const [id, rows, title] of [
                ['context-project', projects.map(p => [p.id, p.name]), 'Tutte le commesse'],
                ['context-member', profiles.filter(p => p.role !== 'inactive').map(p => [p.email, p.full_name]), 'Tutto il team'],
                ['context-register-project', projects.map(p => [p.id, p.name]), 'Tutte le commesse'],
                ['context-register-member', profiles.map(p => [p.email, p.full_name]), 'Tutto il team']
            ]) {
                const select = el(id);
                const selected = select.value;
                select.replaceChildren(new Option(title, ''));
                rows.forEach(([value, label]) => select.add(new Option(label, value)));
                if ([...select.options].some(option => option.value === selected)) select.value = selected;
            }
        }

        function renderHours() {
            const period = el('context-period').value;
            const projectId = el('context-project').value;
            const member = el('context-member').value;
            let start = new Date();
            start.setHours(0, 0, 0, 0);
            if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            if (period === 'month') start.setDate(1);
            let end = new Date();
            end.setHours(23, 59, 59, 999);
            const custom = period === 'custom';
            el('context-custom-period').hidden = !custom;
            let dateError = '';
            if (custom) {
                const from = el('context-date-from').value;
                const to = el('context-date-to').value;
                if (!from || !to) dateError = 'Scegli entrambe le date.';
                else if (from > to) dateError = 'La data finale deve essere uguale o successiva a quella iniziale.';
                start = new Date(`${from}T00:00:00`);
                end = new Date(`${to}T23:59:59.999`);
            }
            el('context-date-error').hidden = !dateError;
            el('context-date-error').textContent = dateError;
            ['context-date-from', 'context-date-to'].forEach(id => el(id).setAttribute('aria-invalid', String(Boolean(dateError))));
            if (dateError) {
                ['context-total-hours', 'context-total-cost', 'context-total-entries'].forEach(id => el(id).textContent = '—');
                el('context-analysis-scope').textContent = 'Periodo personalizzato da completare';
                el('context-task-breakdown').textContent = 'Imposta un intervallo valido per vedere i risultati.';
                return;
            }
            const rows = entries.filter(row => (!projectId || String(row.project_id) === projectId)
                && (!member || row.user_email === member)
                && new Date(row.created_at) >= start && new Date(row.created_at) <= end);
            const hours = rows.reduce((sum, row) => sum + Number(row.duration || 0), 0);
            const cost = rows.reduce((sum, row) => sum + Number(row.rate || 0), 0);
            el('context-total-hours').textContent = `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(hours)} h`;
            el('context-total-cost').textContent = formatMoney(cost);
            el('context-total-entries').textContent = String(rows.length);
            const dateFormat = new Intl.DateTimeFormat('it-IT');
            el('context-analysis-scope').textContent = [custom ? `${dateFormat.format(start)} – ${dateFormat.format(end)}` : el('context-period').selectedOptions[0]?.textContent, ...['context-project', 'context-member'].map(id => el(id).selectedOptions[0]?.textContent)].join(' · ');
            const tasks = new Map();
            rows.forEach(row => tasks.set(row.task || 'Generico', (tasks.get(row.task || 'Generico') || 0) + Number(row.duration || 0)));
            const list = el('context-task-breakdown');
            list.replaceChildren();
            if (!rows.length) list.textContent = 'Nessuna ora registrata con questi filtri.';
            [...tasks].sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([name, amount]) => {
                const row = document.createElement('div');
                row.className = 'context-task-row';
                const title = document.createElement('span');
                title.textContent = name;
                const track = document.createElement('div');
                track.className = 'context-task-track';
                const bar = document.createElement('i');
                bar.style.width = `${hours ? amount / hours * 100 : 0}%`;
                track.append(bar);
                const value = document.createElement('strong');
                value.textContent = `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(amount)} h`;
                row.append(title, track, value);
                list.append(row);
            });
        }

        function syncLayout() {
            const view = app.dataset.workflowView;
            const staff = document.body.classList.contains('workflow-staff');
            const wide = desktop.matches;
            updateOptions();
            renderProjectHighlights();
            registerFilters.hidden = view !== 'log';
            el('context-register-member-field').hidden = staff;
            if (staff) el('context-register-member').value = '';
            renderEntries();
            document.body.classList.toggle('context-desktop', wide);
            [analyticsTool, studioTool, staffTool, staffProjectsTool, analysis].forEach(node => { node.hidden = true; });
            if (wide) {
                right.append(projectSection, studio, profile);
                timer.hidden = view !== 'today';
                analyticsTool.hidden = view !== 'analytics' || staff;
                analysis.hidden = view !== 'analytics' || staff;
                studioTool.hidden = view !== 'studio' || staff;
                staffTool.hidden = view !== 'studio' || !staff;
                staffProjectsTool.hidden = view !== 'projects' || !staff;
                el('context-studio-tabs').append(tabs);
                tabs.classList.add('context-vertical-tabs');
            } else {
                [projectSection, studio, profile, tabs].forEach(restore);
                if (view === 'today') right.append(projectSection);
                tabs.classList.remove('context-vertical-tabs');
                timer.hidden = false;
            }
            const inlineQuick = wide && view === 'projects' && !staff;
            document.body.classList.toggle('context-project-create', inlineQuick);
            quickStatus.hidden = !inlineQuick || !quickStatus.textContent;
            if (inlineQuick) {
                left.append(quick);
                // Keeping force-hide prevents the legacy Escape handler from treating
                // this persistent panel as a modal. Desktop CSS makes it visible.
                quick.classList.add('context-inline-quick', 'force-hide');
                quick.classList.remove('modal');
                quickHeading.innerHTML = `${icon('folder-plus')} Commessa rapida`;
                quickDescription.textContent = 'Nome e prima attività per iniziare.';
                quickSubmitLabel.textContent = 'Crea commessa rapida';
                chooserHeading.innerHTML = `${icon('folder-plus')} Nuova commessa`;
                chooserDescription.textContent = 'Configura attività, budget e piano dei pagamenti.';
                projectButtonLabel.textContent = 'Nuova commessa';
            } else {
                if (quick.classList.contains('context-inline-quick')) {
                    restore(quick);
                    quick.classList.remove('context-inline-quick');
                    quick.classList.add('modal', 'force-hide');
                }
                quickHeading.innerHTML = originalQuickCopy[0];
                quickDescription.textContent = originalQuickCopy[1];
                quickSubmitLabel.textContent = originalQuickCopy[2];
                chooserHeading.innerHTML = originalChooserCopy[0];
                chooserDescription.textContent = originalChooserCopy[1];
                projectButtonLabel.textContent = originalProjectButtonLabel;
            }
            const inlineManual = wide && view === 'log';
            if (inlineManual) {
                left.append(manual);
                manual.classList.add('context-inline-manual');
                manual.classList.remove('modal', 'force-hide');
                if (!manualInitialized) {
                    const focused = document.activeElement;
                    baseOpenManual();
                    manualInitialized = true;
                    focused?.focus?.({ preventScroll: true });
                }
            } else if (manual.classList.contains('context-inline-manual')) {
                restore(manual);
                manual.classList.remove('context-inline-manual');
                manual.classList.add('modal', 'force-hide');
            }
            if (wide && view === 'analytics' && !staff) {
                const financeHeading = document.querySelector('.workflow-finance .analytics-section-heading');
                financeHeading.querySelector('h2').textContent = 'Quadro economico complessivo';
                renderHours();
            }
            const financeCopy = document.querySelector('.workflow-finance .analytics-section-heading p');
            financeCopy.textContent = view === 'today' ? 'Un riepilogo dei lavori attivi. I dettagli sono in Analisi.' : 'Margini, redditività e segnali operativi dei lavori dello studio.';
            renderStudioAction();
            syncTimer();
            window.lucide?.createIcons();
        }
        new MutationObserver(syncLayout).observe(app, { attributes: true, attributeFilter: ['data-workflow-view'] });
        new MutationObserver(syncLayout).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        desktop.addEventListener('change', syncLayout);
        window.addEventListener('archtime:entry-created', () => {
            if (desktop.matches && app.dataset.workflowView === 'analytics') renderHours();
        });
        syncLayout();
        window.__ARCHTIME_CONTEXT_READY__ = true; window.dispatchEvent(new Event('archtime:next-context-ready'));
    }
    const wait = setInterval(() => {
        if (!window.__ARCHTIME_WORKFLOW_READY__) return;
        clearInterval(wait);
        install();
    }, 40);
})();
