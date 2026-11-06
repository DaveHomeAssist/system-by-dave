/* Home splash motion. Destination clicks stay on the workspace navigate() handlers. */
(function () {
  const panel = document.getElementById('home-panel');
  const canvas = document.getElementById('snow');
  const gsap = window.gsap;
  if (!panel || !canvas || !gsap) return;

  const brand = document.querySelector('header .brand');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeDefault = themeMeta ? themeMeta.getAttribute('content') || '#edf5fb' : '#edf5fb';
  const aurora = panel.querySelector('.snow-aurora');
  const chars = panel.querySelectorAll('.snow-char');
  const mark = panel.querySelector('.snow-mark');
  const eyebrow = panel.querySelector('.snow-eyebrow');
  const lede = panel.querySelector('.snow-lede');
  const foot = panel.querySelector('.snow-foot');
  const cards = panel.querySelectorAll('.home-choices button');
  const ctx = canvas.getContext('2d');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  let flakes = [];
  let width = 0;
  let height = 0;
  let snowOn = false;
  let frame = 0;
  let intro = null;
  let drift = null;
  let spin = null;
  let played = false;

  function resize() {
    const rect = panel.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    if (Math.abs(nextWidth - width) < 2 && Math.abs(nextHeight - height) < 2) return;
    width = nextWidth;
    height = nextHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(36, Math.min(90, Math.round((width * height) / 11000)));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.7 + Math.random() * 2.2,
      drift: -0.3 + Math.random() * 0.6,
      speed: 0.28 + Math.random() * 0.85,
      alpha: 0.3 + Math.random() * 0.5,
      twinkle: Math.random() * Math.PI * 2
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const flake of flakes) {
      flake.y += flake.speed;
      flake.x += flake.drift + Math.sin(flake.twinkle) * 0.12;
      flake.twinkle += 0.02;
      if (flake.y > height + 4) {
        flake.y = -4;
        flake.x = Math.random() * width;
      }
      if (flake.x < -4) flake.x = width + 4;
      if (flake.x > width + 4) flake.x = -4;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(237,245,251,' + flake.alpha.toFixed(3) + ')';
      ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    frame = 0;
    if (!snowOn) return;
    draw();
    frame = requestAnimationFrame(loop);
  }

  function startSnow() {
    if (snowOn || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
    if (!width) resize();
    if (width < 2 || height < 2) return;
    snowOn = true;
    frame = requestAnimationFrame(loop);
  }

  function stopSnow() {
    snowOn = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function homeVisible() {
    return !panel.hidden && !document.hidden;
  }

  function playMotion() {
    if (!intro) return;
    if (!played) {
      played = true;
      intro.play(0);
      return;
    }
    intro.resume();
    if (intro.progress() === 1) {
      drift?.resume();
      spin?.resume();
    }
  }

  function pauseMotion() {
    intro?.pause();
    drift?.pause();
    spin?.pause();
  }

  function syncChrome() {
    const home = !panel.hidden;
    if (brand) {
      if (home) brand.setAttribute('aria-hidden', 'true');
      else brand.removeAttribute('aria-hidden');
    }
    if (themeMeta) themeMeta.setAttribute('content', home ? '#071520' : themeDefault);
  }

  function sync() {
    syncChrome();
    if (homeVisible()) {
      playMotion();
      startSnow();
    } else {
      pauseMotion();
      stopSnow();
    }
  }

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const unbind = [];
    intro = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onComplete() {
        drift?.play();
        spin?.play();
      }
    });
    intro
      .fromTo(eyebrow, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.65 }, 0.15)
      .fromTo(chars, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power4.out' }, 0.28)
      .fromTo(mark, { opacity: 0, scale: 0.5, rotation: -30 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.6)' }, '-=0.35')
      .fromTo(lede, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.28')
      .fromTo(cards, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.07 }, '-=0.2')
      .fromTo(foot, { opacity: 0 }, { opacity: 1, duration: 0.45 }, '-=0.15');
    drift = gsap.to(aurora, {
      scale: 1.14,
      xPercent: 2.5,
      yPercent: -1.5,
      duration: 14,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      paused: true
    });
    spin = gsap.to(mark, { rotation: 360, duration: 48, ease: 'none', repeat: -1, paused: true });
    if (finePointer.matches) {
      for (const card of cards) {
        const enter = () => gsap.to(card, { y: -4, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        const leave = () => gsap.to(card, { y: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointerleave', leave);
        unbind.push(() => {
          card.removeEventListener('pointerenter', enter);
          card.removeEventListener('pointerleave', leave);
          gsap.set(card, { clearProps: 'transform' });
        });
      }
    }
    return () => {
      stopSnow();
      intro = null;
      drift = null;
      spin = null;
      played = false;
      for (const undo of unbind) undo();
    };
  });

  new ResizeObserver(() => {
    resize();
    if (homeVisible()) startSnow();
  }).observe(panel);
  new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', sync);
  // workspace.js navigates during its module script, which runs before this event.
  document.addEventListener('DOMContentLoaded', () => {
    resize();
    sync();
  });
})();
