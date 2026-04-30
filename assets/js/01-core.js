// Arch Time Pro - 01-core.js
const ARCH_TIME_CONFIG = window.ARCH_TIME_CONFIG || {};

        function isPlaceholderConfigValue(value) {
            return !value || String(value).includes('YOUR_');
        }

        function isStripeTestLink(value) {
            return /stripe\.com\/.*\/test_|buy\.stripe\.com\/test_/i.test(String(value || ''));
        }

        function getRuntimeConfigIssues(config) {
            const issues = [];

            if (isPlaceholderConfigValue(config.supabaseUrl)) issues.push('Supabase URL mancante o placeholder.');
            if (isPlaceholderConfigValue(config.supabaseKey)) issues.push('Supabase publishable key mancante o placeholder.');

            const stripeLinks = config.stripeLinks || {};
            if (isPlaceholderConfigValue(stripeLinks.starter)) issues.push('Link Stripe Starter mancante o placeholder.');
            if (isPlaceholderConfigValue(stripeLinks.premium)) issues.push('Link Stripe Premium mancante o placeholder.');
            if (isPlaceholderConfigValue(stripeLinks.customerPortal)) issues.push('Link Stripe Customer Portal mancante o placeholder.');

            if (config.environment === 'production') {
                if (isStripeTestLink(stripeLinks.starter)) issues.push('Link Stripe Starter ancora in modalita test.');
                if (isStripeTestLink(stripeLinks.premium)) issues.push('Link Stripe Premium ancora in modalita test.');
                if (isStripeTestLink(stripeLinks.customerPortal)) issues.push('Link Stripe Customer Portal ancora in modalita test.');
            }

            return issues;
        }

        function showRuntimeConfigError(issues) {
            document.documentElement.innerHTML = `
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Arch Time Pro - Configurazione richiesta</title>
                    <link rel="stylesheet" href="assets/app.css">
                </head>
                <body class="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
                    <main class="max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                        <h1 class="text-2xl font-black tracking-tight mb-3">Configurazione richiesta</h1>
                        <p class="text-sm text-slate-500 leading-relaxed mb-5">Completa il file <code>assets/js/00-runtime-config.js</code> prima di avviare Arch Time Pro.</p>
                        <ul class="space-y-2 text-sm text-red-600 font-bold">${issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>
                    </main>
                </body>`;
        }

        const runtimeConfigIssues = getRuntimeConfigIssues(ARCH_TIME_CONFIG);
        if (runtimeConfigIssues.length > 0) {
            showRuntimeConfigError(runtimeConfigIssues);
            throw new Error(`Arch Time Pro runtime config invalid: ${runtimeConfigIssues.join(' ')}`);
        }

        const SUPABASE_URL = ARCH_TIME_CONFIG.supabaseUrl;
        const SUPABASE_KEY = ARCH_TIME_CONFIG.supabaseKey;
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const STRIPE_LINK_STARTER = ARCH_TIME_CONFIG.stripeLinks?.starter || ""; 
        const STRIPE_LINK_PREMIUM = ARCH_TIME_CONFIG.stripeLinks?.premium || "";
        const STRIPE_CUSTOMER_PORTAL = ARCH_TIME_CONFIG.stripeLinks?.customerPortal || ""; 

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

        function formatMoney(value, digits = 2) {
            const amount = Number(value || 0);
            return new Intl.NumberFormat('it-IT', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            }).format(amount);
        }

        function safeFileName(value, fallback = 'export') {
            const cleaned = String(value || fallback)
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._-]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 80);

            return cleaned || fallback;
        }

        function optionHtml(value, label, selected = false, disabled = false) {
            return `<option value="${escapeAttr(value)}"${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(label)}</option>`;
        }

        function emptyStateHtml(message) {
            return `<span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 block">${escapeHtml(message)}</span>`;
        }

        function taskTagHtml(task, index, radius = 'rounded-lg') {
            return `<span class="inline-block bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-1 ${radius} border border-primary-100 uppercase tracking-wider">${index + 1}. ${escapeHtml(task)}</span>`;
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
