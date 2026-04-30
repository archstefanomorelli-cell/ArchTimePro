// Arch Time Pro - 06-reports.js
// ================= REPORT PDF E UTILS =================

        async function getBase64FromUrl(url) { 
            return new Promise((resolve, reject) => { 
                const img = new Image(); 
                img.crossOrigin = 'Anonymous'; 
                img.onload = () => { 
                    const canvas = document.createElement('canvas'); 
                    canvas.width = img.naturalWidth; 
                    canvas.height = img.naturalHeight; 
                    const ctx = canvas.getContext('2d'); 
                    ctx.drawImage(img, 0, 0); 
                    resolve({ url: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight }); 
                }; 
                img.onerror = reject; 
                img.src = url; 
            }); 
        }

        function formatDateInputValue(date) {
            return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        }

        function getCurrentMonthRange() {
            const today = new Date();
            return {
                today,
                firstDay: new Date(today.getFullYear(), today.getMonth(), 1)
            };
        }

        function pdfMoney(value) {
            return formatMoney(value);
        }

        function getEntryPdfTaskLabel(entry) {
            let displayNotes = entry.notes || '';
            const match = displayNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
            if(match) displayNotes = displayNotes.replace(match[0], '') + `\n(dalle ${match[1]} alle ${match[2]})`;
            return displayNotes ? `${entry.task}\n(${displayNotes})` : entry.task;
        }

        function entryPdfRow(entry, includeUser = true) {
            const row = [
                new Date(entry.created_at).toLocaleDateString(),
                getEntryPdfTaskLabel(entry),
                formatTime(Number(entry.duration)),
                pdfMoney(entry.rate)
            ];

            return includeUser ? [row[0], entry.user_name, row[1], row[2], row[3]] : row;
        }

        function renderReportModalContent(startValue, endValue) {
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Dal</label><input type="date" id="report-start" value="${escapeAttr(startValue)}" class="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"></div>
                    <div><label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Al</label><input type="date" id="report-end" value="${escapeAttr(endValue)}" class="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"></div>
                </div>
                <button data-ui-action="generate-pdf-report" class="w-full bg-slate-900 text-white py-3.5 mt-6 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Genera PDF</button>
            `;
        }

        function populateTeamReportUsers() {
            const userSelect = document.getElementById('team-report-user');
            const activeProfiles = profiles.filter(p => p.role !== 'inactive');
            userSelect.innerHTML = optionHtml('all', 'Tutto il Team') + activeProfiles.map(pr => optionHtml(pr.full_name, pr.full_name)).join('');
        }

        async function exportProjectPDF(id) {
            if (activePlan === 'starter') return openUpgradeModal('Esportazione Report PDF');
            const p = projects.find(x => x.id === id); if(!p) return;
            const pEntries = entries.filter(e => e.project_id === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); 
            const pExpenses = expenses.filter(ex => ex.project_id === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            
            let logoData = null, startY = 20;
            if(studioData?.logo_url) { try { logoData = await getBase64FromUrl(studioData.logo_url); } catch(err) {} }
            if(logoData) { const imgH = 12; const imgW = (logoData.width/logoData.height)*imgH; doc.addImage(logoData.url, 'PNG', 14, 10, imgW, imgH); startY = 30; }
            
            doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text(p.name, 14, startY); doc.setFontSize(12); doc.setTextColor(100, 116, 139); doc.text(`Cliente: ${p.client || 'Interno'}`, 14, startY + 8);
            const totalHours = pEntries.reduce((s,e) => s + Number(e.duration), 0); const totalHrsCost = pEntries.reduce((s,e) => s + Number(e.rate), 0); const totalExp = pExpenses.reduce((s,ex) => s + Number(ex.amount), 0);
            doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.text(`Totale: €${(totalHrsCost+totalExp).toFixed(2)} | Ore: €${totalHrsCost.toFixed(2)} (${formatTime(totalHours)}) | Spese: €${totalExp.toFixed(2)}`, 14, startY + 18);
            
            const pdfColor = THEMES[currentBusinessType].pdfColor;
            doc.setFontSize(12); doc.setTextColor(...pdfColor); doc.text("Registro Ore", 14, startY + 28);
            
            doc.autoTable({ 
                startY: startY + 32, 
                head: [['Data', 'Team', 'Attività', 'Ore', 'Costo']], 
                body: pEntries.map(e => {
                    let dispNotes = e.notes || '';
                    const match = dispNotes.match(/^\[(\d{2}:\d{2}) - (\d{2}:\d{2})\]\s*/);
                    if(match) dispNotes = dispNotes.replace(match[0], '') + `\n(dalle ${match[1]} alle ${match[2]})`;
                    return [new Date(e.created_at).toLocaleDateString(), e.user_name, dispNotes ? `${e.task}\n(${dispNotes})` : e.task, formatTime(Number(e.duration)), pdfMoney(e.rate)];
                }), 
                theme: 'striped', headStyles: { fillColor: pdfColor }, styles: { fontSize: 9 } 
            });

            if(pExpenses.length > 0) {
                const finalY = doc.lastAutoTable.finalY || startY + 50; doc.setFontSize(12); doc.setTextColor(217, 119, 6); doc.text("Spese Extra", 14, finalY + 15);
                doc.autoTable({ startY: finalY + 19, head: [['Data', 'Da', 'Descrizione', 'Importo']], body: pExpenses.map(ex => [new Date(ex.created_at).toLocaleDateString(), ex.user_name, ex.description, pdfMoney(ex.amount)]), theme: 'striped', headStyles: { fillColor: [245, 158, 11] }, styles: { fontSize: 9 } });
            }
            doc.save(`Lavoro_${safeFileName(p.name, 'lavoro')}.pdf`);
        }

        function openReportModal() { 
            if(activePlan === 'starter') return openUpgradeModal('Generazione Report PDF Cumulativi');
            const { today, firstDay } = getCurrentMonthRange();
            const content = document.getElementById('report-modal-content');
            content.innerHTML = renderReportModalContent(formatDateInputValue(firstDay), formatDateInputValue(today));
            document.getElementById('modal-report').classList.remove('force-hide'); lucide.createIcons();
        }
        
        function closeReportModal() { document.getElementById('modal-report').classList.add('force-hide'); }

        async function generatePDFReport() {
            if (activePlan === 'starter') return;
            const s = document.getElementById('report-start').value, e = document.getElementById('report-end').value;
            if(!s || !e) return await appAlert("Attenzione", "Seleziona le date per il report.", "danger"); 
            const start = new Date(s); start.setHours(0,0,0,0); const end = new Date(e); end.setHours(23,59,59,999);
            if(start > end) return await appAlert("Attenzione", "La data di inizio deve essere precedente a quella di fine.", "danger");
            
            const filE = entries.filter(ent => { const d = new Date(ent.created_at); return d >= start && d <= end; });
            if (filE.length === 0) return await appAlert("Informazione", "Nessuna attività registrata nel periodo selezionato.", "info");

            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            const pdfColor = THEMES[currentBusinessType].pdfColor;
            let logoData = null, startY = 30; if(studioData?.logo_url) { try { logoData = await getBase64FromUrl(studioData.logo_url); } catch(err) {} }
            if(logoData) { const imgH = 12; const imgW = (logoData.width/logoData.height)*imgH; doc.addImage(logoData.url, 'PNG', 14, 15, imgW, imgH); startY = 40; }

            doc.setFontSize(26); doc.setTextColor(15, 23, 42); doc.text(studioData?.name||"Azienda", 14, startY);
            doc.setFontSize(16); doc.setTextColor(15, 23, 42); doc.text(`Rapporto Attività`, 14, startY + 15);
            doc.setFontSize(12); doc.setTextColor(100, 116, 139); doc.text(`Dal ${start.toLocaleDateString()} al ${end.toLocaleDateString()}`, 14, startY + 23);
            
            const totalH = filE.reduce((sum, ent) => sum + Number(ent.duration), 0); const totalC = filE.reduce((sum, ent) => sum + Number(ent.rate), 0);
            doc.setDrawColor(226, 232, 240); doc.line(14, startY+30, 196, startY+30);
            doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(`Riepilogo Globale:`, 14, startY + 45);
            doc.setFontSize(10); doc.text(`Ore Totali: ${formatTime(totalH)}`, 14, startY + 53); doc.text(`Valore Economico: ${pdfMoney(totalC)}`, 14, startY + 60);

            const projLabel = currentBusinessType === 'impresa' ? 'Cantiere' : 'Progetto';

            [...new Set(filE.map(ent => ent.project_id))].forEach((pid) => {
                const p = projects.find(x => x.id === pid); const pE = filE.filter(ent => ent.project_id === pid).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                doc.addPage(); let pY = 20; if(logoData) { doc.addImage(logoData.url, 'PNG', 14, 10, (logoData.width/logoData.height)*8, 8); pY = 28; }
                doc.setFontSize(18); doc.setTextColor(...pdfColor); doc.text(p?p.name:"Eliminato", 14, pY);
                doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Cliente: ${p?p.client:'-'} | Periodo: ${s} / ${e}`, 14, pY+7);
                doc.text(`Ore Periodo: ${formatTime(pE.reduce((sum,ent)=>sum+Number(ent.duration),0))} | Valore: ${pdfMoney(pE.reduce((sum,ent)=>sum+Number(ent.rate),0))}`, 14, pY+13);
                doc.autoTable({ 
                    startY: pY+20, 
                    head: [['Data', 'Team', 'Attività', 'Ore', 'Costo']], 
                    body: pE.map(ent => entryPdfRow(ent, true)), 
                    theme: 'striped', headStyles: { fillColor: pdfColor }, styles: { fontSize: 9 } 
                });
            });
            doc.save(`Report_${safeFileName(studioData?.name || 'azienda', 'azienda')}_${start.toISOString().split('T')[0]}.pdf`); closeReportModal();
        }

        function openTeamReportModal() { 
            if(activePlan === 'starter') return openUpgradeModal('Report Team PDF');
            const { today, firstDay } = getCurrentMonthRange();
            document.getElementById('team-report-start').value = formatDateInputValue(firstDay);
            document.getElementById('team-report-end').value = formatDateInputValue(today);
            populateTeamReportUsers();
            
            document.getElementById('modal-team-report').classList.remove('force-hide'); lucide.createIcons();
        }

        function closeTeamReportModal() { document.getElementById('modal-team-report').classList.add('force-hide'); }

        async function generateTeamPDFReport() {
            if (activePlan === 'starter') return;
            const s = document.getElementById('team-report-start').value, e = document.getElementById('team-report-end').value;
            const selectedUser = document.getElementById('team-report-user').value;
            
            if(!s || !e) return await appAlert("Attenzione", "Seleziona le date per il report.", "danger"); 
            const start = new Date(s); start.setHours(0,0,0,0); const end = new Date(e); end.setHours(23,59,59,999);
            if(start > end) return await appAlert("Attenzione", "La data di inizio deve essere precedente a quella di fine.", "danger");
            
            let filE = entries.filter(ent => { const d = new Date(ent.created_at); return d >= start && d <= end; });
            if (selectedUser !== 'all') { filE = filE.filter(ent => ent.user_name === selectedUser); }
            if (filE.length === 0) return await appAlert("Informazione", "Nessuna attività registrata per il periodo e il collaboratore selezionati.", "info");

            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            const pdfColor = THEMES[currentBusinessType].pdfColor;
            let logoData = null; if(studioData?.logo_url) { try { logoData = await getBase64FromUrl(studioData.logo_url); } catch(err) {} }

            const usersInReport = [...new Set(filE.map(ent => ent.user_name))].sort();

            usersInReport.forEach((uname, index) => {
                const uEntries = filE.filter(ent => ent.user_name === uname).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                const uTotalH = uEntries.reduce((sum, ent) => sum + Number(ent.duration), 0);
                const uTotalC = uEntries.reduce((sum, ent) => sum + Number(ent.rate), 0);

                if(index > 0) doc.addPage(); 
                
                let currentY = 20; 
                if(logoData) { doc.addImage(logoData.url, 'PNG', 14, 10, (logoData.width/logoData.height)*8, 8); currentY = 28; } 

                doc.setFontSize(18); doc.setTextColor(...pdfColor); doc.text(`Collaboratore: ${uname}`, 14, currentY);
                doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Totale Periodo: ${formatTime(uTotalH)} | Costo Totale: ${pdfMoney(uTotalC)}`, 14, currentY+7);

                currentY += 15;
                const projLabel = currentBusinessType === 'impresa' ? 'Cantiere' : 'Progetto';
                const projectsForUser = [...new Set(uEntries.map(ent => ent.project_name))].sort();

                projectsForUser.forEach(projName => {
                    const pEntries = uEntries.filter(ent => ent.project_name === projName);
                    const pTotalH = pEntries.reduce((sum, ent) => sum + Number(ent.duration), 0);
                    const pTotalC = pEntries.reduce((sum, ent) => sum + Number(ent.rate), 0);

                    if(currentY > doc.internal.pageSize.height - 30) { doc.addPage(); currentY = 20; }

                    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(`${projLabel}: ${projName}`, 14, currentY);
                    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text(`Subtotale: ${formatTime(pTotalH)} | ${pdfMoney(pTotalC)}`, 14, currentY + 5);

                    doc.autoTable({
                        startY: currentY + 8,
                        head: [['Data', 'Attività', 'Ore', 'Costo']],
                        body: pEntries.map(ent => entryPdfRow(ent, false)),
                        theme: 'striped', headStyles: { fillColor: pdfColor }, styles: { fontSize: 9 }, margin: { bottom: 15 }
                    });
                    currentY = doc.lastAutoTable.finalY + 12; 
                });
            });

            doc.save(`Report_Team_${safeFileName(studioData?.name || 'azienda', 'azienda')}_${start.toISOString().split('T')[0]}.pdf`); closeTeamReportModal();
        }
