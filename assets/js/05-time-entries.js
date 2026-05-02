// Arch Time Pro - 05-time-entries.js
// ================= REGISTRO ATTIVITÀ E ORE =================

        function prevWeek() { currentWeekStart.setDate(currentWeekStart.getDate() - 7); renderEntries(); }
        function nextWeek() { currentWeekStart.setDate(currentWeekStart.getDate() + 7); renderEntries(); }
        
        function jumpToDate(dateString) {
            if(!dateString) return;
            currentWeekStart = getMonday(new Date(dateString));
            renderEntries();
        }


        function getWeekRange() {
            const start = new Date(currentWeekStart);
            start.setHours(0,0,0,0);

            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23,59,59,999);

            return { start, end };
        }

        function getWeeklyEntries(start, end) {
            const isStaff = !document.body.classList.contains('is-admin');
            const startTime = start.getTime();
            const endTime = end.getTime();

            return entries.filter(entry => {
                const entryTime = new Date(entry.created_at).getTime();
                const inDate = entryTime >= startTime && entryTime <= endTime;

                if (isStaff) {
                    return inDate && entry.user_email === userProfile.email;
                }

                return inDate;
            });
        }

        function parseEntryNotes(notes) {
            const rawNotes = notes || '';
            const timeMatch = rawNotes.match(new RegExp('^\\[(\\d{2}:\\d{2}) - (\\d{2}:\\d{2})\\]\\s*'));

            if (!timeMatch) {
                return { notes: rawNotes, startTime: '', endTime: '' };
            }

            return {
                notes: rawNotes.replace(timeMatch[0], ''),
                startTime: timeMatch[1],
                endTime: timeMatch[2]
            };
        }

        function getEntryDisplayData(entry, index) {
            const parsedNotes = parseEntryNotes(entry.notes);

            return {
                id: escapeAttr(entry.id),
                bgClass: index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                dateLabel: new Date(entry.created_at).toLocaleDateString('it-IT', {weekday:'short', day:'2-digit'}),
                userName: escapeHtml(entry.user_name),
                projectName: escapeHtml(entry.project_name),
                taskName: escapeHtml(entry.task),
                notes: escapeHtml(parsedNotes.notes),
                startTime: escapeHtml(parsedNotes.startTime),
                endTime: escapeHtml(parsedNotes.endTime),
                duration: formatTime(Number(entry.duration)),
                rate: formatMoney(Number(entry.rate))
            };
        }

        function renderEntryActions(entryId, iconSize, buttonClass, dangerButtonClass = '') {
            const deleteClass = dangerButtonClass || buttonClass.replace('hover:text-primary-600', 'hover:text-red-600');

            return `
                <button data-ui-action="edit-entry" data-entry-id="${entryId}" class="${buttonClass}"><i data-lucide="pencil" class="${iconSize}"></i></button>
                <button data-ui-action="delete-entry" data-entry-id="${entryId}" class="${deleteClass}"><i data-lucide="trash-2" class="${iconSize}"></i></button>`;
        }

        function renderEntryTimeRange(entry, variant = 'desktop') {
            if (!entry.startTime || !entry.endTime) return '';

            if (variant === 'mobile') {
                return `<div class="text-[9px] text-slate-400 font-medium text-right mt-1.5 whitespace-nowrap">${entry.startTime} - ${entry.endTime}</div>`;
            }

            return `<div class="text-[10px] text-slate-400 font-medium mt-1 whitespace-nowrap">${entry.startTime} - ${entry.endTime}</div>`;
        }

        function renderEntryDesktopRow(entry, index) {
            const item = getEntryDisplayData(entry, index);

            return `
<tr class="${item.bgClass} hover:bg-slate-100 border-b border-slate-100 transition-colors">
    <td class="p-5 font-bold text-slate-500 text-xs whitespace-nowrap">${item.dateLabel}</td>
    <td class="p-5 text-center whitespace-nowrap"><span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">${item.userName}</span></td>
    <td class="p-5 text-center font-black text-slate-800 tracking-tight w-full">${item.projectName}</td>
    <td class="p-5 min-w-[150px]"><div class="text-xs font-bold text-slate-600">${item.taskName}</div><div class="text-[11px] text-slate-400 mt-0.5 break-words">${item.notes}</div></td>
    <td class="p-5 whitespace-nowrap">
        <div class="font-mono font-black text-primary-600">${item.duration}</div>
        ${renderEntryTimeRange(item)}
    </td>
    <td class="p-5 text-center admin-only whitespace-nowrap">
        <span class="font-mono text-slate-400 text-sm font-bold">${item.rate}</span>
    </td>
    <td class="p-5 text-right admin-only whitespace-nowrap">
        <div class="flex justify-end gap-2 items-center">
            ${renderEntryActions(item.id, 'w-4 h-4', 'text-slate-300 hover:text-primary-600 p-1.5 hover:bg-white rounded-lg transition-colors')}
        </div>
    </td>
</tr>`;
        }

        function renderEntryMobileCard(entry, index) {
            const item = getEntryDisplayData(entry, index);

            return `
                <div class="p-5 border-b border-slate-100 ${item.bgClass}">
                    <div class="flex justify-between mb-3">
                        <div>
                            <div class="flex gap-2 mb-1.5">
                                <span class="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">${item.userName}</span>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">${item.dateLabel}</span>
                            </div>
                            <h4 class="font-black text-sm text-slate-800 tracking-tight">${item.projectName}</h4>
                        </div>
                        <div class="flex flex-col items-end whitespace-nowrap">
                            <span class="font-mono font-black text-primary-600 bg-primary-50 border border-primary-100 px-2 py-1 rounded-lg h-fit">${item.duration}</span>
                            ${renderEntryTimeRange(item, 'mobile')}
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="max-w-[90%]"><span class="text-xs text-slate-600 font-bold">${item.taskName}</span><div class="text-[11px] text-slate-400 mt-0.5 break-words">${item.notes}</div></div>
                        <div class="admin-only flex justify-between border-t border-slate-200 pt-3">
                            <span class="font-mono text-slate-500 font-bold text-xs whitespace-nowrap">Costo: ${item.rate}</span>
                            <div class="flex gap-2">
                                ${renderEntryActions(item.id, 'w-3.5 h-3.5', 'text-slate-400 p-1.5 hover:text-primary-600 hover:bg-white rounded-lg transition-colors')}
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        function renderEntries() {
            const table = document.getElementById('entries-table-desktop');
            const mobile = document.getElementById('entries-list-mobile');
            const { start, end } = getWeekRange();
            const weekly = getWeeklyEntries(start, end);

            document.getElementById('week-display').innerText = `${start.toLocaleDateString('it-IT', {day:'2-digit',month:'short'})} - ${end.toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'})}`;
            document.getElementById('entries-empty-state').classList.toggle('force-hide', weekly.length > 0);
            table.parentElement.classList.toggle('force-hide', weekly.length === 0);

            table.innerHTML = weekly.map(renderEntryDesktopRow).join('');
            mobile.innerHTML = weekly.map(renderEntryMobileCard).join('');
            lucide.createIcons();
        }

        function taskOptionsHtml(tasks, selectedTask = '') {
            const list = tasks && tasks.length > 0 ? tasks : ['Generico'];
            return list.map(task => optionHtml(task, task, task === selectedTask)).join('');
        }

        function activeProjectIndexOptionsHtml(placeholder = 'Scegli...') {
            return optionHtml('', placeholder, true, true)
                + projects.filter(p => !p.is_archived).map(p => optionHtml(projects.indexOf(p), p.name)).join('');
        }

        function editEntryUserOptionsHtml(entry) {
            let optionsHtml = profiles
                .filter(profile => profile.role !== 'inactive' || profile.full_name === entry.user_name)
                .map(profile => optionHtml(profile.full_name, profile.full_name, profile.full_name === entry.user_name))
                .join('');

            if (!profiles.find(profile => profile.full_name === entry.user_name)) {
                optionsHtml += optionHtml(entry.user_name, `${entry.user_name} (Rimosso)`, true);
            }

            return optionsHtml;
        }

        function editEntryProjectOptionsHtml(entry) {
            let optionsHtml = projects
                .map(project => optionHtml(project.id, project.name, project.id === entry.project_id))
                .join('');

            if (!projects.find(project => project.id === entry.project_id)) {
                optionsHtml += optionHtml(entry.project_id, `${entry.project_name} (Eliminato)`, true);
            }

            return optionsHtml;
        }

        function updateTaskDropdown() { 
            const idx = document.getElementById('project-select').value; 
            const taskSel = document.getElementById('task-select'); 
            if(idx === "") return taskSel.innerHTML = optionHtml('', 'Seleziona...', true, true); 
            const p = projects[idx]; 
            taskSel.innerHTML = taskOptionsHtml(p.tasks || []); 
        }

        async function restoreCloudTimer() {
            const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', userProfile.id).single();
            if (prof && prof.active_timer_start) {
                timerRunning = true; 
                startTime = parseInt(prof.active_timer_start);
                const pIdx = prof.active_timer_project; 
                const tVal = prof.active_timer_task; 
                const notes = prof.active_timer_notes || "";
                
                if (pIdx !== null && pIdx !== "") { document.getElementById('project-select').value = pIdx; updateTaskDropdown(); }
                if (tVal) document.getElementById('task-select').value = tVal; 
                if (notes) document.getElementById('timer-notes').value = notes;
                
                document.getElementById('btn-text').innerText = "FERMA E SALVA"; 
                document.getElementById('btn-icon').setAttribute("data-lucide", "square"); 
                document.getElementById('btn-toggle-timer').classList.replace('bg-slate-900', 'bg-red-500'); 
                document.getElementById('btn-toggle-timer').classList.replace('hover:bg-slate-800', 'hover:bg-red-600');
                
                timerInterval = setInterval(() => { 
                    const d = new Date(Date.now() - startTime); 
                    document.getElementById('timer-display').innerText = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')}`; 
                }, 1000); 
                lucide.createIcons();
            }
        }

        async function toggleTimer() {
            const pIdx = document.getElementById('project-select').value; 
            const tVal = document.getElementById('task-select').value; 
            const notes = document.getElementById('timer-notes').value.trim();
            if(pIdx === "") return await appAlert("Attenzione", "Scegli un lavoro prima di avviare il timer!", "danger");
            
            if (!timerRunning) {
                timerRunning = true; 
                startTime = Date.now();
                await supabaseClient.from('profiles').update({ active_timer_start: startTime.toString(), active_timer_project: pIdx, active_timer_task: tVal, active_timer_notes: notes }).eq('id', userProfile.id);
                document.getElementById('btn-text').innerText = "FERMA E SALVA"; 
                document.getElementById('btn-icon').setAttribute("data-lucide", "square"); 
                document.getElementById('btn-toggle-timer').classList.replace('bg-slate-900', 'bg-red-500'); 
                document.getElementById('btn-toggle-timer').classList.replace('hover:bg-slate-800', 'hover:bg-red-600');
                
                timerInterval = setInterval(() => { 
                    const d = new Date(Date.now() - startTime); 
                    document.getElementById('timer-display').innerText = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')}`; 
                }, 1000);
            } else {
                timerRunning = false; 
                clearInterval(timerInterval);
                await supabaseClient.from('profiles').update({ active_timer_start: null, active_timer_project: null, active_timer_task: null, active_timer_notes: null }).eq('id', userProfile.id);
                
                const eDate = new Date();
                const sDate = new Date(startTime);
                const sTimeStr = sDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
                const eTimeStr = eDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
                const timeString = `[${sTimeStr} - ${eTimeStr}]`;

                let n = document.getElementById('timer-notes').value.trim();
                n = n ? `${timeString} ${n}` : timeString;

                saveEntry(projects[pIdx], tVal, (Date.now() - startTime) / 3600000, null, n);
                
                document.getElementById('timer-display').innerText = "00:00:00"; 
                document.getElementById('timer-notes').value = ""; 
                document.getElementById('btn-text').innerText = "Avvia ora"; 
                document.getElementById('btn-icon').setAttribute("data-lucide", "play-circle"); 
                document.getElementById('btn-toggle-timer').classList.replace('bg-red-500', 'bg-slate-900'); 
                document.getElementById('btn-toggle-timer').classList.replace('hover:bg-red-600', 'hover:bg-slate-800');
            }
            lucide.createIcons();
        }

        async function createEntryViaRpc(proj, task, hours, customDate = null, notes = "") {
            const payload = {
                entry_project_id: proj.id,
                entry_task: task,
                entry_duration: hours,
                entry_notes: notes,
                entry_created_at: customDate ? new Date(customDate).toISOString() : null
            };
            const { error } = await supabaseClient.rpc('create_entry_for_app', payload);
            if (error) {
                console.warn('RPC create_entry_for_app non disponibile, uso fallback client.', error.message);
                return false;
            }
            return true;
        }

        async function saveEntry(proj, task, hours, customDate = null, notes = "") {
            const createdViaRpc = await createEntryViaRpc(proj, task, hours, customDate, notes);
            if (createdViaRpc) {
                fetchEntries();
                return;
            }

            const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', userProfile.id).single();
            const payload = { project_id: proj.id, project_name: proj.name, task, duration: hours, user_email: userProfile.email, user_name: prof.full_name, rate: (prof ? prof.hourly_cost : 0) * hours, studio_id: userProfile.studio_id, notes: notes };
            if(customDate) payload.created_at = new Date(customDate).toISOString();
            await supabaseClient.from('entries').insert([payload]); 
            fetchEntries();
        }

        function openManualEntry() { 
            document.getElementById('modal-manual').classList.remove('force-hide'); 
            document.getElementById('manual-date').valueAsDate = new Date(); 
            document.getElementById('manual-start').value = '';
            document.getElementById('manual-end').value = '';
            document.getElementById('manual-hours').value = '';
            document.getElementById('manual-notes').value = '';
            document.getElementById('manual-project').innerHTML = activeProjectIndexOptionsHtml(); 
        }
        
        function closeManualEntry() { document.getElementById('modal-manual').classList.add('force-hide'); }
        
        function updateManualTaskDropdown() { 
            const p = projects[document.getElementById('manual-project').value]; 
            document.getElementById('manual-task').innerHTML = taskOptionsHtml(p.tasks || []); 
        }

        function calculateManualHours() {
            const start = document.getElementById('manual-start').value;
            const end = document.getElementById('manual-end').value;
            if(start && end) {
                const [sH, sM] = start.split(':').map(Number);
                const [eH, eM] = end.split(':').map(Number);
                let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
                if(diffMins > 0) {
                    document.getElementById('manual-hours').value = (diffMins / 60).toFixed(2);
                }
            }
        }
        
        async function saveManualEntry() { 
            const pIdx = document.getElementById('manual-project').value; 
            const h = parseFloat(document.getElementById('manual-hours').value); 
            const d = document.getElementById('manual-date').value; 
            const t = document.getElementById('manual-task').value; 
            let n = document.getElementById('manual-notes').value.trim(); 
            
            const startTime = document.getElementById('manual-start').value;
            const endTime = document.getElementById('manual-end').value;

            if(!pIdx || !h || !d) return await appAlert("Attenzione", "Completa tutti i dati obbligatori (Progetto, Data e Ore)!", "danger"); 
            
            if (startTime && endTime) {
                const timeString = `[${startTime} - ${endTime}]`;
                n = n ? `${timeString} ${n}` : timeString;
            }

            await saveEntry(projects[pIdx], t, h, d, n); 
            document.getElementById('manual-notes').value = ""; 
            closeManualEntry(); 
        }

        function updateEditTaskDropdown(forceTask = null) {
            const isEvent = forceTask && typeof forceTask !== 'string'; 
            const explicitTask = isEvent ? null : forceTask;
            const p = projects.find(proj => proj.id === document.getElementById('edit-entry-project').value);
            const taskSelect = document.getElementById('edit-entry-task');
            
            let projectTasks = p && p.tasks && p.tasks.length > 0 ? [...p.tasks] : []; 
            if (!projectTasks.includes('Generico')) projectTasks.push('Generico'); 
            if (explicitTask && !projectTasks.includes(explicitTask)) projectTasks.push(explicitTask);
            
            const oldVal = explicitTask || taskSelect.value;
            taskSelect.innerHTML = taskOptionsHtml(projectTasks, oldVal);
            if (!taskSelect.value && projectTasks.length > 0) taskSelect.value = projectTasks[0];
        }

        function updateEditCost() { 
            const userVal = document.getElementById('edit-entry-user').value; 
            const hoursVal = parseFloat(document.getElementById('edit-entry-hours').value) || 0; 
            const selectedProfile = profiles.find(pr => pr.full_name === userVal); 
            document.getElementById('edit-entry-cost').value = ((selectedProfile ? (selectedProfile.hourly_cost || 0) : 0) * hoursVal).toFixed(2); 
        }

        function openEditEntryModal(id) {
            const e = entries.find(x => x.id === id); if(!e) return;
            
            document.getElementById('edit-entry-id').value = id;
            const d = new Date(e.created_at); 
            document.getElementById('edit-entry-date').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            const userSelect = document.getElementById('edit-entry-user'); 
            userSelect.innerHTML = editEntryUserOptionsHtml(e);
            
            const projectSelect = document.getElementById('edit-entry-project'); 
            projectSelect.innerHTML = editEntryProjectOptionsHtml(e);
            
            updateEditTaskDropdown(e.task);
            
            document.getElementById('edit-entry-notes').value = e.notes || ''; 
            document.getElementById('edit-entry-hours').value = Number(e.duration).toFixed(2);
            updateEditCost(); 
            
            document.getElementById('modal-edit-entry').classList.remove('force-hide'); 
            lucide.createIcons();
        }
        
        function closeEditEntryModal() { document.getElementById('modal-edit-entry').classList.add('force-hide'); }

        async function saveEntryEdit() {
            const id = document.getElementById('edit-entry-id').value; 
            const dateVal = document.getElementById('edit-entry-date').value; 
            const userVal = document.getElementById('edit-entry-user').value; 
            const projId = document.getElementById('edit-entry-project').value; 
            const taskVal = document.getElementById('edit-entry-task').value; 
            const notesVal = document.getElementById('edit-entry-notes').value.trim(); 
            const hoursVal = parseFloat(document.getElementById('edit-entry-hours').value); 
            const costVal = parseFloat(document.getElementById('edit-entry-cost').value);
            
            if (!dateVal || isNaN(hoursVal) || isNaN(costVal) || !projId) return await appAlert("Attenzione", "Compila tutti i campi!", "danger");
            
            const selectedProj = projects.find(p => p.id === projId); 
            const projName = selectedProj ? selectedProj.name : document.getElementById('edit-entry-project').options[document.getElementById('edit-entry-project').selectedIndex].text;
            
            await supabaseClient.from('entries').update({ created_at: new Date(`${dateVal}T12:00:00Z`).toISOString(), user_name: userVal, project_id: projId, project_name: projName, task: taskVal, notes: notesVal, duration: hoursVal, rate: costVal }).eq('id', id); 
            closeEditEntryModal(); 
            fetchEntries();
        }

        async function deleteEntry(id) { 
            if(await appConfirm("Elimina", "Rimuovere definitivamente questa voce?", "danger")) { 
                await supabaseClient.from('entries').delete().eq('id', id); 
                fetchEntries(); 
            } 
        }
