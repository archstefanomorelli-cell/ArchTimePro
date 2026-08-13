/**
 * ArchTimePro - Swiss Interactive Showcase
 * Dimostrazione interattiva dell'applicazione: Commessa, Timer e Privacy Team.
 */

(function () {
    'use strict';

    function initShowcase() {
        // Tab Switching
        const tabButtons = document.querySelectorAll('[data-showcase-tab]');
        const panels = {
            commessa: document.getElementById('panel-commessa'),
            timer: document.getElementById('panel-timer'),
            privacy: document.getElementById('panel-privacy')
        };

        tabButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const target = this.getAttribute('data-showcase-tab');
                
                // Update active tab buttons
                tabButtons.forEach(b => b.classList.remove('is-active'));
                this.classList.add('is-active');

                // Switch panels
                Object.keys(panels).forEach(k => {
                    if (panels[k]) {
                        if (k === target) {
                            panels[k].classList.remove('hidden');
                        } else {
                            panels[k].classList.add('hidden');
                        }
                    }
                });
            });
        });

        // Interactive Project Simulation in Tab 1
        let baseFee = 24000;
        let baseHours = 118;
        let hourlyRate = 40;
        let baseExpenses = 1480;

        function updateProjectStats() {
            const laborCost = baseHours * hourlyRate;
            const totalCost = laborCost + baseExpenses;
            const netMargin = baseFee - totalCost;
            const marginPct = (netMargin / baseFee) * 100;
            const costPct = (totalCost / baseFee) * 100;
            const breakEvenHours = Math.round((baseFee - baseExpenses) / hourlyRate);
            const remainingHours = breakEvenHours - baseHours;

            const elMargin = document.getElementById('showcase-margin');
            const elMarginPct = document.getElementById('showcase-margin-pct');
            const elHours = document.getElementById('showcase-hours');
            const elExpenses = document.getElementById('showcase-expenses');
            const elTotalCost = document.getElementById('showcase-total-cost');
            const elMeter = document.getElementById('showcase-meter-fill');
            const elRemaining = document.getElementById('showcase-remaining-hours');

            if (elMargin) elMargin.textContent = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(netMargin);
            if (elMarginPct) elMarginPct.textContent = `${marginPct.toFixed(0)}%`;
            if (elHours) elHours.textContent = `${baseHours}h`;
            if (elExpenses) elExpenses.textContent = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(baseExpenses);
            if (elTotalCost) elTotalCost.textContent = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalCost);
            if (elMeter) elMeter.style.width = `${Math.min(100, Math.max(5, costPct))}%`;
            if (elRemaining) elRemaining.textContent = `${remainingHours}h di margine prima del pareggio`;
        }

        const btnAddHours = document.getElementById('btn-showcase-add-hours');
        const btnAddExpense = document.getElementById('btn-showcase-add-expense');
        const btnResetSim = document.getElementById('btn-showcase-reset');

        if (btnAddHours) {
            btnAddHours.addEventListener('click', function () {
                baseHours += 15;
                updateProjectStats();
            });
        }

        if (btnAddExpense) {
            btnAddExpense.addEventListener('click', function () {
                baseExpenses += 400;
                updateProjectStats();
            });
        }

        if (btnResetSim) {
            btnResetSim.addEventListener('click', function () {
                baseHours = 118;
                baseExpenses = 1480;
                updateProjectStats();
            });
        }

        // Interactive Stopwatch in Tab 2
        let timerSeconds = 124 * 60 + 18; // 02:04:18
        let timerInterval = null;
        let isRunning = true;

        const timerDisplay = document.getElementById('showcase-timer-digits');
        const timerToggleBtn = document.getElementById('btn-showcase-toggle-timer');

        function formatTimerDigits(sec) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }

        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timerSeconds++;
                if (timerDisplay) timerDisplay.textContent = formatTimerDigits(timerSeconds);
            }, 1000);
        }

        startTimer();

        if (timerToggleBtn) {
            timerToggleBtn.addEventListener('click', function () {
                isRunning = !isRunning;
                if (isRunning) {
                    startTimer();
                    this.textContent = 'Metti in pausa';
                    this.className = 'swiss-btn swiss-btn-outline text-xs';
                } else {
                    if (timerInterval) clearInterval(timerInterval);
                    this.textContent = 'Riavvia cronometro';
                    this.className = 'swiss-btn swiss-btn-black text-xs';
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShowcase);
    } else {
        initShowcase();
    }
})();
