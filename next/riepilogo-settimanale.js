// Arch Time Pro Next · riepilogo settimanale per il titolare (anteprima)
// Solo prototipo: costruisce l'email del lunedì con i dati dello studio e la mostra
// in anteprima. Non invia nulla. Il modello HTML usa solo stili in linea, così potrà
// essere riusato dalla funzione che invierà le email (Supabase Edge Function).
(function () {
    'use strict';

    const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ore = h => `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(h)} h`;
    const COLORI = { perdita: '#b91c1c', attenzione: '#b45309', bene: '#047857', neutro: '#475569' };
    const ETICHETTE = { perdita: 'In perdita', attenzione: 'Da guardare', bene: 'Va bene', neutro: 'Da completare' };

    function dati() {
        const M = window.archTimeMarginePrevisto;
        const flow = window.archTimeFlowPrototype;
        const pro = !window.archTimePiano?.isBasic();
        // Nel prototipo i dati sono di questa settimana: usiamo gli ultimi 7 giorni
        const da = new Date(Date.now() - 7 * 864e5);
        const recenti = entries.filter(e => new Date(e.created_at) >= da);
        const perPersona = {};
        recenti.forEach(e => { perPersona[e.user_name || 'Studio'] = (perPersona[e.user_name || 'Studio'] || 0) + Number(e.duration || 0); });
        const ordine = { perdita: 0, attenzione: 1, neutro: 2, bene: 3 };
        const commesse = projects.filter(p => !p.is_archived).map(project => {
            const p = M.previsione(project);
            const t = M.tono(p);
            return { project, tono: t, frase: M.frase(project), ore: recenti.filter(e => e.project_id === project.id).reduce((s, e) => s + Number(e.duration || 0), 0) };
        }).sort((a, b) => ordine[a.tono] - ordine[b.tono] || b.ore - a.ore);
        let fatture = [];
        if (pro && flow) {
            projects.filter(p => !p.is_archived && flow.hasPaymentPlan(p)).forEach(project => {
                flow.projectMeta(project).payments.filter(pay => pay.status === 'pending' && flow.paymentMaturity(project, pay).ready)
                    .forEach(pay => fatture.push({ project, label: pay.label || 'Tranche', importo: Number(project.budget || 0) * Number(pay.percent || 0) / 100 }));
            });
        }
        return {
            studio: studioData?.name || 'il tuo studio',
            nome: String(userProfile?.full_name || '').split(/\s+/)[0],
            totaleOre: recenti.reduce((s, e) => s + Number(e.duration || 0), 0),
            perPersona: Object.entries(perPersona).sort((a, b) => b[1] - a[1]),
            commesse, fatture, pro,
            conteggio: commesse.reduce((c, x) => { c[x.tono] = (c[x.tono] || 0) + 1; return c; }, {})
        };
    }

    function oggetto(d) {
        if (d.conteggio.perdita) return `La tua settimana: ${d.conteggio.perdita} ${d.conteggio.perdita === 1 ? 'commessa prevista' : 'commesse previste'} in perdita`;
        if (d.conteggio.attenzione) return `La tua settimana: ${d.conteggio.attenzione} ${d.conteggio.attenzione === 1 ? 'commessa' : 'commesse'} da guardare`;
        return `La tua settimana: ${ore(d.totaleOre)} registrate, le commesse vanno bene`;
    }

    function html(d) {
        const riga = x => `<tr><td style="padding:12px 0;border-top:1px solid #e2e8f0;vertical-align:top">
            <div style="font-size:15px;font-weight:700;color:#0f172a">${esc(x.project.name)}</div>
            <div style="margin-top:2px;font-size:12px;font-weight:700;color:${COLORI[x.tono]}">${ETICHETTE[x.tono]}${x.ore ? ` · ${ore(x.ore)} questa settimana` : ''}</div>
            <div style="margin-top:4px;font-size:14px;line-height:1.45;color:#334155">${esc(x.frase)}</div></td></tr>`;
        return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(oggetto(d))}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0">
<tr><td style="padding:24px 28px 8px">
  <div style="font-size:13px;font-weight:800;letter-spacing:.02em;color:#172033">ARCH TIME PRO</div>
  <h1 style="margin:16px 0 0;font-size:22px;line-height:1.25;color:#0f172a">Buongiorno${d.nome ? ` ${esc(d.nome)}` : ''}, ecco la settimana di ${esc(d.studio)}</h1>
  <p style="margin:8px 0 0;font-size:15px;color:#475569">Lo studio ha registrato <strong style="color:#0f172a">${ore(d.totaleOre)}</strong>${d.perPersona.length ? `: ${d.perPersona.map(([n, h]) => `${esc(n.split(' ')[0])} ${ore(h)}`).join(', ')}` : ''}.</p>
</td></tr>
<tr><td style="padding:8px 28px 4px"><h2 style="margin:12px 0 0;font-size:16px;color:#0f172a">Le commesse</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${d.commesse.map(riga).join('')}</table></td></tr>
${d.pro ? `<tr><td style="padding:8px 28px 4px"><h2 style="margin:12px 0 6px;font-size:16px;color:#0f172a">Da fatturare</h2>
  ${d.fatture.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${d.fatture.map(f => `<tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#334155">${esc(f.project.name)} · ${esc(f.label)}</td><td align="right" style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#0f172a">${esc(formatMoney(f.importo, 0))}</td></tr>`).join('')}</table>` : '<p style="margin:0;font-size:14px;color:#475569">Nessuna tranche pronta da fatturare.</p>'}
</td></tr>` : ''}
<tr><td style="padding:20px 28px 28px">
  <a href="https://www.archtimepro.it/app.html" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#172033;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none">Apri Arch Time Pro</a>
  <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#94a3b8">Ricevi questo riepilogo ogni lunedì mattina perché sei titolare dello studio. Puoi disattivarlo da Arch Time Pro, in Studio → Identità.</p>
</td></tr></table></td></tr></table></body></html>`;
    }

    function apriAnteprima() {
        const d = dati();
        let modal = document.getElementById('riepilogo-anteprima');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'riepilogo-anteprima';
            modal.className = 'riepilogo-anteprima modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'riepilogo-titolo');
            document.body.append(modal);
            modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-chiudi-riepilogo]')) modal.classList.add('force-hide'); });
            document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.classList.contains('force-hide')) { event.stopImmediatePropagation(); modal.classList.add('force-hide'); } }, true);
        }
        modal.innerHTML = `<div class="riepilogo-box">
            <div class="riepilogo-testa"><div><p>Anteprima, non viene inviato nulla</p><h2 id="riepilogo-titolo">Riepilogo settimanale</h2></div><button type="button" data-chiudi-riepilogo aria-label="Chiudi">×</button></div>
            <div class="riepilogo-meta"><span><strong>A:</strong> ${esc(userProfile?.email || '')}</span><span><strong>Oggetto:</strong> ${esc(oggetto(d))}</span></div>
            <iframe title="Anteprima dell'email" class="riepilogo-frame"></iframe></div>`;
        modal.querySelector('iframe').srcdoc = html(d);
        modal.classList.remove('force-hide');
        modal.querySelector('[data-chiudi-riepilogo]').focus();
    }

    // Beta: l'invio non è ancora attivo, quindi nessuna impostazione
    const attivo = () => false;

    function installa() {
        const panel = document.querySelector('[data-management-panel="identity"]');
        if (!panel || document.getElementById('riepilogo-impostazione')) return;
        const box = document.createElement('div');
        box.id = 'riepilogo-impostazione';
        box.className = 'riepilogo-impostazione is-solo-anteprima';
        box.innerHTML = `<span class="riepilogo-testo"><strong>Riepilogo settimanale via email</strong><small>Ogni lunedì le ore della settimana e le commesse da guardare. Per ora puoi vederne l'anteprima: l'invio non è ancora attivo.</small></span>
            <button type="button" id="btn-anteprima-riepilogo" class="next-sprint-preview riepilogo-bottone">Vedi l'anteprima</button>`;
        panel.append(box);
        box.querySelector('#btn-anteprima-riepilogo').addEventListener('click', apriAnteprima);
    }
    const attesa = setInterval(() => { if (document.querySelector('[data-management-panel="identity"]')) { clearInterval(attesa); installa(); } }, 200);
    window.archTimeRiepilogo = { attivo, apriAnteprima, html: () => html(dati()), oggetto: () => oggetto(dati()) };
})();
