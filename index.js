import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* Cached loader for the Blender-authored GLB shapes */
const glbCache = new Map();
function loadGlbGeometry(url) {
  if (!glbCache.has(url)) {
    glbCache.set(url, new Promise((resolve, reject) => {
      new GLTFLoader().load(url, (gltf) => {
        let geo = null;
        gltf.scene.traverse(o => { if (!geo && o.isMesh) geo = o.geometry; });
        geo ? resolve(geo) : reject(new Error("no mesh in " + url));
      }, undefined, reject);
    }));
  }
  return glbCache.get(url);
}

/* ============================================================
   Utility
   ============================================================ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGSAP = () => Boolean(window.gsap);
const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

document.addEventListener("DOMContentLoaded", () => {
  $("#year") && ($("#year").textContent = new Date().getFullYear());

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  initNav();
  initCursorGlow();
  initScrollProgress();
  initReveal();
  initSplitHeadings();
  initResearchCardReveal();
  initStatsReveal();
  initStatCounters();
  initCollapsibles();
  initTabs();
  initHeroTilt();
  initMagneticButtons();
  initInkSwap();
  initAboutParallax();
  initHeroPhotoScroll();
  initTimelineDraw();
  initGalleryScroll();

  if (!prefersReduced) {
    initHeroScene();
    initFlowDivider();
    initContactScene();
  }
});

/* ============================================================
   Nav: scroll shadow, mobile toggle, scroll-spy
   ============================================================ */
function initNav() {
  const nav = $("#siteNav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  $$('a[data-nav]', links).forEach(a => {
    a.addEventListener("click", () => links.classList.remove("is-open"));
  });

  const sections = $$('[data-nav]', links)
    .map(a => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = "#" + entry.target.id;
      const link = $(`a[data-nav][href="${id}"]`);
      if (!link) return;
      if (entry.isIntersecting) {
        $$('a[data-nav]').forEach(a => a.classList.remove("is-active"));
        link.classList.add("is-active");
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px" });

  sections.forEach(s => spy.observe(s));
}

/* ============================================================
   Cursor glow (desktop only, cheap) — GSAP quickTo for buttery follow
   ============================================================ */
function initCursorGlow() {
  const glow = $(".cursor-glow");
  if (!glow || isCoarsePointer()) {
    if (glow) glow.style.display = "none";
    return;
  }

  if (hasGSAP()) {
    gsap.set(glow, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const xTo = gsap.quickTo(glow, "x", { duration: 0.55, ease: "power3" });
    const yTo = gsap.quickTo(glow, "y", { duration: 0.55, ease: "power3" });
    window.addEventListener("mousemove", e => { xTo(e.clientX); yTo(e.clientY); });
  } else {
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let cx = tx, cy = ty;
    window.addEventListener("mousemove", e => { tx = e.clientX; ty = e.clientY; });
    (function raf() {
      cx = lerp(cx, tx, 0.12);
      cy = lerp(cy, ty, 0.12);
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(raf);
    })();
  }
}

/* ============================================================
   Scroll progress bar
   ============================================================ */
function initScrollProgress() {
  const bar = $("#scrollProgress");
  if (!bar) return;

  if (hasGSAP() && window.ScrollTrigger) {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: self => gsap.set(bar, { scaleX: self.progress }),
    });
  } else {
    window.addEventListener("scroll", () => {
      const h = document.documentElement;
      const p = clamp(h.scrollTop / (h.scrollHeight - h.clientHeight || 1), 0, 1);
      bar.style.transform = `scaleX(${p})`;
    }, { passive: true });
  }
}

/* ============================================================
   Scroll reveal — GSAP batch stagger (falls back to IO+CSS)
   ============================================================ */
function initReveal() {
  const els = $$(".reveal");
  if (!els.length) return;

  if (hasGSAP() && window.ScrollTrigger) {
    gsap.set(els, { opacity: 0, y: 30 });
    ScrollTrigger.batch(els, {
      start: "top 90%",
      once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: true,
      }),
    });
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = (i % 6) * 0.06 + "s";
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    els.forEach(el => io.observe(el));
  }
}

/* ============================================================
   Split-word heading reveals
   ============================================================ */
function initSplitHeadings() {
  const heads = $$(".split-heading");
  if (!heads.length || !hasGSAP() || !window.ScrollTrigger) return;

  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  heads.forEach(h => {
    const text = h.textContent.trim();
    h.innerHTML = text.split(/\s+/)
      .map(word => `<span class="word"><span class="word-inner">${esc(word)}</span></span>`)
      .join(" ");
    const inners = $$(".word-inner", h);
    gsap.set(inners, { yPercent: 130, opacity: 0 });

    ScrollTrigger.create({
      trigger: h,
      start: "top 88%",
      once: true,
      onEnter: () => gsap.to(inners, {
        yPercent: 0, opacity: 1, duration: 0.85, ease: "power4.out", stagger: 0.045,
      }),
    });
  });
}

/* ============================================================
   Research cards — 3D flip-up reveal on scroll
   ============================================================ */
function initResearchCardReveal() {
  const cards = $$(".tilt-card");
  if (!cards.length) return;

  if (hasGSAP() && window.ScrollTrigger) {
    gsap.set(cards, {
      opacity: 0, y: 60, rotateX: -35, transformPerspective: 900, transformOrigin: "50% 100%",
    });
    ScrollTrigger.batch(cards, {
      start: "top 88%",
      once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1, y: 0, rotateX: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, overwrite: true,
      }),
    });
  } else {
    cards.forEach(c => { c.style.opacity = 1; });
  }
}

/* ============================================================
   Stat cards — staggered pop-in on scroll
   ============================================================ */
function initStatsReveal() {
  const stats = $$(".stat");
  if (!stats.length) return;

  if (hasGSAP() && window.ScrollTrigger) {
    gsap.set(stats, { opacity: 0, y: 34, scale: 0.85 });
    ScrollTrigger.batch(stats, {
      start: "top 90%",
      once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.7)", stagger: 0.1, overwrite: true,
      }),
    });
  } else {
    stats.forEach(s => { s.style.opacity = 1; });
  }
}

/* ============================================================
   Animated stat counters
   ============================================================ */
function initStatCounters() {
  const stats = $$(".stat[data-count]");
  if (!stats.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const numEl = $(".stat-num", el);
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        numEl.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  stats.forEach(s => io.observe(s));
}

/* ============================================================
   Collapsible "show more" lists
   ============================================================ */
function initCollapsibles() {
  $$('[data-collapsible]').forEach(list => {
    const showCount = parseInt(list.dataset.showCount || "4", 10);
    const items = Array.from(list.children);
    items.forEach((item, i) => { if (i >= showCount) item.setAttribute("data-hidden", ""); });

    const btn = list.parentElement.querySelector('[data-show-more]');
    if (!btn) return;
    if (items.length <= showCount) { btn.style.display = "none"; return; }

    let expanded = false;
    const originalLabel = btn.textContent;
    btn.addEventListener("click", () => {
      expanded = !expanded;
      items.forEach((item, i) => {
        if (i >= showCount) {
          if (expanded) item.removeAttribute("data-hidden");
          else item.setAttribute("data-hidden", "");
        }
      });
      btn.textContent = expanded ? "Show less" : originalLabel;
      if (hasGSAP() && window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
}

/* ============================================================
   Recognition tabs (Awards / Talks / Service)
   ============================================================ */
function initTabs() {
  const buttons = $$(".tab-btn");
  if (!buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      $$(".tab-panel").forEach(p => p.classList.remove("is-active"));
      $(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add("is-active");
      if (hasGSAP() && window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
}

/* ============================================================
   Hero photo + research card 3D tilt (GSAP quickTo)
   ============================================================ */
function initHeroTilt() {
  const wrap = $("#tiltCard");
  const inner = $("#tiltInner");

  if (wrap && inner && !isCoarsePointer() && hasGSAP()) {
    const rotX = gsap.quickTo(inner, "rotationX", { duration: 0.6, ease: "power3" });
    const rotY = gsap.quickTo(inner, "rotationY", { duration: 0.6, ease: "power3" });
    wrap.addEventListener("mousemove", (e) => {
      const rect = wrap.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      rotX(py * -16);
      rotY(px * 16);
    });
    wrap.addEventListener("mouseleave", () => { rotX(0); rotY(0); });
  }

  if (isCoarsePointer()) return;

  $$(".tilt-card[data-tilt]").forEach(card => {
    if (hasGSAP()) {
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3" });
      const ty = gsap.quickTo(card, "y", { duration: 0.5, ease: "power3" });
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx(py * -8); ry(px * 8); ty(-4);
      });
      card.addEventListener("mouseleave", () => { rx(0); ry(0); ty(0); });
    } else {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateX(${py * -8}deg) rotateY(${px * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    }
  });
}

/* ============================================================
   Magnetic buttons
   ============================================================ */
function initMagneticButtons() {
  if (isCoarsePointer() || !hasGSAP() || prefersReduced) return;

  $$(".btn").forEach(btn => {
    const xTo = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const relX = e.clientX - (r.left + r.width / 2);
      const relY = e.clientY - (r.top + r.height / 2);
      xTo(relX * 0.25);
      yTo(relY * 0.35);
    });
    btn.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
  });
}

/* ============================================================
   Rotating word swap in hero title
   ============================================================ */
function initInkSwap() {
  const wrap = $("#inkSwapWrap");
  const el = $(".ink-swap", wrap || document);
  if (!wrap || !el) return;
  let words;
  try { words = JSON.parse(el.dataset.swap); } catch { return; }
  if (!words || words.length < 2) return;

  function lockHeight() {
    const current = el.textContent;
    wrap.style.minHeight = "";
    let max = 0;
    words.forEach(w => {
      el.textContent = w;
      max = Math.max(max, wrap.scrollHeight);
    });
    el.textContent = current;
    wrap.style.minHeight = max + "px";
  }

  lockHeight();
  window.addEventListener("resize", debounce(lockHeight, 200));

  let i = 0;
  setInterval(() => {
    i = (i + 1) % words.length;
    el.style.opacity = 0;
    el.style.transform = "translateY(8px)";
    setTimeout(() => {
      el.textContent = words[i];
      el.style.transition = "opacity .4s ease, transform .4s ease";
      el.style.opacity = 1;
      el.style.transform = "translateY(0)";
    }, 220);
  }, 2600);
}

/* ============================================================
   About-section photo parallax on scroll
   ============================================================ */
function initAboutParallax() {
  const photo = $("#parallaxPhoto");
  const section = $("#about");
  if (!photo) return;

  if (hasGSAP() && window.ScrollTrigger) {
    gsap.timeline({
      scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6 }
    })
      .fromTo(photo,
        { opacity: 0, y: 110, scale: 0.9, rotate: -3 },
        { opacity: 1, y: 0, scale: 1, rotate: 0, ease: "none", duration: 1 }
      )
      .to(photo,
        { opacity: 0, y: -110, scale: 0.94, rotate: 3, ease: "none", duration: 1 }
      );
  } else {
    photo.style.opacity = 1;
    window.addEventListener("scroll", () => {
      const r = photo.getBoundingClientRect();
      const progress = clamp(1 - r.top / window.innerHeight, 0, 2);
      photo.style.transform = `translateY(${(progress - 1) * 40}px)`;
    }, { passive: true });
  }
}

/* ============================================================
   Hero photo fade-out as the page scrolls away from the hero
   ============================================================ */
function initHeroPhotoScroll() {
  const wrap = $("#tiltCard");
  const hero = $("#hero");
  if (!wrap || !hero || !hasGSAP() || !window.ScrollTrigger) return;

  gsap.to(wrap, {
    opacity: 0, y: -70, scale: 0.92, ease: "none",
    scrollTrigger: { trigger: hero, start: "60% top", end: "bottom top", scrub: 0.6 }
  });
}

/* ============================================================
   Timeline: line draws in + dots pop as you scroll
   ============================================================ */
function initTimelineDraw() {
  const line = $(".timeline-line");
  const timelineEl = $(".timeline");
  if (!line || !timelineEl || !hasGSAP() || !window.ScrollTrigger) return;

  gsap.to(line, {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: timelineEl, start: "top 75%", end: "bottom 85%", scrub: 0.6 },
  });

  const dots = $$(".timeline-dot");
  if (dots.length) {
    ScrollTrigger.batch(dots, {
      start: "top 85%",
      once: true,
      onEnter: batch => gsap.to(batch, {
        scale: 1, duration: 0.7, ease: "back.out(2.4)", stagger: 0.18,
      }),
    });
  }
}

/* ============================================================
   Gallery: pinned horizontal scroll driven by vertical scroll
   ============================================================ */
function initGalleryScroll() {
  const section = $("#gallery");
  const viewport = $(".gallery-viewport");
  const track = $("#galleryTrack");
  if (!section || !viewport || !track) return;
  const figures = $$("figure", track);

  function updateCenter() {
    const vr = viewport.getBoundingClientRect();
    const center = vr.left + vr.width / 2;
    let closest = null, closestDist = Infinity;
    figures.forEach(fig => {
      const r = fig.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - center);
      if (dist < closestDist) { closestDist = dist; closest = fig; }
    });
    figures.forEach(f => f.classList.toggle("is-center", f === closest));
  }

  if (!hasGSAP() || !window.ScrollTrigger) {
    // Fallback: native horizontal scroll/drag
    viewport.style.overflowX = "auto";
    track.style.width = "max-content";
    viewport.addEventListener("scroll", () => requestAnimationFrame(updateCenter), { passive: true });
    window.addEventListener("resize", updateCenter);
    updateCenter();
    return;
  }

  const getMaxScroll = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

  const tween = gsap.to(track, { x: () => -getMaxScroll(), ease: "none" });

  ScrollTrigger.create({
    trigger: section,
    start: "top top+=84",
    end: () => "+=" + (getMaxScroll() + window.innerHeight * 0.4),
    pin: true,
    scrub: 0.8,
    anticipatePin: 1,
    animation: tween,
    invalidateOnRefresh: true,
    onUpdate: updateCenter,
  });

  updateCenter();
}

/* ============================================================
   THREE.js — reusable soft gradient "blob" material
   ============================================================ */
const noiseGLSL = `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

function makeBlobMaterial({ colorA, colorB, rim, amplitude = 0.0, speed = 0.3, freq = 1.2 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uRim: { value: new THREE.Color(rim) },
      uAmp: { value: amplitude },
      uSpeed: { value: speed },
      uFreq: { value: freq },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec3 vViewDir;
      uniform float uTime, uAmp, uSpeed, uFreq;
      ${noiseGLSL}
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vec3 displaced = position;
        float n = snoise(position * uFreq + uTime * uSpeed);
        displaced += normal * n * uAmp;
        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        vViewDir = normalize(-mv.xyz);
        vPos = position;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec3 vViewDir;
      uniform vec3 uColorA, uColorB, uRim;
      void main(){
        float grad = clamp(vPos.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(uColorA, uColorB, grad);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.2);
        vec3 color = base + uRim * fresnel * 0.9;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

/* ============================================================
   THREE.js — hero scene
   ============================================================ */
function initHeroScene() {
  const canvas = $("#heroCanvas");
  const heroEl = $("#hero");
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const group = new THREE.Group();
  scene.add(group);

  // Ring — a glowing torus "halo"
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.26, 40, 120),
    makeBlobMaterial({ colorA: "#7cc3ec", colorB: "#eaf6fd", rim: "#ffffff", amplitude: 0 })
  );
  ring.position.set(3.4, 1.3, -1.5);
  ring.rotation.x = Math.PI / 3;
  ring.rotation.y = Math.PI / 8;
  ring.userData.fixedTiltX = ring.rotation.x;
  ring.material.transparent = true;
  ring.material.opacity = 0.92;
  group.add(ring);

  // Knot — the spiral (kept exactly as-is)
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.3, 0.09, 160, 20),
    makeBlobMaterial({ colorA: "#2f93d6", colorB: "#a7d8f2", rim: "#ffffff", amplitude: 0 })
  );
  knot.position.set(5.2, -2.8, -3);
  knot.material.transparent = true;
  knot.material.opacity = 0.8;
  group.add(knot);

  const meshes = [ring, knot];

  // Two Blender-authored shapes: a twisted ribbon and a tapered spiral shell
  function addGlbShape(url, { colorA, colorB, position, scale, opacity = 0.9 }) {
    loadGlbGeometry(url).then(geo => {
      const mesh = new THREE.Mesh(geo, makeBlobMaterial({ colorA, colorB, rim: "#ffffff", amplitude: 0 }));
      mesh.position.copy(position);
      mesh.scale.setScalar(scale);
      mesh.material.transparent = true;
      mesh.material.opacity = opacity;
      mesh.userData.base = mesh.position.clone();
      mesh.userData.baseScale = mesh.scale.clone();
      mesh.userData.depth = clamp((mesh.position.z + 4) / 4, 0.35, 1.4);
      group.add(mesh);
      meshes.push(mesh);
    }).catch(() => {});
  }
  addGlbShape("assets3d/ribbon.glb", {
    colorA: "#1f74b3", colorB: "#7cc3ec",
    position: new THREE.Vector3(-3.4, -2.4, -3.2), scale: 0.42,
  });
  addGlbShape("assets3d/shell.glb", {
    colorA: "#5bb3e8", colorB: "#dceefa",
    position: new THREE.Vector3(4.6, 1.9, -0.5), scale: 0.48,
  });
  // remember each mesh's base position/scale + a depth-based parallax weight (closer to camera = more movement)
  meshes.forEach(m => {
    m.userData.base = m.position.clone();
    m.userData.baseScale = m.scale.clone();
    m.userData.depth = clamp((m.position.z + 4) / 4, 0.35, 1.4);
  });

  // soft particle dust
  const particleCount = 160;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0xbfe3f7, size: 0.05, transparent: true, opacity: 0.55 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  function resize() {
    const w = heroEl.clientWidth, h = heroEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // Scroll progress through the hero, scrubbed smoothly by GSAP when available.
  const scrollState = { p: 0 };
  if (window.gsap && window.ScrollTrigger) {
    gsap.to(scrollState, {
      p: 1.4, ease: "none",
      scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: 0.7 }
    });
  } else {
    window.addEventListener("scroll", () => {
      scrollState.p = clamp(window.scrollY / window.innerHeight, 0, 1.4);
    }, { passive: true });
  }

  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; },
    { threshold: 0 }).observe(heroEl);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = clock.getElapsedTime();

    targetX = lerp(targetX, mouseX, 0.04);
    targetY = lerp(targetY, mouseY, 0.04);
    const sp = scrollState.p;
    group.rotation.y = targetX * 0.35 + t * 0.05 + sp * 0.55;
    group.rotation.x = -targetY * 0.2;
    group.position.y = -sp * 1.3;
    group.rotation.z = sp * 0.15;

    // camera pulls back gently as the hero scrolls away
    camera.position.z = 7 + sp * 1.6;

    meshes.forEach((m, i) => {
      if (m === ring) {
        // keep the ring's tilt fixed so it always reads as a halo, never edge-on;
        // only spin it around its own tilted axis
        m.rotation.x = ring.userData.fixedTiltX + Math.sin(t * 0.2) * 0.08;
        m.rotation.y = t * 0.12 + sp * 1.2;
      } else {
        m.rotation.x = t * (0.08 + i * 0.02) + sp * (0.5 + i * 0.25);
        m.rotation.y = t * (0.1 + i * 0.015) + sp * 0.8;
      }
      m.material.uniforms.uTime.value = t;

      // per-shape depth parallax (mouse) + outward drift as you scroll away
      const depth = m.userData.depth;
      const base = m.userData.base;
      const spread = 1 + sp * 0.45 * depth;
      m.position.x = base.x * spread + targetX * depth * 0.6;
      m.position.y = base.y * spread + -targetY * depth * 0.5;

      // gentle idle breathing scale (preserves each shape's own base proportions)
      const breathe = 1 + Math.sin(t * 0.6 + i * 1.7) * 0.04;
      m.scale.copy(m.userData.baseScale).multiplyScalar(breathe);
    });

    particles.rotation.y = t * 0.02 + sp * 0.3;
    particles.position.x = targetX * 0.3;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   THREE.js — scroll-scrubbed ribbon divider (Blender GLB)
   ============================================================ */
function initFlowDivider() {
  const canvas = $("#flowCanvas");
  const section = $("#flowDivider");
  if (!canvas || !section) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  let ribbon = null;
  loadGlbGeometry("assets3d/ribbon.glb").then(geo => {
    ribbon = new THREE.Mesh(geo, makeBlobMaterial({ colorA: "#2f93d6", colorB: "#bfe3f7", rim: "#ffffff", amplitude: 0 }));
    ribbon.scale.setScalar(1.15);
    scene.add(ribbon);
  }).catch(() => {});

  // progress 0→1 as the divider crosses the viewport
  const prog = { p: 0 };
  if (window.gsap && window.ScrollTrigger) {
    gsap.fromTo(prog, { p: 0 }, {
      p: 1, ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6 }
    });
  } else {
    window.addEventListener("scroll", () => {
      const r = section.getBoundingClientRect();
      prog.p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
    }, { passive: true });
  }

  function resize() {
    const w = section.clientWidth, h = section.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let visible = false;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; },
    { threshold: 0 }).observe(section);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible || !ribbon) return;
    const t = clock.getElapsedTime();
    const p = prog.p;
    // the ribbon rolls across the strip as you scroll past it
    ribbon.position.x = lerp(-3.4, 3.4, p);
    ribbon.position.y = Math.sin(p * Math.PI) * 0.25;
    ribbon.rotation.y = p * Math.PI * 1.6 + t * 0.06;
    ribbon.rotation.x = 0.5 + Math.sin(t * 0.4) * 0.1;
    ribbon.rotation.z = p * 0.6;
    ribbon.material.uniforms.uTime.value = t;
    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   THREE.js — contact section closing scene
   ============================================================ */
function initContactScene() {
  const canvas = $("#contactCanvas");
  const section = $("#contact");
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 2),
    makeBlobMaterial({ colorA: "#2f93d6", colorB: "#7cc3ec", rim: "#ffffff", amplitude: 0.08, speed: 0.2, freq: 1.1 })
  );
  scene.add(core);

  const ringGeo = new THREE.TorusGeometry(1.7, 0.02, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 2.4;
  const ring2 = ring1.clone();
  ring2.rotation.x = -Math.PI / 3;
  ring2.rotation.y = Math.PI / 5;
  scene.add(ring1, ring2);

  // a small Blender shell orbits the core like a satellite
  let satellite = null;
  loadGlbGeometry("assets3d/shell.glb").then(geo => {
    satellite = new THREE.Mesh(geo, makeBlobMaterial({ colorA: "#5bb3e8", colorB: "#dceefa", rim: "#ffffff", amplitude: 0 }));
    satellite.scale.setScalar(0.22);
    scene.add(satellite);
  }).catch(() => {});

  // scroll-scrubbed dive-in: camera eases closer as the section fills the screen
  const dive = { z: 7.6 };
  if (hasGSAP() && window.ScrollTrigger) {
    gsap.to(dive, {
      z: 5.6, ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "center center", scrub: 0.6 }
    });
  } else {
    dive.z = 6;
  }

  function resize() {
    const w = section.clientWidth, h = section.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let entered = false;
  let visible = false;
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !entered) {
      entered = true;
      if (hasGSAP()) {
        gsap.from(core.scale, { x: 0, y: 0, z: 0, duration: 1.1, ease: "elastic.out(1, 0.6)" });
        gsap.from([ring1.scale, ring2.scale], { x: 0, y: 0, z: 0, duration: 1, ease: "power3.out", stagger: 0.15 });
      }
    }
  }, { threshold: 0.05 }).observe(section);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = clock.getElapsedTime();
    camera.position.z = dive.z;
    core.rotation.y = t * 0.25;
    core.rotation.x = t * 0.12;
    core.material.uniforms.uTime.value = t;
    ring1.rotation.z = t * 0.15;
    ring2.rotation.z = -t * 0.1;
    if (satellite) {
      const a = t * 0.5;
      satellite.position.set(Math.cos(a) * 2.1, Math.sin(a * 0.7) * 0.5, Math.sin(a) * 2.1);
      satellite.rotation.y = t * 0.6;
      satellite.rotation.x = 0.4;
      satellite.material.uniforms.uTime.value = t;
    }
    renderer.render(scene, camera);
  }
  animate();
}
