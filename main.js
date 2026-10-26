/* Navegação e apresentação. Nenhum dado de formulário é enviado ou persistido. */
(() => {
  'use strict';
  const menu = document.querySelector('#menu-principal');
  const toggle = document.querySelector('.menu-toggle');
  function closeMenu(restoreFocus = false) {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    menu.classList.toggle('is-open', expanded);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  const wide = matchMedia('(min-width: 761px)');
  wide.addEventListener('change', () => closeMenu());
  const header = document.querySelector('.site-header');
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    scheduleCurrentSection();
  }).observe(header);
  // A âncora e o foco seguem para o mesmo destino, inclusive no menu móvel.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      if (target.tagName === 'DETAILS') target.open = true;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
    });
  });
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const menuLinks = Array.from(menu.querySelectorAll('a'));
  let currentSectionFrame = null;
  function updateCurrentSection() {
    currentSectionFrame = null;
    // Keep the reading line below the sticky header and the anchor's spacing.
    // Pixel geometry avoids rootMargin percentages being based on viewport width.
    const line = Math.min(window.innerHeight - 1, header.getBoundingClientRect().bottom + 64);
    const current = sections.find(section => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= line && bounds.bottom > line;
    });
    menuLinks.forEach(link => {
      if (current && link.hash === `#${current.id}`) {
        if (link.getAttribute('aria-current') !== 'location') link.setAttribute('aria-current', 'location');
      } else if (link.getAttribute('aria-current')) link.removeAttribute('aria-current');
    });
  }
  function scheduleCurrentSection() {
    if (currentSectionFrame !== null) return;
    currentSectionFrame = requestAnimationFrame(updateCurrentSection);
  }
  window.addEventListener('scroll', scheduleCurrentSection, { passive: true });
  window.addEventListener('resize', scheduleCurrentSection);
  new ResizeObserver(scheduleCurrentSection).observe(document.querySelector('main'));
  scheduleCurrentSection();
  function fillDates() {
    if (!window.AtelieForm?.nextStart) return;
    document.querySelectorAll('[data-next-start]').forEach((element) => {
      const value = window.AtelieForm.nextStart(element.dataset.nextStart);
      if (!value) return;
      element.textContent = value.display;
      element.dateTime = value.iso;
    });
  }
  fillDates();
})();
