/**
 * Amadal — Auth dropdown, custom email forms, Shopify account sheet handoff
 */
(function () {
  'use strict';

  const authModal = document.getElementById('AuthModal');
  const accountWidget = document.querySelector('[data-auth-widget]');
  const accountDropdown = document.getElementById('HeaderAccountMenu');
  const themeAuth = window.themeAuth || {};
  let pendingEmail = '';

  function useShopifyAccount() {
    if (accountWidget?.dataset.useShopifyAccount === 'true') return true;
    return Boolean(themeAuth.useShopifyAccount);
  }

  function showAuthPanel(root, view) {
    if (!root) return;

    root.querySelectorAll('[data-auth-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.authPanel !== view;
    });
  }

  function getShopifyAccount() {
    return document.querySelector('[data-shopify-account-host] shopify-account, shopify-account');
  }

  function waitForShopifyAccount() {
    if (!useShopifyAccount()) {
      return Promise.resolve(null);
    }

    return customElements.whenDefined('shopify-account').then(() => getShopifyAccount() || null);
  }

  function setNativeInputValue(input, value) {
    if (!input || !value) return;

    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    );

    if (descriptor?.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function queryDeep(selector, root) {
    if (!root) return null;

    function search(node) {
      if (!node) return null;

      if (node.querySelector) {
        const direct = node.querySelector(selector);
        if (direct) return direct;
      }

      const elements = node.querySelectorAll ? node.querySelectorAll('*') : [];
      for (const element of elements) {
        if (element.shadowRoot) {
          const nested = search(element.shadowRoot);
          if (nested) return nested;
        }
      }

      return null;
    }

    return search(root);
  }

  function findLoginEmailInput(root) {
    return (
      queryDeep('#login-form-email', root) ||
      queryDeep('input.login-form__email-input', root) ||
      queryDeep('input[type="email"]', root)
    );
  }

  function findLoginSubmitButton(root, emailInput) {
    const form = emailInput?.closest('form');
    if (form) {
      const submit = form.querySelector('button[type="submit"]');
      if (submit) return submit;
    }

    return queryDeep('button[type="submit"]', root);
  }

  function isOtpStep(root) {
    if (!root) return false;

    return Boolean(
      queryDeep('input[autocomplete="one-time-code"]', root) ||
        queryDeep('input[inputmode="numeric"]', root)
    );
  }

  function prefillLoginForm(loginForm, email) {
    const root = loginForm.shadowRoot || loginForm;
    if (!root || !email || isOtpStep(root)) return false;

    const emailInput = findLoginEmailInput(root);
    if (!emailInput) return false;

    setNativeInputValue(emailInput, email);

    const submitButton = findLoginSubmitButton(root, emailInput);
    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    }

    return true;
  }

  function prefillAccountSheet(email) {
    const account = getShopifyAccount();
    if (!account || !email) return false;

    const accountRoot = account.shadowRoot;
    if (!accountRoot || isOtpStep(accountRoot)) return false;

    const loginForm =
      accountRoot.querySelector('shopify-login-form') ||
      queryDeep('shopify-login-form', accountRoot);

    if (loginForm && prefillLoginForm(loginForm, email)) {
      return true;
    }

    const emailInput = findLoginEmailInput(accountRoot);
    if (!emailInput) return false;

    setNativeInputValue(emailInput, email);

    const submitButton = findLoginSubmitButton(accountRoot, emailInput);
    if (submitButton && !submitButton.disabled) {
      submitButton.click();
    }

    return true;
  }

  function schedulePrefillAttempts(email) {
    const account = getShopifyAccount();
    if (!account || !email) return;

    let observer;
    let attempts = 0;
    const maxAttempts = 50;

    const tryPrefill = () => {
      attempts += 1;
      if (prefillAccountSheet(email)) {
        cleanup();
        return true;
      }
      if (attempts >= maxAttempts) {
        cleanup();
      }
      return false;
    };

    function cleanup() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (pollId) {
        window.clearInterval(pollId);
        pollId = null;
      }
    }

    const pollId = window.setInterval(tryPrefill, 120);

    if (account.shadowRoot) {
      observer = new MutationObserver(tryPrefill);
      observer.observe(account.shadowRoot, {
        childList: true,
        subtree: true,
      });
    }

    tryPrefill();
  }

  function bindAccountPrefillListeners(account) {
    if (!account?.shadowRoot || account.dataset.prefillBound === 'true') return;
    account.dataset.prefillBound = 'true';

    account.shadowRoot.addEventListener('login-form-loader:ready', (event) => {
      const email = pendingEmail;
      const loginForm = event.detail?.form;
      if (!email || !loginForm) return;

      window.requestAnimationFrame(() => {
        prefillLoginForm(loginForm, email);
      });
    });
  }

  function openAccountSheet(email) {
    pendingEmail = email || '';
    const account = getShopifyAccount();

    if (email) {
      schedulePrefillAttempts(email);
    }

    if (account && typeof account.showModal === 'function') {
      account.showModal();
      return;
    }

    const trigger = document.querySelector('[data-auth-account-trigger]');
    if (trigger) {
      trigger.click();
      return;
    }

    const avatar = account?.shadowRoot?.querySelector('[part="signed-out-avatar"]');
    avatar?.click();
  }

  function initAuthRoot(root) {
    if (!root || root.dataset.authInit === 'true') return;
    root.dataset.authInit = 'true';

    root.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-auth-show]');
      if (!trigger || !root.contains(trigger)) return;
      event.preventDefault();
      showAuthPanel(root, trigger.dataset.authShow);
    });

    root.querySelectorAll('[data-auth-email-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value?.trim();
        if (!email) return;

        setAuthModalOpen(false);
        openAccountSheet(email);
      });
    });

    if (window.location.hash === '#recover') {
      showAuthPanel(root, 'recover');
      return;
    }

    const initialView = root.dataset.initialView;
    if (initialView) {
      showAuthPanel(root, initialView);
    }
  }

  function setAccountMenuOpen(isOpen) {
    if (!accountDropdown) return;

    accountDropdown.hidden = !isOpen;

    const trigger = accountWidget?.querySelector('[data-action="toggle-account-menu"]');
    if (trigger) {
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  function setAuthModalOpen(isOpen, view) {
    if (!authModal) return;

    authModal.hidden = !isOpen;
    document.body.classList.toggle('auth-modal-open', isOpen);

    if (isOpen) {
      const root = authModal.querySelector('[data-auth-root]');
      initAuthRoot(root);
      showAuthPanel(root, view || 'login');
      authModal.querySelector('[data-action="close-auth-modal"]')?.focus();
    }
  }

  document.querySelectorAll('[data-auth-root]').forEach(initAuthRoot);

  waitForShopifyAccount().then((account) => {
    if (!account) return;

    bindAccountPrefillListeners(account);

    account.addEventListener('open', () => {
      setAccountMenuOpen(false);
      setAuthModalOpen(false);

      if (pendingEmail) {
        schedulePrefillAttempts(pendingEmail);
      }
    });

    account.addEventListener('close', () => {
      pendingEmail = '';
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) {
      if (accountWidget && !accountWidget.contains(event.target)) {
        setAccountMenuOpen(false);
      }
      return;
    }

    const action = target.dataset.action;

    if (action === 'toggle-account-menu') {
      event.preventDefault();
      setAccountMenuOpen(accountDropdown?.hidden ?? true);
      return;
    }

    if (action === 'open-auth') {
      event.preventDefault();
      setAccountMenuOpen(false);
      setAuthModalOpen(true, target.dataset.authView || 'login');
      return;
    }

    if (action === 'close-auth-modal') {
      event.preventDefault();
      setAuthModalOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setAccountMenuOpen(false);
      if (authModal && !authModal.hidden) {
        setAuthModalOpen(false);
      }
    }
  });
})();
