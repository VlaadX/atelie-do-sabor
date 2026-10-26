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
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        menu.querySelectorAll('a').forEach((link) => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section));
  }
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
