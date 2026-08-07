/* ==========================================================================
   USA Diving — keep your place across a redraw
   --------------------------------------------------------------------------
   Every panel in these apps redraws by rebuilding its own innerHTML. That is
   simple and it works, but it silently throws away three things at once:

     where you were on the page,
     which control you were typing in and where the caret was,
     which collapsible sections you had opened.

   The result is a panel that fights you: change one dropdown and you are back
   at the top of the page with the section you were working in closed. It was
   fixed three separate times in one day -- Pricing Studio, the report builder,
   Boundary Studio's panel -- before it was worth admitting it is one problem
   and not three.

   USE around(). It captures, runs the redraw, and restores, so there is no way
   to capture and then forget to restore:

       KeepPlace.around('bsPanel', () => {
         host.innerHTML = buildEverything();
         wireHandlers();
       });

   capture() and restore() are exposed for the awkward cases (an async redraw,
   or one that replaces the host element itself), but around() is what should be
   reached for.

   WHAT IT IDENTIFIES CONTROLS BY
     An element's id, or its data-* attributes. Those survive a rebuild because
     they are how the handlers find their controls in the first place. Nothing
     is remembered about position in the DOM, which would not survive anything.

   WHAT IT DELIBERATELY DOES NOT DO
     It does not preserve values. If a redraw loses what someone typed, that is
     a state bug in the panel and papering over it here would hide it.
   ========================================================================== */
(function () {
'use strict';

function hostOf(target) {
  if (!target) return document.body;
  if (typeof target === 'string') {
    return document.getElementById(target) || document.querySelector(target) || document.body;
  }
  return target;
}

/* A selector that will still find this control after the rebuild. */
function keyFor(el) {
  if (!el || !el.tagName || !el.attributes) return null;
  if (el.id) return '#' + CSS_escape(el.id);
  var parts = [];
  for (var i = 0; i < el.attributes.length; i++) {
    var a = el.attributes[i];
    if (a.name.indexOf('data-') === 0) {
      parts.push('[' + a.name + '="' + String(a.value).replace(/"/g, '\\"') + '"]');
    }
  }
  return parts.length ? el.tagName.toLowerCase() + parts.join('') : null;
}

/* CSS.escape is not everywhere; ids here are tame, so a light fallback is fine. */
function CSS_escape(s) {
  if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
  return String(s).replace(/([^\w-])/g, '\\$1');
}

/* Collapsible sections, keyed the same way so they survive too. Open/closed is
   a user decision and a redraw has no business overruling it. */
function detailsState(host) {
  var out = [];
  var list = host.querySelectorAll ? host.querySelectorAll('details') : [];
  for (var i = 0; i < list.length; i++) {
    var d = list[i];
    var k = keyFor(d) || (d.className ? 'details.' + String(d.className).trim().split(/\s+/).join('.') : null);
    if (k) out.push({key: k, open: !!d.open});
  }
  return out;
}

function capture(target) {
  var host = hostOf(target);
  var el = document.activeElement;
  var st = {
    host: (typeof target === 'string') ? target : null,
    win: window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0,
    boxes: [],
    key: null,
    sel: null,
    details: detailsState(host)
  };

  /* Anything inside the panel that is actually scrolled -- the host itself, and
     any descendant. A modal body scrolls independently of the window, and it is
     usually NOT an ancestor of whatever has focus: click a toggle button and
     nothing is focused at all. Walking up from the focused element therefore
     misses exactly the case that matters, which is how the report builder
     regressed when this was first shared out. Recording whatever is scrolled is
     both simpler and right. */
  var scrollers = [host];
  if (host.querySelectorAll) {
    var kids = host.querySelectorAll('*');
    for (var q = 0; q < kids.length && scrollers.length < 12; q++) {
      if (kids[q].scrollTop) scrollers.push(kids[q]);
    }
  }
  for (var i = 0; i < scrollers.length; i++) {
    var sc = scrollers[i];
    if (sc && sc.scrollTop) {
      var k = keyFor(sc) || (sc.className ? '.' + String(sc.className).trim().split(/\s+/)[0] : null);
      if (k) st.boxes.push({key: k, top: sc.scrollTop});
    }
  }

  if (host && el && el !== host && host.contains && host.contains(el)) {
    st.key = keyFor(el);
    // Number inputs throw on selectionStart in some browsers; the caret is not
    // worth an exception.
    try { st.sel = [el.selectionStart, el.selectionEnd]; } catch (e) { st.sel = null; }
  }
  return st;
}

function restore(st, target) {
  if (!st) return;
  var host = hostOf(target != null ? target : st.host);

  if (st.details && host.querySelector) {
    for (var i = 0; i < st.details.length; i++) {
      var d = st.details[i], el = null;
      try { el = host.querySelector(d.key); } catch (e) {}
      if (el && el.open !== d.open) el.open = d.open;
    }
  }

  if (st.key && host.querySelector) {
    var f = null;
    try { f = host.querySelector(st.key); } catch (e) {}
    if (f) {
      try { f.focus({preventScroll: true}); } catch (e) { try { f.focus(); } catch (e2) {} }
      if (st.sel && st.sel[0] != null) {
        try { f.setSelectionRange(st.sel[0], st.sel[1]); } catch (e) {}
      }
    }
  }

  if (st.boxes && host.querySelector) {
    for (var j = 0; j < st.boxes.length; j++) {
      var b = st.boxes[j], box = null;
      try { box = host.querySelector(b.key); } catch (e) {}
      if (!box && host.matches) { try { if (host.matches(b.key)) box = host; } catch (e) {} }
      if (box) box.scrollTop = b.top;
    }
  }

  if (st.win) { try { window.scrollTo(0, st.win); } catch (e) {} }
}

/* The one to use. Handles a promise-returning redraw too. */
function around(target, fn) {
  var st = capture(target);
  var done = function () { restore(st, target); };
  var r;
  try {
    r = fn();
  } catch (e) {
    done();
    throw e;
  }
  if (r && typeof r.then === 'function') return r.then(function (v) { done(); return v; },
                                                       function (e) { done(); throw e; });
  done();
  return r;
}

window.KeepPlace = {around: around, capture: capture, restore: restore};

})();
