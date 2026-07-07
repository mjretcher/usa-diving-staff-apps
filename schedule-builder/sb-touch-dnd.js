(function(){
  try{
    var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if(!isTouch) return;

    var drag = null;       // active drag: {kind, dt, source, ghost, offX, offY, lastOver, moved}
    var pendingEv = null;  // grip touched, waiting for a move to start an event-row drag
    var lpTimer = null;    // long-press timer for session headers
    var startPt = null;    // initial touch point

    // A faithful, minimal stand-in for the native DataTransfer object.
    function makeDT(){
      var store = {};
      return {
        effectAllowed:'move', dropEffect:'move',
        setData:function(t,v){ store[t==='Text'?'text/plain':t] = String(v); },
        getData:function(t){ return store[t==='Text'?'text/plain':t] || ''; },
        clearData:function(t){ if(t){ delete store[t]; } else { store = {}; } },
        setDragImage:function(){},
        files:[], items:[], types:[]
      };
    }

    // Dispatch a synthetic, bubbling drag event carrying our dataTransfer + point.
    function fire(el, type, x, y, dt){
      if(!el) return;
      var ev = new Event(type, {bubbles:true, cancelable:true});
      ev.dataTransfer = dt;
      ev.clientX = x; ev.clientY = y;
      el.dispatchEvent(ev);
    }

    // Topmost real element under the finger (ghost hidden so it's never the hit).
    function topAt(x, y){
      var g = drag && drag.ghost;
      if(g) g.style.display = 'none';
      var el = document.elementFromPoint(x, y);
      if(g) g.style.display = '';
      return el;
    }

    function buildGhost(src, t){
      var r = src.getBoundingClientRect();
      var ghost = src.cloneNode(true);
      var s = ghost.style;
      s.position='fixed'; s.left=r.left+'px'; s.top=r.top+'px';
      s.width=r.width+'px'; s.margin='0'; s.pointerEvents='none';
      s.opacity='.92'; s.zIndex='99999'; s.background='#fff';
      s.borderRadius='10px'; s.boxShadow='0 10px 26px rgba(15,23,42,.28)';
      s.transform='scale(.99)';
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      drag.offX = t.clientX - r.left;
      drag.offY = t.clientY - r.top;
    }

    function startDrag(kind, source, t){
      drag = {kind:kind, dt:makeDT(), source:source, ghost:null,
              offX:0, offY:0, lastOver:null, moved:false};
      buildGhost(source, t);
      fire(source, 'dragstart', t.clientX, t.clientY, drag.dt); // sets UI.dragged* + visuals
    }

    function moveDrag(x, y){
      drag.moved = true;
      if(drag.ghost){
        drag.ghost.style.left = (x - drag.offX) + 'px';
        drag.ghost.style.top  = (y - drag.offY) + 'px';
      }
      var over = topAt(x, y);
      if(over !== drag.lastOver){
        if(drag.lastOver) fire(drag.lastOver, 'dragleave', x, y, drag.dt);
        drag.lastOver = over;
      }
      if(over) fire(over, 'dragover', x, y, drag.dt);
    }

    function endDrag(x, y, doDrop){
      var moved = drag.moved;
      try{
        if(doDrop && moved){
          var over = topAt(x, y);
          if(over) fire(over, 'drop', x, y, drag.dt);
        }
        if(drag.lastOver) fire(drag.lastOver, 'dragleave', x, y, drag.dt);
        fire(drag.source, 'dragend', x, y, drag.dt); // may be detached after a re-render — harmless
      }catch(e){}
      if(drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
      // Defensive cleanup in case dragend landed on a node a re-render already replaced.
      try{ if(typeof UI !== 'undefined'){ UI.draggedEvFrom = null; UI.draggedSessId = null; } }catch(e){}
      try{
        document.querySelectorAll('.sc-ev.dragging').forEach(function(n){ n.classList.remove('dragging'); n.style.outline=''; });
        document.querySelectorAll('.sc').forEach(function(n){ n.style.boxShadow=''; n.style.opacity=''; n.classList.remove('sess-drop-above','sess-drop-below'); });
        document.querySelectorAll('.dp').forEach(function(n){ n.classList.remove('drop-target','drop-active'); });
      }catch(e){}
      drag = null;
      if(moved) swallowNextClick();
    }

    // Stop the phantom click that fires after a touch sequence from toggling things.
    function swallowNextClick(){
      var fn = function(e){ e.stopPropagation(); e.preventDefault(); cleanup(); };
      var cleanup = function(){ document.removeEventListener('click', fn, true); };
      document.addEventListener('click', fn, true);
      setTimeout(cleanup, 450);
    }

    document.addEventListener('touchstart', function(e){
      if(drag || e.touches.length !== 1) return;
      var t = e.touches[0];
      startPt = {x:t.clientX, y:t.clientY};
      var el = e.target;
      // 1) Event-row grip → arm an event drag (begins on first finger move).
      var handle = el && el.closest && el.closest('.ev-handle');
      if(handle){
        var row = handle.closest('[data-ev][draggable]');
        if(row){ pendingEv = {row:row}; e.preventDefault(); return; }
      }
      // 2) Session header → long-press to pick up the whole session.
      var hd = el && el.closest && el.closest('.sc-hd');
      if(hd){
        lpTimer = setTimeout(function(){
          lpTimer = null;
          var lt = startPt || t;
          startDrag('sess', hd, {clientX:lt.x, clientY:lt.y});
        }, 400);
      }
    }, {passive:false});

    document.addEventListener('touchmove', function(e){
      var t = e.touches[0]; if(!t) return;
      // Cancel a queued long-press if the finger wandered (it was a scroll/tap).
      if(lpTimer && startPt){
        if(Math.abs(t.clientX-startPt.x) > 8 || Math.abs(t.clientY-startPt.y) > 8){
          clearTimeout(lpTimer); lpTimer = null;
        }
      }
      // Begin a pending event-row drag once the finger clearly moves.
      if(pendingEv && !drag && startPt){
        if(Math.abs(t.clientX-startPt.x) > 6 || Math.abs(t.clientY-startPt.y) > 6){
          startDrag('ev', pendingEv.row, t);
          pendingEv = null;
        }
      }
      if(drag){ e.preventDefault(); moveDrag(t.clientX, t.clientY); }
    }, {passive:false});

    function finish(e, doDrop){
      if(lpTimer){ clearTimeout(lpTimer); lpTimer = null; }
      pendingEv = null;
      if(drag){
        var t = (e.changedTouches && e.changedTouches[0]) || {clientX:0, clientY:0};
        endDrag(t.clientX, t.clientY, doDrop);
        e.preventDefault();
      }
    }
    document.addEventListener('touchend',    function(e){ finish(e, true);  }, {passive:false});
    document.addEventListener('touchcancel', function(e){ finish(e, false); }, {passive:false});

  }catch(err){ /* touch bridge failed to initialise — desktop is unaffected */ }
})();
