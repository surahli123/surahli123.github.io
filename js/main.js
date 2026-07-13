/* Signal Field — page orchestration.
   The WebGL field is progressive enhancement: content never waits for it. */

const reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- scroll reveals ---------- */

(function () {
    if (!("IntersectionObserver" in window) || reducedMotion) {
        return;
    }

    const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
    if (revealItems.length === 0) {
        return;
    }

    const remaining = new Set(revealItems);
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
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
    revealItems.forEach((item) => observer.observe(item));
})();

/* ---------- the ranking field ---------- */

const DEMO_QUERIES = [
    "what moved ndcg last tuesday?",
    "cheap flights to tokyo in may",
    "how to evaluate an llm judge",
    "waterproof trail runners size 8",
];

function webglAvailable() {
    try {
        const probe = document.createElement("canvas");
        return Boolean(
            window.WebGLRenderingContext &&
            (probe.getContext("webgl2") || probe.getContext("webgl"))
        );
    } catch (err) {
        return false;
    }
}

(async function () {
    const canvas = document.getElementById("ranking-field");
    const stage = document.querySelector(".field-stage");
    const form = document.querySelector(".query-bar");
    const input = document.getElementById("query-input");

    if (!canvas || !stage || !form || !input) {
        return;
    }

    let field = null;
    let userTookOver = false;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        userTookOver = true;
        const query = input.value.trim();
        if (field && query) {
            field.rank(query);
        }
    });

    input.addEventListener("focus", () => {
        userTookOver = true;
    });

    if (!webglAvailable()) {
        input.placeholder = DEMO_QUERIES[0];
        return; // designed CSS fallback stays visible
    }

    try {
        const module = await import("./field.js");
        field = module.createField(canvas, { reducedMotion });
    } catch (err) {
        input.placeholder = DEMO_QUERIES[0];
        return; // vendored three.js failed to load — fallback stays
    }

    stage.classList.add("is-webgl");
    canvas.classList.add("is-live");

    if (reducedMotion) {
        // Composed static state: field renders pre-ranked, no drift, no typing.
        input.placeholder = DEMO_QUERIES[0];
        field.rank(DEMO_QUERIES[0], { instant: true });
        return;
    }

    /* Auto-demo: type a query into the placeholder, rank, hold, repeat —
       until the visitor claims the input. */
    let queryIndex = 0;

    async function typeAndRank() {
        if (userTookOver) {
            return;
        }
        const query = DEMO_QUERIES[queryIndex % DEMO_QUERIES.length];
        queryIndex += 1;

        for (let i = 1; i <= query.length; i += 1) {
            if (userTookOver) {
                return;
            }
            input.placeholder = query.slice(0, i);
            await sleep(34 + Math.random() * 40);
        }
        if (userTookOver) {
            return;
        }
        field.rank(query);
        await sleep(5200);
        typeAndRank();
    }

    await sleep(700);
    typeAndRank();
})();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
