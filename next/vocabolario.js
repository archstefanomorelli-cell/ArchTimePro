// Arch Time Pro Next · vocabolario unico e piccole pulizie dell'interfaccia
// Solo prototipo. Un'unica serie di parole in tutta l'app:
// commessa (non lavoro o progetto), compenso (non budget), costi (non spese totali).
// Sostituisce solo testi dell'interfaccia riconosciuti per intero, mai nomi di
// commesse, clienti o attività scritti dall'utente.
(function () {
    'use strict';

    // Testi da sostituire quando coincidono per intero con il contenuto di un nodo
    const ESATTI = new Map([
        ['Budget', 'Compenso'],
        ['BUDGET', 'COMPENSO'],
        ['Spese totali', 'Costi totali'],
        ['Costi lavori attivi', 'Costi delle commesse attive'],
        ['Incasso lavori attivi', 'Incassi delle commesse attive'],
        ['Margine lavori attivi', 'Margine previsto'],
        ['Budget, costi, incassi e stato di tutti i lavori.', 'Compenso, costi, incassi e stato di tutte le commesse.'],
        ['Budget, attività, cliente e piano dei pagamenti.', 'Compenso, attività, cliente e piano dei pagamenti.'],
        ['Configura attività, budget e piano dei pagamenti.', 'Configura attività, compenso e piano dei pagamenti.'],
        ['Un riepilogo dei lavori attivi. I dettagli sono in Analisi.', 'Le commesse attive in sintesi. I dettagli sono in Analisi.'],
        ['Margini, redditività e segnali operativi dei lavori dello studio.', 'Margine previsto, costi e incassi delle commesse dello studio.'],
        ['Dove si concentrano le ore dei lavori attivi.', 'Dove si concentrano le ore delle commesse attive.'],
        ['Scegli il lavoro da confrontare.', 'Scegli la commessa da confrontare.'],
        ['Si applica a progetti, costi e report', 'Si applica a commesse, costi e report'],
        ['-- Seleziona Lavoro --', 'Scegli una commessa'],
        ['Inserimento ore manuali', 'Registra ore'],
        ['Su 1 lavoro attivo', 'Su 1 commessa attiva'],
        ['Attività progetto', 'Attività della commessa'],
        ['Budget progetto', 'Compenso della commessa'],
        ['Dati progetto', 'Dati della commessa'],
        ['Inserisci almeno un’attività nel progetto.', 'Inserisci almeno un’attività nella commessa.'],
        ['Inserisci il nome del progetto prima di continuare.', 'Inserisci il nome della commessa prima di continuare.'],
        ['Lavoro creato nella dimostrazione', 'Commessa creata nella dimostrazione'],
        ['Torna al progetto', 'Torna alla commessa'],
        ['Crea senza piano pagamenti', 'Crea senza piano dei pagamenti'],
        ['Imposta anagrafica, budget e attività del progetto. La fatturazione verrà configurata nel passaggio successivo.', 'Imposta anagrafica, compenso e attività della commessa. La fatturazione si configura nel passaggio successivo.']
    ]);
    const SEGNAPOSTO = new Map([['Nome lavoro', 'Nome della commessa'], ['Es. Casa Rossi', 'Es. Casa Rossi']]);
    // Frasi riconoscibili dentro testi più lunghi generati dall'app
    const PARZIALI = [
        [/\b(\d+) lavori attivi\b/g, '$1 commesse attive'],
        [/Puoi avviare il timer oppure usare Inserimento ore manuali per il lavoro già svolto\./g, 'Puoi avviare il timer oppure registrare le ore già lavorate.'],
        [/oppure usa Inserimento ore manuali/g, 'oppure usa Registra ore']
    ];

    // Zone con testo scritto dall'utente: non si toccano
    const ESCLUSI = 'input, textarea, select option[value]:not([value=""]), [contenteditable]';

    function traduciNodo(node) {
        const el = node.parentElement;
        if (!el || el.closest('script, style')) return;
        const raw = node.textContent;
        const trimmed = raw.trim();
        if (!trimmed) return;
        const esatto = ESATTI.get(trimmed);
        if (esatto && !el.closest(ESCLUSI)) { node.textContent = raw.replace(trimmed, esatto); return; }
        let next = raw;
        PARZIALI.forEach(([re, sub]) => { next = next.replace(re, sub); });
        if (next !== raw) node.textContent = next;
    }
    function traduci(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) { traduciNodo(root); return; }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) traduciNodo(node);
        // il segnaposto della scelta commessa è un <option value="">
        root.querySelectorAll?.('option[value=""]').forEach(opt => { const t = ESATTI.get(opt.textContent.trim()); if (t) opt.textContent = t; });
        root.querySelectorAll?.('[placeholder]').forEach(input => { const t = SEGNAPOSTO.get(input.getAttribute('placeholder')); if (t && t !== input.getAttribute('placeholder')) input.setAttribute('placeholder', t); });
    }

    let pending = new Set();
    let scheduled = false;
    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
            if (m.type === 'characterData') pending.add(m.target);
            m.addedNodes.forEach(n => pending.add(n));
        });
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                const nodes = [...pending]; pending = new Set();
                observer.disconnect();
                nodes.forEach(traduci);
                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            });
        }
    });

    function avvia() {
        document.body.classList.add('ux-ottobre');
        traduci(document.body);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        const manual = document.getElementById('btn-open-manual-entry');
        if (manual) manual.innerHTML = '<i data-lucide="pencil-line" class="w-5 h-5"></i> Registra ore';
        const separator = document.querySelector('.timer-choice-separator');
        if (separator) separator.textContent = 'oppure usa il timer';
        const timerPanel = document.getElementById('timer-panel');
        const toggle = document.getElementById('btn-toggle-timer');
        // "Registra ore" diventa l'azione principale, il timer quella secondaria
        if (timerPanel && toggle && manual && separator) { toggle.before(manual); manual.after(separator); }
        window.lucide?.createIcons?.();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
    else avvia();
})();
