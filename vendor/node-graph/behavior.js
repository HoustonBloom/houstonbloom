/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/components/node-graph/behavior.js
   version  2.0.0
   refresh  node sync.mjs node-graph "C:/Users/Megan/Claude_Projects/AI Projects/Houston Bloom/Website"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   node-graph · behaviour · v2.0.0

   A port of the Node App Template engine (START-HERE.html, SECTION 2, whose
   interaction layer was refined first on a communication map, 2026-08-10),
   made to read design tokens and a time position. v1.0.0 was a bespoke SVG
   graph written without it, and a review called it bad on sight; the rule
   it broke is "node maps start from the Node App Template". Everything the
   engine does, this does:

     tap a node and the camera reframes to hold it and its connections; tap
     the hub or the background, or press Escape, to come back out
     hover dims everything outside the focused node's neighbourhood
     a selection outranks the category filter: its neighbours come back
     radial layout by group, each group on its own ring, alternating
     links bow slightly and take the colour of the node they lead to
     every group has a shape as well as a colour, never colour alone
     label placement by priority, never overlapping a label, a dot or the
     overlay controls; only the focused label may force a position
     pan, drag, wheel zoom, zoom buttons, and a reset that refits

   What the time position adds (templates/activity-map.md):
     a node is on the map from its first entry; it fades in when it arrives
     size grows with its entries up to the position
     a node worked on that day wears the selection ring in its own colour
     the camera frames every node that will ever exist, so nothing moves
     while the reader scrubs

   Colours and type come from tokens: --map-cat-1..4 for groups, --color-bg
   for the label halo and dot outline, --color-text for labels,
   --font-body for the face. They are read at draw time, and a style or
   theme switch repaints without a remount.

     const graph = DSNodeGraph.mount(el, {
       subject:    { id, label },
       categories: [{ id, label, series, static?, shape? }],
       nodes:      [{ id, label, category, static?, links: [ids], since? }],
       onHover(id|null), onSelect(id|null)
     });
     graph.update({ visible: Set, today: Set, size: Map, cat: id|null });
     graph.select(id|null);

   Canvas draws the map. A visually hidden list of buttons mirrors the nodes
   on screen, so a keyboard or a screen reader can reach every one of them.

   Plain script, not a module, so a page that opens from disk can inline it.
   ============================================================================ */
(function () {
  if (window.DSNodeGraph) return;

  var SHAPES = { 1: 'circle', 2: 'square', 3: 'triangle', 4: 'star' };
  var VW = 1000, VH = 760, PAD = 48;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };

  function shapePts(shape, x, y, r) {
    var pts = [], i, a;
    if (shape === 'square') { var q = r * 0.78; return [[x - q, y - q], [x + q, y - q], [x + q, y + q], [x - q, y + q]]; }
    if (shape === 'triangle') { for (i = 0; i < 3; i++) { a = -Math.PI / 2 + i * 2 * Math.PI / 3; pts.push([x + r * 1.05 * Math.cos(a), y + r * 1.05 * Math.sin(a) + r * 0.12]); } return pts; }
    if (shape === 'diamond') return [[x, y - r * 1.05], [x + r * 1.05, y], [x, y + r * 1.05], [x - r * 1.05, y]];
    if (shape === 'star') { for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; var rr = (i % 2 === 0) ? r * 1.15 : r * 0.5; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); } return pts; }
    if (shape === 'hexagon') { for (i = 0; i < 6; i++) { a = -Math.PI / 2 + i * Math.PI / 3; pts.push([x + r * 0.95 * Math.cos(a), y + r * 0.95 * Math.sin(a)]); } return pts; }
    return null;
  }
  function shapeSVG(shape) {
    if (!shape || shape === 'circle') return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/></svg>';
    var pts = shapePts(shape, 10, 10, 7).map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><polygon points="' + pts + '" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  }

  function mount(host, opts) {
    var cats = opts.categories, byCat = {};
    cats.forEach(function (c) { c.shape = c.shape || SHAPES[c.series] || 'circle'; byCat[c.id] = c; });
    var hub = { id: '__hub', label: opts.subject.label, category: '__hub', hub: true, links: [] };
    var nodes = [hub].concat(opts.nodes.map(function (n) { return Object.assign({}, n); }));
    var byId = new Map(nodes.map(function (d) { return [d.id, d]; }));

    // Links: every node to the hub, plus the declared ones (a project to the principles it serves).
    var links = nodes.filter(function (d) { return !d.hub; }).map(function (d) { return [d.id, hub.id]; });
    nodes.forEach(function (d) { (d.links || []).forEach(function (t) { if (byId.has(t)) links.push([d.id, t]); }); });
    var neighbors = new Map(nodes.map(function (d) { return [d.id, new Set()]; }));
    links.forEach(function (l) { neighbors.get(l[0]).add(l[1]); neighbors.get(l[1]).add(l[0]); });

    // ---- radial layout by group, the template's rule ----------------------
    (function layout() {
      var order = cats.map(function (c) { return c.id; });
      hub.x = 0.5; hub.y = 0.5;
      var sector = 360 / Math.max(order.length, 1);
      order.forEach(function (cid, ci) {
        var group = nodes.filter(function (n) { return n.category === cid; })
          .sort(function (a, b) { return (a.since || '') < (b.since || '') ? -1 : (a.since || '') > (b.since || '') ? 1 : a.id < b.id ? -1 : 1; });
        var centerDeg = -90 + ci * sector, spread = Math.min(sector * 0.88, 80), N = group.length;
        group.forEach(function (n, j) {
          var t = N > 1 ? (j / (N - 1) - 0.5) : 0;
          var ring = ci % 2;
          if (order.length % 2 === 1 && ci === order.length - 1) ring = 2;
          var r = byCat[cid].static ? 0.2 : 0.3 + ring * 0.1 + (N > 6 ? (j % 2) * 0.07 : 0);
          var rad = (centerDeg + t * spread) * Math.PI / 180;
          n.x = 0.5 + r * Math.cos(rad); n.y = 0.5 + r * Math.sin(rad) * 0.92;
        });
      });
    })();

    host.classList.add('node-graph');
    host.setAttribute('data-component', 'node-graph');
    host.setAttribute('data-audit-ignore', '');
    host.innerHTML =
      '<canvas data-slot="canvas" aria-hidden="true"></canvas>' +
      '<div data-slot="zoom" role="group" aria-label="Zoom">' +
        '<button type="button" data-z="in" aria-label="Zoom in" title="Zoom in">+</button>' +
        '<button type="button" data-z="out" aria-label="Zoom out" title="Zoom out">&minus;</button>' +
        '<button type="button" data-z="fit" aria-label="Frame the whole map" title="Frame the whole map">&#9711;</button>' +
      '</div>' +
      '<p data-slot="hint">Drag to move · scroll to zoom · tap a node · tap the background to come back out</p>' +
      '<ul data-slot="a11y" aria-label="Nodes on the map"></ul>';
    var canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
    var a11y = host.querySelector('[data-slot="a11y"]');

    var state = { visible: new Set(nodes.map(function (d) { return d.id; })), today: new Set(), size: new Map(), cat: null };
    var anim = new Map(nodes.map(function (d) { return [d.id, { scale: 1, alpha: 1 }]; }));
    var selectedId = null, hoverId = null, catHover = null, cam = { s: 1, x: 0, y: 0 };
    var raf = null, lastT = 0, fallbackT = null;
    var W = 0, H = 0, OVERLAYS = [], BOTTOM = 0, RIGHT = 0;

    // ---- tokens ----------------------------------------------------------------
    var T = {};
    function readTokens() {
      var cs = getComputedStyle(host);
      var v = function (n, f) { return (cs.getPropertyValue(n) || '').trim() || f; };
      T.bg = v('--color-bg', '#f4efe4');
      T.ink = v('--color-text', '#1c1813');
      T.muted = v('--color-text-muted', '#524b40');
      T.rule = v('--color-border', '#d6cdb8');
      T.font = v('--font-body', 'system-ui, sans-serif');
      T.cat = {
        1: v('--map-cat-1', v('--color-accent', '#3c5a3a')),
        2: v('--map-cat-2', v('--color-accent-deep', '#2f4a2e')),
        3: v('--map-cat-3', v('--color-text-muted', '#524b40')),
        4: v('--map-cat-4', v('--color-border-strong', '#8a8275'))
      };
      T.hub = T.ink;
    }
    var colorOf = function (d) { return d.hub ? T.hub : T.cat[byCat[d.category].series] || T.muted; };
    var shapeOf = function (d) { return d.hub ? 'circle' : byCat[d.category].shape; };

    // ---- visibility and focus: the template's rules, plus time ------------------
    var present = function (d) { return d.hub || d.static || state.visible.has(d.id); };
    var matchGroup = function (d) { return !state.cat || d.hub || d.category === state.cat; };
    function focusNeighborhood() {
      var f = hoverId || selectedId; if (!f || !byId.has(f)) return null;
      return new Set([f].concat(Array.from(neighbors.get(f) || [])));
    }
    function visible() {
      var nb = focusNeighborhood();
      return nodes.filter(function (d) { return present(d) && (matchGroup(d) || (nb && nb.has(d.id))); });
    }
    var activeFocus = function () { return hoverId || selectedId; };
    function baseR(d) {
      if (d.hub) return 26;
      if (d.static) return 11;
      return 9 + Math.min(7, 1.5 * Math.sqrt(state.size.get(d.id) || 0));
    }
    var nodeR = function (d) { return baseR(d) * clamp(cam.s, 0.45, 1.4) * anim.get(d.id).scale; };
    var wpos = function (d) { return [d.x * VW, d.y * VH]; };
    var toScreen = function (wx, wy) { return [cam.x + wx * cam.s, cam.y + wy * cam.s]; };

    // ---- camera: fitTo and refit, the template's framing rule --------------------
    function measure() {
      var cr = canvas.getBoundingClientRect(); W = cr.width; H = cr.height; OVERLAYS = [];
      host.querySelectorAll('[data-slot="zoom"], [data-slot="hint"]').forEach(function (el) {
        var r = el.getBoundingClientRect(); if (!r.width) return;
        OVERLAYS.push([r.left - cr.left - 8, r.top - cr.top - 8, r.right - cr.left + 8, r.bottom - cr.top + 8]);
      });
      var hint = host.querySelector('[data-slot="hint"]'), zoom = host.querySelector('[data-slot="zoom"]');
      BOTTOM = hint && hint.getBoundingClientRect().height ? Math.round(hint.getBoundingClientRect().height) + 20 : 12;
      RIGHT = zoom && zoom.getBoundingClientRect().width ? 60 : 0;
    }
    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var r = host.getBoundingClientRect();
      canvas.width = Math.floor(r.width * dpr); canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); measure();
    }
    function fitTo(list, o) {
      if (!list || !list.length || !W) return; o = o || {};
      var xs = list.map(function (d) { return d.x * VW; }), ys = list.map(function (d) { return d.y * VH; });
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys) + 24;
      if (o.minSpan) {
        var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, mw = o.minSpan, mh = o.minSpan * (VH / VW);
        if (maxX - minX < mw) { minX = cx - mw / 2; maxX = cx + mw / 2; }
        if (maxY - minY < mh) { minY = cy - mh / 2; maxY = cy + mh / 2; }
      }
      var w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
      var pad = W < 560 ? 24 : PAD;
      var availH = Math.max(H - pad * 2 - BOTTOM, 80);
      cam.s = clamp(Math.min((W - pad * 2 - RIGHT) / w, availH / h) * (o.boost || 1), 0.3, o.maxScale || 3);
      cam.x = (W - RIGHT - (minX + maxX) * cam.s) / 2;
      cam.y = (H - BOTTOM - (minY + maxY) * cam.s) / 2;
    }
    // At rest the camera holds every node that will ever be on the map, so a
    // node arriving on the timeline appears in place instead of moving the view.
    function refit() {
      var nb = selectedId ? focusNeighborhood() : null;
      if (nb) fitTo(nodes.filter(function (d) { return nb.has(d.id) && present(d); }), { minSpan: 0.46 * VW, maxScale: 1.45, boost: 1.06 });
      else if (state.cat) fitTo(nodes.filter(function (d) { return d.category === state.cat; }).concat([hub]), { minSpan: 0.42 * VW, maxScale: 1.5, boost: 1.06 });
      else fitTo(nodes);
    }

    // ---- animation: the template's tween -------------------------------------------
    function targetsFor(d, fs) {
      return { scale: d.id === hoverId ? 1.3 : d.id === selectedId ? 1.14 : (fs && fs.has(d.id) ? 1.05 : 1), alpha: fs ? (fs.has(d.id) ? 1 : 0.13) : ((catHover || state.cat) && !d.hub && d.category !== (catHover || state.cat) ? (catHover ? 0.15 : 0.35) : 1) };
    }
    var focusSetNow = function () { var f = activeFocus(); return f ? new Set([f].concat(Array.from(neighbors.get(f) || []))) : null; };
    function settleNow() { if (raf) { cancelAnimationFrame(raf); raf = null; } var fs = focusSetNow(); nodes.forEach(function (d) { var a = anim.get(d.id), t = targetsFor(d, fs); a.scale = t.scale; a.alpha = t.alpha; }); draw(); }
    function tick(t) {
      clearTimeout(fallbackT); var k = clamp((t - lastT) / 16.7, 0, 3); lastT = t;
      var fs = focusSetNow(), moving = false;
      nodes.forEach(function (d) { var a = anim.get(d.id), tt = targetsFor(d, fs); a.scale = lerp(a.scale, tt.scale, 0.24 * k); a.alpha = lerp(a.alpha, tt.alpha, 0.24 * k); if (Math.abs(a.scale - tt.scale) > 0.002 || Math.abs(a.alpha - tt.alpha) > 0.004) moving = true; });
      draw(); raf = moving ? requestAnimationFrame(tick) : null;
    }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function requestRender() {
      if (reduce) return settleNow();
      draw(); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
      clearTimeout(fallbackT); fallbackT = setTimeout(settleNow, 260);
    }

    // ---- drawing -----------------------------------------------------------------------
    function traceShape(shape, x, y, r) {
      ctx.beginPath(); var pts = shapePts(shape, x, y, r);
      if (!pts) { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
      ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
    }
    function prio(d, focus) { if (d.id === focus) return 0; if (d.hub) return 1; if (focus && neighbors.get(focus) && neighbors.get(focus).has(d.id)) return 2; if (state.today.has(d.id)) return 3; return 4; }
    function draw() {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      var vis = visible(), visIds = new Set(vis.map(function (d) { return d.id; })), focus = activeFocus();
      // orbit rings: the hub's quiet guides
      var hp = toScreen.apply(null, wpos(hub));
      ctx.strokeStyle = T.rule; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
      [150, 230, 310].forEach(function (rr) { ctx.beginPath(); ctx.arc(hp[0], hp[1], rr * cam.s, 0, Math.PI * 2); ctx.stroke(); });
      ctx.globalAlpha = 1;
      links.forEach(function (l) {
        if (!visIds.has(l[0]) || !visIds.has(l[1])) return;
        var da = byId.get(l[0]), db = byId.get(l[1]);
        var p1 = toScreen.apply(null, wpos(da)), p2 = toScreen.apply(null, wpos(db));
        var hl = focus && (l[0] === focus || l[1] === focus);
        var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, nx = -(p2[1] - p1[1]), ny = p2[0] - p1[0], len = Math.hypot(nx, ny) || 1, bow = 0.08 * Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.quadraticCurveTo(mx + nx / len * bow, my + ny / len * bow, p2[0], p2[1]);
        var other = da.hub ? db : da;
        var toPrinciple = !da.hub && !db.hub;
        ctx.strokeStyle = colorOf(toPrinciple && db.static ? db : other);
        ctx.setLineDash(toPrinciple && !hl ? [3, 5] : []);
        ctx.globalAlpha = hl ? 0.9 : (focus ? 0.06 : (toPrinciple ? 0.4 : 0.3));
        ctx.lineWidth = hl ? 2 : 1.1; ctx.stroke(); ctx.setLineDash([]);
      });
      ctx.globalAlpha = 1;
      vis.forEach(drawNode);
      labels(vis, focus);
    }
    function drawNode(d) {
      var a = anim.get(d.id), sp = toScreen.apply(null, wpos(d)), r = nodeR(d), color = colorOf(d), shape = shapeOf(d), puff = Math.max(2.5, r * 0.34);
      ctx.globalAlpha = a.alpha;
      traceShape(shape, sp[0], sp[1] + 2, r); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      var ringed = d.id === selectedId || d.id === hoverId || state.today.has(d.id);
      if (ringed) { ctx.beginPath(); ctx.arc(sp[0], sp[1], r + 7, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.globalAlpha = a.alpha * (state.today.has(d.id) && d.id !== selectedId && d.id !== hoverId ? 0.7 : 0.45); ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = a.alpha; }
      if (shape === 'circle') {
        ctx.beginPath(); ctx.arc(sp[0], sp[1], r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = T.bg; ctx.beginPath(); ctx.arc(sp[0], sp[1], r, 0, Math.PI * 2); ctx.stroke();
        if (d.hub) { ctx.beginPath(); ctx.arc(sp[0], sp[1], Math.max(0, r - 5), 0, Math.PI * 2); ctx.strokeStyle = T.bg; ctx.globalAlpha = a.alpha * 0.5; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = a.alpha; }
      } else {
        ctx.lineJoin = 'round'; ctx.lineWidth = puff + 4; ctx.strokeStyle = T.bg; traceShape(shape, sp[0], sp[1], r); ctx.stroke();
        traceShape(shape, sp[0], sp[1], r); ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = puff; ctx.strokeStyle = color; traceShape(shape, sp[0], sp[1], r); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    function labels(vis, focus) {
      var fsz = clamp(9 + 6 * cam.s, 11, 14);
      var order = vis.slice().sort(function (p, q) { return prio(p, focus) - prio(q, focus); });
      var drawn = OVERLAYS.slice(), dotBoxes = {};
      order.forEach(function (d) {
        if (anim.get(d.id).alpha < 0.35) return;
        var p = toScreen.apply(null, wpos(d)), rr = nodeR(d) + 2, box = [p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr];
        dotBoxes[d.id] = box; drawn.push(box);
      });
      var noCull = !!(state.cat || catHover);
      order.forEach(function (d) {
        var a = anim.get(d.id);
        var must = noCull || d.id === focus || d.hub || state.today.has(d.id) || (focus && neighbors.get(focus) && neighbors.get(focus).has(d.id));
        if (a.alpha < 0.3 && !must) return;
        var sp = toScreen.apply(null, wpos(d)), r = nodeR(d), label = d.label;
        var size = d.hub ? fsz + 2 : fsz;
        ctx.font = (d.hub ? 700 : 600) + ' ' + size + 'px ' + T.font;
        var w = ctx.measureText(label).width, lh = size + 5, own = dotBoxes[d.id], boxW = w + 8;
        var free = function (bx, by) {
          if (by < 2 || by + lh > H - 2 || bx < 2 || bx + boxW > W - 2) return false;
          return !drawn.some(function (rc) { if (rc === own) return false; return !(bx + boxW < rc[0] || bx > rc[2] || by + lh < rc[1] || by > rc[3]); });
        };
        var cx = sp[0] - w / 2 - 4, below = sp[1] + r + 5, above = sp[1] - r - 5 - lh, step = lh + 1, mid = sp[1] - lh / 2;
        var cands = [[cx, below], [cx, above]];
        if (sp[0] >= W / 2) cands.push([sp[0] + r + 7, mid], [sp[0] - r - 7 - boxW, mid]);
        else cands.push([sp[0] - r - 7 - boxW, mid], [sp[0] + r + 7, mid]);
        for (var g = 1; g <= 6; g++) { cands.push([cx, below + g * step]); cands.push([cx, above - g * step]); }
        var pos = null;
        if (must) {
          for (var ci = 0; ci < cands.length; ci++) if (free(cands[ci][0], cands[ci][1])) { pos = cands[ci]; break; }
          if (!pos) { if (d.id === focus) pos = [cx, below]; else return; }
        } else { if (!free(cx, below)) return; pos = [cx, below]; }
        ctx.globalAlpha = clamp(a.alpha, 0.3, 1); ctx.lineWidth = 3.5; ctx.strokeStyle = T.bg; ctx.lineJoin = 'round';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var drawX = pos[0] + 4 + w / 2;
        ctx.strokeText(label, drawX, pos[1]); ctx.fillStyle = T.ink; ctx.fillText(label, drawX, pos[1]);
        ctx.globalAlpha = 1; drawn.push([pos[0], pos[1], pos[0] + boxW, pos[1] + lh]);
      });
    }

    // ---- the accessible mirror ---------------------------------------------------------
    function paintA11y() {
      a11y.innerHTML = visible().filter(function (d) { return !d.hub; }).map(function (d) {
        return '<li><button type="button" data-id="' + d.id + '" data-cat="' + byCat[d.category].series + '" aria-pressed="' + (d.id === selectedId) + '">' +
          d.label.replace(/&/g, '&amp;').replace(/</g, '&lt;') + ', ' + byCat[d.category].label + (state.today.has(d.id) ? ', worked on this day' : '') + '</button></li>';
      }).join('');
    }
    a11y.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) select(b.dataset.id, true); });
    a11y.addEventListener('focusin', function (e) { var b = e.target.closest('button'); if (b) { hoverId = b.dataset.id; if (opts.onHover) opts.onHover(hoverId); requestRender(); } });
    a11y.addEventListener('focusout', function () { hoverId = null; if (opts.onHover) opts.onHover(null); requestRender(); });

    // ---- selection ---------------------------------------------------------------------------
    function select(id, fromUser) {
      if (id === '__hub') id = null;
      if (id && id === selectedId && fromUser) id = null;
      selectedId = id; refit(); requestRender(); paintA11y();
      if (fromUser && opts.onSelect) opts.onSelect(selectedId);
    }

    // ---- pointer, wheel, zoom: the template's handlers ----------------------------------------
    function nodeAt(px, py) { var vis = visible(); for (var i = vis.length - 1; i >= 0; i--) { var d = vis[i], sp = toScreen.apply(null, wpos(d)); if (Math.hypot(sp[0] - px, sp[1] - py) <= nodeR(d) + 6) return d; } return null; }
    var down = null, moved = false;
    canvas.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moved = false; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      if (down) { var dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 4) moved = true; cam.x = down.cx + dx; cam.y = down.cy + dy; requestRender(); return; }
      var hit = nodeAt(e.clientX - rect.left, e.clientY - rect.top), id = hit && !hit.hub ? hit.id : null;
      if (id !== hoverId) { hoverId = id; canvas.style.cursor = hit ? 'pointer' : 'grab'; if (opts.onHover) opts.onHover(id); requestRender(); }
    });
    canvas.addEventListener('pointerleave', function () { if (hoverId) { hoverId = null; if (opts.onHover) opts.onHover(null); requestRender(); } });
    canvas.addEventListener('pointerup', function (e) {
      if (down && !moved) { var rect = canvas.getBoundingClientRect(), hit = nodeAt(e.clientX - rect.left, e.clientY - rect.top); select(hit ? hit.id : null, true); }
      down = null;
    });
    canvas.addEventListener('pointercancel', function () { down = null; });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault(); var rect = canvas.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
      var wx = (px - cam.x) / cam.s, wy = (py - cam.y) / cam.s;
      cam.s = clamp(cam.s * Math.exp(-e.deltaY * 0.0014), 0.3, 3); cam.x = px - wx * cam.s; cam.y = py - wy * cam.s; requestRender();
    }, { passive: false });
    function zoomBy(f) { var px = W / 2, py = H / 2, wx = (px - cam.x) / cam.s, wy = (py - cam.y) / cam.s; cam.s = clamp(cam.s * f, 0.3, 3); cam.x = px - wx * cam.s; cam.y = py - wy * cam.s; requestRender(); }
    host.querySelector('[data-slot="zoom"]').addEventListener('click', function (e) {
      var z = e.target.closest('button'); if (!z) return;
      if (z.dataset.z === 'in') zoomBy(1.25); else if (z.dataset.z === 'out') zoomBy(0.8); else { refit(); requestRender(); }
    });
    host.addEventListener('keydown', function (e) { if (e.key === 'Escape' && selectedId) select(null, true); });

    // A style or theme switch changes the tokens: repaint, no remount.
    var mo = new MutationObserver(function () { readTokens(); requestRender(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style', 'data-theme'] });

    function onResize() { resize(); refit(); settleNow(); }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(host); else window.addEventListener('resize', onResize);
    readTokens(); resize(); refit(); settleNow(); paintA11y();

    return {
      update: function (s) {
        var before = state;
        state = s;
        // a node arriving on the timeline fades in where it will always sit
        s.visible.forEach(function (id) { if (!before.visible.has(id)) { var a = anim.get(id); if (a) { a.alpha = 0; a.scale = 0.5; } } });
        if (s.cat !== before.cat && !selectedId) refit();
        requestRender(); paintA11y();
      },
      select: function (id) { select(id, false); },
      refit: function () { refit(); requestRender(); },
      // The rail drives the map: a hovered category comes forward, the rest fall back.
      hoverCategory: function (cat) { catHover = cat; requestRender(); },
      shapeSVG: function (catId) { return shapeSVG(byCat[catId] ? byCat[catId].shape : 'circle'); }
    };
  }

  window.DSNodeGraph = { mount: mount, shapeSVG: shapeSVG, SHAPES: SHAPES };
})();
