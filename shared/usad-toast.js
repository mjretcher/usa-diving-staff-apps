/* shared/usad-toast.js — non-blocking notifications.
   API:
     USAD.toast('Saved');
     USAD.toast('Error loading data', { kind: 'error', duration: 5000 });
   kinds: 'info' (default), 'success', 'warn', 'error'.
*/
(function () {
  'use strict';

  let stack = null;

  function ensureStack() {
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'usad-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      stack.setAttribute('aria-atomic', 'false');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, opts) {
    opts = opts || {};
    const duration = typeof opts.duration === 'number' ? opts.duration : 2600;
    const kind = opts.kind || 'info';
    const node = document.createElement('div');
    node.className = 'usad-toast usad-toast-' + kind;
    node.textContent = message;
    ensureStack().appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    const remove = () => {
      node.classList.remove('show');
      setTimeout(() => {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 200);
    };
    const t = setTimeout(remove, duration);
    node.addEventListener('click', () => { clearTimeout(t); remove(); });
    return remove;
  }

  window.USAD = window.USAD || {};
  window.USAD.toast = toast;
})();
