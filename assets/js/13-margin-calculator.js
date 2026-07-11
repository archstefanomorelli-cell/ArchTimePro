(function () {
    'use strict';

    const form = document.getElementById('margin-calculator-form');
    if (!form) return;

    const fields = {
        fee: document.getElementById('project-fee'),
        ownerHours: document.getElementById('owner-hours'),
        teamHours: document.getElementById('team-hours'),
        hourlyCost: document.getElementById('hourly-cost'),
        expenses: document.getElementById('project-expenses')
    };
    const errorBox = document.getElementById('calculator-error');
    const emptyResult = document.getElementById('result-empty');
    const resultContent = document.getElementById('result-content');
    let startTracked = false;

    const euroFormatter = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    });
    const numberFormatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

    function track(eventName, parameters) {
        window.archTimeAnalytics?.track(eventName, parameters || {});
    }

    function parseNumber(value) {
        const normalized = String(value || '')
            .trim()
            .replace(/\s/g, '')
            .replace(/€/g, '');
        if (!normalized) return NaN;

        const lastComma = normalized.lastIndexOf(',');
        const lastDot = normalized.lastIndexOf('.');
        let cleaned = normalized;

        if (lastComma > lastDot) cleaned = normalized.replace(/\./g, '').replace(',', '.');
        else if (lastDot > lastComma && lastComma >= 0) cleaned = normalized.replace(/,/g, '');
        else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(normalized)) cleaned = normalized.replace(/\./g, '');
        else if (lastComma >= 0) cleaned = normalized.replace(',', '.');

        return Number(cleaned);
    }

    function getValues() {
        return {
            fee: parseNumber(fields.fee.value),
            ownerHours: parseNumber(fields.ownerHours.value),
            teamHours: parseNumber(fields.teamHours.value),
            hourlyCost: parseNumber(fields.hourlyCost.value),
            expenses: parseNumber(fields.expenses.value)
        };
    }

    function validate(values) {
        if (!Number.isFinite(values.fee) || values.fee <= 0) return 'Inserisci un compenso maggiore di zero.';
        if (!Number.isFinite(values.ownerHours) || values.ownerHours < 0) return 'Inserisci ore del titolare valide, anche zero.';
        if (!Number.isFinite(values.teamHours) || values.teamHours < 0) return 'Inserisci ore dei collaboratori valide, anche zero.';
        if (values.ownerHours + values.teamHours <= 0) return 'Inserisci almeno un’ora di lavoro.';
        if (!Number.isFinite(values.hourlyCost) || values.hourlyCost <= 0) return 'Inserisci un costo orario medio maggiore di zero.';
        if (!Number.isFinite(values.expenses) || values.expenses < 0) return 'Inserisci spese valide, anche zero.';
        return '';
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function resultState(margin, marginPercent) {
        if (margin < 0) {
            return {
                label: 'Sotto pareggio',
                classes: 'border-red-400/40 bg-red-400/10 text-red-300',
                bar: 'bg-red-500'
            };
        }
        if (marginPercent < 15) {
            return {
                label: 'Margine sottile',
                classes: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
                bar: 'bg-amber-400'
            };
        }
        return {
            label: 'Margine positivo',
            classes: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
            bar: 'bg-emerald-500'
        };
    }

    function renderResult(values) {
        const totalHours = values.ownerHours + values.teamHours;
        const laborCost = totalHours * values.hourlyCost;
        const totalCost = laborCost + values.expenses;
        const margin = values.fee - totalCost;
        const marginPercent = (margin / values.fee) * 100;
        const costRatio = (totalCost / values.fee) * 100;
        const breakEvenHours = Math.max(0, (values.fee - values.expenses) / values.hourlyCost);
        const hoursBuffer = breakEvenHours - totalHours;
        const state = resultState(margin, marginPercent);

        setText('result-margin', euroFormatter.format(margin));
        setText('result-margin-percent', `${numberFormatter.format(marginPercent)}% del compenso`);
        setText('result-cost-ratio', `${numberFormatter.format(costRatio)}%`);
        setText('result-labor-cost', euroFormatter.format(laborCost));
        setText('result-total-cost', euroFormatter.format(totalCost));
        setText('result-total-hours', numberFormatter.format(totalHours));
        setText('result-break-even', numberFormatter.format(breakEvenHours));

        const status = document.getElementById('result-status');
        status.textContent = state.label;
        status.className = `rounded-lg border px-3 py-2 text-xs font-black uppercase ${state.classes}`;

        const costBar = document.getElementById('result-cost-bar');
        costBar.className = `h-full rounded-full transition-all duration-500 ${state.bar}`;
        costBar.style.width = `${Math.min(Math.max(costRatio, 0), 100)}%`;

        const insight = document.getElementById('result-insight');
        if (hoursBuffer < 0) {
            insight.innerHTML = `<strong class="text-white">Il punto di pareggio è stato superato di ${numberFormatter.format(Math.abs(hoursBuffer))} ore.</strong> Ogni 10 ore aggiuntive riducono il risultato di circa ${euroFormatter.format(values.hourlyCost * 10)}.`;
        } else {
            insight.innerHTML = `<strong class="text-white">Restano circa ${numberFormatter.format(hoursBuffer)} ore prima del pareggio.</strong> Ogni 10 ore non conteggiate riducono il margine di circa ${euroFormatter.format(values.hourlyCost * 10)}.`;
        }

        emptyResult.classList.add('hidden');
        resultContent.classList.remove('hidden');
        resultContent.classList.remove('result-enter');
        void resultContent.offsetWidth;
        resultContent.classList.add('result-enter');

        track('margin_calculator_completed', {
            margin_band: margin < 0 ? 'negative' : (marginPercent < 15 ? 'thin' : 'positive'),
            cost_ratio_band: costRatio >= 100 ? '100_plus' : (costRatio >= 85 ? '85_99' : 'under_85')
        });
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function hideError() {
        errorBox.textContent = '';
        errorBox.classList.add('hidden');
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        hideError();
        const values = getValues();
        const error = validate(values);
        if (error) {
            showError(error);
            track('margin_calculator_error', { reason: error.slice(0, 80) });
            return;
        }
        renderResult(values);
    });

    Object.values(fields).forEach(function (field) {
        field.addEventListener('input', function () {
            hideError();
            if (!startTracked && field.value.trim()) {
                startTracked = true;
                track('margin_calculator_started');
            }
        });
    });

    document.getElementById('btn-example').addEventListener('click', function () {
        fields.fee.value = '25.000';
        fields.ownerHours.value = '180';
        fields.teamHours.value = '220';
        fields.hourlyCost.value = '35';
        fields.expenses.value = '1.800';
        hideError();
        if (!startTracked) {
            startTracked = true;
            track('margin_calculator_started', { source: 'example' });
        }
        form.requestSubmit();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
        form.reset();
        hideError();
        resultContent.classList.add('hidden');
        emptyResult.classList.remove('hidden');
        fields.fee.focus();
    });

    document.getElementById('calculator-cta').addEventListener('click', function () {
        track('margin_calculator_cta_clicked', { destination: '/app.html' });
    });
})();
