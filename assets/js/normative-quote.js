(function () {
    'use strict';

    const HANDOFF_KEY = 'archtime_normative_quote_handoff_v1';
    const SERVICES_URL = 'assets/data/normative-services-dlgs36.json?v=2026-07-27-02';
    const CALCULATION_URL = 'assets/data/normative-calculation-dlgs36.json?v=2026-07-27-01';
    const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
    let phases = [];
    let calculationLibrary = null;
    let selectedCodes = new Set();
    let lastCalculation = null;

    const byId = id => document.getElementById(id);

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function parseNumber(value) {
        const raw = String(value || '').trim().replace(/\s/g, '').replace(/€/g, '');
        if (!raw) return 0;
        if (raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.')) || 0;
        const dotCount = (raw.match(/\./g) || []).length;
        if (dotCount > 1 || (dotCount === 1 && /\.\d{3}$/.test(raw))) return Number(raw.replace(/\./g, '')) || 0;
        return Number(raw) || 0;
    }

    function formatInputNumber(value) {
        return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(Number(value || 0));
    }

    function option(value, label) {
        return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }

    function getCategory() {
        return calculationLibrary?.categories?.find(item => item.id === byId('quote-category').value) || null;
    }

    function getDestination() {
        return getCategory()?.destinations?.find(item => item.id === byId('quote-destination').value) || null;
    }

    function getComplexity() {
        return getDestination()?.levels?.find(item => item.id === byId('quote-complexity').value) || null;
    }

    function supportedServicesForPhase(phase) {
        const qMap = getCategory()?.q || {};
        return phase.services.filter(service => Object.prototype.hasOwnProperty.call(qMap, service.code));
    }

    function populateCategories() {
        byId('quote-category').innerHTML = calculationLibrary.categories.map(category => option(category.id, category.name)).join('');
        populateDestinations();
    }

    function populateDestinations() {
        const destinations = getCategory()?.destinations || [];
        byId('quote-destination').innerHTML = destinations.map(destination => option(destination.id, destination.name)).join('');
        selectedCodes = new Set([...selectedCodes].filter(code => phases.some(phase => supportedServicesForPhase(phase).some(service => service.code === code))));
        populateComplexities();
    }

    function populateComplexities() {
        const destination = getDestination();
        const levels = destination?.levels || [];
        byId('quote-complexity').innerHTML = levels.map(level => option(level.id, `${String(level.label || '').split(' - ')[0]} · G ${Number(level.g).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)).join('');
        byId('quote-destination-description').textContent = destination?.name || '';
        updateComplexityDescription();
        renderServices();
        updateCalculation();
    }

    function updateComplexityDescription() {
        const complexity = getComplexity();
        byId('quote-complexity-description').textContent = complexity?.label || '';
    }

    function selectedCountInPhase(phase) {
        return supportedServicesForPhase(phase).filter(service => selectedCodes.has(service.code)).length;
    }

    function renderServices() {
        const container = byId('quote-services');
        const visiblePhases = phases
            .map(phase => ({ ...phase, services: supportedServicesForPhase(phase) }))
            .filter(phase => phase.services.length > 0);

        container.innerHTML = visiblePhases.map(phase => {
            const count = selectedCountInPhase(phase);
            return `
                <details class="quote-phase overflow-hidden rounded-lg border border-slate-200 bg-white" ${count > 0 ? 'open' : ''}>
                    <summary class="quote-phase-summary flex cursor-pointer items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50">
                        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-600">${escapeHtml(phase.id.toUpperCase())}</span>
                        <span class="min-w-0 flex-1">
                            <span class="block text-sm font-black text-slate-900">${escapeHtml(phase.name)}</span>
                            <span class="mt-0.5 block text-xs font-semibold text-slate-400">${count} di ${phase.services.length} selezionate</span>
                        </span>
                        <button type="button" data-phase-toggle="${escapeHtml(phase.id)}" class="mr-1 shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-500 transition-colors hover:border-indigo-200 hover:text-indigo-600">${count === phase.services.length ? 'Deseleziona' : 'Tutte'}</button>
                        <i data-lucide="chevron-down" class="quote-phase-chevron h-4 w-4 shrink-0 text-slate-400 transition-transform"></i>
                    </summary>
                    <div class="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3">
                        ${phase.services.map(service => `
                            <label class="quote-service-row flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white px-3 py-3 transition-colors hover:border-indigo-200">
                                <input type="checkbox" data-service-code="${escapeHtml(service.code)}" ${selectedCodes.has(service.code) ? 'checked' : ''} class="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600">
                                <span class="min-w-0 flex-1">
                                    <span class="quote-service-code block text-[11px] font-black text-slate-400">${escapeHtml(service.code)}</span>
                                    <span class="mt-1 block text-xs font-semibold leading-relaxed text-slate-700">${escapeHtml(service.label)}</span>
                                </span>
                                <span data-service-amount="${escapeHtml(service.code)}" class="shrink-0 pt-0.5 text-[11px] font-black text-slate-500">—</span>
                            </label>`).join('')}
                    </div>
                </details>`;
        }).join('');

        container.querySelectorAll('[data-service-code]').forEach(input => {
            input.addEventListener('change', event => {
                const code = event.currentTarget.dataset.serviceCode;
                if (event.currentTarget.checked) selectedCodes.add(code);
                else selectedCodes.delete(code);
                renderServices();
                updateCalculation();
            });
        });

        container.querySelectorAll('[data-phase-toggle]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const phase = phases.find(item => item.id === event.currentTarget.dataset.phaseToggle);
                const services = supportedServicesForPhase(phase);
                const allSelected = services.every(service => selectedCodes.has(service.code));
                services.forEach(service => allSelected ? selectedCodes.delete(service.code) : selectedCodes.add(service.code));
                renderServices();
                updateCalculation();
            });
        });
        window.lucide?.createIcons();
    }

    function selectedServicesSnapshot(calculation) {
        const qMap = calculation.category?.q || {};
        return phases.flatMap(phase => supportedServicesForPhase(phase)
            .filter(service => selectedCodes.has(service.code))
            .map(service => ({
                code: service.code,
                label: service.label,
                phaseId: phase.id,
                phaseName: phase.name,
                q: qMap[service.code],
                fee: Number(calculation.serviceAmounts[service.code] || 0)
            })));
    }

    function validationMessage(calculation) {
        if (calculation.workValue <= 0) return 'Inserisci il valore dell’opera per calcolare il compenso.';
        if (!calculation.category || !calculation.complexity) return 'Completa categoria, destinazione e grado di complessità.';
        if (selectedCodes.size === 0) return 'Seleziona almeno una prestazione professionale.';
        if (['Qa.0.01', 'Qa.0.02'].some(code => selectedCodes.has(code)) && calculation.inhabitants <= 0) return 'Inserisci il numero di abitanti richiesto dalle prestazioni urbanistiche selezionate.';
        return '';
    }

    function renderSelectedSummary(calculation) {
        const selected = selectedServicesSnapshot(calculation);
        if (selected.length === 0) {
            byId('quote-selected-summary').innerHTML = '<p class="leading-relaxed text-slate-500">Le prestazioni selezionate compariranno qui.</p>';
            return;
        }
        const grouped = Object.groupBy
            ? Object.groupBy(selected, service => service.phaseName)
            : selected.reduce((groups, service) => {
                (groups[service.phaseName] ||= []).push(service);
                return groups;
            }, {});
        byId('quote-selected-summary').innerHTML = Object.entries(grouped).map(([phaseName, services]) => `
            <div>
                <p class="mb-1.5 font-black text-white">${escapeHtml(phaseName)}</p>
                <div class="space-y-1.5">
                    ${services.map(service => `
                        <div class="flex items-start justify-between gap-3">
                            <span class="min-w-0 leading-relaxed"><strong class="text-indigo-300">${escapeHtml(service.code)}</strong> ${escapeHtml(service.label)}</span>
                            <strong class="shrink-0 text-white">${euro.format(service.fee)}</strong>
                        </div>`).join('')}
                </div>
            </div>`).join('');
    }

    function updateCalculation() {
        if (!calculationLibrary || !window.ArchTimeNormativeEngine) return;
        const workValue = parseNumber(byId('quote-work-value').value);
        const inhabitants = parseNumber(byId('quote-inhabitants').value);
        const category = getCategory();
        const destination = getDestination();
        const complexity = getComplexity();
        const calculation = ArchTimeNormativeEngine.calculateQuote({
            workValue,
            inhabitants,
            category,
            complexity,
            phases,
            selectedCodes
        });
        calculation.destination = destination;
        lastCalculation = calculation;

        const projectName = byId('quote-project-name').value.trim();
        byId('quote-result-project').textContent = projectName || (workValue > 0 ? 'Preventivo parametrico' : 'Inserisci i dati dell’opera');
        byId('quote-compensation').textContent = euro.format(calculation.compensation);
        byId('quote-accessories').textContent = euro.format(calculation.accessoryExpenses);
        byId('quote-accessory-rate').textContent = `${(calculation.accessoryRate * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 })}% del CP`;
        byId('quote-total').textContent = euro.format(calculation.quoteTotal);
        byId('quote-summary-work-value').textContent = euro.format(calculation.workValue);
        byId('quote-summary-category').textContent = calculation.category?.name || '—';
        byId('quote-summary-complexity').textContent = calculation.complexity ? `G ${Number(calculation.complexity.g).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
        byId('quote-summary-p').textContent = calculation.parameterP ? calculation.parameterP.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 6 }) : '—';
        byId('quote-selected-count').textContent = `${selectedCodes.size} selezionate`;
        byId('quote-summary-count').textContent = String(selectedCodes.size);
        renderSelectedSummary(calculation);

        document.querySelectorAll('[data-service-amount]').forEach(element => {
            const amount = calculation.serviceAmounts[element.dataset.serviceAmount];
            element.textContent = workValue > 0 && amount !== undefined ? euro.format(amount) : '—';
        });

        const needsPopulation = ['Qa.0.01', 'Qa.0.02'].some(code => selectedCodes.has(code));
        byId('quote-inhabitants-field').classList.toggle('hidden', !needsPopulation);
        const message = validationMessage(calculation);
        byId('quote-validation').textContent = message;
        byId('quote-validation').classList.toggle('hidden', !message);
        byId('quote-import').disabled = Boolean(message);
        byId('quote-print').disabled = Boolean(message);
    }

    function useExample() {
        byId('quote-project-name').value = 'Riqualificazione edificio residenziale';
        byId('quote-client').value = 'Condominio Via Roma';
        byId('quote-work-value').value = formatInputNumber(350000);
        const residentialDestination = getCategory()?.destinations?.find(destination => /residenza/i.test(destination.name));
        if (residentialDestination) {
            byId('quote-destination').value = residentialDestination.id;
            populateComplexities();
        }
        const preferredCodes = ['QbI.01', 'QbI.02', 'QbII.01', 'QcI.01', 'QcI.02'];
        const supported = new Set(phases.flatMap(phase => supportedServicesForPhase(phase).map(service => service.code)));
        selectedCodes = new Set(preferredCodes.filter(code => supported.has(code)));
        if (selectedCodes.size === 0) {
            phases.filter(phase => ['b1', 'b2', 'c1'].includes(phase.id)).forEach(phase => {
                const first = supportedServicesForPhase(phase)[0];
                if (first) selectedCodes.add(first.code);
            });
        }
        renderServices();
        updateCalculation();
        window.archTimeAnalytics?.track('normative_quote_example_used');
    }

    function saveHandoff() {
        const message = validationMessage(lastCalculation);
        if (message) {
            byId('quote-validation').textContent = message;
            byId('quote-validation').classList.remove('hidden');
            return;
        }
        const payload = {
            version: 1,
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000),
            project: {
                name: byId('quote-project-name').value.trim() || 'Preventivo parametrico',
                client: byId('quote-client').value.trim()
            },
            quote: {
                workValue: lastCalculation.workValue,
                inhabitants: lastCalculation.inhabitants,
                categoryId: lastCalculation.category.id,
                destinationId: lastCalculation.destination.id,
                complexityId: lastCalculation.complexity.id,
                selectedCodes: [...selectedCodes]
            }
        };
        localStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
        window.archTimeAnalytics?.track('normative_quote_handoff', {
            selected_service_count: selectedCodes.size,
            quote_total: Math.round(lastCalculation.quoteTotal)
        });
        window.location.href = 'app.html?source=preventivo-normativo';
    }

    async function initialize() {
        try {
            const [servicesResponse, calculationResponse] = await Promise.all([fetch(SERVICES_URL), fetch(CALCULATION_URL)]);
            if (!servicesResponse.ok || !calculationResponse.ok) throw new Error('Dati non disponibili');
            [phases, calculationLibrary] = await Promise.all([servicesResponse.json(), calculationResponse.json()]);
            populateCategories();
            byId('quote-services-loading').classList.add('hidden');
            byId('quote-services').classList.remove('hidden');
            renderServices();
            updateCalculation();
        } catch (error) {
            byId('quote-services-loading').innerHTML = '<strong class="text-red-700">La libreria normativa non è disponibile.</strong><br><span class="mt-1 inline-block text-xs">Ricarica la pagina tra qualche istante.</span>';
        }

        byId('quote-category').addEventListener('change', populateDestinations);
        byId('quote-destination').addEventListener('change', populateComplexities);
        byId('quote-complexity').addEventListener('change', () => {
            updateComplexityDescription();
            updateCalculation();
        });
        ['quote-project-name', 'quote-client', 'quote-work-value', 'quote-inhabitants'].forEach(id => {
            byId(id).addEventListener('input', updateCalculation);
        });
        byId('quote-work-value').addEventListener('blur', event => {
            const value = parseNumber(event.currentTarget.value);
            if (value > 0) event.currentTarget.value = formatInputNumber(value);
        });
        byId('quote-example').addEventListener('click', useExample);
        byId('quote-import').addEventListener('click', saveHandoff);
        byId('quote-print').addEventListener('click', () => {
            window.archTimeAnalytics?.track('normative_quote_printed');
            window.print();
        });
        window.lucide?.createIcons();
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
