(function () {
    const root = document.querySelector('.hero-projects');
    if (!root) return;
    const deck = root.querySelector('.hero-project-deck');
    const cards = [...root.querySelectorAll('.hero-project-card')];
    const position = root.querySelector('.hero-project-position');
    const playback = root.querySelector('.hero-project-playback');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let current = 0;
    let hoverTimer = 0;
    let openTimer = 0;
    let settlingUntil = 0;
    let expanded = false;
    let autoTimer = 0;
    let pointerInside = false;
    let inView = false;
    let userPaused = false;

    function stopAuto() { clearTimeout(autoTimer); }

    function syncAuto() {
        stopAuto();
        const paused = userPaused || reduced.matches;
        playback.dataset.paused = String(paused);
        playback.setAttribute('aria-label', paused ? 'Avvia lo scorrimento' : 'Metti in pausa lo scorrimento');
        playback.title = playback.getAttribute('aria-label');
        position.setAttribute('aria-live', pointerInside || root.contains(document.activeElement) || paused ? 'polite' : 'off');
        if (!paused && inView && !pointerInside && !root.contains(document.activeElement) && !document.hidden) {
            autoTimer = setTimeout(() => select(current + 1), 7000);
        }
    }

    function cancelPending() {
        clearTimeout(hoverTimer);
        clearTimeout(openTimer);
    }

    function draw() {
        const cardWidth = cards[0].offsetWidth;
        const sideRoom = Math.max(0, (deck.clientWidth - cardWidth) / 2);
        cards.forEach((card, index) => {
            let slot = (index - current + cards.length) % cards.length;
            if (slot > Math.floor(cards.length / 2)) slot -= cards.length;
            const distance = Math.abs(slot);
            const active = distance === 0;
            const scaleX = active ? 1 : distance === 1 ? .18 : .10;
            const shift = active ? 0 : Math.sign(slot) * (cardWidth / 2 + sideRoom * (distance === 1 ? .12 : .65));
            card.style.setProperty('--shift', shift + 'px');
            card.style.setProperty('--scale-x', String(scaleX));
            // Keep the visible edge four pixels thick even on nearly edge-on cards.
            card.style.setProperty('--edge-step', (slot < 0 ? -1 : 1) / scaleX + 'px');
            card.style.setProperty('--scale', active ? '1' : distance === 1 ? '.88' : '.76');
            card.style.setProperty('--angle', active ? '0deg' : -Math.sign(slot) * 28 + 'deg');
            card.style.setProperty('--lift', active ? (expanded ? '-36px' : '0px') : distance * 20 + 'px');
            card.style.setProperty('--layer', String(5 - distance));
            card.style.setProperty('--opacity', active ? '1' : distance === 1 ? '.95' : '.8');
            card.classList.toggle('is-active', active);
            card.classList.toggle('is-open', active && expanded);
            const button = card.querySelector('button');
            button.setAttribute('aria-expanded', String(active && expanded));
            if (active) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
            card.querySelector('.hero-project-details').hidden = !(active && expanded);
        });
        const name = cards[current].querySelector('.hero-project-name').textContent;
        position.replaceChildren(document.createTextNode(name));
        const count = document.createElement('span');
        count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
        position.append(count);
    }

    function select(index, open = false) {
        cancelPending();
        current = (index + cards.length) % cards.length;
        expanded = open;
        settlingUntil = performance.now() + (reduced.matches ? 0 : 500);
        draw();
        syncAuto();
    }

    cards.forEach((card, index) => {
        const button = card.querySelector('button');
        card.addEventListener('pointerenter', event => {
            if (!hover.matches || event.pointerType === 'touch' || performance.now() < settlingUntil) return;
            cancelPending();
            hoverTimer = setTimeout(() => {
                select(index);
                openTimer = setTimeout(() => {
                    if (card.matches(':hover')) { expanded = true; draw(); }
                }, 600);
            }, index === current ? 80 : 180);
        });
        card.addEventListener('pointerleave', cancelPending);
        button.addEventListener('click', () => select(index, index !== current || !expanded));
        button.addEventListener('focus', () => {
            if (button.matches(':focus-visible')) select(index, true);
        });
    });

    root.querySelector('.hero-project-prev').addEventListener('click', () => select(current - 1, true));
    root.querySelector('.hero-project-next').addEventListener('click', () => select(current + 1, true));
    root.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            select(current + (event.key === 'ArrowRight' ? 1 : -1), true);
        } else if (event.key === 'Escape') {
            cancelPending();
            expanded = false;
            draw();
        }
    });
    root.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch') { pointerInside = true; syncAuto(); }
    });
    root.addEventListener('pointerleave', () => {
        pointerInside = false;
        cancelPending();
        syncAuto();
    });
    root.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch') { userPaused = true; syncAuto(); }
    });
    root.addEventListener('focusin', stopAuto);
    root.addEventListener('focusout', () => setTimeout(syncAuto, 0));
    playback.addEventListener('click', event => {
        userPaused = !userPaused;
        if (!userPaused && event.detail > 0) playback.blur();
        syncAuto();
    });
    reduced.addEventListener('change', syncAuto);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelPending();
        syncAuto();
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            inView = entries[0].isIntersecting;
            syncAuto();
        }).observe(root);
    } else inView = true;
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(deck);
    else window.addEventListener('resize', draw);
    draw();
    syncAuto();
})();
