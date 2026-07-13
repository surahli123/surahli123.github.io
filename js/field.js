/* The Ranking Field — three.js particle system.
   ~600 "documents" drift in noise; a query pulls the relevant ones into a
   ranked column. Scoring is a deterministic hash of (query, doc), so every
   query produces a different, repeatable arrangement. */

import * as THREE from "../assets/vendor/three.module.min.js";

const DOC_COUNT = 600;
const TOP_K = 22;

/* deterministic 53-bit string hash (cyrb53) → [0, 1) */
function score(query, docId) {
    const str = `${query}::${docId}`;
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i += 1) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const val = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return (val % 100000) / 100000;
}

const vertexShader = /* glsl */ `
    attribute float aSeed;
    attribute vec3 aNoiseBase;
    attribute vec3 aRanked;
    attribute float aSize;
    attribute float aGlow;

    uniform float uTime;
    uniform float uMix;
    uniform float uPixelRatio;
    uniform float uScale;

    varying float vGlow;
    varying float vFade;

    float easeOutQuart(float t) {
        return 1.0 - pow(1.0 - t, 4.0);
    }

    void main() {
        // slow pseudo-curl drift around each doc's home position
        float t = uTime * 0.25;
        vec3 drift = vec3(
            sin(t + aSeed * 17.0) + 0.5 * sin(t * 2.3 + aSeed * 5.0),
            cos(t * 0.8 + aSeed * 23.0) + 0.5 * sin(t * 1.7 + aSeed * 9.0),
            sin(t * 0.6 + aSeed * 11.0)
        ) * 3.2;
        vec3 noisePos = aNoiseBase + drift;

        // staggered convergence: high-glow (relevant) docs land first
        float stagger = (1.0 - aGlow) * 0.35;
        float local = clamp((uMix - stagger) / max(1.0 - stagger, 0.001), 0.0, 1.0);
        float k = easeOutQuart(local);
        vec3 pos = mix(noisePos, aRanked, k);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        float sizeBoost = 1.0 + aGlow * 1.6 * k;
        gl_PointSize = aSize * sizeBoost * uScale * uPixelRatio * (140.0 / -mv.z);

        vGlow = aGlow * k;
        vFade = 0.35 + 0.65 * aGlow;
    }
`;

const fragmentShader = /* glsl */ `
    precision mediump float;

    varying float vGlow;
    varying float vFade;

    void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float disc = smoothstep(0.5, 0.38, d);
        if (disc < 0.01) discard;

        // dim indigo dust → warm amber signal
        vec3 dust = vec3(0.42, 0.44, 0.58);
        vec3 amber = vec3(0.95, 0.72, 0.32);
        vec3 color = mix(dust, amber, vGlow);

        float alpha = disc * mix(0.35, 0.95, vGlow) * vFade;
        gl_FragColor = vec4(color, alpha);
    }
`;

export function createField(canvas, options = {}) {
    const reducedMotion = Boolean(options.reducedMotion);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 400);
    camera.position.set(0, 0, 100);

    /* per-doc buffers */
    const seeds = new Float32Array(DOC_COUNT);
    const noiseBase = new Float32Array(DOC_COUNT * 3);
    const ranked = new Float32Array(DOC_COUNT * 3);
    const sizes = new Float32Array(DOC_COUNT);
    const glows = new Float32Array(DOC_COUNT);
    const positions = new Float32Array(DOC_COUNT * 3); // required attr, unused

    let viewW = 100;
    let viewH = 70;

    for (let i = 0; i < DOC_COUNT; i += 1) {
        seeds[i] = Math.random() * 100;
        sizes[i] = 2.2 + Math.random() * 2.6;
        glows[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aNoiseBase", new THREE.BufferAttribute(noiseBase, 3));
    geometry.setAttribute("aRanked", new THREE.BufferAttribute(ranked, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aGlow", new THREE.BufferAttribute(glows, 1));

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uMix: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
            uScale: { value: 1 },
        },
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    function scatterNoiseBase() {
        for (let i = 0; i < DOC_COUNT; i += 1) {
            noiseBase[i * 3] = (Math.random() - 0.5) * viewW * 1.1;
            noiseBase[i * 3 + 1] = (Math.random() - 0.5) * viewH * 1.1;
            noiseBase[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
        geometry.attributes.aNoiseBase.needsUpdate = true;
    }

    function resize() {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth;
        const h = canvas.clientHeight || canvas.parentElement.clientHeight;
        renderer.setSize(w, h, false);
        material.uniforms.uScale.value = Math.min(Math.max(w / 1000, 0.5), 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        viewH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        viewW = viewH * camera.aspect;
        scatterNoiseBase();
        if (lastQuery) {
            layoutRanked(lastQuery);
        }
        renderOnce();
    }

    /* ranked layout: top-k in a column on the right (centered on narrow
       screens), the long tail pushed out to a dim halo */
    let lastQuery = null;

    function layoutRanked(query) {
        const order = Array.from({ length: DOC_COUNT }, (_, i) => i)
            .sort((a, b) => score(query, b) - score(query, a));

        const narrow = camera.aspect < 0.85;
        // narrow screens: hug the right edge and stay out of the copy
        const columnX = narrow ? viewW * 0.38 : viewW * 0.27;
        const columnTop = viewH * 0.34;
        const columnSpan = viewH * 0.68;
        const glowCeiling = narrow ? 0.55 : 1;

        for (let r = 0; r < DOC_COUNT; r += 1) {
            const i = order[r];
            if (r < TOP_K) {
                const frac = TOP_K === 1 ? 0 : r / (TOP_K - 1);
                ranked[i * 3] = columnX + Math.sin(r * 2.4) * 0.8;
                ranked[i * 3 + 1] = columnTop - frac * columnSpan;
                ranked[i * 3 + 2] = 10;
                glows[i] = (1 - frac * 0.72) * glowCeiling;
                sizes[i] = 3.4 + (1 - frac) * 2.6;
            } else {
                // long tail: relevance decays into a wide, dim halo
                const angle = score(query, i * 7919) * Math.PI * 2;
                const radius = 0.35 + 0.75 * ((r - TOP_K) / (DOC_COUNT - TOP_K));
                ranked[i * 3] = Math.cos(angle) * viewW * 0.55 * radius;
                ranked[i * 3 + 1] = Math.sin(angle) * viewH * 0.55 * radius;
                ranked[i * 3 + 2] = -10 - radius * 20;
                glows[i] = 0.06;
                sizes[i] = 2.0 + Math.random() * 1.6;
            }
        }
        geometry.attributes.aRanked.needsUpdate = true;
        geometry.attributes.aGlow.needsUpdate = true;
        geometry.attributes.aSize.needsUpdate = true;
    }

    /* uMix tween: scatter (fast out) → converge (slow in) */
    let tween = null;

    function tweenMix(target, duration, onDone) {
        const from = material.uniforms.uMix.value;
        const start = performance.now();
        tween = { cancelled: false };
        const current = tween;

        function frame(now) {
            if (current.cancelled) return;
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            material.uniforms.uMix.value = from + (target - from) * eased;
            if (t < 1) {
                requestAnimationFrame(frame);
            } else if (onDone) {
                onDone();
            }
        }
        requestAnimationFrame(frame);
    }

    function rank(query, opts = {}) {
        lastQuery = query;
        if (tween) tween.cancelled = true;

        if (opts.instant || reducedMotion) {
            layoutRanked(query);
            material.uniforms.uMix.value = 1;
            renderOnce();
            return;
        }

        if (material.uniforms.uMix.value > 0.5) {
            // re-rank: release the field, then converge on the new order
            tweenMix(0.15, 380, () => {
                layoutRanked(query);
                tweenMix(1, 1100);
            });
        } else {
            layoutRanked(query);
            tweenMix(1, 1300);
        }
    }

    /* render loop — paused when the hero is off-screen */
    let running = false;
    let rafId = 0;
    const clock = new THREE.Clock();

    function loop() {
        if (!running) return;
        material.uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(loop);
    }

    function renderOnce() {
        renderer.render(scene, camera);
    }

    function setRunning(next) {
        if (next === running) return;
        running = next;
        if (running) {
            clock.start();
            rafId = requestAnimationFrame(loop);
        } else {
            cancelAnimationFrame(rafId);
        }
    }

    if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
            const visible = entries.some((e) => e.isIntersecting);
            setRunning(visible && !reducedMotion);
        }, { threshold: 0.05 }).observe(canvas);
    } else if (!reducedMotion) {
        setRunning(true);
    }

    window.addEventListener("resize", resize);
    resize();

    if (!reducedMotion) {
        setRunning(true);
    }

    return { rank };
}
