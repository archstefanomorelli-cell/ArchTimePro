// Arch Time Pro - 04-projects.js
// ================= GESTIONE PROGETTI =================

        function isAdminUser() {
            return document.body.classList.contains('is-admin');
        }

        function projectSelectColumns() {
            return isAdminUser() ? '*' : 'id,studio_id,name,client,tasks,is_archived';
        }

        function entrySelectColumns() {
            return isAdminUser() ? '*' : 'id,studio_id,project_id,project_name,task,duration,user_email,user_name,notes,created_at';
        }

        async function fetchRpcList(fnName) {
            const { data, error } = await supabaseClient.rpc(fnName);
            if (error) {
                console.warn(`RPC ${fnName} non disponibile, uso fallback client.`, error.message);
                return null;
            }
            return data || [];
        }

        async function fetchProjects() { 
            const rpcData = await fetchRpcList('get_projects_for_app');
            if (rpcData) {
                projects = rpcData.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            } else {
                const { data } = await supabaseClient.from('projects').select(projectSelectColumns()).order('name'); 
                projects = data || [];
            }
            renderProjects(); 
            if(isAdminUser()) renderStrategicCharts(); 
        }
        
        async function fetchEntries() { 
            const rpcData = await fetchRpcList('get_entries_for_app');
            if (rpcData) {
                entries = rpcData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2000);
            } else {
                const { data } = await supabaseClient.from('entries').select(entrySelectColumns()).order('created_at', { ascending: false }).limit(2000); 
                entries = data || [];
            }
            renderEntries(); 
            renderProjects(); 
            if(isAdminUser()) renderStrategicCharts(); 
        }
        
        async function fetchExpenses() { 
            if (!isAdminUser()) {
                expenses = [];
                return;
            }
            const rpcData = await fetchRpcList('get_expenses_for_app');
            if (rpcData) {
                expenses = rpcData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else {
                const { data } = await supabaseClient.from('expenses').select('*').order('created_at', { ascending: false }); 
                expenses = data || [];
            }
            renderProjects(); 
            if(userProfile && isAdminUser()) renderStrategicCharts(); 
        }


        function projectSelectOptionsHtml() {
            return optionHtml('', '-- Seleziona Lavoro --', true, true)
                + projects.filter(p => !p.is_archived).map(p => optionHtml(projects.indexOf(p), p.name)).join('');
        }

        function getVisibleProjects() {
            return projects
                .filter(p => showArchived ? true : p.is_archived !== true)
                .sort((a, b) => {
                    if (a.is_archived && !b.is_archived) return 1;
                    if (!a.is_archived && b.is_archived) return -1;
                    return 0;
                });
        }

        function getProjectCostSummary(project) {
            const costHrs = entries.filter(e => e.project_id === project.id).reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            const costExp = expenses.filter(expense => expense.project_id === project.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
            const totalCost = costHrs + costExp;
            const budget = Number(project.budget || 0);
            const margin = budget - totalCost;
            const percent = budget > 0 ? (totalCost / budget * 100) : (totalCost > 0 ? 100 : 0);
            const isOverBudget = margin < 0;
            const isCritical = !isOverBudget && percent > 90;
            const isWarning = !isOverBudget && percent > 75;

            return {
                totalCost,
                budget,
                percent,
                margin,
                barClass: isOverBudget || isCritical ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : 'bg-emerald-500'),
                statusLabel: isOverBudget ? 'Fuori budget' : (isCritical ? 'Critico' : (isWarning ? 'Da monitorare' : 'In controllo')),
                statusIcon: isOverBudget ? 'octagon-alert' : (isCritical ? 'alert-triangle' : (isWarning ? 'circle-alert' : 'check-circle-2')),
                statusClass: isOverBudget || isCritical ? 'bg-red-50 text-red-700 border-red-200' : (isWarning ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'),
                marginClass: margin < 0 ? 'text-red-600' : 'text-emerald-600',
                statusTone: isOverBudget || isCritical ? 'danger' : (isWarning ? 'warning' : 'healthy')
            };
        }

        function getProjectTaskStatuses(project) {
            const rawStatuses = project.task_statuses && typeof project.task_statuses === 'object' ? project.task_statuses : {};
            const statuses = {};
            (project.tasks || []).forEach(task => {
                const savedStatus = rawStatuses[task];
                const hasTrackedTime = entries.some(entry => entry.project_id === project.id && entry.task === task && Number(entry.duration || 0) > 0);
                statuses[task] = ['todo', 'doing', 'done'].includes(savedStatus) ? savedStatus : (hasTrackedTime ? 'doing' : 'todo');
            });
            return statuses;
        }

        function getProjectTaskBudgets(project) {
            const rawBudgets = project.task_budgets && typeof project.task_budgets === 'object' ? project.task_budgets : {};
            const budgets = {};
            (project.tasks || []).forEach(task => {
                const budgetValue = Number(rawBudgets[task] || 0);
                if (budgetValue > 0) budgets[task] = budgetValue;
            });
            return budgets;
        }

        function hasUsableTaskBudgets(project) {
            const tasks = project.tasks || [];
            const budgets = getProjectTaskBudgets(project);
            const budgetValuedTotal = tasks.reduce((sum, task) => sum + Number(budgets[task] || 0), 0);
            return budgetValuedTotal > 0;
        }

        function getProjectRhythmSummary(project, costSummary = getProjectCostSummary(project)) {
            const tasks = project.tasks || [];
            if (!isAdminUser() || tasks.length === 0 || costSummary.budget <= 0) return null;

            const statuses = getProjectTaskStatuses(project);
            const budgets = getProjectTaskBudgets(project);
            const usesTaskBudgets = hasUsableTaskBudgets(project);
            const weights = { todo: 0, doing: 0.5, done: 1 };
            const budgetValuedTotal = tasks.reduce((sum, task) => sum + (usesTaskBudgets ? Number(budgets[task] || 0) : 1), 0);
            const completedWeight = tasks.reduce((sum, task) => {
                const taskWeight = usesTaskBudgets ? Number(budgets[task] || 0) : 1;
                return sum + (taskWeight * (weights[statuses[task]] || 0));
            }, 0);
            const operationalPercent = budgetValuedTotal > 0 ? completedWeight / budgetValuedTotal * 100 : 0;
            const costPercent = costSummary.percent;
            const gap = costPercent - operationalPercent;
            const isOverBudget = costPercent > 100;
            const isOffPace = !isOverBudget && gap > 25;
            const isWarning = !isOverBudget && !isOffPace && gap > 10;

            return {
                statuses,
                budgets,
                usesTaskBudgets,
                budgetValuedTotal,
                costPercent,
                operationalPercent,
                gap,
                label: isOverBudget ? 'Fuori budget' : (isOffPace ? 'Fuori ritmo' : (isWarning ? 'Da monitorare' : 'Allineato')),
                description: isOverBudget
                    ? 'I costi hanno superato il budget disponibile.'
                    : (isOffPace
                        ? `I costi stanno correndo più dell’avanzamento ${usesTaskBudgets ? 'del piano costi' : 'attività'}.`
                        : (isWarning ? `I costi sono leggermente avanti rispetto ${usesTaskBudgets ? 'al piano costi' : 'alle attività'}.` : `Costi e ${usesTaskBudgets ? 'piano costi' : 'attività'} risultano coerenti.`)),
                barClass: isOverBudget || isOffPace ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : 'bg-emerald-500'),
                markerClass: isOverBudget || isOffPace ? 'bg-red-700' : (isWarning ? 'bg-amber-700' : 'bg-emerald-700'),
                statusClass: isOverBudget || isOffPace ? 'bg-red-50 text-red-700 border-red-200' : (isWarning ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'),
                statusTone: isOverBudget || isOffPace ? 'danger' : (isWarning ? 'warning' : 'healthy')
            };
        }

        function getProjectVisualStatus(project, costSummary = getProjectCostSummary(project)) {
            const rhythm = getProjectRhythmSummary(project, costSummary);
            if (!rhythm) {
                return {
                    label: costSummary.statusLabel,
                    icon: costSummary.statusIcon,
                    className: costSummary.statusClass,
                    tone: costSummary.statusTone,
                    barClass: costSummary.barClass,
                    title: costSummary.statusLabel,
                    rhythm: null
                };
            }

            const isDanger = rhythm.statusTone === 'danger';
            const isWarning = rhythm.statusTone === 'warning';
            return {
                label: rhythm.label,
                icon: isDanger ? 'activity' : (isWarning ? 'circle-alert' : 'check-circle-2'),
                className: rhythm.statusClass,
                tone: rhythm.statusTone,
                barClass: rhythm.barClass,
                title: rhythm.label,
                rhythm
            };
        }

        function projectCardHtml(project) {
            const summary = getProjectCostSummary(project);
            const cardStatus = getProjectVisualStatus(project, summary);
            const rhythm = cardStatus.rhythm;
            const projectId = escapeAttr(project.id);

            return `
                <div data-ui-action="show-project-detail" data-project-id="${projectId}" data-project-tone="${cardStatus.tone}" class="bg-white border border-slate-200 p-5 lg:p-6 shadow-sm hover:shadow-md hover:border-primary-200 rounded-2xl cursor-pointer relative group transition-all ${project.is_archived ? 'is-archived' : ''}">
                    <div class="absolute top-0 left-0 right-0 h-1 ${cardStatus.barClass} rounded-t-2xl"></div>
                    <div class="flex justify-between items-start gap-3 mb-5">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 mb-1.5">
                                <span class="project-life-dot shrink-0" aria-hidden="true" title="${escapeAttr(cardStatus.title)}"></span>
                                <h3 class="font-black text-slate-900 text-base lg:text-lg tracking-tight truncate">${escapeHtml(project.name)}</h3>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                ${project.is_archived ? '<span class="text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border-slate-200">Archiviato</span>' : ''}
                                <p class="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">${escapeHtml(project.client || 'Interno')}</p>
                            </div>
                        </div>
                        <div class="admin-only opacity-100 lg:opacity-0 group-hover:opacity-100 flex gap-1 bg-white lg:bg-transparent rounded-lg shadow-sm lg:shadow-none p-1 lg:p-0">
                            <button data-ui-action="toggle-project-archive" data-project-id="${projectId}" data-archived="${project.is_archived ? 'true' : 'false'}" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><i data-lucide="archive" class="w-4 h-4"></i></button>
                            <button data-ui-action="delete-project" data-project-id="${projectId}" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-4">
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Costi rilevati</p>
                            <p class="text-xs font-black text-slate-800 mt-0.5">${formatMoney(summary.totalCost, 0)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Budget</p>
                            <p class="text-xs font-black text-slate-800 mt-0.5">${formatMoney(summary.budget, 0)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Margine</p>
                            <p class="text-xs font-black ${summary.marginClass} mt-0.5">${formatMoney(summary.margin, 0)}</p>
                        </div>
                    </div>
                    <div class="pt-2 border-t border-slate-100">
                        <div class="flex justify-between items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                            <span>Avanzamento</span>
                            ${rhythm ? `<span class="normal-case tracking-normal font-black ${rhythm.gap > 25 || rhythm.costPercent > 100 ? 'text-red-600' : (rhythm.gap > 10 ? 'text-amber-600' : 'text-emerald-600')}">${rhythm.label}</span>` : `<span>${Math.round(summary.percent)}%</span>`}
                        </div>
                        <div class="relative w-full bg-slate-100 h-2.5 rounded-full overflow-visible">
                            <div class="${rhythm ? rhythm.barClass : summary.barClass} h-full transition-all duration-1000 rounded-full" style="width: ${Math.min(rhythm ? rhythm.costPercent : summary.percent, 100)}%"></div>
                            ${rhythm ? `<span class="absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full ${rhythm.markerClass} shadow-sm" style="left: calc(${Math.min(rhythm.operationalPercent, 100)}% - 2px)"></span>` : ''}
                        </div>
                        <div class="flex justify-between text-[10px] lg:text-[11px] font-black text-slate-500 mt-2">
                            <span>Costi ${Math.round(rhythm ? rhythm.costPercent : summary.percent)}%</span>
                            ${rhythm ? `<span>${rhythm.usesTaskBudgets ? 'Piano costi' : 'Avanz. attività'} ${Math.round(rhythm.operationalPercent)}%</span>` : `<span>Budget ${Math.round(summary.percent)}%</span>`}
                        </div>
                    </div>
                </div>`;
        }

        function projectListRowHtml(project) {
            const summary = getProjectCostSummary(project);
            const visualStatus = getProjectVisualStatus(project, summary);
            const rhythm = visualStatus.rhythm;
            const projectId = escapeAttr(project.id);
            const costPercent = Math.round(rhythm ? rhythm.costPercent : summary.percent);
            const progressPercent = Math.round(rhythm ? rhythm.operationalPercent : summary.percent);

            return `
                <div data-ui-action="show-project-detail" data-project-id="${projectId}" data-project-tone="${visualStatus.tone}" class="project-list-row ${project.is_archived ? 'is-archived' : ''}">
                    <div class="project-list-identity">
                        <span class="project-life-dot" aria-hidden="true" title="${escapeAttr(visualStatus.title)}"></span>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 min-w-0">
                                <h3>${escapeHtml(project.name)}</h3>
                                ${project.is_archived ? '<span class="project-list-archived">Archiviato</span>' : ''}
                            </div>
                            <p>${escapeHtml(project.client || 'Interno')}</p>
                        </div>
                    </div>
                    <div class="project-list-metric"><small>Costi</small><strong>${formatMoney(summary.totalCost, 0)}</strong></div>
                    <div class="project-list-metric"><small>Budget</small><strong>${formatMoney(summary.budget, 0)}</strong></div>
                    <div class="project-list-metric"><small>Margine</small><strong class="${summary.marginClass}">${formatMoney(summary.margin, 0)}</strong></div>
                    <div class="project-list-progress">
                        <div>
                            <span>${escapeHtml(visualStatus.label)}</span>
                            <small>Costi ${costPercent}%${rhythm ? ` · Piano ${progressPercent}%` : ''}</small>
                        </div>
                        <div class="project-list-progress-track">
                            <span class="${rhythm ? rhythm.barClass : summary.barClass}" style="width:${Math.min(costPercent, 100)}%"></span>
                            ${rhythm ? `<i class="${rhythm.markerClass}" style="left:calc(${Math.min(progressPercent, 100)}% - 2px)"></i>` : ''}
                        </div>
                    </div>
                    <div class="project-list-actions admin-only">
                        <button data-ui-action="toggle-project-archive" data-project-id="${projectId}" data-archived="${project.is_archived ? 'true' : 'false'}" title="${project.is_archived ? 'Ripristina progetto' : 'Archivia progetto'}" aria-label="${project.is_archived ? 'Ripristina progetto' : 'Archivia progetto'}"><i data-lucide="archive"></i></button>
                        <button data-ui-action="delete-project" data-project-id="${projectId}" title="Elimina progetto" aria-label="Elimina progetto"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>`;
        }

        function setProjectViewMode(mode) {
            if (!['grid', 'list'].includes(mode)) return;
            projectViewMode = mode;
            localStorage.setItem('archtime_project_view', mode);
            renderProjects();
        }

        function renderProjects() {
            const container = document.getElementById('projects-list');
            document.getElementById('project-select').innerHTML = projectSelectOptionsHtml();
            const visibleProjects = getVisibleProjects();
            container.className = projectViewMode === 'list'
                ? 'projects-list-view'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-4';
            document.querySelectorAll('[data-ui-action="set-project-view"]').forEach(button => {
                const isActive = button.dataset.projectView === projectViewMode;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            container.innerHTML = visibleProjects.length > 0
                ? visibleProjects.map(projectViewMode === 'list' ? projectListRowHtml : projectCardHtml).join('')
                : richEmptyStateHtml(
                    showArchived ? 'archive' : 'folder-plus',
                    showArchived ? 'Nessun progetto archiviato' : 'Nessun progetto attivo',
                    showArchived ? 'Quando archivierai lavori o cantieri, li ritroverai qui.' : 'Crea il primo lavoro per iniziare a registrare ore, costi e margini.',
                    showArchived ? '' : 'Crea progetto',
                    'data-tab="manage" data-ui-action="switch-tab"'
                );
            lucide.createIcons();
        }

        async function toggleArchive(id, status) { 
            await supabaseClient.from('projects').update({ is_archived: !status }).eq('id', id); 
            fetchProjects(); 
        }

        async function deleteProject(id) { 
            if(await appConfirm("Eliminazione Definitiva", "ATTENZIONE: Eliminando questo progetto verranno cancellate anche TUTTE le ore e le spese registrate al suo interno!\n\nSe vuoi conservare lo storico finanziario, chiudi questo avviso e usa il tasto 'Archivia' (icona a forma di scatola).\n\nSei sicuro di volerlo ELIMINARE PER SEMPRE?", "danger")) { 
                await supabaseClient.from('projects').delete().eq('id', id); 
                fetchProjects(); 
            } 
        }

        function toggleViewArchived() { 
            showArchived = !showArchived; 
            document.getElementById('toggle-archived-btn').innerText = showArchived ? "Nascondi Archiviati" : "Archivio"; 
            renderProjects(); 
        }

        // ================= TASK BUILDER E TEMPLATE =================


        function openTaskBuilder(mode) { 
            taskBuilderMode = mode; 
            tempBuilderTasks = mode === 'new' ? [...newProjectTasks] : [...editProjectTasks]; 
            renderTaskBuilder(); 
            document.getElementById('modal-task-builder').classList.remove('force-hide'); 
        }
        function closeTaskBuilder() { document.getElementById('modal-task-builder').classList.add('force-hide'); }

        function taskBuilderEmptyHtml() {
            return '<div class="text-[11px] font-bold text-center text-slate-400 uppercase tracking-wider py-4">Nessuna attività selezionata.</div>';
        }

        function taskBuilderMoveButtonHtml(index, direction, iconName) {
            return `<button data-ui-action="move-builder-task" data-task-index="${index}" data-direction="${direction}" class="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="${iconName}" class="w-4 h-4"></i></button>`;
        }

        function selectedBuilderTaskHtml(task, index) {
            return `
                    <div class="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm tag-enter">
                        <span class="text-xs font-bold text-slate-700 flex items-center gap-2.5"><span class="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100 font-black">${index + 1}</span> ${escapeHtml(task)}</span>
                        <div class="flex items-center gap-0.5">
                            ${index > 0 ? taskBuilderMoveButtonHtml(index, -1, 'chevron-up') : '<div class="w-7"></div>'}
                            ${index < tempBuilderTasks.length - 1 ? taskBuilderMoveButtonHtml(index, 1, 'chevron-down') : '<div class="w-7"></div>'}
                            <div class="w-[1px] h-4 bg-slate-200 mx-1.5"></div>
                            <button data-ui-action="remove-builder-task" data-task-index="${index}" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
        }

        function availableBuilderTaskHtml(task) {
            if(tempBuilderTasks.includes(task)) return '';
            return `<button data-ui-action="add-builder-task" data-task="${escapeAttr(task)}" class="bg-white border border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-sm tag-enter"><i data-lucide="plus" class="w-3 h-3 inline-block mr-1"></i>${escapeHtml(task)}</button>`;
        }

        function renderTaskBuilder() {
            const selectedContainer = document.getElementById('builder-selected-tasks');
            selectedContainer.innerHTML = tempBuilderTasks.length === 0
                ? taskBuilderEmptyHtml()
                : tempBuilderTasks.map(selectedBuilderTaskHtml).join('');
            document.getElementById('builder-catalog-tasks').innerHTML = activityCatalog.map(availableBuilderTaskHtml).join('');
            lucide.createIcons();
        }

        function moveTaskBuilder(idx, dir) { const temp = tempBuilderTasks[idx]; tempBuilderTasks[idx] = tempBuilderTasks[idx + dir]; tempBuilderTasks[idx + dir] = temp; renderTaskBuilder(); }
        function removeTaskBuilder(idx) { tempBuilderTasks.splice(idx, 1); renderTaskBuilder(); }
        function addTaskBuilder(task) { tempBuilderTasks.push(task); renderTaskBuilder(); }
        
        function confirmTaskBuilder() { 
            if(taskBuilderMode === 'new') { 
                newProjectTaskBudgets = collectVisibleTaskBudgets('new');
                newProjectTasks = [...tempBuilderTasks]; 
                newProjectTaskBudgets = Object.fromEntries(Object.entries(newProjectTaskBudgets).filter(([task]) => newProjectTasks.includes(task)));
                renderNewProjectUI(); 
            } else { 
                editProjectTaskBudgets = collectVisibleTaskBudgets('edit');
                editProjectTasks = [...tempBuilderTasks]; 
                editProjectTaskBudgets = Object.fromEntries(Object.entries(editProjectTaskBudgets).filter(([task]) => editProjectTasks.includes(task)));
                renderEditProjectTasks(); 
            } 
            closeTaskBuilder(); 
        }
        
        async function addNewTaskFromBuilder() {
            const input = document.getElementById('builder-new-task-input'); 
            const val = input.value.trim(); 
            if(!val) return;
            
            if(!activityCatalog.includes(val)) { 
                activityCatalog.push(val); 
                syncCatalogAndTemplatesToDB(); 
            }
            if(!tempBuilderTasks.includes(val)) { 
                tempBuilderTasks.push(val); 
            }
            input.value = ''; 
            renderTaskBuilder();
        }

        function openCatalogModal() { document.getElementById('modal-catalog').classList.remove('force-hide'); }
        function closeCatalogModal() { document.getElementById('modal-catalog').classList.add('force-hide'); cancelCatalogEdit(); }
        function openTemplatesModal() { if(activePlan === 'starter') return openUpgradeModal('Gestione Template'); document.getElementById('modal-templates').classList.remove('force-hide'); }
        function closeTemplatesModal() { document.getElementById('modal-templates').classList.add('force-hide'); cancelEditTemplate(); }

        async function syncCatalogAndTemplatesToDB() { 
            if(!studioData) return; 
            await supabaseClient.from('studios').update({ activity_catalog: activityCatalog, project_templates: projectTemplates }).eq('id', userProfile.studio_id); 
        }


        function catalogManageItemHtml(task) {
            return `
                <div class="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold tracking-wide tag-enter shadow-sm">
                    ${escapeHtml(task)} 
                    <div class="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                        <button data-ui-action="edit-catalog-task" data-task="${escapeAttr(task)}" class="text-slate-400 hover:text-primary-600 focus:outline-none transition-colors"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                        <button data-ui-action="remove-catalog-task" data-task="${escapeAttr(task)}" class="text-slate-400 hover:text-red-500 focus:outline-none transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>`;
        }

        function catalogPreviewItemHtml(task) {
            return `<span class="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">${escapeHtml(task)}</span>`;
        }

        function newTemplateCatalogTaskHtml(task) {
            const isSelected = newTemplateTasks.includes(task); 
            return `<button data-ui-action="toggle-template-task" data-task="${escapeAttr(task)}" class="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm tag-enter ${isSelected ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'}">${escapeHtml(task)}</button>`;
        }

        function inlineTemplateTaskHtml(task, index) {
            return `
                <div draggable="true" data-ui-action="template-task-drag" data-task-index="${index}" class="template-task-row grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-center bg-white border border-slate-200 rounded-xl px-2.5 py-2 shadow-sm cursor-grab active:cursor-grabbing touch-none">
                    <span class="text-slate-300"><i data-lucide="grip-vertical" class="w-4 h-4"></i></span>
                    <span class="min-w-0 text-[11px] font-bold text-slate-700 truncate"><span class="text-primary-600 font-black">${index + 1}.</span> ${escapeHtml(task)}</span>
                    <button type="button" data-ui-action="remove-inline-template-task" data-task-index="${index}" class="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                </div>`;
        }

        function templateTaskPillHtml(task) {
            return `<span class="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">${escapeHtml(task)}</span>`;
        }

        function getTaskBudgetInputValue(budgets, task) {
            const value = Number(budgets?.[task] || 0);
            return value > 0 ? String(value).replace('.', ',') : '';
        }

        function collectVisibleTaskBudgets(mode) {
            const selector = mode === 'edit' ? '[data-budget-mode="edit"]' : '[data-budget-mode="new"]';
            const budgets = {};
            document.querySelectorAll(selector).forEach(input => {
                const amount = parseMoneyInput(input.value);
                if (!isNaN(amount) && amount > 0) budgets[input.dataset.task] = amount;
            });
            return budgets;
        }

        function taskBudgetRowsHtml(tasks, budgets, mode) {
            if (!tasks || tasks.length === 0) return '';

            return `
                <div class="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Piano costi</span>
                        <span class="text-[9px] font-bold text-slate-400">Opzionale</span>
                    </div>
                    <div class="space-y-1.5">
                        ${tasks.map((task, index) => `
                            <div class="grid grid-cols-[minmax(0,1fr)_110px] gap-2 items-center">
                                <span class="text-[10px] font-bold text-slate-500 truncate"><span class="text-primary-600 font-black">${index + 1}.</span> ${escapeHtml(task)}</span>
                                <div class="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/10">
                                    <span class="text-[10px] font-black text-slate-400">€</span>
                                    <input type="text" data-budget-mode="${mode}" data-task="${escapeAttr(task)}" value="${escapeAttr(getTaskBudgetInputValue(budgets, task))}" placeholder="0" inputmode="decimal" class="task-budget-input w-full bg-transparent outline-none text-[11px] font-mono font-bold text-slate-700">
                                </div>
                            </div>`).join('')}
                    </div>
                </div>`;
        }

        function getCurrentProjectModalTasks() {
            return isProjectModalCreateMode() ? newProjectTasks : editProjectTasks;
        }

        function getCurrentProjectModalBudgets() {
            return isProjectModalCreateMode() ? newProjectTaskBudgets : editProjectTaskBudgets;
        }

        function setCurrentProjectModalTasks(tasks) {
            if (isProjectModalCreateMode()) newProjectTasks = tasks;
            else editProjectTasks = tasks;
        }

        function setCurrentProjectModalBudgets(budgets) {
            if (isProjectModalCreateMode()) newProjectTaskBudgets = budgets;
            else editProjectTaskBudgets = budgets;
        }

        function currentProjectBudgetMode() {
            return isProjectModalCreateMode() ? 'new' : 'edit';
        }

        function collectCurrentProjectTaskBudgets() {
            return collectVisibleTaskBudgets(currentProjectBudgetMode());
        }

        function getTaskBudgetsTotal(tasks = getCurrentProjectModalTasks(), budgets = collectCurrentProjectTaskBudgets()) {
            return tasks.reduce((sum, task) => sum + Number(budgets[task] || 0), 0);
        }

        function refreshProjectBudgetModeUI() {
            const isAuto = projectBudgetMode === 'auto';
            const manualButton = document.getElementById('budget-mode-manual');
            const autoButton = document.getElementById('budget-mode-auto');
            const budgetInput = document.getElementById('edit-modal-budget');
            const note = document.getElementById('project-budget-mode-note');

            if (manualButton) manualButton.className = isAuto
                ? 'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all text-slate-400 hover:text-slate-600'
                : 'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all bg-slate-900 text-white shadow-sm';
            if (autoButton) autoButton.className = isAuto
                ? 'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all bg-primary-600 text-white shadow-sm'
                : 'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all text-slate-400 hover:text-primary-600';
            if (budgetInput) {
                budgetInput.readOnly = isAuto;
                budgetInput.classList.toggle('text-slate-500', isAuto);
            }
            if (note) note.textContent = isAuto
                ? 'Budget calcolato dalla somma delle attività con importo. Le voci fuori piano non pesano sul ritmo.'
                : 'Budget libero: il ritmo considera le attività con lo stesso peso. Per pesi economici usa Somma attività.';
        }

        function setProjectBudgetMode(mode) {
            projectBudgetMode = mode === 'auto' ? 'auto' : 'manual';
            if (projectBudgetMode === 'auto') fillProjectBudgetFromTaskBudgets(false);
            refreshProjectBudgetModeUI();
            renderProjectModalTasks();
        }

        function syncProjectBudgetFromTaskBudgetsIfNeeded() {
            if (projectBudgetMode !== 'auto') return;
            const total = getTaskBudgetsTotal();
            const budgetInput = document.getElementById('edit-modal-budget');
            if (budgetInput) budgetInput.value = total > 0 ? total.toFixed(2) : '';
        }

        function inlineProjectTaskHtml(task, index, budgets, mode) {
            const budgetValue = Number(budgets?.[task] || 0);
            const isAutoBudget = projectBudgetMode === 'auto';
            return `
                <div draggable="true" data-ui-action="project-task-drag" data-task-index="${index}" class="project-task-row grid ${isAutoBudget ? 'grid-cols-[auto_minmax(0,1fr)_104px_auto]' : 'grid-cols-[auto_minmax(0,1fr)_auto]'} gap-2 items-center bg-white border border-slate-200 rounded-xl px-2.5 py-2 shadow-sm cursor-grab active:cursor-grabbing touch-none">
                    <span class="text-slate-300"><i data-lucide="grip-vertical" class="w-4 h-4"></i></span>
                    <div class="min-w-0">
                        <span class="block text-[11px] font-bold text-slate-700 truncate"><span class="text-primary-600 font-black">${index + 1}.</span> ${escapeHtml(task)}</span>
                        ${isAutoBudget ? `<span class="block text-[8px] font-black uppercase tracking-wider ${budgetValue > 0 ? 'text-primary-500' : 'text-slate-400'}">${budgetValue > 0 ? 'Pesa sul ritmo' : 'Fuori piano'}</span>` : ''}
                    </div>
                    ${isAutoBudget ? `
                    <div class="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus-within:bg-white focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/10" title="${budgetValue > 0 ? 'Importo usato come peso nel ritmo progetto' : 'Lascia vuoto se questa attività non deve pesare sul ritmo'}">
                        <span class="text-[10px] font-black text-slate-400">€</span>
                        <input type="text" data-budget-mode="${mode}" data-task="${escapeAttr(task)}" value="${escapeAttr(getTaskBudgetInputValue(budgets, task))}" placeholder="Fuori piano" inputmode="decimal" class="task-budget-input w-full bg-transparent outline-none text-[11px] font-mono font-bold text-slate-700 placeholder:text-[8px] placeholder:font-sans placeholder:uppercase placeholder:tracking-wider">
                    </div>` : ''}
                    <button type="button" data-ui-action="remove-inline-project-task" data-task-index="${index}" class="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                </div>`;
        }

        function renderInlineTaskPicker(tasks) {
            const select = document.getElementById('project-inline-task-select');
            if (!select) return;
            const availableTasks = activityCatalog.filter(task => !tasks.includes(task));
            select.innerHTML = availableTasks.length
                ? optionHtml('', 'Aggiungi attività dal catalogo', true, true) + availableTasks.map(task => optionHtml(task, task)).join('')
                : optionHtml('', 'Tutte le attività sono già incluse', true, true);
            select.disabled = availableTasks.length === 0;
        }

        function renderInlineTemplatePicker() {
            const select = document.getElementById('new-template-task-select');
            if (!select) return;
            const availableTasks = activityCatalog.filter(task => !newTemplateTasks.includes(task));
            select.innerHTML = availableTasks.length
                ? optionHtml('', 'Aggiungi attività dal catalogo', true, true) + availableTasks.map(task => optionHtml(task, task)).join('')
                : optionHtml('', 'Tutte le attività sono già incluse', true, true);
            select.disabled = availableTasks.length === 0;
        }

        function templateManageItemHtml(template, index) {
            return `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start group tag-enter">
                    <div>
                        <h4 class="font-black text-sm text-slate-800 mb-2 tracking-tight">${escapeHtml(template.name)}</h4>
                        <div class="flex flex-wrap gap-1.5">
                            ${template.tasks.map(templateTaskPillHtml).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button data-ui-action="edit-template" data-template-index="${index}" class="text-slate-400 hover:text-primary-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        <button data-ui-action="remove-template" data-template-index="${index}" class="text-slate-400 hover:text-red-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>`;
        }

        function renderCatalogAndTemplatesUI() {
            document.getElementById('catalog-manage-list').innerHTML = activityCatalog.map(catalogManageItemHtml).join('');
            
            const isEditCat = editingCatalogTask !== null;
            const btnAddCat = document.getElementById('btn-add-catalog');
            const btnCancelCat = document.getElementById('btn-cancel-catalog');
            if(btnAddCat) btnAddCat.innerText = isEditCat ? "Aggiorna" : "Aggiungi"; 
            if(btnCancelCat) isEditCat ? btnCancelCat.classList.remove('hidden') : btnCancelCat.classList.add('hidden');

            const legacyTemplateCatalog = document.getElementById('new-template-catalog-tasks');
            if (legacyTemplateCatalog) legacyTemplateCatalog.innerHTML = activityCatalog.map(newTemplateCatalogTaskHtml).join('');
            const catalogPreview = document.getElementById('studio-catalog-preview');
            if (catalogPreview) {
                const previewTasks = activityCatalog.slice(0, 8);
                catalogPreview.innerHTML = previewTasks.length
                    ? previewTasks.map(catalogPreviewItemHtml).join('') + (activityCatalog.length > previewTasks.length ? `<span class="text-[10px] bg-white text-slate-400 font-bold px-2 py-0.5 rounded-md border border-slate-200">+${activityCatalog.length - previewTasks.length}</span>` : '')
                    : '<span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nessuna attività nel catalogo.</span>';
            }
            const selectedTemplateTasks = document.getElementById('new-template-selected-tasks');
            if (selectedTemplateTasks) {
                selectedTemplateTasks.innerHTML = newTemplateTasks.length === 0
                    ? '<div class="text-[11px] font-bold text-center text-slate-400 uppercase tracking-wider py-4 bg-white border border-dashed border-slate-200 rounded-xl">Nessuna attività selezionata.</div>'
                    : newTemplateTasks.map(inlineTemplateTaskHtml).join('');
            }
            renderInlineTemplatePicker();
            document.getElementById('templates-manage-list').innerHTML = projectTemplates.map(templateManageItemHtml).join('');
            
            const isEditTpl = editingTemplateIndex !== null;
            const btnSaveTpl = document.getElementById('btn-save-template');
            const btnCancelTpl = document.getElementById('btn-cancel-edit-template');
            if(btnSaveTpl) btnSaveTpl.innerText = isEditTpl ? "Aggiorna" : "Salva Nuovo";
            if(btnCancelTpl) isEditTpl ? btnCancelTpl.classList.remove('hidden') : btnCancelTpl.classList.add('hidden');
            
            lucide.createIcons(); 
            renderNewProjectUI();
        }

        function editCatalogTask(task) { editingCatalogTask = task; document.getElementById('new-catalog-item').value = task; renderCatalogAndTemplatesUI(); }
        function cancelCatalogEdit() { editingCatalogTask = null; document.getElementById('new-catalog-item').value = ''; renderCatalogAndTemplatesUI(); }

        async function addActivityToCatalog() { 
            const val = document.getElementById('new-catalog-item').value.trim(); 
            if(!val) return; 
            
            if (editingCatalogTask !== null) {
                if (val !== editingCatalogTask && !activityCatalog.includes(val)) {
                    const idx = activityCatalog.indexOf(editingCatalogTask);
                    if (idx !== -1) activityCatalog[idx] = val;
                    projectTemplates.forEach(tpl => { const tIdx = tpl.tasks.indexOf(editingCatalogTask); if(tIdx !== -1) tpl.tasks[tIdx] = val; });
                    let ntIdx = newTemplateTasks.indexOf(editingCatalogTask); if(ntIdx !== -1) newTemplateTasks[ntIdx] = val;
                    let npIdx = newProjectTasks.indexOf(editingCatalogTask); if(npIdx !== -1) { newProjectTasks[npIdx] = val; if (newProjectTaskBudgets[editingCatalogTask]) { newProjectTaskBudgets[val] = newProjectTaskBudgets[editingCatalogTask]; delete newProjectTaskBudgets[editingCatalogTask]; } }
                    let epIdx = editProjectTasks.indexOf(editingCatalogTask); if(epIdx !== -1) { editProjectTasks[epIdx] = val; if (editProjectTaskBudgets[editingCatalogTask]) { editProjectTaskBudgets[val] = editProjectTaskBudgets[editingCatalogTask]; delete editProjectTaskBudgets[editingCatalogTask]; } }
                    let tbIdx = tempBuilderTasks.indexOf(editingCatalogTask); if(tbIdx !== -1) tempBuilderTasks[tbIdx] = val;
                    editingCatalogTask = null; document.getElementById('new-catalog-item').value = ''; renderCatalogAndTemplatesUI();
                    if(!document.getElementById('modal-task-builder').classList.contains('force-hide')) renderTaskBuilder();
                    await syncCatalogAndTemplatesToDB();
                } else if (val === editingCatalogTask) { cancelCatalogEdit(); } 
                else { await appAlert("Attenzione", "Questa voce esiste già nel catalogo.", "danger"); }
            } else {
                if(activityCatalog.includes(val)) return await appAlert("Attenzione", "Voce già presente.", "danger"); 
                activityCatalog.push(val); document.getElementById('new-catalog-item').value = ''; renderCatalogAndTemplatesUI(); await syncCatalogAndTemplatesToDB(); 
            }
        }

        async function removeActivityFromCatalog(task) { 
            if(await appConfirm("Elimina Voce", `Sei sicuro di voler eliminare "${task}" dal catalogo?\n(Verrà rimossa automaticamente anche dai Template che la utilizzano).`, "danger")) {
                if (editingCatalogTask === task) cancelCatalogEdit();
                activityCatalog = activityCatalog.filter(t => t !== task); newTemplateTasks = newTemplateTasks.filter(t => t !== task); newProjectTasks = newProjectTasks.filter(t => t !== task); editProjectTasks = editProjectTasks.filter(t => t !== task); tempBuilderTasks = tempBuilderTasks.filter(t => t !== task); delete newProjectTaskBudgets[task]; delete editProjectTaskBudgets[task]; projectTemplates.forEach(tpl => { tpl.tasks = tpl.tasks.filter(t => t !== task); });
                renderCatalogAndTemplatesUI(); if(!document.getElementById('modal-task-builder').classList.contains('force-hide')) renderTaskBuilder(); await syncCatalogAndTemplatesToDB(); 
            }
        }

        function toggleTaskInNewTemplate(task) { if(newTemplateTasks.includes(task)) newTemplateTasks = newTemplateTasks.filter(t => t !== task); else newTemplateTasks.push(task); renderCatalogAndTemplatesUI(); }
        function addInlineTemplateTask() {
            const select = document.getElementById('new-template-task-select');
            const task = select?.value;
            if (!task) return;
            if (!newTemplateTasks.includes(task)) newTemplateTasks.push(task);
            renderCatalogAndTemplatesUI();
        }

        async function createInlineTemplateTask() {
            const input = document.getElementById('new-template-inline-task');
            const val = input?.value.trim();
            if (!val) return;
            if (!activityCatalog.includes(val)) {
                activityCatalog.push(val);
                await syncCatalogAndTemplatesToDB();
            }
            if (!newTemplateTasks.includes(val)) newTemplateTasks.push(val);
            input.value = '';
            renderCatalogAndTemplatesUI();
        }

        function removeInlineTemplateTask(index) {
            newTemplateTasks = newTemplateTasks.filter((_, idx) => idx !== index);
            renderCatalogAndTemplatesUI();
        }

        function reorderInlineTemplateTasks(fromIndex, toIndex) {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= newTemplateTasks.length || toIndex >= newTemplateTasks.length) return;
            const tasks = [...newTemplateTasks];
            const [movedTask] = tasks.splice(fromIndex, 1);
            tasks.splice(toIndex, 0, movedTask);
            newTemplateTasks = tasks;
            renderCatalogAndTemplatesUI();
        }

        function editTemplate(index) { editingTemplateIndex = index; document.getElementById('new-template-name').value = projectTemplates[index].name; newTemplateTasks = [...projectTemplates[index].tasks]; renderCatalogAndTemplatesUI(); }
        function cancelEditTemplate() { editingTemplateIndex = null; document.getElementById('new-template-name').value = ''; newTemplateTasks = []; renderCatalogAndTemplatesUI(); }

        async function saveNewTemplate() { 
            const name = document.getElementById('new-template-name').value.trim(); 
            if(!name || newTemplateTasks.length === 0) return await appAlert("Attenzione", "Inserisci un nome e seleziona almeno un'attività.", "danger"); 
            if(editingTemplateIndex !== null) { projectTemplates[editingTemplateIndex] = { name: name, tasks: [...newTemplateTasks] }; editingTemplateIndex = null; } else { projectTemplates.push({ name: name, tasks: [...newTemplateTasks] }); }
            document.getElementById('new-template-name').value = ''; newTemplateTasks = []; renderCatalogAndTemplatesUI(); await syncCatalogAndTemplatesToDB(); 
        }
        
        async function removeTemplate(index) { if(await appConfirm("Elimina Template", "Sei sicuro di voler eliminare questo template? L'operazione non può essere annullata.", "danger")) { if(editingTemplateIndex === index) cancelEditTemplate(); projectTemplates.splice(index, 1); renderCatalogAndTemplatesUI(); await syncCatalogAndTemplatesToDB(); } }

        function isProjectModalCreateMode() {
            return !document.getElementById('edit-modal-proj-id')?.value;
        }

        function setProjectModalMode(mode) {
            const isCreate = mode === 'create';
            const title = document.getElementById('project-modal-title');
            const desc = document.getElementById('project-modal-desc');
            const saveButton = document.getElementById('btn-save-project-edit');
            if (title) {
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', isCreate ? 'folder-plus' : 'edit-3');
                icon.className = 'text-primary-500 w-5 h-5';
                title.replaceChildren(icon, document.createTextNode(isCreate ? ' Nuovo progetto' : ' Modifica progetto'));
            }
            if (desc) desc.textContent = isCreate ? 'Imposta anagrafica, budget e flusso di lavoro in un unico passaggio.' : 'Aggiorna anagrafica, budget e attività incluse.';
            if (saveButton) saveButton.textContent = isCreate ? 'Crea progetto' : 'Salva modifiche';
        }

        function openCreateProjectModal() {
            if (activePlan === 'starter') {
                const activeCount = projects.filter(p => p.is_archived !== true).length;
                if (activeCount >= 5) return openUpgradeModal('Lavori Illimitati');
            }
            document.getElementById('edit-modal-proj-id').value = '';
            document.getElementById('edit-modal-name').value = '';
            document.getElementById('edit-modal-client').value = '';
            document.getElementById('edit-modal-budget').value = '';
            newProjectTasks = [];
            newProjectTaskBudgets = {};
            setProjectBudgetMode('manual');
            setProjectModalMode('create');
            renderNewProjectUI();
            document.getElementById('modal-edit-project').classList.remove('force-hide');
            lucide.createIcons();
        }

        function renderProjectModalTasks() {
            const selectedContainer = document.getElementById('edit-proj-selected-tasks');
            if (!selectedContainer) return;
            const tasks = getCurrentProjectModalTasks();
            const budgets = getCurrentProjectModalBudgets();
            const mode = currentProjectBudgetMode();
            if (tasks.length === 0) selectedContainer.innerHTML = '<div class="text-[11px] font-bold text-center text-slate-400 uppercase tracking-wider py-4">Nessuna attività configurata.</div>';
            else selectedContainer.innerHTML = tasks.map((task, idx) => inlineProjectTaskHtml(task, idx, budgets, mode)).join('');
            renderInlineTaskPicker(tasks);
            syncProjectBudgetFromTaskBudgetsIfNeeded();
        }

        function renderNewProjectUI() {
            const selectTpl = document.getElementById('new-proj-template');
            if (selectTpl) {
                if(activePlan === 'starter') { selectTpl.innerHTML = optionHtml('', 'I Template sono nel piano PREMIUM', true, true); selectTpl.disabled = true; selectTpl.classList.add('locked-feature'); } 
                else { selectTpl.innerHTML = optionHtml('', '-- Scegli da un Template --', true, true) + projectTemplates.map((t, i) => optionHtml(i, t.name)).join(''); selectTpl.disabled = false; selectTpl.classList.remove('locked-feature'); }
            }
            renderProjectModalTasks();
            lucide.createIcons();
        }

        function applyTemplateToNewProject() {
            if(activePlan==='starter') return;
            const val = document.getElementById('new-proj-template').value;
            const templateTasks = val !== "" ? [...projectTemplates[val].tasks] : [];
            if (isProjectModalCreateMode()) {
                newProjectTasks = templateTasks;
                newProjectTaskBudgets = {};
            } else {
                editProjectTasks = templateTasks;
                editProjectTaskBudgets = {};
            }
            renderProjectModalTasks();
            lucide.createIcons();
        }

        function addInlineProjectTask() {
            const select = document.getElementById('project-inline-task-select');
            const task = select?.value;
            if (!task) return;
            const tasks = getCurrentProjectModalTasks();
            if (!tasks.includes(task)) setCurrentProjectModalTasks([...tasks, task]);
            renderProjectModalTasks();
            lucide.createIcons();
        }

        async function createInlineProjectTask() {
            const input = document.getElementById('project-inline-new-task');
            const val = input?.value.trim();
            if (!val) return;
            if (!activityCatalog.includes(val)) {
                activityCatalog.push(val);
                await syncCatalogAndTemplatesToDB();
            }
            const tasks = getCurrentProjectModalTasks();
            if (!tasks.includes(val)) setCurrentProjectModalTasks([...tasks, val]);
            input.value = '';
            renderCatalogAndTemplatesUI();
            renderProjectModalTasks();
            lucide.createIcons();
        }

        function removeInlineProjectTask(index) {
            const tasks = getCurrentProjectModalTasks();
            const budgets = collectCurrentProjectTaskBudgets();
            const removedTask = tasks[index];
            const nextTasks = tasks.filter((_, idx) => idx !== index);
            delete budgets[removedTask];
            setCurrentProjectModalTasks(nextTasks);
            setCurrentProjectModalBudgets(budgets);
            renderProjectModalTasks();
            lucide.createIcons();
        }

        function reorderInlineProjectTasks(fromIndex, toIndex) {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
            const tasks = [...getCurrentProjectModalTasks()];
            if (fromIndex >= tasks.length || toIndex >= tasks.length) return;
            const budgets = collectCurrentProjectTaskBudgets();
            const [movedTask] = tasks.splice(fromIndex, 1);
            tasks.splice(toIndex, 0, movedTask);
            setCurrentProjectModalTasks(tasks);
            setCurrentProjectModalBudgets(budgets);
            renderProjectModalTasks();
            lucide.createIcons();
        }

        function fillProjectBudgetFromTaskBudgets(switchMode = true) {
            const budgets = collectCurrentProjectTaskBudgets();
            setCurrentProjectModalBudgets(budgets);
            const total = getTaskBudgetsTotal(getCurrentProjectModalTasks(), budgets);
            const budgetInput = document.getElementById('edit-modal-budget');
            if (budgetInput) budgetInput.value = total > 0 ? total.toFixed(2) : '';
            if (switchMode) setProjectBudgetMode('auto');
        }

        async function createNewProject() {
            if (activePlan === 'starter') {
                const activeCount = projects.filter(p => p.is_archived !== true).length;
                if (activeCount >= 5) return openUpgradeModal('Lavori Illimitati');
            }
            if (projectBudgetMode === 'auto') fillProjectBudgetFromTaskBudgets(false);
            const name = document.getElementById('edit-modal-name').value.trim(); const client = document.getElementById('edit-modal-client').value.trim(); const budget = parseFloat(document.getElementById('edit-modal-budget').value) || 0;
            if(!name) return await appAlert("Attenzione", "Inserisci il nome del lavoro", "danger"); 
            if(newProjectTasks.length === 0) return await appAlert("Attenzione", "Configura almeno un'attività", "danger");
            newProjectTaskBudgets = collectVisibleTaskBudgets('new');
            
            const payload = { name: name, client: client, budget: budget, tasks: [...newProjectTasks], studio_id: userProfile.studio_id };
            if (Object.keys(newProjectTaskBudgets).length > 0) payload.task_budgets = newProjectTaskBudgets;

            if (typeof isVideoDemoMode === 'function' && isVideoDemoMode()) {
                projects.unshift({
                    id: `video-demo-${Date.now()}`,
                    ...payload,
                    is_archived: false,
                    task_statuses: {}
                });
                closeEditProjectModal();
                renderProjects();
                await appAlert("Fatto", "Lavoro creato nella dimostrazione", "success");
                return;
            }

            const { error } = await supabaseClient.from('projects').insert([payload]);
            if (error) return await appAlert("Configurazione richiesta", "Per salvare il Piano costi va prima aggiunta la colonna task_budgets in Supabase. Puoi lasciare vuoti i campi Piano costi oppure eseguire lo script SQL dedicato.", "danger");
            if (typeof clearMarginCalculatorHandoff === 'function') clearMarginCalculatorHandoff();
            window.archTimeAnalytics?.track('project_created', {
                has_budget: budget > 0,
                task_count: newProjectTasks.length
            });
            
            document.getElementById('edit-modal-name').value = ""; 
            document.getElementById('edit-modal-client').value = ""; 
            document.getElementById('edit-modal-budget').value = ""; 
            document.getElementById('new-proj-template').value = ""; 
            newProjectTasks = [];
            newProjectTaskBudgets = {};
            setProjectBudgetMode('manual');
            
            renderNewProjectUI(); 
            fetchProjects(); 
            closeEditProjectModal();
            await appAlert("Fatto", "Lavoro Creato!", "success"); 
            switchAppTab('operate');
        }


        function getProjectDetailData(id) {
            const project = projects.find(x => x.id === id);
            if (!project) return null;

            const projectEntries = entries.filter(e => e.project_id === id);
            const projectExpenses = expenses.filter(ex => ex.project_id === id);
            const totalHours = projectEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
            const totalHoursCost = projectEntries.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            const totalExpenses = projectExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
            const totalSpent = totalHoursCost + totalExpenses;
            const effectiveRate = totalHours > 0 ? (project.budget - totalExpenses) / totalHours : 0;
            const taskStats = {};
            const teamStats = {};

            if (project.tasks && project.tasks.length > 0) {
                project.tasks.forEach(task => { taskStats[task] = { h: 0, c: 0 }; });
            }

            projectEntries.forEach(entry => {
                const taskName = entry.task || 'Altro';
                const member = entry.user_name || (entry.user_email ? entry.user_email.split('@')[0] : 'Sconosciuto');

                if (!taskStats[taskName]) taskStats[taskName] = { h: 0, c: 0 };
                taskStats[taskName].h += Number(entry.duration || 0);
                taskStats[taskName].c += Number(entry.rate || 0);

                if (!teamStats[member]) teamStats[member] = { h: 0, c: 0 };
                teamStats[member].h += Number(entry.duration || 0);
                teamStats[member].c += Number(entry.rate || 0);
            });

            return { project, projectExpenses, totalHours, totalHoursCost, totalExpenses, totalSpent, effectiveRate, taskStats, teamStats };
        }

        function renderProjectDetailActions(project) {
            const projectId = escapeAttr(project.id);
            const pdfButton = activePlan === 'starter'
                ? `<button data-ui-action="upgrade-project-pdf" class="w-full sm:w-auto text-xs font-bold bg-white text-slate-400 border border-slate-200 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition opacity-60 shadow-sm"><i data-lucide="lock" class="w-4 h-4"></i> Report PDF</button>`
                : `<button data-ui-action="export-project-pdf" data-project-id="${projectId}" class="w-full sm:w-auto text-xs font-bold bg-white text-primary-600 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:border-primary-200 hover:bg-primary-50 flex items-center justify-center gap-2 shadow-sm transition-all"><i data-lucide="file-text" class="w-4 h-4"></i> Esporta in PDF</button>`;

            return `
                <div class="admin-only w-full max-w-xs mx-auto lg:mx-0 lg:max-w-none lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
                    <button data-ui-action="edit-project" data-project-id="${projectId}" class="w-full sm:w-auto text-xs font-bold bg-white text-slate-600 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm transition-all"><i data-lucide="edit" class="w-4 h-4"></i> Modifica</button>
                    ${pdfButton}
                </div>`;
        }

        function renderProjectDetailHeader(project) {
            const summary = getProjectCostSummary(project);
            const visualStatus = getProjectVisualStatus(project, summary);
            return `
            <div class="project-detail-header bg-slate-50 border border-slate-200 rounded-2xl p-3 lg:p-4 mb-4">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2">
                <div class="min-w-0">
                    <span class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full mb-1.5 ${visualStatus.className}"><i data-lucide="${visualStatus.icon}" class="w-3 h-3"></i>${visualStatus.label}</span>
                    <h2 class="text-lg lg:text-xl font-black text-slate-800 mb-0.5 leading-tight tracking-tight">${escapeHtml(project.name)}</h2>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${escapeHtml(project.client || 'Interno')}</p>
                </div>
                ${renderProjectDetailActions(project)}
            </div>
            </div>`;
        }

        function metricCardHtml(label, valueHtml, colorClass = 'text-slate-800') {
            return `
                <div class="project-metric-card bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center shadow-sm min-h-[58px]">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(label)}</p>
                    <p class="text-base lg:text-lg font-black ${colorClass} mt-1 tracking-tight">${valueHtml}</p>
                </div>`;
        }

        function renderProjectMetrics(data) {
            const budgetHint = `<span class="text-[10px] text-slate-400">/ ${formatMoney(data.project.budget, 0)}</span>`;
            const hoursHint = `<span class="text-[10px] text-slate-400">(${formatTime(data.totalHours)})</span>`;
            const rateClass = data.effectiveRate > 0 ? 'text-emerald-500' : 'text-red-500';

            return `
            <div class="project-detail-metrics grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-2">
                ${metricCardHtml('Spesa totale', `${formatMoney(data.totalSpent, 0)} ${budgetHint}`, 'text-primary-600')}
                ${metricCardHtml('Costo team', `${formatMoney(data.totalHoursCost, 0)} ${hoursHint}`)}
                ${metricCardHtml('Spese extra', formatMoney(data.totalExpenses, 0), 'text-amber-600')}
                ${metricCardHtml('Resa oraria', `${formatMoney(data.effectiveRate, 2)} <span class="text-[10px] text-slate-400">/h</span>`, rateClass)}
            </div>`;
        }

        function compactTaskCostBarHtml(stat, budget, isZero) {
            const percent = budget > 0 ? Math.min((stat.c / budget) * 100, 100).toFixed(1) : 0;
            return `
                <div class="project-task-progress w-full lg:max-w-[122px] lg:justify-self-start">
                    <div class="flex justify-between items-center gap-2 mb-1">
                        <span class="text-[10px] font-mono font-black text-slate-600">${formatMoney(stat.c, 0)}</span>
                        <span class="text-[9px] font-bold text-slate-400">${formatTime(stat.h)}</span>
                    </div>
                    <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div class="${isZero ? 'bg-slate-200' : 'bg-primary-500'} h-full" style="width: ${percent}%"></div>
                    </div>
                </div>`;
        }

        function compactTaskBudgetHtml(stat, taskBudget) {
            if (!taskBudget || taskBudget <= 0) {
                return `<span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Eff. ${formatMoney(stat.c, 0)} · ${formatTime(stat.h)}</span>`;
            }

            const delta = Number(stat.c || 0) - Number(taskBudget || 0);
            const deltaClass = delta > 0.01 ? 'text-red-600' : (delta < -0.01 ? 'text-emerald-600' : 'text-slate-400');
            const deltaLabel = Math.abs(delta) < 0.01 ? 'in linea' : `${delta > 0 ? '+' : '-'}${formatMoney(Math.abs(delta), 0)}`;

            return `
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prev. ${formatMoney(taskBudget, 0)} · Eff. ${formatMoney(stat.c, 0)}</span>
                <span class="text-[9px] font-black ${deltaClass} mt-0.5">${deltaLabel}</span>`;
        }

        function taskStatusButtonHtml(projectId, taskName, value, label, activeValue) {
            const isActive = activeValue === value;
            const activeClass = value === 'done'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : (value === 'doing' ? 'bg-primary-600 text-white border-primary-600' : 'bg-slate-200 text-slate-700 border-slate-200');
            const idleClass = 'bg-white text-slate-500 border-slate-200 hover:border-primary-200 hover:text-primary-600';

            return `<button data-ui-action="set-task-status" data-project-id="${escapeAttr(projectId)}" data-task="${escapeAttr(taskName)}" data-status="${value}" class="px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${isActive ? activeClass : idleClass}">${label}</button>`;
        }

        function renderProjectRhythmPanel(data) {
            const rhythm = getProjectRhythmSummary(data.project);
            if (!rhythm) return '';

            const tasks = data.project.tasks || [];
            const rows = tasks.map(taskName => {
                const stat = data.taskStats[taskName] || { h: 0, c: 0 };
                const status = rhythm.statuses[taskName] || 'todo';
                const taskBudget = Number(rhythm.budgets[taskName] || 0);
                const isZero = Number(stat.h || 0) === 0 && Number(stat.c || 0) === 0;
                return `
                    <div class="project-rhythm-row grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_170px_282px] gap-3 items-center bg-white border border-slate-200 rounded-xl px-2.5 py-2 shadow-sm">
                        <div class="min-w-0">
                            <p class="text-xs font-black ${isZero ? 'text-slate-400' : 'text-slate-800'} truncate">${escapeHtml(taskName)}</p>
                            <div class="flex flex-col mt-0.5">${compactTaskBudgetHtml(stat, taskBudget)}</div>
                        </div>
                        ${compactTaskCostBarHtml(stat, data.project.budget, isZero)}
                        <div class="project-task-status-grid grid grid-cols-3 gap-1.5 lg:justify-self-end w-full lg:max-w-[282px]">
                            ${taskStatusButtonHtml(data.project.id, taskName, 'todo', 'Da fare', status)}
                            ${taskStatusButtonHtml(data.project.id, taskName, 'doing', 'In corso', status)}
                            ${taskStatusButtonHtml(data.project.id, taskName, 'done', 'Completata', status)}
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="project-rhythm-panel admin-only bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mb-4">
                    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                        <div>
                            <h3 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="activity" class="w-3.5 h-3.5"></i> Ritmo progetto</h3>
                            <p class="text-xs text-slate-500 font-medium mt-1">${rhythm.description}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-2">
                            <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">Costi consumati</p>
                            <p class="text-lg font-black text-slate-800 mt-1">${Math.round(rhythm.costPercent)}%</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-2">
                            <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">${rhythm.usesTaskBudgets ? 'Piano costi avanzato' : 'Attività avanzate'}</p>
                            <p class="text-lg font-black text-slate-800 mt-1">${Math.round(rhythm.operationalPercent)}%</p>
                        </div>
                    </div>
                    <div class="relative w-full bg-slate-100 h-2 rounded-full mb-3">
                        <div class="${rhythm.barClass} h-full rounded-full" style="width: ${Math.min(rhythm.costPercent, 100)}%"></div>
                        <span class="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-full ${rhythm.markerClass} shadow-sm" style="left: calc(${Math.min(rhythm.operationalPercent, 100)}% - 3px)"></span>
                    </div>
                    <div class="flex justify-between items-center mb-2">
                        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Attività</p>
                        <p class="text-[10px] font-bold text-slate-400 hidden lg:block">Costo / ore / stato</p>
                    </div>
                    <div class="space-y-2">${rows}</div>
                    <p class="text-[10px] text-slate-400 font-medium mt-4 leading-relaxed">Indicatore sperimentale: confronta i costi già consumati con ${rhythm.usesTaskBudgets ? 'il piano costi e lo stato delle attività' : 'lo stato dichiarato delle attività'}. Serve come allarme operativo, non come percentuale contabile del progetto.</p>
                </div>`;
        }

        function renderTeamStats(teamStats) {
            const rows = Object.keys(teamStats).map(member => `
                            <div class="flex justify-between items-center bg-white px-2.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                                <span class="font-bold text-slate-700 text-xs uppercase tracking-wide">${escapeHtml(member)}</span>
                                <div class="text-right">
                                    <p class="text-[11px] font-mono font-bold text-primary-600">${formatTime(teamStats[member].h)}</p>
                                    <p class="text-[10px] font-mono font-black text-slate-400 admin-only">${formatMoney(teamStats[member].c, 2)}</p>
                                </div>
                            </div>`).join('');

            return `
                    <div class="project-side-panel bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                        <h3 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2 flex items-center gap-1.5"><i data-lucide="users" class="w-3.5 h-3.5"></i> Per membro team</h3>
                        <div class="space-y-1.5">${rows}</div>
                    </div>`;
        }

        function renderExpenseRows(expensesList, projectId) {
            if (expensesList.length === 0) {
                return richEmptyStateHtml('receipt', 'Nessuna spesa registrata', 'Aggiungi le spese vive per leggere il margine reale del lavoro.');
            }

            return expensesList.map(expense => `
                        <div class="bg-white px-2.5 py-2 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm group">
                            <div class="min-w-0 pr-3">
                                <p class="text-xs font-bold text-slate-700">${escapeHtml(expense.description)}</p>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">${new Date(expense.created_at).toLocaleDateString()} • ${escapeHtml(expense.user_name)}</p>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <span class="font-black text-amber-600 text-sm tracking-tight">${formatMoney(expense.amount, 2)}</span>
                                <button data-ui-action="edit-expense" data-expense-id="${escapeAttr(expense.id)}" data-project-id="${projectId}" class="text-slate-300 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-lg transition-colors"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                                <button data-ui-action="delete-expense" data-expense-id="${escapeAttr(expense.id)}" data-project-id="${projectId}" class="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </div>`).join('');
        }

        function renderExpensesPanel(expensesList, projectId) {
            return `
                <div class="project-side-panel admin-only bg-slate-50 rounded-2xl p-3 border border-slate-200 shadow-sm">
                    <h3 class="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2 flex items-center gap-2"><i data-lucide="receipt" class="w-4 h-4 text-amber-500"></i> Spese vive</h3>
                    <div class="flex gap-2 mb-3">
                        <input type="text" id="exp-desc" placeholder="Es. Oneri o Materiali" class="flex-1 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all bg-white">
                        <div class="w-24 relative flex items-center">
                            <span class="absolute left-3 text-slate-400 font-bold text-xs">€</span>
                            <input type="number" step="0.01" id="exp-amount" placeholder="0.00" class="w-full border border-slate-200 rounded-xl p-3 pl-6 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold bg-white">
                        </div>
                        <button data-ui-action="add-expense" data-project-id="${projectId}" class="bg-amber-500 text-white px-3.5 rounded-xl hover:bg-amber-600 transition-all shadow-sm active:scale-95"><i data-lucide="plus" class="w-4 h-4"></i></button>
                    </div>
                    <div class="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">${renderExpenseRows(expensesList, projectId)}</div>
                </div>`;
        }

        function renderProjectAnalyticsPanel(data) {
            const projectId = escapeAttr(data.project.id);
            return `
                <div class="project-analytics-shell admin-only mb-4">
                    <button type="button" class="project-analytics-toggle" data-ui-action="toggle-project-analytics" data-project-id="${projectId}" aria-expanded="false" aria-controls="project-analytics-content">
                        <span class="project-analytics-icon"><i data-lucide="chart-no-axes-combined"></i></span>
                        <span class="project-analytics-heading">
                            <strong>Grafici commessa</strong>
                            <small>${formatTime(data.totalHours)} registrate · ${formatMoney(data.totalSpent, 0)} rilevati</small>
                        </span>
                        <span class="project-analytics-action">
                            <span id="project-analytics-toggle-label">Apri grafici</span>
                            <i data-lucide="chevron-down"></i>
                        </span>
                    </button>
                    <div id="project-analytics-content" class="project-analytics-content force-hide">
                        <div class="project-analytics-chart-panel">
                            <div class="project-analytics-chart-heading">
                                <h3>Costi per settimana</h3>
                                <p>Ore valorizzate e spese extra nelle ultime 8 settimane.</p>
                            </div>
                            <div class="project-analytics-chart-wrap"><canvas id="project-chart-costs"></canvas></div>
                            <div id="project-chart-costs-empty" class="project-analytics-empty force-hide"><i data-lucide="bar-chart-3"></i><span>I costi compariranno dopo le prime registrazioni.</span></div>
                        </div>
                        <div class="project-analytics-chart-panel">
                            <div class="project-analytics-chart-heading">
                                <h3>Ore per attività</h3>
                                <p>Distribuzione del tempo impiegato nella commessa.</p>
                            </div>
                            <div class="project-analytics-chart-wrap"><canvas id="project-chart-tasks"></canvas></div>
                            <div id="project-chart-tasks-empty" class="project-analytics-empty force-hide"><i data-lucide="timer-reset"></i><span>Registra delle ore per visualizzare le attività.</span></div>
                        </div>
                    </div>
                </div>`;
        }

        function destroyProjectAnalyticsCharts() {
            ['projectCosts', 'projectTasks'].forEach(chartKey => {
                if (!charts[chartKey]) return;
                charts[chartKey].destroy();
                charts[chartKey] = null;
            });
        }

        function toggleProjectAnalytics(projectId) {
            const content = document.getElementById('project-analytics-content');
            const button = document.querySelector('[data-ui-action="toggle-project-analytics"]');
            const label = document.getElementById('project-analytics-toggle-label');
            if (!content || !button) return;

            const shouldOpen = content.classList.contains('force-hide');
            content.classList.toggle('force-hide', !shouldOpen);
            button.classList.toggle('is-open', shouldOpen);
            button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            if (label) label.innerText = shouldOpen ? 'Chiudi grafici' : 'Apri grafici';

            if (shouldOpen) setTimeout(() => renderProjectAnalytics(projectId), 30);
            else destroyProjectAnalyticsCharts();
        }

        function renderProjectAnalytics(projectId) {
            const data = getProjectDetailData(projectId);
            if (!data || document.getElementById('project-analytics-content')?.classList.contains('force-hide')) return;

            const projectEntries = entries.filter(entry => entry.project_id === projectId);
            const projectExpenses = expenses.filter(expense => expense.project_id === projectId);
            const theme = THEMES[currentBusinessType];
            const gridColor = '#e8edf2';
            const tickFont = { size: 9, weight: '600' };
            const tooltip = {
                backgroundColor: '#0f172a',
                titleFont: { weight: 'bold', size: 11 },
                bodyFont: { weight: '600', size: 10 },
                padding: 9,
                cornerRadius: 7
            };

            const currentWeekStart = new Date();
            currentWeekStart.setHours(0, 0, 0, 0);
            const currentDay = currentWeekStart.getDay() || 7;
            currentWeekStart.setDate(currentWeekStart.getDate() - currentDay + 1);
            const firstWeek = new Date(currentWeekStart);
            firstWeek.setDate(firstWeek.getDate() - 7 * 7);
            const weeklyCosts = Array.from({ length: 8 }, (_, index) => {
                const weekStart = new Date(firstWeek);
                weekStart.setDate(firstWeek.getDate() + index * 7);
                const nextWeek = new Date(weekStart);
                nextWeek.setDate(weekStart.getDate() + 7);
                const labor = projectEntries
                    .filter(entry => {
                        const date = new Date(entry.created_at);
                        return date >= weekStart && date < nextWeek;
                    })
                    .reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
                const extras = projectExpenses
                    .filter(expense => {
                        const date = new Date(expense.created_at);
                        return date >= weekStart && date < nextWeek;
                    })
                    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
                return {
                    label: index === 7 ? 'Questa' : weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                    labor,
                    extras
                };
            });
            const taskRows = Object.entries(data.taskStats)
                .filter(([, stat]) => Number(stat.h || 0) > 0)
                .sort((a, b) => Number(b[1].h || 0) - Number(a[1].h || 0))
                .slice(0, 6);

            const toggleEmpty = (chartKey, canvasId, emptyId, hasData) => {
                const canvas = document.getElementById(canvasId);
                const empty = document.getElementById(emptyId);
                canvas?.parentElement?.classList.toggle('force-hide', !hasData);
                empty?.classList.toggle('force-hide', hasData);
                if (!hasData && charts[chartKey]) {
                    charts[chartKey].destroy();
                    charts[chartKey] = null;
                }
                return hasData && canvas;
            };

            const hasCosts = weeklyCosts.some(week => week.labor > 0 || week.extras > 0);
            if (charts.projectCosts) charts.projectCosts.destroy();
            if (toggleEmpty('projectCosts', 'project-chart-costs', 'project-chart-costs-empty', hasCosts)) {
                charts.projectCosts = new Chart(document.getElementById('project-chart-costs'), {
                    type: 'bar',
                    data: {
                        labels: weeklyCosts.map(week => week.label),
                        datasets: [
                            { label: 'Lavoro', data: weeklyCosts.map(week => week.labor), backgroundColor: theme.chartMainColor, borderRadius: 3, borderSkipped: false },
                            { label: 'Spese extra', data: weeklyCosts.map(week => week.extras), backgroundColor: '#f59e0b', borderRadius: 3, borderSkipped: false }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { stacked: true, grid: { display: false }, ticks: { font: tickFont, maxRotation: 0 } },
                            y: { stacked: true, beginAtZero: true, grid: { color: gridColor }, ticks: { callback: value => formatMoney(value, 0), font: tickFont } }
                        },
                        plugins: {
                            legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 7, boxHeight: 7, padding: 12, font: tickFont } },
                            tooltip: { ...tooltip, callbacks: { label: context => `${context.dataset.label}: ${formatMoney(context.raw, 0)}` } }
                        }
                    }
                });
            }

            const hasTasks = taskRows.length > 0;
            if (charts.projectTasks) charts.projectTasks.destroy();
            if (toggleEmpty('projectTasks', 'project-chart-tasks', 'project-chart-tasks-empty', hasTasks)) {
                charts.projectTasks = new Chart(document.getElementById('project-chart-tasks'), {
                    type: 'bar',
                    data: {
                        labels: taskRows.map(([task]) => task.length > 20 ? `${task.slice(0, 19)}…` : task),
                        datasets: [{ label: 'Ore', data: taskRows.map(([, stat]) => stat.h), backgroundColor: theme.chartMainColor, borderRadius: 4, barThickness: 11 }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { beginAtZero: true, grid: { color: gridColor }, ticks: { callback: value => `${value}h`, font: tickFont } },
                            y: { grid: { display: false }, ticks: { font: tickFont } }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                ...tooltip,
                                callbacks: {
                                    title: items => taskRows[items[0].dataIndex][0],
                                    label: context => {
                                        const stat = taskRows[context.dataIndex][1];
                                        return `${formatTime(stat.h)} · ${formatMoney(stat.c, 0)}`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            lucide.createIcons();
        }

        function renderProjectDetail(data) {
            const projectId = escapeAttr(data.project.id);
            return `
            ${renderProjectDetailHeader(data.project)}
            ${renderProjectMetrics(data)}
            ${renderProjectAnalyticsPanel(data)}
            ${renderProjectRhythmPanel(data)}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 pb-5 lg:pb-0">
                <div class="space-y-4">
                    ${renderTeamStats(data.teamStats)}
                </div>
                ${renderExpensesPanel(data.projectExpenses, projectId)}
            </div>`;
        }

        function showProjectDetail(id) {
            const data = getProjectDetailData(id);
            if (!data) return;
            destroyProjectAnalyticsCharts();
            document.getElementById('detail-content').innerHTML = renderProjectDetail(data);
            document.getElementById('modal-detail').classList.remove('force-hide');
            lucide.createIcons();
        }

        function closeDetail() {
            destroyProjectAnalyticsCharts();
            document.getElementById('modal-detail').classList.add('force-hide');
        }

        async function setTaskStatus(projectId, taskName, status) {
            const project = projects.find(item => item.id === projectId);
            if (!project || !['todo', 'doing', 'done'].includes(status)) return;

            const currentStatuses = getProjectTaskStatuses(project);
            currentStatuses[taskName] = status;

            const { error } = await supabaseClient
                .from('projects')
                .update({ task_statuses: currentStatuses })
                .eq('id', projectId)
                .eq('studio_id', userProfile.studio_id);

            if (error) {
                return await appAlert(
                    'Configurazione richiesta',
                    'Per salvare lo stato delle attività va prima aggiunta la colonna task_statuses nella tabella projects. Ti preparo lo SQL da eseguire su Supabase.',
                    'danger'
                );
            }

            project.task_statuses = currentStatuses;
            renderProjects();
            showProjectDetail(projectId);
        }

        function openEditExpenseModal(expenseId, projectId) {
            const expense = expenses.find(item => item.id === expenseId);
            if (!expense) return;

            document.getElementById('edit-expense-id').value = expense.id;
            document.getElementById('edit-expense-project-id').value = projectId || expense.project_id;
            document.getElementById('edit-expense-desc').value = expense.description || '';
            document.getElementById('edit-expense-amount').value = Number(expense.amount || 0).toFixed(2);
            document.getElementById('modal-edit-expense').classList.remove('force-hide');
            lucide.createIcons();
        }

        function closeEditExpenseModal() {
            document.getElementById('modal-edit-expense').classList.add('force-hide');
        }

        function openEditProjectModal(id) {
            const p = projects.find(x => x.id === id); if(!p) return;
            setProjectModalMode('edit');
            document.getElementById('edit-modal-proj-id').value = id; 
            document.getElementById('edit-modal-name').value = p.name; 
            document.getElementById('edit-modal-client').value = p.client || ''; 
            document.getElementById('edit-modal-budget').value = p.budget;
            const templateSelect = document.getElementById('new-proj-template');
            if (templateSelect) templateSelect.value = '';
            editProjectTasks = p.tasks && p.tasks.length > 0 ? [...p.tasks] : [];
            editProjectTaskBudgets = getProjectTaskBudgets(p);
            const taskBudgetTotal = getTaskBudgetsTotal(editProjectTasks, editProjectTaskBudgets);
            projectBudgetMode = taskBudgetTotal > 0 ? 'auto' : 'manual';
            refreshProjectBudgetModeUI();
            renderNewProjectUI();
            renderEditProjectTasks();
            document.getElementById('modal-detail').classList.add('force-hide'); 
            document.getElementById('modal-edit-project').classList.remove('force-hide'); 
            lucide.createIcons();
        }

        function renderEditProjectTasks() {
            renderProjectModalTasks();
            lucide.createIcons();
        }

        function closeEditProjectModal() { document.getElementById('modal-edit-project').classList.add('force-hide'); }
        
        async function saveModalProjectEdit() {
            const id = document.getElementById('edit-modal-proj-id').value; 
            if (!id) return createNewProject();
            if (projectBudgetMode === 'auto') fillProjectBudgetFromTaskBudgets(false);
            const name = document.getElementById('edit-modal-name').value.trim(); 
            const client = document.getElementById('edit-modal-client').value.trim(); 
            const budget = parseFloat(document.getElementById('edit-modal-budget').value) || 0;
            if(!name) return await appAlert("Attenzione", "Inserisci il nome", "danger"); 
            if(editProjectTasks.length === 0) return await appAlert("Attenzione", "Configura almeno un'attività", "danger");
            editProjectTaskBudgets = collectVisibleTaskBudgets('edit');
            const originalProject = projects.find(project => project.id === id);
            const hadTaskBudgets = originalProject && Object.keys(getProjectTaskBudgets(originalProject)).length > 0;
            const updatePayload = { name, client, budget, tasks: editProjectTasks };
            if (hadTaskBudgets || Object.keys(editProjectTaskBudgets).length > 0) updatePayload.task_budgets = editProjectTaskBudgets;
            const { error } = await supabaseClient.from('projects').update(updatePayload).eq('id', id); 
            if (error) return await appAlert("Configurazione richiesta", "Per salvare il Piano costi va prima aggiunta la colonna task_budgets in Supabase. Puoi eseguire lo script SQL dedicato e riprovare.", "danger");
            await supabaseClient.from('entries').update({ project_name: name }).eq('project_id', id);
            await fetchProjects(); await fetchEntries();
            closeEditProjectModal(); showProjectDetail(id); 
        }

        async function addExpense(projectId) {
            const desc = document.getElementById('exp-desc').value.trim();
            const amount = parseFloat(document.getElementById('exp-amount').value);
            
            if(!desc || !amount || amount <= 0) return await appAlert("Attenzione", "Inserisci una descrizione e un importo valido.", "danger");
            
            await supabaseClient.from('expenses').insert([{
                studio_id: userProfile.studio_id,
                project_id: projectId,
                description: desc,
                amount: amount,
                user_name: userProfile.full_name,
                created_at: new Date().toISOString()
            }]);
            
            await fetchExpenses();
            showProjectDetail(projectId);
        }

        async function deleteExpense(expId, projectId) {
            if(await appConfirm("Elimina Spesa", "Vuoi davvero eliminare questa spesa?", "danger")) {
                await supabaseClient.from('expenses').delete().eq('id', expId);
                await fetchExpenses();
                showProjectDetail(projectId);
            }
        }

        async function saveExpenseEdit() {
            const expenseId = document.getElementById('edit-expense-id').value;
            const projectId = document.getElementById('edit-expense-project-id').value;
            const description = document.getElementById('edit-expense-desc').value.trim();
            const amount = parseFloat(document.getElementById('edit-expense-amount').value);

            if (!description || !amount || amount <= 0) {
                return await appAlert("Attenzione", "Inserisci una descrizione e un importo valido.", "danger");
            }

            const { error } = await supabaseClient
                .from('expenses')
                .update({ description, amount })
                .eq('id', expenseId)
                .eq('studio_id', userProfile.studio_id);

            if (error) return await appAlert("Errore", error.message, "danger");

            closeEditExpenseModal();
            await fetchExpenses();
            showProjectDetail(projectId);
            await appAlert("Fatto", "Spesa aggiornata correttamente.", "success");
        }

        function toggleAnalyticsPanel() {
            const panel = document.getElementById('analytics-details');
            const button = document.getElementById('btn-toggle-analytics');
            const label = document.getElementById('analytics-toggle-label');
            const icon = document.getElementById('analytics-toggle-icon');
            if (!panel || !button) return;

            const shouldOpen = panel.classList.contains('force-hide');
            panel.classList.toggle('force-hide', !shouldOpen);
            button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            button.classList.toggle('is-open', shouldOpen);
            if (label) label.innerText = shouldOpen ? 'Chiudi analisi' : 'Apri analisi';
            icon?.classList.toggle('rotate-180', shouldOpen);

            if (shouldOpen) {
                window.archTimeAnalytics?.track('financial_analysis_opened', {
                    active_project_count: projects.filter(project => !project.is_archived && !project.is_demo).length
                });
                setTimeout(renderStrategicCharts, 30);
            } else {
                ['marginTrend', 'risk', 'tasks'].forEach(chartKey => {
                    if (!charts[chartKey]) return;
                    charts[chartKey].destroy();
                    charts[chartKey] = null;
                });
            }
        }

        function renderStrategicCharts() {
            if(!document.body.classList.contains('is-admin')) return;
            const activeProjects = projects.filter(p => !p.is_archived);
            const activeProjectIds = new Set(activeProjects.map(project => project.id));
            const projectRows = activeProjects.map(project => {
                const hoursCost = entries.filter(entry => entry.project_id === project.id).reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
                const expenseCost = expenses.filter(expense => expense.project_id === project.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
                const spent = hoursCost + expenseCost;
                const budget = Number(project.budget || 0);
                const margin = budget - spent;
                const percent = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);
                const costSummary = getProjectCostSummary(project);
                const visualStatus = getProjectVisualStatus(project, costSummary);
                const analyticsStatus = budget <= 0 && spent > 0
                    ? { ...visualStatus, tone: 'warning', label: 'Budget da impostare' }
                    : visualStatus;
                return { project, budget, spent, margin, percent, hoursCost, expenseCost, visualStatus: analyticsStatus };
            });

            const totalBudget = projectRows.reduce((sum, row) => sum + row.budget, 0);
            const totalSpent = projectRows.reduce((sum, row) => sum + row.spent, 0);
            const activeEntries = entries.filter(entry => activeProjectIds.has(entry.project_id));
            const activeExpenses = expenses.filter(expense => activeProjectIds.has(expense.project_id));
            const archivedProjects = projects.filter(project => project.is_archived);
            const archivedProjectIds = new Set(archivedProjects.map(project => project.id));
            const archivedBudget = archivedProjects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
            const archivedCosts = entries
                .filter(entry => archivedProjectIds.has(entry.project_id))
                .reduce((sum, entry) => sum + Number(entry.rate || 0), 0)
                + expenses
                    .filter(expense => archivedProjectIds.has(expense.project_id))
                    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
            const profit = archivedBudget - archivedCosts;
            const margin = totalBudget - totalSpent;
            const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
            const overBudgetProjects = projectRows.filter(row => row.budget > 0 && row.margin < 0);
            const attentionProjects = projectRows.filter(row => row.visualStatus.tone !== 'healthy');
            const alertCount = attentionProjects.length;
            const taskStats = {};
            let totalTaskHours = 0;
            activeEntries.forEach(entry => {
                const hrs = Number(entry.duration || 0);
                const taskName = entry.task || 'Altro';
                if (!taskStats[taskName]) taskStats[taskName] = { hours: 0, cost: 0 };
                taskStats[taskName].hours += hrs;
                taskStats[taskName].cost += Number(entry.rate || 0);
                totalTaskHours += hrs;
            });
            const topTasks = Object.entries(taskStats).sort((a,b) => b[1].hours - a[1].hours).slice(0, 6);
            const summaryWeekStart = new Date();
            summaryWeekStart.setHours(0, 0, 0, 0);
            const summaryDay = summaryWeekStart.getDay() || 7;
            summaryWeekStart.setDate(summaryWeekStart.getDate() - summaryDay + 1);
            const summaryWeekCost = activeEntries
                .filter(entry => new Date(entry.created_at) >= summaryWeekStart)
                .reduce((sum, entry) => sum + Number(entry.rate || 0), 0)
                + activeExpenses
                    .filter(expense => new Date(expense.created_at) >= summaryWeekStart)
                    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

            const profitCard = document.getElementById('card-profit'); 
            const profitLabel = document.getElementById('label-profit');
            const profitValue = document.getElementById('kpi-profit');

            profitValue.innerText = formatMoney(profit);
            profitLabel.innerText = profit < 0 ? 'Perdita lavori chiusi' : 'Utile lavori chiusi';
            profitValue.classList.toggle('text-red-600', profit < 0);
            profitValue.classList.toggle('text-emerald-700', profit >= 0);
            profitCard?.classList.toggle('analytics-kpi-danger', profit < 0);

            const marginEl = document.getElementById('kpi-margin'); 
            marginEl.innerText = formatMoney(margin);
            marginEl.classList.toggle('text-red-600', margin < 0);
            marginEl.classList.toggle('text-primary-600', margin >= 0);
            document.getElementById('kpi-margin-note').innerText = activeProjects.length === 1
                ? 'Su 1 lavoro attivo'
                : `Su ${activeProjects.length} lavori attivi`;
            document.getElementById('kpi-utilization').innerText = `${Math.round(utilization)}%`;
            document.getElementById('kpi-utilization-note').innerText = `${formatMoney(totalSpent, 0)} su ${formatMoney(totalBudget, 0)}`;
            document.getElementById('analytics-data-summary').innerText = activeProjects.length === 1
                ? '1 lavoro attivo'
                : `${activeProjects.length} lavori attivi`;
            document.getElementById('analytics-inline-alerts').innerText = String(alertCount);
            document.getElementById('analytics-inline-week-cost').innerText = formatMoney(summaryWeekCost, 0);
            const topTaskSummary = document.getElementById('analytics-inline-top-task');
            topTaskSummary.innerText = topTasks[0]?.[0] || '-';
            topTaskSummary.title = topTasks[0]?.[0] || 'Nessuna attività registrata';

            const utilizationEl = document.getElementById('kpi-utilization');
            utilizationEl.classList.toggle('text-red-600', utilization > 100);
            utilizationEl.classList.toggle('text-amber-700', utilization >= 75 && utilization <= 100);
            utilizationEl.classList.toggle('text-slate-800', utilization < 75);

            const inlineAlerts = document.getElementById('analytics-inline-alerts');
            inlineAlerts.classList.toggle('is-danger', overBudgetProjects.length > 0);
            inlineAlerts.classList.toggle('is-warning', overBudgetProjects.length === 0 && alertCount > 0);
            const analyticsDetails = document.getElementById('analytics-details');
            if (!analyticsDetails || analyticsDetails.classList.contains('force-hide')) {
                ['marginTrend', 'risk', 'tasks'].forEach(chartKey => {
                    if (!charts[chartKey]) return;
                    charts[chartKey].destroy();
                    charts[chartKey] = null;
                });
                lucide.createIcons();
                return;
            }

            const theme = THEMES[currentBusinessType];
            Chart.defaults.font.family = "'Inter', sans-serif";
            Chart.defaults.color = '#64748b';
            const chartTooltip = {
                backgroundColor: '#0f172a',
                titleFont: { weight: 'bold', size: 12 },
                bodyFont: { weight: '600', size: 11 },
                padding: 10,
                cornerRadius: 7
            };

            const gridColor = '#e8edf2';
            const tickFont = { size: 10, weight: '600' };
            const sortedRiskRows = [...projectRows]
                .sort((a, b) => {
                    const tones = { danger: 2, warning: 1, healthy: 0 };
                    const aGap = Number(a.visualStatus.rhythm?.gap || a.percent);
                    const bGap = Number(b.visualStatus.rhythm?.gap || b.percent);
                    return tones[b.visualStatus.tone] - tones[a.visualStatus.tone] || bGap - aGap || b.spent - a.spent;
                })
                .slice(0, 6);

            const priorityList = document.getElementById('analytics-priority-list');
            if (priorityList) {
                priorityList.innerHTML = sortedRiskRows.length > 0
                    ? sortedRiskRows.map(row => {
                        const tone = row.visualStatus.tone;
                        const state = row.visualStatus.label;
                        const progressText = row.visualStatus.rhythm
                            ? `costi ${Math.round(row.percent)}% · avanzamento ${Math.round(row.visualStatus.rhythm.operationalPercent)}%`
                            : `${Math.round(row.percent)}% assorbito`;
                        return `
                            <button type="button" class="analytics-priority-row" data-ui-action="show-project-detail" data-project-id="${escapeAttr(row.project.id)}">
                                <span class="analytics-priority-dot is-${tone}" aria-hidden="true"></span>
                                <span class="analytics-priority-main">
                                    <strong>${escapeHtml(row.project.name)}</strong>
                                    <small>${escapeHtml(state)} · ${escapeHtml(progressText)}</small>
                                </span>
                                <span class="analytics-priority-value ${tone === 'danger' ? 'is-danger' : ''}">${formatMoney(row.margin, 0)}</span>
                                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                            </button>`;
                    }).join('')
                    : `<div class="analytics-priority-empty"><i data-lucide="folder-kanban"></i><span>Le priorità compariranno quando creerai il primo lavoro.</span></div>`;
            }

            const weekStarts = [];
            const currentWeekStart = new Date();
            currentWeekStart.setHours(0, 0, 0, 0);
            const currentDay = currentWeekStart.getDay() || 7;
            currentWeekStart.setDate(currentWeekStart.getDate() - currentDay + 1);
            const start = new Date(currentWeekStart);
            start.setDate(start.getDate() - 7 * 7);
            for (let i = 0; i < 8; i++) {
                const week = new Date(start);
                week.setDate(start.getDate() + i * 7);
                weekStarts.push(week);
            }

            const weeklyCosts = weekStarts.map((weekStart, index) => {
                const nextWeek = new Date(weekStart);
                nextWeek.setDate(weekStart.getDate() + 7);
                const labor = activeEntries
                    .filter(entry => {
                        const date = new Date(entry.created_at);
                        return date >= weekStart && date < nextWeek;
                    })
                    .reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
                const extras = activeExpenses
                    .filter(expense => {
                        const date = new Date(expense.created_at);
                        return date >= weekStart && date < nextWeek;
                    })
                    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
                return {
                    label: index === weekStarts.length - 1 ? 'Questa settimana' : weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                    labor,
                    extras,
                    total: labor + extras
                };
            });

            const currentWeekCost = weeklyCosts[weeklyCosts.length - 1]?.total || 0;
            const trendLabel = document.getElementById('analytics-trend-label');
            trendLabel.innerText = currentWeekCost > 0 ? `Settimana ${formatMoney(currentWeekCost, 0)}` : 'Settimana senza costi';
            trendLabel.classList.toggle('is-active', currentWeekCost > 0);

            const toggleChartEmpty = (chartKey, canvasId, emptyId, hasData) => {
                const canvas = document.getElementById(canvasId);
                const empty = document.getElementById(emptyId);
                canvas?.parentElement?.classList.toggle('force-hide', !hasData);
                empty?.classList.toggle('force-hide', hasData);
                if (!hasData && charts[chartKey]) {
                    charts[chartKey].destroy();
                    charts[chartKey] = null;
                }
                return hasData && canvas;
            };

            const hasWeeklyCosts = weeklyCosts.some(week => week.total > 0);
            const hasRiskRows = sortedRiskRows.some(row => row.budget > 0 || row.spent > 0);
            const hasTasks = topTasks.some(task => task[1].hours > 0);

            if(charts.marginTrend) charts.marginTrend.destroy();
            if (toggleChartEmpty('marginTrend', 'chart-margin-trend', 'empty-margin-trend', hasWeeklyCosts)) charts.marginTrend = new Chart(document.getElementById('chart-margin-trend'), {
                type: 'bar',
                data: { 
                    labels: weeklyCosts.map(item => item.label),
                    datasets: [
                        { label: 'Lavoro', data: weeklyCosts.map(item => item.labor), backgroundColor: theme.chartMainColor, borderRadius: 4, borderSkipped: false },
                        { label: 'Spese extra', data: weeklyCosts.map(item => item.extras), backgroundColor: '#f59e0b', borderRadius: 4, borderSkipped: false }
                    ]
                }, 
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { font: tickFont, maxRotation: 0, autoSkip: true } },
                        y: { stacked: true, beginAtZero: true, grid: { color: gridColor }, ticks: { callback: value => formatMoney(value, 0), font: { size: 10 } } }
                    },
                    plugins: {
                        legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 7, boxHeight: 7, padding: 16, font: tickFont } },
                        tooltip: { ...chartTooltip, callbacks: { label: context => `${context.dataset.label}: ${formatMoney(context.raw, 0)}`, footer: items => `Totale: ${formatMoney(weeklyCosts[items[0].dataIndex].total, 0)}` } }
                    }
                } 
            });

            if(charts.risk) charts.risk.destroy();
            if (toggleChartEmpty('risk', 'chart-risk', 'empty-risk', hasRiskRows)) charts.risk = new Chart(document.getElementById('chart-risk'), {
                type: 'bar', 
                data: { 
                    labels: sortedRiskRows.map(row => row.project.name), 
                    datasets: [
                        { label: 'Budget', data: sortedRiskRows.map(row => row.budget), backgroundColor: '#dbe2ea', borderRadius: 4, barThickness: 9 },
                        { label: 'Costi', data: sortedRiskRows.map(row => row.spent), backgroundColor: sortedRiskRows.map(row => row.margin < 0 ? '#dc2626' : (row.percent >= 75 ? '#d97706' : theme.chartMainColor)), borderRadius: 4, barThickness: 9 }
                    ]
                }, 
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true, grid: { color: gridColor }, ticks: { callback: value => formatMoney(value, 0), font: { size: 10 } } },
                        y: { grid: { display: false }, ticks: { font: tickFont } }
                    },
                    plugins: {
                        legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 7, boxHeight: 7, padding: 14, font: tickFont } },
                        tooltip: {
                            ...chartTooltip,
                            callbacks: {
                                label: context => `${context.dataset.label}: ${formatMoney(context.raw, 0)}`,
                                footer: items => {
                                    const row = sortedRiskRows[items[0].dataIndex];
                                    return `Margine: ${formatMoney(row.margin, 0)} · ${Math.round(row.percent)}% assorbito`;
                                }
                            }
                        }
                    }
                } 
            });

            if(charts.tasks) charts.tasks.destroy();
            if (toggleChartEmpty('tasks', 'chart-tasks-dist', 'empty-tasks', hasTasks)) charts.tasks = new Chart(document.getElementById('chart-tasks-dist'), {
                type: 'bar', 
                data: { 
                    labels: topTasks.map(task => task[0].length > 22 ? `${task[0].slice(0, 21)}…` : task[0]),
                    datasets: [{
                        label: 'Ore registrate',
                        data: topTasks.map(task => task[1].hours),
                        backgroundColor: theme.chartMainColor,
                        borderRadius: 4,
                        barThickness: 12
                    }]
                }, 
                options: { 
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { callback: value => `${value}h`, font: { size: 10 } } },
                        y: { grid: { display: false }, ticks: { font: tickFont } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...chartTooltip,
                            callbacks: {
                                title: items => topTasks[items[0].dataIndex][0],
                                label: context => {
                                    const task = topTasks[context.dataIndex];
                                    const percent = totalTaskHours > 0 ? Math.round((task[1].hours / totalTaskHours) * 100) : 0;
                                    return `${formatTime(task[1].hours)} · ${percent}% del tempo · ${formatMoney(task[1].cost, 0)}`;
                                }
                            }
                        }
                    } 
                } 
            });
            lucide.createIcons();
        }

