/* ═══════════════════════════════════════════════════
   LIONHEART GYM — main.js
   Three.js Hero Scene + Loader + Site Scripts
═══════════════════════════════════════════════════ */

import * as THREE          from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


/* ─────────────────────────────────────────
   1. LOADER
   — Always shows for a minimum of 2500ms
     so it's visible even on fast loads/refreshes
───────────────────────────────────────── */
(function initLoader() {

  const loader = document.getElementById('loader');
  const fill   = document.querySelector('.loader__bar-fill');
  if (!loader || !fill) return;

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

      loader.addEventListener('transitionend', () => {
        loader.remove();
      }, { once: true });
    }, 300);
  }

  requestAnimationFrame(tickLoader);

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
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ── Scene & Camera ────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog   = new THREE.FogExp2(0x000000, 0.018); // lighter fog so back orbs stay visible

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.offsetWidth / canvas.offsetHeight,
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
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }

  window.addEventListener('resize', onResize);

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
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('is-open');
        mobileMenu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }

})();


/* ─────────────────────────────────────────
   4. SCROLL REVEAL
───────────────────────────────────────── */
(function initReveal() {

  const sections = document.querySelectorAll('.reveal-section');
  const items    = document.querySelectorAll('.reveal-item');

  if (!('IntersectionObserver' in window)) {
    sections.forEach(el => el.classList.add('is-visible'));
    items.forEach(el    => el.classList.add('is-visible'));
    return;
  }

  const opts = (threshold) => ({ threshold });

  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        sectionObs.unobserve(e.target);
      }
    });
  }, opts(0.12));

  const itemObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        itemObs.unobserve(e.target);
      }
    });
  }, opts(0.15));

  sections.forEach(el => sectionObs.observe(el));
  items.forEach(el    => itemObs.observe(el));

})();


/* ─────────────────────────────────────────
   5. STATS COUNTER
───────────────────────────────────────── */
(function initStats() {

  const numbers = document.querySelectorAll('.stats__number[data-target]');
  if (!numbers.length) return;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start    = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(easeOutQuart(progress) * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }

    requestAnimationFrame(tick);
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  numbers.forEach(el => obs.observe(el));

})();


/* ─────────────────────────────────────────
   6. FOOTER YEAR
───────────────────────────────────────── */
(function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();