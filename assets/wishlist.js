/**
 * Amadal — client-side wishlist (localStorage)
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'amadal_wishlist';

  function readWishlist() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeWishlist(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    updateHeaderCount();
    document.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { list } }));
  }

  function getItemFromButton(button) {
    return {
      id: Number(button.dataset.productId),
      handle: button.dataset.productHandle,
      title: button.dataset.productTitle,
      url: button.dataset.productUrl,
      image: button.dataset.productImage,
      price: button.dataset.productPrice
    };
  }

  function isInWishlist(handle) {
    return readWishlist().some((item) => item.handle === handle);
  }

  function toggleWishlist(item) {
    const list = readWishlist();
    const index = list.findIndex((entry) => entry.handle === item.handle);

    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.unshift(item);
    }

    writeWishlist(list);
    return index < 0;
  }

  function removeFromWishlist(handle) {
    writeWishlist(readWishlist().filter((item) => item.handle !== handle));
  }

  function updateHeaderCount() {
    const count = readWishlist().length;
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
  }

  function setButtonState(button, active) {
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute(
      'aria-label',
      active ? 'Remove from wishlist' : 'Add to wishlist'
    );
  }

  function initProductButtons() {
    document.querySelectorAll('[data-action="wishlist-toggle"]').forEach((button) => {
      const handle = button.dataset.productHandle;
      if (handle) {
        setButtonState(button, isInWishlist(handle));
      }
    });
  }

  function formatMoney(cents, currency) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents, window.themeMoneyFormat || '${{amount}}');
    }

    const amount = (Number(cents) / 100).toFixed(2);
    return currency ? amount + ' ' + currency : amount;
  }

  async function fetchProduct(handle) {
    const response = await fetch('/products/' + handle + '.js');
    if (!response.ok) return null;
    return response.json();
  }

  async function renderWishlistPage() {
    const root = document.querySelector('[data-wishlist-page]');
    if (!root) return;

    const grid = root.querySelector('[data-wishlist-grid]');
    const empty = root.querySelector('[data-wishlist-empty]');
    const list = readWishlist();

    if (!grid || !empty) return;

    grid.innerHTML = '';
    updateHeaderCount();

    if (list.length === 0) {
      empty.hidden = false;
      grid.hidden = true;
      return;
    }

    empty.hidden = true;
    grid.hidden = false;

    const products = await Promise.all(list.map((item) => fetchProduct(item.handle)));

    list.forEach((item, index) => {
      const product = products[index];
      const card = document.createElement('article');
      card.className = 'wishlist-card';

      const image = product?.featured_image || item.image;
      const title = product?.title || item.title;
      const url = product?.url || item.url;
      const price = product
        ? formatMoney(product.price, window.Shopify?.currency?.active)
        : item.price;

      card.innerHTML =
        '<a href="' + url + '" class="wishlist-card__media">' +
          (image
            ? '<img src="' + image + '" alt="' + title.replace(/"/g, '&quot;') + '" loading="lazy">'
            : '') +
        '</a>' +
        '<div class="wishlist-card__info">' +
          '<a href="' + url + '" class="wishlist-card__title">' + title + '</a>' +
          '<p class="wishlist-card__price">' + price + '</p>' +
          '<button type="button" class="wishlist-card__remove" data-action="wishlist-remove" data-product-handle="' + item.handle + '">Remove</button>' +
        '</div>';

      grid.appendChild(card);
    });
  }

  document.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-action="wishlist-toggle"]');
    if (toggleBtn) {
      const item = getItemFromButton(toggleBtn);
      if (!item.handle) return;

      const added = toggleWishlist(item);
      setButtonState(toggleBtn, added);

      document.querySelectorAll(
        '[data-action="wishlist-toggle"][data-product-handle="' + item.handle + '"]'
      ).forEach((button) => {
        if (button !== toggleBtn) {
          setButtonState(button, added);
        }
      });
      return;
    }

    const removeBtn = event.target.closest('[data-action="wishlist-remove"]');
    if (removeBtn) {
      const handle = removeBtn.dataset.productHandle;
      if (!handle) return;
      removeFromWishlist(handle);
      renderWishlistPage();
    }
  });

  document.addEventListener('wishlist:updated', () => {
    initProductButtons();
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderCount();
    initProductButtons();
    renderWishlistPage();
  });

  window.AmadalWishlist = {
    read: readWishlist,
    toggle: toggleWishlist,
    remove: removeFromWishlist,
    isInWishlist
  };
})();
