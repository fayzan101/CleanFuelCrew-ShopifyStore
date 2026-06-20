/**
 * Amadal — out-of-stock alert dialog
 */
(function () {
  'use strict';

  const modal = document.getElementById('StockAlert');
  if (!modal) return;

  const messageEl = modal.querySelector('[data-stock-alert-message]');
  const okBtn = modal.querySelector('.stock-alert__btn');

  function show(options) {
    if (!messageEl) return;

    const title = options?.productTitle?.trim() || '';
    const message =
      options?.message ||
      (title
        ? title + ' is currently out of stock and cannot be added to your cart.'
        : 'This product is currently out of stock and cannot be added to your cart.');

    messageEl.textContent = message;
    modal.hidden = false;
    document.body.classList.add('stock-alert-open');

    if (okBtn) okBtn.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('stock-alert-open');
  }

  function isAvailable(element) {
    const root =
      element?.closest?.('[data-product-available]') ||
      element?.closest?.('form[data-product-available]') ||
      element;

    if (!root || !root.dataset) return true;
    return root.dataset.productAvailable !== 'false';
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close-stock-alert"]')) {
      event.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      close();
    }
  });

  window.AmadalStock = {
    show,
    close,
    isAvailable
  };
})();
