// Arch Time Pro Next · la commessa come pagina, con tre schede
// Solo prototipo. Il dettaglio non è più una finestra sopra la pagina ma una
// pagina intera con "← Commesse" in alto e tre schede:
//   Panoramica   · stato, quattro numeri, come sta andando
//   Attività     · attività con il loro stato (nel Pro anche tranche e incassi)
//   Ore e spese  · ore per persona e spese della commessa
// Le sezioni esistenti vengono solo spostate: azioni e calcoli restano quelli dell'app.
// Aperta dentro la sua scheda in "Commesse" (12/10/2026) la Panoramica non c'è: numeri,
// frase e barra sono già nella scheda, quindi restano solo Attività e Ore e spese.
(function () {
    'use strict';

    let schedaAttiva = 'panoramica';
    let ultimaCommessa = null;

    function etichettaAttivita(content) {
        return content.querySelector('.prototype-detail-tranche, .prototype-tranche-workflow') ? 'Attività e incassi' : 'Attività';
    }

    function organizza(id) {
        const modal = document.getElementById('modal-detail');
        const content = document.getElementById('detail-content');
        if (!modal || !content || content.querySelector('.dp-schede')) return;
        const inLinea = apertaId != null;
        if (String(id) !== String(ultimaCommessa)) { schedaAttiva = inLinea ? 'attivita' : 'panoramica'; ultimaCommessa = id; }
        if (inLinea && schedaAttiva === 'panoramica') schedaAttiva = 'attivita';
        modal.classList.add('dp-pagina');

        const header = content.querySelector('.project-detail-header');
        const metrics = content.querySelector('.project-detail-metrics');
        const panel = content.querySelector('.project-rhythm-panel, .normative-scope-panel');
        const oreSpese = [...content.children].find(node => node.querySelector?.('.project-side-panel'));
        if (!header) return;

        const pannelli = {
            panoramica: document.createElement('div'),
            attivita: document.createElement('div'),
            ore: document.createElement('div')
        };
        Object.entries(pannelli).forEach(([k, el]) => {
            el.className = 'dp-pannello';
            el.id = `dp-pannello-${k}`;
            el.setAttribute('role', 'tabpanel');
            el.setAttribute('aria-labelledby', `dp-tab-${k}`);
        });

        if (metrics) { if (inLinea) metrics.remove(); else pannelli.panoramica.append(metrics); }
        if (panel) {
            // la parte alta del pannello (frase, numeri, barra) resta in Panoramica,
            // l'elenco delle attività va nella sua scheda
            const intestazioneAttivita = [...panel.children].find(node => node.matches?.('.flex.justify-between.items-center.mb-2'));
            const elenco = panel.querySelector('.prototype-tranche-workflow, .normative-scope-list') || (intestazioneAttivita && intestazioneAttivita.nextElementSibling);
            const boxAttivita = document.createElement('div');
            boxAttivita.className = 'dp-attivita';
            if (intestazioneAttivita) boxAttivita.append(intestazioneAttivita);
            if (elenco) boxAttivita.append(elenco);
            if (inLinea) panel.remove(); else pannelli.panoramica.append(panel);
            pannelli.attivita.append(boxAttivita);
        }
        const notaPro = content.querySelector('.piano-nota-pro');
        if (notaPro) pannelli.attivita.append(notaPro);
        if (oreSpese) pannelli.ore.append(oreSpese);
        // eventuali sezioni rimaste (es. avvisi) restano in Panoramica, o in Attività se la Panoramica non c'è
        [...content.children].forEach(node => { if (node !== header) (inLinea ? pannelli.attivita : pannelli.panoramica).append(node); });

        const schede = [
            ...(inLinea ? [] : [['panoramica', 'Panoramica']]),
            ['attivita', etichettaAttivita(pannelli.attivita)],
            ['ore', 'Ore e spese']
        ];
        if (inLinea) delete pannelli.panoramica;
        const tabs = document.createElement('div');
        tabs.className = 'dp-schede';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Sezioni della commessa');
        tabs.innerHTML = schede.map(([k, l]) => `<button type="button" role="tab" id="dp-tab-${k}" aria-controls="dp-pannello-${k}" data-dp-scheda="${k}">${l}</button>`).join('');

        header.after(tabs);
        tabs.after(...Object.values(pannelli));
        mostra(schedaAttiva);

        tabs.addEventListener('click', event => {
            const b = event.target.closest('[data-dp-scheda]');
            if (b) { mostra(b.dataset.dpScheda); b.focus(); }
        });
        tabs.addEventListener('keydown', event => {
            if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
            const keys = schede.map(s => s[0]);
            const i = keys.indexOf(schedaAttiva);
            const next = keys[(i + (event.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length];
            mostra(next);
            tabs.querySelector(`[data-dp-scheda="${next}"]`).focus();
        });
    }

    function mostra(k) {
        schedaAttiva = k;
        document.querySelectorAll('#detail-content [data-dp-scheda]').forEach(b => {
            const on = b.dataset.dpScheda === k;
            b.setAttribute('aria-selected', String(on));
            b.tabIndex = on ? 0 : -1;
        });
        document.querySelectorAll('#detail-content .dp-pannello').forEach(p => { p.hidden = p.id !== `dp-pannello-${k}`; });
        const scroller = document.querySelector('#modal-detail > div');
        if (scroller) scroller.scrollTop = 0;
    }

    function barraIndietro() {
        const panel = document.querySelector('#modal-detail > div');
        const close = document.getElementById('btn-close-detail');
        if (!panel || !close || panel.querySelector('.dp-indietro')) return;
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'dp-indietro';
        back.innerHTML = '<i data-lucide="arrow-left" aria-hidden="true"></i><span>Commesse</span>';
        back.addEventListener('click', () => close.click());
        panel.prepend(back);
    }

    // ---------- in "Commesse" la scheda si apre sul posto, senza cambiare pagina ----------
    // Il dettaglio viene disegnato dall'app nel suo contenitore (#detail-content), che qui
    // viene spostato sotto la scheda cliccata: azioni e aggiornamenti restano quelli dell'app.
    // Una commessa aperta alla volta. Fuori da "Commesse" si passa a "Commesse" e si apre lì.
    const modale = () => document.getElementById('modal-detail');
    const contenuto = () => document.getElementById('detail-content');
    const senzaAnimazione = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    let apertaId = null;

    function schedaDi(id) {
        return [...document.querySelectorAll('#projects-list [data-ui-action="show-project-detail"]')]
            .find(el => String(el.dataset.projectId) === String(id) && el.getClientRects().length);
    }

    // il contenitore torna nella finestra prima che la scheda venga tolta o ridisegnata
    function rimettiAPosto() {
        const c = contenuto(), m = modale();
        if (c && m && !m.contains(c)) m.firstElementChild.append(c);
        document.querySelectorAll('.cm-espansione').forEach(box => box.remove());
        document.querySelectorAll('.cm-scheda-aperta').forEach(card => { card.classList.remove('cm-scheda-aperta'); card.setAttribute('aria-expanded', 'false'); });
    }

    function chiudiInLinea() {
        const box = document.querySelector('.cm-espansione');
        apertaId = null;
        if (!box) return;
        document.querySelectorAll('.cm-scheda-aperta').forEach(card => card.setAttribute('aria-expanded', 'false'));
        box.classList.remove('is-aperta');
        let fatto = false;
        const fine = () => { if (fatto || apertaId) return; fatto = true; rimettiAPosto(); };
        if (senzaAnimazione()) fine();
        else { box.addEventListener('transitionend', fine, { once: true }); setTimeout(fine, 450); }
    }

    function apriInLinea(id, scheda, animata) {
        rimettiAPosto();
        apertaId = id;
        originalDetail(id);
        modale().classList.add('force-hide');
        organizza(id);
        const box = document.createElement('div');
        box.className = 'cm-espansione';
        box.innerHTML = '<div class="cm-espansione-interno"></div>';
        box.firstElementChild.append(contenuto());
        scheda.after(box);
        scheda.classList.add('cm-scheda-aperta');
        scheda.setAttribute('aria-expanded', 'true');
        window.lucide?.createIcons?.();
        // il browser registra lo stato chiuso, poi l'apertura parte con l'animazione
        if (animata && !senzaAnimazione()) void box.offsetHeight;
        box.classList.add('is-aperta');
    }

    const originalDetail = showProjectDetail;
    showProjectDetail = function (id) {
        // aggiornamento della commessa già aperta (es. cambio stato di un'attività)
        if (apertaId != null && String(id) === String(apertaId) && document.querySelector('.cm-espansione')) {
            const result = originalDetail.apply(this, arguments);
            modale().classList.add('force-hide');
            organizza(id);
            window.lucide?.createIcons?.();
            return result;
        }
        const apri = scheda => {
            apriInLinea(id, scheda, true);
            scheda.scrollIntoView({ block: 'start', behavior: senzaAnimazione() ? 'auto' : 'smooth' });
        };
        const scheda = schedaDi(id);
        if (scheda) return apri(scheda);
        // da un'altra sezione: si passa a "Commesse" e si aspetta che l'elenco compaia
        const nav = matchMedia('(min-width: 1024px)').matches ? '.workflow-nav-desktop' : '.workflow-nav-mobile';
        document.querySelector(`${nav} [data-workflow-target="projects"]`)?.click();
        let tentativi = 0;
        const attendi = () => {
            const trovata = schedaDi(id);
            if (trovata) return apri(trovata);
            if (++tentativi < 25) return setTimeout(attendi, 40);
            // commessa non visibile in elenco (es. archiviata e nascosta): pagina intera come prima
            originalDetail(id);
            barraIndietro();
            organizza(id);
            window.lucide?.createIcons?.();
        };
        attendi();
    };

    // cliccando di nuovo la scheda aperta si richiude
    document.addEventListener('click', event => {
        const scheda = event.target.closest('#projects-list [data-ui-action="show-project-detail"]');
        if (!scheda || event.target.closest('[data-ui-action]') !== scheda) return;
        if (apertaId == null || String(scheda.dataset.projectId) !== String(apertaId)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        chiudiInLinea();
    }, true);
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || apertaId == null || document.querySelector('.modal:not(.force-hide)')) return;
        chiudiInLinea();
    });

    // quando l'elenco viene ridisegnato la commessa aperta resta aperta
    const originalRenderProjects = renderProjects;
    renderProjects = function () {
        const riaprire = apertaId;
        rimettiAPosto();
        const result = originalRenderProjects.apply(this, arguments);
        const scheda = riaprire != null ? schedaDi(riaprire) : null;
        if (scheda) apriInLinea(riaprire, scheda, false); else apertaId = null;
        return result;
    };

    // Con la pagina intera aperta le barre restano visibili: scegliere una sezione la chiude
    document.addEventListener('click', event => {
        if (!event.target.closest('.workflow-nav [data-workflow-target]')) return;
        if (apertaId != null) { rimettiAPosto(); apertaId = null; }
        const modal = modale();
        if (modal && !modal.classList.contains('force-hide')) document.getElementById('btn-close-detail')?.click();
    }, true);

    // Quando l'app ridisegna il dettaglio (es. cambio stato di un'attività) riorganizza di nuovo
    const content = document.getElementById('detail-content');
    if (content) new MutationObserver(() => {
        if (!content.querySelector('.project-detail-header') || content.querySelector('.dp-schede')) return;
        organizza(ultimaCommessa);
        window.lucide?.createIcons?.();
    }).observe(content, { childList: true });
})();
