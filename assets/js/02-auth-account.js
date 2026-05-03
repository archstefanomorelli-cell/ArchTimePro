// Arch Time Pro - 02-auth-account.js
function switchAuthTab(mode) { 
            isSignupMode = (mode === 'signup'); 
            document.getElementById('tab-login').className = !isSignupMode ? "flex-1 py-2.5 text-sm font-bold rounded-lg bg-white shadow-sm text-slate-900 transition-all border border-slate-200/50" : "flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"; 
            document.getElementById('tab-signup').className = isSignupMode ? "flex-1 py-2.5 text-sm font-bold rounded-lg bg-white shadow-sm text-slate-900 transition-all border border-slate-200/50" : "flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"; 
            
            document.getElementById('signup-fields').classList.toggle('force-hide', !isSignupMode); 
            document.getElementById('signup-legal').classList.toggle('force-hide', !isSignupMode);
            
            document.getElementById('btn-auth').innerText = isSignupMode ? "Crea account" : "Accedi ora"; 

            const contextCopy = document.getElementById('auth-context-copy');
            if (contextCopy) {
                contextCopy.innerHTML = isSignupMode
                    ? '<strong class="font-black">Nuovo spazio beta.</strong> Scegli Manager per creare uno studio/impresa, oppure Collaboratore se hai ricevuto un codice invito.'
                    : '<strong class="font-black">Bentornato.</strong> Accedi per registrare ore, controllare lavori e consultare i dati del tuo spazio.';
            }
            
            let forgotLink = document.getElementById('forgot-link-container');
            if(forgotLink) forgotLink.classList.toggle('force-hide', isSignupMode);
        }
        
        function toggleSignupOptions() { 
            const checkedRole = document.querySelector('input[name="main-role"]:checked');
            if(!checkedRole) {
                document.getElementById('invite-code-container').classList.add('force-hide'); 
                document.getElementById('sector-selection').classList.add('force-hide');
                const trialInfo = document.getElementById('trial-info-container'); 
                if (trialInfo) trialInfo.classList.add('force-hide');
                return;
            }
            const role = checkedRole.value; 
            const isStaff = role === 'staff';
            document.getElementById('invite-code-container').classList.toggle('force-hide', !isStaff); 
            document.getElementById('sector-selection').classList.toggle('force-hide', isStaff);
            const trialInfo = document.getElementById('trial-info-container'); 
            if (trialInfo) trialInfo.classList.toggle('force-hide', isStaff); 
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('invite')) { 
            switchAuthTab('signup'); 
            document.querySelectorAll('input[name="main-role"]').forEach(input => { if(input.value === 'staff') input.checked = true; }); 
            document.getElementById('invite-code-input').value = urlParams.get('invite'); 
            toggleSignupOptions(); 
        }

        async function handleAuthAction() {
            const email = document.getElementById('email').value.trim(); 
            const password = document.getElementById('password').value; 
            const fullName = document.getElementById('full-name').value.trim();
            
            if(isSignupMode) {
                const acceptTerms = document.getElementById('accept-terms').checked;
                if(!acceptTerms) return await appAlert("Attenzione", "Devi accettare i Termini di Servizio e la Privacy Policy per registrarti.", "danger");
                
                const checkedRole = document.querySelector('input[name="main-role"]:checked');
                if(!checkedRole) return await appAlert("Attenzione", "Seleziona prima il tipo di account.", "danger");
                
                let role = checkedRole.value; 
                const isOwnerChoice = role === 'owner';
                const finalRole = isOwnerChoice ? 'admin' : role; 
                const isStaff = finalRole === 'staff';
                const businessType = isStaff ? 'studio' : document.querySelector('input[name="business-type"]:checked').value;
                const code = document.getElementById('invite-code-input').value.trim();
                
                if(isStaff && !code) return await appAlert("Attenzione", "Inserisci il codice invito!", "danger");
                if(!fullName) return await appAlert("Attenzione", "Inserisci il tuo nome e cognome.", "danger");
                
                const { error } = await supabaseClient.auth.signUp({ 
                    email, password, 
                    options: {
                        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
                        data: { full_name: fullName, role: finalRole, is_owner: isOwnerChoice, business_type: businessType, studio_id: isStaff ? code : null }
                    } 
                });
                
                if(error) await appAlert("Errore", error.message, "danger"); else { await appAlert("Controlla la tua email", "Ti abbiamo inviato un link per confermare la registrazione. Dopo la conferma potrai accedere ad Arch Time Pro.", "success"); switchAuthTab('login'); }
            } else { 
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); 
                if(error) await appAlert("Errore", "Credenziali errate", "danger"); else checkUser(); 
            }
        }

        function checkCookies() {
            if (!localStorage.getItem('cookie_consent_archtime')) { document.getElementById('cookie-banner').classList.remove('force-hide'); }
        }
        function acceptCookies() {
            localStorage.setItem('cookie_consent_archtime', 'true'); document.getElementById('cookie-banner').classList.add('force-hide');
        }
        document.addEventListener('DOMContentLoaded', checkCookies);

        async function exportUserData() {
            if(!userProfile) return await appAlert("Errore", "Utente non trovato.", "danger");
            try {
                const exportData = { profile: userProfile, studio: ['admin', 'owner'].includes(userProfile.role) || userProfile.is_owner ? studioData : "Dati Studio non accessibili.", projects: projects, entries: entries, expenses: expenses, exportDate: new Date().toISOString() };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
                const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", "Export_" + safeFileName(userProfile.full_name, 'utente') + ".json");
                document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
            } catch (err) { await appAlert("Errore", "Errore: " + err.message, "danger"); }
        }

        function redirectToStripe(plan) { 
            if(!userProfile || !userProfile.studio_id) return; 
            const link = plan === 'starter' ? STRIPE_LINK_STARTER : STRIPE_LINK_PREMIUM;
            window.location.href = `${link}?client_reference_id=${userProfile.studio_id}`; 
        }

        function showPaywall() { 
            document.getElementById('auth-container').classList.add('force-hide'); 
            document.getElementById('app-container').classList.add('force-hide'); 
            document.getElementById('paywall-container').classList.remove('force-hide'); 
            lucide.createIcons(); 
        }
        
        function showLimboScreen(fullName) {
            document.getElementById('auth-container').classList.add('force-hide');
            document.getElementById('app-container').classList.add('force-hide');
            document.getElementById('limbo-user-name').innerText = `Bentornato, ${fullName.split(' ')[0]}!`;
            document.getElementById('limbo-container').classList.remove('force-hide');
            lucide.createIcons();
        }

        async function limboJoinStudio() {
            const code = document.getElementById('limbo-invite-code').value.trim();
            if(!code) return await appAlert("Attenzione", "Inserisci un Codice Invito valido.", "danger");
            
            const { error } = await supabaseClient.from('profiles').update({ studio_id: code, role: 'staff' }).eq('id', userProfile.id);
            if(error) return await appAlert("Errore", "Impossibile unirsi allo studio. Controlla il codice.", "danger");
            
            await appAlert("Benvenuto", "Ti sei unito al nuovo team con successo!", "success");
            location.reload();
        }

        async function limboCreateStudio() {
            const bType = document.querySelector('input[name="limbo-business-type"]:checked').value;
            const sName = document.getElementById('limbo-studio-name').value.trim() || 'Mio Spazio di Lavoro';
            
            const { data, error } = await supabaseClient.rpc('create_studio_from_limbo', { studio_name: sName, b_type: bType });
            if(error) return await appAlert("Errore", error.message, "danger");
            
            await appAlert("Congratulazioni", "Il tuo nuovo Spazio di Lavoro è pronto!", "success");
            location.reload();
        }
        
        function openUpgradeModal(featureName) { 
            document.getElementById('upgrade-message').innerText = `La funzione ${featureName} è riservata agli abbonamenti Premium.`; 
            document.getElementById('modal-upgrade').classList.remove('force-hide'); 
            if (document.getElementById('modal-detail')) document.getElementById('modal-detail').classList.add('force-hide'); 
            if (document.getElementById('modal-report')) document.getElementById('modal-report').classList.add('force-hide'); 
            if (document.getElementById('modal-team-report')) document.getElementById('modal-team-report').classList.add('force-hide'); 
        }

        function closeUpgradeModal() { document.getElementById('modal-upgrade').classList.add('force-hide'); }

        function openAccountModal() {
            document.getElementById('account-name').innerText = userProfile.full_name;
            document.getElementById('account-email').innerText = userProfile.email;
            
            if(userProfile.is_owner) {
                document.getElementById('billing-section').classList.remove('force-hide');
                document.getElementById('account-plan-name').innerText = activePlan.toUpperCase();
                document.getElementById('account-upgrade-btn-container').classList.toggle('force-hide', activePlan !== 'starter');
                document.getElementById('account-downgrade-btn-container').classList.toggle('force-hide', activePlan !== 'premium');
            } else {
                document.getElementById('billing-section').classList.add('force-hide');
            }
            
            document.getElementById('modal-account').classList.remove('force-hide');
        }
        
        function closeAccountModal() { document.getElementById('modal-account').classList.add('force-hide'); }

        async function deleteAccount() {
            if (userProfile.is_owner) {
                if (activePlan === 'premium' && studioData?.subscription_status === 'active') {
                    return await appAlert("Abbonamento Attivo", "Prima di poter eliminare definitivamente l'account e distruggere lo Spazio di Lavoro, devi annullare il tuo abbonamento Premium attivo dal portale pagamenti (pulsante Gestione Fatture via Stripe).", "danger");
                }
                const warning = currentBusinessType === 'impresa' ? "Se sei il Titolare, eliminerai anche l'intera Impresa, tutti i cantieri e i dati storici." : "Se sei il Manager, eliminerai anche l'intero Studio, tutti i progetti e i dati storici.";
                
                if(await appConfirm("Distruzione Spazio di Lavoro", `ATTENZIONE: Stai per eliminare il tuo account da Owner. ${warning}\nQuesta operazione è IRREVERSIBILE e tutti i collaboratori verranno espulsi. Vuoi procedere?`, "danger")) {
                    const check = await appPrompt("Conferma di sicurezza", "Scrivi ELIMINA per confermare la cancellazione:", "ELIMINA");
                    if(check === "ELIMINA") {
                        const { error } = await supabaseClient.rpc('delete_user_account');
                        if(error) await appAlert("Errore", error.message, "danger"); 
                        else { 
                            await supabaseClient.auth.signOut(); 
                            await appAlert("Spazio Eliminato", "Lo Spazio di Lavoro e tutti i dati sono stati distrutti.", "success"); 
                            location.reload(); 
                        }
                    } else if(check !== null) { 
                        await appAlert("Annullato", "Operazione annullata.", "info"); 
                    }
                }
            } else {
                if(await appConfirm("Abbandona Studio", "Vuoi davvero eliminare il tuo account e uscire dallo Studio? Perderai l'accesso per sempre.", "danger")) {
                    await supabaseClient.from('profiles').delete().eq('id', userProfile.id);
                    await supabaseClient.rpc('delete_user_account'); 
                    await supabaseClient.auth.signOut();
                    location.reload();
                }
            }
        }

        async function handlePlanChange(targetPlan) {
            if (targetPlan === 'portal') {
                if(STRIPE_CUSTOMER_PORTAL && STRIPE_CUSTOMER_PORTAL.includes('http')) window.location.href = STRIPE_CUSTOMER_PORTAL;
                return;
            }
            if (targetPlan === 'starter') {
                const activeCount = projects.filter(p => !p.is_archived).length;
                if (activeCount > 5) { return await appAlert("Attenzione", `Il piano Starter ha un limite di 5 lavori attivi. Ne hai ${activeCount}.\nArchivia o elimina i lavori in eccesso prima di procedere al downgrade.`, "danger"); }
            }
            redirectToStripe(targetPlan);
        }

        async function saveStudioName() { 
            const name = document.getElementById('account-studio-name').value.trim(); 
            if(!name) return; 
            await supabaseClient.from('studios').update({ name }).eq('id', userProfile.studio_id); 
            if(studioData) studioData.name = name; 
            await appAlert("Fatto", "Nome aggiornato!", "success"); 
        }

        async function uploadLogo(event) { 
            const file = event.target.files[0]; 
            if(!file) return; 
            const fileExt = file.name.split('.').pop(); 
            const filePath = `${userProfile.studio_id}_logo.${fileExt}`; 
            const { error: uploadError } = await supabaseClient.storage.from('studio-logos').upload(filePath, file, { upsert: true }); 
            if(uploadError) return await appAlert("Errore", uploadError.message, "danger"); 
            const { data: { publicUrl } } = supabaseClient.storage.from('studio-logos').getPublicUrl(filePath); 
            await supabaseClient.from('studios').update({ logo_url: publicUrl }).eq('id', userProfile.studio_id); 
            if(studioData) studioData.logo_url = publicUrl; 
            document.getElementById('account-logo-preview').src = publicUrl; 
            document.getElementById('account-logo-preview').classList.remove('force-hide'); 
            document.getElementById('header-logo').src = publicUrl; 
            document.getElementById('header-logo').classList.remove('force-hide'); 
        }

        function ownerOnboardingKey() {
            return userProfile?.studio_id ? `archtime-owner-onboarding:${userProfile.studio_id}` : '';
        }

        function shouldShowOwnerOnboarding() {
            if (!userProfile || !studioData) return false;
            if (!(userProfile.is_owner || userProfile.role === 'admin')) return false;
            const key = ownerOnboardingKey();
            return key && localStorage.getItem(key) !== 'done';
        }

        function markOwnerOnboardingDone() {
            const key = ownerOnboardingKey();
            if (key) localStorage.setItem(key, 'done');
        }

        function openOwnerOnboarding() {
            const modal = document.getElementById('modal-owner-onboarding');
            if (!modal) return;

            document.getElementById('onboarding-studio-name').value = studioData?.name || '';
            document.getElementById('onboarding-business-label').innerText = currentBusinessType === 'impresa' ? 'Impresa Edile' : 'Studio Tecnico';
            document.getElementById('onboarding-project-name').value = '';
            document.getElementById('onboarding-project-client').value = '';
            document.getElementById('onboarding-project-budget').value = '';
            modal.classList.remove('force-hide');
            lucide.createIcons();
        }

        function closeOwnerOnboarding(markDone = true) {
            document.getElementById('modal-owner-onboarding')?.classList.add('force-hide');
            if (markDone) markOwnerOnboardingDone();
        }

        async function saveOnboardingIdentity() {
            const name = document.getElementById('onboarding-studio-name').value.trim();
            const businessType = studioData?.business_type || currentBusinessType || 'studio';

            if (!name) return await appAlert("Attenzione", "Inserisci il nome dello spazio di lavoro.", "danger");

            await supabaseClient.from('studios').update({ name }).eq('id', userProfile.studio_id);
            if (studioData) {
                studioData.name = name;
            }

            document.getElementById('account-studio-name').value = name;
            applyTheme(businessType);
            renderNewProjectUI();
            await appAlert("Fatto", "Identità salvata.", "success");
        }

        function prepareFirstProjectFromOnboarding() {
            const name = document.getElementById('onboarding-project-name').value.trim();
            const client = document.getElementById('onboarding-project-client').value.trim();
            const budget = document.getElementById('onboarding-project-budget').value;
            const defaults = THEMES[currentBusinessType].defaultCatalog.slice(0, 3);

            document.getElementById('new-proj-name').value = name || THEMES[currentBusinessType].demoProject;
            document.getElementById('new-proj-client').value = client || THEMES[currentBusinessType].demoClient;
            document.getElementById('new-proj-budget').value = budget || '';
            newProjectTasks = defaults.length > 0 ? defaults : ['Generico'];
            renderNewProjectUI();
            switchAppTab('manage');
            closeOwnerOnboarding(true);
            document.getElementById('new-proj-name')?.focus();
        }

        async function checkUser() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if(user) {
                const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
                if(profile) {
                    userProfile = profile;
                    
                    if(!userProfile.studio_id) {
                        showLimboScreen(userProfile.full_name);
                        return;
                    }

                    const { data: studio } = await supabaseClient.from('studios').select('*').eq('id', userProfile.studio_id).single();
                    if(studio) studioData = studio;

                    const status = studioData?.subscription_status || 'trialing';
                    activePlan = studioData?.plan_type || 'premium'; 

                    let bType = 'studio';
                    if (userProfile.role === 'admin' || userProfile.is_owner) {
                        bType = user?.user_metadata?.business_type || 'studio';
                        if (studioData && !studioData.business_type) {
                            await supabaseClient.from('studios').update({ business_type: bType }).eq('id', studioData.id);
                            studioData.business_type = bType;
                        }
                    } else {
                        bType = studioData?.business_type || 'studio';
                    }
                    applyTheme(bType);
                    
                    if (['canceled', 'past_due', 'inactive'].includes(status)) { showPaywall(); return; }

                    const trialBadge = document.getElementById('trial-badge');
                    const planBadge = document.getElementById('plan-badge');

                    if (status === 'active') {
                        trialBadge.classList.add('force-hide'); 
                        planBadge.innerText = activePlan === 'starter' ? 'STARTER' : 'PREMIUM'; 
                        planBadge.classList.remove('force-hide');
                    } else {
                        const createdAt = new Date(studioData?.created_at || new Date()); 
                        const expireDate = new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000); 
                        const daysLeft = Math.ceil((expireDate.getTime() - Date.now()) / (1000 * 3600 * 24));
                        if (daysLeft > 0) {
                            trialBadge.innerText = `PROVA: ${daysLeft} GG`; 
                            trialBadge.className = daysLeft <= 3 ? "admin-only text-[9px] bg-red-50 text-red-600 border-red-200 px-1.5 py-0.5 rounded-md font-bold border whitespace-nowrap" : "admin-only text-[9px] bg-primary-50 text-primary-600 border-primary-200 px-1.5 py-0.5 rounded-md font-bold border whitespace-nowrap"; 
                            trialBadge.classList.remove('force-hide'); 
                            planBadge.innerText = 'TUTTO SBLOCCATO'; 
                            planBadge.classList.remove('force-hide');
                        } else { 
                            showPaywall(); 
                            return; 
                        }
                    }

                    if(['admin', 'owner'].includes(profile.role) || profile.is_owner) {
                        document.body.classList.add('is-admin');
                        activityCatalog = studioData?.activity_catalog ? studioData.activity_catalog : [...THEMES[currentBusinessType].defaultCatalog];
                        projectTemplates = studioData?.project_templates ? studioData.project_templates : [...THEMES[currentBusinessType].defaultTemplates];
                        if(studioData) {
                            document.getElementById('account-studio-name').value = studioData.name || '';
                            if(studioData.logo_url) { 
                                document.getElementById('account-logo-preview').src = studioData.logo_url; 
                                document.getElementById('account-logo-preview').classList.remove('force-hide'); 
                                document.getElementById('header-logo').src = studioData.logo_url; 
                                document.getElementById('header-logo').classList.remove('force-hide'); 
                            }
                        }
                    }

                    document.getElementById('user-display').innerText = profile.full_name;
                    const headerStudioName = document.getElementById('header-studio-name');
                    const headerUserRole = document.getElementById('header-user-role');
                    if (headerStudioName) headerStudioName.innerText = studioData?.name || 'Spazio di lavoro';
                    if (headerUserRole) headerUserRole.innerText = profile.is_owner ? 'Owner' : (profile.role === 'admin' ? 'Admin' : 'Collaboratore');
                    document.getElementById('auth-container').classList.add('force-hide'); 
                    document.getElementById('app-container').classList.remove('force-hide');
                    initApp();
                } else if (error) {
                    await appAlert("Errore", "Errore accesso database.", "danger");
                }
            }
        }

        async function handleLogout() { 
            await supabaseClient.auth.signOut(); 
            location.reload(); 
        }

        function switchAppTab(tabName) { 
            document.querySelectorAll('.mobile-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tabName)); 
            document.querySelectorAll('.nav-btn').forEach(btn => { 
                btn.classList.toggle('text-primary-600', btn.dataset.tab === tabName); 
                btn.classList.toggle('text-slate-400', btn.dataset.tab !== tabName); 
            }); 
            if(tabName === 'analyze' && document.body.classList.contains('is-admin')) {
                setTimeout(renderStrategicCharts, 50); 
            }
            window.scrollTo(0, 0); 
        }

        function getTeamInviteUrl() {
            return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(userProfile.studio_id)}`;
        }

        function openTeamInviteModal() {
            if (!userProfile?.studio_id) return;
            document.getElementById('team-invite-email').value = '';
            document.getElementById('team-invite-code-preview').innerText = userProfile.studio_id;
            document.getElementById('modal-team-invite').classList.remove('force-hide');
            lucide.createIcons();
        }

        function closeTeamInviteModal() {
            document.getElementById('modal-team-invite').classList.add('force-hide');
        }

        async function copyTeamInviteCode() {
            await navigator.clipboard.writeText(userProfile.studio_id);
            await appAlert("Fatto", "Codice invito copiato negli appunti.", "success");
        }

        async function sendTeamInviteEmail() {
            const email = document.getElementById('team-invite-email').value.trim();
            if (!email) return await appAlert("Attenzione", "Inserisci l'email del collaboratore.", "danger");

            const { error } = await supabaseClient.functions.invoke('send-team-invite', {
                body: {
                    email,
                    inviteCode: userProfile.studio_id,
                    inviteUrl: getTeamInviteUrl()
                }
            });

            if (error) return await appAlert("Errore", error.message || "Invio email non riuscito.", "danger");

            closeTeamInviteModal();
            await appAlert("Invito inviato", "Il collaboratore riceverà una email con link e codice invito.", "success");
        }

        async function generateInviteLink() { 
            openTeamInviteModal();
        }

        async function initApp() {
            lucide.createIcons();
            await fetchProjects(); 
            await fetchEntries(); 
            await fetchExpenses();
            if(document.body.classList.contains('is-admin')) { 
                await fetchProfiles(); 
                renderCatalogAndTemplatesUI(); 
                await checkAndGenerateDemoData(); 
                applyPlanLimitsUI(); 
                if (shouldShowOwnerOnboarding()) setTimeout(openOwnerOnboarding, 500);
            }
            await restoreCloudTimer();
        }

        function applyPlanLimitsUI() {
            if(activePlan === 'starter') {
                const btnHeaderPdf = document.getElementById('btn-header-pdf');
                if(btnHeaderPdf) { 
                    btnHeaderPdf.onclick = () => openUpgradeModal('Report PDF Cumulativi'); 
                    btnHeaderPdf.classList.add('locked-feature'); 
                }
                const btnManageTemplates = document.getElementById('btn-manage-templates');
                if(btnManageTemplates) { 
                    btnManageTemplates.onclick = () => openUpgradeModal('Template dei Lavori'); 
                    btnManageTemplates.classList.add('locked-feature'); 
                    btnManageTemplates.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i>'; 
                }
            }
            lucide.createIcons();
        }

        async function checkAndGenerateDemoData() {
            if (projects.length === 0 && (!studioData || studioData.demo_generated !== true)) {
                await supabaseClient.from('studios').update({ demo_generated: true }).eq('id', userProfile.studio_id);
                const t = THEMES[currentBusinessType];
                const { data: pData } = await supabaseClient.from('projects').insert([ 
                    { studio_id: userProfile.studio_id, name: t.demoProject, client: t.demoClient, budget: 15000, tasks: [t.demoTask, 'Riunioni'] } 
                ]).select();
                
                if(pData && pData.length > 0) {
                    const rate = profiles.find(p=>p.id===userProfile.id)?.hourly_cost || 50;
                    await supabaseClient.from('entries').insert([ 
                        { studio_id: userProfile.studio_id, project_id: pData[0].id, project_name: pData[0].name, task: t.demoTask, duration: 4, rate: rate*4, user_name: userProfile.full_name, user_email: userProfile.email, created_at: new Date().toISOString() } 
                    ]);
                    await supabaseClient.from('expenses').insert([ 
                        { studio_id: userProfile.studio_id, project_id: pData[0].id, description: t.demoExpense, amount: 150.00, user_name: userProfile.full_name, created_at: new Date().toISOString() } 
                    ]);
                }
                await fetchProjects(); 
                await fetchEntries(); 
                await fetchExpenses();
            }
        }
