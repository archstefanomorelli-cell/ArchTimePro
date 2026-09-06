// Arch Time Pro - local document design prototype. Loaded only by the flow prototype.
(function () {
    if (new URLSearchParams(window.location.search).get('prototypeFlow') !== '1') return;

    const C = {
        ink: [24, 31, 50],
        muted: [102, 112, 133],
        faint: [244, 246, 250],
        line: [218, 223, 232],
        tableLine: [193, 201, 214],
        indigo: [79, 70, 229],
        indigoSoft: [239, 238, 255],
        blue: [37, 99, 235],
        green: [5, 150, 105],
        amber: [217, 119, 6],
        red: [220, 38, 38],
        white: [255, 255, 255]
    };
    const PAGE = { width: 210, height: 297, left: 18, right: 192, top: 16, bottom: 278 };

    function flow() { return window.archTimeFlowPrototype || {}; }
    function meta(project) {
        return flow().projectMeta?.(project) || { address: '', description: '', payments: [], taskNotes: {}, taskTranches: {} };
    }
    function clientData(project) { return flow().clientForProject?.(project) || null; }
    function money(value) { return formatMoney(Number(value || 0)); }
    function dateLabel(value) {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('it-IT');
    }
    function generatedLabel() {
        return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    function safeText(value, fallback = '') { return String(value || fallback).trim(); }
    function saveDocument(doc, filename) {
        if (new URLSearchParams(window.location.search).get('documentPreview') === '1') {
            const previewUrl = doc.output('datauristring');
            document.body.innerHTML = '<main style="font-family:Arial,sans-serif;padding:40px"><h1>Documento generato</h1><p>Anteprima pronta per il controllo tecnico.</p><textarea id="prototype-pdf-data" aria-label="Dati PDF" style="position:fixed;left:-9999px;width:1px;height:1px"></textarea></main>';
            const payload = document.getElementById('prototype-pdf-data');
            payload.value = previewUrl;
            payload.setAttribute('data-pdf', previewUrl);
            return;
        }
        doc.save(filename);
    }
    function setFont(doc, size, style = 'normal', color = C.ink) {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
    }
    function fill(doc, color) { doc.setFillColor(...color); }
    function stroke(doc, color = C.line, width = 0.25) { doc.setDrawColor(...color); doc.setLineWidth(width); }
    function ensureSpace(doc, y, needed, continuationTitle = '') {
        if (y + needed <= PAGE.bottom) return y;
        doc.addPage();
        if (continuationTitle) {
            setFont(doc, 7.5, 'bold', C.indigo);
            doc.text(continuationTitle.toUpperCase(), PAGE.left, PAGE.top + 5);
            stroke(doc);
            doc.line(PAGE.left, PAGE.top + 9, PAGE.right, PAGE.top + 9);
            return PAGE.top + 18;
        }
        return PAGE.top + 4;
    }
    async function logoData() {
        if (!studioData?.logo_url) return null;
        try { return await getBase64FromUrl(studioData.logo_url); } catch (error) { return null; }
    }
    function drawLogo(doc, logo, x, y, maxWidth = 42, maxHeight = 10) {
        if (!logo) return 0;
        const ratio = logo.width / logo.height;
        let width = maxHeight * ratio;
        let height = maxHeight;
        if (width > maxWidth) { width = maxWidth; height = width / ratio; }
        doc.addImage(logo.url, 'PNG', x, y, width, height);
        return width;
    }
    function issuerLines(settings) {
        return [
            settings.issuer_address,
            [settings.vat_number ? `P. IVA ${settings.vat_number}` : '', settings.tax_code ? `C.F. ${settings.tax_code}` : ''].filter(Boolean).join('  ·  '),
            settings.issuer_email
        ].filter(Boolean);
    }
    function documentHeader(doc, logo, settings, documentType, reference = '') {
        const issuer = settings?.issuer_name || studioData?.name || 'Studio professionale';
        const logoWidth = drawLogo(doc, logo, PAGE.left, PAGE.top, 40, 9);
        const textX = logoWidth ? PAGE.left + logoWidth + 4 : PAGE.left;
        setFont(doc, 9.5, 'bold', C.ink);
        doc.text(issuer, textX, PAGE.top + 4);
        if (!logoWidth) {
            setFont(doc, 7.2, 'normal', C.muted);
            const line = issuerLines(settings || {})[0];
            if (line) doc.text(line, textX, PAGE.top + 9);
        }
        setFont(doc, 7.5, 'bold', C.indigo);
        doc.text(documentType.toUpperCase(), PAGE.right, PAGE.top + 3, { align: 'right' });
        setFont(doc, 7, 'normal', C.muted);
        doc.text(reference || `Emesso il ${generatedLabel()}`, PAGE.right, PAGE.top + 8, { align: 'right' });
        stroke(doc, C.line, 0.3);
        doc.line(PAGE.left, PAGE.top + 14, PAGE.right, PAGE.top + 14);
        return PAGE.top + 25;
    }
    function sectionTitle(doc, title, y, eyebrow = '') {
        y = ensureSpace(doc, y, 15, title);
        if (eyebrow) {
            setFont(doc, 6.8, 'bold', C.indigo);
            doc.text(eyebrow.toUpperCase(), PAGE.left, y);
            y += 5;
        }
        setFont(doc, 11.5, 'bold', C.ink);
        doc.text(title, PAGE.left, y);
        stroke(doc, C.line, 0.25);
        doc.line(PAGE.left, y + 4, PAGE.right, y + 4);
        return y + 11;
    }
    function infoColumn(doc, x, y, width, label, lines) {
        setFont(doc, 6.6, 'bold', C.indigo);
        doc.text(label.toUpperCase(), x, y);
        let cursor = y + 6;
        lines.filter(Boolean).forEach((line, index) => {
            setFont(doc, index === 0 ? 9 : 7.4, index === 0 ? 'bold' : 'normal', index === 0 ? C.ink : C.muted);
            const wrapped = doc.splitTextToSize(String(line), width);
            doc.text(wrapped, x, cursor);
            cursor += wrapped.length * (index === 0 ? 4.3 : 3.6);
        });
        return cursor;
    }
    function projectIntro(doc, y, project, settings) {
        const projectMeta = meta(project);
        const client = clientData(project);
        setFont(doc, 7.4, 'bold', C.muted);
        doc.text('OFFERTA TECNICA & ECONOMICA', PAGE.left, y);
        y += 10;
        const introTop = y;
        setFont(doc, 21, 'bold', C.ink);
        const title = doc.splitTextToSize(project.name || 'Progetto', 108);
        doc.text(title, PAGE.left, introTop);
        const titleBottom = introTop + Math.max(title.length * 7.4, 8);

        const clientFiscal = [client?.taxCode ? `C.F. ${client.taxCode}` : '', client?.vatNumber ? `P. IVA ${client.vatNumber}` : ''].filter(Boolean).join('  |  ');
        let clientY = introTop;
        setFont(doc, 9, 'bold', C.ink);
        doc.text(project.client || 'Committente da definire', PAGE.right, clientY, { align: 'right' });
        clientY += 4.5;
        setFont(doc, 7.3, 'normal', C.muted);
        [client?.address || 'Indirizzo cliente da completare', clientFiscal, client?.email || ''].filter(Boolean).forEach(line => {
            const wrapped = doc.splitTextToSize(String(line), 66);
            doc.text(wrapped, PAGE.right, clientY, { align: 'right' });
            clientY += wrapped.length * 3.8;
        });
        y = Math.max(titleBottom, clientY) + 1;
        stroke(doc, C.ink, 0.9);
        doc.line(PAGE.left, y + 2, PAGE.right, y + 2);
        y += 12;

        setFont(doc, 6.7, 'bold', C.indigo);
        doc.text('OGGETTO DELL’INCARICO', PAGE.left, y);
        const description = projectMeta.description || 'Prestazioni professionali come dettagliate nel presente documento.';
        setFont(doc, 8.2, 'normal', C.muted);
        const descriptionLines = doc.splitTextToSize(description, 170);
        doc.text(descriptionLines, PAGE.left, y + 6);
        return y + descriptionLines.length * 4 + 12;
    }
    function editorialTable(doc, startY, head, body, options = {}) {
        doc.autoTable({
            startY,
            head: [head],
            body,
            theme: 'plain',
            margin: { left: PAGE.left, right: 18, top: 24, bottom: 22 },
            styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 2.35, right: 2.4, bottom: 2.35, left: 2.4 }, textColor: C.ink, overflow: 'linebreak', valign: 'top', lineColor: C.line, lineWidth: 0 },
            headStyles: { fillColor: C.white, textColor: C.muted, fontStyle: 'bold', fontSize: 6.7, lineColor: C.ink, lineWidth: 0 },
            alternateRowStyles: { fillColor: C.white },
            columnStyles: options.columnStyles || {},
            didParseCell: options.didParseCell,
            didDrawCell(data) {
                if (data.column.index === head.length - 1) {
                    stroke(doc, data.section === 'head' ? C.ink : C.tableLine, data.section === 'head' ? 0.5 : 0.25);
                    const lineY = data.cell.y + data.cell.height - 0.2;
                    doc.line(PAGE.left, lineY, PAGE.right, lineY);
                }
                options.didDrawCell?.(data);
            },
            didDrawPage: options.didDrawPage
        });
        return doc.lastAutoTable?.finalY || startY;
    }
    function kpiStrip(doc, y, items) {
        y = ensureSpace(doc, y, 25, 'Riepilogo');
        const width = 174 / items.length;
        stroke(doc, C.line, 0.3);
        doc.line(PAGE.left, y, PAGE.right, y);
        doc.line(PAGE.left, y + 21, PAGE.right, y + 21);
        items.forEach((item, index) => {
            const x = PAGE.left + index * width;
            if (index) doc.line(x, y + 4, x, y + 17);
            setFont(doc, 6.3, 'bold', C.muted);
            doc.text(item.label.toUpperCase(), x + 4, y + 6);
            setFont(doc, 11.2, 'bold', item.color || C.ink);
            doc.text(String(item.value), x + 4, y + 15);
        });
        return y + 29;
    }
    function paymentStatus(row) {
        if (row.status === 'collected') return 'Incassato';
        if (row.status === 'invoiced') return 'Fatturato';
        return 'Da fatturare';
    }
    function paymentPlanTable(doc, y, project, compact = false) {
        const projectMeta = meta(project);
        if (!projectMeta.payments?.length) return y;
        if (compact) {
            y = ensureSpace(doc, y, 12, 'Piano di fatturazione');
            setFont(doc, 6.6, 'bold', C.indigo);
            doc.text('PIANO DI FATTURAZIONE', PAGE.left, y);
            y += 3;
        } else {
            y = sectionTitle(doc, 'Piano di fatturazione e milestone', y, 'Rilascio economico');
        }
        const body = projectMeta.payments.map((row, index) => compact ? [
            String(index), row.label || `Fase ${index}`, `${Number(row.percent || 0).toLocaleString('it-IT')}%`, money(Number(project.budget || 0) * Number(row.percent || 0) / 100)
        ] : [
            String(index), row.label || `Fase ${index}`, `${Number(row.percent || 0).toLocaleString('it-IT')}%`, money(Number(project.budget || 0) * Number(row.percent || 0) / 100), paymentStatus(row)
        ]);
        return editorialTable(doc, y, compact ? ['Fase', 'Milestone', 'Quota', 'Importo'] : ['Fase', 'Milestone', 'Quota', 'Importo', 'Stato'], body, {
            columnStyles: compact
                ? { 0: { cellWidth: 12, textColor: C.indigo, fontStyle: 'bold' }, 1: { cellWidth: 'auto', fontStyle: 'bold' }, 2: { cellWidth: 25, halign: 'right' }, 3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' } }
                : { 0: { cellWidth: 12, textColor: C.indigo, fontStyle: 'bold' }, 1: { cellWidth: 'auto', fontStyle: 'bold' }, 2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 31, halign: 'right', fontStyle: 'bold' }, 4: { cellWidth: 28, halign: 'right', textColor: C.blue } }
        }) + 5;
    }
    function fiscalTable(doc, y, summary, settings, withAcceptance = false) {
        y = sectionTitle(doc, 'Quadro economico', y, 'Onorari e fiscalità');
        if (withAcceptance) {
            setFont(doc, 6.7, 'bold', C.indigo);
            doc.text('ACCETTAZIONE', PAGE.left, y + 3);
            setFont(doc, 7.2, 'normal', C.muted);
            doc.text(doc.splitTextToSize('Il committente accetta contenuti, compensi e piano dei pagamenti indicati.', 70), PAGE.left, y + 9);
            stroke(doc, C.line);
            doc.line(PAGE.left, y + 24, 82, y + 24);
            doc.line(PAGE.left, y + 36, 82, y + 36);
            setFont(doc, 6.2, 'normal', C.muted);
            doc.text('Luogo e data', PAGE.left, y + 28);
            doc.text('Firma del committente', PAGE.left, y + 40);
        }
        const rows = [['Compenso professionale', money(summary.base)]];
        if (settings.pension_enabled) rows.push([`${settings.pension_label || 'Contributo previdenziale'} ${Number(settings.pension_rate || 0)}%`, money(summary.pension)]);
        if (settings.vat_enabled) rows.push([`IVA ${Number(settings.vat_rate || 0)}%`, money(summary.vat)]);
        if (summary.stamp > 0) rows.push(['Imposta di bollo', money(summary.stamp)]);
        if (settings.withholding_enabled) rows.push([`Ritenuta d'acconto ${Number(settings.withholding_rate || 0)}%`, `- ${money(summary.withholding)}`]);
        rows.push(['TOTALE DA CORRISPONDERE', money(summary.amountDue)]);
        doc.autoTable({
            startY: y,
            body: rows,
            theme: 'plain',
            margin: { left: 101, right: PAGE.right - 174, bottom: 22 },
            styles: { font: 'helvetica', fontSize: 7.6, cellPadding: 2, textColor: C.muted, lineColor: C.line, lineWidth: { bottom: 0.15 } },
            columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 43, halign: 'right', fontStyle: 'bold', textColor: C.ink } },
            didParseCell(data) {
                if (data.row.index === rows.length - 1) {
                    data.cell.styles.fillColor = C.indigoSoft;
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = data.column.index === 0 ? C.indigo : C.ink;
                    data.cell.styles.fontSize = 8.4;
                }
            }
        });
        return doc.lastAutoTable?.finalY || y;
    }
    function executiveTotalBlock(doc, y, summary, settings) {
        y = ensureSpace(doc, y, 28, 'Quadro economico');
        stroke(doc, C.ink, 0.55);
        doc.line(PAGE.left, y, PAGE.right, y);
        setFont(doc, 6.7, 'bold', C.indigo);
        doc.text('ACCETTAZIONE', PAGE.left, y + 7);
        stroke(doc, C.line, 0.25);
        doc.line(PAGE.left, y + 20, 82, y + 20);
        setFont(doc, 6.1, 'normal', C.muted);
        doc.text('Luogo, data e firma del committente', PAGE.left, y + 24);

        const right = PAGE.right;
        setFont(doc, 7.2, 'normal', C.muted);
        doc.text(`Imponibile: ${money(summary.base)}`, right, y + 7, { align: 'right' });
        const additions = [];
        if (settings.pension_enabled) additions.push(`${settings.pension_label || 'Contributo'}: ${money(summary.pension)}`);
        if (settings.vat_enabled) additions.push(`IVA: ${money(summary.vat)}`);
        if (summary.stamp > 0) additions.push(`Bollo: ${money(summary.stamp)}`);
        if (additions.length) doc.text(additions.join('  |  '), right, y + 13, { align: 'right' });
        setFont(doc, 8.5, 'bold', C.ink);
        doc.text('TOTALE CONTRATTO', right, y + 20, { align: 'right' });
        setFont(doc, 15, 'bold', C.ink);
        doc.text(money(summary.amountDue), right, y + 28, { align: 'right' });
        return y + 32;
    }
    function addFooters(doc, label) {
        const count = doc.internal.getNumberOfPages();
        for (let page = 1; page <= count; page += 1) {
            doc.setPage(page);
            stroke(doc, C.line, 0.2);
            doc.line(PAGE.left, 281, PAGE.right, 281);
            setFont(doc, 6.5, 'normal', C.muted);
            doc.text(label, PAGE.left, 287);
            doc.text(`Arch Time Pro  ·  ${page} / ${count}`, PAGE.right, 287, { align: 'right' });
        }
    }
    function taskRows(project) {
        const projectMeta = meta(project);
        const budgets = project.task_budgets || {};
        return (project.tasks || []).map((task, index) => {
            const note = safeText(projectMeta.taskNotes?.[task]);
            return [
                String(index + 1).padStart(2, '0'),
                note ? `${task}\n${note}` : task,
                Number(budgets[task] || 0) > 0 ? money(budgets[task]) : '-'
            ];
        });
    }
    function quoteTaskRows(project) {
        const projectMeta = meta(project);
        const budgets = project.task_budgets || {};
        const payments = projectMeta.payments || [];
        const counters = new Map();
        return (project.tasks || []).map(task => {
            const note = safeText(projectMeta.taskNotes?.[task]);
            const trancheId = projectMeta.taskTranches?.[task];
            const paymentIndex = payments.findIndex(payment => String(payment.id) === String(trancheId));
            const phase = payments.length ? (paymentIndex < 0 ? '1' : String(paymentIndex)) : '1';
            const position = (counters.get(phase) || 0) + 1;
            counters.set(phase, position);
            return [`${phase}.${position}`, task, note || '—', Number(budgets[task] || 0) > 0 ? money(budgets[task]) : '-'];
        });
    }
    function normativeRows(project) {
        return (project.normative_data?.selected_services || []).map(service => [
            service.phase_name || '', service.code || '', service.label || '', money(service.fee || 0)
        ]);
    }

    exportProjectQuotePDF = async function (id) {
        if (activePlan === 'starter') return openUpgradeModal('Preventivo PDF');
        const project = projects.find(item => item.id === id);
        if (!project) return;
        const settings = getQuoteSettings();
        if (!settings.configured) {
            await appAlert('Completa il preventivo', 'Prima del primo PDF configura intestazione e fiscalità dello studio.', 'info');
            openQuoteSettingsModal();
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
        const logo = await logoData();
        const isNormative = project.project_setup_type === 'normative';
        const base = isNormative ? Number(project.normative_data?.quote_total || project.budget || 0) : Number(project.budget || 0);
        const summary = calculateQuoteFiscalSummary(base, settings);
        let y = documentHeader(doc, logo, settings, isNormative ? 'Proposta parametrica' : 'Proposta di incarico');
        y = projectIntro(doc, y, project, settings);

        if (isNormative) {
            const normative = project.normative_data || {};
            y = kpiStrip(doc, y, [
                { label: 'Valore opera', value: money(normative.work_value), color: C.ink },
                { label: 'Complessità G', value: Number(normative.complexity || normative.g_value || 0).toLocaleString('it-IT', { maximumFractionDigits: 3 }), color: C.indigo },
                { label: 'Compenso CP', value: money(normative.compensation || project.budget), color: C.ink }
            ]);
            y = sectionTitle(doc, 'Prestazioni professionali', y, 'D.M. 17 giugno 2016');
            const rows = normativeRows(project);
            y = editorialTable(doc, y, ['Fase', 'Codice', 'Prestazione', 'Compenso'], rows.length ? rows : [['-', '-', 'Nessuna prestazione selezionata', '-']], {
                columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold' }, 1: { cellWidth: 18, textColor: C.indigo, fontStyle: 'bold' }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 29, halign: 'right', fontStyle: 'bold' } }
            }) + 5;
        } else {
            y = ensureSpace(doc, y, 15, 'Quadro delle prestazioni');
            setFont(doc, 6.7, 'bold', C.indigo);
            doc.text('QUADRO DELLE PRESTAZIONI', PAGE.left, y);
            y += 5;
            const rows = quoteTaskRows(project);
            y = editorialTable(doc, y, ['Codice', 'Attività', 'Descrizione', 'Importo netto'], rows.length ? rows : [['-', 'Nessuna attività configurata', '-', '-']], {
                columnStyles: { 0: { cellWidth: 22, textColor: C.ink, fontStyle: 'bold' }, 1: { cellWidth: 48, fontStyle: 'bold' }, 2: { cellWidth: 'auto', textColor: C.muted, fontStyle: 'normal' }, 3: { cellWidth: 31, halign: 'right', fontStyle: 'bold' } }
            }) + 11;
        }
        y = paymentPlanTable(doc, y, project, true);
        y = executiveTotalBlock(doc, y, summary, settings);
        const note = safeText(settings.fiscal_note);
        if (note) {
            y = ensureSpace(doc, y + 9, 23, 'Note e condizioni');
            setFont(doc, 6.7, 'bold', C.indigo); doc.text('NOTE E CONDIZIONI', PAGE.left, y);
            setFont(doc, 7.5, 'normal', C.muted); doc.text(doc.splitTextToSize(note, 164), PAGE.left, y + 6);
        }
        addFooters(doc, `${settings.issuer_name || studioData?.name || 'Studio'}  ·  ${project.name || 'Progetto'}`);
        window.archTimeAnalytics?.track('project_quote_pdf_exported', { setup_type: isNormative ? 'normative' : 'studio', task_count: (project.tasks || []).length, prototype_design: true });
        saveDocument(doc, `Preventivo_${safeFileName(project.name, 'progetto')}.pdf`);
    };

    exportProjectPDF = async function (id) {
        if (activePlan === 'starter') return openUpgradeModal('Esportazione consuntivo');
        const project = projects.find(item => item.id === id);
        if (!project) return;
        const projectEntries = entries.filter(entry => entry.project_id === id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const projectExpenses = expenses.filter(expense => expense.project_id === id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const summary = getProjectCostSummary(project);
        const totals = flow().paymentTotals?.(project);
        const settings = getQuoteSettings();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
        const logo = await logoData();
        let y = documentHeader(doc, logo, settings, 'Consuntivo di commessa');
        y = projectIntro(doc, y, project, settings);
        const totalHours = projectEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
        const hourCost = projectEntries.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
        const expenseCost = projectExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        const kpis = [
            { label: 'Budget', value: money(project.budget), color: C.ink },
            { label: 'Costi registrati', value: money(summary.totalCost), color: C.ink },
            { label: 'Margine', value: money(summary.margin), color: summary.margin >= 0 ? C.green : C.red },
            { label: 'Ore', value: formatTime(totalHours), color: C.indigo }
        ];
        if (meta(project).payments?.length) kpis.push({ label: 'Incassato', value: money(totals?.collected), color: C.blue, fill: [239, 246, 255] });
        y = kpiStrip(doc, y, kpis);

        const grouped = (project.tasks || []).map(task => {
            const taskEntries = projectEntries.filter(entry => entry.task === task);
            const hours = taskEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
            const cost = taskEntries.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            const budget = Number(project.task_budgets?.[task] || 0);
            return [task, formatTime(hours), money(cost), budget ? money(budget) : '-', budget ? money(budget - cost) : '-'];
        });
        y = sectionTitle(doc, 'Avanzamento per attività', y, 'Sintesi economica');
        y = editorialTable(doc, y, ['Attività', 'Ore', 'Costo', 'Budget', 'Residuo'], grouped.length ? grouped : [['Nessuna attività', '-', '-', '-', '-']], {
            columnStyles: { 0: { cellWidth: 'auto', fontStyle: 'bold' }, 1: { cellWidth: 22, halign: 'right' }, 2: { cellWidth: 29, halign: 'right' }, 3: { cellWidth: 29, halign: 'right' }, 4: { cellWidth: 29, halign: 'right', fontStyle: 'bold' } }
        }) + 9;
        y = paymentPlanTable(doc, y, project);
        y = ensureSpace(doc, y, 38, 'Registro attività');
        y = sectionTitle(doc, 'Registro delle attività', y, 'Dettaglio ore');
        y = editorialTable(doc, y, ['Data', 'Team', 'Attività', 'Ore', 'Costo'], projectEntries.length ? projectEntries.map(entry => entryPdfRow(entry, true)) : [['-', '-', 'Nessuna ora registrata', '-', '-']], {
            columnStyles: { 0: { cellWidth: 23 }, 1: { cellWidth: 30 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 27, halign: 'right', fontStyle: 'bold' } }
        }) + 9;
        if (projectExpenses.length) {
            y = sectionTitle(doc, 'Spese extra', y, 'Costi diretti');
            editorialTable(doc, y, ['Data', 'Inserita da', 'Descrizione', 'Importo'], projectExpenses.map(expense => [dateLabel(expense.created_at), expense.user_name || '-', expense.description || '-', money(expense.amount)]), {
                columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 34 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: C.amber } }
            });
        }
        addFooters(doc, `${settings.issuer_name || studioData?.name || 'Studio'}  ·  Consuntivo ${project.name || ''}`);
        saveDocument(doc, `Consuntivo_${safeFileName(project.name, 'progetto')}.pdf`);
    };

    function periodSelection(prefix) {
        const startValue = document.getElementById(`${prefix}report-start`)?.value;
        const endValue = document.getElementById(`${prefix}report-end`)?.value;
        if (!startValue || !endValue) return null;
        const start = new Date(startValue); start.setHours(0, 0, 0, 0);
        const end = new Date(endValue); end.setHours(23, 59, 59, 999);
        return { startValue, endValue, start, end };
    }
    async function reportShell(type, reference) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
        return { doc, logo: await logoData(), settings: getQuoteSettings(), type, reference };
    }

    generatePDFReport = async function () {
        if (activePlan === 'starter') return;
        const period = periodSelection('');
        if (!period) return await appAlert('Attenzione', 'Seleziona le date per il report.', 'danger');
        if (period.start > period.end) return await appAlert('Attenzione', 'La data di inizio deve essere precedente a quella di fine.', 'danger');
        const filtered = entries.filter(entry => { const date = new Date(entry.created_at); return date >= period.start && date <= period.end; });
        if (!filtered.length) return await appAlert('Informazione', 'Nessuna attività registrata nel periodo selezionato.', 'info');
        const { doc, logo, settings } = await reportShell('Report studio');
        let y = documentHeader(doc, logo, settings, 'Report studio', `${dateLabel(period.start)} — ${dateLabel(period.end)}`);
        setFont(doc, 7, 'bold', C.indigo); doc.text('PANORAMICA OPERATIVA', PAGE.left, y);
        setFont(doc, 24, 'bold', C.ink); doc.text(studioData?.name || 'Studio', PAGE.left, y + 12);
        setFont(doc, 9.2, 'normal', C.muted); doc.text(`Attività e andamento economico dal ${dateLabel(period.start)} al ${dateLabel(period.end)}`, PAGE.left, y + 21);
        y += 34;
        const totalHours = filtered.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
        const totalCost = filtered.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
        const projectIds = [...new Set(filtered.map(entry => entry.project_id))];
        const activeProjects = projectIds.map(id => projects.find(project => project.id === id)).filter(Boolean);
        const collected = activeProjects.reduce((sum, project) => sum + Number(flow().paymentTotals?.(project)?.collected || 0), 0);
        y = kpiStrip(doc, y, [
            { label: 'Ore registrate', value: formatTime(totalHours), color: C.indigo },
            { label: 'Costo del lavoro', value: money(totalCost), color: C.ink },
            { label: 'Commesse lavorate', value: String(activeProjects.length), color: C.ink },
            { label: 'Incassato', value: money(collected), color: C.blue, fill: [239, 246, 255] }
        ]);
        y = sectionTitle(doc, 'Portafoglio commesse', y, 'Confronto nel periodo');
        const rows = activeProjects.map(project => {
            const projectEntries = filtered.filter(entry => entry.project_id === project.id);
            const hours = projectEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
            const cost = projectEntries.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            const collectedAmount = Number(flow().paymentTotals?.(project)?.collected || 0);
            return [project.name || '-', project.client || '-', formatTime(hours), money(cost), money(collectedAmount)];
        });
        editorialTable(doc, y, ['Commessa', 'Cliente', 'Ore', 'Costo', 'Incassato'], rows, {
            columnStyles: { 0: { cellWidth: 'auto', fontStyle: 'bold' }, 1: { cellWidth: 37 }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 29, halign: 'right' }, 4: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: C.blue } }
        });
        activeProjects.forEach(project => {
            const projectEntries = filtered.filter(entry => entry.project_id === project.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            doc.addPage();
            let py = documentHeader(doc, logo, settings, 'Dettaglio commessa', project.name || 'Progetto');
            setFont(doc, 19, 'bold', C.ink); doc.text(doc.splitTextToSize(project.name || 'Progetto', 145), PAGE.left, py);
            setFont(doc, 8.5, 'normal', C.muted); doc.text(`${project.client || 'Cliente non definito'}  ·  ${meta(project).address || 'Indirizzo non definito'}`, PAGE.left, py + 9);
            py += 20;
            const hours = projectEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
            const cost = projectEntries.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            py = kpiStrip(doc, py, [{ label: 'Ore periodo', value: formatTime(hours), color: C.indigo }, { label: 'Costo periodo', value: money(cost), color: C.ink }, { label: 'Incassato totale', value: money(flow().paymentTotals?.(project)?.collected || 0), color: C.blue, fill: [239, 246, 255] }]);
            py = sectionTitle(doc, 'Registro delle attività', py, 'Dettaglio commessa');
            editorialTable(doc, py, ['Data', 'Team', 'Attività', 'Ore', 'Costo'], projectEntries.map(entry => entryPdfRow(entry, true)), {
                columnStyles: { 0: { cellWidth: 23 }, 1: { cellWidth: 31 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' } }
            });
        });
        addFooters(doc, `${settings.issuer_name || studioData?.name || 'Studio'}  ·  Report studio`);
        saveDocument(doc, `Report_${safeFileName(studioData?.name || 'studio', 'studio')}_${period.startValue}.pdf`);
        closeReportModal();
    };

    generateTeamPDFReport = async function () {
        if (activePlan === 'starter') return;
        const period = periodSelection('team-');
        const selectedUser = document.getElementById('team-report-user')?.value || 'all';
        if (!period) return await appAlert('Attenzione', 'Seleziona le date per il report.', 'danger');
        if (period.start > period.end) return await appAlert('Attenzione', 'La data di inizio deve essere precedente a quella di fine.', 'danger');
        let filtered = entries.filter(entry => { const date = new Date(entry.created_at); return date >= period.start && date <= period.end; });
        if (selectedUser !== 'all') filtered = filtered.filter(entry => entry.user_name === selectedUser);
        if (!filtered.length) return await appAlert('Informazione', 'Nessuna attività registrata per il periodo e il collaboratore selezionati.', 'info');
        const { doc, logo, settings } = await reportShell('Report team');
        const users = [...new Set(filtered.map(entry => entry.user_name))].sort();
        users.forEach((userName, index) => {
            if (index) doc.addPage();
            const userEntries = filtered.filter(entry => entry.user_name === userName).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            let y = documentHeader(doc, logo, settings, 'Report team', `${dateLabel(period.start)} — ${dateLabel(period.end)}`);
            setFont(doc, 7, 'bold', C.indigo); doc.text('COLLABORATORE', PAGE.left, y);
            setFont(doc, 22, 'bold', C.ink); doc.text(userName || 'Utente', PAGE.left, y + 12);
            y += 25;
            const hours = userEntries.reduce((sum, entry) => sum + Number(entry.duration || 0), 0);
            const cost = userEntries.reduce((sum, entry) => sum + Number(entry.rate || 0), 0);
            const projectNames = [...new Set(userEntries.map(entry => entry.project_name))];
            y = kpiStrip(doc, y, [{ label: 'Ore registrate', value: formatTime(hours), color: C.indigo }, { label: 'Costo interno', value: money(cost), color: C.ink }, { label: 'Commesse', value: String(projectNames.length), color: C.ink }]);
            y = sectionTitle(doc, 'Distribuzione per commessa', y, 'Sintesi del periodo');
            const summaryRows = projectNames.map(name => {
                const rows = userEntries.filter(entry => entry.project_name === name);
                return [name || '-', formatTime(rows.reduce((sum, entry) => sum + Number(entry.duration || 0), 0)), money(rows.reduce((sum, entry) => sum + Number(entry.rate || 0), 0))];
            });
            y = editorialTable(doc, y, ['Commessa', 'Ore', 'Costo'], summaryRows, { columnStyles: { 0: { cellWidth: 'auto', fontStyle: 'bold' }, 1: { cellWidth: 30, halign: 'right' }, 2: { cellWidth: 36, halign: 'right', fontStyle: 'bold' } } }) + 10;
            y = sectionTitle(doc, 'Registro attività', y, 'Dettaglio personale');
            editorialTable(doc, y, ['Data', 'Commessa', 'Attività', 'Ore', 'Costo'], userEntries.map(entry => [dateLabel(entry.created_at), entry.project_name || '-', getEntryPdfTaskLabel(entry), getEntryPdfHoursCell(entry), money(entry.rate)]), {
                columnStyles: { 0: { cellWidth: 23 }, 1: { cellWidth: 34 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' } }
            });
        });
        addFooters(doc, `${settings.issuer_name || studioData?.name || 'Studio'}  ·  Report team`);
        saveDocument(doc, `Report_Team_${safeFileName(studioData?.name || 'studio', 'studio')}_${period.startValue}.pdf`);
        closeTeamReportModal();
    };

    function rebindPrototypeDocumentButton(id, handler) {
        const current = document.getElementById(id);
        if (!current) return;
        const replacement = current.cloneNode(true);
        current.replaceWith(replacement);
        replacement.addEventListener('click', handler);
    }
    rebindPrototypeDocumentButton('btn-generate-team-report', () => generateTeamPDFReport());
})();
