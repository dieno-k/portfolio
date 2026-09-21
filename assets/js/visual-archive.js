(() => {
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  window.renderVisualArchive = (root, category, openViewer) => {
    const cleanups = [];
    root.replaceChildren();
    root.className = 'visual-gallery visual-gallery--' + category.layout;
    const title = el('h2', 'visual-gallery-title', category.title);
    title.id = 'visualGalleryTitle';
    const intro = el('div', 'visual-gallery-intro');
    intro.append(el('h3', '', category.eyebrow), el('p', '', category.description));
    root.append(title, intro);
    const projects = el('div', 'visual-gallery-projects');
    root.append(projects);
    const artwork = (item, index, group) => {
      const button = el('button', 'visual-artwork');
      button.type = 'button';
      button.dataset.format = item.format || 'poster';
      button.setAttribute('aria-label', item.title + ' 크게 보기');
      if (item.source) {
        const image = el('img');
        image.src = item.source;
        image.alt = item.title;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.draggable = false;
        button.append(image);
        button.addEventListener('click', () => {
          const available = group.items.filter(entry => entry.source);
          openViewer(available.map(entry => ({ source: entry.source, title: entry.title, kind: /\.(mp4|webm)(\?|$)/i.test(entry.source) ? 'video' : 'image' })), available.indexOf(item));
        });
      } else {
        button.disabled = true;
        button.classList.add('is-pending');
        button.setAttribute('aria-label', item.title + ' 원본 연결 대기');
        button.append(el('span', 'visual-artwork-label', item.title), el('span', 'visual-artwork-pending', '원본 이미지 연결 대기'));
      }
      return button;
    };
    const attachDrag = (track, range) => {
      let drag = null;
      let suppressClick = false;
      const sync = () => {
        const max = Math.max(0, track.scrollWidth - track.clientWidth);
        range.disabled = max < 1;
        range.value = max ? String(track.scrollLeft / max * 1000) : '0';
        range.setAttribute('aria-valuetext', Math.round(Number(range.value) / 10) + '%');
      };
      track.addEventListener('scroll', sync, { passive: true });
      range.addEventListener('input', () => { track.scrollLeft = (track.scrollWidth - track.clientWidth) * Number(range.value) / 1000; });
      track.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.pointerType === 'touch') return;
        drag = { id: event.pointerId, x: event.clientX, scroll: track.scrollLeft, moved: false };
        suppressClick = false;
      });
      track.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        const delta = event.clientX - drag.x;
        if (Math.abs(delta) > 6 && !drag.moved) {
          drag.moved = true;
          track.setPointerCapture(event.pointerId);
          track.classList.add('is-dragging');
        }
        if (drag.moved) { event.preventDefault(); track.scrollLeft = drag.scroll - delta; }
      });
      const release = event => {
        if (!drag || drag.id !== event.pointerId) return;
        suppressClick = drag.moved;
        if (track.hasPointerCapture(drag.id)) track.releasePointerCapture(drag.id);
        track.classList.remove('is-dragging');
        drag = null;
      };
      track.addEventListener('pointerup', release);
      track.addEventListener('pointercancel', release);
      track.addEventListener('lostpointercapture', release);
      track.addEventListener('click', event => {
        if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
      }, true);
      track.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        track.scrollBy({ left: (event.key === 'ArrowLeft' ? -1 : 1) * track.clientWidth * .6, behavior: 'smooth' });
      });
      const observer = new ResizeObserver(sync);
      observer.observe(track);
      cleanups.push(() => observer.disconnect());
      requestAnimationFrame(sync);
    };
    category.groups.forEach(group => {
      const project = el('section', 'visual-project visual-project--' + group.layout);
      project.dataset.group = group.id;
      const heading = el('h3', 'visual-project-title', group.title);
      heading.id = 'visual-project-' + group.id;
      project.setAttribute('aria-labelledby', heading.id);
      project.append(heading);
      if (group.layout === 'carousel') {
        const track = el('div', 'visual-poster-track');
        track.tabIndex = 0;
        track.setAttribute('aria-label', group.title + ' 포스터 목록');
        track.append(...group.items.map((item,index) => artwork(item,index,group)));
        const range = el('input', 'visual-gallery-scrollbar');
        range.type = 'range'; range.min = '0'; range.max = '1000'; range.step = '1'; range.value = '0';
        range.setAttribute('aria-label', group.title + ' 가로 스크롤');
        project.append(track,range);
        attachDrag(track,range);
      } else if (group.layout === 'banners') {
        const layout = el('div', 'visual-banner-layout');
        ['web','mobile'].forEach(format => {
          const column = el('div', 'visual-banner-column visual-banner-column--' + format);
          column.append(el('p', 'visual-format-label', '(' + format.toUpperCase() + ')'));
          const items = el('div', 'visual-banner-items');
          group.items.forEach((item,index) => { if (item.format === format) items.append(artwork(item,index,group)); });
          column.append(items); layout.append(column);
        });
        project.append(layout);
      } else if (group.layout === 'packaging') {
        const layout = el('div', 'visual-package-layout');
        const description = el('div','visual-package-description');
        group.description.forEach(text => description.append(el('p','',text)));
        layout.append(description);
        group.items.forEach((item,index) => {
          const figure = el('figure','visual-package-item visual-package-item--' + item.format);
          if (item.format.startsWith('flat')) figure.append(el('figcaption','visual-format-label','(' + item.title + ')'));
          figure.append(artwork(item,index,group)); layout.append(figure);
        });
        project.append(layout);
      } else {
        const grid = el('div','visual-poster-grid');
        grid.append(...group.items.map((item,index) => artwork(item,index,group)));
        project.append(grid);
      }
      projects.append(project);
    });
    const top = el('button','visual-gallery-top');
    top.append(el('span','visual-gallery-top-label','BACK TO TOP'));
    const arrow = el('span','visual-gallery-top-arrow','↑');
    arrow.setAttribute('aria-hidden','true');
    top.append(arrow);
    top.type = 'button';
    top.addEventListener('click', () => window.portfolioScroll.scrollElementTo(root.parentElement, 0));
    root.append(top);
    return () => { cleanups.forEach(cleanup => cleanup()); root.replaceChildren(); };
  };
})();
