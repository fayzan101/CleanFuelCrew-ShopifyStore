/**
 * Amadal — Global theme scripts
 */
(function () {
  'use strict';

  const menuToggle = document.querySelector('[data-action="toggle-menu"]');
  const headerNav = document.getElementById('HeaderNav');

  function setMenuOpen(isOpen) {
    document.body.classList.toggle('menu-open', isOpen);

    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    if (target.dataset.action === 'toggle-menu') {
      setMenuOpen(!document.body.classList.contains('menu-open'));
    }
  });

  if (headerNav) {
    headerNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 989) {
      setMenuOpen(false);
    }
  });
})();
