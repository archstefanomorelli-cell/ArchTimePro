// Arch Time Pro Next · margine previsto
// Solo prototipo di ottobre: non modifica i file condivisi con l'app online.
//
// Prima il "Margine" era il budget meno i costi spesi finora: un numero che
// resta alto finché la commessa non è quasi finita. Qui lo sostituiamo con il
// margine previsto a fine lavoro, usando la percentuale di lavoro fatto che
// l'app calcola già dalle attività (da fare 0, in corso 50%, fatta 100%,
// pesate per il piano costi).
//
//   costi previsti   = costo delle ore ÷ lavoro fatto + spese
//   margine previsto = compenso − costi previsti
//
// Le spese restano quelle registrate: di solito sono note e non crescono
// con il lavoro. Sotto il 5% di lavoro fatto non si fanno previsioni.
(function () {
    'use strict';

    const LAVORO_MINIMO = 5;      // % sotto cui la previsione non è affidabile
    const SOGLIA_ATTENZIONE = 15; // % del compenso sotto cui il margine previsto va guardato

    function speseCommessa(project) {
        return expenses.filter(expense => expense.project_id === project.id)
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    }

    function previsione(project, summary) {
        summary = summary || getProjectCostSummary(project);
        const base = { residuo: summary.margin, budget: summary.budget, costi: summary.totalCost };
        if (!summary.economicReady) return { ...base, stato: 'incompleta' };
        const spese = speseCommessa(project);
        const costoOre = Math.max(0, summary.totalCost - spese);
        if (project.is_archived) {
            const margine = summary.budget - summary.totalCost;
            return { ...base, stato: 'finale', margine, percentuale: summary.budget > 0 ? margine / summary.budget * 100 : 0, lavoro: 100 };
        }
        const rhythm = typeof getProjectRhythmSummary === 'function' ? getProjectRhythmSummary(project, summary) : null;
        if (!rhythm) return { ...base, stato: 'senza_attivita' };
        const lavoro = Math.max(0, Math.min(100, rhythm.operationalPercent));
        if (lavoro < LAVORO_MINIMO || costoOre <= 0) return { ...base, stato: 'presto', lavoro };
        const costiPrevisti = costoOre / (lavoro / 100) + spese;
        const margine = summary.budget - costiPrevisti;
        const ore = Number(summary.totalHours || 0);
        const costoMedio = ore > 0 ? costoOre / ore : 0;
        return { ...base, stato: 'prevista', lavoro, costiPrevisti, margine, percentuale: margine / summary.budget * 100,
            oreDaFare: ore > 0 ? ore / (lavoro / 100) - ore : null,
            oreCoperte: costoMedio > 0 ? (summary.budget - summary.totalCost) / costoMedio : null };
    }

    function tono(p) {
        if (p.stato !== 'prevista' && p.stato !== 'finale') return 'neutro';
        if (p.margine < 0) return 'perdita';
        return p.percentuale < SOGLIA_ATTENZIONE ? 'attenzione' : 'bene';
    }
    const CLASSI = { perdita: 'text-red-600', attenzione: 'text-amber-600', bene: 'text-emerald-600', neutro: 'text-slate-500' };

    // Etichetta, valore e spiegazione da mostrare al posto del vecchio "Margine"
    function presentazione(project, summary) {
        const p = previsione(project, summary);
        const cls = CLASSI[tono(p)];
        switch (p.stato) {
            case 'prevista': return { p, cls, etichetta: 'Margine previsto', valore: formatMoney(p.margine, 0),
                nota: `Di questo passo, a fine lavoro (${Math.round(p.percentuale)}% del compenso). Lavoro fatto ${Math.round(p.lavoro)}%.` };
            case 'finale': return { p, cls, etichetta: 'Margine finale', valore: formatMoney(p.margine, 0),
                nota: `Commessa archiviata: ${Math.round(p.percentuale)}% del compenso.` };
            case 'presto': return { p, cls, etichetta: 'Budget residuo', valore: formatMoney(p.residuo, 0),
                nota: 'Lavoro fatto sotto il 5%: troppo presto per prevedere il margine. Aggiorna lo stato delle attività quando avanzi.' };
            case 'senza_attivita': return { p, cls, etichetta: 'Budget residuo', valore: formatMoney(p.residuo, 0),
                nota: 'Senza attività non si può calcolare quanto lavoro è fatto, quindi nemmeno il margine previsto.' };
            default: return { p, cls: CLASSI.neutro, etichetta: 'Margine previsto', valore: 'Da completare',
                nota: summary.economicIssue || 'Dati economici da completare.' };
        }
    }

    const escAttr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    // ---------- frase di stato ----------
    // Una frase al posto di "Allineato / Fuori ritmo": dice come finirà la commessa.
    function frase(project, summary) {
        const p = previsione(project, summary);
        const t = tono(p);
        const ore = n => `${Math.round(n)} ${Math.round(n) === 1 ? 'ora' : 'ore'}`;
        switch (p.stato) {
            case 'prevista':
                if (t === 'perdita') {
                    const coperte = p.oreCoperte !== null ? Math.max(0, p.oreCoperte) : null;
                    return `Di questo passo chiudi in perdita di circa ${formatMoney(-p.margine, 0)}.`
                        + (p.oreDaFare !== null && coperte !== null ? ` Per finire servono circa ${ore(p.oreDaFare)}, ${coperte >= 1 ? `il compenso ne copre ancora ${ore(coperte)}.` : 'ma il compenso è già esaurito.'}` : '');
                }
                if (t === 'attenzione') return `Il margine si sta assottigliando: di questo passo chiudi con circa ${formatMoney(p.margine, 0)} (${Math.round(p.percentuale)}%).`;
                return `Di questo passo chiudi con circa ${formatMoney(p.margine, 0)} di margine (${Math.round(p.percentuale)}%).`;
            case 'finale': return p.margine >= 0 ? `Chiusa con ${formatMoney(p.margine, 0)} di margine (${Math.round(p.percentuale)}%).` : `Chiusa in perdita di ${formatMoney(-p.margine, 0)}.`;
            case 'presto': return 'Troppo presto per una previsione: aggiorna lo stato delle attività quando avanzi.';
            case 'senza_attivita': return 'Aggiungi le attività della commessa per vedere come andrà a finire.';
            default: return 'Completa compenso e costi orari per vedere come andrà a finire.';
        }
    }

    // ---------- stato della commessa ----------
    // Quando c'è una previsione, lo stato (pallino, barra in alto, etichetta) segue il margine previsto.
    const STATI = {
        bene: { label: 'Va bene', icon: 'check-circle-2', tone: 'healthy', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', barClass: 'bg-emerald-500', text: 'text-emerald-600' },
        attenzione: { label: 'Da guardare', icon: 'circle-alert', tone: 'warning', className: 'bg-amber-50 text-amber-700 border-amber-200', barClass: 'bg-amber-400', text: 'text-amber-600' },
        perdita: { label: 'In perdita', icon: 'trending-down', tone: 'danger', className: 'bg-red-50 text-red-700 border-red-200', barClass: 'bg-red-500', text: 'text-red-600' }
    };
    const originalVisual = getProjectVisualStatus;
    getProjectVisualStatus = function (project, costSummary) {
        const visual = originalVisual.apply(this, arguments);
        if (!isAdminUser()) return visual;
        const p = previsione(project, costSummary || getProjectCostSummary(project));
        if (p.stato !== 'prevista') return visual;
        const st = STATI[tono(p)];
        return { ...visual, label: st.label, icon: st.icon, className: st.className, tone: st.tone, barClass: st.barClass, title: st.label };
    };

    // Tratteggio della barra: dai costi di oggi ai costi previsti a fine lavoro
    function tratteggio(p) {
        if (p.stato !== 'prevista' || !(p.budget > 0)) return '';
        const da = Math.min(100, p.costi / p.budget * 100);
        const a = Math.min(100, p.costiPrevisti / p.budget * 100);
        if (a <= da) return '';
        return `<span class="mp-proj is-${tono(p)}" style="left:${da}%;width:${a - da}%" title="Costi previsti a fine lavoro: ${formatMoney(p.costiPrevisti, 0)}"></span>`
            + (p.costiPrevisti > p.budget ? '<span class="mp-over" title="Oltre il compenso"></span>' : '');
    }

    // ---------- schede e righe dell'elenco commesse ----------
    const originalCard = projectCardHtml;
    projectCardHtml = function (project) {
        let html = originalCard.apply(this, arguments);
        if (!isAdminUser()) return html;
        const summary = getProjectCostSummary(project);
        const v = presentazione(project, summary);
        html = html.replace(
            /(<p class="[^"]*">)Margine(<\/p>\s*<p class="text-xs font-black )[^"]*( mt-0\.5")>[^<]*<\/p>/,
            `$1${v.etichetta}$2${v.cls}$3 title="${escAttr(v.nota)}">${v.valore}</p>`
        );
        // frase di stato sotto i numeri
        html = html.replace(/(<div class="pt-2 border-t border-slate-100">)/, `<p class="mp-frase">${escAttr(frase(project, summary))}</p>$1`);
        if (v.p.stato === 'prevista') {
            const st = STATI[tono(v.p)];
            html = html.replace(/(<span class="normal-case tracking-normal font-black )[^"]*(">)[^<]*(<\/span>)/, `$1${st.text}$2${st.label}$3`);
            html = html.replace(/(<div class="relative w-full bg-slate-100 h-2\.5 rounded-full overflow-visible">\s*<div class="[^"]*" style="[^"]*"><\/div>)/, `$1${tratteggio(v.p)}`);
        }
        html = html.replace(/<span>Costi (\d+)%<\/span>/, '<span>Costi $1% del compenso</span>')
            .replace(/<span>(?:Piano costi|Avanz\. attività) (\d+)%<\/span>/, '<span>Lavoro fatto $1%</span>')
            .replace(/>Avanzamento</, '>Costi e lavoro fatto<');
        return html;
    };

    const originalRow = projectListRowHtml;
    projectListRowHtml = function (project) {
        let html = originalRow.apply(this, arguments);
        if (!isAdminUser()) return html;
        const summary = getProjectCostSummary(project);
        const v = presentazione(project, summary);
        html = html.replace(
            /<small>Margine<\/small><strong class="[^"]*">[^<]*<\/strong>/,
            `<small>${v.etichetta}</small><strong class="${v.cls}" title="${escAttr(v.nota)}">${v.valore}</strong>`
        );
        html = html.replace(/ · Piano (\d+)%/, ' · lavoro fatto $1%');
        html = html.replace(/(<div class="project-list-progress-track">\s*<span class="[^"]*" style="[^"]*"><\/span>)/, `$1${tratteggio(v.p)}`);
        html = html.replace('<div class="project-list-progress">', `<div class="project-list-progress" title="${escAttr(frase(project, summary))}">`);
        return html;
    };

    // ---------- scheda della commessa ----------
    const originalDetail = showProjectDetail;
    showProjectDetail = function (id) {
        const result = originalDetail.apply(this, arguments);
        const project = projects.find(item => String(item.id) === String(id));
        const metrics = document.querySelector('#detail-content .project-detail-metrics');
        if (project && metrics && isAdminUser()) {
            const card = [...metrics.querySelectorAll('.project-metric-card')]
                .find(node => node.firstElementChild && node.firstElementChild.textContent.trim() === 'Margine');
            // "Resa oraria" usava le ore fatte finora: con la previsione diventa quanto rende ogni ora a fine lavoro
            const resa = [...metrics.querySelectorAll('.project-metric-card')]
                .find(node => node.firstElementChild && node.firstElementChild.textContent.trim() === 'Resa oraria');
            const pr = previsione(project);
            if (resa && pr.stato === 'prevista') {
                const ore = Number(getProjectCostSummary(project).totalHours || 0);
                const spese = speseCommessa(project);
                const orePreviste = ore / (pr.lavoro / 100);
                const rende = orePreviste > 0 ? (pr.budget - spese) / orePreviste : 0;
                const costoMedio = ore > 0 ? (pr.costi - spese) / ore : 0;
                resa.firstElementChild.textContent = 'Ogni ora rende';
                resa.children[1].innerHTML = `${formatMoney(rende, 0)} <span class="text-[10px] text-slate-400">/h</span>`;
                resa.title = `Compenso al netto delle spese diviso le ore previste a fine lavoro (${Math.round(orePreviste)} h). Un'ora costa in media ${formatMoney(costoMedio, 0)}.`;
                resa.insertAdjacentHTML('beforeend', `<p class="margine-previsto-nota" style="margin:2px 0 0;font-size:10px;line-height:1.3;font-weight:600;letter-spacing:0;text-transform:none;color:#64748b">costa in media ${formatMoney(costoMedio, 0)}</p>`);
            }
            if (card) {
                const v = presentazione(project);
                const [label, value] = card.children;
                label.textContent = v.etichetta;
                value.className = value.className.replace(/text-(slate|red|emerald|amber)-\d00/g, '').trim() + ' ' + v.cls;
                value.textContent = v.valore;
                card.title = v.nota;
                card.insertAdjacentHTML('beforeend', `<p class="margine-previsto-nota" style="margin:2px 0 0;font-size:10px;line-height:1.3;font-weight:600;letter-spacing:0;text-transform:none;color:#64748b">${v.p.stato === 'prevista' ? `Lavoro fatto ${Math.round(v.p.lavoro)}%` : (v.p.stato === 'finale' ? 'A consuntivo' : (v.p.stato === 'incompleta' ? '' : 'Previsione non ancora possibile'))}</p>`);
            }
        }
        if (project && isAdminUser()) aggiornaPannelloRitmo(project);
        return result;
    };

    // Pannello "Ritmo progetto" → "Come sta andando": una frase e due numeri chiari
    function aggiornaPannelloRitmo(project) {
        const content = document.getElementById('detail-content');
        const panel = content?.querySelector('.project-rhythm-panel, .normative-scope-panel');
        if (!panel) return;
        const summary = getProjectCostSummary(project);
        const p = previsione(project, summary);
        const rinomina = { 'Costi consumati': 'Costi sul compenso', 'Piano costi': 'Lavoro fatto', 'Piano costi avanzato': 'Lavoro fatto', 'Attività avanzate': 'Lavoro fatto' };
        panel.querySelectorAll('p, small').forEach(node => { const t = node.textContent.trim(); if (rinomina[t]) node.textContent = rinomina[t]; });
        const title = panel.querySelector('h3');
        if (title && /Ritmo progetto/i.test(title.textContent)) title.lastChild.textContent = ' Come sta andando';
        const descr = title?.parentElement?.querySelector('p');
        const testo = frase(project, summary);
        if (descr) { descr.textContent = testo; descr.classList.add('mp-frase', 'mp-frase-lg'); }
        else if (!panel.querySelector('.mp-frase')) panel.insertAdjacentHTML('afterbegin', `<p class="mp-frase mp-frase-lg">${escAttr(testo)}</p>`);
        const bar = panel.querySelector('.relative.w-full.bg-slate-100');
        if (bar && !bar.querySelector('.mp-proj')) bar.firstElementChild?.insertAdjacentHTML('afterend', tratteggio(p));
        if (p.stato === 'prevista' && !panel.querySelector('.mp-legenda') && bar) {
            bar.insertAdjacentHTML('afterend', `<p class="mp-legenda"><span><i class="mp-sw-fill"></i>Costi finora ${formatMoney(p.costi, 0)}</span><span><i class="mp-sw-proj is-${tono(p)}"></i>Previsti a fine lavoro ${formatMoney(p.costiPrevisti, 0)}</span><span><i class="mp-sw-mark"></i>Lavoro fatto ${Math.round(p.lavoro)}%</span></p>`);
        }
    }

    // ---------- sintesi dello studio (Oggi e Analisi) ----------
    function aggiornaSintesi() {
        const valueEl = document.getElementById('kpi-margin');
        if (!valueEl || !isAdminUser()) return;
        const card = valueEl.closest('div:not(#kpi-margin)');
        const label = card?.querySelector('h3');
        const note = document.getElementById('kpi-margin-note');
        const attive = projects.filter(project => !project.is_archived);
        const righe = attive.map(project => previsione(project));
        if (label) label.textContent = 'Margine previsto';
        if (righe.some(r => r.stato === 'incompleta')) return; // l'app mostra già "Da completare" e quante commesse mancano
        const previste = righe.filter(r => r.stato === 'prevista');
        const escluse = righe.length - previste.length;
        valueEl.classList.remove('text-primary-600', 'text-emerald-700', 'text-red-600', 'text-amber-600', 'text-slate-500');
        if (!previste.length) {
            valueEl.textContent = 'Da stimare';
            valueEl.classList.add('text-slate-500');
            if (note) note.textContent = 'Aggiorna lo stato delle attività per vedere come finiranno le commesse.';
            return;
        }
        const totale = previste.reduce((sum, r) => sum + r.margine, 0);
        const compensi = previste.reduce((sum, r) => sum + r.budget, 0);
        const inPerdita = previste.filter(r => r.margine < 0).length;
        valueEl.textContent = formatMoney(totale, 0);
        valueEl.classList.add(totale < 0 ? 'text-red-600' : (compensi > 0 && totale / compensi * 100 < SOGLIA_ATTENZIONE ? 'text-amber-600' : 'text-emerald-700'));
        if (note) {
            const parti = [`A fine lavoro, su ${previste.length} ${previste.length === 1 ? 'commessa' : 'commesse'}`];
            if (inPerdita) parti.push(`${inPerdita} in perdita`);
            if (escluse) parti.push(`${escluse} ancora da stimare`);
            note.textContent = parti.join(', ') + '.';
        }
    }
    // Tre gruppi al posto di "Allineati / Da monitorare / Fuori budget":
    // le commesse previste in perdita non finiscono più tra quelle da guardare.
    function aggiornaGruppi() {
        if (!isAdminUser()) return;
        const conta = { bene: 0, attenzione: 0, perdita: 0 };
        projects.filter(project => !project.is_archived).forEach(project => {
            const summary = getProjectCostSummary(project);
            if (!summary.economicReady || !(summary.budget > 0)) return;
            const p = previsione(project, summary);
            if (p.stato === 'prevista') { conta[tono(p)]++; return; }
            if (summary.margin < 0) { conta.perdita++; return; }
            const visual = getProjectVisualStatus(project, summary);
            conta[visual.tone === 'healthy' ? 'bene' : 'attenzione']++;
        });
        const imposta = (id, label, n) => {
            const strong = document.getElementById(id);
            if (!strong) return;
            strong.textContent = String(n);
            if (strong.previousElementSibling) strong.previousElementSibling.textContent = label;
            strong.classList.toggle('text-red-600', id === 'analytics-inline-over-budget' && n > 0);
        };
        imposta('analytics-inline-aligned', 'Vanno bene', conta.bene);
        imposta('analytics-inline-alerts', 'Da guardare', conta.attenzione);
        imposta('analytics-inline-over-budget', 'In perdita', conta.perdita);
    }

    // "Andamento globale" (barra arcobaleno e margine residuo) diventa la stessa barra
    // delle commesse, sommata su tutto lo studio: costi di oggi, costi previsti, lavoro fatto.
    function aggiornaStrisciaStudio() {
        const strip = document.getElementById('studio-health-strip');
        if (!strip || !isAdminUser()) return;
        const righe = projects.filter(project => !project.is_archived).map(project => previsione(project)).filter(r => r.stato === 'prevista');
        const title = strip.querySelector('.studio-health-heading h3');
        const descr = strip.querySelector('.studio-health-heading p');
        const value = document.getElementById('studio-health-value');
        const track = document.getElementById('studio-health-track');
        const marker = document.getElementById('studio-health-marker');
        const left = document.getElementById('studio-health-budget');
        const right = document.getElementById('studio-health-residual');
        strip.classList.add('mp-studio');
        if (title) title.textContent = 'Lo studio nel suo insieme';
        track.querySelectorAll('.mp-fill, .mp-proj, .mp-over').forEach(node => node.remove());
        if (!righe.length) {
            strip.classList.add('is-empty');
            if (descr) descr.textContent = 'Serve almeno una commessa con attività avviate e dati economici completi.';
            if (value) value.textContent = '–';
            if (left) left.textContent = 'Margine previsto non ancora disponibile';
            if (right) { right.textContent = ''; right.classList.remove('is-negative'); }
            return;
        }
        const compensi = righe.reduce((s, r) => s + r.budget, 0);
        const costi = righe.reduce((s, r) => s + r.costi, 0);
        const previsti = righe.reduce((s, r) => s + r.costiPrevisti, 0);
        const lavoro = righe.reduce((s, r) => s + r.budget * r.lavoro, 0) / compensi;
        const margine = compensi - previsti;
        const pct = margine / compensi * 100;
        const t = margine < 0 ? 'perdita' : (pct < SOGLIA_ATTENZIONE ? 'attenzione' : 'bene');
        const cPct = Math.min(100, costi / compensi * 100);
        const pPct = Math.min(100, previsti / compensi * 100);
        strip.classList.remove('is-empty');
        if (descr) descr.textContent = `Costi di oggi e costi previsti a fine lavoro sul totale dei compensi${righe.length < projects.filter(p => !p.is_archived).length ? ` (${righe.length} commesse con previsione)` : ''}.`;
        if (value) { value.textContent = margine < 0 ? `Previsto in perdita di ${formatMoney(-margine, 0)}` : `${Math.round(pct)}% di margine previsto`; value.classList.toggle('is-over-budget', margine < 0); }
        track.insertAdjacentHTML('afterbegin', `<span class="mp-fill" style="width:${cPct}%"></span>`
            + (pPct > cPct ? `<span class="mp-proj is-${t}" style="left:${cPct}%;width:${pPct - cPct}%"></span>` : '')
            + (previsti > compensi ? '<span class="mp-over"></span>' : ''));
        if (marker) { marker.style.left = `${Math.min(100, lavoro)}%`; marker.title = `Lavoro fatto ${Math.round(lavoro)}%`; }
        track.setAttribute('aria-label', 'Costi e lavoro fatto dello studio');
        track.setAttribute('aria-valuenow', String(Math.round(cPct)));
        track.setAttribute('aria-valuetext', `Costi ${Math.round(cPct)}% dei compensi, previsti ${Math.round(previsti / compensi * 100)}%, lavoro fatto ${Math.round(lavoro)}%`);
        if (left) left.textContent = `Compensi ${formatMoney(compensi, 0)}, costi finora ${formatMoney(costi, 0)} (${Math.round(cPct)}%), lavoro fatto ${Math.round(lavoro)}%`;
        if (right) { right.textContent = `Previsti a fine lavoro ${formatMoney(previsti, 0)}`; right.classList.toggle('is-negative', margine < 0); }
    }

    const originalCharts = renderStrategicCharts;
    renderStrategicCharts = function () {
        const result = originalCharts.apply(this, arguments);
        aggiornaSintesi();
        aggiornaGruppi();
        aggiornaStrisciaStudio();
        return result;
    };

    window.archTimeMarginePrevisto = { previsione, presentazione, tono, frase };
})();
