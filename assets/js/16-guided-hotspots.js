// Arch Time Pro - contextual first-use guidance.
(() => {
    const params = new URLSearchParams(window.location.search);
    const isPrototype = params.get('prototypeFlow') === '1' || window.location.pathname.includes('prototipo');
    const forceGuide = params.get('guide') === '1';
    const isCaptureOnly = params.get('videoDemo') === '1' && !isPrototype && !forceGuide;
    if (isCaptureOnly) return;

    const STORAGE_VERSION = 'v1';
    const scope = isPrototype ? 'october' : 'main';
    let storageKey = '';
    let state = null;
    let orderedSteps = [];
    let activeStep = null;
    let hotspot = null;
    let popover = null;
    let startTimer = null;

    const steps = {
        project: {
            selector: '#btn-open-project-modal',
            tab: 'operate',
            title: 'Aggiungi una nuova commessa',
            copy: 'Da qui scegli una commessa rapida oppure la configurazione completa con attività, budget e dati del cliente.'
        },
        timer: {
            selector: '#btn-toggle-timer',
            tab: 'operate',
            title: 'Registra il lavoro mentre accade',
            copy: 'Scegli commessa e attività, poi avvia il timer. Puoi fermarlo anche da un altro dispositivo.'
        },
        analytics: {
            selector: '#btn-toggle-analytics',
            tab: 'analyze',
            title: 'Leggi l’andamento dello studio',
            copy: 'Apri i grafici quando iniziano a entrare ore e spese: mostrano costi, margini e commesse che richiedono attenzione.'
        },
        workMode: {
            selector: '#btn-header-invite',
            title: 'Come lavori abitualmente?',
            copy: 'La risposta serve solo a mostrarti i suggerimenti pertinenti. Potrai sempre invitare il team in seguito.',
            choices: true
        },
        invite: {
            selector: '#btn-header-invite',
            title: 'Invita un collaboratore',
            copy: 'Il team può registrare ore e attività senza accedere a budget, costi interni e margini riservati alla direzione.'
        },
        report: {
            selector: '#btn-header-pdf',
            title: 'Esporta il Report studio',
            copy: 'Raccogli ore, costi e andamento delle commesse in un documento riferito al periodo che scegli.'
        }
    };

    function currentStudioId() {
        try {
            if (typeof userProfile !== 'undefined' && userProfile?.studio_id) return userProfile.studio_id;
        } catch (_) {}
        return isPrototype ? 'prototype' : 'pending';
    }

    function makeStorageKey() {
        return `archtime-guided-hotspots:${STORAGE_VERSION}:${scope}:${currentStudioId()}`;
    }

    function defaultState() {
        return { started: false, finished: false, completed: [], workMode: null };
    }

    function readState(reset = false) {
        const nextKey = makeStorageKey();
        if (storageKey !== nextKey) {
            storageKey = nextKey;
            state = null;
        }
        if (reset) localStorage.removeItem(storageKey);
        if (state) return state;
        try {
            state = { ...defaultState(), ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
        } catch (_) {
            state = defaultState();
        }
        state.completed = Array.isArray(state.completed) ? state.completed : [];
        return state;
    }

    function saveState() {
        if (!storageKey || !state) return;
        localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function hasRealProject() {
        try {
            if (typeof projects === 'undefined') return false;
            const theme = typeof THEMES !== 'undefined' ? THEMES[currentBusinessType] : null;
            return projects.some(project => {
                const isKnownDemo = project.is_demo === true
                    || (studioData?.demo_generated === true
                        && project.name === theme?.demoProject
                        && project.client === theme?.demoClient);
                return !isKnownDemo;
            });
        } catch (_) {
            return false;
        }
    }

    function buildOrder() {
        const firstSteps = hasRealProject() ? ['timer', 'project'] : ['project', 'timer'];
        orderedSteps = [...firstSteps, 'analytics', 'workMode', 'invite', 'report'];
    }

    function isAppReady() {
        const app = document.getElementById('app-container');
        if (!app || app.classList.contains('force-hide')) return false;
        return Boolean(document.querySelector('#btn-toggle-timer'));
    }

    function hasBlockingModal() {
        return [...document.querySelectorAll('.modal')].some(modal => {
            if (modal.classList.contains('force-hide')) return false;
            const style = getComputedStyle(modal);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }

    function stepAllowed(stepId) {
        if (stepId === 'invite') return state.workMode === 'team';
        return true;
    }

    function targetFor(stepId) {
        return document.querySelector(steps[stepId]?.selector || '');
    }

    function isVisible(element) {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function removeGuideElements() {
        if (activeStep) targetFor(activeStep)?.classList.remove('archtime-guide-target');
        hotspot?.remove();
        popover?.remove();
        hotspot = null;
        popover = null;
        activeStep = null;
    }

    function positionHotspot() {
        if (!hotspot || !activeStep) return;
        const target = targetFor(activeStep);
        if (!isVisible(target)) return;
        const rect = target.getBoundingClientRect();
        hotspot.style.left = `${Math.min(window.innerWidth - 22, Math.max(4, rect.right - 13))}px`;
        hotspot.style.top = `${Math.min(window.innerHeight - 22, Math.max(4, rect.top - 7))}px`;
        if (popover) positionPopover();
    }

    function positionPopover() {
        if (!popover || !activeStep) return;
        const target = targetFor(activeStep);
        if (!isVisible(target)) return;
        const rect = target.getBoundingClientRect();
        const popRect = popover.getBoundingClientRect();
        const gap = 12;
        const margin = 12;
        let top = rect.bottom + gap;
        if (top + popRect.height > window.innerHeight - margin) top = rect.top - popRect.height - gap;
        top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));
        let left = rect.right - popRect.width;
        left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    }

    function track(name, properties = {}) {
        window.archTimeAnalytics?.track(name, { guide_scope: scope, ...properties });
    }

    function finishGuide(skipped = false) {
        state.finished = true;
        saveState();
        track(skipped ? 'guided_hotspots_skipped' : 'guided_hotspots_completed');
        removeGuideElements();
    }

    function nextIncompleteStep() {
        return orderedSteps.find(stepId => !state.completed.includes(stepId) && stepAllowed(stepId));
    }

    function markStepComplete(stepId = activeStep) {
        if (!stepId) return;
        if (!state.completed.includes(stepId)) state.completed.push(stepId);
        saveState();
        track('guided_hotspot_completed', { step: stepId });
        removeGuideElements();
        const next = nextIncompleteStep();
        if (!next) return finishGuide(false);
        window.setTimeout(() => showStep(next), 240);
    }

    function chooseWorkMode(mode) {
        state.workMode = mode;
        saveState();
        track('onboarding_work_mode_selected', { mode });
        markStepComplete('workMode');
    }

    function showPopover() {
        if (!activeStep || popover) return;
        const step = steps[activeStep];
        popover = document.createElement('aside');
        popover.className = 'archtime-guide-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', step.title);
        const currentPosition = orderedSteps.filter(stepId => stepAllowed(stepId)).indexOf(activeStep) + 1;
        const total = orderedSteps.filter(stepId => stepAllowed(stepId)).length;
        popover.innerHTML = `
            <div class="archtime-guide-kicker"><span>Guida rapida · ${currentPosition}/${total}</span><button type="button" class="archtime-guide-close" aria-label="Chiudi suggerimento">×</button></div>
            <h3 class="archtime-guide-title">${step.title}</h3>
            <p class="archtime-guide-copy">${step.copy}</p>
            ${step.choices ? `
                <div class="archtime-guide-choices">
                    <button type="button" class="archtime-guide-choice" data-guide-mode="solo">Lavoro da solo</button>
                    <button type="button" class="archtime-guide-choice" data-guide-mode="team">Lavoro con un team</button>
                </div>` : `
                <div class="archtime-guide-actions">
                    <button type="button" class="archtime-guide-skip">Salta la guida</button>
                    <button type="button" class="archtime-guide-next">${activeStep === 'report' ? 'Ho capito' : 'Avanti'}</button>
                </div>`}
        `;
        document.body.appendChild(popover);
        popover.querySelector('.archtime-guide-close')?.addEventListener('click', () => {
            popover?.remove();
            popover = null;
        });
        popover.querySelector('.archtime-guide-skip')?.addEventListener('click', () => finishGuide(true));
        popover.querySelector('.archtime-guide-next')?.addEventListener('click', () => markStepComplete());
        popover.querySelectorAll('[data-guide-mode]').forEach(button => {
            button.addEventListener('click', () => chooseWorkMode(button.dataset.guideMode));
        });
        requestAnimationFrame(positionPopover);
    }

    function attachStep(stepId, attempt = 0) {
        const target = targetFor(stepId);
        if (!isVisible(target)) {
            if (attempt < 12) window.setTimeout(() => attachStep(stepId, attempt + 1), 120);
            else {
                state.completed.push(stepId);
                saveState();
                const next = nextIncompleteStep();
                if (next) showStep(next);
                else finishGuide(false);
            }
            return;
        }

        const rect = target.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        activeStep = stepId;
        target.classList.add('archtime-guide-target');
        hotspot = document.createElement('button');
        hotspot.type = 'button';
        hotspot.className = 'archtime-guide-hotspot';
        hotspot.setAttribute('aria-label', `Suggerimento: ${steps[stepId].title}`);
        hotspot.addEventListener('click', showPopover);
        hotspot.addEventListener('mouseenter', showPopover, { once: true });
        hotspot.addEventListener('focus', showPopover, { once: true });
        document.body.appendChild(hotspot);
        requestAnimationFrame(() => {
            positionHotspot();
            const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            if (!hasHover) showPopover();
        });
    }

    function showStep(stepId) {
        removeGuideElements();
        if (hasBlockingModal()) {
            window.setTimeout(() => showStep(stepId), 260);
            return;
        }
        const step = steps[stepId];
        if (step.tab && typeof switchAppTab === 'function') switchAppTab(step.tab);
        window.setTimeout(() => attachStep(stepId), 90);
    }

    function begin(reset = false) {
        window.clearTimeout(startTimer);
        if (!isAppReady() || hasBlockingModal()) {
            startTimer = window.setTimeout(() => begin(reset), 280);
            return;
        }
        readState(reset);
        state.started = true;
        state.finished = false;
        if (reset) {
            state.completed = [];
            state.workMode = null;
        }
        saveState();
        buildOrder();
        const next = nextIncompleteStep();
        if (next) showStep(next);
        else finishGuide(false);
    }

    function resumeIfNeeded() {
        if (!isAppReady()) {
            startTimer = window.setTimeout(resumeIfNeeded, 300);
            return;
        }
        const shouldReset = forceGuide && sessionStorage.getItem(`archtime-guide-reset:${scope}`) !== '1';
        if (shouldReset) sessionStorage.setItem(`archtime-guide-reset:${scope}`, '1');
        readState(shouldReset);
        if (forceGuide || (state.started && !state.finished)) begin(false);
    }

    window.addEventListener('archtime:onboarding-complete', () => begin(false));
    window.addEventListener('resize', positionHotspot, { passive: true });
    window.addEventListener('scroll', positionHotspot, { passive: true, capture: true });

    window.ArchTimeGuide = {
        start: () => begin(false),
        restart: () => begin(true),
        stop: () => finishGuide(true)
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resumeIfNeeded);
    else resumeIfNeeded();
})();
