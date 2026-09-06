// Local-only economic-flow prototype. Extends the real app without replacing its UI.
(function () {
    if (new URLSearchParams(window.location.search).get('prototypeFlow') !== '1') return;

    const metaByProject = new Map();
    const prototypeClients = [
        { id: 'client-maria-rossi', name: 'Maria Rossi', address: 'Via delle Ginestre 14, 60129 Ancona (AN)', taxCode: 'RSSMRA80A41A271X', vatNumber: '', email: 'maria.rossi@example.it', phone: '+39 071 0000000' },
        { id: 'client-salute-srl', name: 'Salute Srl', address: 'Via Flaminia 118, 60126 Ancona (AN)', taxCode: '01234570421', vatNumber: 'IT01234570421', email: 'amministrazione@salute.example', phone: '+39 071 0000001' }
    ];
    let modalPayments = [];
    let modalProjectId = '';
    let clientModalOrigin = 'library';
    let modalTaskNotes = {};
    let modalTaskTranches = {};
    let skipBillingForCurrentSave = false;
    let excelTaskNotesContext = null;
    let cashAnalyticsFilter = 'all';
    let cashAnalyticsExpanded = false;
    let billingAlertsExpanded = false;
    const excelTaskNoteRows = new Map();
    const paymentPresets = {
        standard: [{ label: 'Acconto', percent: 30, status: 'pending' }, { label: 'Consegna intermedia', percent: 30, status: 'pending' }, { label: 'Saldo', percent: 40, status: 'pending' }],
        split: [{ label: 'Acconto', percent: 50, status: 'pending' }, { label: 'Saldo', percent: 50, status: 'pending' }],
        site: [{ label: 'Avvio incarico', percent: 20, status: 'pending' }, { label: 'Consegna intermedia', percent: 30, status: 'pending' }, { label: 'Avanzamento', percent: 30, status: 'pending' }, { label: 'Saldo', percent: 20, status: 'pending' }]
    };
    let paymentSequence = 0;
    const newPaymentId = () => `tranche-${Date.now()}-${++paymentSequence}`;
    const clonePayments = rows => rows.map(row => ({ ...row, id: row.id || newPaymentId() }));
    const currency = value => typeof formatMoney === 'function' ? formatMoney(Number(value || 0), 0) : `${Number(value || 0).toLocaleString('it-IT')} EUR`;

    function seedProjectMeta() {
        const first = projects?.[0];
        const second = projects?.[1];
        if (first && !metaByProject.has(first.id)) metaByProject.set(first.id, {
            address: 'Via del Conero 18, Ancona',
            description: 'Ristrutturazione completa, pratica edilizia, progetto esecutivo e direzione lavori.',
            payments: [{ id: 'villa-acconto', label: 'Acconto', percent: 30, status: 'collected', collectedAt: '2026-08-20T10:00:00' }, { id: 'villa-consegna', label: 'Consegna intermedia', percent: 30, status: 'pending' }, { id: 'villa-saldo', label: 'Saldo', percent: 40, status: 'pending' }],
            taskNotes: { 'Progetto definitivo': 'Tavole definitive, relazione tecnica e aggiornamento degli elaborati concordati.' },
            taskTranches: { 'Sopralluogo': 'villa-consegna', 'Riunioni': 'villa-saldo', 'Progetto definitivo': 'villa-saldo', 'Direzione lavori': 'villa-saldo' }
        });
        if (second && !metaByProject.has(second.id)) metaByProject.set(second.id, {
            address: 'Via Flaminia 122, Ancona',
            description: 'Riorganizzazione degli spazi, progetto definitivo e assistenza alla realizzazione.',
            payments: [{ id: 'medico-avvio', label: 'Avvio incarico', percent: 20, status: 'collected', collectedAt: '2026-08-10T10:00:00' }, { id: 'medico-consegna', label: 'Consegna intermedia', percent: 30, status: 'invoiced' }, { id: 'medico-avanzamento', label: 'Avanzamento', percent: 30, status: 'pending' }, { id: 'medico-saldo', label: 'Saldo', percent: 20, status: 'pending' }],
            taskNotes: {},
            taskTranches: { 'Sopralluogo': 'medico-consegna', 'Progetto preliminare': 'medico-consegna', 'Progetto definitivo': 'medico-avanzamento', 'Direzione lavori': 'medico-saldo' }
        });
    }

    function projectMeta(project) {
        if (!metaByProject.has(project.id)) metaByProject.set(project.id, { address: '', description: '', payments: clonePayments(paymentPresets.standard), taskNotes: {}, taskTranches: {} });
        const meta = metaByProject.get(project.id);
        meta.payments = clonePayments(meta.payments || paymentPresets.standard);
        meta.taskNotes ||= {};
        meta.taskTranches ||= {};
        return meta;
    }

    function clientForProject(project) {
        const name = String(project?.client || '').trim().toLocaleLowerCase('it-IT');
        return prototypeClients.find(client => client.name.toLocaleLowerCase('it-IT') === name) || null;
    }

    function clientOptions(selectedValue = '') {
        const known = new Set(prototypeClients.map(client => client.name));
        const legacyNames = (projects || []).map(project => String(project.client || '').trim()).filter(name => name && !known.has(name));
        return '<option value="">Nessun cliente selezionato</option>'
            + prototypeClients.map(client => `<option value="${escapeAttr(client.name)}" ${client.name === selectedValue ? 'selected' : ''}>${escapeHtml(client.name)}</option>`).join('')
            + legacyNames.map(name => `<option value="${escapeAttr(name)}" ${name === selectedValue ? 'selected' : ''}>${escapeHtml(name)} · da completare</option>`).join('');
    }

    function renderClientSelect(selectedValue) {
        const select = document.getElementById('edit-modal-client');
        if (!select) return;
        const selected = selectedValue ?? select.value;
        select.innerHTML = clientOptions(selected);
        select.value = selected;
    }

    function renderClientLibrary() {
        const list = document.getElementById('prototype-client-list');
        const count = document.getElementById('prototype-client-count');
        if (count) count.textContent = `${prototypeClients.length} ${prototypeClients.length === 1 ? 'cliente' : 'clienti'}`;
        if (!list) return;
        list.innerHTML = prototypeClients.length ? prototypeClients.map(client => {
            const fiscal = [client.taxCode ? `C.F. ${client.taxCode}` : '', client.vatNumber ? `P. IVA ${client.vatNumber}` : ''].filter(Boolean).join(' · ');
            return `<article class="prototype-client-row" data-client-id="${escapeAttr(client.id)}"><div><strong>${escapeHtml(client.name)}</strong><p>${escapeHtml(client.address || 'Indirizzo da completare')}</p>${fiscal ? `<p>${escapeHtml(fiscal)}</p>` : ''}</div><div class="prototype-client-actions"><button type="button" data-prototype-edit-client="${escapeAttr(client.id)}" title="Modifica cliente" aria-label="Modifica ${escapeAttr(client.name)}"><i data-lucide="pencil"></i></button><button type="button" data-prototype-delete-client="${escapeAttr(client.id)}" title="Elimina cliente" aria-label="Elimina ${escapeAttr(client.name)}"><i data-lucide="trash-2"></i></button></div></article>`;
        }).join('') : '<p class="text-xs text-slate-500 py-8 text-center">Nessun cliente nella libreria.</p>';
        lucide.createIcons();
    }

    function renderPrototypeActivityLibraries() {
        const activityList = document.getElementById('prototype-activity-list');
        const templateList = document.getElementById('prototype-template-list');
        const activityCount = document.getElementById('prototype-activity-count');
        const templateCount = document.getElementById('prototype-template-count');
        const activityTitle = document.getElementById('lbl-catalog-title');
        const activityDescription = document.getElementById('lbl-catalog-desc');
        if (activityTitle) activityTitle.textContent = 'Libreria attività';
        if (activityDescription) activityDescription.textContent = 'Attività riutilizzabili nei progetti e nel timer.';
        if (activityCount) activityCount.textContent = `${activityCatalog.length} attività`;
        if (templateCount) templateCount.textContent = `${projectTemplates.length} template`;
        if (activityList) {
            activityList.innerHTML = activityCatalog.length ? activityCatalog.map(task => `
                <article class="prototype-library-row">
                    <div><strong>${escapeHtml(task)}</strong><p>Disponibile nei progetti e nel timer</p></div>
                    <button type="button" data-prototype-edit-activity="${escapeAttr(task)}" title="Modifica attività" aria-label="Modifica ${escapeAttr(task)}"><i data-lucide="pencil"></i></button>
                </article>`).join('') : '<p class="prototype-library-empty">Nessuna attività configurata.</p>';
        }
        if (templateList) {
            templateList.innerHTML = projectTemplates.length ? projectTemplates.map((template, index) => `
                <article class="prototype-library-row">
                    <div><strong>${escapeHtml(template.name)}</strong><p>${escapeHtml((template.tasks || []).join(' · ') || 'Nessuna attività')}</p></div>
                    <button type="button" data-prototype-edit-template="${index}" title="Modifica template" aria-label="Modifica ${escapeAttr(template.name)}"><i data-lucide="pencil"></i></button>
                </article>`).join('') : '<p class="prototype-library-empty">Nessun template configurato.</p>';
        }
        lucide.createIcons();
    }

    function resetClientForm() {
        ['prototype-client-id', 'prototype-client-name', 'prototype-client-address', 'prototype-client-tax-code', 'prototype-client-vat', 'prototype-client-email', 'prototype-client-phone'].forEach(id => { const field = document.getElementById(id); if (field) field.value = ''; });
        const title = document.getElementById('prototype-client-form-title');
        if (title) title.textContent = 'Nuovo cliente';
    }

    function openPrototypeClientModal(origin = 'library') {
        clientModalOrigin = origin;
        resetClientForm();
        document.getElementById('modal-prototype-client')?.classList.remove('force-hide');
        setTimeout(() => document.getElementById('prototype-client-name')?.focus(), 30);
        lucide.createIcons();
    }

    function closePrototypeClientModal() {
        document.getElementById('modal-prototype-client')?.classList.add('force-hide');
        resetClientForm();
    }

    function editPrototypeClient(id) {
        const client = prototypeClients.find(item => item.id === id);
        if (!client) return;
        clientModalOrigin = 'library';
        document.getElementById('prototype-client-id').value = client.id;
        document.getElementById('prototype-client-name').value = client.name;
        document.getElementById('prototype-client-address').value = client.address || '';
        document.getElementById('prototype-client-tax-code').value = client.taxCode || '';
        document.getElementById('prototype-client-vat').value = client.vatNumber || '';
        document.getElementById('prototype-client-email').value = client.email || '';
        document.getElementById('prototype-client-phone').value = client.phone || '';
        document.getElementById('prototype-client-form-title').textContent = 'Modifica cliente';
        document.getElementById('modal-prototype-client')?.classList.remove('force-hide');
        lucide.createIcons();
    }

    function savePrototypeClient(event) {
        event.preventDefault();
        const id = document.getElementById('prototype-client-id').value;
        const name = document.getElementById('prototype-client-name').value.trim();
        if (!name) {
            document.getElementById('prototype-client-name')?.focus();
            return;
        }
        const existing = prototypeClients.find(item => item.id === id);
        const previousName = existing?.name || '';
        const record = {
            id: id || `client-${Date.now()}`,
            name,
            address: document.getElementById('prototype-client-address').value.trim(),
            taxCode: document.getElementById('prototype-client-tax-code').value.trim(),
            vatNumber: document.getElementById('prototype-client-vat').value.trim(),
            email: document.getElementById('prototype-client-email').value.trim(),
            phone: document.getElementById('prototype-client-phone').value.trim()
        };
        if (existing) Object.assign(existing, record); else prototypeClients.push(record);
        if (previousName && previousName !== name) projects.filter(project => project.client === previousName).forEach(project => { project.client = name; });
        const selectNewClient = clientModalOrigin === 'project';
        closePrototypeClientModal();
        renderClientSelect(selectNewClient ? name : undefined);
        renderClientLibrary();
        renderProjects();
    }

    const baseSwitchStudioManagementTab = switchStudioManagementTab;
    switchStudioManagementTab = function (tabName) {
        if (tabName !== 'clients') {
            const result = baseSwitchStudioManagementTab(tabName);
            if (tabName === 'activities') renderPrototypeActivityLibraries();
            return result;
        }
        document.querySelectorAll('[data-management-tab]').forEach(button => button.setAttribute('aria-selected', button.dataset.managementTab === 'clients' ? 'true' : 'false'));
        document.querySelectorAll('[data-management-panel]').forEach(panel => panel.classList.toggle('force-hide', panel.dataset.managementPanel !== 'clients'));
        document.querySelector('.studio-management-body')?.scrollTo({ top: 0, behavior: 'auto' });
        renderClientLibrary();
        lucide.createIcons();
    };

    function paymentTotals(project) {
        const meta = projectMeta(project);
        const budget = Number(project.budget || 0);
        const amountFor = row => budget * Number(row.percent || 0) / 100;
        const invoiced = meta.payments.filter(row => row.status !== 'pending').reduce((sum, row) => sum + amountFor(row), 0);
        const collected = meta.payments.filter(row => row.status === 'collected').reduce((sum, row) => sum + amountFor(row), 0);
        return { budget, invoiced, collected, collectedPercent: budget > 0 ? Math.min(100, collected / budget * 100) : 0 };
    }

    function hasPaymentPlan(project) {
        return projectMeta(project).payments.length > 0;
    }

    function ensurePrototypeBadge() {
        document.body.classList.add('flow-prototype-v2');
        if (document.querySelector('.flow-demo-chip')) return;
        const headerInner = document.querySelector('#app-container > header > div');
        if (!headerInner) return;
        const badge = document.createElement('span');
        badge.className = 'flow-demo-chip';
        badge.textContent = 'Prototipo locale';
        headerInner.insertBefore(badge, headerInner.lastElementChild);
    }

    function cashBarHtml(project, compact = false) {
        const totals = paymentTotals(project);
        return `<div class="prototype-cash-progress ${compact ? 'is-compact' : ''}">
            <div class="prototype-cash-heading"><span>Incassato</span><strong>${currency(totals.collected)} <small>su ${currency(totals.budget)}</small></strong></div>
            <div class="prototype-cash-track"><span style="width:${totals.collectedPercent}%"></span></div>
            <div class="prototype-cash-foot"><span>${Math.round(totals.collectedPercent)}% del compenso</span><span>${currency(Math.max(0, totals.budget - totals.collected))} non incassato</span></div>
        </div>`;
    }

    function decorateProjectCards() {
        seedProjectMeta();
        document.querySelectorAll('#projects-list [data-ui-action="show-project-detail"]').forEach(card => {
            const project = projects.find(item => String(item.id) === String(card.dataset.projectId));
            if (!project) return;
            if (card.classList.contains('project-list-row')) return;
            card.classList.add('prototype-project-card');
            if (hasPaymentPlan(project) && !card.querySelector('.prototype-cash-progress')) card.insertAdjacentHTML('beforeend', cashBarHtml(project, true));
        });
        lucide?.createIcons?.();
    }

    function injectIdentityFields(meta) {
        const identity = document.getElementById('project-modal-identity');
        if (!identity || identity.querySelector('#prototype-project-address')) return;
        const budget = document.getElementById('project-budget-control');
        const fields = document.createElement('div');
        fields.className = 'prototype-project-context';
        fields.innerHTML = `<div><label for="prototype-project-address">Indirizzo opera o cantiere</label><input id="prototype-project-address" type="text" placeholder="Via e località" value="${escapeAttr(meta.address || '')}"></div>
            <div><label for="prototype-project-description">Oggetto dell'incarico</label><textarea id="prototype-project-description" rows="3" placeholder="Descrivi in modo sintetico le prestazioni concordate">${escapeHtml(meta.description || '')}</textarea></div>`;
        identity.insertBefore(fields, budget || null);
    }

    function selectedPreset() {
        if (modalPayments.length === 2 && modalPayments[0]?.percent === 50) return 'split';
        if (modalPayments.length === 4 && modalPayments[0]?.percent === 20) return 'site';
        if (modalPayments.length === 3 && modalPayments[0]?.percent === 30 && modalPayments[2]?.percent === 40) return 'standard';
        return 'custom';
    }

    function injectPaymentPlanner() {
        const workflow = document.getElementById('project-modal-workflow');
        if (!workflow) return;
        const source = document.getElementById('edit-proj-selected-tasks')?.parentElement;
        source?.classList.remove('prototype-hidden-source');
        let planner = document.getElementById('prototype-payment-planner');
        if (planner) {
            if (planner.parentElement !== workflow) workflow.appendChild(planner);
            return;
        }
        workflow.insertAdjacentHTML('beforeend', `<section id="prototype-payment-planner" class="prototype-payment-planner prototype-tranche-planner">
            <div class="prototype-planner-heading"><div><strong>Tranche, attività e fatturazione</strong><small>Le percentuali determinano gli importi; le attività determinano quando fatturare.</small></div><select id="prototype-payment-preset" aria-label="Schema del piano pagamenti"><option value="standard">30 / 30 / 40</option><option value="split">50 / 50</option><option value="site">20 / 30 / 30 / 20</option><option value="custom">Personalizzato</option></select></div>
            <div id="prototype-payment-rows" class="prototype-tranche-list"></div><div class="prototype-planner-footer"><button id="prototype-add-payment" type="button"><i data-lucide="plus"></i>Aggiungi tranche</button><span id="prototype-payment-total"></span></div>
        </section>`);
        document.getElementById('prototype-payment-preset').value = selectedPreset();
        renderPaymentPlanner();
    }

    function modalBudget() {
        if (typeof isNormativeProjectMode === 'function' && isNormativeProjectMode()) {
            try { return Number(getNormativeCalculation()?.total || 0); } catch (_) { return 0; }
        }
        return Number(document.getElementById('edit-modal-budget')?.value || 0);
    }

    function renderPaymentPlanner() {
        const container = document.getElementById('prototype-payment-rows');
        if (!container) return;
        const budget = modalBudget();
        const tasks = currentModalTasks();
        const budgets = currentModalBudgets();
        const isNormative = typeof isNormativeProjectMode === 'function' && isNormativeProjectMode();
        container.innerHTML = modalPayments.map((row, index) => {
            const assigned = tasks.filter(task => modalTaskTranches[task] === row.id);
            const candidates = tasks.filter(task => !modalTaskTranches[task]);
            return `<article class="prototype-tranche-card" data-payment-index="${index}" data-payment-id="${escapeAttr(row.id)}">
                <div class="prototype-tranche-head">
                    <span class="prototype-tranche-number">${index + 1}</span>
                    <input class="prototype-payment-name" value="${escapeAttr(row.label)}" aria-label="Nome tranche ${index + 1}">
                    <label class="prototype-tranche-percent"><input class="prototype-payment-percent" type="number" min="0" max="100" step="1" value="${Number(row.percent || 0)}" aria-label="Percentuale tranche ${index + 1}"><b>%</b></label>
                    <strong>${currency(budget * Number(row.percent || 0) / 100)}</strong>
                    <button class="prototype-remove-payment" type="button" aria-label="Rimuovi tranche" ${modalPayments.length <= 1 ? 'disabled' : ''}><i data-lucide="x"></i></button>
                </div>
                <div class="prototype-tranche-tasks">
                    ${assigned.length ? assigned.map(task => trancheTaskHtml(task, budgets, isNormative)).join('') : '<div class="prototype-tranche-empty"><i data-lucide="list-plus"></i><span>Nessuna attività associata.</span></div>'}
                </div>
                <div class="prototype-tranche-add">
                    <button type="button" data-prototype-open-task-picker="${escapeAttr(row.id)}"><i data-lucide="plus"></i>Aggiungi attività</button>
                    <select class="force-hide" data-prototype-task-picker="${escapeAttr(row.id)}" aria-label="Aggiungi attività a ${escapeAttr(row.label)}">
                        <option value="" selected>Seleziona tra le attività del progetto</option>
                        ${candidates.map(task => `<option value="${escapeAttr(task)}">${escapeHtml(task)}</option>`).join('')}
                    </select>
                </div>
            </article>`;
        }).join('') + unassignedTasksHtml(tasks, budgets, isNormative);
        const total = modalPayments.reduce((sum, row) => sum + Number(row.percent || 0), 0);
        const totalEl = document.getElementById('prototype-payment-total');
        totalEl.className = total === 100 ? 'is-valid' : 'is-invalid';
        totalEl.textContent = total === 100 ? 'Totale 100%' : `Totale ${total}% · deve essere 100%`;
        document.getElementById('prototype-add-payment')?.classList.toggle('force-hide', document.getElementById('prototype-payment-preset')?.value !== 'custom');
        lucide?.createIcons?.();
    }

    function currentModalTasks() {
        const editing = Boolean(document.getElementById('edit-modal-proj-id')?.value);
        return [...(editing ? editProjectTasks : newProjectTasks)];
    }

    function currentModalBudgets() {
        try { return { ...getCurrentProjectModalBudgets() }; }
        catch (_) { return {}; }
    }

    function trancheTaskHtml(task, budgets, isNormative) {
        const value = Number(budgets?.[task] || 0);
        return `<div class="prototype-tranche-task" data-prototype-tranche-task="${escapeAttr(task)}">
            <div class="prototype-tranche-task-main">
                <span class="prototype-tranche-task-icon"><i data-lucide="${isNormative ? 'landmark' : 'grip-vertical'}"></i></span>
                <strong>${escapeHtml(task)}</strong>
                ${isNormative ? `<span class="prototype-task-value is-locked">${currency(value)}</span>` : `<label class="prototype-task-value"><small>Valore nel piano</small><input type="number" min="0" step="1" value="${value || ''}" data-prototype-task-budget="${escapeAttr(task)}" placeholder="0"><b>${getStudioCurrency().symbol}</b></label>`}
                <button type="button" data-prototype-unassign-task="${escapeAttr(task)}" aria-label="Rimuovi ${escapeAttr(task)} dalla tranche"><i data-lucide="x"></i></button>
            </div>
        </div>`;
    }

    function decorateSourceTaskNotes() {
        const container = document.getElementById('edit-proj-selected-tasks');
        if (!container) return;
        const tasks = currentModalTasks();
        [...container.querySelectorAll('.project-task-row')].forEach((row, index) => {
            const task = tasks[index];
            const identity = row.querySelector('.min-w-0');
            if (!task || !identity || identity.querySelector('[data-prototype-task-note]')) return;
            const status = [...identity.children].find(child => child.matches('span') && /Pesa sul ritmo|Fuori piano/i.test(child.textContent || ''));
            status?.remove();
            identity.insertAdjacentHTML('beforeend', `<input type="text" class="prototype-inline-task-note" data-prototype-task-note="${escapeAttr(task)}" value="${escapeAttr(modalTaskNotes[task] || '')}" placeholder="Es. Elaborati, consegne o prestazioni comprese">`);
        });
    }

    function unassignedTasksHtml(tasks, budgets, isNormative) {
        const unassigned = tasks.filter(task => !modalTaskTranches[task]);
        if (!unassigned.length) return '';
        return `<aside class="prototype-unassigned"><div><strong>Attività da assegnare</strong><span>${unassigned.length}</span></div><p>Inseriscile in una tranche per attivare l’avviso automatico di fatturazione.</p><div>${unassigned.map(task => `<span>${escapeHtml(task)}${Number(budgets?.[task] || 0) > 0 ? ` · ${currency(budgets[task])}` : ''}${isNormative ? ' · macrofase normativa' : ''}</span>`).join('')}</div></aside>`;
    }

    function setupProjectModal(projectId = '') {
        modalProjectId = projectId;
        const project = projects.find(item => String(item.id) === String(projectId));
        const meta = project ? projectMeta(project) : { address: '', description: '', payments: clonePayments(paymentPresets.standard), taskNotes: {}, taskTranches: {} };
        modalPayments = clonePayments(meta.payments || paymentPresets.standard);
        modalTaskNotes = { ...(meta.taskNotes || {}) };
        modalTaskTranches = { ...(meta.taskTranches || {}) };
        injectIdentityFields(meta);
        injectPaymentPlanner();
        const address = document.getElementById('prototype-project-address');
        const description = document.getElementById('prototype-project-description');
        const preset = document.getElementById('prototype-payment-preset');
        if (address) address.value = meta.address || '';
        if (description) description.value = meta.description || '';
        if (preset) preset.value = selectedPreset();
        if (!project && !(typeof isNormativeProjectMode === 'function' && isNormativeProjectMode())) {
            const template = document.getElementById('new-proj-template');
            if (template && !template.disabled && projectTemplates.length > 0) { template.value = '0'; applyTemplateToNewProject(); }
            setProjectBudgetMode('auto');
        }
        renderPaymentPlanner();
        decorateSourceTaskNotes();
        setPrototypeModalStep('details');
    }

    function setPrototypeModalStep(step) {
        const modal = document.getElementById('modal-edit-project');
        const title = document.getElementById('project-modal-title');
        const description = document.getElementById('project-modal-desc');
        const save = document.getElementById('btn-save-project-edit');
        if (!modal || !save) return;
        const billing = step === 'billing';
        modal.dataset.prototypeStep = billing ? 'billing' : 'details';
        modal.classList.toggle('prototype-billing-step', billing);
        if (title) title.innerHTML = billing ? '<i data-lucide="milestone" class="text-primary-500 w-5 h-5"></i> Piano di fatturazione' : `<i data-lucide="folder-plus" class="text-primary-500 w-5 h-5"></i> ${modalProjectId ? 'Modifica progetto' : 'Nuovo progetto'}`;
        if (description) description.textContent = billing
            ? 'Distribuisci le attività definite nel progetto nelle tranche concordate con il cliente.'
            : 'Imposta anagrafica, budget e attività del progetto. La fatturazione verrà configurata nel passaggio successivo.';
        const editingProject = modalProjectId ? projects.find(item => String(item.id) === String(modalProjectId)) : null;
        const editingHasPlan = editingProject ? hasPaymentPlan(editingProject) : false;
        save.textContent = billing
            ? (modalProjectId ? 'Salva modifiche' : 'Crea progetto')
            : (modalProjectId ? (editingHasPlan ? 'Modifica piano pagamenti' : 'Aggiungi piano pagamenti') : 'Continua con piano pagamenti');
        let skip = document.getElementById('prototype-save-without-payments');
        if (!skip) {
            skip = document.createElement('button');
            skip.id = 'prototype-save-without-payments';
            skip.type = 'button';
            skip.className = 'prototype-skip-billing';
            skip.textContent = 'Crea senza piano pagamenti';
            save.insertAdjacentElement('beforebegin', skip);
        }
        skip.classList.toggle('force-hide', billing || Boolean(modalProjectId));
        let back = document.getElementById('prototype-back-to-details');
        if (!back) {
            back = document.createElement('button');
            back.id = 'prototype-back-to-details';
            back.type = 'button';
            back.className = 'prototype-step-back';
            back.innerHTML = '<i data-lucide="arrow-left"></i>Torna al progetto';
            document.getElementById('prototype-payment-planner')?.insertAdjacentElement('afterbegin', back);
        }
        back.classList.toggle('force-hide', !billing);
        if (billing) renderPaymentPlanner();
        document.querySelector('#modal-edit-project > div')?.scrollTo({ top: 0, behavior: 'auto' });
        lucide?.createIcons?.();
    }

    async function validateProjectDetails() {
        const name = document.getElementById('edit-modal-name')?.value.trim();
        if (!name) { await appAlert('Dati progetto', 'Inserisci il nome del progetto prima di continuare.', 'danger'); return false; }
        if (currentModalTasks().length === 0) { await appAlert('Attività progetto', (typeof isNormativeProjectMode === 'function' && isNormativeProjectMode()) ? 'Seleziona almeno una prestazione parametrica.' : 'Inserisci almeno un’attività nel progetto.', 'danger'); return false; }
        if (projectBudgetMode === 'auto' && !(typeof isNormativeProjectMode === 'function' && isNormativeProjectMode())) {
            const budgets = collectCurrentProjectTaskBudgets();
            setCurrentProjectModalBudgets(budgets);
            fillProjectBudgetFromTaskBudgets(false);
            const total = currentModalTasks().reduce((sum, task) => sum + Number(budgets[task] || 0), 0);
            if (total <= 0) { await appAlert('Budget progetto', 'Inserisci almeno un importo nelle attività prima di continuare.', 'danger'); return false; }
        }
        if (typeof isNormativeProjectMode === 'function' && isNormativeProjectMode()) {
            const calculation = getNormativeCalculation();
            if (Number(calculation?.workValue || 0) <= 0) { await appAlert('Parametri dell’opera', 'Inserisci il valore dell’opera prima di continuare.', 'danger'); return false; }
        }
        return true;
    }

    async function continueToBillingStep() {
        if (!await validateProjectDetails()) return;
        if (modalPayments.length === 0) {
            modalPayments = clonePayments(paymentPresets.standard);
            modalTaskTranches = {};
            const preset = document.getElementById('prototype-payment-preset');
            if (preset) preset.value = 'standard';
        }
        setPrototypeModalStep('billing');
    }

    async function createProjectWithoutBilling() {
        if (!await validateProjectDetails()) return;
        skipBillingForCurrentSave = true;
        modalPayments = [];
        modalTaskTranches = {};
        try { await createNewProject(); }
        finally { skipBillingForCurrentSave = false; }
    }

    function readModalMeta() {
        return { address: document.getElementById('prototype-project-address')?.value.trim() || '', description: document.getElementById('prototype-project-description')?.value.trim() || '', payments: clonePayments(modalPayments), taskNotes: { ...modalTaskNotes }, taskTranches: { ...modalTaskTranches } };
    }
    function paymentPlanIsValid() { return modalPayments.length > 0 && modalPayments.reduce((sum, row) => sum + Number(row.percent || 0), 0) === 100; }
    function taskTranchePlanIsValid() {
        const validPaymentIds = new Set(modalPayments.map(payment => payment.id));
        return currentModalTasks().every(task => validPaymentIds.has(modalTaskTranches[task]));
    }

    function paymentMaturity(project, payment) {
        const meta = projectMeta(project);
        const statuses = typeof getProjectTaskStatuses === 'function' ? getProjectTaskStatuses(project) : (project.task_statuses || {});
        const tasks = (project.tasks || []).filter(task => meta.taskTranches?.[task] === payment.id);
        const completed = tasks.filter(task => statuses[task] === 'done').length;
        const ready = tasks.length > 0 && completed === tasks.length;
        if (payment.status === 'collected') return { label: 'Incassato', tone: 'collected', tasks, completed, ready: true };
        if (tasks.length === 0) return { label: 'Nessuna attività associata', tone: 'quiet', tasks, completed, ready: false };
        if (ready) return { label: 'Da fatturare', tone: 'ready', tasks, completed, ready: true };
        return { label: `In maturazione · ${completed}/${tasks.length}`, tone: 'progress', tasks, completed, ready: false };
    }

    function paymentStatusOptions(row) {
        return `<option value="pending" ${row.status !== 'collected' ? 'selected' : ''}>Non incassato</option><option value="collected" ${row.status === 'collected' ? 'selected' : ''}>Incassato</option>`;
    }

    function projectBillingAlertHtml(project) {
        const meta = projectMeta(project);
        const ready = meta.payments.map((payment, index) => ({ payment, index, maturity: paymentMaturity(project, payment) })).filter(item => item.payment.status !== 'collected' && item.maturity.ready);
        const collected = paymentTotals(project);
        let tone = 'quiet';
        let icon = 'clock-3';
        let title = 'Nessuna tranche da fatturare ora';
        let description = 'Le attività stanno facendo maturare le prossime tranche.';
        if (ready.length) {
            tone = 'action'; icon = 'file-plus-2'; title = ready.length === 1 ? 'Da fatturare' : `${ready.length} tranche da fatturare`;
            description = ready.map(item => item.payment.label).join(' · ');
        } else if (meta.payments.every(payment => payment.status === 'collected')) {
            tone = 'complete'; icon = 'circle-check-big'; title = 'Piano pagamenti completato'; description = 'Tutte le tranche risultano incassate.';
        }
        return `<section class="prototype-billing-alert is-${tone} admin-only"><span class="prototype-billing-alert-icon"><i data-lucide="${icon}"></i></span><div><small>Avviso fatturazione</small><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div><span class="prototype-billing-alert-value"><b>${Math.round(collected.collectedPercent)}%</b><small>incassato</small></span></section>`;
    }

    function decorateProjectTranches(project, content) {
        const meta = projectMeta(project);
        const panel = content.querySelector(project.project_setup_type === 'normative' ? '.normative-scope-panel' : '.project-rhythm-panel');
        const list = panel?.querySelector(project.project_setup_type === 'normative' ? '.normative-scope-list' : '.space-y-2');
        if (!panel || !list || list.dataset.prototypeGrouped === 'true') return;
        const taskRows = [...list.children];
        const rowByTask = new Map((project.tasks || []).map((task, index) => [task, taskRows[index]]).filter(([, row]) => row));
        list.innerHTML = '';
        list.dataset.prototypeGrouped = 'true';
        list.classList.add('prototype-tranche-workflow');
        meta.payments.forEach((payment, index) => {
            const maturity = paymentMaturity(project, payment);
            const section = document.createElement('section');
            section.className = `prototype-detail-tranche is-${maturity.tone}`;
            section.innerHTML = `<header><span class="prototype-detail-tranche-number">${index + 1}</span><div><strong>${escapeHtml(payment.label)}</strong><small>${Number(payment.percent || 0)}% · ${currency(Number(project.budget || 0) * Number(payment.percent || 0) / 100)}</small></div><span class="prototype-maturity is-${maturity.tone}">${escapeHtml(maturity.label)}</span><label><small>Stato</small><select data-prototype-payment-status="${index}" data-project-id="${escapeAttr(project.id)}" aria-label="Stato ${escapeAttr(payment.label)}">${paymentStatusOptions(payment)}</select></label></header><div class="prototype-detail-tranche-tasks"></div>`;
            const taskContainer = section.querySelector('.prototype-detail-tranche-tasks');
            const assigned = (project.tasks || []).filter(task => meta.taskTranches?.[task] === payment.id);
            assigned.forEach(task => { const row = rowByTask.get(task); if (row) taskContainer.appendChild(row); });
            if (!assigned.length) taskContainer.innerHTML = '<p class="prototype-detail-tranche-empty">Nessuna attività collegata a questa tranche.</p>';
            list.appendChild(section);
        });
        const unassigned = (project.tasks || []).filter(task => !meta.taskTranches?.[task] || !meta.payments.some(payment => payment.id === meta.taskTranches[task]));
        if (unassigned.length) {
            const section = document.createElement('section');
            section.className = 'prototype-detail-tranche is-unassigned';
            section.innerHTML = `<header><span class="prototype-detail-tranche-number"><i data-lucide="circle-help"></i></span><div><strong>Senza tranche</strong><small>${unassigned.length} ${unassigned.length === 1 ? 'attività da associare' : 'attività da associare'}</small></div></header><div class="prototype-detail-tranche-tasks"></div>`;
            const taskContainer = section.querySelector('.prototype-detail-tranche-tasks');
            unassigned.forEach(task => { const row = rowByTask.get(task); if (row) taskContainer.appendChild(row); });
            list.appendChild(section);
        }
        panel.insertAdjacentHTML('beforebegin', projectBillingAlertHtml(project));
    }

    function compactProjectDetail(project, content) {
        content.querySelector('.project-analytics-shell')?.remove();
        const header = content.querySelector('.project-detail-header');
        const actions = header?.querySelector('.admin-only');
        actions?.classList.add('prototype-detail-actions');

        const panel = content.querySelector(project.project_setup_type === 'normative' ? '.normative-scope-panel' : '.project-rhythm-panel');
        if (panel) {
            [...panel.querySelectorAll('p')].find(node => node.textContent.trim().startsWith('Indicatore sperimentale:'))?.remove();
            [...panel.querySelectorAll('p')].forEach(node => {
                if (node.textContent.trim() === 'Piano costi avanzato') node.textContent = 'Piano costi';
            });
            [...panel.querySelectorAll('small')].forEach(node => {
                if (node.textContent.trim() === 'Piano costi avanzato') node.textContent = 'Piano costi';
            });
        }

        const alert = content.querySelector('.prototype-billing-alert');
        if (!alert) return;
        const isAction = alert.classList.contains('is-action');
        const isComplete = alert.classList.contains('is-complete');
        const readyPayments = projectMeta(project).payments.filter(payment => payment.status !== 'collected' && paymentMaturity(project, payment).ready);
        const compactTitle = isAction
            ? (readyPayments.length === 1 ? `Fatturazione ${readyPayments[0].label || 'fase'} ${Number(readyPayments[0].percent || 0)}%` : `${readyPayments.length} fasi da fatturare`)
            : (isComplete ? 'Incassi completati' : 'Nessuna azione');
        const compactDescription = alert.querySelector('div>p')?.textContent.trim() || '';
        const tone = isAction ? 'action' : (isComplete ? 'complete' : 'quiet');

        if (project.project_setup_type === 'normative') {
            const strip = panel?.querySelector('.normative-rhythm-strip');
            if (strip) {
                strip.querySelector('p')?.remove();
                strip.classList.add('prototype-rhythm-summary');
                strip.insertAdjacentHTML('beforeend', `<span class="prototype-rhythm-alert is-${tone}"><small>Avvisi</small><strong>${escapeHtml(compactTitle)}</strong>${compactDescription ? `<em>${escapeHtml(compactDescription)}</em>` : ''}</span>`);
            }
        } else {
            const summary = panel?.querySelector('.grid.grid-cols-2');
            if (summary) {
                summary.classList.remove('grid-cols-2');
                summary.classList.add('grid-cols-3', 'prototype-rhythm-summary');
                summary.insertAdjacentHTML('beforeend', `<div class="prototype-rhythm-alert is-${tone}"><p>Avvisi</p><strong>${escapeHtml(compactTitle)}</strong>${compactDescription ? `<small>${escapeHtml(compactDescription)}</small>` : ''}</div>`);
            }
        }
        alert.remove();
    }

    function decorateProjectDetail(id) {
        const project = projects.find(item => String(item.id) === String(id));
        const content = document.getElementById('detail-content');
        if (!project || !content) return;
        const meta = projectMeta(project);
        const header = content.firstElementChild;
        const headerIdentity = header?.querySelector('.min-w-0');
        if (headerIdentity && (meta.address || meta.description)) headerIdentity.insertAdjacentHTML('beforeend', `<div class="prototype-detail-header-context">${meta.address ? `<p><i data-lucide="map-pin"></i>${escapeHtml(meta.address)}</p>` : ''}${meta.description ? `<p>${escapeHtml(meta.description)}</p>` : ''}</div>`);
        const metrics = content.querySelector('.project-detail-metrics');
        if (metrics) {
            const detail = getProjectDetailData(project.id);
            const summary = getProjectCostSummary(project);
            const withPayments = hasPaymentPlan(project);
            const totals = withPayments ? paymentTotals(project) : null;
            const cardHtml = (label, value, colorClass = 'text-slate-800', extraClass = '') => `<div class="project-metric-card ${extraClass} bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center shadow-sm min-h-[58px]">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${label}</p>
                <p class="text-base lg:text-lg font-black ${colorClass} mt-1 tracking-tight">${value}</p>
            </div>`;
            metrics.className = `project-detail-metrics grid grid-cols-2 ${withPayments ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-2`;
            metrics.innerHTML = cardHtml('Spese totali', `${formatMoney(detail.totalSpent, 0)} <span class="text-[10px] text-slate-400">/ ${formatMoney(project.budget, 0)}</span>`, 'text-primary-600')
                + cardHtml('Resa oraria', `${formatMoney(detail.effectiveRate, 2)} <span class="text-[10px] text-slate-400">/h</span>`, 'text-primary-600')
                + cardHtml('Margine', currency(summary.margin), summary.margin < 0 ? 'text-red-600' : 'text-emerald-700', withPayments ? '' : 'col-span-2 md:col-span-1')
                + (withPayments ? cardHtml('Incassato', `${currency(totals.collected)} <span class="text-[10px]">(${Math.round(totals.collectedPercent)}%)</span>`, 'text-blue-700', 'prototype-collected-metric') : '');
        }
        if (!hasPaymentPlan(project)) { compactProjectDetail(project, content); lucide?.createIcons?.(); return; }
        decorateProjectTranches(project, content);
        compactProjectDetail(project, content);
        lucide?.createIcons?.();
    }

    function totalCollected(projectList = projects.filter(project => !project.is_archived)) {
        return projectList.reduce((sum, project) => sum + paymentTotals(project).collected, 0);
    }

    function weeklyCollected(projectList, buckets = 8) {
        const currentWeek = new Date();
        currentWeek.setHours(0, 0, 0, 0);
        currentWeek.setDate(currentWeek.getDate() - (currentWeek.getDay() || 7) + 1);
        const firstWeek = new Date(currentWeek);
        firstWeek.setDate(firstWeek.getDate() - 7 * (buckets - 1));
        const values = Array(buckets).fill(0);
        projectList.forEach(project => {
            const budget = Number(project.budget || 0);
            projectMeta(project).payments.forEach(payment => {
                if (payment.status !== 'collected') return;
                const collectedDate = new Date(payment.collectedAt || new Date());
                const index = Math.floor((collectedDate - firstWeek) / (7 * 24 * 60 * 60 * 1000));
                if (index >= 0 && index < buckets) values[index] += budget * Number(payment.percent || 0) / 100;
            });
        });
        return values;
    }

    function upsertChartDataset(chart, dataset) {
        if (!chart) return;
        const index = chart.data.datasets.findIndex(item => item.label === dataset.label);
        if (index >= 0) chart.data.datasets[index] = dataset;
        else chart.data.datasets.push(dataset);
        chart.update('none');
    }

    function decorateStudioBillingAlerts() {
        const panel = document.querySelector('.analytics-priority-panel');
        const list = document.getElementById('analytics-priority-list');
        if (!panel || !list) return;
        const title = panel.querySelector('.analytics-panel-heading h3');
        const description = panel.querySelector('.analytics-panel-heading p');
        if (title) title.textContent = 'Avvisi di fatturazione';
        if (description) description.textContent = 'Azioni richieste sulle commesse attive.';
        const alerts = [];
        projects.filter(project => !project.is_archived).forEach(project => {
            if (!hasPaymentPlan(project)) {
                alerts.push({ project, tone: 'warning', label: 'Piano pagamenti non configurato', value: 'Configura', priority: 1 });
                return;
            }
            const ready = projectMeta(project).payments.filter(payment => payment.status !== 'collected' && paymentMaturity(project, payment).ready);
            if (!ready.length) return;
            const amount = ready.reduce((sum, payment) => sum + Number(project.budget || 0) * Number(payment.percent || 0) / 100, 0);
            alerts.push({ project, tone: 'danger', label: `${ready.length === 1 ? 'Da fatturare' : `${ready.length} tranche da fatturare`} · ${ready.map(payment => payment.label).join(' · ')}`, value: currency(amount), priority: 2 });
        });
        alerts.sort((a, b) => b.priority - a.priority || a.project.name.localeCompare(b.project.name, 'it'));
        const visibleAlerts = billingAlertsExpanded ? alerts : alerts.slice(0, 5);
        list.classList.toggle('is-expanded', billingAlertsExpanded && alerts.length > 5);
        list.innerHTML = alerts.length ? visibleAlerts.map(alert => `<button type="button" class="analytics-priority-row" data-ui-action="show-project-detail" data-project-id="${escapeAttr(alert.project.id)}"><span class="analytics-priority-dot is-${alert.tone}" aria-hidden="true"></span><span class="analytics-priority-main"><strong>${escapeHtml(alert.project.name)}</strong><small>${escapeHtml(alert.label)}</small></span><span class="analytics-priority-value ${alert.tone === 'danger' ? 'is-danger' : ''}">${escapeHtml(alert.value)}</span><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i></button>`).join('')
            + (alerts.length > 5 ? `<button type="button" class="prototype-list-toggle" data-prototype-toggle-alerts>${billingAlertsExpanded ? 'Riduci elenco' : `Vedi tutti gli avvisi (${alerts.length})`}<i data-lucide="${billingAlertsExpanded ? 'chevron-up' : 'chevron-down'}"></i></button>` : '')
            : `<div class="analytics-priority-empty"><i data-lucide="circle-check-big"></i><span>Nessun avviso di fatturazione.</span></div>`;
    }

    function decorateFinancialAnalytics() {
        const active = projects.filter(project => !project.is_archived);
        const activeIds = new Set(active.map(project => project.id));
        const costs = entries.filter(entry => activeIds.has(entry.project_id)).reduce((sum, entry) => sum + Number(entry.rate || 0), 0)
            + expenses.filter(expense => activeIds.has(expense.project_id)).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        const collected = totalCollected(active);
        const activeBudget = active.reduce((sum, project) => sum + Number(project.budget || 0), 0);

        const costCard = document.getElementById('card-profit');
        const costLabel = document.getElementById('label-profit');
        const costValue = document.getElementById('kpi-profit');
        const marginValue = document.getElementById('kpi-margin');
        const cashCard = document.querySelector('.analytics-primary-grid .analytics-kpi-costs');
        const cashLabel = cashCard?.querySelector('h3');
        const cashValue = document.getElementById('kpi-active-costs');
        if (costLabel) costLabel.textContent = 'Costi lavori attivi';
        if (costValue) { costValue.textContent = currency(costs); costValue.className = 'analytics-kpi-value text-slate-800'; }
        if (marginValue) marginValue.className = 'analytics-kpi-value text-emerald-700';
        if (costCard) { costCard.classList.remove('analytics-kpi-danger'); costCard.querySelector('p')?.replaceChildren(document.createTextNode('Ore e spese registrate')); }
        if (cashLabel) cashLabel.textContent = 'Incasso lavori attivi';
        if (cashValue) { cashValue.textContent = currency(collected); cashValue.className = 'analytics-kpi-value text-blue-700'; }
        const cashNote = cashCard?.querySelector('p');
        if (cashNote) cashNote.textContent = activeBudget > 0 ? `${Math.round(collected / activeBudget * 100)}% del valore attivo` : 'Nessun incasso registrato';

        const cashRows = active.map(project => {
            const labor = entries.filter(entry => entry.project_id === project.id).reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            const extras = expenses.filter(expense => expense.project_id === project.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
            const projectCosts = labor + extras;
            const projectCollected = paymentTotals(project).collected;
            return { project, costs: projectCosts, collected: projectCollected, balance: projectCollected - projectCosts };
        }).sort((a, b) => a.balance - b.balance || a.project.name.localeCompare(b.project.name, 'it'));
        const hasCashData = cashRows.some(row => row.costs > 0 || row.collected > 0);
        const filteredCashRows = cashRows.filter(row => cashAnalyticsFilter === 'exposed'
            ? row.balance < -0.5
            : cashAnalyticsFilter === 'ahead'
                ? row.balance > 0.5
                : true);
        const chartCashRows = filteredCashRows.slice(0, 6);
        const visibleCashRows = cashAnalyticsExpanded ? filteredCashRows : chartCashRows;
        const hasFilteredCashData = chartCashRows.some(row => row.costs > 0 || row.collected > 0);
        const cashList = document.getElementById('analytics-cash-exposure-list');
        const cashControls = document.getElementById('analytics-cash-controls');
        const cashPosition = document.getElementById('analytics-cash-position');
        const cashNet = cashRows.reduce((sum, row) => sum + row.balance, 0);
        const inlineCashPosition = document.getElementById('analytics-inline-week-cost');
        if (inlineCashPosition) {
            const isExposed = cashNet < -0.5;
            const isNeutral = Math.abs(cashNet) < 0.5;
            inlineCashPosition.className = isNeutral ? 'is-cash-neutral' : isExposed ? 'is-cash-exposed' : 'is-cash-ahead';
            inlineCashPosition.textContent = isNeutral
                ? 'Costi coperti'
                : `${cashNet > 0 ? '+' : '-'}${currency(Math.abs(cashNet))} ${isExposed ? 'esposizione' : 'anticipo'}`;
            inlineCashPosition.title = isNeutral
                ? 'Gli incassi coprono i costi sostenuti'
                : isExposed
                    ? `Esposizione finanziaria di ${currency(Math.abs(cashNet))}`
                    : `Anticipo di cassa di ${currency(cashNet)}`;
        }
        if (cashPosition) {
            cashPosition.className = `analytics-status-chip ${cashNet < 0 ? 'is-cash-exposed' : 'is-cash-ahead'}`;
            cashPosition.textContent = cashNet < 0 ? `${currency(Math.abs(cashNet))} esposti` : `${currency(cashNet)} in anticipo`;
        }
        if (cashControls) {
            const filters = [
                ['all', 'Tutte'],
                ['exposed', 'In esposizione'],
                ['ahead', 'In anticipo']
            ];
            cashControls.innerHTML = `<div class="prototype-cash-filters">${filters.map(([value, label]) => `<button type="button" data-prototype-cash-filter="${value}" class="${cashAnalyticsFilter === value ? 'is-active' : ''}" aria-pressed="${cashAnalyticsFilter === value}">${label}</button>`).join('')}</div>`
                + (filteredCashRows.length > 6 ? `<button type="button" class="prototype-cash-expand" data-prototype-toggle-cash>${cashAnalyticsExpanded ? 'Riduci' : `Mostra tutte (${filteredCashRows.length})`}<i data-lucide="${cashAnalyticsExpanded ? 'chevron-up' : 'chevron-down'}"></i></button>` : '');
        }
        if (cashList) {
            cashList.classList.toggle('force-hide', !hasFilteredCashData);
            cashList.classList.toggle('is-expanded', cashAnalyticsExpanded && filteredCashRows.length > 6);
            cashList.innerHTML = hasFilteredCashData ? visibleCashRows.map(row => {
                const exposed = row.balance < 0;
                const quiet = Math.abs(row.balance) < 0.5;
                const state = quiet ? 'Costi coperti' : exposed ? 'Esposizione finanziaria' : 'Anticipo di cassa';
                return `<button type="button" class="prototype-cash-exposure-row" data-ui-action="show-project-detail" data-project-id="${escapeAttr(row.project.id)}"><span><strong>${escapeHtml(row.project.name)}</strong><small>Costi ${escapeHtml(currency(row.costs))} · Incassato ${escapeHtml(currency(row.collected))}</small></span><span class="${quiet ? 'is-neutral' : exposed ? 'is-exposed' : 'is-ahead'}"><strong>${quiet ? currency(0) : `${row.balance > 0 ? '+' : '-'}${currency(Math.abs(row.balance))}`}</strong><small>${state}</small></span><i data-lucide="chevron-right"></i></button>`;
            }).join('') : '';
        }
        if (charts.risk) {
            const chartWrap = document.getElementById('chart-risk')?.parentElement;
            const empty = document.getElementById('empty-risk');
            const emptyText = empty?.querySelector('span');
            if (emptyText) emptyText.textContent = hasCashData ? 'Nessuna commessa corrisponde al filtro selezionato.' : 'Registra costi o incassi per confrontare le commesse.';
            chartWrap?.classList.toggle('force-hide', !hasFilteredCashData);
            empty?.classList.toggle('force-hide', hasFilteredCashData);
            if (!hasCashData) {
                charts.risk.destroy();
                charts.risk = null;
            } else if (hasFilteredCashData) {
                charts.risk.data.labels = chartCashRows.map(row => row.project.name);
                charts.risk.data.datasets = [
                    { label: 'Costi sostenuti', data: chartCashRows.map(row => row.costs), backgroundColor: '#64748b', borderRadius: 4, barThickness: 10 },
                    { label: 'Incassato', data: chartCashRows.map(row => row.collected), backgroundColor: '#2563eb', borderRadius: 4, barThickness: 10 }
                ];
                charts.risk.options.plugins.tooltip.callbacks.footer = items => {
                    const row = chartCashRows[items[0].dataIndex];
                    if (Math.abs(row.balance) < 0.5) return 'Costi interamente coperti';
                    return row.balance < 0
                        ? `Esposizione: ${currency(Math.abs(row.balance))}`
                        : `Anticipo di cassa: ${currency(row.balance)}`;
                };
                charts.risk.update('none');
            }
        }
        decorateStudioBillingAlerts();
        lucide.createIcons();
    }

    function decorateProjectFinancialChart(projectId) {
        const project = projects.find(item => String(item.id) === String(projectId));
        if (!project || !charts.projectCosts) return;
        const index = charts.projectCosts.data.datasets.findIndex(item => item.label === 'Incassi');
        if (index >= 0) { charts.projectCosts.data.datasets.splice(index, 1); charts.projectCosts.update('none'); }
    }

    async function withTaskNotesInPdf(id, callback) {
        const project = projects.find(item => String(item.id) === String(id));
        if (!project || project.project_setup_type === 'normative') return callback();
        const notes = projectMeta(project).taskNotes || {};
        const originalTasks = project.tasks;
        const originalBudgets = project.task_budgets;
        const annotatedTasks = (originalTasks || []).map(task => notes[task]?.trim() ? `${task}\n${notes[task].trim()}` : task);
        project.tasks = annotatedTasks;
        project.task_budgets = Object.fromEntries(annotatedTasks.map((task, index) => [task, Number(originalBudgets?.[originalTasks[index]] || 0)]));
        try { return await callback(); }
        finally { project.tasks = originalTasks; project.task_budgets = originalBudgets; }
    }

    async function withTaskNotesInExcel(id, callback) {
        const project = projects.find(item => String(item.id) === String(id));
        excelTaskNotesContext = project && project.project_setup_type !== 'normative' ? (projectMeta(project).taskNotes || {}) : null;
        excelTaskNoteRows.clear();
        try { return await callback(); }
        finally { excelTaskNotesContext = null; excelTaskNoteRows.clear(); }
    }

    const originalRenderProjectModalTasks = renderProjectModalTasks;
    renderProjectModalTasks = function () {
        originalRenderProjectModalTasks.apply(this, arguments);
        decorateSourceTaskNotes();
        if (document.getElementById('modal-edit-project')?.dataset.prototypeStep === 'billing') renderPaymentPlanner();
    };

    const originalRenderProjects = renderProjects;
    renderProjects = function () { originalRenderProjects.apply(this, arguments); decorateProjectCards(); };
    const originalShowProjectDetail = showProjectDetail;
    showProjectDetail = function (id) { originalShowProjectDetail.apply(this, arguments); decorateProjectDetail(id); };
    const originalOpenCreateProjectModal = openCreateProjectModal;
    openCreateProjectModal = function (type = 'studio') { originalOpenCreateProjectModal.apply(this, arguments); setupProjectModal(''); };
    const originalOpenEditProjectModal = openEditProjectModal;
    openEditProjectModal = async function (id) { await originalOpenEditProjectModal.apply(this, arguments); setupProjectModal(id); };
    const originalCreateNewProject = createNewProject;
    createNewProject = async function () {
        if (!skipBillingForCurrentSave && !paymentPlanIsValid()) { await appAlert('Piano pagamenti', 'La somma delle fasi deve essere esattamente 100%.', 'danger'); return; }
        if (!skipBillingForCurrentSave && !taskTranchePlanIsValid()) { await appAlert('Attività da assegnare', 'Associa tutte le attività a una tranche prima di creare il progetto.', 'danger'); return; }
        const draft = readModalMeta();
        const beforeIds = new Set(projects.map(project => String(project.id)));
        const result = await originalCreateNewProject.apply(this, arguments);
        const created = projects.find(project => !beforeIds.has(String(project.id)));
        if (created) { metaByProject.set(created.id, draft); renderProjects(); }
        return result;
    };
    const originalUpdateProject = typeof updateProject === 'function' ? updateProject : null;
    if (originalUpdateProject) updateProject = async function () {
        if (!paymentPlanIsValid()) { await appAlert('Piano pagamenti', 'La somma delle fasi deve essere esattamente 100%.', 'danger'); return; }
        if (!taskTranchePlanIsValid()) { await appAlert('Attività da assegnare', 'Associa tutte le attività a una tranche prima di salvare il progetto.', 'danger'); return; }
        if (modalProjectId) metaByProject.set(modalProjectId, readModalMeta());
        const result = await originalUpdateProject.apply(this, arguments); renderProjects(); return result;
    };

    const originalRenderStrategicCharts = renderStrategicCharts;
    renderStrategicCharts = function () {
        const result = originalRenderStrategicCharts.apply(this, arguments);
        decorateFinancialAnalytics();
        return result;
    };

    const originalRenderProjectAnalytics = renderProjectAnalytics;
    renderProjectAnalytics = function (projectId) {
        const result = originalRenderProjectAnalytics.apply(this, arguments);
        decorateProjectFinancialChart(projectId);
        return result;
    };

    const originalExportProjectQuotePDF = exportProjectQuotePDF;
    exportProjectQuotePDF = function (id) {
        return withTaskNotesInPdf(id, () => originalExportProjectQuotePDF.call(this, id));
    };

    const originalSetExcelCell = setExcelCell;
    setExcelCell = function (sheet, row, column, value, options = {}) {
        if (excelTaskNotesContext && column === 2 && typeof value === 'string' && excelTaskNotesContext[value]?.trim()) {
            excelTaskNoteRows.set(row, excelTaskNotesContext[value].trim());
        }
        const nextValue = excelTaskNotesContext && column === 3 && (value === '' || value == null) && excelTaskNoteRows.has(row)
            ? excelTaskNoteRows.get(row)
            : value;
        return originalSetExcelCell.call(this, sheet, row, column, nextValue, options);
    };

    const originalExportProjectQuoteExcel = exportProjectQuoteExcel;
    exportProjectQuoteExcel = function (id) {
        return withTaskNotesInExcel(id, () => originalExportProjectQuoteExcel.call(this, id));
    };

    document.addEventListener('click', event => {
        const newClient = event.target.closest('[data-prototype-new-client]');
        if (newClient) { openPrototypeClientModal(newClient.dataset.prototypeNewClient || 'library'); return; }
        const skip = event.target.closest('#prototype-save-without-payments');
        if (skip) {
            event.preventDefault();
            event.stopImmediatePropagation();
            createProjectWithoutBilling();
            return;
        }
        const save = event.target.closest('#btn-save-project-edit');
        const modal = document.getElementById('modal-edit-project');
        if (save && modal?.dataset.prototypeStep !== 'billing') {
            event.preventDefault();
            event.stopImmediatePropagation();
            continueToBillingStep();
        }
    }, true);

    document.addEventListener('change', event => {
        if (event.target.id === 'prototype-payment-preset') { if (event.target.value !== 'custom') { modalPayments = clonePayments(paymentPresets[event.target.value]); modalTaskTranches = {}; } renderPaymentPlanner(); return; }
        if (event.target.classList.contains('prototype-payment-percent')) {
            const index = Number(event.target.closest('[data-payment-index]')?.dataset.paymentIndex);
            const otherTotal = modalPayments.reduce((sum, item, itemIndex) => itemIndex === index ? sum : sum + Number(item.percent || 0), 0);
            modalPayments[index].percent = Math.max(0, Math.min(Math.max(0, 100 - otherTotal), Number(event.target.value || 0)));
            document.getElementById('prototype-payment-preset').value = 'custom'; renderPaymentPlanner(); return;
        }
        if (event.target.classList.contains('prototype-payment-name')) {
            const index = Number(event.target.closest('[data-payment-index]')?.dataset.paymentIndex);
            modalPayments[index].label = event.target.value.trim() || `Fase ${index + 1}`; document.getElementById('prototype-payment-preset').value = 'custom'; return;
        }
        if (event.target.matches('[data-prototype-task-picker]')) {
            const task = event.target.value;
            if (!task) return;
            const tasks = currentModalTasks();
            if (!tasks.includes(task)) setCurrentProjectModalTasks([...tasks, task]);
            modalTaskTranches[task] = event.target.dataset.prototypeTaskPicker;
            renderProjectModalTasks();
            return;
        }
        if (event.target.matches('[data-prototype-task-budget]')) {
            const task = event.target.dataset.prototypeTaskBudget;
            const budgets = currentModalBudgets();
            budgets[task] = Math.max(0, Number(event.target.value || 0));
            setCurrentProjectModalBudgets(budgets);
            if (projectBudgetMode === 'auto') fillProjectBudgetFromTaskBudgets(false);
            renderPaymentPlanner();
            return;
        }
        if (event.target.matches('[data-prototype-payment-status]')) {
            const project = projects.find(item => String(item.id) === String(event.target.dataset.projectId));
            if (!project) return;
            const payment = projectMeta(project).payments[Number(event.target.dataset.prototypePaymentStatus)];
            payment.status = event.target.value;
            if (payment.status === 'collected' && !payment.collectedAt) payment.collectedAt = new Date().toISOString();
            if (payment.status !== 'collected') delete payment.collectedAt;
            showProjectDetail(project.id); renderProjects(); renderStrategicCharts();
        }
        if (event.target.id === 'edit-modal-budget' || event.target.id === 'normative-work-value') requestAnimationFrame(renderPaymentPlanner);
    });
    document.addEventListener('click', event => {
        const cashFilter = event.target.closest('[data-prototype-cash-filter]');
        if (cashFilter) {
            cashAnalyticsFilter = cashFilter.dataset.prototypeCashFilter;
            cashAnalyticsExpanded = false;
            decorateFinancialAnalytics();
            return;
        }
        if (event.target.closest('[data-prototype-toggle-cash]')) {
            cashAnalyticsExpanded = !cashAnalyticsExpanded;
            decorateFinancialAnalytics();
            return;
        }
        if (event.target.closest('[data-prototype-toggle-alerts]')) {
            billingAlertsExpanded = !billingAlertsExpanded;
            decorateStudioBillingAlerts();
            lucide.createIcons();
            return;
        }
        const editActivity = event.target.closest('[data-prototype-edit-activity]');
        if (editActivity) {
            openCatalogModal();
            editCatalogTask(editActivity.dataset.prototypeEditActivity);
            return;
        }
        const editTemplateButton = event.target.closest('[data-prototype-edit-template]');
        if (editTemplateButton) {
            openTemplatesModal();
            editTemplate(Number(editTemplateButton.dataset.prototypeEditTemplate));
            return;
        }
        const editClient = event.target.closest('[data-prototype-edit-client]');
        if (editClient) { editPrototypeClient(editClient.dataset.prototypeEditClient); return; }
        const deleteClient = event.target.closest('[data-prototype-delete-client]');
        if (deleteClient) {
            const index = prototypeClients.findIndex(client => client.id === deleteClient.dataset.prototypeDeleteClient);
            if (index >= 0) {
                const [removed] = prototypeClients.splice(index, 1);
                projects.filter(project => project.client === removed.name).forEach(project => { project.client = ''; });
                resetClientForm(); renderClientLibrary(); renderClientSelect(''); renderProjects();
            }
            return;
        }
        if (event.target.closest('#prototype-client-cancel') || event.target.closest('#prototype-client-close')) { closePrototypeClientModal(); return; }
        if (event.target.closest('#prototype-back-to-details')) {
            setPrototypeModalStep('details');
            return;
        }
        if (event.target.closest('#prototype-add-payment')) {
            const current = modalPayments.reduce((sum, row) => sum + Number(row.percent || 0), 0);
            modalPayments.push({ id: newPaymentId(), label: `Tranche ${modalPayments.length + 1}`, percent: Math.max(0, 100 - current), status: 'pending' }); renderPaymentPlanner(); return;
        }
        const openPicker = event.target.closest('[data-prototype-open-task-picker]');
        if (openPicker) {
            const picker = document.querySelector(`[data-prototype-task-picker="${CSS.escape(openPicker.dataset.prototypeOpenTaskPicker)}"]`);
            picker?.classList.toggle('force-hide');
            if (picker && !picker.classList.contains('force-hide')) picker.focus();
            return;
        }
        const unassign = event.target.closest('[data-prototype-unassign-task]');
        if (unassign) {
            delete modalTaskTranches[unassign.dataset.prototypeUnassignTask];
            renderPaymentPlanner();
            return;
        }
        const invoice = event.target.closest('[data-prototype-invoice-payment]');
        if (invoice) {
            const project = projects.find(item => String(item.id) === String(invoice.dataset.projectId));
            if (!project) return;
            const payment = projectMeta(project).payments[Number(invoice.dataset.prototypeInvoicePayment)];
            if (payment) payment.status = 'invoiced';
            showProjectDetail(project.id);
            renderProjects();
            renderStrategicCharts();
            return;
        }
        const remove = event.target.closest('.prototype-remove-payment');
        if (remove) {
            const index = Number(remove.closest('[data-payment-index]')?.dataset.paymentIndex);
            const removedId = modalPayments[index]?.id;
            modalPayments.splice(index, 1);
            Object.keys(modalTaskTranches).forEach(task => { if (modalTaskTranches[task] === removedId) delete modalTaskTranches[task]; });
            document.getElementById('prototype-payment-preset').value = 'custom'; renderPaymentPlanner();
        }
    });
    document.addEventListener('input', event => {
        if (event.target.classList.contains('prototype-payment-percent')) {
            const index = Number(event.target.closest('[data-payment-index]')?.dataset.paymentIndex);
            const otherTotal = modalPayments.reduce((sum, item, itemIndex) => itemIndex === index ? sum : sum + Number(item.percent || 0), 0);
            const percent = Math.max(0, Math.min(Math.max(0, 100 - otherTotal), Number(event.target.value || 0)));
            modalPayments[index].percent = percent;
            event.target.value = String(percent);
            const amount = event.target.closest('.prototype-tranche-head')?.querySelector(':scope > strong');
            if (amount) amount.textContent = currency(modalBudget() * percent / 100);
            const total = modalPayments.reduce((sum, row) => sum + Number(row.percent || 0), 0);
            const totalEl = document.getElementById('prototype-payment-total');
            if (totalEl) {
                totalEl.className = total === 100 ? 'is-valid' : 'is-invalid';
                totalEl.textContent = total === 100 ? 'Totale 100%' : `Totale ${total}% · deve essere 100%`;
            }
            const preset = document.getElementById('prototype-payment-preset');
            if (preset) preset.value = 'custom';
            return;
        }
        if (event.target.matches('[data-prototype-task-note]')) modalTaskNotes[event.target.dataset.prototypeTaskNote] = event.target.value;
    });
    const prototypeClientModal = document.getElementById('modal-prototype-client');
    prototypeClientModal?.addEventListener('click', event => {
        if (event.target === prototypeClientModal) closePrototypeClientModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !prototypeClientModal || prototypeClientModal.classList.contains('force-hide')) return;
        const dialog = document.getElementById('custom-dialog');
        if (dialog && !dialog.classList.contains('force-hide')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closePrototypeClientModal();
    }, true);
    document.getElementById('prototype-client-form')?.addEventListener('submit', savePrototypeClient);
    const baseRenderCatalogAndTemplatesUI = renderCatalogAndTemplatesUI;
    renderCatalogAndTemplatesUI = function () {
        const result = baseRenderCatalogAndTemplatesUI();
        renderPrototypeActivityLibraries();
        return result;
    };
    window.archTimeFlowPrototype = {
        projectMeta,
        paymentTotals,
        hasPaymentPlan,
        paymentMaturity,
        clientForProject,
        clients: prototypeClients
    };
    window.addEventListener('load', () => setTimeout(() => { ensurePrototypeBadge(); seedProjectMeta(); renderClientLibrary(); renderClientSelect(); renderPrototypeActivityLibraries(); renderProjects(); }, 100));
})();
