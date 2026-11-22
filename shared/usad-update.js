/* USA Diving Staff Platform — "Update now" bar.
 *
 * One script for the landing page and every tool. When a newer build of the
 * page is live, a bar appears across the top:
 *
 *     A new version of this page is ready.   [ Update now ]
 *
 * No bar means the page is already the latest. Nothing reloads by itself.
 *
 * HOW A PAGE USES IT
 *   <script src="../shared/usad-update.js?v=..." data-app="schedule-builder"
 *           data-build="dev"></script>
 *
 *   data-app    the page's key in version.json ("landing" for the home page,
 *               otherwise the tool's folder name).
 *   data-build  left as "dev" in the repo. tools/stamp-build.mjs replaces it
 *               with the real build id when the site is published (GitHub
 *               Pages workflow and the Vercel build both run it), and writes
 *               the same ids to /version.json. While it still reads "dev"
 *               (local development, file://) no checking happens at all.
 *
 * The live id is read from version.json next to this deployment's shared/
 * folder, so a page always compares against the deployment it came from.
 * (/api/version returns the same file on the Vercel host, sent no-store. GitHub
 * Pages has no server side, so there the file is fetched with a fresh query
 * string each time, which is what keeps it from being cached.)
 *
 * SAVING BEFORE THE RELOAD
 *   USADUpdate.beforeReload(function () { ...; return optionalPromise; });
 * Every registered function runs when Update now is pressed, and the reload
 * waits for the promises (up to 8 seconds). Tools that keep a delayed cloud
 * save register one so the save lands first.
 */
(function () {
  'use strict';
  if (window.USADUpdate) return;

  var tag = document.currentScript;
  var BUILD = (tag && tag.getAttribute('data-build')) || '';
  var APP = (tag && tag.getAttribute('data-app')) || 'landing';
  var hooks = [];
  var api = window.USADUpdate = {
    app: APP,
    build: BUILD,
    beforeReload: function (fn) { if (typeof fn === 'function') hooks.push(fn); },
    _show: function () { showBar(); }
  };

  var CHECK_MS = 60 * 1000;          // slow timer
  var VISIBLE_FLOOR_MS = 10 * 1000;  // never re-check faster than this on tab switches
  var IDLE_MS = 20 * 60 * 1000;      // stop after this long with no taps or keys
  var SAVE_WAIT_MS = 8000;

  var versionUrl = '';
  try { versionUrl = new URL('../version.json', tag.src).href; } catch (e) {}

  // Local development, an unstamped page, a file:// copy, or a page shown
  // inside another page (print frames, embeds): never check.
  var live = !!versionUrl && /^[0-9a-f]{8,40}$/.test(BUILD) &&
    /^https?:$/.test(location.protocol) && window.top === window;

  var shown = false, timer = null, inflight = false;
  var lastAct = Date.now(), lastCheck = Date.now();

  function idle() { return Date.now() - lastAct > IDLE_MS; }

  function schedule(floor) {
    clearTimeout(timer); timer = null;
    if (!live || shown || document.visibilityState === 'hidden' || idle()) return;
    var wait = Math.max(0, (floor || CHECK_MS) - (Date.now() - lastCheck));
    timer = setTimeout(check, wait);
  }

  function check() {
    timer = null;
    if (!live || shown || inflight || document.visibilityState === 'hidden' || idle()) return;
    inflight = true; lastCheck = Date.now();
    fetch(versionUrl + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var id = j && ((j.apps && j.apps[APP]) || (APP === 'landing' && j.build));
        if (typeof id === 'string' && id && id !== BUILD) showBar();
      })
      .catch(function () {})
      .then(function () { inflight = false; schedule(); });
  }

  function active() {
    lastAct = Date.now();
    if (!timer && !shown && !inflight) schedule();
  }

  if (live) {
    document.addEventListener('pointerdown', active, { capture: true, passive: true });
    document.addEventListener('keydown', active, { capture: true, passive: true });
    window.addEventListener('focus', active);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { lastAct = Date.now(); schedule(VISIBLE_FLOOR_MS); }
      else { clearTimeout(timer); timer = null; }
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { lastAct = Date.now(); schedule(VISIBLE_FLOOR_MS); }
    });
    schedule();
  }

  /* ---------------------------------------------------------------- bar */

  var bar = null;

  var CSS =
    ':root{--usad-update-h:0px}' +
    '#usad-update-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;box-sizing:border-box;' +
      'display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px 14px;' +
      'min-height:44px;padding:7px 14px;margin:0;background:#8fc3ea;color:#171f69;' +
      'border-bottom:1px solid #171f69;' +
      "font:600 14px/1.3 Inter,system-ui,-apple-system,'Segoe UI',Arial,sans-serif;" +
      'letter-spacing:0;text-transform:none;text-align:center}' +
    '#usad-update-bar span{color:#171f69}' +
    '#usad-update-bar button{appearance:none;-webkit-appearance:none;flex:none;margin:0;' +
      'min-height:34px;padding:6px 16px;border:0;border-radius:6px;background:#171f69;color:#fff;' +
      'font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}' +
    '#usad-update-bar button:hover{background:#0d1040}' +
    '#usad-update-bar button:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '#usad-update-bar button[disabled]{opacity:.75;cursor:progress}' +
    'html.usad-update-on{box-sizing:border-box;padding-top:var(--usad-update-h)}' +
    '@media print{#usad-update-bar{display:none!important}:root{--usad-update-h:0px!important}}';

  function showBar() {
    if (shown) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', showBar); return; }
    shown = true; clearTimeout(timer); timer = null;

    var st = document.createElement('style');
    st.id = 'usad-update-style'; st.textContent = CSS;
    document.head.appendChild(st);

    bar = document.createElement('div');
    bar.id = 'usad-update-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    var msg = document.createElement('span');
    msg.textContent = 'A new version of this page is ready.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Update now';
    btn.addEventListener('click', function () { update(btn); });
    bar.appendChild(msg); bar.appendChild(btn);
    document.body.appendChild(bar);

    document.documentElement.classList.add('usad-update-on');
    measure();
    window.addEventListener('resize', measure);
    if (window.ResizeObserver) { try { new ResizeObserver(measure).observe(bar); } catch (e) {} }

    // The bar sits above the page, so everything pinned to the top of the
    // screen (the tool's own header and anything stacked under it) moves
    // down by the bar's height instead of being covered.
    shiftPinned(document.body, true);
    document.addEventListener('scroll', queueSticky, { capture: true, passive: true });
    window.addEventListener('resize', queueSticky);
    if (window.MutationObserver) {
      var queue = [], qt = null;
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var added = list[i].addedNodes;
          for (var k = 0; k < added.length; k++) if (added[k].nodeType === 1 && added[k] !== bar) queue.push(added[k]);
        }
        if (queue.length && !qt) qt = setTimeout(function () {
          qt = null; var q = queue; queue = [];
          for (var n = 0; n < q.length; n++) if (q[n].isConnected) shiftPinned(q[n], false);
        }, 60);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  function measure() {
    if (!bar) return;
    var h = Math.ceil(bar.getBoundingClientRect().height) || 44;
    document.documentElement.style.setProperty('--usad-update-h', h + 'px');
  }

  // True when the element scrolls with the page itself rather than inside a
  // scrolling panel. Only those sticky elements stick to the top of the screen.
  function pageScrolled(el) {
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var o = getComputedStyle(p);
      if (/(auto|scroll|hidden|overlay)/.test(o.overflowY + ' ' + o.overflowX)) return false;
    }
    return true;
  }

  function shiftOne(el) {
    if (el.__usadShifted || el === bar || !el.style || el.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    var cs = getComputedStyle(el), pos = cs.position;
    if (pos !== 'fixed' && pos !== 'sticky') return;
    var top = cs.top;
    if (!/px$/.test(top)) return;                       // auto, or a percentage on a hidden element
    var px = parseFloat(top);
    if (!(px >= 0) || px > window.innerHeight * 0.3) return; // off-screen parking or a centred dialog
    if (pos === 'sticky') {
      // Sticky headers are moved only once they are actually found under the
      // bar. Depending on how a page scrolls, some already stop below it.
      if (pageScrolled(el)) { el.__usadShifted = true; sticky.push({ el: el, top: top }); queueSticky(); }
      return;
    }
    el.__usadShifted = true;
    el.style.setProperty('top', 'calc(' + top + ' + var(--usad-update-h, 0px))', 'important');
  }

  var sticky = [], stickyQueued = false;
  function queueSticky() {
    if (stickyQueued || !sticky.length) return;
    stickyQueued = true;
    requestAnimationFrame(function () {
      stickyQueued = false;
      var h = bar ? bar.getBoundingClientRect().height : 0, keep = [];
      for (var i = 0; i < sticky.length; i++) {
        var s = sticky[i];
        if (!s.el.isConnected) continue;
        var r = s.el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > 0 && r.top < h - 1) {
          s.el.style.setProperty('top', 'calc(' + s.top + ' + var(--usad-update-h, 0px))', 'important');
        } else keep.push(s);
      }
      sticky = keep;
    });
  }

  function shiftPinned(root, all) {
    shiftOne(root);
    var list;
    if (all) list = root.querySelectorAll('*');
    else {
      list = root.querySelectorAll('*');
      if (list.length > 600) list = root.querySelectorAll(':scope > *, :scope > * > *, :scope > * > * > *');
    }
    for (var i = 0; i < list.length; i++) shiftOne(list[i]);
  }

  /* ------------------------------------------------------------- update */

  function timeout(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  function update(btn) {
    if (btn.disabled) return;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');

    // Anything half-typed commits first: leaving the field fires the same
    // change handler a click elsewhere would.
    try { var a = document.activeElement; if (a && a !== btn && a !== document.body && a.blur) a.blur(); } catch (e) {}

    var waits = [];
    for (var i = 0; i < hooks.length; i++) {
      try { var r = hooks[i](); if (r && typeof r.then === 'function') waits.push(r.then(null, function () {})); }
      catch (e) { try { console.error('[usad-update] save hook failed', e); } catch (_) {} }
    }
    try { window.dispatchEvent(new Event('usad:before-update')); } catch (e) {}

    Promise.race([Promise.all(waits), timeout(SAVE_WAIT_MS)])
      .then(function () {
        // Refresh the browser's stored copy of this page so the reload cannot
        // hand back the old one.
        return Promise.race([
          fetch(location.href, { cache: 'reload', credentials: 'same-origin' }).catch(function () {}),
          timeout(4000)
        ]);
      })
      .then(function () { location.reload(); });
  }
})();
