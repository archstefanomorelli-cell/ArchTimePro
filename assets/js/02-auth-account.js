// Arch Time Pro - 02-auth-account.js
function getAppRedirectUrl() {
            return `${window.location.origin}/app.html`;
        }

const MARGIN_HANDOFF_KEY = 'archtime-margin-calculator-handoff';
const MARGIN_HANDOFF_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getMarginCalculatorHandoff() {
            try {
                const handoff = JSON.parse(localStorage.getItem(MARGIN_HANDOFF_KEY) || 'null');
                if (!handoff?.values || !handoff.savedAt || Date.now() - handoff.savedAt > MARGIN_HANDOFF_MAX_AGE) {
                    localStorage.removeItem(MARGIN_HANDOFF_KEY);
                    return null;
                }
                return handoff;
            } catch (error) {
                localStorage.removeItem(MARGIN_HANDOFF_KEY);
                return null;
            }
        }

function clearMarginCalculatorHandoff() {
            localStorage.removeItem(MARGIN_HANDOFF_KEY);
            document.getElementById('onboarding-calculator-summary')?.classList.add('force-hide');
        }

function formatHandoffNumber(value, digits = 0) {
            return new Intl.NumberFormat('it-IT', {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            }).format(Number(value || 0));
        }

function switchAuthTab(mode) { 
            isSignupMode = (mode === 'signup'); 
            if (isSignupMode) window.archTimeAnalytics?.track('sign_up_start', { method: 'email' });
            document.getElementById('tab-login').className = !isSignupMode ? "flex-1 py-2.5 text-sm font-bold rounded-lg bg-white shadow-sm text-slate-900 transition-all border border-slate-200/50" : "flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"; 
            document.getElementById('tab-signup').className = isSignupMode ? "flex-1 py-2.5 text-sm font-bold rounded-lg bg-white shadow-sm text-slate-900 transition-all border border-slate-200/50" : "flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"; 
            
            document.getElementById('signup-fields').classList.toggle('force-hide', !isSignupMode); 
            document.getElementById('signup-legal').classList.toggle('force-hide', !isSignupMode);
            
            document.getElementById('btn-auth').innerText = isSignupMode ? "Crea account" : "Accedi ora"; 

            const contextCopy = document.getElementById('auth-context-copy');
            if (contextCopy) {
                contextCopy.innerHTML = isSignupMode
                    ? '<strong class="font-black">Nuovo spazio di lavoro.</strong> Scegli Manager per creare uno studio/impresa, oppure Collaboratore se hai ricevuto un codice invito.'
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

        function updateBusinessTypeSelection() {
            const selected = document.querySelector('input[name="business-type"]:checked')?.value || 'studio';
            document.querySelectorAll('[data-business-option]').forEach(option => {
                const isSelected = option.dataset.businessOption === selected;
                const isImpresa = option.dataset.businessOption === 'impresa';
                option.classList.toggle('border-slate-200', !isSelected);
                option.classList.toggle('border-primary-500', isSelected && !isImpresa);
                option.classList.toggle('ring-primary-500', isSelected && !isImpresa);
                option.classList.toggle('border-amber-500', isSelected && isImpresa);
                option.classList.toggle('ring-amber-500', isSelected && isImpresa);
                option.classList.toggle('ring-1', isSelected);
            });
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('invite')) { 
            switchAuthTab('signup'); 
            document.querySelectorAll('input[name="main-role"]').forEach(input => { if(input.value === 'staff') input.checked = true; }); 
            document.getElementById('invite-code-input').value = urlParams.get('invite'); 
            toggleSignupOptions(); 
        } else if (urlParams.get('source') === 'margin-calculator' && getMarginCalculatorHandoff()) {
            switchAuthTab('signup');
            const contextCopy = document.getElementById('auth-context-copy');
            if (contextCopy) contextCopy.innerHTML = '<strong class="font-black">Il calcolo è pronto.</strong> Crea lo spazio di lavoro: ritroverai compenso, ore, costo orario e spese nel primo avvio.';
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
                const selectedBusinessType = document.querySelector('input[name="business-type"]:checked');
                if(!isStaff && !selectedBusinessType) return await appAlert("Attenzione", "Seleziona Studio Tecnico oppure Impresa Edile.", "danger");
                const businessType = isStaff ? 'studio' : selectedBusinessType.value;
                const code = document.getElementById('invite-code-input').value.trim();
                
                if(isStaff && !code) return await appAlert("Attenzione", "Inserisci il codice invito!", "danger");
                if(!fullName) return await appAlert("Attenzione", "Inserisci il tuo nome e cognome.", "danger");
                
                const { error } = await supabaseClient.auth.signUp({ 
                    email, password, 
                    options: {
                        emailRedirectTo: getAppRedirectUrl(),
                        data: { full_name: fullName, role: finalRole, is_owner: isOwnerChoice, business_type: businessType, studio_id: isStaff ? code : null }
                    } 
                });
                
                if(error) await appAlert("Errore", error.message, "danger"); else {
                    window.archTimeAnalytics?.track('sign_up', {
                        method: 'email',
                        account_type: isStaff ? 'staff' : 'owner',
                        business_type: businessType
                    });
                    await appAlert("Controlla la tua email", "Ti abbiamo inviato un link per confermare la registrazione. Dopo la conferma potrai accedere ad Arch Time Pro.", "success");
                    switchAuthTab('login');
                }
            } else { 
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); 
                if(error) await appAlert("Errore", "Credenziali errate", "danger"); else checkUser(); 
            }
        }

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
            const link = STRIPE_LINK_FOUNDER || STRIPE_LINK_PREMIUM || STRIPE_LINK_STARTER;
            if (!isUsableStripeLink(link)) {
                return appAlert("Accesso gratuito", "I pagamenti Stripe non sono ancora attivi. In fase di lancio puoi continuare a usare Arch Time Pro senza scegliere un piano.", "info");
            }
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
            
            window.archTimeAnalytics?.track('studio_created', { business_type: bType });
            await appAlert("Congratulazioni", "Il tuo nuovo Spazio di Lavoro è pronto!", "success");
            location.reload();
        }
        
        function openUpgradeModal(featureName) { 
            document.getElementById('upgrade-message').innerText = `La funzione ${featureName} è compresa nella Tariffa Fondatori.`; 
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
                document.getElementById('account-plan-name').innerText = activePlan === 'starter' || activePlan === 'premium' ? 'FONDATORI' : activePlan.toUpperCase();
                document.getElementById('account-upgrade-btn-container').classList.add('force-hide');
                document.getElementById('account-downgrade-btn-container').classList.add('force-hide');
            } else {
                document.getElementById('billing-section').classList.add('force-hide');
            }
            
            document.getElementById('modal-account').classList.remove('force-hide');
        }
        
        function closeAccountModal() { document.getElementById('modal-account').classList.add('force-hide'); }

        async function deleteAccount() {
            if (userProfile.is_owner) {
                if (studioData?.subscription_status === 'active') {
                    return await appAlert("Abbonamento attivo", "Prima di poter eliminare definitivamente l'account e distruggere lo Spazio di Lavoro, devi annullare l'abbonamento attivo dal portale pagamenti.", "danger");
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
                if (studioData?.subscription_status === 'free') {
                    await appAlert("Account gratuito", "Questo spazio di lavoro ha accesso gratuito interno: non c'è un abbonamento Stripe da gestire.", "info");
                    return;
                }
                if(isUsableStripeLink(STRIPE_CUSTOMER_PORTAL)) {
                    window.location.href = STRIPE_CUSTOMER_PORTAL;
                } else {
                    await appAlert("Portale Stripe non configurato", "Il link del portale clienti Stripe non è ancora stato configurato. Aggiungi STRIPE_CUSTOMER_PORTAL nei secret GitHub dopo aver creato il portale in Stripe.", "info");
                }
                return;
            }
            redirectToStripe(targetPlan);
        }

        async function saveStudioName() { 
            const name = document.getElementById('account-studio-name').value.trim(); 
            if(!name) return; 
            await supabaseClient.from('studios').update({ name }).eq('id', userProfile.studio_id); 
            if(studioData) studioData.name = name; 
            const headerStudioName = document.getElementById('header-studio-name');
            if (headerStudioName) headerStudioName.innerText = name || 'Spazio di lavoro';
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
            const accountLogoPreview = document.getElementById('account-logo-preview');
            if (accountLogoPreview) {
                accountLogoPreview.src = publicUrl; 
                accountLogoPreview.classList.remove('force-hide'); 
            }
            document.getElementById('header-logo').src = publicUrl; 
            document.getElementById('header-logo').classList.remove('force-hide'); 
            await appAlert("Fatto", "Logo caricato!", "success");
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
            const calculatorHandoff = getMarginCalculatorHandoff();
            document.getElementById('onboarding-project-name').value = calculatorHandoff ? 'Commessa dal calcolatore' : '';
            document.getElementById('onboarding-project-client').value = '';
            document.getElementById('onboarding-project-budget').value = calculatorHandoff?.values?.fee || '';
            document.getElementById('onboarding-hourly-cost').value = calculatorHandoff?.values?.hourlyCost || userProfile?.hourly_cost || '';

            const summary = document.getElementById('onboarding-calculator-summary');
            if (summary) {
                summary.classList.toggle('force-hide', !calculatorHandoff);
                if (calculatorHandoff) {
                    const values = calculatorHandoff.values;
                    document.getElementById('handoff-fee').innerText = `${formatHandoffNumber(values.fee)} €`;
                    document.getElementById('handoff-hours').innerText = `${formatHandoffNumber(values.ownerHours + values.teamHours, 1)} h`;
                    document.getElementById('handoff-cost').innerText = `${formatHandoffNumber(values.hourlyCost, 2)} €/h`;
                    document.getElementById('handoff-expenses').innerText = `${formatHandoffNumber(values.expenses)} €`;
                }
            }
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

        async function saveOnboardingHourlyCost() {
            const costInput = document.getElementById('onboarding-hourly-cost');
            const cost = parseFloat(costInput?.value);
            if (isNaN(cost) || cost < 0) return;
            await supabaseClient.from('profiles').update({ hourly_cost: cost }).eq('id', userProfile.id);
            if (userProfile) userProfile.hourly_cost = cost;
            const profile = profiles.find(item => item.id === userProfile.id);
            if (profile) profile.hourly_cost = cost;
        }

        async function prepareFirstProjectFromOnboarding() {
            await saveOnboardingHourlyCost();
            const name = document.getElementById('onboarding-project-name').value.trim();
            const client = document.getElementById('onboarding-project-client').value.trim();
            const budget = document.getElementById('onboarding-project-budget').value;
            const defaults = THEMES[currentBusinessType].defaultCatalog.slice(0, 3);

            openCreateProjectModal();
            document.getElementById('edit-modal-name').value = name || THEMES[currentBusinessType].demoProject;
            document.getElementById('edit-modal-client').value = client || THEMES[currentBusinessType].demoClient;
            document.getElementById('edit-modal-budget').value = budget || '';
            newProjectTasks = defaults.length > 0 ? defaults : ['Generico'];
            renderNewProjectUI();
            switchAppTab('operate');
            closeOwnerOnboarding(true);
            document.getElementById('edit-modal-name')?.focus();
        }

        async function checkUser() {
            if (window.archTimePasswordRecoveryActive) return;

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
                    activePlan = studioData?.plan_type || 'founder'; 

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

                    if (['active', 'free'].includes(status)) {
                        trialBadge.classList.add('force-hide'); 
                        planBadge.innerText = status === 'free' ? 'FREE' : 'FONDATORI'; 
                        planBadge.classList.remove('force-hide');
                    } else {
                        const createdAt = new Date(studioData?.created_at || new Date()); 
                        const expireDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); 
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
                                const accountLogoPreview = document.getElementById('account-logo-preview');
                                if (accountLogoPreview) {
                                    accountLogoPreview.src = studioData.logo_url; 
                                    accountLogoPreview.classList.remove('force-hide'); 
                                }
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
            const requestedTab = ['operate', 'analyze', 'manage'].includes(tabName) ? tabName : 'operate';
            const isAdmin = document.body.classList.contains('is-admin');
            const nextTab = !isAdmin && requestedTab !== 'operate' ? 'operate' : requestedTab;

            document.querySelectorAll('.mobile-tab').forEach(el => {
                el.classList.toggle('active', el.dataset.tab === nextTab);
            }); 

            document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => { 
                const isActive = btn.dataset.tab === nextTab;
                btn.classList.toggle('is-active', isActive);
                btn.classList.toggle('text-primary-600', isActive); 
                btn.classList.toggle('text-slate-400', !isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            }); 

            if (document.activeElement?.classList?.contains('nav-btn')) {
                document.activeElement.blur();
            }

            if(nextTab === 'analyze' && isAdmin) {
                const analyticsDetails = document.getElementById('analytics-details');
                const shouldAutoOpen = window.matchMedia('(max-width: 1023px)').matches
                    && analyticsDetails?.classList.contains('force-hide');

                if (shouldAutoOpen) {
                    setTimeout(toggleAnalyticsPanel, 50);
                } else {
                    setTimeout(renderStrategicCharts, 50);
                }
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
                if (getMarginCalculatorHandoff() || shouldShowOwnerOnboarding()) setTimeout(openOwnerOnboarding, 500);
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
