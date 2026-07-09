(function () {
    var reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrowViewport = window.matchMedia &&
        window.matchMedia("(max-width: 640px)").matches;

    if (!("IntersectionObserver" in window) || reducedMotion || narrowViewport) {
        return;
    }

    var revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
    if (revealItems.length === 0) {
        return;
    }

    var remaining = new Set(revealItems);
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
            remaining.delete(entry.target);
        });

        if (remaining.size === 0) {
            observer.disconnect();
        }
    }, {
        rootMargin: "0px 0px -8%",
        threshold: 0.12,
    });

    document.documentElement.classList.add("reveal-ready");
    revealItems.forEach(function (item) {
        observer.observe(item);
    });
})();
