/**
 * Amadal — cart drawer sidebar
 */
(function () {
  'use strict';

  const drawer = document.getElementById('CartDrawer');
  if (!drawer) return;

  const body = drawer.querySelector('[data-cart-drawer-body]');
  const footer = drawer.querySelector('[data-cart-drawer-footer]');
  const subtotalEl = drawer.querySelector('[data-cart-drawer-subtotal]');
  let closeTimer = null;

  function formatMoney(cents) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents, window.themeMoneyFormat || '${{amount}}');
    }

    return (Number(cents) / 100).toFixed(2);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateHeaderCount(count) {
    document.querySelectorAll('.cart-count').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
  }

  function buildItemHtml(item, line) {
    const title = item.product_title || item.title;
    const image = item.image || item.featured_image?.url || '';

    return (
      '<div class="cart-drawer__item" data-cart-drawer-item data-line="' + line + '">' +
        '<a href="' + escapeHtml(item.url) + '" class="cart-drawer__item-media">' +
          (image
            ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '" loading="lazy">'
            : '') +
        '</a>' +
        '<div class="cart-drawer__item-info">' +
          '<p class="cart-drawer__item-title">' + escapeHtml(title) + '</p>' +
          '<p class="cart-drawer__item-meta">' + item.quantity + ' &times; ' + formatMoney(item.final_price) + '</p>' +
        '</div>' +
        '<button type="button" class="cart-drawer__item-remove" data-action="cart-drawer-remove" data-line="' + line + '" aria-label="Remove ' + escapeHtml(title) + '">' +
          '<span aria-hidden="true">&times;</span>' +
        '</button>' +
      '</div>'
    );
  }

  function renderCart(cart) {
    if (!body || !footer || !subtotalEl) return;

    updateHeaderCount(cart.item_count);

    if (!cart.items.length) {
      body.innerHTML = '<p class="cart-drawer__empty">Your cart is empty.</p>';
      footer.hidden = true;
      return;
    }

    body.innerHTML = cart.items.map((item, index) => buildItemHtml(item, index + 1)).join('');
    subtotalEl.textContent = formatMoney(cart.total_price);
    footer.hidden = false;
  }

  async function fetchCart() {
    const response = await fetch('/cart.js');
    if (!response.ok) throw new Error('Cart fetch failed');
    return response.json();
  }

  function openDrawer(cart) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    drawer.hidden = false;
    document.body.classList.add('cart-drawer-open');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawer.classList.add('is-open');
      });
    });

    if (cart) {
      renderCart(cart);
    }
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('cart-drawer-open');

    closeTimer = window.setTimeout(() => {
      drawer.hidden = true;
      closeTimer = null;
    }, 300);
  }

  async function refreshCart() {
    const cart = await fetchCart();
    renderCart(cart);
    return cart;
  }

  async function addToCart(payload, options) {
    let response;

    if (payload instanceof FormData) {
      response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload
      });
    } else {
      response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      window.AmadalStock?.show({
        productTitle: options?.productTitle,
        message: error.description || 'This product is out of stock and cannot be added to your cart.'
      });
      throw new Error('Add to cart failed');
    }

    const cart = await fetchCart();
    openDrawer(cart);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    return cart;
  }

  async function removeLine(line) {
    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ line: Number(line), quantity: 0 })
    });

    if (!response.ok) throw new Error('Remove failed');

    const cart = await response.json();
    renderCart(cart);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    return cart;
  }

  function getProductTitleFromForm(form) {
    return (
      form.dataset.productTitle ||
      form.closest('.card-product-shop')?.querySelector('.card-product-shop__title')?.textContent?.trim() ||
      form.closest('.product-card')?.querySelector('.product-card__title')?.textContent?.trim() ||
      document.querySelector('.product__title')?.textContent?.trim() ||
      ''
    );
  }

  function isAddToCartForm(form) {
    if (!(form instanceof HTMLFormElement)) return false;
    if (form.matches('[data-quick-view-form]')) return false;

    const action = form.getAttribute('action') || '';
    const hasVariant = Boolean(form.querySelector('[name="id"]'));
    return (
      hasVariant &&
      (action.includes('/cart/add') ||
        form.classList.contains('product-form') ||
        form.classList.contains('card-product-shop__cart-form') ||
        form.classList.contains('product-card__atc-form'))
    );
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!isAddToCartForm(form)) return;

    event.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const productTitle = getProductTitleFromForm(form);

    if (window.AmadalStock && !window.AmadalStock.isAvailable(submitBtn || form)) {
      window.AmadalStock.show({ productTitle });
      return;
    }

    const originalText = submitBtn?.textContent || '';

    if (submitBtn) submitBtn.disabled = true;

    try {
      await addToCart(new FormData(form), { productTitle });

      if (submitBtn) {
        submitBtn.textContent = 'Added!';
        window.setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }, 1500);
      }
    } catch {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close-cart-drawer"]')) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    const removeBtn = event.target.closest('[data-action="cart-drawer-remove"]');
    if (removeBtn) {
      const line = removeBtn.dataset.line;
      if (line) removeLine(line);
      return;
    }

    const cartTrigger = event.target.closest('#cart-icon-bubble, [data-action="open-cart-drawer"]');
    if (cartTrigger) {
      event.preventDefault();
      refreshCart().then((cart) => openDrawer(cart));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) {
      closeDrawer();
    }
  });

  window.AmadalCart = {
    open: () => refreshCart().then((cart) => {
      openDrawer(cart);
      return cart;
    }),
    close: closeDrawer,
    add: addToCart,
    refresh: refreshCart,
    render: renderCart
  };
})();
