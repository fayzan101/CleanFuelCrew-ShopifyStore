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
      const input = stepper?.querySelector('input[name="quantity"]');
      if (!input) return;

      const current = Number(input.value) || 1;
      const min = Number(input.min) || 1;
      const next = action === 'qty-plus' ? current + 1 : Math.max(min, current - 1);
      input.value = String(next);
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
    }
  });

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

  document.addEventListener('DOMContentLoaded', () => {
    initProductZoom();
    initStickyHeader();
  });
})();
