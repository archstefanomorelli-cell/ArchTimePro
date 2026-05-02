// Arch Time Pro - 03-team.js
// ================= DATI TEAM =================

        async function fetchProfiles() { 
            const { data } = await supabaseClient.from('profiles').select('*').eq('studio_id', userProfile.studio_id).order('full_name'); 
            profiles = data || []; 
            renderProfiles(); 
        }

        function teamRoleBadgeHtml(profile) {
            if (profile.is_owner) {
                return '<span class="bg-indigo-900 text-indigo-100 border border-indigo-800 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Owner</span>';
            }

            if (profile.role === 'admin') {
                return '<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Admin</span>';
            }

            if (profile.role === 'inactive') {
                return '<span class="bg-red-50 text-red-500 border border-red-200 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Inattivo</span>';
            }

            return '<span class="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Staff</span>';
        }

        function teamMemberCardHtml(profile) {
            const profileId = escapeAttr(profile.id);
            const fullName = escapeHtml(profile.full_name);
            const email = escapeHtml(profile.email);
            const opacityClass = profile.role === 'inactive' ? 'opacity-60 grayscale' : '';

            return `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group ${opacityClass}">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-black text-slate-800 text-sm tracking-tight">${fullName}</h4>
                                ${teamRoleBadgeHtml(profile)}
                            </div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${email}</p>
                        </div>
                        <button data-ui-action="edit-team-member" data-profile-id="${profileId}" class="text-slate-400 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 p-2 rounded-lg border border-slate-200 hover:border-primary-200 transition-all shadow-sm">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                    </div>`;
        }

        function teamRoleOptionsHtml(profile) {
            let optionsHtml = optionHtml('staff', 'Staff') + optionHtml('inactive', 'Inattivo (Sospeso)');

            if (userProfile.is_owner) {
                optionsHtml += profile.id !== userProfile.id
                    ? optionHtml('admin', 'Admin') + optionHtml('transfer_owner', 'Owner (Cedi Proprietà)')
                    : optionHtml('owner', 'Owner');
            } else if (userProfile.role === 'admin') {
                optionsHtml += optionHtml('admin', 'Admin');
            }

            return optionsHtml;
        }

        function renderProfiles() {
            const list = document.getElementById('team-list');
            const visibleProfiles = profiles.filter(p => showInactiveMembers ? true : p.role !== 'inactive');
            list.innerHTML = visibleProfiles.map(teamMemberCardHtml).join('');
            lucide.createIcons();
        }

        function toggleInactiveMembers() {
            showInactiveMembers = !showInactiveMembers;
            document.getElementById('label-toggle-inactive').innerText = showInactiveMembers ? "Nascondi inattivi" : "Mostra inattivi";
            document.getElementById('icon-toggle-inactive').setAttribute("data-lucide", showInactiveMembers ? "eye" : "eye-off");
            renderProfiles();
        }

        function openEditTeamMemberModal(id) {
            const pr = profiles.find(p => p.id === id); 
            if(!pr) return;
            
            document.getElementById('edit-team-id').value = pr.id;
            document.getElementById('edit-team-name').value = pr.full_name || '';
            document.getElementById('edit-team-cost').value = pr.hourly_cost || 0;
            
            const roleSelect = document.getElementById('edit-team-role');
            roleSelect.innerHTML = teamRoleOptionsHtml(pr);
            roleSelect.value = pr.is_owner ? 'owner' : pr.role;
            
            const btnDelete = document.getElementById('btn-delete-team');
            
            if (pr.is_owner && pr.id !== userProfile.id) {
                btnDelete.classList.add('force-hide');
                roleSelect.disabled = true;
                roleSelect.classList.add('opacity-50', 'cursor-not-allowed');
            } else if (pr.role === 'admin' && pr.id !== userProfile.id && !userProfile.is_owner) {
                btnDelete.classList.add('force-hide');
                roleSelect.disabled = true;
                roleSelect.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                roleSelect.disabled = false;
                roleSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                if (pr.id === userProfile.id) {
                    btnDelete.classList.add('force-hide');
                } else {
                    btnDelete.classList.remove('force-hide');
                }
            }
            
            document.getElementById('modal-edit-team').classList.remove('force-hide'); 
            lucide.createIcons();
        }

        function closeEditTeamMemberModal() {
            document.getElementById('modal-edit-team').classList.add('force-hide');
        }

        async function saveTeamMemberEdit() {
            const id = document.getElementById('edit-team-id').value;
            const newName = document.getElementById('edit-team-name').value.trim();
            const newCost = parseFloat(document.getElementById('edit-team-cost').value) || 0;
            const roleSelection = document.getElementById('edit-team-role').value;
            
            if(!newName) return await appAlert("Attenzione", "Inserisci il nome e cognome", "danger");
            
            const oldProf = profiles.find(p => p.id === id);
            let finalRole = oldProf.role;
            let finalIsOwner = oldProf.is_owner;

            if (roleSelection === 'transfer_owner' && id !== userProfile.id) {
                if(!await appConfirm("Trasferimento Proprietà", "ATTENZIONE: Stai cedendo la proprietà dello Spazio di Lavoro a questo utente.\nDiventerai un normale Admin, e perderai l'accesso alla gestione dell'abbonamento Stripe.\nVuoi davvero procedere?", "danger")) {
                    return;
                }
                await supabaseClient.from('profiles').update({ is_owner: false }).eq('id', userProfile.id);
                userProfile.is_owner = false;
                finalRole = 'admin';
                finalIsOwner = true;
            } else if (roleSelection === 'owner') {
                finalRole = 'admin';
                finalIsOwner = true;
            } else {
                finalRole = roleSelection;
                finalIsOwner = false;
            }
            
            if (id === userProfile.id && finalRole === 'inactive') {
                if (userProfile.is_owner) {
                    return await appAlert("Azione Bloccata", "L'Owner non può auto-sospendersi.\nPrima devi cedere la Proprietà a un altro membro del team.", "danger");
                }
                if(!await appConfirm("Auto-Sospensione", "ATTENZIONE: Stai impostando il tuo account come Inattivo.\nSe confermi, verrai disconnesso all'istante.\n\nVuoi procedere?", "danger")) {
                    return; 
                }
            }

            await supabaseClient.from('profiles').update({ full_name: newName, hourly_cost: newCost, role: finalRole, is_owner: finalIsOwner }).eq('id', id);
            
            if (oldProf && oldProf.hourly_cost !== newCost) {
                if(await appConfirm("Ricalcolo Storico", `Hai modificato la tariffa oraria di ${newName}.\nVuoi ricalcolare automaticamente il costo di TUTTE le ore che ha già registrato in passato con questa nuova tariffa?`, "info")) {
                    const { data: userEntries } = await supabaseClient.from('entries').select('id, duration').eq('user_name', oldProf.full_name);
                    if(userEntries && userEntries.length > 0) {
                        for(let e of userEntries) {
                            await supabaseClient.from('entries').update({ rate: (e.duration * newCost) }).eq('id', e.id);
                        }
                    }
                }
            }
            
            if (id === userProfile.id && finalRole === 'inactive') {
                await supabaseClient.auth.signOut();
                location.reload();
                return;
            }

            closeEditTeamMemberModal();
            await fetchProfiles(); 
            await fetchEntries(); 
            if (document.body.classList.contains('is-admin')) { 
                await fetchProjects(); 
                renderStrategicCharts(); 
            }
            await appAlert("Fatto", "Profilo aggiornato con successo!", "success");
        }

        async function deleteTeamMemberFromModal() {
            const id = document.getElementById('edit-team-id').value;
            if(await appConfirm("Rimuovi Definitivamente", "ATTENZIONE: Eliminando il collaboratore lo sgancerai per sempre dallo Studio. Il suo storico di ore rimarrà visibile nei report, ma lui non potrà più accedere se non con un nuovo invito.\n\nConsiglio: se ha smesso di lavorare con te, clicca su Annulla e cambia il suo ruolo in 'Inattivo' così manterrai il profilo intatto.\n\nVuoi davvero eliminarlo?", "danger")) { 
                const { error } = await supabaseClient.rpc('kick_user_from_studio', { user_to_kick: id });
                if(error) {
                    await appAlert("Errore", "Impossibile rimuovere l'utente: " + error.message, "danger");
                    return;
                }
                closeEditTeamMemberModal();
                await fetchProfiles(); 
            }
        }
