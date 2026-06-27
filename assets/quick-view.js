/**
 * Amadal — product quick view modal
 */
(function () {
  'use strict';

  const modal = document.getElementById('QuickView');
  if (!modal) return;

  const content = modal.querySelector('[data-quick-view-content]');
  const shippingUrl = modal.dataset.shippingUrl || '/pages/shipping-returns';
  const shopUrl = modal.dataset.shopUrl || window.location.origin;

  function formatMoney(cents) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents, window.themeMoneyFormat || '${{amount}}');
    }
    return (Number(cents) / 100).toFixed(2);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function decodeHtmlEntities(html) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  function getDescriptionHtml(product) {
    let html = (product.body_html || '').trim();

    if (html) {
      if (html.includes('&lt;') || html.includes('&gt;')) {
        html = decodeHtmlEntities(html);
      }
      return '<div class="product__description rte quick-view__description">' + html + '</div>';
    }

    const text = (product.description || '').trim();
    if (!text) return '';

    if (/<[a-z][\s\S]*>/i.test(text)) {
      return '<div class="product__description rte quick-view__description">' + text + '</div>';
    }

    return (
      '<div class="product__description rte quick-view__description"><p>' +
      escapeHtml(text) +
      '</p></div>'
    );
  }

  function getDefaultVariant(product) {
    return product.variants.find((variant) => variant.available) || product.variants[0];
  }

  function buildProductHtml(product) {
    const variant = getDefaultVariant(product);
    const imageSrc = variant.featured_image?.src || product.featured_image || '';
    const shareUrl = shopUrl + product.url;
    const category = product.type ? escapeHtml(product.type) : '';

    const categoryHtml = category
      ? '<p class="product__category"><span class="product__meta-label">Category:</span> ' + category + '</p>'
      : '';

    function shareLink(href, label, iconKey) {
      const iconUrl = modal.dataset['icon' + iconKey];
      const icon = iconUrl
        ? '<span class="product__share-icon" style="--icon-url: url(\'' + iconUrl + '\');"></span>'
        : '';
      return '<a href="' + href + '" class="product__share-link" target="_blank" rel="noopener" aria-label="' + label + '">' + icon + '</a>';
    }

    const shareLinks =
      shareLink('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), 'Share on Facebook', 'Facebook') +
      shareLink('https://wa.me/?text=' + encodeURIComponent(product.title + ' ' + shareUrl), 'Share on WhatsApp', 'Whatsapp') +
      shareLink('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl), 'Share on LinkedIn', 'Linkedin') +
      shareLink(
        'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(shareUrl) +
          '&media=' + encodeURIComponent(imageSrc) +
          '&description=' + encodeURIComponent(product.title),
        'Share on Pinterest',
        'Pinterest'
      );

    const descriptionHtml = getDescriptionHtml(product);

    const can_purchase = product.featured_image != null;

    return (
      '<div class="quick-view__layout">' +
        '<div class="quick-view__media">' +
          (imageSrc
            ? '<img src="' + imageSrc + '" alt="' + escapeHtml(product.title) + '" class="quick-view__image" data-quick-view-image>'
            : '') +
        '</div>' +
        '<div class="quick-view__info">' +
          '<h2 class="product__title" id="QuickViewTitle">' + escapeHtml(product.title) + '</h2>' +
          '<div class="product__price-wrap">' +
            '<p class="quick-view__price" data-quick-view-price>' + formatMoney(variant.price) + '</p>' +
          '</div>' +
          descriptionHtml +
          '<form class="product-form" data-quick-view-form action="/cart/add" method="post">' +
            '<input type="hidden" name="id" value="' + variant.id + '">' +
            '<div class="product-form__actions">' +
              '<div class="quantity-stepper" data-quantity-stepper>' +
                '<button type="button" class="quantity-stepper__btn" data-action="qty-minus" aria-label="Decrease quantity">&#8722;</button>' +
                '<input type="number" name="quantity" class="quantity-stepper__input" min="1" value="1" aria-label="Quantity">' +
                '<button type="button" class="quantity-stepper__btn" data-action="qty-plus" aria-label="Increase quantity">&#43;</button>' +
              '</div>' +
              '<button type="submit" class="button product-form__submit' + (variant.available ? '' : ' is-sold-out') + '" data-quick-view-submit' +
                ' data-product-available="' + variant.available + '"' +
                ' data-product-title="' + escapeHtml(product.title) + '">' +
                (variant.available && can_purchase == true ? 'Add to cart' : 'Sold out') +
              '</button>' +
              '<button type="button" class="product-wishlist" data-action="wishlist-toggle"' +
                ' data-product-id="' + product.id + '"' +
                ' data-product-handle="' + product.handle + '"' +
                ' data-product-title="' + escapeHtml(product.title) + '"' +
                ' data-product-url="' + product.url + '"' +
                ' data-product-image="' + (imageSrc || '') + '"' +
                ' data-product-price="' + formatMoney(variant.price) + '"' +
                ' aria-label="Add to wishlist" aria-pressed="false">' +
                '<span class="icon-heart" aria-hidden="true">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
                '</span>' +
              '</button>' +
            '</div>' +
          '</form>' +
          '<div class="product__meta">' +
            categoryHtml +
            '<a href="' + shippingUrl + '" class="product__shipping-link">Shipping &amp; Returns</a>' +
          '</div>' +
          '<div class="product__share">' +
            '<span class="product__share-label">Share:</span>' +
            '<div class="product__share-links">' + shareLinks + '</div>' +
          '</div>' +
          '<a href="' + product.url + '" class="quick-view__full-link">View full product details</a>' +
        '</div>' +
      '</div>'
    );
  }

  function bindQuickViewForm() {
    const form = content.querySelector('[data-quick-view-form]');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[data-quick-view-submit]');
      const productTitle = document.getElementById('QuickViewTitle')?.textContent?.trim() || '';

      if (window.AmadalStock && submitBtn && !window.AmadalStock.isAvailable(submitBtn)) {
        window.AmadalStock.show({ productTitle });
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      const formData = new FormData(form);
      try {
        if (window.AmadalCart) {
          await window.AmadalCart.add(formData, { productTitle });
        } else {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData
          });
          if (!response.ok) throw new Error('Add to cart failed');
        }

        if (submitBtn) {
          submitBtn.textContent = 'Added!';
          setTimeout(() => {
            submitBtn.textContent = 'Add to cart';
            submitBtn.disabled = false;
          }, 1500);
        }
      } catch {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
    });
  }

  async function openQuickView(handle) {
    if (!handle) return;

    modal.hidden = false;
    document.body.classList.add('quick-view-open');
    content.innerHTML = '<p class="quick-view__loading">Loading...</p>';

    try {
      const response = await fetch('/products/' + handle + '.js');
      if (!response.ok) throw new Error('Product not found');
      const product = await response.json();

      content.innerHTML = buildProductHtml(product);
      bindQuickViewForm();

      if (window.AmadalWishlist) {
        const wishlistBtn = content.querySelector('[data-action="wishlist-toggle"]');
        if (wishlistBtn) {
          const active = window.AmadalWishlist.isInWishlist(product.handle);
          wishlistBtn.classList.toggle('is-active', active);
          wishlistBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
      }

      const closeBtn = modal.querySelector('.quick-view__close');
      if (closeBtn) closeBtn.focus();
    } catch {
      content.innerHTML = '<p class="quick-view__loading">Unable to load product.</p>';
    }
  }

  function closeQuickView() {
    modal.hidden = true;
    document.body.classList.remove('quick-view-open');
    content.innerHTML = '';
  }

  document.addEventListener('click', (event) => {
    const quickViewBtn = event.target.closest('[data-action="quick-view"]');
    if (quickViewBtn) {
      event.preventDefault();
      event.stopPropagation();
      openQuickView(quickViewBtn.dataset.productHandle);
      return;
    }

    if (event.target.closest('[data-action="close-quick-view"]')) {
      event.preventDefault();
      closeQuickView();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeQuickView();
    }
  });
})();
