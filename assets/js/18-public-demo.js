(function () {
    'use strict';

    const hourlyCost = 60;
    const seedProjects = [
        {
            id: 'villa', name: 'Villa sul lago', client: 'Cliente privato', budget: 18000,
            expenses: 700, plannedPercent: 45,
            tasks: ['Sopralluogo', 'Progetto definitivo', 'Direzione lavori'],
            entries: [
                { task: 'Sopralluogo', hours: 35 },
                { task: 'Progetto definitivo', hours: 45 },
                { task: 'Direzione lavori', hours: 30 }
            ]
        },
        {
            id: 'centro', name: 'Centro medico', client: 'Salute Srl', budget: 12000,
            expenses: 600, plannedPercent: 40,
            tasks: ['Rilievo', 'Progetto preliminare', 'Progetto definitivo'],
            entries: [
                { task: 'Rilievo', hours: 20 },
                { task: 'Progetto preliminare', hours: 40 },
                { task: 'Progetto definitivo', hours: 38 }
            ]
        },
        {
            id: 'casa', name: 'Casa della luce', client: 'Famiglia Bianchi', budget: 8000,
            expenses: 650, plannedPercent: 80,
            tasks: ['Sopralluogo', 'Progetto preliminare', 'Direzione lavori'],
            entries: [
                { task: 'Sopralluogo', hours: 50 },
                { task: 'Progetto preliminare', hours: 48 },
                { task: 'Direzione lavori', hours: 28 }
            ]
        }
    ];

    let projects = freshProjects();
    let selectedId = projects[0].id;
    const euros = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: true });
    const hoursFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

    function freshProjects() {
        return structuredClone(seedProjects);
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function track(name, properties) {
        window.archTimeAnalytics?.track(name, properties);
    }

    function totalHours(project) {
        return project.entries.reduce((sum, entry) => sum + entry.hours, 0);
    }

    function cost(project) {
        return totalHours(project) * hourlyCost + project.expenses;
    }

    function state(project) {
        const actual = 100 * cost(project) / project.budget;
        if (actual >= 100) return { key: 'over', label: 'Fuori budget', note: 'I costi hanno raggiunto o superato il budget. È il momento di verificare l’incarico e le attività ancora da svolgere.' };
        if (actual > project.plannedPercent + 10) return { key: 'watch', label: 'Da monitorare', note: 'I costi sono cresciuti più del piano previsto per questa fase. Vale la pena controllare dove si stanno concentrando le ore.' };
        return { key: 'aligned', label: 'Allineato', note: 'I costi sono in linea con il piano previsto per questa fase. Il margine può ancora cambiare con il lavoro successivo.' };
    }

    function setText(id, value) {
        byId(id).textContent = value;
    }

    function makeStatus(project) {
        const result = state(project);
        const element = document.createElement('span');
        element.className = `demo-status ${result.key}`;
        element.textContent = result.label;
        return element;
    }

    function renderOverview() {
        const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
        const totalCost = projects.reduce((sum, project) => sum + cost(project), 0);
        setText('demo-total-budget', euros.format(totalBudget));
        setText('demo-total-cost', euros.format(totalCost));
        setText('demo-total-margin', euros.format(totalBudget - totalCost));
        setText('demo-project-count', `${projects.length} progetti attivi`);
    }

    function renderProjectList() {
        const list = byId('demo-project-list');
        list.replaceChildren();
        for (const project of projects) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'demo-project';
            button.dataset.projectId = project.id;
            button.setAttribute('aria-pressed', String(project.id === selectedId));

            const top = document.createElement('span');
            top.className = 'demo-project-top';
            const name = document.createElement('span');
            name.className = 'demo-project-name';
            name.textContent = project.name;
            top.append(name, makeStatus(project));

            const client = document.createElement('span');
            client.className = 'demo-project-client';
            client.textContent = project.client;

            const metrics = document.createElement('span');
            metrics.className = 'demo-project-metrics';
            for (const [label, amount] of [
                ['Budget', project.budget],
                ['Costi', cost(project)],
                ['Margine', project.budget - cost(project)]
            ]) {
                const item = document.createElement('span');
                const value = document.createElement('strong');
                item.textContent = label;
                value.textContent = euros.format(amount);
                item.append(value);
                metrics.append(item);
            }

            const progressLabel = document.createElement('span');
            progressLabel.className = 'demo-progress-info';
            const progressName = document.createElement('span');
            progressName.textContent = 'Costi consumati';
            const progressValue = document.createElement('strong');
            progressValue.textContent = `${Math.round(100 * cost(project) / project.budget)}%`;
            progressLabel.append(progressName, progressValue);

            const bar = document.createElement('span');
            bar.className = `demo-progress ${state(project).key}`;
            const fill = document.createElement('span');
            fill.style.width = `${Math.min(100, 100 * cost(project) / project.budget)}%`;
            bar.append(fill);

            button.append(top, client, metrics, progressLabel, bar);
            list.append(button);
        }
    }

    function renderDetail() {
        const project = projects.find(item => item.id === selectedId);
        const projectState = state(project);
        const actualPercent = 100 * cost(project) / project.budget;
        setText('demo-detail-title', project.name);
        setText('demo-detail-client', project.client);
        setText('demo-budget', euros.format(project.budget));
        setText('demo-cost', euros.format(cost(project)));
        setText('demo-margin', euros.format(project.budget - cost(project)));
        setText('demo-cost-percent', `${Math.round(actualPercent)}%`);
        setText('demo-plan-percent', `${project.plannedPercent}%`);
        setText('demo-state-explanation', projectState.note);
        setText('demo-total-hours', `${hoursFormat.format(totalHours(project))} h`);

        const status = byId('demo-detail-status');
        status.className = `demo-status ${projectState.key}`;
        status.textContent = projectState.label;
        const bar = byId('demo-cost-bar');
        bar.parentElement.className = `demo-progress ${projectState.key}`;
        bar.style.width = `${Math.min(100, actualPercent)}%`;
        byId('demo-plan-bar').style.width = `${project.plannedPercent}%`;

        const entries = byId('demo-entries');
        entries.replaceChildren();
        for (const entry of project.entries) {
            const item = document.createElement('li');
            const task = document.createElement('span');
            const amount = document.createElement('strong');
            task.textContent = entry.task;
            amount.textContent = `${hoursFormat.format(entry.hours)} h`;
            item.append(task, amount);
            entries.append(item);
        }

        const taskSelect = byId('demo-task');
        taskSelect.replaceChildren();
        for (const task of project.tasks) {
            const option = document.createElement('option');
            option.value = task;
            option.textContent = task;
            taskSelect.append(option);
        }
    }

    function render() {
        renderOverview();
        renderProjectList();
        renderDetail();
    }

    byId('demo-project-list').addEventListener('click', function (event) {
        const button = event.target.closest('[data-project-id]');
        if (!button) return;
        selectedId = button.dataset.projectId;
        byId('demo-feedback').textContent = '';
        render();
        byId('demo-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
        track('demo_project_opened', { project: selectedId });
    });

    byId('demo-hours-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const input = byId('demo-hours');
        const hours = Number(input.value);
        if (!input.checkValidity() || !Number.isFinite(hours) || hours < 0.25 || hours > 24) {
            input.reportValidity();
            return;
        }
        const project = projects.find(item => item.id === selectedId);
        const task = byId('demo-task').value;
        if (!project.tasks.includes(task)) return;
        project.entries.push({ task, hours });
        render();
        setText('demo-feedback', `${hoursFormat.format(hours)} h aggiunte. Costi e margine aggiornati.`);
        track('demo_hours_added', { project: selectedId });
    });

    byId('demo-reset').addEventListener('click', function () {
        projects = freshProjects();
        selectedId = projects[0].id;
        byId('demo-hours').value = '2';
        byId('demo-feedback').textContent = '';
        render();
        track('demo_reset');
    });

    document.querySelectorAll('[data-demo-signup]').forEach(function (link) {
        link.addEventListener('click', function () { track('demo_signup_clicked'); });
    });

    render();
    window.lucide?.createIcons();
    track('demo_opened');
})();
