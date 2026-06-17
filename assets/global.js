/**
 * Amadal — Global theme scripts
 */
(function () {
  'use strict';

  const menuToggle = document.querySelector('.header__menu-toggle');
  const headerNav = document.getElementById('HeaderNav');

  function setMenuOpen(isOpen) {
    document.body.classList.toggle('menu-open', isOpen);

    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }
  }

  function setProductMainImage(url, zoomUrl) {
    const mainImage = document.getElementById('ProductMainImage');
    if (!mainImage || !url) return;

    mainImage.src = url;
    mainImage.removeAttribute('srcset');
    mainImage.removeAttribute('sizes');

    const highResUrl = zoomUrl || url;
    mainImage.dataset.zoomUrl = highResUrl;

    const flyoutInner = document.querySelector('#ProductZoomFlyout .product-zoom-flyout__inner');
    if (flyoutInner) {
      flyoutInner.style.backgroundImage = 'url("' + highResUrl + '")';
    }
  }

  function setActiveThumb(thumb) {
    thumb.closest('.product__thumbs')
      ?.querySelectorAll('.product__thumb')
      .forEach((item) => item.classList.remove('is-active'));
    thumb.classList.add('is-active');
  }

  function initProductZoom() {
    const zoomRoot = document.querySelector('[data-product-zoom]');
    const mainImage = document.getElementById('ProductMainImage');
    const flyout = document.getElementById('ProductZoomFlyout');
    const flyoutInner = flyout?.querySelector('.product-zoom-flyout__inner');

    if (!zoomRoot || !mainImage || !flyout || !flyoutInner) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const flyoutSize = 320;
    const offset = 24;

    function updateFlyoutBackground() {
      const url = mainImage.dataset.zoomUrl || mainImage.currentSrc || mainImage.src;
      if (url) {
        flyoutInner.style.backgroundImage = 'url("' + url + '")';
      }
    }

    updateFlyoutBackground();

    zoomRoot.addEventListener('mouseenter', () => {
      updateFlyoutBackground();
      flyout.hidden = false;
    });

    zoomRoot.addEventListener('mouseleave', () => {
      flyout.hidden = true;
    });

    zoomRoot.addEventListener('mousemove', (event) => {
      const rect = mainImage.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      flyoutInner.style.backgroundPosition = (x * 100) + '% ' + (y * 100) + '%';

      let left = event.clientX + offset;
      let top = event.clientY + offset;

      if (left + flyoutSize > window.innerWidth - 12) {
        left = event.clientX - flyoutSize - offset;
      }

      if (top + flyoutSize > window.innerHeight - 12) {
        top = event.clientY - flyoutSize - offset;
      }

      flyout.style.left = Math.max(12, left) + 'px';
      flyout.style.top = Math.max(12, top) + 'px';
    });
  }

  document.addEventListener('submit', (event) => {
    if (event.target.closest('.product-reviews__form')) {
      event.preventDefault();
    }
  });

  document.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-action="product-thumb"]');
    if (thumb) {
      event.preventDefault();
      setProductMainImage(thumb.dataset.mediaUrl, thumb.dataset.mediaUrlZoom);
      setActiveThumb(thumb);
      return;
    }

    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    if (action === 'toggle-menu') {
      setMenuOpen(!document.body.classList.contains('menu-open'));
      return;
    }

    if (action === 'product-tab') {
      const tabsRoot = target.closest('[data-product-tabs]');
      if (!tabsRoot) return;

      const tabName = target.dataset.tab;
      tabsRoot.querySelectorAll('[data-action="product-tab"]').forEach((btn) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      tabsRoot.querySelectorAll('[data-tab-panel]').forEach((panel) => {
        const isActive = panel.dataset.tabPanel === tabName;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
      return;
    }

    if (action === 'qty-minus' || action === 'qty-plus') {
      const stepper = target.closest('[data-quantity-stepper]');
      const input = stepper?.querySelector('input[type="number"]');
      if (!input) return;

      const cartItem = target.closest('[data-cart-item]');
      const min = Number(input.min) || (cartItem ? 0 : 1);
      const current = Number(input.value) || min;
      const next = action === 'qty-plus' ? current + 1 : Math.max(min, current - 1);
      input.value = String(next);

      if (cartItem) {
        const line = cartItem.querySelector('[data-action="cart-remove"]')?.dataset.line;
        if (line) changeCartLine(line, next);
      }
      return;
    }

    if (action === 'cart-remove') {
      const line = target.dataset.line;
      if (line) changeCartLine(line, 0);
      return;
    }

    if (action === 'cart-apply-discount') {
      const input = document.querySelector('[data-cart-discount-input]');
      const code = input?.value?.trim();
      if (!code) return;

      window.location.href = '/discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (action === 'review-star') {
      const value = Number(target.dataset.value);
      const group = target.closest('.product-reviews__stars');
      if (!group) return;

      group.querySelectorAll('[data-action="review-star"]').forEach((star) => {
        const starValue = Number(star.dataset.value);
        star.classList.toggle('is-active', starValue <= value);
        star.textContent = starValue <= value ? '\u2605' : '\u2606';
      });
      return;
    }

    if (action === 'price-filter') {
      const filterRoot = target.closest('[data-price-filter]');
      const grid = document.querySelector('[data-collection-grid]');
      if (!filterRoot || !grid) return;

      const minRange = filterRoot.querySelector('[data-price-range="min"]');
      const maxRange = filterRoot.querySelector('[data-price-range="max"]');
      if (!minRange || !maxRange) return;

      const minVal = Math.min(Number(minRange.value), Number(maxRange.value));
      const maxVal = Math.max(Number(minRange.value), Number(maxRange.value));

      grid.querySelectorAll('[data-product-item]').forEach((item) => {
        if (item.dataset.hiddenByCategory === 'true') return;

        const card = item.querySelector('[data-product-price]');
        const price = Number(card?.dataset.productPrice || 0);
        const visible = price >= minVal && price <= maxVal;
        item.hidden = !visible;
      });
    }
  });

  document.addEventListener('change', (event) => {
    const sortSelect = event.target.closest('[data-action="collection-sort"]');
    if (!sortSelect) return;

    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', sortSelect.value);
    window.location.href = url.toString();
  });

  function initCollectionPage() {
    const grid = document.querySelector('[data-collection-grid]');
    if (!grid) return;

    const countEl = document.querySelector('[data-collection-count]');
    const emptyEl = document.querySelector('[data-collection-search-empty]');
    const paginationEl = document.querySelector('[data-collection-pagination]');
    const searchForm = document.querySelector('[data-collection-search]');
    const searchInput = document.querySelector('[data-collection-search-input]');
    const sidebar = document.querySelector('[data-collection-sidebar]');
    const defaultCount = countEl?.dataset.defaultCount || countEl?.textContent || '';
    const originalGridHtml = grid.innerHTML;

    function readUrlState() {
      const url = new URL(window.location.href);
      return {
        q: (url.searchParams.get('q') || '').trim(),
        productType:
          url.searchParams.get('product_type') ||
          url.searchParams.get('filter.p.product_type'),
        categoryId:
          url.searchParams.get('product_category_id') ||
          url.searchParams.get('filter.p.t.category')
      };
    }

    function applyCategoryFilter(state) {
      let visibleCount = 0;

      grid.querySelectorAll('[data-product-item]').forEach((item) => {
        let visible = true;

        if (state.productType) {
          const itemType = (item.dataset.productType || '').trim().toLowerCase();
          visible = itemType === state.productType.trim().toLowerCase();
        }

        if (visible && state.categoryId) {
          visible = (item.dataset.productCategoryId || '') === state.categoryId;
        }

        item.hidden = !visible;
        item.dataset.hiddenByCategory = visible ? 'false' : 'true';
        if (visible) visibleCount += 1;
      });

      return visibleCount;
    }

    function updateSidebarActive(state) {
      if (!sidebar) return;

      sidebar.querySelectorAll('[data-category-link]').forEach((link) => {
        const mode = link.dataset.filterMode;
        const value = link.dataset.filterValue || '';
        let isActive = false;

        if (mode === 'all') {
          isActive = !state.productType && !state.categoryId && !state.q;
        } else if (mode === 'type') {
          isActive =
            Boolean(state.productType) &&
            value.toLowerCase() === state.productType.toLowerCase();
        } else if (mode === 'category') {
          isActive = Boolean(state.categoryId) && value === state.categoryId;
        }

        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    function updateCount(visibleCount, state) {
      if (!countEl) return;

      if (state.q) {
        countEl.textContent =
          visibleCount === 0
            ? 'No results for "' + state.q + '"'
            : 'Showing ' +
              visibleCount +
              ' result' +
              (visibleCount === 1 ? '' : 's') +
              ' for "' +
              state.q +
              '"';
        return;
      }

      if (state.productType || state.categoryId) {
        countEl.textContent =
          'Showing ' +
          visibleCount +
          ' result' +
          (visibleCount === 1 ? '' : 's');
        return;
      }

      countEl.textContent = defaultCount;
    }

    async function renderCollectionView() {
      const state = readUrlState();

      if (searchInput) {
        searchInput.value = state.q;
      }

      if (state.q) {
        if (paginationEl) paginationEl.hidden = true;

        try {
          const response = await fetch(
            '/search?sections=collection-search-grid&q=' +
              encodeURIComponent(state.q) +
              '&type=product'
          );
          const data = await response.json();
          const sectionHtml = data['collection-search-grid'] || '';
          const parser = document.createElement('div');
          parser.innerHTML = sectionHtml;
          const items = parser.querySelectorAll('[data-product-item]');

          grid.innerHTML = '';
          items.forEach((item) => {
            grid.appendChild(item);
          });
        } catch {
          grid.innerHTML = '';
        }
      } else {
        grid.innerHTML = originalGridHtml;
        if (paginationEl) paginationEl.hidden = false;
      }

      const visibleCount = applyCategoryFilter(state);
      const showEmpty = visibleCount === 0;

      if (emptyEl) {
        emptyEl.hidden = !showEmpty;
      }

      grid.hidden = showEmpty;
      updateCount(visibleCount, state);
      updateSidebarActive(state);
    }

    function navigateCollection(url) {
      window.history.pushState({}, '', url);
      renderCollectionView();
    }

    if (searchForm) {
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const url = new URL(window.location.href);
        const q = (searchInput?.value || '').trim();

        if (q) {
          url.searchParams.set('q', q);
        } else {
          url.searchParams.delete('q');
        }

        navigateCollection(url.toString());
      });
    }

    if (sidebar) {
      sidebar.addEventListener('click', (event) => {
        const link = event.target.closest('[data-category-link]');
        if (!link) return;

        event.preventDefault();
        const url = new URL(link.href, window.location.origin);
        const currentUrl = new URL(window.location.href);
        const currentQ = (currentUrl.searchParams.get('q') || '').trim();

        if (link.dataset.filterMode === 'all') {
          url.searchParams.delete('q');
          url.searchParams.delete('product_type');
          url.searchParams.delete('product_category_id');
        } else if (currentQ) {
          url.searchParams.set('q', currentQ);
        }

        navigateCollection(url.toString());
      });
    }

    window.addEventListener('popstate', () => {
      renderCollectionView();
    });

    renderCollectionView();
  }

  function initCollectionPriceFilter() {
    document.querySelectorAll('[data-price-filter]').forEach((filterRoot) => {
      const minRange = filterRoot.querySelector('[data-price-range="min"]');
      const maxRange = filterRoot.querySelector('[data-price-range="max"]');
      const fill = filterRoot.querySelector('[data-price-fill]');
      const label = filterRoot.querySelector('[data-price-label]');
      if (!minRange || !maxRange || !label) return;

      function formatMoney(cents) {
        if (window.Shopify && typeof Shopify.formatMoney === 'function') {
          return Shopify.formatMoney(cents, window.themeMoneyFormat || '${{amount}}');
        }
        return (Number(cents) / 100).toFixed(2);
      }

      function updatePriceSlider() {
        let minVal = Number(minRange.value);
        let maxVal = Number(maxRange.value);

        if (minVal > maxVal) {
          if (document.activeElement === minRange) {
            maxRange.value = String(minVal);
            maxVal = minVal;
          } else {
            minRange.value = String(maxVal);
            minVal = maxVal;
          }
        }

        const min = Number(minRange.min);
        const max = Number(maxRange.max);
        const span = max - min || 1;
        const left = ((minVal - min) / span) * 100;
        const right = ((maxVal - min) / span) * 100;

        if (fill) {
          fill.style.left = left + '%';
          fill.style.width = Math.max(0, right - left) + '%';
        }

        label.textContent = 'Price: ' + formatMoney(minVal) + ' — ' + formatMoney(maxVal);
      }

      minRange.addEventListener('input', updatePriceSlider);
      maxRange.addEventListener('input', updatePriceSlider);
      updatePriceSlider();
    });
  }

  if (headerNav) {
    headerNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) {
      setMenuOpen(false);
    }
  });

  document.querySelectorAll('[data-related-slider]').forEach((slider) => {
    const track = slider.querySelector('.product-related__track');
    const dotsWrap = slider.querySelector('[data-related-dots]');
    const slides = slider.querySelectorAll('.product-related__slide');
    if (!track || !dotsWrap || slides.length === 0) return;

    dotsWrap.innerHTML = '';
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'product-related__dot' + (index === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (index + 1));
      dot.addEventListener('click', () => {
        const slide = slides[index];
        if (slide) {
          track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
        }
      });
      dotsWrap.appendChild(dot);
    });

    track.addEventListener('scroll', () => {
      const dots = dotsWrap.querySelectorAll('.product-related__dot');
      let activeIndex = 0;
      let minDistance = Infinity;

      slides.forEach((slide, index) => {
        const distance = Math.abs(track.scrollLeft - (slide.offsetLeft - track.offsetLeft));
        if (distance < minDistance) {
          minDistance = distance;
          activeIndex = index;
        }
      });

      dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === activeIndex);
      });
    }, { passive: true });
  });

  function initStickyHeader() {
    const headerSection = document.querySelector('.section-header');
    if (!headerSection) return;

    const placeholder = document.createElement('div');
    placeholder.className = 'header-placeholder';
    placeholder.hidden = true;
    headerSection.insertAdjacentElement('afterend', placeholder);

    const stickAfter = 50;

    function updateStickyHeader() {
      const shouldStick = window.scrollY > stickAfter;

      if (shouldStick) {
        if (!headerSection.classList.contains('is-stuck')) {
          placeholder.style.height = headerSection.offsetHeight + 'px';
          placeholder.hidden = false;
          headerSection.classList.add('is-stuck');
        }
      } else {
        headerSection.classList.remove('is-stuck');
        placeholder.hidden = true;
        placeholder.style.height = '';
      }
    }

    window.addEventListener('scroll', updateStickyHeader, { passive: true });
    window.addEventListener('resize', updateStickyHeader);
    updateStickyHeader();
  }

  function changeCartLine(line, quantity) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ line: Number(line), quantity: Number(quantity) }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Cart update failed');
        return response.json();
      })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        window.location.reload();
      });
  }

  function initCartPage() {
    const cartForm = document.querySelector('[data-cart-form]');
    if (!cartForm) return;

    cartForm.querySelectorAll('[data-cart-qty-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const cartItem = input.closest('[data-cart-item]');
        const line = cartItem?.querySelector('[data-action="cart-remove"]')?.dataset.line;
        if (!line) return;

        const min = Number(input.min) || 0;
        const quantity = Math.max(min, Number(input.value) || min);
        input.value = String(quantity);
        changeCartLine(line, quantity);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initProductZoom();
    initStickyHeader();
    initCollectionPage();
    initCollectionPriceFilter();
    initCartPage();
  });
})();
