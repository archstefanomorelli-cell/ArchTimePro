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
            const percent = budget > 0 ? (totalCost / budget * 100) : 0;

            return {
                totalCost,
                budget,
                percent,
                barClass: percent > 90 ? 'bg-red-500' : (percent > 75 ? 'bg-amber-400' : 'bg-primary-500')
            };
        }

        function projectCardHtml(project) {
            const summary = getProjectCostSummary(project);
            const projectId = escapeAttr(project.id);

            return `
                <div data-ui-action="show-project-detail" data-project-id="${projectId}" class="bg-white border border-slate-200 p-5 lg:p-6 shadow-sm hover:shadow-md rounded-2xl cursor-pointer relative group transition-shadow ${project.is_archived ? 'is-archived' : ''}">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-black text-slate-800 text-base lg:text-lg tracking-tight">${escapeHtml(project.name)}</h3>
                            <p class="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${escapeHtml(project.client || 'Interno')}</p>
                        </div>
                        <div class="admin-only opacity-100 lg:opacity-0 group-hover:opacity-100 flex gap-1 bg-white lg:bg-transparent rounded-lg shadow-sm lg:shadow-none p-1 lg:p-0">
                            <button data-ui-action="toggle-project-archive" data-project-id="${projectId}" data-archived="${project.is_archived ? 'true' : 'false'}" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><i data-lucide="archive" class="w-4 h-4"></i></button>
                            <button data-ui-action="delete-project" data-project-id="${projectId}" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                    <div class="flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                        <span>Speso: ${formatMoney(summary.totalCost, 0)}</span>
                        <span>Target: ${formatMoney(summary.budget, 0)}</span>
                    </div>
                    <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div class="${summary.barClass} h-full transition-all duration-1000" style="width: ${Math.min(summary.percent, 100)}%"></div>
                    </div>
                </div>`;
        }

        function renderProjects() {
            const container = document.getElementById('projects-list');
            document.getElementById('project-select').innerHTML = projectSelectOptionsHtml();
            container.innerHTML = getVisibleProjects().map(projectCardHtml).join('');
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
                newProjectTasks = [...tempBuilderTasks]; 
                renderNewProjectUI(); 
            } else { 
                editProjectTasks = [...tempBuilderTasks]; 
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

        function newTemplateCatalogTaskHtml(task) {
            const isSelected = newTemplateTasks.includes(task); 
            return `<button data-ui-action="toggle-template-task" data-task="${escapeAttr(task)}" class="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm tag-enter ${isSelected ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'}">${escapeHtml(task)}</button>`;
        }

        function templateTaskPillHtml(task) {
            return `<span class="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">${escapeHtml(task)}</span>`;
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

            document.getElementById('new-template-catalog-tasks').innerHTML = activityCatalog.map(newTemplateCatalogTaskHtml).join('');
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
                    let npIdx = newProjectTasks.indexOf(editingCatalogTask); if(npIdx !== -1) newProjectTasks[npIdx] = val;
                    let epIdx = editProjectTasks.indexOf(editingCatalogTask); if(epIdx !== -1) editProjectTasks[epIdx] = val;
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
                activityCatalog = activityCatalog.filter(t => t !== task); newTemplateTasks = newTemplateTasks.filter(t => t !== task); newProjectTasks = newProjectTasks.filter(t => t !== task); editProjectTasks = editProjectTasks.filter(t => t !== task); tempBuilderTasks = tempBuilderTasks.filter(t => t !== task); projectTemplates.forEach(tpl => { tpl.tasks = tpl.tasks.filter(t => t !== task); });
                renderCatalogAndTemplatesUI(); if(!document.getElementById('modal-task-builder').classList.contains('force-hide')) renderTaskBuilder(); await syncCatalogAndTemplatesToDB(); 
            }
        }

        function toggleTaskInNewTemplate(task) { if(newTemplateTasks.includes(task)) newTemplateTasks = newTemplateTasks.filter(t => t !== task); else newTemplateTasks.push(task); renderCatalogAndTemplatesUI(); }
        function editTemplate(index) { editingTemplateIndex = index; document.getElementById('new-template-name').value = projectTemplates[index].name; newTemplateTasks = [...projectTemplates[index].tasks]; renderCatalogAndTemplatesUI(); }
        function cancelEditTemplate() { editingTemplateIndex = null; document.getElementById('new-template-name').value = ''; newTemplateTasks = []; renderCatalogAndTemplatesUI(); }

        async function saveNewTemplate() { 
            const name = document.getElementById('new-template-name').value.trim(); 
            if(!name || newTemplateTasks.length === 0) return await appAlert("Attenzione", "Inserisci un nome e seleziona almeno un'attività.", "danger"); 
            if(editingTemplateIndex !== null) { projectTemplates[editingTemplateIndex] = { name: name, tasks: [...newTemplateTasks] }; editingTemplateIndex = null; } else { projectTemplates.push({ name: name, tasks: [...newTemplateTasks] }); }
            document.getElementById('new-template-name').value = ''; newTemplateTasks = []; renderCatalogAndTemplatesUI(); await syncCatalogAndTemplatesToDB(); 
        }
        
        async function removeTemplate(index) { if(await appConfirm("Elimina Template", "Sei sicuro di voler eliminare questo template? L'operazione non può essere annullata.", "danger")) { if(editingTemplateIndex === index) cancelEditTemplate(); projectTemplates.splice(index, 1); renderCatalogAndTemplatesUI(); await syncCatalogAndTemplatesToDB(); } }

        function renderNewProjectUI() {
            const selectTpl = document.getElementById('new-proj-template');
            if (selectTpl) {
                if(activePlan === 'starter') { selectTpl.innerHTML = optionHtml('', 'I Template sono nel piano PREMIUM', true, true); selectTpl.disabled = true; selectTpl.classList.add('locked-feature'); } 
                else { selectTpl.innerHTML = optionHtml('', '-- Scegli da un Template --', true, true) + projectTemplates.map((t, i) => optionHtml(i, t.name)).join(''); selectTpl.disabled = false; selectTpl.classList.remove('locked-feature'); }
            }
            const selectedContainer = document.getElementById('new-proj-selected-tasks');
            if (selectedContainer) {
                if (newProjectTasks.length === 0) selectedContainer.innerHTML = emptyStateHtml('Nessuna attività configurata.');
                else selectedContainer.innerHTML = newProjectTasks.map((task, idx) => taskTagHtml(task, idx)).join('');
            }
            lucide.createIcons();
        }

        function applyTemplateToNewProject() { if(activePlan==='starter') return; const val = document.getElementById('new-proj-template').value; if(val !== "") newProjectTasks = [...projectTemplates[val].tasks]; else newProjectTasks = []; renderNewProjectUI(); }

        async function createNewProject() {
            if (activePlan === 'starter') {
                const activeCount = projects.filter(p => p.is_archived !== true).length;
                if (activeCount >= 5) return openUpgradeModal('Lavori Illimitati');
            }
            const name = document.getElementById('new-proj-name').value.trim(); const client = document.getElementById('new-proj-client').value.trim(); const budget = parseFloat(document.getElementById('new-proj-budget').value) || 0;
            if(!name) return await appAlert("Attenzione", "Inserisci il nome del lavoro", "danger"); 
            if(newProjectTasks.length === 0) return await appAlert("Attenzione", "Configura almeno un'attività", "danger");
            
            await supabaseClient.from('projects').insert([{ name: name, client: client, budget: budget, tasks: [...newProjectTasks], studio_id: userProfile.studio_id }]);
            
            document.getElementById('new-proj-name').value = ""; 
            document.getElementById('new-proj-client').value = ""; 
            document.getElementById('new-proj-budget').value = ""; 
            document.getElementById('new-proj-template').value = ""; 
            newProjectTasks = [];
            
            renderNewProjectUI(); 
            fetchProjects(); 
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
                ? `<button data-ui-action="upgrade-project-pdf" class="text-xs font-bold bg-white text-slate-400 border border-slate-200 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition opacity-60 shadow-sm"><i data-lucide="lock" class="w-4 h-4"></i> Report PDF</button>`
                : `<button data-ui-action="export-project-pdf" data-project-id="${projectId}" class="text-xs font-bold bg-white text-primary-600 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:border-primary-200 hover:bg-primary-50 flex items-center justify-center gap-2 shadow-sm transition-all"><i data-lucide="file-text" class="w-4 h-4"></i> Esporta in PDF</button>`;

            return `
                <div class="admin-only w-full lg:w-auto flex flex-col sm:flex-row gap-2">
                    <button data-ui-action="edit-project" data-project-id="${projectId}" class="text-xs font-bold bg-white text-slate-600 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm transition-all"><i data-lucide="edit" class="w-4 h-4"></i> Modifica</button>
                    ${pdfButton}
                </div>`;
        }

        function renderProjectDetailHeader(project) {
            return `
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 lg:mb-8 gap-4 pr-12 lg:pr-14">
                <div class="min-w-0">
                    <h2 class="text-2xl lg:text-3xl font-black text-slate-800 mb-1 leading-tight pr-8 tracking-tight">${escapeHtml(project.name)}</h2>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${escapeHtml(project.client || 'Interno')}</p>
                </div>
                ${renderProjectDetailActions(project)}
            </div>`;
        }

        function metricCardHtml(label, valueHtml, colorClass = 'text-slate-800') {
            return `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(label)}</p>
                    <p class="text-lg lg:text-xl font-black ${colorClass} mt-1 tracking-tight">${valueHtml}</p>
                </div>`;
        }

        function renderProjectMetrics(data) {
            const budgetHint = `<span class="text-[10px] text-slate-400">/ ${formatMoney(data.project.budget, 0)}</span>`;
            const hoursHint = `<span class="text-[10px] text-slate-400">(${formatTime(data.totalHours)})</span>`;
            const rateClass = data.effectiveRate > 0 ? 'text-emerald-500' : 'text-red-500';

            return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-8">
                ${metricCardHtml('Spesa Totale', `${formatMoney(data.totalSpent, 0)} ${budgetHint}`, 'text-primary-600')}
                ${metricCardHtml('Costo Team', `${formatMoney(data.totalHoursCost, 0)} ${hoursHint}`)}
                ${metricCardHtml('Spese Extra', formatMoney(data.totalExpenses, 0), 'text-amber-600')}
                ${metricCardHtml('Resa Oraria', `${formatMoney(data.effectiveRate, 2)} <span class="text-[10px] text-slate-400">/h</span>`, rateClass)}
            </div>`;
        }

        function renderTaskStats(taskStats, budget) {
            const sortedTaskNames = Object.keys(taskStats).sort((a, b) => taskStats[b].h - taskStats[a].h);
            const rows = sortedTaskNames.map(taskName => {
                const stat = taskStats[taskName];
                const percent = budget > 0 ? Math.min((stat.c / budget) * 100, 100).toFixed(1) : 0;
                const isZero = stat.h === 0;
                return `
                            <div>
                                <div class="flex justify-between items-end mb-1.5">
                                    <span class="font-bold ${isZero ? 'text-slate-400' : 'text-slate-700'} text-xs">${escapeHtml(taskName)}</span>
                                    <span class="text-[10px] font-mono font-bold text-slate-500">${formatMoney(stat.c, 0)} (${formatTime(stat.h)})</span>
                                </div>
                                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div class="${isZero ? 'bg-slate-200' : 'bg-primary-500'} h-full" style="width: ${percent}%"></div>
                                </div>
                            </div>`;
            }).join('');

            return `
                    <div>
                        <h3 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-1.5"><i data-lucide="layers" class="w-3.5 h-3.5"></i> Per Attività (Ore)</h3>
                        <div class="space-y-4">${rows}</div>
                    </div>`;
        }

        function renderTeamStats(teamStats) {
            const rows = Object.keys(teamStats).map(member => `
                            <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span class="font-bold text-slate-700 text-xs uppercase tracking-wide">${escapeHtml(member)}</span>
                                <div class="text-right">
                                    <p class="text-[11px] font-mono font-bold text-primary-600">${formatTime(teamStats[member].h)}</p>
                                    <p class="text-[10px] font-mono font-black text-slate-400 admin-only">${formatMoney(teamStats[member].c, 2)}</p>
                                </div>
                            </div>`).join('');

            return `
                    <div>
                        <h3 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-1.5"><i data-lucide="users" class="w-3.5 h-3.5"></i> Per Membro Team</h3>
                        <div class="space-y-3">${rows}</div>
                    </div>`;
        }

        function renderExpenseRows(expensesList, projectId) {
            if (expensesList.length === 0) {
                return '<div class="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-wider">Nessuna spesa registrata.</div>';
            }

            return expensesList.map(expense => `
                        <div class="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm group">
                            <div>
                                <p class="text-xs font-bold text-slate-700">${escapeHtml(expense.description)}</p>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">${new Date(expense.created_at).toLocaleDateString()} • ${escapeHtml(expense.user_name)}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-black text-amber-600 text-sm tracking-tight">${formatMoney(expense.amount, 2)}</span>
                                <button data-ui-action="delete-expense" data-expense-id="${escapeAttr(expense.id)}" data-project-id="${projectId}" class="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </div>`).join('');
        }

        function renderExpensesPanel(expensesList, projectId) {
            return `
                <div class="admin-only bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <h3 class="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-3 mb-4 flex items-center gap-2"><i data-lucide="receipt" class="w-4 h-4 text-amber-500"></i> Spese Vive</h3>
                    <div class="flex gap-2 mb-6">
                        <input type="text" id="exp-desc" placeholder="Es. Oneri o Materiali" class="flex-1 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all bg-white">
                        <div class="w-24 relative flex items-center">
                            <span class="absolute left-3 text-slate-400 font-bold text-xs">€</span>
                            <input type="number" step="0.01" id="exp-amount" placeholder="0.00" class="w-full border border-slate-200 rounded-xl p-3 pl-6 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold bg-white">
                        </div>
                        <button data-ui-action="add-expense" data-project-id="${projectId}" class="bg-amber-500 text-white px-3.5 rounded-xl hover:bg-amber-600 transition-all shadow-sm active:scale-95"><i data-lucide="plus" class="w-4 h-4"></i></button>
                    </div>
                    <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">${renderExpenseRows(expensesList, projectId)}</div>
                </div>`;
        }

        function renderProjectDetail(data) {
            const projectId = escapeAttr(data.project.id);
            return `
            ${renderProjectDetailHeader(data.project)}
            ${renderProjectMetrics(data)}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 pb-8 lg:pb-0">
                <div class="space-y-8">
                    ${renderTaskStats(data.taskStats, data.project.budget)}
                    ${renderTeamStats(data.teamStats)}
                </div>
                ${renderExpensesPanel(data.projectExpenses, projectId)}
            </div>`;
        }

        function showProjectDetail(id) {
            const data = getProjectDetailData(id);
            if (!data) return;
            document.getElementById('detail-content').innerHTML = renderProjectDetail(data);
            document.getElementById('modal-detail').classList.remove('force-hide');
            lucide.createIcons();
        }

        function closeDetail() { document.getElementById('modal-detail').classList.add('force-hide'); }

        function openEditProjectModal(id) {
            const p = projects.find(x => x.id === id); if(!p) return;
            document.getElementById('edit-modal-proj-id').value = id; 
            document.getElementById('edit-modal-name').value = p.name; 
            document.getElementById('edit-modal-client').value = p.client || ''; 
            document.getElementById('edit-modal-budget').value = p.budget;
            editProjectTasks = p.tasks && p.tasks.length > 0 ? [...p.tasks] : [];
            renderEditProjectTasks();
            document.getElementById('modal-detail').classList.add('force-hide'); 
            document.getElementById('modal-edit-project').classList.remove('force-hide'); 
            lucide.createIcons();
        }

        function renderEditProjectTasks() {
            const selectedContainer = document.getElementById('edit-proj-selected-tasks');
            if (editProjectTasks.length === 0) selectedContainer.innerHTML = emptyStateHtml('Nessuna attività configurata.');
            else selectedContainer.innerHTML = editProjectTasks.map((task, idx) => taskTagHtml(task, idx, 'rounded-md')).join('');
            lucide.createIcons();
        }

        function closeEditProjectModal() { document.getElementById('modal-edit-project').classList.add('force-hide'); }
        
        async function saveModalProjectEdit() {
            const id = document.getElementById('edit-modal-proj-id').value; 
            const name = document.getElementById('edit-modal-name').value.trim(); 
            const client = document.getElementById('edit-modal-client').value.trim(); 
            const budget = parseFloat(document.getElementById('edit-modal-budget').value) || 0;
            if(!name) return await appAlert("Attenzione", "Inserisci il nome", "danger"); 
            if(editProjectTasks.length === 0) return await appAlert("Attenzione", "Configura almeno un'attività", "danger");
            await supabaseClient.from('projects').update({ name, client, budget, tasks: editProjectTasks }).eq('id', id); 
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
        
        function renderStrategicCharts() {
            if(!document.body.classList.contains('is-admin')) return;
            const activeProjects = projects.filter(p => !p.is_archived);
            let totalBudget = 0, totalSpent = 0, projectSpend = {}; let totalTaskHours = 0;
            
            activeProjects.forEach(p => { 
                totalBudget += (p.budget || 0); 
                const costHrs = entries.filter(e => e.project_id === p.id).reduce((s, e) => s + Number(e.rate || 0), 0); 
                const costExp = expenses.filter(ex => ex.project_id === p.id).reduce((s, ex) => s + Number(ex.amount || 0), 0); 
                const pSpent = costHrs + costExp; 
                totalSpent += pSpent; 
                projectSpend[p.name] = pSpent; 
            });
            
            const archivedBudget = projects.filter(p => p.is_archived).reduce((s,p) => s + p.budget, 0); 
            const archivedHrs = entries.filter(e => projects.find(p => p.id === e.project_id && p.is_archived)).reduce((s,e) => s + Number(e.rate), 0); 
            const archivedExp = expenses.filter(ex => projects.find(p => p.id === ex.project_id && p.is_archived)).reduce((s,ex) => s + Number(ex.amount), 0);
            
            const profit = archivedBudget - (archivedHrs + archivedExp); 
            const margin = totalBudget - totalSpent;
            const profitCard = document.getElementById('card-profit'); 
            const profitLabel = document.getElementById('label-profit');
            const profitAccent = document.getElementById('profit-card-accent');
            const profitValue = document.getElementById('kpi-profit');
            
            profitValue.innerText = `€ ${profit.toFixed(2)}`;
            
            if (profit < 0) { 
                profitLabel.innerText = "Perdita archiviati"; 
                profitCard.classList.remove('from-emerald-50', 'to-emerald-100', 'border-emerald-200');
                profitCard.classList.add('from-red-50', 'to-red-100', 'border-red-200');
                profitLabel.classList.remove('text-emerald-700');
                profitLabel.classList.add('text-red-700');
                profitValue.classList.remove('text-emerald-700');
                profitValue.classList.add('text-red-600');
                profitAccent?.classList.remove('bg-emerald-500');
                profitAccent?.classList.add('bg-red-500');
            } else { 
                profitLabel.innerText = "Utile archiviati"; 
                profitCard.classList.remove('from-red-50', 'to-red-100', 'border-red-200');
                profitCard.classList.add('from-emerald-50', 'to-emerald-100', 'border-emerald-200');
                profitLabel.classList.remove('text-red-700');
                profitLabel.classList.add('text-emerald-700');
                profitValue.classList.remove('text-red-600');
                profitValue.classList.add('text-emerald-700');
                profitAccent?.classList.remove('bg-red-500');
                profitAccent?.classList.add('bg-emerald-500');
            }
            
            const marginEl = document.getElementById('kpi-margin'); 
            marginEl.innerText = `€ ${margin.toFixed(2)}`;
            if (margin < 0) marginEl.classList.replace('text-primary-600', 'text-red-500'); 
            else marginEl.classList.replace('text-red-500', 'text-primary-600');
            
            let topBurner = "-", maxSpent = 0; 
            for(let name in projectSpend) {
                if(projectSpend[name] > maxSpent) { maxSpent = projectSpend[name]; topBurner = name; } 
            }
            document.getElementById('kpi-burner').innerText = topBurner;
            
            const theme = THEMES[currentBusinessType];
            Chart.defaults.font.family = "'Inter', sans-serif";
            
            if(charts.global) charts.global.destroy();
            charts.global = new Chart(document.getElementById('chart-global'), { 
                type: 'bar', 
                data: { 
                    labels: ['Portafoglio Attivo'], 
                    datasets: [ 
                        { label: 'Costi (Ore+Spese)', data: [totalSpent], backgroundColor: theme.chartMainColor, borderRadius: 6 }, 
                        { label: 'Budget', data: [totalBudget], backgroundColor: '#f1f5f9', hoverBackgroundColor: '#e2e8f0', borderRadius: 6 } 
                    ]
                }, 
                options: { responsive: true, maintainAspectRatio: false } 
            });
            
            const taskStats = {}; 
            entries.filter(e => activeProjects.find(p => p.id === e.project_id)).forEach(e => { 
                const hrs = Number(e.duration); 
                taskStats[e.task||'Altro'] = (taskStats[e.task||'Altro']||0) + hrs; 
                totalTaskHours += hrs; 
            });
            
            const topTasks = Object.entries(taskStats).sort((a,b) => b[1] - a[1]).slice(0, 5);
            const taskLabelsWithPerc = topTasks.map(t => `${t[0]} - ${totalTaskHours > 0 ? Math.round((t[1] / totalTaskHours) * 100) : 0}%`);
            
            if(charts.tasks) charts.tasks.destroy();
            charts.tasks = new Chart(document.getElementById('chart-tasks-dist'), { 
                type: 'doughnut', 
                data: { 
                    labels: taskLabelsWithPerc, 
                    datasets: [{ data: topTasks.map(t=>t[1]), backgroundColor: theme.chartPalette, borderWidth: 0 }]
                }, 
                options: { 
                    responsive: true, maintainAspectRatio: false, cutout: '75%', 
                    plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } } 
                } 
            });
        }
