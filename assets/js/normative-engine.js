(function (global) {
    'use strict';

    function parameterP(value) {
        const numericValue = Number(value || 0);
        const effectiveValue = Math.max(numericValue, 25000);
        return numericValue > 0 ? 0.03 + (10 / Math.pow(effectiveValue, 0.4)) : 0;
    }

    function parseQ(value) {
        const raw = String(value ?? '').trim();
        if (!raw.startsWith('[')) return Number(raw) || 0;
        return raw.slice(1, -1).split(',').map(item => item.trim() === 'i' ? Infinity : Number(item.trim()));
    }

    function calculateServiceFee(workValue, complexity, qValue, options = {}) {
        const value = Number(workValue || 0);
        const g = Number(complexity || 0);
        const inhabitants = Number(options.inhabitants || 0);
        const q = parseQ(qValue);
        if (value <= 0 || g <= 0) return 0;
        if (!Array.isArray(q)) return value * g * parameterP(value) * q;

        const segments = [0, q[1], ...q];
        let total = 0;
        for (let index = 0; index < segments.length - 2; index += 2) {
            const lowerBound = segments[index];
            const lowerQ = segments[index + 1];
            const upperBound = segments[index + 2];
            const upperQ = segments[index + 3];
            if (options.usePopulation && inhabitants > 0) {
                const populationInSegment = Math.max(inhabitants - lowerBound, 0) - Math.max(inhabitants - upperBound, 0);
                if (populationInSegment <= 0) continue;
                const segmentValue = Math.max(populationInSegment * (value / inhabitants), 25000);
                total += segmentValue * g * parameterP(segmentValue) * upperQ;
                continue;
            }
            const segmentValue = Math.max(value - lowerBound, 0) - Math.max(value - upperBound, 0);
            if (segmentValue <= 0) continue;
            const reachedValue = segmentValue + lowerBound;
            const interpolatedQ = upperBound === Infinity
                ? upperQ
                : ((upperQ - lowerQ) * (reachedValue - lowerBound) / (upperBound - lowerBound)) + lowerQ;
            total += segmentValue * g * parameterP(segmentValue) * interpolatedQ;
        }
        return total;
    }

    function accessoryRate(workValue) {
        const value = Number(workValue || 0);
        if (value <= 0) return 0;
        if (value <= 1000000) return 0.25;
        if (value >= 25000000) return 0.10;
        return 0.25 - (0.15 * (value - 1000000) / 24000000);
    }

    function calculateQuote({ workValue, inhabitants, category, complexity, phases, selectedCodes }) {
        const selected = selectedCodes instanceof Set ? selectedCodes : new Set(selectedCodes || []);
        const value = Number(workValue || 0);
        const population = Number(inhabitants || 0);
        const g = Number(complexity?.g || 0);
        const qMap = category?.q || {};
        const serviceAmounts = {};
        const taskCompensations = {};
        let compensation = 0;

        (phases || []).forEach(phase => {
            (phase.services || []).forEach(service => {
                if (!selected.has(service.code) || !Object.prototype.hasOwnProperty.call(qMap, service.code)) return;
                const amount = calculateServiceFee(value, g, qMap[service.code], {
                    inhabitants: population,
                    usePopulation: service.code === 'Qa.0.01' || service.code === 'Qa.0.02'
                });
                serviceAmounts[service.code] = amount;
                taskCompensations[phase.name] = Number(taskCompensations[phase.name] || 0) + amount;
                compensation += amount;
            });
        });

        const rate = accessoryRate(value);
        const accessoryExpenses = compensation * rate;
        const quoteTotal = compensation + accessoryExpenses;
        const taskBudgets = Object.fromEntries(
            Object.entries(taskCompensations).map(([taskName, amount]) => [taskName, Number(amount || 0) * (1 + rate)])
        );

        return {
            workValue: value,
            inhabitants: population,
            category,
            complexity,
            parameterP: parameterP(value),
            serviceAmounts,
            taskCompensations,
            taskBudgets,
            compensation,
            accessoryRate: rate,
            accessoryExpenses,
            quoteTotal,
            total: quoteTotal
        };
    }

    global.ArchTimeNormativeEngine = Object.freeze({
        parameterP,
        parseQ,
        calculateServiceFee,
        accessoryRate,
        calculateQuote
    });
})(window);
