// Next-only orientation guide. Uses the existing hotspot/popover visual system.
(() => {
    const el = id => document.getElementById(id);
    const wide = () => matchMedia('(min-width: 1024px)').matches;
    const staff = () => document.body.classList.contains('workflow-staff');
    let active = false, index = 0, steps = [], target = null, hotspot = null, popover = null;
    let ownedQuick = false, generation = 0, installed = false, navigating = false, paused = false;
    let previousFocus = null;
    let activeKey = '', quickDraft = null;
    const key = () => `archtime-next-guide:v1:${userProfile?.studio_id || 'prototype'}:${userProfile?.id || 'demo'}:${staff() ? 'staff' : 'owner'}`;
    const visible = node => !!node && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const waitFor = async check => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (check()) return true;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return false;
    };
    function save(finished = false) {
        try { localStorage.setItem(activeKey || key(), JSON.stringify({ index, finished })); } catch (_) {}
    }
    function clearUI() {
        target?.classList.remove('archtime-guide-target');
        hotspot?.remove(); popover?.remove();
        target = hotspot = popover = null;
    }
    function closeQuick() {
        if (!ownedQuick) return;
        el('modal-prototype-quick-project').querySelector('[data-prototype-action="close-quick-project"]')?.click();
        ownedQuick = false;
        if (quickDraft) {
            quickDraft.fields.forEach(({ node, value, checked }) => { node.value = value; node.checked = checked; });
            el('prototype-quick-project-form').querySelector('details').open = quickDraft.detailsOpen;
            refreshProjectCostModeUI(el('prototype-quick-project-form'));
            quickDraft = null;
        }
    }
    function stop(finished = true) {
        generation++;
        active = false; paused = false;
        save(finished); clearUI(); closeQuick();
        if (visible(previousFocus)) previousFocus.focus({ preventScroll: true });
    }
    async function navigate(view) {
        navigating = true;
        document.querySelector(`${wide() ? '.workflow-nav-desktop' : '.workflow-nav-mobile'} [data-workflow-target="${view}"]`)?.click();
        await waitFor(() => el('app-container').dataset.workflowView === view);
        await new Promise(resolve => requestAnimationFrame(resolve));
        navigating = false;
    }
    function buildSteps() {
        const work = { view: 'today', title: 'Timer o inserimento manuale', copy: 'Avvia il timer mentre lavori oppure usa Inserimento ore manuali per il lavoro già svolto. Le due modalità hanno la stessa importanza.', selector: '#btn-toggle-timer' };
        const log = { view: 'log', title: 'Ritrova le ore nel Registro', copy: staff() ? 'Scegli la settimana e la commessa per ritrovare le tue ore. Qui puoi anche correggere una registrazione.' : 'Scegli la settimana, la commessa e il membro del team per ritrovare le ore. Il modulo di inserimento manuale è qui a sinistra sul desktop.', selector: '#context-register-filters' };
        if (staff()) return [work, log, { view: 'studio', title: 'Il tuo profilo', copy: 'Qui trovi le tue informazioni e lo studio a cui appartieni. Le impostazioni economiche e la gestione del team sono riservate alla direzione.', selector: '#workflow-profile-page' }];
        return [
            { view: 'projects', title: 'Crea la prima commessa', copy: wide() ? 'A sinistra puoi creare una commessa rapida con nome e prima attività. Nuova commessa apre invece la configurazione completa.' : 'Nuova commessa ti permette di scegliere una creazione rapida oppure la configurazione completa. Per iniziare bastano nome e prima attività.', selector: wide() ? '#prototype-quick-project-name' : '#btn-open-project-modal' },
            { view: 'projects', title: 'Scegli il costo delle ore', copy: 'Unico per commessa è la scelta predefinita: imposti un costo orario interno comune. Per membro del team usa invece il costo di ciascuna persona. Puoi completarlo anche dopo.', selector: '#prototype-quick-project-form .project-cost-choice', prepare: async () => {
                if (wide()) return;
                const form = el('prototype-quick-project-form');
                quickDraft = { fields: Array.from(form.elements).map(node => ({ node, value: node.value, checked: node.checked })), detailsOpen: form.querySelector('details').open };
                el('btn-open-project-modal').click();
                await waitFor(() => visible(el('modal-project-type')));
                el('modal-project-type').querySelector('[data-prototype-action="open-quick-project"]')?.click();
                ownedQuick = true;
            } },
            { view: 'studio', title: 'Imposta i costi del team', copy: 'In Team vedi il costo orario interno di ogni membro. Il pulsante con la matita apre la scheda dove puoi impostarlo o modificarlo. Invita membro è sempre nell’intestazione.', selector: '#team-list .context-team-hourly-cost', fallback: '#team-list', prepare: async () => { document.querySelector('[data-management-tab="team"]')?.click(); } },
            work, log,
            { view: 'analytics', title: 'Leggi i risultati in Analisi', copy: wide() ? 'La vista parte da Questo mese. Puoi scegliere un periodo personalizzato, una commessa e un membro del team. Questi filtri riguardano ore e relativi costi; il quadro economico complessivo resta separato.' : 'Qui trovi costi, margini e andamento delle commesse. Report studio raccoglie i risultati per il periodo scelto. Sul desktop trovi anche i filtri delle ore per periodo, commessa e membro.', selector: wide() ? '#context-period' : '.workflow-finance .analytics-primary-grid' }
        ];
    }
    function position() {
        if (!popover || !visible(target)) return;
        const rect = target.getBoundingClientRect();
        const box = popover.getBoundingClientRect();
        const margin = 12, bottom = innerHeight - (wide() ? 12 : 82);
        let top = rect.bottom + 12;
        if (top + box.height > bottom) top = rect.top - box.height - 12;
        top = Math.max(margin, Math.min(top, bottom - box.height));
        popover.style.top = `${top}px`;
        popover.style.left = `${Math.max(margin, Math.min(rect.right - box.width, innerWidth - box.width - margin))}px`;
        hotspot.style.top = `${Math.max(4, Math.min(rect.top - 7, bottom - 18))}px`;
        hotspot.style.left = `${Math.max(4, Math.min(rect.right - 13, innerWidth - 22))}px`;
    }
    async function show() {
        const token = ++generation;
        clearUI(); closeQuick();
        const step = steps[index];
        await navigate(step.view);
        if (!active || token !== generation) return;
        await step.prepare?.();
        await waitFor(() => visible(document.querySelector(step.selector)) || (step.fallback && visible(document.querySelector(step.fallback))));
        if (!active || token !== generation) return;
        target = document.querySelector(step.selector);
        if (!visible(target) && step.fallback) target = document.querySelector(step.fallback);
        if (!visible(target)) { stop(false); return; }
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
        target.classList.add('archtime-guide-target');
        hotspot = document.createElement('button');
        hotspot.type = 'button'; hotspot.className = 'archtime-guide-hotspot';
        hotspot.setAttribute('aria-label', `Suggerimento: ${step.title}`);
        popover = document.createElement('aside');
        popover.className = 'archtime-guide-popover';
        popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-labelledby', 'next-guide-title');
        popover.innerHTML = `<div class="archtime-guide-kicker"><span>Guida rapida · ${index + 1}/${steps.length}</span><button type="button" class="archtime-guide-close" aria-label="Chiudi la guida">×</button></div><h3 id="next-guide-title" class="archtime-guide-title"></h3><p class="archtime-guide-copy"></p><div class="archtime-guide-actions"><button type="button" class="archtime-guide-skip">Salta la guida</button><button type="button" class="archtime-guide-next">${index === steps.length - 1 ? 'Ho capito' : 'Avanti'}</button></div>`;
        popover.querySelector('h3').textContent = step.title;
        popover.querySelector('.archtime-guide-copy').textContent = step.copy;
        popover.querySelector('.archtime-guide-close').addEventListener('click', () => stop());
        popover.querySelector('.archtime-guide-skip').addEventListener('click', () => stop());
        popover.querySelector('.archtime-guide-next').addEventListener('click', () => {
            index++;
            if (index >= steps.length) stop();
            else { save(); show(); }
        });
        hotspot.addEventListener('click', () => popover?.querySelector('.archtime-guide-next').focus());
        document.body.append(hotspot, popover);
        position();
        popover.querySelector('.archtime-guide-next').focus({ preventScroll: true });
    }
    async function begin(reset = false) {
        if (!await waitFor(() => window.__ARCHTIME_CONTEXT_READY__)) return;
        if (!installed) install();
        previousFocus = document.activeElement;
        clearUI(); closeQuick();
        activeKey = key();
        steps = buildSteps(); index = 0;
        // Opening help starts on the current page; subsequent steps may tour others.
        if (reset) {
            const current = steps.findIndex(step => step.view === el('app-container').dataset.workflowView);
            if (current > 0) steps = steps.slice(current).concat(steps.slice(0, current));
        }
        if (!reset) {
            try { const saved = JSON.parse(localStorage.getItem(key()) || '{}'); if (!saved.finished) index = Math.min(saved.index || 0, steps.length - 1); } catch (_) {}
        }
        active = true; paused = false; save(); show();
    }
    function pause() { if (!active || navigating) return; paused = true; generation++; clearUI(); }
    function resume() { if (!active || !paused) return; paused = false; show(); }
    function install() {
        if (installed) return;
        installed = true;
        const launcher = document.createElement('button');
        launcher.id = 'next-guide-launch'; launcher.type = 'button'; launcher.className = 'secondary-action';
        launcher.innerHTML = '<i data-lucide="circle-help" aria-hidden="true"></i><span>Guida rapida</span>';
        launcher.setAttribute('aria-label', 'Apri la guida rapida');
        const placeLauncher = () => {
            const desktop = document.querySelector('.workflow-nav-desktop');
            const heading = document.querySelector('.workflow-view-heading');
            const hadFocus = document.activeElement === launcher;
            const host = wide() ? desktop : heading;
            if (launcher.parentElement !== host) host.append(launcher);
            launcher.classList.toggle('next-guide-nav-button', wide());
            launcher.querySelector('span').className = wide() ? 'next-guide-nav-tooltip' : '';
            if (hadFocus) launcher.focus({ preventScroll: true });
        };
        placeLauncher();
        matchMedia('(min-width: 1024px)').addEventListener('change', placeLauncher);
        launcher.addEventListener('click', () => begin(true));
        window.lucide?.createIcons();
        new MutationObserver(() => { if (active && !navigating && !paused) stop(false); }).observe(el('app-container'), { attributes: true, attributeFilter: ['data-workflow-view'] });
        el('workflow-persona-switch')?.addEventListener('click', () => { if (active) stop(false); });
        window.addEventListener('resize', () => {
            if (active && !paused) { steps = buildSteps(); show(); }
        }, { passive: true });
    }
    window.addEventListener('archtime:next-context-ready', install);
    window.ArchTimeGuide = { start: () => begin(), restart: () => begin(true), stop: () => stop(), isActive: () => active, pauseForFirstValue: pause, resumeAfterFirstValue: resume, pauseForManualEntry: pause, resumeAfterManualEntry: resume };
    window.addEventListener('archtime:onboarding-complete', event => {
        if (!event.detail?.guideOptional) begin(true);
    });
    window.addEventListener('scroll', position, { passive: true, capture: true });
    document.addEventListener('keydown', event => { if (active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); stop(); } }, true);
    waitFor(() => window.__ARCHTIME_CONTEXT_READY__).then(ready => {
        if (!ready) return;
        install();
        if (new URLSearchParams(location.search).get('guide') === '1') begin(true);
    });
})();
