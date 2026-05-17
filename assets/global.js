/**
 * Amadal — Global theme scripts
 */
(function () {
  'use strict';

  /**
   * Delegated click handler for elements with [data-action]
   */
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
      case 'toggle-menu':
        document.body.classList.toggle('menu-open');
        break;
      default:
        break;
    }
  });
})();
