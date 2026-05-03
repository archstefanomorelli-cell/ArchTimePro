// Arch Time Pro - 07-password-bootstrap.js
// ================= RECUPERO PASSWORD =================

        function bindStaticEvents() {
            const bindClick = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);

            document.getElementById('tab-login')?.addEventListener('click', () => switchAuthTab('login'));
            document.getElementById('tab-signup')?.addEventListener('click', () => switchAuthTab('signup'));
            bindClick('btn-auth', handleAuthAction);
            bindClick('btn-forgot-password', openForgotPassword);
            bindClick('btn-limbo-join', limboJoinStudio);
            bindClick('btn-limbo-create', limboCreateStudio);
            bindClick('btn-close-upgrade', closeUpgradeModal);
            bindClick('btn-header-pdf', openReportModal);
            bindClick('btn-open-account', openAccountModal);
            bindClick('btn-open-manual-entry', openManualEntry);
            bindClick('btn-toggle-timer', toggleTimer);
            bindClick('btn-manage-templates', openTemplatesModal);
            bindClick('btn-open-new-task-builder', () => openTaskBuilder('new'));
            bindClick('btn-create-project', createNewProject);
            bindClick('btn-open-team-report', openTeamReportModal);
            bindClick('btn-generate-invite', generateInviteLink);
            bindClick('btn-toggle-inactive', toggleInactiveMembers);
            bindClick('toggle-archived-btn', toggleViewArchived);
            bindClick('btn-prev-week', prevWeek);
            bindClick('btn-next-week', nextWeek);
            bindClick('btn-close-edit-team', closeEditTeamMemberModal);
            bindClick('btn-delete-team', deleteTeamMemberFromModal);
            bindClick('btn-save-team-edit', saveTeamMemberEdit);
            bindClick('btn-close-account', closeAccountModal);
            bindClick('btn-save-studio-name', saveStudioName);
            bindClick('btn-skip-onboarding', () => closeOwnerOnboarding(true));
            bindClick('btn-save-onboarding-identity', saveOnboardingIdentity);
            bindClick('btn-prepare-first-project', prepareFirstProjectFromOnboarding);
            bindClick('btn-open-catalog-account', openCatalogModal);
            bindClick('btn-export-user-data', exportUserData);
            bindClick('btn-delete-account', deleteAccount);
            bindClick('btn-close-task-builder', closeTaskBuilder);
            bindClick('btn-open-catalog-builder', openCatalogModal);
            bindClick('btn-add-task-builder', addNewTaskFromBuilder);
            bindClick('btn-confirm-task-builder', confirmTaskBuilder);
            bindClick('btn-close-catalog', closeCatalogModal);
            bindClick('btn-add-catalog', addActivityToCatalog);
            bindClick('btn-cancel-catalog', cancelCatalogEdit);
            bindClick('btn-close-templates', closeTemplatesModal);
            bindClick('btn-save-template', saveNewTemplate);
            bindClick('btn-cancel-edit-template', cancelEditTemplate);
            bindClick('btn-close-detail', closeDetail);
            bindClick('btn-close-manual-entry', closeManualEntry);
            bindClick('btn-save-manual-entry', saveManualEntry);
            bindClick('btn-close-edit-entry', closeEditEntryModal);
            bindClick('btn-save-entry-edit', saveEntryEdit);
            bindClick('btn-close-edit-expense', closeEditExpenseModal);
            bindClick('btn-save-expense-edit', saveExpenseEdit);
            bindClick('btn-close-edit-project', closeEditProjectModal);
            bindClick('btn-open-edit-task-builder', () => openTaskBuilder('edit'));
            bindClick('btn-save-project-edit', saveModalProjectEdit);
            bindClick('btn-close-report', closeReportModal);
            bindClick('btn-close-team-report', closeTeamReportModal);
            bindClick('btn-generate-team-report', generateTeamPDFReport);
            bindClick('btn-close-forgot-password', closeForgotPassword);
            bindClick('btn-send-reset-link', sendResetLink);
            bindClick('btn-save-new-password', saveNewPassword);
            bindClick('btn-accept-cookies', acceptCookies);

            document.getElementById('project-select')?.addEventListener('change', updateTaskDropdown);
            document.getElementById('new-proj-template')?.addEventListener('change', applyTemplateToNewProject);
            document.getElementById('week-picker')?.addEventListener('change', event => jumpToDate(event.target.value));
            document.getElementById('week-picker-trigger')?.addEventListener('click', () => document.getElementById('week-picker')?.showPicker());
            document.getElementById('account-logo-input')?.addEventListener('change', uploadLogo);
            document.getElementById('manual-project')?.addEventListener('change', updateManualTaskDropdown);
            document.getElementById('manual-start')?.addEventListener('change', calculateManualHours);
            document.getElementById('manual-end')?.addEventListener('change', calculateManualHours);
            document.getElementById('edit-entry-user')?.addEventListener('change', updateEditCost);
            document.getElementById('edit-entry-hours')?.addEventListener('input', updateEditCost);
            document.getElementById('edit-entry-project')?.addEventListener('change', updateEditTaskDropdown);

            document.querySelectorAll('[data-action="logout"]').forEach(button => {
                button.addEventListener('click', handleLogout);
            });

            document.querySelectorAll('[data-plan-checkout]').forEach(button => {
                button.addEventListener('click', () => redirectToStripe(button.dataset.planCheckout));
            });

            document.querySelectorAll('[data-plan-change]').forEach(button => {
                button.addEventListener('click', () => handlePlanChange(button.dataset.planChange));
            });

            document.querySelectorAll('.nav-btn[data-tab]').forEach(button => {
                button.addEventListener('click', () => switchAppTab(button.dataset.tab));
            });

            document.addEventListener('click', event => {
                const trigger = event.target.closest('[data-ui-action]');
                if (!trigger) return;

                const action = trigger.dataset.uiAction;
                const projectId = trigger.dataset.projectId;
                const entryId = trigger.dataset.entryId;
                const task = trigger.dataset.task;
                const templateIndex = Number(trigger.dataset.templateIndex);
                const taskIndex = Number(trigger.dataset.taskIndex);

                if (['toggle-project-archive', 'delete-project'].includes(action)) event.stopPropagation();

                switch (action) {
                    case 'edit-team-member':
                        return openEditTeamMemberModal(trigger.dataset.profileId);
                    case 'show-project-detail':
                        return showProjectDetail(projectId);
                    case 'toggle-project-archive':
                        return toggleArchive(projectId, trigger.dataset.archived === 'true');
                    case 'delete-project':
                        return deleteProject(projectId);
                    case 'move-builder-task':
                        return moveTaskBuilder(taskIndex, Number(trigger.dataset.direction));
                    case 'remove-builder-task':
                        return removeTaskBuilder(taskIndex);
                    case 'add-builder-task':
                        return addTaskBuilder(task);
                    case 'edit-catalog-task':
                        return editCatalogTask(task);
                    case 'remove-catalog-task':
                        return removeActivityFromCatalog(task);
                    case 'toggle-template-task':
                        return toggleTaskInNewTemplate(task);
                    case 'edit-template':
                        return editTemplate(templateIndex);
                    case 'remove-template':
                        return removeTemplate(templateIndex);
                    case 'upgrade-project-pdf':
                        return openUpgradeModal('Report PDF Singolo');
                    case 'export-project-pdf':
                        return exportProjectPDF(projectId);
                    case 'edit-project':
                        return openEditProjectModal(projectId);
                    case 'add-expense':
                        return addExpense(projectId);
                    case 'edit-expense':
                        return openEditExpenseModal(trigger.dataset.expenseId, projectId);
                    case 'delete-expense':
                        return deleteExpense(trigger.dataset.expenseId, projectId);
                    case 'edit-entry':
                        return openEditEntryModal(entryId);
                    case 'delete-entry':
                        return deleteEntry(entryId);
                    case 'switch-tab':
                        return switchAppTab(trigger.dataset.tab);
                    case 'generate-pdf-report':
                        return generatePDFReport();
                    default:
                        return;
                }
            });

            document.querySelectorAll('input[name="main-role"]').forEach(input => {
                input.addEventListener('change', toggleSignupOptions);
            });

            ['invite-code-input', 'full-name', 'email', 'password'].forEach(id => {
                document.getElementById(id)?.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAuthAction();
                    }
                });
            });
        }

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
        
        bindStaticEvents();
        lucide.createIcons();
        checkUser();
