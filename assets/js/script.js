(() => {
  const header = document.querySelector('#siteHeader');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#siteNav');
  const modal = document.querySelector('#previewModal');
  const modalClose = document.querySelector('#modalClose');
  const modalMedia = document.querySelector('#modalMedia');
  const modalTitle = document.querySelector('#modalTitle');
  const modalCategory = document.querySelector('#modalCategory');
  const modalProjectType = document.querySelector('#modalProjectType');
  const modalScope = document.querySelector('#modalScope');
  const modalDescription = document.querySelector('#modalDescription');
  const modalTools = document.querySelector('#modalTools');
  const modalWebsite = document.querySelector('#modalWebsite');
  const modalGuide = document.querySelector('#modalGuide');
  const guidebook = document.querySelector('#guidebookModal');
  const guidebookShell = document.querySelector('#guidebookShell');
  const guidebookClose = document.querySelector('#guidebookClose');
  const guidebookSlide = document.querySelector('#guidebookSlide');
  const guidebookPrev = document.querySelector('#guidebookPrev');
  const guidebookNext = document.querySelector('#guidebookNext');
  const guidebookCurrent = document.querySelector('#guidebookCurrent');
  const guidebookTotal = document.querySelector('#guidebookTotal');
  const guidebookFullscreen = document.querySelector('#guidebookFullscreen');
  const resumeOpen = document.querySelector('#resumeOpen');
  const resumeModal = document.querySelector('#resumeModal');
  const resumeClose = document.querySelector('#resumeClose');
  let lastScrollY = window.scrollY;
  let guideSlides = [];
  let guideIndex = 0;

  // A real text cutout lets the page show through the rounded hover background.
  const svgNode = (tag, attributes = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  };
  document.querySelectorAll('.desktop-nav a').forEach((link, index) => {
    const label = document.createElement('span');
    label.className = 'nav-label';
    label.textContent = link.textContent.trim();
    const svg = svgNode('svg', { class: 'nav-knockout', 'aria-hidden': 'true', focusable: 'false' });
    const defs = svgNode('defs');
    const maskId = `nav-cutout-${index}`;
    const mask = svgNode('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: '100%', height: '100%', 'mask-type': 'luminance' });
    const letters = svgNode('text', { x: '50%', y: '50%', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'black' });
    letters.textContent = label.textContent;
    mask.append(svgNode('rect', { width: '100%', height: '100%', fill: 'white' }), letters);
    defs.append(mask);
    svg.append(defs, svgNode('rect', { width: '100%', height: '100%', rx: '6', fill: 'currentColor', mask: `url(#${maskId})` }));
    link.replaceChildren(label, svg);
  });

  // Replace fixed character slots in a shuffled order, at 20 ms per slot.
  const contactButton = document.querySelector('.contact-cta');
  const contactText = contactButton?.querySelector('.contact-cta-english');
  if (contactText) {
    const labels = [contactText.dataset.contactDefault, contactText.dataset.contactHover].map((text) => Array.from(text));
    const count = Math.max(...labels.map((label) => label.length));
    const shuffle = (items) => {
      for (let i = items.length - 1; i > 0; i -= 1) {
        const other = Math.floor(Math.random() * (i + 1));
        [items[i], items[other]] = [items[other], items[i]];
      }
      return items;
    };
    const pad = (letters) => {
      const positions = shuffle(Array.from({ length: count }, (_, index) => index))
        .slice(0, letters.length).sort((a, b) => a - b);
      const slots = Array(count).fill('');
      positions.forEach((position, index) => { slots[position] = letters[index]; });
      return slots;
    };
    const states = labels.map(pad);
    const order = shuffle(Array.from({ length: count }, (_, index) => index));
    const slots = states[0].map((letter) => {
      const span = document.createElement('span');
      span.textContent = letter;
      return span;
    });
    contactText.replaceChildren(...slots);
    let frame = 0;
    let hovered = false;
    let active = false;
    const syncContact = () => {
      const next = hovered || contactButton.matches(':focus-visible');
      if (next === active) return;
      active = next;
      cancelAnimationFrame(frame);
      const target = states[Number(active)];
      const started = performance.now();
      let cursor = 0;
      const replace = (now) => {
        const through = Math.min(count, Math.floor((now - started) / 20) + 1);
        while (cursor < through) {
          const index = order[cursor++];
          slots[index].textContent = target[index];
        }
        frame = cursor < count ? requestAnimationFrame(replace) : 0;
      };
      frame = requestAnimationFrame(replace);
    };
    contactButton.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      hovered = true;
      syncContact();
    });
    contactButton.addEventListener('pointerleave', () => { hovered = false; syncContact(); });
    contactButton.addEventListener('focus', syncContact);
    contactButton.addEventListener('blur', syncContact);
  }

  const updateHeader = () => {
    const currentY = window.scrollY;
    const menuOpen = nav.classList.contains('open');
    header.classList.toggle('scrolled', currentY > 24);

    if (!menuOpen) {
      if (currentY <= 40 || currentY < lastScrollY) {
        header.classList.remove('header-hidden');
      } else if (currentY > lastScrollY && currentY > 100) {
        header.classList.add('header-hidden');
      }
    }

    lastScrollY = currentY;
  };

  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    menuButton.querySelector('span').textContent = open ? 'CLOSE' : 'MENU';
    nav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    header.classList.remove('header-hidden');
  };

  menuButton.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  const scrollToSection = (target, hash) => {
    const start = window.scrollY;
    // WORK opens at its title, below the intentionally empty banner spacer.
    const visualTarget = target.id === 'work' ? target.querySelector('.featured-heading') : target;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const destination = Math.max(0, Math.min(maximum, start + visualTarget.getBoundingClientRect().top - padding));
    const distance = destination - start;
    const duration = Math.min(1500, Math.max(850, Math.abs(distance) * .18));
    const finish = () => {
      if (location.hash !== hash) history.pushState(null, '', hash);
      const addedTabIndex = !target.hasAttribute('tabindex');
      if (addedTabIndex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (addedTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    };
    window.portfolioScroll.scrollTo(destination, { duration, onComplete: finish });
  };
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      setMenu(false);
      scrollToSection(target, hash);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) setMenu(false);
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.reveal').forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
    revealObserver.observe(item);
  });

  const heroMarquee = document.querySelector('.hero-marquee-scroll');
  if (heroMarquee && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const motion = gsap.matchMedia();
    motion.add('all', () => {
      gsap.fromTo(heroMarquee,
        { x: 0 },
        {
          x: () => -Math.max(80, window.innerWidth * .12),
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1.1,
            invalidateOnRefresh: true
          }
        });
    });
  }

  const visualArchive = document.querySelector('.visual-archive');
  const visualArchiveLines = visualArchive?.querySelector('.visual-archive-lines');
  if (visualArchiveLines && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    // Reference: top/bottom -> bottom/top, linear scrub, travel 20vw / 60vw / -60vw.
    const visualTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: visualArchiveLines,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true
      }
    });
    visualArchiveLines.querySelectorAll('[data-visual-parallax]').forEach((line) => {
      const direction = line.dataset.visualDirection === 'right' ? 1 : -1;
      const amount = Number(line.dataset.visualParallax) * .1;
      visualTimeline.fromTo(line,
        { x: () => -direction * amount * window.innerWidth },
        { x: () => direction * amount * window.innerWidth, duration: 1 }, 0);
    });
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  const archiveSection = document.querySelector('#archive');
  const aboutSection = document.querySelector('#about');
  const contactSection = document.querySelector('#contact');
  const siteFooter = document.querySelector('.site-footer');
  const themeSections = [archiveSection, aboutSection, contactSection, siteFooter].filter(Boolean);
  let themeFrame = 0;

  const mixChannel = (from, to, progress) => Math.round(from + ((to - from) * progress));
  const mixColor = (from, to, progress) => `rgb(${from.map((channel, index) => mixChannel(channel, to[index], progress)).join(', ')})`;
  const updateArchiveAboutTheme = () => {
    themeFrame = 0;
    if (!visualArchive || !aboutSection || !themeSections.length) return;

    const pageY = window.scrollY;
    const visualEnd = visualArchive.getBoundingClientRect().bottom + pageY;
    const aboutStart = aboutSection.getBoundingClientRect().top + pageY;
    const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    // Begin after the final Visual Archive line has passed below the header.
    const transitionStart = visualEnd - scrollPadding;
    const transitionEnd = aboutStart - scrollPadding;
    const transitionLength = Math.max(1, transitionEnd - transitionStart);
    const progress = Math.min(1, Math.max(0, (pageY - transitionStart) / transitionLength));
    const surface = mixColor([243, 240, 232], [29, 51, 57], progress);
    const ink = mixColor([29, 51, 57], [216, 212, 203], progress);

    themeSections.forEach((section) => {
      section.style.setProperty('--section-surface', surface);
      section.style.setProperty('--section-ink', ink);
      section.style.setProperty('--section-muted', `rgba(${ink.slice(4, -1)}, .78)`);
      section.style.setProperty('--section-border', `rgba(${ink.slice(4, -1)}, .18)`);
      section.style.setProperty('--section-faint', `rgba(${ink.slice(4, -1)}, .07)`);
    });
    if (header) header.style.setProperty('--header-ink', ink);
  };
  const requestArchiveAboutTheme = () => {
    if (!themeFrame) themeFrame = requestAnimationFrame(updateArchiveAboutTheme);
  };

  window.addEventListener('scroll', requestArchiveAboutTheme, { passive: true });
  window.addEventListener('resize', requestArchiveAboutTheme);
  updateArchiveAboutTheme();

  const clearMedia = (container) => {
    container.querySelectorAll('video').forEach((video) => video.pause());
    container.replaceChildren();
  };

  const isVideoSource = (source = '') => /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(source);

  const createMedia = (source, kind, title, guide = false) => {
    const media = document.createElement(kind === 'video' ? 'video' : 'img');
    if (kind === 'video') {
      media.autoplay = true;
      media.muted = true;
      media.loop = !guide;
      media.controls = guide;
      media.playsInline = true;
      media.preload = 'metadata';
      media.src = source;
    } else {
      media.src = source;
      media.alt = `${title} 프로젝트 이미지`;
    }
    return media;
  };

  const projectDetails = (trigger) => {
    const details = new Map();
    trigger.querySelectorAll('.featured-details > div').forEach((item) => {
      const key = item.querySelector('dt')?.textContent.trim().toUpperCase();
      const value = item.querySelector('dd')?.textContent.trim();
      if (key && value) details.set(key, value);
    });
    return details;
  };

  const splitList = (value = '') => value
    .split(value.includes(',') ? ',' : '·')
    .map((item) => item.trim())
    .filter(Boolean);

  const cleanProjectType = (value = '') => value
    .replace(/^\((.*)\)$/, '$1')
    .replace(/\s*·\s*\d{4}\s*$/, '')
    .trim();

  const isTransparent = (color = '') => color === 'transparent' || /rgba\([^)]*,\s*0\s*\)/i.test(color);

  const surfaceColor = (trigger) => {
    let node = trigger;
    while (node && node !== document.documentElement) {
      const color = getComputedStyle(node).backgroundColor;
      if (color && !isTransparent(color)) return color;
      node = node.parentElement;
    }
    return '#F3F0E8';
  };

  const applyProjectPalette = (trigger) => {
    const style = getComputedStyle(trigger);
    const background = style.getPropertyValue('--card-paper').trim() || surfaceColor(trigger);
    const ink = style.getPropertyValue('--card-ink').trim() || style.color || '#1D3339';
    [modal, guidebook].forEach((dialog) => {
      dialog.style.setProperty('--project-bg', background);
      dialog.style.setProperty('--project-ink', ink);
    });
  };

  const setWebsiteAction = (trigger) => {
    const visible = trigger.dataset.hasWebsite === 'true';
    const url = trigger.dataset.website?.trim() || '';
    modalWebsite.hidden = !visible;
    if (!visible) return;
    modalWebsite.href = url || '#';
    modalWebsite.setAttribute('aria-disabled', String(!url));
  };

  const setGuideSlides = (trigger) => {
    const configured = (trigger.dataset.guide || '').split('|').map((source) => source.trim()).filter(Boolean);
    const sources = configured.length ? configured : [trigger.dataset.media];
    guideSlides = sources.filter(Boolean).map((source) => ({
      source,
      kind: isVideoSource(source) ? 'video' : 'image',
      title: trigger.dataset.title || 'Project'
    }));
    guideIndex = 0;
  };

  const renderGuideSlide = () => {
    clearMedia(guidebookSlide);
    const slide = guideSlides[guideIndex];
    if (!slide) return;
    guidebookSlide.append(createMedia(slide.source, slide.kind, slide.title, true));
    guidebookCurrent.textContent = String(guideIndex + 1).padStart(2, '0');
    guidebookTotal.textContent = String(guideSlides.length).padStart(2, '0');
    guidebookPrev.disabled = guideIndex === 0;
    guidebookNext.disabled = guideIndex === guideSlides.length - 1;
  };

  const syncGuidebookFullscreen = () => {
    const active = document.fullscreenElement === guidebookShell;
    guidebookFullscreen.setAttribute('aria-label', active ? '가이드북 전체화면 종료' : '가이드북 전체화면으로 보기');
    guidebookFullscreen.title = active ? '전체화면 종료' : '전체화면';
  };

  const toggleGuidebookFullscreen = async () => {
    try {
      if (document.fullscreenElement === guidebookShell) await document.exitFullscreen();
      else await guidebookShell.requestFullscreen();
    } catch (_) {
      // The browser can reject fullscreen when it is unavailable or user-blocked.
    }
  };

  if (!document.fullscreenEnabled || !guidebookShell.requestFullscreen) guidebookFullscreen.hidden = true;

  const galleryRoot = document.createElement('section');
  galleryRoot.hidden = true;
  modal.querySelector('.project-modal-shell').append(galleryRoot);
  let disposeGallery = null;
  const openVisualViewer = (slides, index) => {
    guideSlides = slides;
    guideIndex = index;
    guidebook.classList.add('visual-lightbox');
    guidebook.setAttribute('aria-label', '작업물 확대 보기');
    guidebookClose.setAttribute('aria-label', '확대 보기 닫기');
    renderGuideSlide();
    if (!guidebook.open) guidebook.showModal();
  };

  const openPreview = (trigger) => {
    disposeGallery?.();
    disposeGallery = null;
    galleryRoot.hidden = true;
    modal.classList.remove('visual-gallery-mode');
    modal.setAttribute('aria-labelledby', 'modalTitle');
    guidebook.classList.remove('visual-lightbox');
    guidebook.setAttribute('aria-label', '프로젝트 가이드북');
    guidebookClose.setAttribute('aria-label', '가이드북 닫기');
    const visualCategory = window.portfolioVisualArchive?.[trigger.dataset.visualGallery];
    if (visualCategory) {
      clearMedia(modalMedia);
      applyProjectPalette(trigger);
      modal.classList.add('visual-gallery-mode');
      modal.setAttribute('aria-labelledby', 'visualGalleryTitle');
      galleryRoot.hidden = false;
      disposeGallery = window.renderVisualArchive(galleryRoot, visualCategory, openVisualViewer);
      if (!modal.open) modal.showModal();
      modal.querySelector('.project-modal-shell').scrollTop = 0;
      document.body.classList.add('modal-open');
      return;
    }
    clearMedia(modalMedia);
    const details = projectDetails(trigger);
    const title = trigger.dataset.title || 'Project';
    const category = trigger.dataset.category || trigger.querySelector('.featured-figure figcaption')?.textContent.trim() || trigger.dataset.type || 'Visual Project';
    const type = cleanProjectType(trigger.dataset.projectType || details.get('PROJECT TYPE') || trigger.dataset.type || 'Project');
    const scope = splitList(trigger.dataset.scope || details.get('SCOPE') || trigger.dataset.type || 'Project');
    const description = trigger.dataset.description || details.get('DESCRIPTION') || `${title} ${trigger.dataset.type || 'visual project'} 작업입니다.`;
    const tools = trigger.dataset.tools || details.get('TOOLS') || '';

    applyProjectPalette(trigger);
    modalTitle.textContent = title;
    modalCategory.textContent = category;
    modalProjectType.textContent = type;
    modalScope.replaceChildren(...scope.map((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      return listItem;
    }));
    modalDescription.replaceChildren(...description.split('|').map((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text.trim();
      return paragraph;
    }));
    modalTools.textContent = tools ? tools : 'TOOLS —';
    modalMedia.append(createMedia(trigger.dataset.media, trigger.dataset.kind, title));
    setWebsiteAction(trigger);
    const guideEnabled = ['AETHER', 'UN PEACE FESTIVAL'].includes(title.trim().toUpperCase());
    modalGuide.disabled = !guideEnabled;
    modalGuide.setAttribute('aria-disabled', String(!guideEnabled));
    if (guideEnabled) setGuideSlides(trigger);
    else { guideSlides = []; guideIndex = 0; }
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
    document.body.classList.add('modal-open');
  };

  document.querySelectorAll('.preview-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => openPreview(trigger));

    if (trigger.getAttribute('role') === 'button') {
      trigger.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openPreview(trigger);
      });
    }
  });

  const closePreview = () => {
    if (!modal.open) return;
    if (guidebook.open) guidebook.close();
    modal.close();
  };

  modalWebsite.addEventListener('click', (event) => {
    if (modalWebsite.getAttribute('aria-disabled') === 'true') event.preventDefault();
  });
  modalGuide.addEventListener('click', () => {
    if (modalGuide.disabled || !guideSlides.length) return;
    renderGuideSlide();
    if (!guidebook.open) guidebook.showModal();
  });
  guidebookPrev.addEventListener('click', () => {
    if (guideIndex <= 0) return;
    guideIndex -= 1;
    renderGuideSlide();
  });
  guidebookNext.addEventListener('click', () => {
    if (guideIndex >= guideSlides.length - 1) return;
    guideIndex += 1;
    renderGuideSlide();
  });
  guidebookSlide.addEventListener('click', (event) => {
    if (!guidebook.classList.contains('visual-lightbox') || event.target.closest('video') || guideSlides.length < 2) return;
    guideIndex = (guideIndex + 1) % guideSlides.length;
    renderGuideSlide();
  });
  guidebookFullscreen.addEventListener('click', toggleGuidebookFullscreen);
  document.addEventListener('fullscreenchange', syncGuidebookFullscreen);
  guidebook.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    (event.key === 'ArrowLeft' ? guidebookPrev : guidebookNext).click();
  });
  guidebookClose.addEventListener('click', async () => {
    if (document.fullscreenElement === guidebookShell) {
      try { await document.exitFullscreen(); } catch (_) { /* Keep closing the guidebook. */ }
    }
    guidebook.close();
  });
  modalClose.addEventListener('click', closePreview);
  guidebook.addEventListener('close', () => {
    if (document.fullscreenElement === guidebookShell) document.exitFullscreen().catch(() => {});
    clearMedia(guidebookSlide);
  });
  modal.addEventListener('close', () => {
    if (guidebook.open) guidebook.close();
    disposeGallery?.();
    disposeGallery = null;
    galleryRoot.hidden = true;
    clearMedia(modalMedia);
    document.body.classList.remove('modal-open');
  });

  resumeOpen?.addEventListener('click', () => {
    if (!resumeModal.open) resumeModal.showModal();
    resumeModal.scrollTop = 0;
    resumeModal.querySelector('.resume-modal-shell').scrollTop = 0;
    document.body.classList.add('modal-open');
  });
  resumeClose?.addEventListener('click', () => resumeModal.close());
  resumeModal?.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980 && nav.classList.contains('open')) setMenu(false);
  });

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
})();
