/* shared/usad-modal.js — styled in-app dialogs to replace native confirm/prompt/alert.
   API:
     USAD.modal.confirm({ title, body, confirmLabel, cancelLabel, danger })   -> Promise<boolean>
     USAD.modal.prompt ({ title, body, placeholder, defaultValue, confirmLabel, cancelLabel, validate }) -> Promise<string|null>
     USAD.modal.alert  ({ title, body, confirmLabel })                        -> Promise<void>
     USAD.modal.open   ({ title, contentHTML, buttons:[{label,kind,onClick:(close)=>{}}] }) -> {close}
   Markup is appended to <body>; styled in shared/design.css (extended below in app stylesheets).
*/
(function () {
  'use strict';

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    for (const k of kids) {
      if (k == null) continue;
      n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    }
    return n;
  }

  let openCount = 0;

  function open(opts) {
    const overlay = el('div', { class: 'usad-modal-overlay', role: 'presentation' });
    const dialog = el('div', { class: 'usad-modal', role: 'dialog', 'aria-modal': 'true' });
    const titleId = 'usad-modal-title-' + Math.random().toString(36).slice(2, 8);
    dialog.setAttribute('aria-labelledby', titleId);

    const head = el('header', { class: 'usad-modal-head' });
    const titleEl = el('h2', { class: 'usad-modal-title', id: titleId }, opts.title || '');
    head.appendChild(titleEl);

    const body = el('div', { class: 'usad-modal-body' });
    if (opts.contentHTML) body.innerHTML = opts.contentHTML;
    else if (opts.body) body.appendChild(typeof opts.body === 'string' ? document.createTextNode(opts.body) : opts.body);

    const foot = el('footer', { class: 'usad-modal-foot' });

    const close = (result) => {
      overlay.classList.remove('open');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        openCount--;
        if (openCount <= 0) {
          document.body.classList.remove('usad-modal-active');
          openCount = 0;
        }
      }, 120);
      if (opts._onClose) opts._onClose(result);
    };

    const buttons = (opts.buttons || []).map(btnSpec => {
      const cls = 'usad-modal-btn ' + (btnSpec.kind === 'primary' ? 'primary'
                  : btnSpec.kind === 'danger' ? 'danger'
                  : 'secondary');
      const b = el('button', { class: cls, type: 'button' }, btnSpec.label);
      b.addEventListener('click', () => {
        if (btnSpec.onClick) {
          const ret = btnSpec.onClick(close, dialog);
          if (ret === false) return; // allow validation to block close
        } else {
          close(btnSpec.value);
        }
      });
      return b;
    });
    buttons.forEach(b => foot.appendChild(b));

    dialog.appendChild(head);
    dialog.appendChild(body);
    if (buttons.length) dialog.appendChild(foot);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && opts.dismissOnOverlay !== false) close(null);
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && overlay.parentNode) {
        document.removeEventListener('keydown', escHandler);
        close(null);
      }
    });

    document.body.classList.add('usad-modal-active');
    document.body.appendChild(overlay);
    openCount++;
    requestAnimationFrame(() => overlay.classList.add('open'));

    // Auto-focus first input or primary button
    setTimeout(() => {
      const focusEl = dialog.querySelector('input, textarea, select, .usad-modal-btn.primary');
      if (focusEl) focusEl.focus();
    }, 40);

    return { close, dialog, body };
  }

  function confirm_(opts) {
    return new Promise((resolve) => {
      open({
        title: opts.title || 'Confirm',
        body: opts.body || '',
        _onClose: (r) => resolve(Boolean(r)),
        buttons: [
          { label: opts.cancelLabel || 'Cancel', kind: 'secondary', onClick: (close) => close(false) },
          { label: opts.confirmLabel || 'Confirm', kind: opts.danger ? 'danger' : 'primary',
            onClick: (close) => close(true) }
        ]
      });
    });
  }

  function prompt_(opts) {
    return new Promise((resolve) => {
      const input = el('input', {
        type: opts.inputType || 'text',
        class: 'usad-modal-input',
        placeholder: opts.placeholder || '',
        value: opts.defaultValue || ''
      });
      const errMsg = el('div', { class: 'usad-modal-error' });
      const wrap = el('div', { class: 'usad-modal-prompt' });
      if (opts.body) wrap.appendChild(el('div', { class: 'usad-modal-prompt-body' }, opts.body));
      wrap.appendChild(input);
      wrap.appendChild(errMsg);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      });

      const ctx = open({
        title: opts.title || 'Enter value',
        body: wrap,
        _onClose: (r) => resolve(r === undefined ? null : r),
        buttons: [
          { label: opts.cancelLabel || 'Cancel', kind: 'secondary', onClick: (close) => close(null) },
          { label: opts.confirmLabel || 'OK', kind: 'primary', onClick: () => submit() }
        ]
      });

      function submit() {
        const value = input.value.trim();
        if (opts.validate) {
          const verdict = opts.validate(value);
          if (verdict !== true && verdict !== undefined) {
            errMsg.textContent = String(verdict || 'Invalid value');
            errMsg.classList.add('show');
            input.focus();
            return false;
          }
        }
        ctx.close(value);
        return true;
      }
    });
  }

  function alert_(opts) {
    return new Promise((resolve) => {
      open({
        title: opts.title || 'Notice',
        body: opts.body || '',
        _onClose: () => resolve(),
        buttons: [
          { label: opts.confirmLabel || 'OK', kind: 'primary', onClick: (close) => close(true) }
        ]
      });
    });
  }

  window.USAD = window.USAD || {};
  window.USAD.modal = { open, confirm: confirm_, prompt: prompt_, alert: alert_ };
})();
