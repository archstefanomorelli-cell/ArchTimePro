// Arch Time Pro - 09-video-demo.js
// Local-only demo mode for recording guide videos with the real app UI.

        function isVideoDemoMode() {
            return new URLSearchParams(window.location.search).get('videoDemo') === '1';
        }

        function videoDemoDate(daysOffset, hour = 10, minute = 0) {
            const date = new Date();
            date.setHours(hour, minute, 0, 0);
            date.setDate(date.getDate() + daysOffset);
            return date.toISOString();
        }

        function setupVideoDemoData() {
            const studioId = 'demo-studio';
            const ownerId = 'demo-owner';
            userProfile = {
                id: ownerId,
                studio_id: studioId,
                full_name: 'Stefano Morelli',
                email: 'demo@archtimepro.it',
                role: 'admin',
                is_owner: true,
                hourly_cost: 52
            };
            studioData = {
                id: studioId,
                name: 'Studio Demo Morelli',
                business_type: 'studio',
                plan_type: 'premium',
                subscription_status: 'trialing',
                created_at: new Date().toISOString(),
                activity_catalog: ['Sopralluogo', 'Riunioni', 'Progetto preliminare', 'Progetto definitivo', 'Direzione lavori', 'Computo metrico'],
                project_templates: [
                    { name: 'Ristrutturazione leggera', tasks: ['Sopralluogo', 'Riunioni', 'Progetto definitivo', 'Direzione lavori'] },
                    { name: 'Pratica edilizia', tasks: ['Sopralluogo', 'Progetto preliminare', 'Computo metrico'] }
                ]
            };
            profiles = [
                { id: ownerId, studio_id: studioId, full_name: 'Stefano Morelli', email: 'demo@archtimepro.it', role: 'admin', is_owner: true, hourly_cost: 52 },
                { id: 'demo-laura', studio_id: studioId, full_name: 'Laura Bianchi', email: 'laura@studio-demo.it', role: 'staff', is_owner: false, hourly_cost: 38 },
                { id: 'demo-marco', studio_id: studioId, full_name: 'Marco Verdi', email: 'marco@studio-demo.it', role: 'staff', is_owner: false, hourly_cost: 42 }
            ];
            activityCatalog = [...studioData.activity_catalog];
            projectTemplates = [...studioData.project_templates];
            projects = [
                {
                    id: 'demo-villa',
                    studio_id: studioId,
                    name: 'Villa Rossi',
                    client: 'Maria Rossi',
                    budget: 12000,
                    tasks: ['Sopralluogo', 'Riunioni', 'Progetto definitivo', 'Direzione lavori'],
                    task_statuses: { 'Sopralluogo': 'done', 'Riunioni': 'doing', 'Progetto definitivo': 'doing', 'Direzione lavori': 'todo' },
                    task_budgets: { 'Progetto definitivo': 4000, 'Direzione lavori': 8000 },
                    is_archived: false
                },
                {
                    id: 'demo-medico',
                    studio_id: studioId,
                    name: 'Centro medico',
                    client: 'Salute Srl',
                    budget: 18000,
                    tasks: ['Sopralluogo', 'Progetto preliminare', 'Progetto definitivo', 'Direzione lavori'],
                    task_statuses: { 'Sopralluogo': 'done', 'Progetto preliminare': 'done', 'Progetto definitivo': 'doing', 'Direzione lavori': 'todo' },
                    task_budgets: { 'Progetto preliminare': 3000, 'Progetto definitivo': 7000, 'Direzione lavori': 8000 },
                    is_archived: false
                },
                {
                    id: 'demo-attico',
                    studio_id: studioId,
                    name: 'Attico Verdi',
                    client: 'Famiglia Verdi',
                    budget: 9000,
                    tasks: ['Sopralluogo', 'Riunioni', 'Progetto definitivo'],
                    task_statuses: { 'Sopralluogo': 'done', 'Riunioni': 'doing', 'Progetto definitivo': 'done' },
                    task_budgets: { 'Progetto definitivo': 9000 },
                    is_archived: true
                }
            ];
            entries = [
                { id: 'e1', studio_id: studioId, project_id: 'demo-villa', project_name: 'Villa Rossi', task: 'Sopralluogo', duration: 1.5, rate: 78, user_name: 'Stefano Morelli', user_email: 'demo@archtimepro.it', created_at: videoDemoDate(-2, 9, 0), notes: 'Rilievo stato di fatto' },
                { id: 'e2', studio_id: studioId, project_id: 'demo-villa', project_name: 'Villa Rossi', task: 'Riunioni', duration: 2, rate: 76, user_name: 'Laura Bianchi', user_email: 'laura@studio-demo.it', created_at: videoDemoDate(-1, 11, 30), notes: 'Allineamento con cliente' },
                { id: 'e3', studio_id: studioId, project_id: 'demo-villa', project_name: 'Villa Rossi', task: 'Progetto definitivo', duration: 14, rate: 728, user_name: 'Stefano Morelli', user_email: 'demo@archtimepro.it', created_at: videoDemoDate(0, 10, 15), notes: 'Tavole principali' },
                { id: 'e4', studio_id: studioId, project_id: 'demo-medico', project_name: 'Centro medico', task: 'Progetto definitivo', duration: 26, rate: 1092, user_name: 'Marco Verdi', user_email: 'marco@studio-demo.it', created_at: videoDemoDate(-3, 15, 0), notes: 'Layout distributivo' },
                { id: 'e5', studio_id: studioId, project_id: 'demo-medico', project_name: 'Centro medico', task: 'Direzione lavori', duration: 18, rate: 936, user_name: 'Stefano Morelli', user_email: 'demo@archtimepro.it', created_at: videoDemoDate(-4, 8, 45), notes: 'Coordinamento cantiere' }
            ];
            expenses = [
                { id: 'x1', studio_id: studioId, project_id: 'demo-villa', description: 'Diritti segreteria', amount: 320, user_name: 'Stefano Morelli', created_at: videoDemoDate(-2, 13, 0) },
                { id: 'x2', studio_id: studioId, project_id: 'demo-medico', description: 'Stampe tavole', amount: 480, user_name: 'Laura Bianchi', created_at: videoDemoDate(-1, 17, 0) }
            ];
        }

        function showVideoDemoApp() {
            document.documentElement.classList.remove('video-demo-boot');
            document.body.classList.add('is-admin');
            document.getElementById('auth-container')?.classList.add('force-hide');
            document.getElementById('limbo-container')?.classList.add('force-hide');
            document.getElementById('update-password-container')?.classList.add('force-hide');
            document.getElementById('paywall-container')?.classList.add('force-hide');
            document.getElementById('app-container')?.classList.remove('force-hide');

            document.getElementById('user-display').innerText = 'Stefano';
            document.getElementById('header-studio-name').innerText = studioData.name;
            document.getElementById('header-user-role').innerText = 'Admin';
            document.getElementById('account-studio-name').value = studioData.name;
            applyTheme('studio');
            renderCatalogAndTemplatesUI();
            renderProfiles();
            renderProjects();
            renderEntries();
            renderStrategicCharts();
        }

        function openVideoDemoProjectModal() {
            openCreateProjectModal();
            document.getElementById('edit-modal-name').value = 'Nuovo incarico demo';
            document.getElementById('edit-modal-client').value = 'Cliente Demo';
            document.getElementById('edit-modal-budget').value = '12000';
            newProjectTasks = ['Sopralluogo', 'Riunioni', 'Progetto definitivo', 'Direzione lavori'];
            newProjectTaskBudgets = { 'Progetto definitivo': 4000, 'Direzione lavori': 8000 };
            setProjectBudgetMode('auto');
            renderNewProjectUI();
        }

        function openVideoDemoTeamEdit() {
            switchAppTab('manage');
            openEditTeamMemberModal('demo-laura');
        }

        function openVideoDemoManualEntry() {
            openManualEntry();
            document.getElementById('manual-project').value = '0';
            updateManualTaskDropdown();
            document.getElementById('manual-task').value = 'Progetto definitivo';
            document.getElementById('manual-start').value = '09:00';
            document.getElementById('manual-end').value = '11:30';
            calculateManualHours();
        }

        function applyVideoDemoScene() {
            const params = new URLSearchParams(window.location.search);
            const scene = params.get('scene') || 'dashboard';
            switchAppTab(scene === 'team' ? 'manage' : (scene === 'analytics' ? 'analyze' : 'operate'));

            if (scene === 'project-modal') openVideoDemoProjectModal();
            if (scene === 'project-detail') showProjectDetail('demo-villa');
            if (scene === 'team') openVideoDemoTeamEdit();
            if (scene === 'manual-entry') openVideoDemoManualEntry();
            if (scene === 'analytics') openAnalyticsDetail();
            if (scene === 'onboarding') openOwnerOnboarding();
            if (scene === 'timer-running') {
                document.getElementById('timer-display').innerText = '00:18:42';
                document.getElementById('btn-text').innerText = 'Ferma timer';
            }
        }

        function bootVideoDemo() {
            if (!isVideoDemoMode()) return;
            setupVideoDemoData();
            showVideoDemoApp();
            applyVideoDemoScene();
            window.__ARCHTIME_VIDEO_DEMO_READY__ = true;
        }

        setTimeout(bootVideoDemo, 300);
