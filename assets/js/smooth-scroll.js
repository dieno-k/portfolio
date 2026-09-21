(() => {
  const root = document.documentElement;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const locked = () => document.body.matches('.menu-open, .modal-open');
  const panels = new Map();
  // Page and dialog scrolling share the same damping and navigation curve.
  const createScroller = (element = null) => {
    const read = () => element ? element.scrollTop : window.scrollY;
    const viewport = () => element ? element.clientHeight : window.innerHeight;
    const maximum = () => Math.max(0, element ? element.scrollHeight - element.clientHeight : root.scrollHeight - root.clientHeight);
    const enabled = () => {
      if (!element) return !locked();
      const dialog = element.closest('dialog');
      return dialog?.open && [...document.querySelectorAll('dialog[open]')].at(-1) === dialog;
    };
    let current = read(), target = current, lastWritten = current;
    let lastTime = 0, frameId = 0, navigation = null;
    const stop = () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
      navigation = null;
      current = target = lastWritten = read();
    };
    const write = value => {
      if (element) element.scrollTo({ top: value, behavior: 'instant' });
      else window.scrollTo({ top: value, behavior: 'instant' });
      lastWritten = read();
    };
    const tick = time => {
      if (!enabled()) { stop(); return; }
      const elapsed = Math.min(64, Math.max(1, time - lastTime));
      lastTime = time;
      target = clamp(target, 0, maximum());
      if (navigation) {
        const progress = clamp((time - navigation.started) / navigation.duration, 0, 1);
        const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        current = navigation.from + (target - navigation.from) * eased;
        write(current);
        if (progress === 1) {
          const complete = navigation.onComplete;
          stop(); complete?.(); return;
        }
      } else {
        current += (target - current) * (1 - Math.exp(-elapsed / 150));
        if (Math.abs(target - current) < .5) { write(target); stop(); return; }
        write(current);
      }
      frameId = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frameId) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(tick);
    };
    const scrollTo = (value, { duration = 1100, onComplete } = {}) => {
      stop();
      if (!enabled()) return;
      target = clamp(value, 0, maximum());
      if (Math.abs(target - current) < .5) { onComplete?.(); return; }
      navigation = { from: current, started: performance.now(), duration: Math.max(1, duration), onComplete };
      start();
    };
    const addDelta = delta => {
      if (!enabled()) return;
      if (!frameId || navigation || delta * (target - current) < 0) current = target = read();
      navigation = null;
      target = clamp(target + delta, 0, maximum());
      start();
    };
    (element || window).addEventListener('scroll', () => {
      if (!frameId || Math.abs(read() - lastWritten) > 2) stop();
    }, { passive: true });
    return { stop, scrollTo, addDelta, viewport, maximum };
  };
  const page = createScroller();
  const panelScroller = element => {
    if (!panels.has(element)) panels.set(element, createScroller(element));
    return panels.get(element);
  };
  const stop = () => { page.stop(); panels.forEach(controller => controller.stop()); };
  const route = event => {
    const nested = event.composedPath().find(element => element instanceof Element && element !== root && element !== document.body && element.scrollHeight > element.clientHeight + 1 && /auto|scroll|overlay/.test(getComputedStyle(element).overflowY));
    if (nested) {
      if (nested.matches('.project-modal-shell, .resume-modal-shell') && nested.closest('dialog[open]')) return panelScroller(nested);
      return null;
    }
    return locked() ? null : page;
  };
  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const controller = route(event);
    if (!controller) { stop(); return; }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? controller.viewport() : 1;
    const delta = event.deltaY * unit;
    if (!delta) return;
    event.preventDefault(); controller.addDelta(delta);
  }, { passive: false });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, video, [contenteditable], [role="button"]')) return;
    const controller = route(event);
    if (!controller) return;
    const distance = controller.viewport() * .85;
    const delta = { ArrowDown: 100, ArrowUp: -100, PageDown: distance, PageUp: -distance, ' ': event.shiftKey ? -distance : distance }[event.key];
    if (delta !== undefined) { event.preventDefault(); controller.addDelta(delta); }
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); controller.scrollTo(event.key === 'Home' ? 0 : controller.maximum());
    }
  });
  // Touch retains native momentum; dragging, focus changes and nested dialogs stop inertia.
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('pointerdown', stop, { passive: true });
  ['resize', 'popstate', 'hashchange', 'pagehide'].forEach(name => window.addEventListener(name, stop));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  new MutationObserver(stop).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const dialogObserver = new MutationObserver(stop);
  document.querySelectorAll('dialog').forEach(dialog => dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  window.portfolioScroll = { scrollTo: page.scrollTo, stop, scrollElementTo: (element, value, options) => panelScroller(element).scrollTo(value, options) };
})();
