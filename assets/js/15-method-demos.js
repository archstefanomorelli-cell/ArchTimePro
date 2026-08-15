(function () {
    'use strict';

    const videos = Array.from(document.querySelectorAll('[data-demo-src]'));
    if (!videos.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleVideos = new Set();

    function startTime(video) {
        const value = Number(video.dataset.demoStart || 0);
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    function seekToStart(video) {
        const start = startTime(video);
        if (video.readyState >= 1 && video.currentTime < start - 0.05) {
            video.currentTime = Math.min(start, Math.max(0, video.duration - 0.1));
        }
    }

    function prepare(video) {
        if (video.dataset.demoPrepared === 'true') return;
        video.dataset.demoPrepared = 'true';
        video.addEventListener('loadedmetadata', () => seekToStart(video));
        video.addEventListener('ended', () => {
            if (reduceMotion) return;
            video.currentTime = startTime(video);
            if (!document.hidden && visibleVideos.has(video)) {
                video.play().catch(() => {});
            }
        });
    }

    function load(video) {
        prepare(video);
        if (video.src) return;
        video.src = video.dataset.demoSrc;
        video.load();
    }

    function play(video) {
        load(video);
        if (reduceMotion || document.hidden) return;
        if (video.readyState >= 1) {
            seekToStart(video);
            video.play().catch(() => {});
            return;
        }
        video.addEventListener('loadedmetadata', () => {
            seekToStart(video);
            video.play().catch(() => {});
        }, { once: true });
    }

    if (reduceMotion) {
        videos.forEach(video => {
            load(video);
            video.controls = true;
        });
        return;
    }

    if (!('IntersectionObserver' in window)) {
        videos.forEach(play);
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                visibleVideos.add(video);
                play(video);
            } else {
                visibleVideos.delete(video);
                video.pause();
            }
        });
    }, { rootMargin: '100px 0px', threshold: 0.2 });

    videos.forEach(video => observer.observe(video));

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            videos.forEach(video => video.pause());
        } else {
            visibleVideos.forEach(play);
        }
    });
})();
