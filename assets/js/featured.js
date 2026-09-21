(() => {
  const stage = document.querySelector('#featuredStage');
  const track = document.querySelector('#featuredTrack');
  if (!stage || !track) return;

  const cards = [...track.querySelectorAll('.featured-card')];
  const backdrop = document.querySelector('#featuredBackdrop');
  // Each project keeps its own layer so rapid changes never replace a fading source.
  const layers = cards.map(card => {
    const layer = document.createElement('div');
    layer.className = 'featured-backdrop-layer';
    layer.style.backgroundImage = `url("${card.dataset.bg}")`;
    return layer;
  });
  backdrop.replaceChildren(...layers);
  const dots = [...stage.querySelectorAll('[data-featured-index]')];
  const prev = document.querySelector('#featuredPrev');
  const next = document.querySelector('#featuredNext');
  const caption = document.querySelector('#featuredCaption');
  const modal = document.querySelector('#previewModal');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let active = 0;
  let offset = 0;
  let visibleLayer = -1;
  let backdropRequest = 0;
  let offsets = [];
  let inView = false;
  let gesture = null;
  let suppressClickUntil = 0;
  let slideFrame = 0;

  const play = (video, shouldPlay) => {
    if (shouldPlay && (video.getAttribute('src') || video.querySelector('source'))) {
      if (video.paused) video.play().catch(() => {});
    } else video.pause();
  };
  const syncMedia = () => {
    const playing = inView && !document.hidden && !modal.open;
    // All card videos loop together, including the neighbouring cards during a slide.
    cards.forEach(card => {
      card.querySelectorAll('video').forEach(video => play(video, playing));
    });
  };

  const backdropImages = cards.map(card => {
    const image = new Image();
    image.src = card.dataset.bg;
    return image.decode().catch(() => {});
  });
  const updateBackdrop = async index => {
    const request = ++backdropRequest;
    if (index === visibleLayer) return;
    // Decode first, then crossfade both layers together for a full second.
    await backdropImages[index];
    if (request !== backdropRequest) return;
    visibleLayer = index;
    layers.forEach((layer, i) => layer.classList.toggle('is-visible', i === index));
  };

  const draw = value => {
    offset = value;
    track.style.transform = `translate3d(${value}px, 0, 0)`;
  };

  const glideTo = (destination, animate) => {
    cancelAnimationFrame(slideFrame);
    slideFrame = 0;
    // The user explicitly requested smooth navigation and subtle depth motion.
    if (!animate || Math.abs(destination - offset) < .2) {
      draw(destination);
      return;
    }
    const from = offset;
    const started = performance.now();
    const duration = 1100;
    const frame = time => {
      const progress = clamp((time - started) / duration, 0, 1);
      const eased = progress < .5
        ? 4 * Math.pow(progress, 3)
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      draw(from + (destination - from) * eased);
      slideFrame = progress < 1 ? requestAnimationFrame(frame) : 0;
    };
    slideFrame = requestAnimationFrame(frame);
  };

  const select = (index, animate = true) => {
    active = clamp(index, 0, cards.length - 1);
    track.classList.remove('is-dragging');
    glideTo(offsets[active], animate);
    cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === active);
      card.setAttribute('aria-current', String(i === active));
      card.tabIndex = i === active ? 0 : -1;
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === active);
      dot.setAttribute('aria-current', String(i === active));
    });
    prev.disabled = active === 0;
    next.disabled = active === cards.length - 1;
    const card = cards[active];
    caption.textContent = `${card.dataset.title} ${card.dataset.type} — ${card.dataset.year}`;
    updateBackdrop(active);
    syncMedia();
  };

  const measure = () => {
    if (gesture) finishGesture(null, true);
    offsets = cards.map(card => stage.clientWidth / 2 - card.offsetLeft - card.offsetWidth / 2);
    select(active, false);
  };

  const setupScrollDepth = () => {
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);
    const carousel = stage.querySelector('.featured-carousel');
    const heading = stage.querySelector('.featured-heading');
    const media = cards.map(card => card.querySelector('.featured-media video'));
    const motion = gsap.matchMedia();

    motion.add({
      desktop: '(min-width: 600px)',
      all: 'all'
    }, context => {
      const desktop = context.conditions.desktop;
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.15,
          invalidateOnRefresh: true
        }
      });

      timeline
        .fromTo(backdrop,
          { yPercent: -9, scale: 1.16 },
          { yPercent: 9, scale: 1.03, duration: 1 }, 0)
        .fromTo(carousel,
          { y: desktop ? 110 : 54 },
          { y: desktop ? -76 : -34, duration: 1 }, 0)
        .fromTo(heading,
          { y: desktop ? 58 : 30 },
          { y: desktop ? -36 : -18, duration: 1 }, 0)
        .fromTo(cards,
          { y: desktop ? 68 : 34, z: desktop ? -90 : -45, rotateX: 5 },
          { y: 0, z: 34, rotateX: 0, duration: .52 }, 0)
        .to(cards,
          { y: desktop ? -50 : -24, z: desktop ? -42 : -20, rotateX: -2.5, duration: .48 }, .52)
        .fromTo(media,
          { yPercent: -5, scale: 1.08 },
          { yPercent: 5, scale: 1, duration: 1 }, 0);
    });
  };

  track.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: event.timeStamp, offset, velocity: 0, dragging: false };
  });
  track.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) < 8) return;
      cancelAnimationFrame(slideFrame);
      slideFrame = 0;
      gesture.offset = offset;
      gesture.dragging = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - gesture.lastTime);
    gesture.velocity = (event.clientX - gesture.lastX) / elapsed;
    gesture.lastX = event.clientX;
    gesture.lastTime = event.timeStamp;
    let destination = gesture.offset + dx;
    const min = offsets[offsets.length - 1], max = offsets[0];
    if (destination > max) destination = max + (destination - max) * .18;
    if (destination < min) destination = min + (destination - min) * .18;
    draw(destination);
  });

  function finishGesture(event, cancelled = false) {
    if (!gesture || event && event.pointerId !== gesture.id) return;
    const completed = gesture;
    gesture = null;
    if (track.hasPointerCapture(completed.id)) track.releasePointerCapture(completed.id);
    if (!completed.dragging) return;
    suppressClickUntil = performance.now() + 400;
    let index = active;
    if (!cancelled) {
      const velocity = event.timeStamp - completed.lastTime < 100 ? completed.velocity : 0;
      const destination = offset + clamp(velocity * 160, -260, 260);
      index = offsets.reduce((best, value, i) => Math.abs(value - destination) < Math.abs(offsets[best] - destination) ? i : best, 0);
      // A short, deliberate swipe also advances a card.
      const distance = event.clientX - completed.x;
      if (index === active && Math.abs(distance) > Math.min(90, cards[active].offsetWidth * .2)) index = active + (distance < 0 ? 1 : -1);
    }
    select(index);
  }
  track.addEventListener('pointerup', event => finishGesture(event));
  track.addEventListener('pointercancel', event => finishGesture(event, true));
  track.addEventListener('lostpointercapture', event => finishGesture(event, true));
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Ignore a vertical touch gesture on the otherwise invisible side controls.
  [prev, next].forEach((button, i) => {
    let press = null;
    let moved = false;
    button.addEventListener('pointerdown', event => {
      press = { x: event.clientX, y: event.clientY };
      moved = false;
    });
    button.addEventListener('pointermove', event => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) moved = true;
    });
    button.addEventListener('pointercancel', () => { moved = true; press = null; });
    button.addEventListener('click', event => {
      if (!moved || event.detail === 0) select(active + (i === 0 ? -1 : 1));
      press = null;
    });
  });
  dots.forEach(dot => dot.addEventListener('click', () => select(Number(dot.dataset.featuredIndex))));
  stage.addEventListener('keydown', event => {
    const index = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: cards.length - 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault();
    select(index);
    if (event.target.closest('.featured-card')) cards[active].focus({ preventScroll: true });
  });

  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncMedia();
  }).observe(stage);
  new MutationObserver(syncMedia).observe(modal, { attributes: true, attributeFilter: ['open'] });
  document.addEventListener('visibilitychange', syncMedia);
  setupScrollDepth();
  measure();
})();
