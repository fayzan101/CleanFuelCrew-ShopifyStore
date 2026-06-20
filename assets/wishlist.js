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

  function getWishlistModal() {
    return document.getElementById('WishlistAdded');
  }

  function openWishlistModal(item) {
    const modal = getWishlistModal();
    if (!modal || !item) return;

    const image = modal.querySelector('[data-wishlist-modal-image]');
    const title = modal.querySelector('[data-wishlist-modal-title]');

    if (image) {
      if (item.image) {
        image.src = item.image;
        image.alt = item.title || '';
        image.hidden = false;
      } else {
        image.removeAttribute('src');
        image.alt = '';
        image.hidden = true;
      }
    }

    if (title) {
      title.textContent = item.title || '';
    }

    modal.hidden = false;
    document.body.classList.add('wishlist-modal-open');

    const continueBtn = modal.querySelector('[data-action="close-wishlist-modal"].wishlist-modal__btn');
    if (continueBtn) {
      continueBtn.focus();
    }
  }

  function closeWishlistModal() {
    const modal = getWishlistModal();
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove('wishlist-modal-open');
  }

  function shouldShowAddedModal(button) {
    return Boolean(button.closest('.card-product-shop'));
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

  const TRASH_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
      '<polyline points="3 6 5 6 21 6"></polyline>' +
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
      '<line x1="10" y1="11" x2="10" y2="17"></line>' +
      '<line x1="14" y1="11" x2="14" y2="17"></line>' +
    '</svg>';

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getDefaultVariant(product) {
    if (!product?.variants?.length) return null;
    return product.variants.find((variant) => variant.available) || product.variants[0];
  }

  async function addToCart(variantId, button) {
    if (!variantId || !button) return;

    if (window.AmadalStock && !window.AmadalStock.isAvailable(button)) {
      window.AmadalStock.show({ productTitle: button.dataset.productTitle });
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;

    try {
      if (window.AmadalCart) {
        await window.AmadalCart.add({ id: variantId, quantity: 1 }, { productTitle: button.dataset.productTitle });
      } else {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ id: variantId, quantity: 1 })
        });

        if (!response.ok) throw new Error('Add to cart failed');
      }

      button.textContent = 'Added!';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
    } catch {
      button.textContent = originalText;
      button.disabled = false;
    }
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
    const table = root.querySelector('[data-wishlist-table]');
    const empty = root.querySelector('[data-wishlist-empty]');
    const list = readWishlist();

    if (!grid || !empty) return;

    grid.innerHTML = '';
    updateHeaderCount();

    if (list.length === 0) {
      empty.hidden = false;
      if (table) table.hidden = true;
      return;
    }

    empty.hidden = true;
    if (table) table.hidden = false;

    const products = await Promise.all(list.map((item) => fetchProduct(item.handle)));

    list.forEach((item, index) => {
      const product = products[index];
      const variant = product ? getDefaultVariant(product) : null;
      const row = document.createElement('article');
      row.className = 'wishlist-row';

      const image = product?.featured_image || item.image;
      const title = product?.title || item.title;
      const url = product?.url || item.url;
      const price = product
        ? formatMoney(product.price, window.Shopify?.currency?.active)
        : item.price;
      const available = Boolean(variant?.available);
      const variantId = variant?.id || '';

      row.innerHTML =
        '<a href="' + escapeHtml(url) + '" class="wishlist-row__media">' +
          (image
            ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" loading="lazy">'
            : '') +
        '</a>' +
        '<a href="' + escapeHtml(url) + '" class="wishlist-row__title">' + escapeHtml(title) + '</a>' +
        '<p class="wishlist-row__price">' + price + '</p>' +
        '<button type="button" class="button wishlist-row__add' + (available ? '' : ' is-sold-out') + '" data-action="wishlist-add-to-cart" data-variant-id="' + variantId + '"' +
          ' data-product-available="' + available + '"' +
          ' data-product-title="' + escapeHtml(title) + '">' +
          (available ? 'Add to cart' : 'Sold out') +
        '</button>' +
        '<button type="button" class="wishlist-row__remove" data-action="wishlist-remove" data-product-handle="' + escapeHtml(item.handle) + '" aria-label="Remove ' + escapeHtml(title) + '">' +
          TRASH_ICON +
        '</button>';

      grid.appendChild(row);
    });
  }

  document.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-action="wishlist-toggle"]');
    if (toggleBtn) {
      event.preventDefault();
      event.stopPropagation();

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

      if (added && shouldShowAddedModal(toggleBtn)) {
        openWishlistModal(item);
      }
      return;
    }

    if (event.target.closest('[data-action="close-wishlist-modal"]')) {
      event.preventDefault();
      closeWishlistModal();
      return;
    }

    const removeBtn = event.target.closest('[data-action="wishlist-remove"]');
    if (removeBtn) {
      const handle = removeBtn.dataset.productHandle;
      if (!handle) return;
      removeFromWishlist(handle);
      renderWishlistPage();
      return;
    }

    const addBtn = event.target.closest('[data-action="wishlist-add-to-cart"]');
    if (addBtn) {
      event.preventDefault();
      const variantId = Number(addBtn.dataset.variantId);
      addToCart(variantId, addBtn);
    }
  });

  document.addEventListener('wishlist:updated', () => {
    initProductButtons();
  });

  document.addEventListener('keydown', (event) => {
    const modal = getWishlistModal();
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeWishlistModal();
    }
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
    isInWishlist,
    openModal: openWishlistModal,
    closeModal: closeWishlistModal
  };
})();
