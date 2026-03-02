/* ─────────────────────────────────────────────────────────────────────────────
   main.js — GSAP animations, cursor, magnetic hover, text scramble
   Requires: gsap, ScrollTrigger (loaded before this file)
───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Register plugins ─────────────────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  /* ── Footer year ──────────────────────────────────────────────────────── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ────────────────────────────────────────────────────────────────────────
     HERO — SPLIT EACH NAME LINE INTO CHARS
     Each .hero-line is processed independently so the block structure
     (first/last name on separate lines) is preserved.
  ─────────────────────────────────────────────────────────────────────────── */
  document.querySelectorAll('.hero-name .hero-line').forEach((line) => {
    const raw = line.textContent.trim();
    line.innerHTML = raw.split('').map((ch) => {
      if (ch === ' ') {
        return `<span class="char" style="display:inline-block;min-width:0.28em">&nbsp;</span>`;
      }
      return `<span class="char">${ch}</span>`;
    }).join('');
  });

  /* ────────────────────────────────────────────────────────────────────────
     LOAD SEQUENCE TIMELINE
  ─────────────────────────────────────────────────────────────────────────── */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Nav drifts down from top
  tl.from('.glass-nav', {
    opacity: 0,
    y: -16,
    duration: 0.9,
    ease: 'power2.out',
  }, 0.1);

  // t=0.0 — hero glass panel scales up gently
  tl.from('.hero-panel', {
    opacity: 0,
    y: 28,
    scale: 0.97,
    duration: 1.1,
    ease: 'power3.out',
  }, 0.0);

  // t=0.4 — hero name chars sweep left → right via clip-path
  // Using from() so GSAP owns the initial hidden state — no CSS dependency.
  // If GSAP fails to load, chars stay visible (their natural state).
  tl.from('.hero-name .char', {
    clipPath: 'inset(0 100% 0 0)',
    duration: 0.5,
    stagger: 0.04,
    ease: 'power2.out',
  }, 0.4);

  // t=1.2 — brand mark slides in from left
  tl.to('.hero-brand', {
    opacity: 1,
    x: 0,
    duration: 0.65,
  }, 1.2);

  // t=1.6 — discipline tags stagger up
  tl.to('.hero-tag', {
    opacity: 1,
    y: 0,
    stagger: 0.12,
    duration: 0.5,
  }, 1.6);

  // t=2.1 — scroll indicator
  tl.to('.scroll-indicator', {
    opacity: 1,
    duration: 0.5,
  }, 2.1);

  /* ────────────────────────────────────────────────────────────────────────
     MAGNETIC HOVER
  ─────────────────────────────────────────────────────────────────────────── */
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * 0.36;
      const dy   = (e.clientY - cy) * 0.36;
      gsap.to(el, { x: dx, y: dy, duration: 0.25, ease: 'power2.out' });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.55)' });
    });
  });

  /* ────────────────────────────────────────────────────────────────────────
     TEXT SCRAMBLE
  ─────────────────────────────────────────────────────────────────────────── */
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function scramble(el) {
    const target     = el.dataset.scramble || el.textContent.trim();
    const totalSteps = target.length * 5;
    let   step       = 0;

    function frame() {
      el.textContent = target.split('').map((ch, i) => {
        if (ch === ' ') return ' ';
        if (step / 5 >= i) return ch;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }).join('');

      step++;
      if (step <= totalSteps) {
        setTimeout(() => requestAnimationFrame(frame), 38);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(frame);
  }

  /* ────────────────────────────────────────────────────────────────────────
     SCROLL TRIGGERS
  ─────────────────────────────────────────────────────────────────────────── */

  // Section labels — scramble once on enter
  document.querySelectorAll('.section-label').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start:   'top 85%',
      once:    true,
      onEnter: () => scramble(el),
    });
  });

  // .reveal — fade + slide up
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start:   'top 88%',
        once:    true,
      },
    });
  });

  // Skill pills — staggered entrance
  gsap.to('.skill-pill', {
    opacity: 1,
    y: 0,
    stagger: 0.04,
    duration: 0.5,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.skill-grid',
      start:   'top 84%',
      once:    true,
    },
  });

  // Hero content — subtle parallax scrub down
  gsap.to('.hero-panel', {
    yPercent: -12,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start:   'top top',
      end:     'bottom top',
      scrub:   true,
    },
  });

  // Scroll indicator fades out quickly on scroll
  gsap.to('.scroll-indicator', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start:   'top top',
      end:     '12% top',
      scrub:   true,
    },
  });

})();
