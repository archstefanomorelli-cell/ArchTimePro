(function () {
    'use strict';

    const videos = Array.from(document.querySelectorAll('[data-demo-src]'));
    if (!videos.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function load(video) {
        if (video.src) return;
        video.src = video.dataset.demoSrc;
        video.load();
    }

    function play(video) {
        load(video);
        if (reduceMotion || document.hidden) return;
        video.play().catch(() => {});
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

    const visibleVideos = new Set();
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
