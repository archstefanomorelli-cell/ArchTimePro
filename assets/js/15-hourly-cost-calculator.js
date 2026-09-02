(function () {
    'use strict';

    const form = document.getElementById('hourly-cost-form');
    if (!form) return;

    const fields = {
        overhead: document.getElementById('annual-overhead'),
        ownerCompensation: document.getElementById('owner-compensation'),
        teamCost: document.getElementById('team-annual-cost'),
        people: document.getElementById('productive-people'),
        days: document.getElementById('workable-days'),
        hoursPerDay: document.getElementById('hours-per-day'),
        nonBillable: document.getElementById('non-billable-share'),
        margin: document.getElementById('desired-margin')
    };
    const errorBox = document.getElementById('hourly-error');
    const emptyResult = document.getElementById('hourly-result-empty');
    const resultContent = document.getElementById('hourly-result-content');
    const marginCta = document.getElementById('hourly-margin-cta');
    const HANDOFF_KEY = 'archtime-hourly-cost-calculator-handoff';
    let latestResult = null;
    let started = false;

    const annualMoney = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const hourlyMoney = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const number = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

    function track(name, parameters) {
        window.archTimeAnalytics?.track(name, parameters || {});
    }

    function parseNumber(value) {
        const normalized = String(value || '').trim().replace(/\s/g, '').replace(/€/g, '');
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

    function values() {
        return {
            overhead: parseNumber(fields.overhead.value),
            ownerCompensation: parseNumber(fields.ownerCompensation.value),
            teamCost: parseNumber(fields.teamCost.value),
            people: parseNumber(fields.people.value),
            days: parseNumber(fields.days.value),
            hoursPerDay: parseNumber(fields.hoursPerDay.value),
            nonBillable: parseNumber(fields.nonBillable.value),
            margin: parseNumber(fields.margin.value)
        };
    }

    function validate(v) {
        if (!Number.isFinite(v.overhead) || v.overhead < 0) return 'Inserisci costi generali validi, anche zero.';
        if (!Number.isFinite(v.ownerCompensation) || v.ownerCompensation < 0) return 'Inserisci un compenso del titolare valido, anche zero.';
        if (!Number.isFinite(v.teamCost) || v.teamCost < 0) return 'Inserisci un costo dei collaboratori valido, anche zero.';
        if (v.overhead + v.ownerCompensation + v.teamCost <= 0) return 'Inserisci almeno un costo annuale maggiore di zero.';
        if (!Number.isFinite(v.people) || v.people <= 0 || v.people > 100) return 'Inserisci un numero di persone maggiore di zero e non superiore a 100.';
        if (!Number.isInteger(v.days) || v.days < 1 || v.days > 366) return 'Inserisci giorni lavorabili compresi tra 1 e 366.';
        if (!Number.isFinite(v.hoursPerDay) || v.hoursPerDay <= 0 || v.hoursPerDay > 24) return 'Inserisci ore giornaliere comprese tra 0 e 24.';
        if (!Number.isFinite(v.nonBillable) || v.nonBillable < 0 || v.nonBillable >= 95) return 'Inserisci una quota non fatturabile tra 0% e 94%.';
        if (!Number.isFinite(v.margin) || v.margin < 0 || v.margin >= 80) return 'Inserisci un margine desiderato tra 0% e 79%.';
        return '';
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function render(v) {
        const annualCost = v.overhead + v.ownerCompensation + v.teamCost;
        const workableHours = v.people * v.days * v.hoursPerDay;
        const billableHours = workableHours * (1 - (v.nonBillable / 100));
        const minimumHourly = annualCost / billableHours;
        const recommendedRate = minimumHourly / (1 - (v.margin / 100));
        const breakEvenHours = annualCost / recommendedRate;
        const capacityBuffer = Math.max(0, billableHours - breakEvenHours);
        const dayRate = recommendedRate * v.hoursPerDay;
        const costShare = (minimumHourly / recommendedRate) * 100;

        latestResult = { values: { ...v }, annualCost, workableHours, billableHours, minimumHourly, recommendedRate, breakEvenHours, capacityBuffer, dayRate };
        setText('result-minimum-hourly', `${hourlyMoney.format(minimumHourly)} / ora`);
        setText('result-loss-threshold', `Sotto ${hourlyMoney.format(minimumHourly)} per ogni ora fatturabile lo studio non copre i costi.`);
        setText('result-recommended-rate', `${hourlyMoney.format(recommendedRate)} / ora`);
        setText('result-margin-copy', `Include un margine del ${number.format(v.margin)}%. Equivale a circa ${annualMoney.format(dayRate)} per una giornata da ${number.format(v.hoursPerDay)} ore.`);
        setText('result-rate-composition', `${number.format(costShare)}% costi · ${number.format(v.margin)}% margine`);
        setText('result-annual-cost', annualMoney.format(annualCost));
        setText('result-billable-hours', `${number.format(billableHours)} ore`);
        setText('result-break-even-revenue', annualMoney.format(annualCost));
        setText('result-break-even-hours', `${number.format(breakEvenHours)} ore`);

        document.getElementById('result-cost-share-bar').style.width = `${costShare}%`;
        document.getElementById('result-margin-share-bar').style.width = `${v.margin}%`;
        document.getElementById('hourly-insight').innerHTML = `Su ${number.format(workableHours)} ore teoriche, <strong class="text-white">${number.format(billableHours)} sono fatturabili</strong>. Alla tariffa consigliata bastano circa ${number.format(breakEvenHours)} ore per coprire i costi; le restanti ${number.format(capacityBuffer)} ore costruiscono il margine previsto.`;

        emptyResult.classList.add('hidden');
        resultContent.classList.remove('hidden');
        resultContent.classList.remove('result-enter');
        void resultContent.offsetWidth;
        resultContent.classList.add('result-enter');

        track('hourly_cost_calculator_completed', {
            structure: v.people === 1 ? 'solo' : (v.people <= 5 ? 'small_team' : 'larger_team'),
            non_billable_band: v.nonBillable < 25 ? 'under_25' : (v.nonBillable < 45 ? '25_44' : '45_plus'),
            margin_band: v.margin < 15 ? 'under_15' : (v.margin < 30 ? '15_29' : '30_plus')
        });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        errorBox.classList.add('hidden');
        const v = values();
        const error = validate(v);
        if (error) {
            errorBox.textContent = error;
            errorBox.classList.remove('hidden');
            track('hourly_cost_calculator_error');
            return;
        }
        render(v);
    });

    Object.values(fields).forEach(function (field) {
        field.addEventListener('input', function () {
            errorBox.classList.add('hidden');
            if (!started && field.value.trim()) {
                started = true;
                track('hourly_cost_calculator_started');
            }
        });
    });

    document.getElementById('hourly-example').addEventListener('click', function () {
        fields.overhead.value = '36.000';
        fields.ownerCompensation.value = '45.000';
        fields.teamCost.value = '70.000';
        fields.people.value = '3';
        fields.days.value = '220';
        fields.hoursPerDay.value = '8';
        fields.nonBillable.value = '35';
        fields.margin.value = '20';
        if (!started) {
            started = true;
            track('hourly_cost_calculator_started', { source: 'example' });
        }
        form.requestSubmit();
    });

    document.getElementById('hourly-reset').addEventListener('click', function () {
        form.reset();
        latestResult = null;
        errorBox.classList.add('hidden');
        resultContent.classList.add('hidden');
        emptyResult.classList.remove('hidden');
        fields.overhead.focus();
    });

    marginCta.addEventListener('click', function () {
        if (latestResult) {
            localStorage.setItem(HANDOFF_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), ...latestResult }));
        }
        track('hourly_cost_calculator_cta_clicked', { destination: '/calcolo-margine-commessa.html' });
    });
})();
