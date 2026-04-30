const SUPABASE_URL = 'https://bfexlzqqtbjdhqvmcwze.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_rGziCVzLtzhGwQkyG5-Ixw_HZ3DuKkG';
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const STRIPE_LINK_STARTER = "https://buy.stripe.com/test_fZucN6aG359T41teSD67S02"; 
        const STRIPE_LINK_PREMIUM = "https://buy.stripe.com/test_5kQ4gA4hF1XHfKb39V67S03";
        const STRIPE_CUSTOMER_PORTAL = "https://billing.stripe.com/p/login/test_eVq6oIg0nbyhfKb9yj67S00"; 

        let userProfile = null, studioData = null, isSignupMode = false;
        let projects = [], entries = [], profiles = [], expenses = [];
        let showArchived = false, timerRunning = false, startTime, timerInterval;
        let charts = { global: null, tasks: null };
        let activePlan = 'premium'; 
        let showInactiveMembers = false; 

        let currentBusinessType = 'studio';
        const THEMES = {
            studio: {
                appNameHtmlLanding: 'Arch <span class="text-primary-500">Time</span> Pro',
                appNameHtmlHeader: 'ARCH <span class="text-primary-600">TIME</span> PRO',
                managerLabel: 'Manager Studio',
                studioNameLabel: 'Nome Studio',
                identityTitle: 'Identità Studio',
                catalogTitle: 'Catalogo Attività',
                catalogDesc: 'Personalizza il vocabolario dello Studio.',
                activeProjectsTitle: 'Progetti Attivi',
                newProjectTitle: 'Nuovo Progetto',
                templateModalTitle: 'Template Progetti',
                defaultCatalog: ["Sopralluogo", "Rilievo", "Progetto Preliminare", "Progetto Definitivo", "Progetto Esecutivo", "Direzione Lavori", "Pratica Comunale", "Computo Metrico", "Riunioni", "Generico"],
                defaultTemplates: [{name: "Ristrutturazione", tasks: ["Sopralluogo", "Rilievo", "Progetto Preliminare", "Computo Metrico", "Pratica Comunale", "Direzione Lavori"]}],
                demoProject: 'Villa sul Lago',
                demoClient: 'Famiglia Rossi',
                demoTask: 'Sopralluogo',
                demoExpense: 'Marche da bollo',
                pdfColor: [79, 70, 229], 
                chartMainColor: '#4f46e5',
                chartPalette: ['#312e81','#4338ca','#4f46e5','#6366f1','#818cf8']
            },
            impresa: {
                appNameHtmlLanding: 'Arch <span class="text-primary-500">Time</span> Pro',
                appNameHtmlHeader: 'ARCH <span class="text-primary-600">TIME</span> PRO',
                managerLabel: 'Titolare Impresa',
                studioNameLabel: 'Ragione Sociale',
                identityTitle: 'Identità Impresa',
                catalogTitle: 'Lavorazioni Cantiere',
                catalogDesc: 'Personalizza l\'elenco lavorazioni.',
                activeProjectsTitle: 'Cantieri Attivi',
                newProjectTitle: 'Nuovo Cantiere',
                templateModalTitle: 'Template Cantieri',
                defaultCatalog: ["Allestimento Cantiere", "Scavi e Demolizioni", "Opere Murarie", "Impianto Idraulico", "Impianto Elettrico", "Posa Pavimenti", "Tinteggiatura", "Cartongesso", "Riunioni", "Generico"],
                defaultTemplates: [{name: "Ristrutturazione Bagno", tasks: ["Scavi e Demolizioni", "Impianto Idraulico", "Opere Murarie", "Posa Pavimenti", "Tinteggiatura"]}],
                demoProject: 'Cantiere Via Roma',
                demoClient: 'Condominio Roma',
                demoTask: 'Allestimento Cantiere',
                demoExpense: 'Materiale Edile',
                pdfColor: [217, 119, 6], 
                chartMainColor: '#d97706',
                chartPalette: ['#78350f','#b45309','#d97706','#f59e0b','#fbbf24']
            }
        };

        function formatTime(decimalHours) {
            const h = Math.floor(decimalHours);
            const m = Math.round((decimalHours - h) * 60);
            if (h === 0) return `${m}m`;
            if (m === 0) return `${h}h`;
            return `${h}h ${m.toString().padStart(2, '0')}m`;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeAttr(value) {
            return escapeHtml(value).replace(/`/g, '&#96;');
        }

        function applyTheme(type) {
            currentBusinessType = type;
            const theme = THEMES[type];
            if (type === 'impresa') { document.body.classList.add('theme-impresa'); } else { document.body.classList.remove('theme-impresa'); }
            
            const els = {
                'landing-title': theme.appNameHtmlLanding,
                'header-title': theme.appNameHtmlHeader,
                'lbl-new-project': `<i data-lucide="folder-plus" class="text-primary-500 w-5 h-5"></i> ${theme.newProjectTitle}`,
                'lbl-active-projects': theme.activeProjectsTitle,
                'lbl-identity-title': `<i data-lucide="image" class="w-3.5 h-3.5"></i> ${theme.identityTitle}`,
                'lbl-catalog-title': theme.catalogTitle,
                'lbl-catalog-desc': theme.catalogDesc,
                'modal-catalog-title': `<i data-lucide="book-open" class="text-primary-500 w-5 h-5"></i> ${theme.catalogTitle}`,
                'modal-catalog-desc': theme.catalogDesc,
                'modal-template-title': `<i data-lucide="layers" class="text-primary-500 w-5 h-5"></i> ${theme.templateModalTitle}`,
                'account-role': userProfile?.is_owner ? 'Owner (' + theme.managerLabel + ')' : (userProfile?.role === 'admin' ? 'Admin' : 'Collaboratore')
            };

            for (let id in els) {
                let el = document.getElementById(id);
                if (el) el.innerHTML = els[id];
            }
            
            let studioInput = document.getElementById('account-studio-name');
            if(studioInput) studioInput.placeholder = theme.studioNameLabel;
            
            let timerProjLbl = document.getElementById('lbl-timer-project');
            if(timerProjLbl) timerProjLbl.innerText = type === 'impresa' ? 'Cantiere' : 'Progetto';

            lucide.createIcons();
        }

        let activityCatalog = [], projectTemplates = [], newProjectTasks = [], editProjectTasks = [], newTemplateTasks = [];
        let editingTemplateIndex = null, editingCatalogTask = null, taskBuilderMode = 'new', tempBuilderTasks = [];

        function showCustomDialog(options) {
            return new Promise((resolve) => {
                const modal = document.getElementById('custom-dialog');
                const card = document.getElementById('custom-dialog-card');
                const titleEl = document.getElementById('custom-dialog-title');
                const msgEl = document.getElementById('custom-dialog-msg');
                const iconEl = document.getElementById('custom-dialog-icon');
                const inputEl = document.getElementById('custom-dialog-input');
                const btnsEl = document.getElementById('custom-dialog-buttons');
                
                titleEl.innerText = options.title || 'Attenzione';
                msgEl.innerText = options.message || '';
                
                if(options.type === 'danger') {
                    iconEl.className = "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-red-50 text-red-600 border border-red-100";
                    iconEl.innerHTML = '<i data-lucide="alert-triangle" class="w-8 h-8"></i>';
                } else if (options.type === 'success') {
                    iconEl.className = "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-emerald-50 text-emerald-600 border border-emerald-100";
                    iconEl.innerHTML = '<i data-lucide="check-circle" class="w-8 h-8"></i>';
                } else {
                    iconEl.className = "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-primary-50 text-primary-600 border border-primary-100";
                    iconEl.innerHTML = '<i data-lucide="info" class="w-8 h-8"></i>';
                }

                inputEl.value = '';
                if(options.prompt) {
                    inputEl.classList.remove('force-hide');
                    inputEl.placeholder = options.promptPlaceholder || '';
                } else {
                    inputEl.classList.add('force-hide');
                }

                btnsEl.innerHTML = '';
                
                const closeAndResolve = (val) => {
                    card.classList.remove('scale-100', 'opacity-100');
                    card.classList.add('scale-95', 'opacity-0');
                    setTimeout(() => { modal.classList.add('force-hide'); resolve(val); }, 200);
                };

                if(options.confirm) {
                    const btnCancel = document.createElement('button');
                    btnCancel.className = "flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm";
                    btnCancel.innerText = "Annulla";
                    btnCancel.onclick = () => closeAndResolve(options.prompt ? null : false);
                    btnsEl.appendChild(btnCancel);

                    const btnOk = document.createElement('button');
                    btnOk.className = `flex-1 text-white py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm ${options.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`;
                    btnOk.innerText = "Conferma";
                    btnOk.onclick = () => {
                        if(options.prompt) closeAndResolve(inputEl.value.trim());
                        else closeAndResolve(true);
                    };
                    btnsEl.appendChild(btnOk);
                } else {
                    const btnOk = document.createElement('button');
                    btnOk.className = "w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-sm";
                    btnOk.innerText = "OK";
                    btnOk.onclick = () => closeAndResolve(true);
                    btnsEl.appendChild(btnOk);
                }

                lucide.createIcons();
                modal.classList.remove('force-hide');
                setTimeout(() => {
                    card.classList.remove('scale-95', 'opacity-0');
                    card.classList.add('scale-100', 'opacity-100');
                }, 10);
                
                if(options.prompt) inputEl.focus();
            });
        }

        window.appAlert = (title, message, type='info') => showCustomDialog({title, message, type, confirm: false});
        window.appConfirm = (title, message, type='danger') => showCustomDialog({title, message, type, confirm: true});
        window.appPrompt = (title, message, placeholder) => showCustomDialog({title, message, type:'danger', confirm: true, prompt: true, promptPlaceholder: placeholder});

        function getMonday(d) {
            d = new Date(d);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            monday.setHours(0,0,0,0);
            return monday;
        }
        let currentWeekStart = getMonday(new Date());

        function switchAuthTab(mode) { 
            isSignupMode = (mode === 'signup'); 
            document.getElementById('tab-login').className = !isSignupMode ? "flex-1 py-2.5 text-sm font-bold rounded-lg bg-white shadow-sm text-slate-900 transition-all border border-slate-200/50" : "flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"; 
            document.getElementById('tab-signup').className = isSignupMode ? "flex-1 py-2.5 text-sm font-bold rounded-lg bg-white shadow-sm text-slate-900 transition-all border border-slate-200/50" : "flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"; 
            
            document.getElementById('signup-fields').classList.toggle('force-hide', !isSignupMode); 
            document.getElementById('signup-legal').classList.toggle('force-hide', !isSignupMode);
            
            document.getElementById('btn-auth').innerText = isSignupMode ? "Crea Account Utente" : "Accedi ora"; 
            
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
                if(!fullName) return await appAlert("Attenzione", "Inserisci il tuo Nome e Cognome.", "danger");
                
                const { error } = await supabaseClient.auth.signUp({ 
                    email, password, 
                    options: { data: { full_name: fullName, role: finalRole, is_owner: isOwnerChoice, business_type: businessType, studio_id: isStaff ? code : null } } 
                });
                
                if(error) await appAlert("Errore", error.message, "danger"); else { await appAlert("Ottimo!", "Registrazione OK!", "success"); switchAuthTab('login'); }
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
                const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", "Export_" + userProfile.full_name.replace(/\s+/g, '_') + ".json");
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

        async function generateInviteLink() { 
            await navigator.clipboard.writeText(userProfile.studio_id); 
            await appAlert("Fatto", "Codice invito copiato negli appunti! Condividilo col tuo team.", "success"); 
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

        // ================= DATI TEAM =================

        async function fetchProfiles() { 
            const { data } = await supabaseClient.from('profiles').select('*').eq('studio_id', userProfile.studio_id).order('full_name'); 
            profiles = data || []; 
            renderProfiles(); 
        }

        function renderProfiles() {
            const list = document.getElementById('team-list');
            const visibleProfiles = profiles.filter(p => showInactiveMembers ? true : p.role !== 'inactive');
            
            list.innerHTML = visibleProfiles.map(pr => {
                const profileId = escapeAttr(pr.id);
                const fullName = escapeHtml(pr.full_name);
                const email = escapeHtml(pr.email);
                const roleBadge = pr.is_owner 
                    ? '<span class="bg-indigo-900 text-indigo-100 border border-indigo-800 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Owner</span>'
                    : (pr.role === 'admin' 
                        ? '<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Admin</span>' 
                        : (pr.role === 'inactive' ? '<span class="bg-red-50 text-red-500 border border-red-200 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Inattivo</span>' : '<span class="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Staff</span>')
                      );
                
                const opacityClass = pr.role === 'inactive' ? 'opacity-60 grayscale' : '';
                
                return `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group ${opacityClass}">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-black text-slate-800 text-sm tracking-tight">${fullName}</h4>
                                ${roleBadge}
                            </div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${email}</p>
                        </div>
                        <button onclick="openEditTeamMemberModal('${profileId}')" class="text-slate-400 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 p-2 rounded-lg border border-slate-200 hover:border-primary-200 transition-all shadow-sm">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                    </div>`;
            }).join('');
            lucide.createIcons();
        }

        function toggleInactiveMembers() {
            showInactiveMembers = !showInactiveMembers;
            document.getElementById('label-toggle-inactive').innerText = showInactiveMembers ? "Nascondi Inattivi" : "Mostra Inattivi";
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
            
            let optionsHtml = `
                <option value="staff">Staff</option>
                <option value="inactive">Inattivo (Sospeso)</option>
            `;
            
            if (userProfile.is_owner) {
                if (pr.id !== userProfile.id) {
                    optionsHtml += `<option value="admin">Admin</option>`;
                    optionsHtml += `<option value="transfer_owner">Owner (Cedi Proprietà)</option>`;
                } else {
                    optionsHtml += `<option value="owner">Owner</option>`;
                }
            } else if (userProfile.role === 'admin') {
                optionsHtml += `<option value="admin">Admin</option>`;
            }
            
            roleSelect.innerHTML = optionsHtml;
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

        // ================= GESTIONE PROGETTI =================

        async function fetchProjects() { 
            const { data } = await supabaseClient.from('projects').select('*').order('name'); 
            projects = data || []; 
            renderProjects(); 
            if(document.body.classList.contains('is-admin')) renderStrategicCharts(); 
        }
        
        async function fetchEntries() { 
            const { data } = await supabaseClient.from('entries').select('*').order('created_at', { ascending: false }).limit(2000); 
            entries = data || []; 
            renderEntries(); 
            renderProjects(); 
            if(document.body.classList.contains('is-admin')) renderStrategicCharts(); 
        }
        
        async function fetchExpenses() { 
            const { data } = await supabaseClient.from('expenses').select('*').order('created_at', { ascending: false }); 
            expenses = data || []; 
            renderProjects(); 
            if(userProfile && document.body.classList.contains('is-admin')) renderStrategicCharts(); 
        }

        function renderProjects() {
            const container = document.getElementById('projects-list');
            let visibleProjects = projects.filter(p => showArchived ? true : p.is_archived !== true);
            
            visibleProjects.sort((a, b) => { 
                if (a.is_archived && !b.is_archived) return 1; 
                if (!a.is_archived && b.is_archived) return -1; 
                return 0; 
            });
            
            document.getElementById('project-select').innerHTML = '<option value="" disabled selected>-- Seleziona Lavoro --</option>' + projects.filter(p => !p.is_archived).map((p, i) => `<option value="${projects.indexOf(p)}">${escapeHtml(p.name)}</option>`).join('');

            container.innerHTML = visibleProjects.map((p, idx) => {
                const costHrs = entries.filter(e => e.project_id === p.id).reduce((s,e) => s + Number(e.rate||0), 0);
                const costExp = expenses.filter(ex => ex.project_id === p.id).reduce((s,ex) => s + Number(ex.amount||0), 0);
                const totalCost = costHrs + costExp;
                let perc = p.budget > 0 ? (totalCost/p.budget*100) : 0;
                let color = perc > 90 ? 'bg-red-500' : (perc > 75 ? 'bg-amber-400' : 'bg-primary-500');
                const projectName = escapeHtml(p.name);
                const projectClient = escapeHtml(p.client || 'Interno');
                const projectId = escapeAttr(p.id);
                
                return `
                <div class="bg-white border border-slate-200 p-5 lg:p-6 shadow-sm hover:shadow-md rounded-2xl cursor-pointer relative group transition-shadow ${p.is_archived ? 'is-archived' : ''}" onclick="showProjectDetail('${projectId}')">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-black text-slate-800 text-base lg:text-lg tracking-tight">${projectName}</h3>
                            <p class="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${projectClient}</p>
                        </div>
                        <div class="admin-only opacity-100 lg:opacity-0 group-hover:opacity-100 flex gap-1 bg-white lg:bg-transparent rounded-lg shadow-sm lg:shadow-none p-1 lg:p-0">
                            <button onclick="event.stopPropagation(); toggleArchive('${projectId}', ${p.is_archived})" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><i data-lucide="archive" class="w-4 h-4"></i></button>
                            <button onclick="event.stopPropagation(); deleteProject('${projectId}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                    <div class="flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                        <span>Speso: €${totalCost.toFixed(0)}</span>
                        <span>Target: €${p.budget}</span>
                    </div>
                    <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div class="${color} h-full transition-all duration-1000" style="width: ${perc > 100 ? 100 : perc}%"></div>
                    </div>
                </div>`;
            }).join('');
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

        function renderTaskBuilder() {
            const selectedContainer = document.getElementById('builder-selected-tasks');
            if(tempBuilderTasks.length === 0) {
                selectedContainer.innerHTML = '<div class="text-[11px] font-bold text-center text-slate-400 uppercase tracking-wider py-4">Nessuna attività selezionata.</div>';
            } else {
                selectedContainer.innerHTML = tempBuilderTasks.map((task, idx) => `
                    <div class="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm tag-enter">
                        <span class="text-xs font-bold text-slate-700 flex items-center gap-2.5"><span class="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100 font-black">${idx + 1}</span> ${task}</span>
                        <div class="flex items-center gap-0.5">
                            ${idx > 0 ? `<button onclick="moveTaskBuilder(${idx}, -1)" class="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="chevron-up" class="w-4 h-4"></i></button>` : `<div class="w-7"></div>`}
                            ${idx < tempBuilderTasks.length - 1 ? `<button onclick="moveTaskBuilder(${idx}, 1)" class="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="chevron-down" class="w-4 h-4"></i></button>` : `<div class="w-7"></div>`}
                            <div class="w-[1px] h-4 bg-slate-200 mx-1.5"></div>
                            <button onclick="removeTaskBuilder(${idx})" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                `).join('');
            }
            
            const catalogContainer = document.getElementById('builder-catalog-tasks');
            catalogContainer.innerHTML = activityCatalog.map(task => {
                if(tempBuilderTasks.includes(task)) return '';
                return `<button onclick="addTaskBuilder('${task}')" class="bg-white border border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-sm tag-enter"><i data-lucide="plus" class="w-3 h-3 inline-block mr-1"></i>${task}</button>`;
            }).join('');
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

        function renderCatalogAndTemplatesUI() {
            document.getElementById('catalog-manage-list').innerHTML = activityCatalog.map(task => `
                <div class="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold tracking-wide tag-enter shadow-sm">
                    ${task} 
                    <div class="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                        <button onclick="editCatalogTask('${task}')" class="text-slate-400 hover:text-primary-600 focus:outline-none transition-colors"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                        <button onclick="removeActivityFromCatalog('${task}')" class="text-slate-400 hover:text-red-500 focus:outline-none transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
            `).join('');
            
            const isEditCat = editingCatalogTask !== null;
            const btnAddCat = document.getElementById('btn-add-catalog');
            const btnCancelCat = document.getElementById('btn-cancel-catalog');
            if(btnAddCat) btnAddCat.innerText = isEditCat ? "Aggiorna" : "Aggiungi"; 
            if(btnCancelCat) isEditCat ? btnCancelCat.classList.remove('hidden') : btnCancelCat.classList.add('hidden');

            document.getElementById('new-template-catalog-tasks').innerHTML = activityCatalog.map(task => { 
                const isSelected = newTemplateTasks.includes(task); 
                return `<button onclick="toggleTaskInNewTemplate('${task}')" class="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm tag-enter ${isSelected ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'}">${task}</button>`; 
            }).join('');
            
            document.getElementById('templates-manage-list').innerHTML = projectTemplates.map((tpl, i) => `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start group tag-enter">
                    <div>
                        <h4 class="font-black text-sm text-slate-800 mb-2 tracking-tight">${tpl.name}</h4>
                        <div class="flex flex-wrap gap-1.5">
                            ${tpl.tasks.map(t=>`<span class="text-[10px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">${t}</span>`).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editTemplate(${i})" class="text-slate-400 hover:text-primary-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        <button onclick="removeTemplate(${i})" class="text-slate-400 hover:text-red-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `).join('');
            
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
                if(activePlan === 'starter') { selectTpl.innerHTML = '<option value="" selected disabled>I Template sono nel piano PREMIUM</option>'; selectTpl.disabled = true; selectTpl.classList.add('locked-feature'); } 
                else { selectTpl.innerHTML = '<option value="" selected disabled>-- Scegli da un Template --</option>' + projectTemplates.map((t, i) => `<option value="${i}">${t.name}</option>`).join(''); selectTpl.disabled = false; selectTpl.classList.remove('locked-feature'); }
            }
            const selectedContainer = document.getElementById('new-proj-selected-tasks');
            if (selectedContainer) {
                if (newProjectTasks.length === 0) selectedContainer.innerHTML = '<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 block">Nessuna attività configurata.</span>';
                else selectedContainer.innerHTML = newProjectTasks.map((task, idx) => `<span class="inline-block bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-primary-100 uppercase tracking-wider">${idx+1}. ${task}</span>`).join('');
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

        function showProjectDetail(id) {
            const p = projects.find(x => x.id === id); if(!p) return;
            const pEntries = entries.filter(e => e.project_id === id); const pExpenses = expenses.filter(ex => ex.project_id === id);
            const totalHours = pEntries.reduce((s, e) => s + Number(e.duration || 0), 0); const totalHoursCost = pEntries.reduce((s, e) => s + Number(e.rate || 0), 0); const totalExpenses = pExpenses.reduce((s, ex) => s + Number(ex.amount || 0), 0);
            const totalSpent = totalHoursCost + totalExpenses; const effectiveRate = totalHours > 0 ? ((p.budget - totalExpenses) / totalHours).toFixed(2) : 0;
            
            const taskStats = {}, teamStats = {};
            if (p.tasks && p.tasks.length > 0) p.tasks.forEach(t => { taskStats[t] = { h: 0, c: 0 }; });
            pEntries.forEach(e => { const taskName = e.task || 'Altro'; if(!taskStats[taskName]) taskStats[taskName] = { h: 0, c: 0 }; taskStats[taskName].h += Number(e.duration || 0); taskStats[taskName].c += Number(e.rate || 0); const member = e.user_name || e.user_email.split('@')[0]; if(!teamStats[member]) teamStats[member] = { h: 0, c: 0 }; teamStats[member].h += Number(e.duration || 0); teamStats[member].c += Number(e.rate || 0); });

            let btnPdfHtml = activePlan === 'starter' 
                ? `<button onclick="openUpgradeModal('Report PDF Singolo')" class="text-xs font-bold bg-white text-slate-400 border border-slate-200 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition opacity-60 shadow-sm"><i data-lucide="lock" class="w-4 h-4"></i> Report PDF</button>`
                : `<button onclick="exportProjectPDF('${p.id}')" class="text-xs font-bold bg-white text-primary-600 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:border-primary-200 hover:bg-primary-50 flex items-center justify-center gap-2 shadow-sm transition-all"><i data-lucide="file-text" class="w-4 h-4"></i> Esporta in PDF</button>`;

            let html = `
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4">
                <div>
                    <h2 class="text-2xl lg:text-3xl font-black text-slate-800 mb-1 leading-tight pr-8 tracking-tight">${p.name}</h2>
                    <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${p.client || 'Interno'}</p>
                </div>
                <div class="admin-only w-full lg:w-auto flex flex-col sm:flex-row gap-2">
                    <button onclick="openEditProjectModal('${p.id}')" class="text-xs font-bold bg-white text-slate-600 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm transition-all"><i data-lucide="edit" class="w-4 h-4"></i> Modifica</button>
                    ${btnPdfHtml}
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-8">
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spesa Totale</p><p class="text-lg lg:text-xl font-black text-primary-600 mt-1 tracking-tight">€${totalSpent.toFixed(0)} <span class="text-[10px] text-slate-400">/ ${p.budget}</span></p></div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Costo Team</p><p class="text-lg lg:text-xl font-black text-slate-800 mt-1 tracking-tight">€${totalHoursCost.toFixed(0)} <span class="text-[10px] text-slate-400">(${formatTime(totalHours)})</span></p></div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spese Extra</p><p class="text-lg lg:text-xl font-black text-amber-600 mt-1 tracking-tight">€${totalExpenses.toFixed(0)}</p></div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resa Oraria</p><p class="text-lg lg:text-xl font-black ${effectiveRate > 0 ? 'text-emerald-500' : 'text-red-500'} mt-1 tracking-tight">€${effectiveRate} <span class="text-[10px] text-slate-400">/h</span></p></div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 pb-8 lg:pb-0">
                <div class="space-y-8">
                    <div>
                        <h3 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-1.5"><i data-lucide="layers" class="w-3.5 h-3.5"></i> Per Attività (Ore)</h3>
                        <div class="space-y-4">`;
                        
                        const sortedTaskNames = Object.keys(taskStats).sort((a, b) => taskStats[b].h - taskStats[a].h);
                        sortedTaskNames.forEach(t => { 
                            const perc = p.budget > 0 ? (taskStats[t].c / p.budget * 100).toFixed(1) : 0; 
                            const isZero = taskStats[t].h === 0; 
                            html += `
                            <div>
                                <div class="flex justify-between items-end mb-1.5">
                                    <span class="font-bold ${isZero?'text-slate-400':'text-slate-700'} text-xs">${t}</span>
                                    <span class="text-[10px] font-mono font-bold text-slate-500">€${taskStats[t].c.toFixed(0)} (${formatTime(taskStats[t].h)})</span>
                                </div>
                                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div class="${isZero?'bg-slate-200':'bg-primary-500'} h-full" style="width: ${perc}%"></div>
                                </div>
                            </div>`; 
                        });
                        
                        html += `
                        </div>
                    </div>
                    <div>
                        <h3 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4 flex items-center gap-1.5"><i data-lucide="users" class="w-3.5 h-3.5"></i> Per Membro Team</h3>
                        <div class="space-y-3">`;
                        
                        Object.keys(teamStats).forEach(m => { 
                            html += `
                            <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span class="font-bold text-slate-700 text-xs uppercase tracking-wide">${m}</span>
                                <div class="text-right">
                                    <p class="text-[11px] font-mono font-bold text-primary-600">${formatTime(teamStats[m].h)}</p>
                                    <p class="text-[10px] font-mono font-black text-slate-400 admin-only">€ ${teamStats[m].c.toFixed(2)}</p>
                                </div>
                            </div>`; 
                        });
                        
                        html += `
                        </div>
                    </div>
                </div>
                <div class="admin-only bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <h3 class="text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-3 mb-4 flex items-center gap-2"><i data-lucide="receipt" class="w-4 h-4 text-amber-500"></i> Spese Vive</h3>
                    <div class="flex gap-2 mb-6">
                        <input type="text" id="exp-desc" placeholder="Es. Oneri o Materiali" class="flex-1 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all bg-white">
                        <div class="w-24 relative flex items-center">
                            <span class="absolute left-3 text-slate-400 font-bold text-xs">€</span>
                            <input type="number" step="0.01" id="exp-amount" placeholder="0.00" class="w-full border border-slate-200 rounded-xl p-3 pl-6 text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold bg-white">
                        </div>
                        <button onclick="addExpense('${p.id}')" class="bg-amber-500 text-white px-3.5 rounded-xl hover:bg-amber-600 transition-all shadow-sm active:scale-95"><i data-lucide="plus" class="w-4 h-4"></i></button>
                    </div>
                    <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        ${pExpenses.length === 0 ? '<div class="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-wider">Nessuna spesa registrata.</div>' : pExpenses.map(ex => `
                        <div class="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm group">
                            <div>
                                <p class="text-xs font-bold text-slate-700">${ex.description}</p>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">${new Date(ex.created_at).toLocaleDateString()} • ${ex.user_name}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-black text-amber-600 text-sm tracking-tight">€${Number(ex.amount).toFixed(2)}</span>
                                <button onclick="deleteExpense('${ex.id}', '${p.id}')" class="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>
            </div>`;
            
            document.getElementById('detail-content').innerHTML = html;
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
            if (editProjectTasks.length === 0) selectedContainer.innerHTML = '<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 block">Nessuna attività configurata.</span>';
            else selectedContainer.innerHTML = editProjectTasks.map((task, idx) => `<span class="inline-block bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-1 rounded-md border border-primary-100 uppercase tracking-wider">${idx+1}. ${task}</span>`).join('');
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
            
            document.getElementById('kpi-profit').innerText = `€ ${profit.toFixed(2)}`;
            
            if (profit < 0) { 
                profitLabel.innerText = "Perdita (Archiviati)"; 
                profitCard.classList.replace('border-emerald-100', 'border-red-200'); 
                profitCard.classList.remove('bg-emerald-50/60'); 
                profitCard.classList.add('bg-red-50'); 
                document.getElementById('kpi-profit').classList.replace('text-slate-800', 'text-red-600'); 
            } else { 
                profitLabel.innerText = "Utile (Archiviati)"; 
                profitCard.classList.replace('border-red-200', 'border-emerald-100'); 
                profitCard.classList.remove('bg-red-50'); 
                profitCard.classList.add('bg-emerald-50/60'); 
                document.getElementById('kpi-profit').classList.replace('text-red-600', 'text-slate-800'); 
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

        // ================= REGISTRO ATTIVITÀ E ORE =================

        function prevWeek() { currentWeekStart.setDate(currentWeekStart.getDate() - 7); renderEntries(); }
        function nextWeek() { currentWeekStart.setDate(currentWeekStart.getDate() + 7); renderEntries(); }
        
        function jumpToDate(dateString) {
            if(!dateString) return;
            currentWeekStart = getMonday(new Date(dateString));
            renderEntries();
        }

        function renderEntries() {
            const table = document.getElementById('entries-table-desktop'); 
            const mobile = document.getElementById('entries-list-mobile');
            
            const start = new Date(currentWeekStart); 
            start.setHours(0,0,0,0); 
            const end = new Date(start); 
            end.setDate(end.getDate() + 6); 
            end.setHours(23,59,59,999);
            
            document.getElementById('week-display').innerText = `${start.toLocaleDateString('it-IT', {day:'2-digit',month:'short'})} - ${end.toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'})}`;
            
            const isStaff = !document.body.classList.contains('is-admin');

            let weekly = entries.filter(e => {
                const d = new Date(e.created_at).getTime();
                const inDate = d >= start.getTime() && d <= end.getTime();
                
                // Filtro sicurezza: il collaboratore vede solo se stesso
                if (isStaff) {
                    return inDate && e.user_email === userProfile.email;
                }
                return inDate;
            });

            document.getElementById('entries-empty-state').classList.toggle('force-hide', weekly.length > 0); 
            table.parentElement.classList.toggle('force-hide', weekly.length === 0);
            
            table.innerHTML = weekly.map((e, index) => {
                let displayNotes = e.notes || '';
                let timeRangeStr = '';
                
                const timeMatch = displayNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
                if (timeMatch) {
                    timeRangeStr = `<div class="text-[10px] text-slate-400 font-medium mt-1 whitespace-nowrap">dalle ${timeMatch[1]} alle ${timeMatch[2]}</div>`;
                    displayNotes = displayNotes.replace(timeMatch[0], '');
                }

                const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';
                const entryId = escapeAttr(e.id);
                const userName = escapeHtml(e.user_name);
                const projectName = escapeHtml(e.project_name);
                const taskName = escapeHtml(e.task);
                const safeNotes = escapeHtml(displayNotes);

                return `
<tr class="${bgClass} hover:bg-slate-100 border-b border-slate-100 transition-colors">
    <td class="p-5 font-bold text-slate-500 text-xs whitespace-nowrap">${new Date(e.created_at).toLocaleDateString('it-IT', {weekday:'short', day:'2-digit'})}</td>
    <td class="p-5 text-center whitespace-nowrap"><span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">${userName}</span></td>
    <td class="p-5 text-center font-black text-slate-800 tracking-tight w-full">${projectName}</td>
    <td class="p-5 min-w-[150px]"><div class="text-xs font-bold text-slate-600">${taskName}</div><div class="text-[11px] text-slate-400 mt-0.5 break-words">${safeNotes}</div></td>
    <td class="p-5 whitespace-nowrap">
        <div class="font-mono font-black text-primary-600">${formatTime(Number(e.duration))}</div>
        ${timeRangeStr}
    </td>
    <td class="p-5 text-center admin-only whitespace-nowrap">
        <span class="font-mono text-slate-400 text-sm font-bold">€${Number(e.rate).toFixed(2)}</span>
    </td>
    <td class="p-5 text-right admin-only whitespace-nowrap">
        <div class="flex justify-end gap-2 items-center">
            <button onclick="openEditEntryModal('${entryId}')" class="text-slate-300 hover:text-primary-600 p-1.5 hover:bg-white rounded-lg transition-colors"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button onclick="deleteEntry('${entryId}')" class="text-slate-300 hover:text-red-600 p-1.5 hover:bg-white rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    </td>
</tr>`;
            }).join('');
            
            mobile.innerHTML = weekly.map((e, index) => {
                let displayNotes = e.notes || '';
                let timeRangeStr = '';
                
                const timeMatch = displayNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
                if (timeMatch) {
                    timeRangeStr = `<div class="text-[9px] text-slate-400 font-medium text-right mt-1.5 whitespace-nowrap">dalle ${timeMatch[1]}<br>alle ${timeMatch[2]}</div>`;
                    displayNotes = displayNotes.replace(timeMatch[0], '');
                }

                const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';
                const entryId = escapeAttr(e.id);
                const userName = escapeHtml(e.user_name);
                const projectName = escapeHtml(e.project_name);
                const taskName = escapeHtml(e.task);
                const safeNotes = escapeHtml(displayNotes);

                return `
                <div class="p-5 border-b border-slate-100 ${bgClass}">
                    <div class="flex justify-between mb-3">
                        <div>
                            <div class="flex gap-2 mb-1.5">
                                <span class="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap">${userName}</span>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 whitespace-nowrap">${new Date(e.created_at).toLocaleDateString('it-IT', {weekday:'short', day:'2-digit'})}</span>
                            </div>
                            <h4 class="font-black text-sm text-slate-800 tracking-tight">${projectName}</h4>
                        </div>
                        <div class="flex flex-col items-end whitespace-nowrap">
                            <span class="font-mono font-black text-primary-600 bg-primary-50 border border-primary-100 px-2 py-1 rounded-lg h-fit">${formatTime(Number(e.duration))}</span>
                            ${timeRangeStr}
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="max-w-[90%]"><span class="text-xs text-slate-600 font-bold">${taskName}</span><div class="text-[11px] text-slate-400 mt-0.5 break-words">${safeNotes}</div></div>
                        <div class="admin-only flex justify-between border-t border-slate-200 pt-3">
                            <span class="font-mono text-slate-500 font-bold text-xs whitespace-nowrap">Costo: €${Number(e.rate).toFixed(2)}</span>
                            <div class="flex gap-2">
                                <button onclick="openEditEntryModal('${entryId}')" class="text-slate-400 p-1.5 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                                <button onclick="deleteEntry('${entryId}')" class="text-slate-400 p-1.5 hover:text-red-600 hover:bg-white rounded-lg transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
            lucide.createIcons();
        }

        function updateTaskDropdown() { 
            const idx = document.getElementById('project-select').value; 
            const taskSel = document.getElementById('task-select'); 
            if(idx === "") return taskSel.innerHTML = '<option disabled selected>Seleziona...</option>'; 
            const p = projects[idx]; 
            taskSel.innerHTML = (p.tasks || []).length > 0 ? p.tasks.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('') : '<option value="Generico">Generico</option>'; 
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
                document.getElementById('btn-text').innerText = "AVVIA ORA"; 
                document.getElementById('btn-icon').setAttribute("data-lucide", "play-circle"); 
                document.getElementById('btn-toggle-timer').classList.replace('bg-red-500', 'bg-slate-900'); 
                document.getElementById('btn-toggle-timer').classList.replace('hover:bg-red-600', 'hover:bg-slate-800');
            }
            lucide.createIcons();
        }

        async function saveEntry(proj, task, hours, customDate = null, notes = "") {
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
            document.getElementById('manual-project').innerHTML = '<option value="" disabled selected>Scegli...</option>' + projects.filter(p => !p.is_archived).map((p, i) => `<option value="${projects.indexOf(p)}">${escapeHtml(p.name)}</option>`).join(''); 
        }
        
        function closeManualEntry() { document.getElementById('modal-manual').classList.add('force-hide'); }
        
        function updateManualTaskDropdown() { 
            const p = projects[document.getElementById('manual-project').value]; 
            document.getElementById('manual-task').innerHTML = (p.tasks || []).map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('') || '<option value="Generico">Generico</option>'; 
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
            taskSelect.innerHTML = projectTasks.map(t => `<option value="${escapeAttr(t)}" ${t === oldVal ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
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
            userSelect.innerHTML = profiles.filter(p => p.role !== 'inactive' || p.full_name === e.user_name).map(pr => `<option value="${escapeAttr(pr.full_name)}" ${pr.full_name === e.user_name ? 'selected' : ''}>${escapeHtml(pr.full_name)}</option>`).join(''); 
            if (!profiles.find(pr => pr.full_name === e.user_name)) userSelect.innerHTML += `<option value="${escapeAttr(e.user_name)}" selected>${escapeHtml(e.user_name)} (Rimosso)</option>`;
            
            const projectSelect = document.getElementById('edit-entry-project'); 
            projectSelect.innerHTML = projects.map(p => `<option value="${escapeAttr(p.id)}" ${p.id === e.project_id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join(''); 
            if (!projects.find(p => p.id === e.project_id)) projectSelect.innerHTML += `<option value="${escapeAttr(e.project_id)}" selected>${escapeHtml(e.project_name)} (Eliminato)</option>`;
            
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

        // ================= REPORT PDF E UTILS =================

        async function getBase64FromUrl(url) { 
            return new Promise((resolve, reject) => { 
                const img = new Image(); 
                img.crossOrigin = 'Anonymous'; 
                img.onload = () => { 
                    const canvas = document.createElement('canvas'); 
                    canvas.width = img.naturalWidth; 
                    canvas.height = img.naturalHeight; 
                    const ctx = canvas.getContext('2d'); 
                    ctx.drawImage(img, 0, 0); 
                    resolve({ url: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight }); 
                }; 
                img.onerror = reject; 
                img.src = url; 
            }); 
        }

        async function exportProjectPDF(id) {
            if (activePlan === 'starter') return openUpgradeModal('Esportazione Report PDF');
            const p = projects.find(x => x.id === id); if(!p) return;
            const pEntries = entries.filter(e => e.project_id === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); 
            const pExpenses = expenses.filter(ex => ex.project_id === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            
            let logoData = null, startY = 20;
            if(studioData?.logo_url) { try { logoData = await getBase64FromUrl(studioData.logo_url); } catch(err) {} }
            if(logoData) { const imgH = 12; const imgW = (logoData.width/logoData.height)*imgH; doc.addImage(logoData.url, 'PNG', 14, 10, imgW, imgH); startY = 30; }
            
            doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text(p.name, 14, startY); doc.setFontSize(12); doc.setTextColor(100, 116, 139); doc.text(`Cliente: ${p.client || 'Interno'}`, 14, startY + 8);
            const totalHours = pEntries.reduce((s,e) => s + Number(e.duration), 0); const totalHrsCost = pEntries.reduce((s,e) => s + Number(e.rate), 0); const totalExp = pExpenses.reduce((s,ex) => s + Number(ex.amount), 0);
            doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.text(`Totale: €${(totalHrsCost+totalExp).toFixed(2)} | Ore: €${totalHrsCost.toFixed(2)} (${formatTime(totalHours)}) | Spese: €${totalExp.toFixed(2)}`, 14, startY + 18);
            
            const pdfColor = THEMES[currentBusinessType].pdfColor;
            doc.setFontSize(12); doc.setTextColor(...pdfColor); doc.text("Registro Ore", 14, startY + 28);
            
            doc.autoTable({ 
                startY: startY + 32, 
                head: [['Data', 'Team', 'Attività', 'Ore', 'Costo']], 
                body: pEntries.map(e => {
                    let dispNotes = e.notes || '';
                    const match = dispNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
                    if(match) dispNotes = dispNotes.replace(match[0], '') + `\n(dalle ${match[1]} alle ${match[2]})`;
                    return [new Date(e.created_at).toLocaleDateString(), e.user_name, dispNotes ? `${e.task}\n(${dispNotes})` : e.task, formatTime(Number(e.duration)), `€${Number(e.rate).toFixed(2)}`];
                }), 
                theme: 'striped', headStyles: { fillColor: pdfColor }, styles: { fontSize: 9 } 
            });

            if(pExpenses.length > 0) {
                const finalY = doc.lastAutoTable.finalY || startY + 50; doc.setFontSize(12); doc.setTextColor(217, 119, 6); doc.text("Spese Extra", 14, finalY + 15);
                doc.autoTable({ startY: finalY + 19, head: [['Data', 'Da', 'Descrizione', 'Importo']], body: pExpenses.map(ex => [new Date(ex.created_at).toLocaleDateString(), ex.user_name, ex.description, `€${Number(ex.amount).toFixed(2)}`]), theme: 'striped', headStyles: { fillColor: [245, 158, 11] }, styles: { fontSize: 9 } });
            }
            doc.save(`Lavoro_${p.name.replace(/\s+/g,'_')}.pdf`);
        }

        function openReportModal() { 
            if(activePlan === 'starter') return openUpgradeModal('Generazione Report PDF Cumulativi');
            const today = new Date(); const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const content = document.getElementById('report-modal-content');
            content.innerHTML = `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Dal</label><input type="date" id="report-start" value="${fmt(firstDay)}" class="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"></div>
                    <div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Al</label><input type="date" id="report-end" value="${fmt(today)}" class="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"></div>
                </div>
                <button onclick="generatePDFReport()" class="w-full bg-slate-900 text-white py-3.5 mt-6 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Genera PDF</button>
            `;
            document.getElementById('modal-report').classList.remove('force-hide'); lucide.createIcons();
        }
        
        function closeReportModal() { document.getElementById('modal-report').classList.add('force-hide'); }

        async function generatePDFReport() {
            if (activePlan === 'starter') return;
            const s = document.getElementById('report-start').value, e = document.getElementById('report-end').value;
            if(!s || !e) return await appAlert("Attenzione", "Seleziona le date per il report.", "danger"); 
            const start = new Date(s); start.setHours(0,0,0,0); const end = new Date(e); end.setHours(23,59,59,999);
            if(start > end) return await appAlert("Attenzione", "La data di inizio deve essere precedente a quella di fine.", "danger");
            
            const filE = entries.filter(ent => { const d = new Date(ent.created_at); return d >= start && d <= end; });
            if (filE.length === 0) return await appAlert("Informazione", "Nessuna attività registrata nel periodo selezionato.", "info");

            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            const pdfColor = THEMES[currentBusinessType].pdfColor;
            let logoData = null, startY = 30; if(studioData?.logo_url) { try { logoData = await getBase64FromUrl(studioData.logo_url); } catch(err) {} }
            if(logoData) { const imgH = 12; const imgW = (logoData.width/logoData.height)*imgH; doc.addImage(logoData.url, 'PNG', 14, 15, imgW, imgH); startY = 40; }

            doc.setFontSize(26); doc.setTextColor(15, 23, 42); doc.text(studioData?.name||"Azienda", 14, startY);
            doc.setFontSize(16); doc.setTextColor(15, 23, 42); doc.text(`Rapporto Attività`, 14, startY + 15);
            doc.setFontSize(12); doc.setTextColor(100, 116, 139); doc.text(`Dal ${start.toLocaleDateString()} al ${end.toLocaleDateString()}`, 14, startY + 23);
            
            const totalH = filE.reduce((sum, ent) => sum + Number(ent.duration), 0); const totalC = filE.reduce((sum, ent) => sum + Number(ent.rate), 0);
            doc.setDrawColor(226, 232, 240); doc.line(14, startY+30, 196, startY+30);
            doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(`Riepilogo Globale:`, 14, startY + 45);
            doc.setFontSize(10); doc.text(`Ore Totali: ${formatTime(totalH)}`, 14, startY + 53); doc.text(`Valore Economico: €${totalC.toFixed(2)}`, 14, startY + 60);

            const projLabel = currentBusinessType === 'impresa' ? 'Cantiere' : 'Progetto';

            [...new Set(filE.map(ent => ent.project_id))].forEach((pid) => {
                const p = projects.find(x => x.id === pid); const pE = filE.filter(ent => ent.project_id === pid).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                doc.addPage(); let pY = 20; if(logoData) { doc.addImage(logoData.url, 'PNG', 14, 10, (logoData.width/logoData.height)*8, 8); pY = 28; }
                doc.setFontSize(18); doc.setTextColor(...pdfColor); doc.text(p?p.name:"Eliminato", 14, pY);
                doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Cliente: ${p?p.client:'-'} | Periodo: ${s} / ${e}`, 14, pY+7);
                doc.text(`Ore Periodo: ${formatTime(pE.reduce((sum,ent)=>sum+Number(ent.duration),0))} | Valore: €${pE.reduce((sum,ent)=>sum+Number(ent.rate),0).toFixed(2)}`, 14, pY+13);
                doc.autoTable({ 
                    startY: pY+20, 
                    head: [['Data', 'Team', 'Attività', 'Ore', 'Costo']], 
                    body: pE.map(ent => {
                        let dispNotes = ent.notes || '';
                        const match = dispNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
                        if(match) dispNotes = dispNotes.replace(match[0], '') + `\n(dalle ${match[1]} alle ${match[2]})`;
                        return [new Date(ent.created_at).toLocaleDateString(), ent.user_name, dispNotes ? `${ent.task}\n(${dispNotes})` : ent.task, formatTime(Number(ent.duration)), `€${Number(ent.rate).toFixed(2)}`];
                    }), 
                    theme: 'striped', headStyles: { fillColor: pdfColor }, styles: { fontSize: 9 } 
                });
            });
            doc.save(`Report_${start.toISOString().split('T')[0]}.pdf`); closeReportModal();
        }

        function openTeamReportModal() { 
            if(activePlan === 'starter') return openUpgradeModal('Report Team PDF');
            const today = new Date(); const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            document.getElementById('team-report-start').value = fmt(firstDay); document.getElementById('team-report-end').value = fmt(today);
            
            const userSelect = document.getElementById('team-report-user');
            const activeProfiles = profiles.filter(p => p.role !== 'inactive');
            userSelect.innerHTML = '<option value="all">Tutto il Team</option>' + activeProfiles.map(pr => `<option value="${escapeAttr(pr.full_name)}">${escapeHtml(pr.full_name)}</option>`).join('');
            
            document.getElementById('modal-team-report').classList.remove('force-hide'); lucide.createIcons();
        }

        function closeTeamReportModal() { document.getElementById('modal-team-report').classList.add('force-hide'); }

        async function generateTeamPDFReport() {
            if (activePlan === 'starter') return;
            const s = document.getElementById('team-report-start').value, e = document.getElementById('team-report-end').value;
            const selectedUser = document.getElementById('team-report-user').value;
            
            if(!s || !e) return await appAlert("Attenzione", "Seleziona le date per il report.", "danger"); 
            const start = new Date(s); start.setHours(0,0,0,0); const end = new Date(e); end.setHours(23,59,59,999);
            if(start > end) return await appAlert("Attenzione", "La data di inizio deve essere precedente a quella di fine.", "danger");
            
            let filE = entries.filter(ent => { const d = new Date(ent.created_at); return d >= start && d <= end; });
            if (selectedUser !== 'all') { filE = filE.filter(ent => ent.user_name === selectedUser); }
            if (filE.length === 0) return await appAlert("Informazione", "Nessuna attività registrata per il periodo e il collaboratore selezionati.", "info");

            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            const pdfColor = THEMES[currentBusinessType].pdfColor;
            let logoData = null; if(studioData?.logo_url) { try { logoData = await getBase64FromUrl(studioData.logo_url); } catch(err) {} }

            const usersInReport = [...new Set(filE.map(ent => ent.user_name))].sort();

            usersInReport.forEach((uname, index) => {
                const uEntries = filE.filter(ent => ent.user_name === uname).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                const uTotalH = uEntries.reduce((sum, ent) => sum + Number(ent.duration), 0);
                const uTotalC = uEntries.reduce((sum, ent) => sum + Number(ent.rate), 0);

                if(index > 0) doc.addPage(); 
                
                let currentY = 20; 
                if(logoData) { doc.addImage(logoData.url, 'PNG', 14, 10, (logoData.width/logoData.height)*8, 8); currentY = 28; } 

                doc.setFontSize(18); doc.setTextColor(...pdfColor); doc.text(`Collaboratore: ${uname}`, 14, currentY);
                doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Totale Periodo: ${formatTime(uTotalH)} | Costo Totale: €${uTotalC.toFixed(2)}`, 14, currentY+7);

                currentY += 15;
                const projLabel = currentBusinessType === 'impresa' ? 'Cantiere' : 'Progetto';
                const projectsForUser = [...new Set(uEntries.map(ent => ent.project_name))].sort();

                projectsForUser.forEach(projName => {
                    const pEntries = uEntries.filter(ent => ent.project_name === projName);
                    const pTotalH = pEntries.reduce((sum, ent) => sum + Number(ent.duration), 0);
                    const pTotalC = pEntries.reduce((sum, ent) => sum + Number(ent.rate), 0);

                    if(currentY > doc.internal.pageSize.height - 30) { doc.addPage(); currentY = 20; }

                    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(`${projLabel}: ${projName}`, 14, currentY);
                    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text(`Subtotale: ${formatTime(pTotalH)} | €${pTotalC.toFixed(2)}`, 14, currentY + 5);

                    doc.autoTable({
                        startY: currentY + 8,
                        head: [['Data', 'Attività', 'Ore', 'Costo']],
                        body: pEntries.map(ent => {
                            let dispNotes = ent.notes || '';
                            const match = dispNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
                            if(match) dispNotes = dispNotes.replace(match[0], '') + `\n(dalle ${match[1]} alle ${match[2]})`;
                            return [new Date(ent.created_at).toLocaleDateString(), dispNotes ? `${ent.task}\n(${dispNotes})` : ent.task, formatTime(Number(ent.duration)), `€${Number(ent.rate).toFixed(2)}`];
                        }),
                        theme: 'striped', headStyles: { fillColor: pdfColor }, styles: { fontSize: 9 }, margin: { bottom: 15 }
                    });
                    currentY = doc.lastAutoTable.finalY + 12; 
                });
            });

            doc.save(`Report_Team_${start.toISOString().split('T')[0]}.pdf`); closeTeamReportModal();
        }

        // ================= RECUPERO PASSWORD =================

        function openForgotPassword() { document.getElementById('modal-forgot-password').classList.remove('force-hide'); lucide.createIcons(); }
        function closeForgotPassword() { document.getElementById('modal-forgot-password').classList.add('force-hide'); }

        async function sendResetLink() {
            const email = document.getElementById('forgot-email').value.trim();
            if(!email) return await appAlert("Attenzione", "Inserisci la tua email.", "danger");
            
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.href 
            });
            
            if(error) return await appAlert("Errore", error.message, "danger");
            
            closeForgotPassword();
            await appAlert("Fatto!", "Se l'email esiste nei nostri sistemi, riceverai a breve un link sicuro per reimpostare la password.", "success");
        }

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                document.getElementById('auth-container').classList.add('force-hide');
                document.getElementById('limbo-container').classList.add('force-hide');
                document.getElementById('app-container').classList.add('force-hide');
                document.getElementById('update-password-container').classList.remove('force-hide');
                lucide.createIcons();
            }
        });

        async function saveNewPassword() {
            const newPass = document.getElementById('new-password').value;
            if(newPass.length < 6) return await appAlert("Attenzione", "La password deve essere di almeno 6 caratteri.", "danger");
            
            const { data, error } = await supabaseClient.auth.updateUser({ password: newPass });
            if(error) return await appAlert("Errore", error.message, "danger");
            
            document.getElementById('update-password-container').classList.add('force-hide');
            await appAlert("Successo!", "La tua password è stata aggiornata. Bentornato a bordo!", "success");
            
            checkUser();
        }
        
        lucide.createIcons();
        checkUser();

