// Arch Time Pro Next · la commessa come pagina, con tre schede
// Solo prototipo. Il dettaglio non è più una finestra sopra la pagina ma una
// pagina intera con "← Commesse" in alto e tre schede:
//   Panoramica   · stato, quattro numeri, come sta andando
//   Attività     · attività con il loro stato (nel Pro anche tranche e incassi)
//   Ore e spese  · ore per persona e spese della commessa
// Le sezioni esistenti vengono solo spostate: azioni e calcoli restano quelli dell'app.
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
        if (String(id) !== String(ultimaCommessa)) { schedaAttiva = 'panoramica'; ultimaCommessa = id; }
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

        if (metrics) pannelli.panoramica.append(metrics);
        if (panel) {
            // la parte alta del pannello (frase, numeri, barra) resta in Panoramica,
            // l'elenco delle attività va nella sua scheda
            const intestazioneAttivita = [...panel.children].find(node => node.matches?.('.flex.justify-between.items-center.mb-2'));
            const elenco = panel.querySelector('.prototype-tranche-workflow, .normative-scope-list') || (intestazioneAttivita && intestazioneAttivita.nextElementSibling);
            const boxAttivita = document.createElement('div');
            boxAttivita.className = 'dp-attivita';
            if (intestazioneAttivita) boxAttivita.append(intestazioneAttivita);
            if (elenco) boxAttivita.append(elenco);
            pannelli.panoramica.append(panel);
            pannelli.attivita.append(boxAttivita);
        }
        const notaPro = content.querySelector('.piano-nota-pro');
        if (notaPro) pannelli.attivita.append(notaPro);
        if (oreSpese) pannelli.ore.append(oreSpese);
        // eventuali sezioni rimaste (es. avvisi) restano in Panoramica
        [...content.children].forEach(node => { if (node !== header) pannelli.panoramica.append(node); });

        const schede = [
            ['panoramica', 'Panoramica'],
            ['attivita', etichettaAttivita(pannelli.attivita)],
            ['ore', 'Ore e spese']
        ];
        const tabs = document.createElement('div');
        tabs.className = 'dp-schede';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Sezioni della commessa');
        tabs.innerHTML = schede.map(([k, l]) => `<button type="button" role="tab" id="dp-tab-${k}" aria-controls="dp-pannello-${k}" data-dp-scheda="${k}">${l}</button>`).join('');

        header.after(tabs);
        tabs.after(pannelli.panoramica, pannelli.attivita, pannelli.ore);
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

    const originalDetail = showProjectDetail;
    showProjectDetail = function (id) {
        const result = originalDetail.apply(this, arguments);
        barraIndietro();
        organizza(id);
        window.lucide?.createIcons?.();
        return result;
    };

    // Quando l'app ridisegna il dettaglio (es. cambio stato di un'attività) riorganizza di nuovo
    const content = document.getElementById('detail-content');
    if (content) new MutationObserver(() => {
        if (!content.querySelector('.project-detail-header') || content.querySelector('.dp-schede')) return;
        organizza(ultimaCommessa);
        window.lucide?.createIcons?.();
    }).observe(content, { childList: true });
})();
