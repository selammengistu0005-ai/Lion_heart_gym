/* ═══════════════════════════════════════════════════
   LIONHEART GYM — main.js
   Three.js Hero Scene + Loader + Site Scripts
═══════════════════════════════════════════════════ */

import * as THREE          from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import gsap                from 'gsap';
import { ScrollTrigger }   from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────
   1. LOADER
   — Always shows for a minimum of 2500ms
     so it's visible even on fast loads/refreshes
───────────────────────────────────────── */
(function initLoader() {

  const loader = document.getElementById('loader');
  const fill   = document.querySelector('.loader__bar-fill');
  if (!loader || !fill) return;

  // Force the page to start at the very top, ignoring browser scroll restoration
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // Lock scroll while loading
  document.body.style.overflow = 'hidden';

  const MIN_DURATION = 2500; // guaranteed minimum display time (ms)
  const start        = performance.now();

  let progress    = 0;
  let pageReady   = false;
  let barDone     = false;

  // Animate the progress bar over MIN_DURATION
  function tickLoader(now) {
    progress = Math.min((now - start) / MIN_DURATION, 1);
    fill.style.width = (progress * 100) + '%';

    if (progress < 1) {
      requestAnimationFrame(tickLoader);
    } else {
      barDone = true;
      tryDismiss();
    }
  }

  // Page load event — marks page as ready
  if (document.readyState === 'complete') {
    pageReady = true;
  } else {
    window.addEventListener('load', () => {
      pageReady = true;
      tryDismiss();
    }, { once: true });
  }

  function tryDismiss() {
    // Only dismiss when BOTH the bar has finished AND the page is loaded
    if (!barDone || !pageReady) return;

    setTimeout(() => {
      loader.classList.add('loader--hidden');
      document.body.style.overflow = '';

      // Tell the rest of the page the loader is gone — hero animation listens for this
      window.dispatchEvent(new CustomEvent('loaderDone'));

      loader.addEventListener('transitionend', () => {
        loader.remove();
      }, { once: true });
    }, 300);
  }

  requestAnimationFrame(tickLoader);

})();

/* ─────────────────────────────────────────
   1b. HERO ENTRANCE (GSAP)
   — Plays once, right after the loader hides
───────────────────────────────────────── */
(function initHeroEntrance() {

  const lines   = document.querySelectorAll('.hero__title-line');
  const tagline = document.querySelector('.hero__tagline');
  const taglineEn = document.querySelector('.hero__tagline-en');
  const divider = document.querySelector('.hero__divider');
  const sub    = document.querySelector('.hero__sub');

  if (!lines.length) return;

  // Hide everything before animating in (avoids flash of unstyled content)
  gsap.set([...lines, tagline, taglineEn, divider, sub], { opacity: 0, y: 24 });

  function playEntrance() {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(lines, { opacity: 1, y: 0, duration: 0.9, stagger: 0.15 })
      .to(tagline, { opacity: 1, y: 0, duration: 0.7 }, '-=0.3')
      .to(taglineEn, { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
      .to(divider, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
      .to(sub, { opacity: 1, y: 0, duration: 0.7 }, '-=0.2');
  }

  window.addEventListener('loaderDone', playEntrance, { once: true });

})();

/* ─────────────────────────────────────────
   2. THREE.JS HERO SCENE
   Fixes:
   — Shapes always visible (no scroll reveal)
   — Shapes stay visible while scrolling
   — Parallax reduced so shapes don't flee the mouse
   — Wider, more dramatic scatter across the canvas
───────────────────────────────────────── */
(function initHero() {

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // ── Renderer ──────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha:     true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ── Scene & Camera ────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog   = new THREE.FogExp2(0x000000, 0.018); // lighter fog so back orbs stay visible

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    120
  );
  camera.position.set(0, 0, 10);

  // ── Lighting ──────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x0a0000, 0.5);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0xff1100, 3.0, 28);
  pointLight.position.set(0, 0, 5);
  scene.add(pointLight);

  // Secondary fill light from the left — adds depth
  const fillLight = new THREE.PointLight(0x990000, 1.2, 20);
  fillLight.position.set(-6, 3, 2);
  scene.add(fillLight);

  // ── Orb Configuration ─────────────────────────────
  // Scattered across the full canvas in 3 depth layers
  // [x,     y,     z,    scale, emissiveIntensity, colorHex]
  const orbConfigs = [
    // ── Far corners — top-left & bottom-right
    [ -6.5,   3.2,   0.5,  0.75,  2.8,  0xff1a00 ],
    [  6.2,  -3.0,   0.8,  0.68,  2.6,  0xff2200 ],
    // ── Top-right & bottom-left
    [  5.8,   3.5,  -1.0,  0.60,  2.2,  0xcc0000 ],
    [ -5.5,  -2.8,  -0.8,  0.55,  2.0,  0xdd0800 ],
    // ── Mid edges — left & right
    [ -7.0,   0.2,  -1.5,  0.50,  1.8,  0xee1100 ],
    [  7.2,   0.5,  -1.2,  0.48,  1.7,  0xcc0000 ],
    // ── Center cluster — slightly off-center
    [ -1.5,   4.0,  -2.5,  0.42,  1.5,  0xdd0000 ],
    [  2.0,  -4.2,  -2.0,  0.38,  1.4,  0xff1100 ],
    // ── Deep background — subtle atmosphere
    [ -3.5,  -0.5,  -5.0,  0.32,  1.0,  0x990000 ],
    [  3.8,   1.5,  -5.5,  0.28,  0.9,  0x880000 ],
    [  0.5,   0.0,  -6.0,  0.22,  0.7,  0x770000 ],
  ];

  const icoGeo = new THREE.IcosahedronGeometry(1, 1);

  const orbs = orbConfigs.map((cfg, i) => {
    const [bx, by, bz, scale, emInt, color] = cfg;

    const mat = new THREE.MeshStandardMaterial({
      color:             color,
      emissive:          color,
      emissiveIntensity: emInt,
      roughness:         0.22,
      metalness:         0.65,
      transparent:       true,
      opacity:           1,       // always fully visible
    });

    const mesh = new THREE.Mesh(icoGeo, mat);
    mesh.scale.setScalar(scale);
    mesh.position.set(bx, by, bz);

    mesh.userData = {
      baseX:  bx,
      baseY:  by,
      baseZ:  bz,
      // Sine-wave float — unique per orb
      freqX:  0.18 + i * 0.05,
      freqY:  0.14 + i * 0.035,
      phaseX: (i * 1.37) % (Math.PI * 2),
      phaseY: (i * 0.89) % (Math.PI * 2),
      ampX:   0.18 + (i % 3) * 0.06,
      ampY:   0.14 + (i % 4) * 0.04,
      // Rotation speeds
      rotSpeedX: (0.08 + i * 0.025) * (i % 2 === 0 ?  1 : -1),
      rotSpeedY: (0.06 + i * 0.018) * (i % 3 === 0 ?  1 : -1),
      rotSpeedZ: (0.04 + i * 0.012),
    };

    scene.add(mesh);
    return mesh;
  });

  // ── Post-Processing — Bloom ────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(canvas.offsetWidth, canvas.offsetHeight),
    1.5,   // strength
    0.45,  // radius
    0.08   // threshold
  );
  composer.addPass(bloom);

  // ── Mouse Parallax ────────────────────────────────
  // Reduced strength so orbs shift gently and never fly off screen
  const mouse     = { x: 0, y: 0 };
  const mouseLerp = { x: 0, y: 0 };
  const PARALLAX_STRENGTH = 0.25; // was 0.65 — much gentler now
  const LERP_FACTOR       = 0.035;

  window.addEventListener('mousemove', (e) => {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ── Clock ─────────────────────────────────────────
  const clock = new THREE.Clock();

  // ── Animate ───────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Lerp mouse
    mouseLerp.x += (mouse.x - mouseLerp.x) * LERP_FACTOR;
    mouseLerp.y += (mouse.y - mouseLerp.y) * LERP_FACTOR;

    orbs.forEach((orb) => {
      const d = orb.userData;

      // Sine wave drift
      const floatX = Math.sin(elapsed * d.freqX + d.phaseX) * d.ampX;
      const floatY = Math.cos(elapsed * d.freqY + d.phaseY) * d.ampY;

      // Depth-scaled parallax — back orbs shift less
      const depthFactor = THREE.MathUtils.mapLinear(d.baseZ, -6.0, 1.0, 0.15, 0.6);
      const parallaxX   = mouseLerp.x * PARALLAX_STRENGTH * depthFactor;
      const parallaxY   = mouseLerp.y * PARALLAX_STRENGTH * depthFactor;

      orb.position.x = d.baseX + floatX + parallaxX;
      orb.position.y = d.baseY + floatY + parallaxY;
      orb.position.z = d.baseZ;

      // Self-rotation
      orb.rotation.x += d.rotSpeedX * 0.01;
      orb.rotation.y += d.rotSpeedY * 0.01;
      orb.rotation.z += d.rotSpeedZ * 0.008;
    });

    // Point light heartbeat
    pointLight.intensity = 3.0 + Math.sin(elapsed * 1.4) * 0.8;

    composer.render();
  }

  animate();

  // ── Resize ────────────────────────────────────────
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }

  window.addEventListener('resize', onResize);
  onResize();

})();


/* ─────────────────────────────────────────
   2b. HERO SLIDESHOW
───────────────────────────────────────── */
(function initSlideshow() {

  const slides    = document.querySelectorAll('.hero__slide');
  const dots      = document.querySelectorAll('.hero__dot');
  const bar       = document.querySelector('.hero__progress-bar');
  const hero      = document.querySelector('.hero');

  if (!slides.length) return;

  const DURATION  = 4000;
  let current     = 0;
  let paused      = false;
  let startTime   = null;
  let rafId       = null;

  function goTo(index) {
    const prev = current;

    slides[prev].classList.remove('active');
    slides[prev].classList.add('exit');
    dots[prev].classList.remove('active');

    slides[index].classList.add('active');
    dots[index].classList.add('active');

    setTimeout(() => {
      slides[prev].classList.remove('exit');
    }, 900);

    current   = index;
    startTime = performance.now();
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
    requestAnimationFrame(tickBar);
  }

  function tickBar(now) {
    if (paused) return;
    if (!startTime) startTime = now;
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / DURATION, 1);

    if (bar) {
      bar.style.transition = `width ${DURATION}ms linear`;
      bar.style.width      = (progress * 100) + '%';
    }

    if (progress < 1) {
      rafId = requestAnimationFrame(tickBar);
    } else {
      goTo((current + 1) % slides.length);
    }
  }

  // Dots click
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

  // Pause on hover
  hero.addEventListener('mouseenter', () => { paused = true;  cancelAnimationFrame(rafId); });
  hero.addEventListener('mouseleave', () => {
    paused    = false;
    startTime = performance.now();
    rafId     = requestAnimationFrame(tickBar);
  });

  // Kick off
  startTime = performance.now();
  requestAnimationFrame(tickBar);

})();


/* ─────────────────────────────────────────
   3. NAVBAR
───────────────────────────────────────── */
(function initNavbar() {

  const navbar      = document.querySelector('.navbar');
  const toggle      = document.querySelector('.navbar__menu-toggle');
  const mobileMenu  = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.navbar__mobile-link');

  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      document.body.classList.toggle('menu-open', isOpen);
    });
    
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('is-open');
        mobileMenu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('menu-open');
      });
    });
  }

})();


/* ─────────────────────────────────────────
   4. SCROLL REVEAL
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   4. SCROLL REVEAL (GSAP ScrollTrigger)
───────────────────────────────────────── */
(function initReveal() {

  const sections = document.querySelectorAll('.reveal-section');
  const items    = document.querySelectorAll('.reveal-item');

  if (!sections.length && !items.length) return;

  // Fallback: if GSAP somehow didn't load, just show everything via the old CSS classes
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    sections.forEach(el => el.classList.add('is-visible'));
    items.forEach(el    => el.classList.add('is-visible'));
    return;
  }

  sections.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
      },
    });
  });

  // Group items by their parent so siblings (e.g. pricing cards, testimonials)
  // stagger together instead of all firing on their own individual scroll position
  const groups = new Map();
  items.forEach((el) => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });

  groups.forEach((group) => {
    gsap.to(group, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: {
        trigger: group[0],
        start: 'top 90%',
      },
    });
  });

})();


/* ─────────────────────────────────────────
   5. STATS COUNTER
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   5. STATS COUNTER (GSAP)
───────────────────────────────────────── */
(function initStats() {

  const numbers = document.querySelectorAll('.stats__number[data-target]');
  if (!numbers.length) return;

  // Fallback if GSAP didn't load — snap straight to final numbers
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    numbers.forEach(el => {
      el.textContent = parseInt(el.dataset.target, 10).toLocaleString();
    });
    return;
  }

  numbers.forEach((el) => {
    const target = parseInt(el.dataset.target, 10);
    const counter = { value: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: target,
          duration: 1.8,
          ease: 'power4.out',
          onUpdate: () => {
            el.textContent = Math.round(counter.value).toLocaleString();
          },
        });
      },
    });
  });

})();


/* ─────────────────────────────────────────
   6. FOOTER YEAR
───────────────────────────────────────── */
(function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();
