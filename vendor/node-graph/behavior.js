/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   version  2.1.0
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   node-graph · behaviour · v2.1.0

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

   2.1.0 (2026-09-30): circles of involvement, opt in. Pass `rings: [{ id, label, empty? }]`, innermost first,
   and `nodes[].ring`, and a node's distance from the hub says how close it is to the work while shape and
   colour still say what kind it is. Each ring is a fixed guide with its name and a live count at its top;
   an empty ring stays drawn and says "none yet"; its `empty` line rides on the host's rail row. Each name sits
   on a solid tile, so its ring line stops at it. A node with no ring, or a ring that
   is not declared, is parked in a dashed block outside the circles, beside them on a wide map and under
   them on a tall one, headed "Not placed yet" (`unplacedLabel`); nothing is guessed. A ring's nodes go evenly round the full circle, grouped by category in category
   order, then by since and id, so the order never depends on which nodes are present. A ring holding more
   labels than fit on one line staggers its nodes across up to three lanes. Tapping a ring's name calls
   `onRing(id)`; `update({ ring })` and `hoverRing(id)` filter and dim the way a category does. With no
   `rings` the map draws exactly as 2.0.2.
   Label engine, for every map: a dot fading in below 35% opacity used to leave the collision set while
   its label was still forced on (a category filter forces every label), so labels landed on dots; every
   drawn dot is now an obstacle, sized to its shape and its today ring. A label may move two lines from
   its dot, not six: further away it reads as someone else's, which is the pile the Noble Founder map
   showed.

   2.0.2 (2026-09-30): the label halo and dot outline use the colour the map is painted on, found by walking up from the
   host to the first opaque background (--map-ground overrides). They used --color-bg, which showed as a tan smudge round
   every label when the map sat on a lighter card.

   2.0.1 (2026-09-30): a category filter or rail hover now dims the rest to the level a node
   selection does. Dots 0.35 to 0.14 (hover 0.15 to 0.1), labels floor 0.3 to 0.1, and links that
   touch only nodes outside the category fall to 0.04 (0.1 if one end is inside). Before, the
   dimmed groups stayed as loud as the highlighted one (reported from the CLS systems map).

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
       nodes:      [{ id, label, category, static?, links: [ids], since?, ring? }],
       rings?:     [{ id, label, empty? }],        innermost first; opt in
       unplacedLabel?: 'Not placed yet',
       hint?:      false drops the line of instructions under the map,
       ringNames?: false draws the circles without their names on the map,
       onHover(id|null), onSelect(id|null), onRing?(id)
     });
     graph.update({ visible: Set, today: Set, size: Map, cat: id|null, ring?: id|null });
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

    // ---- rings: circles of involvement, opt in ------------------------------------
    var RINGED = !!(opts.rings && opts.rings.length);
    var PARK = { id: '__unplaced', label: opts.unplacedLabel || 'Not placed yet', park: true };
    var ringList = RINGED ? opts.rings.map(function (r) { return Object.assign({}, r); }).concat([PARK]) : [];
    var byRing = {}; ringList.forEach(function (r) { byRing[r.id] = r; });
    // A node whose ring is missing or undeclared is parked, never guessed.
    var ringOf = function (d) { if (!RINGED || d.hub) return null; return d.ring && byRing[d.ring] && !byRing[d.ring].park ? d.ring : PARK.id; };
    // A ringed map spans more world than a sector map, so a phone has to be able to see all of it at once.
    var MIN_S = RINGED ? 0.15 : 0.3;
    var RING_REF = 0.5, RING_GAP = 78, LANE = 60, RING_FONT = 12;
    function ringLabelText(rg, n) { return rg.label + ' · ' + (n ? n : 'none yet'); }

    var measure2d = null, face = 'system-ui, sans-serif';
    function labelW(text, font) { measure2d.font = font; return measure2d.measureText(text).width; }
    function byKind(ci) {
      return function (a, b) {
        if (ci[a.category] !== ci[b.category]) return ci[a.category] - ci[b.category];
        var sa = a.since || '', sb = b.since || '';
        return sa < sb ? -1 : sa > sb ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      };
    }
    function ringLayout() {
      var cx = VW / 2, cy = VH / 2, ci = {};
      cats.forEach(function (c, i) { ci[c.id] = i; });
      hub.x = 0.5; hub.y = 0.5;
      // Spacing is planned at a reference scale with the labels' real widths, so a ring is as big as its names need.
      measure2d = document.createElement('canvas').getContext('2d');
      face = (getComputedStyle(host).getPropertyValue('--font-body') || '').trim() || face;
      var outer = 26 + 50;
      ringList.forEach(function (rg) {
        if (rg.park) return;
        var group = nodes.filter(function (n) { return !n.hub && ringOf(n) === rg.id; }).sort(byKind(ci));
        var N = group.length;
        // What one line of labels needs round the circle: a label lies along the ring at the top and bottom and
        // across it at the sides, so it is given four fifths of its width, plus its dot.
        var need = group.reduce(function (s, n) { return s + (labelW(n.label, '600 13px ' + face) + 14) / RING_REF * 0.8 + 34; }, 0);
        var rMin = outer + RING_GAP, lanes = 1;
        // Stagger only when one line of labels would make the ring far bigger than its place in the order: a
        // second lane packs the names tighter, and a ring that can simply grow reads better on one line.
        while (lanes < 3 && need / lanes > 2 * Math.PI * rMin * 2.4) lanes++;
        var R = Math.max(rMin, need / (lanes * 2 * Math.PI));
        var lw = labelW(ringLabelText(rg, N || 0), '700 ' + RING_FONT + 'px ' + face) + 24;
        // The top of each ring holds its name, so the nodes leave a gap there.
        var gap = N && opts.ringNames !== false ? Math.min(110, (lw / RING_REF) / R * 180 / Math.PI + 14) : 0;
        rg.r = R; rg.lanes = lanes; rg.n = N;
        group.forEach(function (n, j) {
          var lane = lanes > 1 ? (j % lanes) - (lanes - 1) / 2 : 0;
          var rr = R + lane * LANE;
          var deg = -90 + gap / 2 + (j + 0.5) * (360 - gap) / N;
          var rad = deg * Math.PI / 180;
          n.x = (cx + rr * Math.cos(rad)) / VW; n.y = (cy + rr * Math.sin(rad)) / VH;
        });
        outer = R + (lanes - 1) * LANE / 2;
        rg.outer = outer;
      });
      ringsOuter = outer;
      PARK.members = nodes.filter(function (n) { return !n.hub && ringOf(n) === PARK.id; }).sort(byKind(ci));
      parkLayout(parkWide());
    }
    // Whatever has no circle waits outside them in a block of its own: beside the circles on a wide map, under
    // them on a tall one. A ring of its own would be the widest thing on the map and shrink every circle inside
    // it. Column by column in category order, so the kinds stay together here too.
    var ringsOuter = 0, parkIsWide = null;
    function parkWide() { var r = host.getBoundingClientRect(); return !r.width || r.width >= r.height * 1.05; }
    function parkLayout(wide) {
      parkIsWide = wide;
      var list = PARK.members, N = list.length, cx = VW / 2, cy = VH / 2, Rb = ringsOuter + 30;
      // A list, not a grid: each name sits to the right of its dot, so a row is one line tall.
      var cellW = Math.min(380, list.reduce(function (w, n) { return Math.max(w, labelW(n.label, '600 13px ' + face)); }, 60) / RING_REF + 64);
      var cellH = 62, head = 84, cols, rows, x0, y0;
      if (wide) {
        rows = Math.max(1, Math.floor((2 * Rb - head) / cellH)); cols = Math.max(1, Math.ceil(N / rows)); rows = Math.ceil(N / cols);
        x0 = cx + Rb + 70; y0 = cy - (rows * cellH + head) / 2;
      } else {
        cols = Math.max(1, Math.min(Math.floor((2 * Rb) / cellW), Math.ceil(N / 6))); rows = Math.ceil(N / cols);
        x0 = cx - cols * cellW / 2; y0 = cy + Rb + 50;
      }
      list.forEach(function (n, j) {
        var c = Math.floor(j / rows), r = j % rows;
        n.x = (x0 + c * cellW + 34) / VW; n.y = (y0 + head + r * cellH + 16) / VH; n.parked = true;
      });
      PARK.box = [x0, y0, x0 + Math.max(cols, 1) * cellW, y0 + head + Math.max(rows, 1) * cellH];
    }

    // ---- radial layout by group, the template's rule ----------------------
    if (RINGED) ringLayout(); else (function layout() {
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
      (opts.hint === false ? '' : '<p data-slot="hint">Drag to move · scroll to zoom · tap a node' + (RINGED && opts.ringNames !== false ? ' or a circle\'s name' : '') + ' · tap the background to come back out</p>') +
      '<ul data-slot="a11y" aria-label="Nodes on the map"></ul>';
    var canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
    var a11y = host.querySelector('[data-slot="a11y"]');

    var state = { visible: new Set(nodes.map(function (d) { return d.id; })), today: new Set(), size: new Map(), cat: null, ring: null };
    var anim = new Map(nodes.map(function (d) { return [d.id, { scale: 1, alpha: 1 }]; }));
    var selectedId = null, hoverId = null, catHover = null, ringHover = null, ringBoxes = [], lastLabels = [], lastDots = [], cam = { s: 1, x: 0, y: 0 };
    var raf = null, lastT = 0, fallbackT = null;
    var W = 0, H = 0, OVERLAYS = [], BOTTOM = 0, RIGHT = 0;

    // ---- tokens ----------------------------------------------------------------
    var T = {};
    function readTokens() {
      var cs = getComputedStyle(host);
      var v = function (n, f) { return (cs.getPropertyValue(n) || '').trim() || f; };
      // The label halo and the dot outline knock the lines out from behind a mark. They have to be the colour the
      // canvas is actually painted on, or each label wears a visible smudge: the page ground (--color-bg) is not
      // the map's ground when the map sits on a card (--color-surface). Take the first opaque background walking up
      // from the host, and fall back to the token. --map-ground overrides it.
      T.bg = v('--map-ground', '') || (function () {
        for (var el = host; el && el.nodeType === 1; el = el.parentElement) {
          var c = getComputedStyle(el).backgroundColor;
          if (c && c !== 'transparent' && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(c)) return c;
        }
        return v('--color-bg', '#f4efe4');
      })();
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
    var matchGroup = function (d) { return d.hub || ((!state.cat || d.category === state.cat) && (!state.ring || ringOf(d) === state.ring)); };
    // The group in front: a hovered rail row outranks the pressed one, as a category always has.
    var catNow = function () { return catHover || state.cat; };
    var ringNow = function () { return ringHover || state.ring; };
    var outOfGroup = function (d) { if (d.hub) return false; var c = catNow(), r = ringNow(); return !!((c && d.category !== c) || (r && ringOf(d) !== r)); };
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
      cam.s = clamp(Math.min((W - pad * 2 - RIGHT) / w, availH / h) * (o.boost || 1), MIN_S, o.maxScale || 3);
      cam.x = (W - RIGHT - (minX + maxX) * cam.s) / 2;
      cam.y = (H - BOTTOM - (minY + maxY) * cam.s) / 2;
    }
    // At rest the camera holds every node that will ever be on the map, so a
    // node arriving on the timeline appears in place instead of moving the view.
    function refit() {
      var nb = selectedId ? focusNeighborhood() : null;
      if (nb) fitTo(nodes.filter(function (d) { return nb.has(d.id) && present(d); }), { minSpan: 0.46 * VW, maxScale: 1.45, boost: 1.06 });
      else if (state.ring && byRing[state.ring]) fitTo(byRing[state.ring].park ? parkExtent() : ringExtent(byRing[state.ring].outer), { minSpan: 0.42 * VW, maxScale: 1.5 });
      else if (state.cat) fitTo(nodes.filter(function (d) { return d.category === state.cat; }).concat([hub]), { minSpan: 0.42 * VW, maxScale: 1.5, boost: 1.06 });
      else fitTo(RINGED ? nodes.concat(ringExtent(ringsOuter), PARK.members.length ? parkExtent() : []) : nodes);
    }
    // Four points on a circle round the hub, with room for the labels outside it, so the camera holds a whole ring.
    function parkExtent() { var b = PARK.box; return [{ x: b[0] / VW, y: b[1] / VH }, { x: b[2] / VW, y: b[3] / VH }]; }
    function ringExtent(R) {
      var e = R + 34, cx = VW / 2, cy = VH / 2;
      return [[cx - e, cy], [cx + e, cy], [cx, cy - e], [cx, cy + e]].map(function (p) { return { x: p[0] / VW, y: p[1] / VH }; });
    }

    // ---- animation: the template's tween -------------------------------------------
    function targetsFor(d, fs) {
      return { scale: d.id === hoverId ? 1.3 : d.id === selectedId ? 1.14 : (fs && fs.has(d.id) ? 1.05 : 1), alpha: fs ? (fs.has(d.id) ? 1 : 0.13) : (outOfGroup(d) ? (catHover || ringHover ? 0.1 : 0.14) : 1) };
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
    function prio(d, focus) { if (d.id === focus) return 0; if (d.hub) return 1; if (focus && neighbors.get(focus) && neighbors.get(focus).has(d.id)) return 2; if (state.today.has(d.id)) return 3; return RINGED ? 4 + ringRank(d) / 10 : 4; }
    // With rings, the inner circle's names are placed first: closest to the work is what the map is for.
    function ringRank(d) { var id = ringOf(d); for (var i = 0; i < ringList.length; i++) if (ringList[i].id === id) return i; return ringList.length; }
    function draw() {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      var vis = visible(), visIds = new Set(vis.map(function (d) { return d.id; })), focus = activeFocus();
      // orbit rings: the hub's quiet guides, or with rings, the circles of involvement
      var hp = toScreen.apply(null, wpos(hub));
      ctx.strokeStyle = T.rule; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
      if (RINGED) {
        var rOn = ringNow();
        ringList.forEach(function (rg) {
          var on = rOn === rg.id;
          ctx.globalAlpha = rOn ? (on ? 0.9 : 0.18) : 0.38; ctx.lineWidth = on ? 2 : 1.2;
          ctx.strokeStyle = T.muted;
          if (rg.park) {
            if (!rg.members.length) return;
            var a = toScreen(rg.box[0], rg.box[1]), z = toScreen(rg.box[2], rg.box[3]);
            ctx.setLineDash([4, 6]); ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(a[0], a[1], z[0] - a[0], z[1] - a[1], 10); else ctx.rect(a[0], a[1], z[0] - a[0], z[1] - a[1]);
            ctx.stroke(); ctx.setLineDash([]); return;
          }
          ctx.beginPath(); ctx.arc(hp[0], hp[1], rg.r * cam.s, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.setLineDash([]);
      } else {
        [150, 230, 310].forEach(function (rr) { ctx.beginPath(); ctx.arc(hp[0], hp[1], rr * cam.s, 0, Math.PI * 2); ctx.stroke(); });
      }
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
        var catOn = catNow() || ringNow(), outA = outOfGroup(da), outB = outOfGroup(db);
        // A parked node's line to the hub says only that it is on the map, so it stays quiet until asked for.
        var parked = RINGED && !toPrinciple && ringOf(other) === PARK.id && ringNow() !== PARK.id;
        ctx.globalAlpha = hl ? 0.9 : (focus ? 0.06 : (catOn && (outA || outB) ? (outA && outB ? 0.04 : 0.1) : (toPrinciple ? 0.4 : parked ? 0.1 : 0.3)));
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
      lastLabels = []; lastDots = [];
      // Every dot on the canvas is an obstacle, however faint: a label forced on by a filter used to land on a
      // dot that was still fading in. The box is the shape's real extent, its outline and its today ring.
      order.forEach(function (d) {
        if (anim.get(d.id).alpha < 0.02) return;
        var p = toScreen.apply(null, wpos(d)), r = nodeR(d), sh = shapeOf(d);
        var rr = r * (sh === 'star' ? 1.15 : sh === 'triangle' || sh === 'diamond' ? 1.05 : 1) + (sh === 'circle' ? 1 : Math.max(2.5, r * 0.34) / 2 + 2) + 2;
        if (d.id === selectedId || d.id === hoverId || state.today.has(d.id)) rr = Math.max(rr, r + 9);
        var box = [p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr];
        dotBoxes[d.id] = box; drawn.push(box); lastDots.push({ id: d.id, box: box });
      });
      if (RINGED) ringLabels(drawn);
      var noCull = !!(catNow() || ringNow());
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
        var cands = d.parked ? [[sp[0] + r + 7, mid]] : [[cx, below], [cx, above]];
        if (d.parked) cands.push([cx, below], [cx, above]);
        else if (sp[0] >= W / 2) cands.push([sp[0] + r + 7, mid], [sp[0] - r - 7 - boxW, mid]);
        else cands.push([sp[0] - r - 7 - boxW, mid], [sp[0] + r + 7, mid]);
        for (var g = 1; g <= 2 && !d.parked; g++) { cands.push([cx, below + g * step]); cands.push([cx, above - g * step]); }
        var pos = null;
        if (must) {
          for (var ci = 0; ci < cands.length; ci++) if (free(cands[ci][0], cands[ci][1])) { pos = cands[ci]; break; }
          if (!pos) { if (d.id === focus) pos = [cx, below]; else return; }
        } else { if (!free(cands[0][0], cands[0][1])) return; pos = cands[0]; }
        ctx.globalAlpha = clamp(a.alpha, 0.1, 1); ctx.lineWidth = 3.5; ctx.strokeStyle = T.bg; ctx.lineJoin = 'round';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var drawX = pos[0] + 4 + w / 2;
        ctx.strokeText(label, drawX, pos[1]); ctx.fillStyle = T.ink; ctx.fillText(label, drawX, pos[1]);
        ctx.globalAlpha = 1; drawn.push([pos[0], pos[1], pos[0] + boxW, pos[1] + lh]);
        lastLabels.push({ id: d.id, kind: 'node', box: [pos[0], pos[1], pos[0] + boxW, pos[1] + lh] });
      });
    }
    // The name of each ring and its live count, at the top of the ring where the layout left a gap. If a dot or
    // another ring's name is there (a phone, a zoom), it walks round the ring to the nearest free place.
    function ringLabels(drawn) {
      ringBoxes = [];
      var hp = toScreen.apply(null, wpos(hub)), rOn = ringNow();
      ringList.forEach(function (rg) {
        // ringNames: false keeps the circles as unlabelled guides (the host names them, in its rail); the parked block keeps its name.
        if (opts.ringNames === false && !rg.park) return;
        var n = 0;
        nodes.forEach(function (d) { if (!d.hub && present(d) && ringOf(d) === rg.id) n++; });
        // One line per circle. An empty circle's line about what fills it is on its rail row, not stacked on the map.
        var head = ringLabelText(rg, n);
        ctx.font = '700 ' + RING_FONT + 'px ' + T.font;
        var bw = ctx.measureText(head).width + 16, bh = RING_FONT + 8, R = rg.r * cam.s, pos = null;
        if (rg.park && !rg.members.length) return;
        var fits = function (bx, by) {
          if (bx < 2 || by < 2 || bx + bw > W - 2 || by + bh > H - 2) return false;
          return !drawn.some(function (rc) { return !(bx + bw < rc[0] || bx > rc[2] || by + bh < rc[1] || by > rc[3]); });
        };
        // The parked block's name sits in its top left corner, inside the dashed line.
        if (rg.park) { var tl = toScreen(rg.box[0], rg.box[1]); if (fits(tl[0] + 6, tl[1] + 6)) pos = [tl[0] + 6, tl[1] + 6]; }
        // On the line first, then just outside it, then just inside, a full lap round from the top.
        for (var k = 0; k <= 48 && !pos && !rg.park; k++) {
          var off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 7.5, a = (-90 + off) * Math.PI / 180;
          [0, bh / 2 + 4, -(bh / 2 + 4)].some(function (dr) {
            var bx = hp[0] + (R + dr) * Math.cos(a) - bw / 2, by = hp[1] + (R + dr) * Math.sin(a) - bh / 2;
            if (fits(bx, by)) { pos = [bx, by]; return true; }
            return false;
          });
        }
        if (!pos) return;
        var on = rOn === rg.id, dim = rOn && !on;
        ctx.globalAlpha = dim ? 0.45 : 1; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
        // A solid tile in the map's ground colour, so the ring line visibly stops at its own name instead of
        // running through the letters. The tile stays opaque when the name is dimmed.
        ctx.globalAlpha = 1; ctx.fillStyle = T.bg; ctx.strokeStyle = on ? T.muted : T.rule; ctx.lineWidth = 1;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(pos[0], pos[1], bw, bh, bh / 2); else ctx.rect(pos[0], pos[1], bw, bh);
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = dim ? 0.45 : 1;
        var mx = rg.park ? pos[0] + 8 : pos[0] + bw / 2;
        if (rg.park) ctx.textAlign = 'left';
        ctx.font = '700 ' + RING_FONT + 'px ' + T.font;
        ctx.fillStyle = on ? T.ink : T.muted; ctx.fillText(head, mx, pos[1] + 4);
        ctx.globalAlpha = 1;
        var box = [pos[0], pos[1], pos[0] + bw, pos[1] + bh];
        drawn.push(box); ringBoxes.push({ id: rg.id, box: box }); lastLabels.push({ id: rg.id, kind: 'ring', box: box });
      });
    }

    // ---- the accessible mirror ---------------------------------------------------------
    function paintA11y() {
      a11y.innerHTML = visible().filter(function (d) { return !d.hub; }).map(function (d) {
        return '<li><button type="button" data-id="' + d.id + '" data-cat="' + byCat[d.category].series + '" aria-pressed="' + (d.id === selectedId) + '">' +
          d.label.replace(/&/g, '&amp;').replace(/</g, '&lt;') + ', ' + byCat[d.category].label + (RINGED ? ', ' + byRing[ringOf(d)].label : '') + (state.today.has(d.id) ? ', worked on this day' : '') + '</button></li>';
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
    function ringAt(px, py) { for (var i = 0; i < ringBoxes.length; i++) { var b = ringBoxes[i].box; if (px >= b[0] && px <= b[2] && py >= b[1] && py <= b[3]) return ringBoxes[i].id; } return null; }
    var down = null, moved = false;
    canvas.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moved = false; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      if (down) { var dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 4) moved = true; cam.x = down.cx + dx; cam.y = down.cy + dy; requestRender(); return; }
      var hit = nodeAt(e.clientX - rect.left, e.clientY - rect.top), id = hit && !hit.hub ? hit.id : null;
      var overRing = !hit && RINGED && ringAt(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = hit || overRing ? 'pointer' : 'grab';
      if (id !== hoverId) { hoverId = id; if (opts.onHover) opts.onHover(id); requestRender(); }
    });
    canvas.addEventListener('pointerleave', function () { if (hoverId) { hoverId = null; if (opts.onHover) opts.onHover(null); requestRender(); } });
    canvas.addEventListener('pointerup', function (e) {
      if (down && !moved) {
        var rect = canvas.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top, hit = nodeAt(px, py);
        // A circle's name is a filter, as a category row is. The host owns the filter state, so it hears about it.
        var rg = !hit && RINGED ? ringAt(px, py) : null;
        if (rg && opts.onRing) opts.onRing(rg); else select(hit ? hit.id : null, true);
      }
      down = null;
    });
    canvas.addEventListener('pointercancel', function () { down = null; });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault(); var rect = canvas.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
      var wx = (px - cam.x) / cam.s, wy = (py - cam.y) / cam.s;
      cam.s = clamp(cam.s * Math.exp(-e.deltaY * 0.0014), MIN_S, 3); cam.x = px - wx * cam.s; cam.y = py - wy * cam.s; requestRender();
    }, { passive: false });
    function zoomBy(f) { var px = W / 2, py = H / 2, wx = (px - cam.x) / cam.s, wy = (py - cam.y) / cam.s; cam.s = clamp(cam.s * f, MIN_S, 3); cam.x = px - wx * cam.s; cam.y = py - wy * cam.s; requestRender(); }
    host.querySelector('[data-slot="zoom"]').addEventListener('click', function (e) {
      var z = e.target.closest('button'); if (!z) return;
      if (z.dataset.z === 'in') zoomBy(1.25); else if (z.dataset.z === 'out') zoomBy(0.8); else { refit(); requestRender(); }
    });
    host.addEventListener('keydown', function (e) { if (e.key === 'Escape' && selectedId) select(null, true); });

    // A style or theme switch changes the tokens: repaint, no remount.
    var mo = new MutationObserver(function () { readTokens(); requestRender(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style', 'data-theme'] });

    function onResize() { resize(); if (RINGED && PARK.members.length && parkWide() !== parkIsWide) parkLayout(!parkIsWide); refit(); settleNow(); }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(host); else window.addEventListener('resize', onResize);
    readTokens(); resize(); refit(); settleNow(); paintA11y();

    var api = {
      update: function (s) {
        var before = state;
        state = s;
        // a node arriving on the timeline fades in where it will always sit
        s.visible.forEach(function (id) { if (!before.visible.has(id)) { var a = anim.get(id); if (a) { a.alpha = 0; a.scale = 0.5; } } });
        if ((s.cat !== before.cat || s.ring !== before.ring) && !selectedId) refit();
        requestRender(); paintA11y();
      },
      select: function (id) { select(id, false); },
      refit: function () { refit(); requestRender(); },
      // Re-measure the host, for a host (or a check) that knows its size changed when no ResizeObserver fired.
      resize: function () { onResize(); },
      // The rail drives the map: a hovered category comes forward, the rest fall back.
      hoverCategory: function (cat) { catHover = cat; requestRender(); },
      hoverRing: function (id) { ringHover = id; requestRender(); },
      // The rings as laid out, and the labels as last drawn in screen pixels: what a fit check measures.
      rings: function () { return ringList.map(function (r) { return { id: r.id, label: r.label, park: !!r.park, lanes: r.lanes }; }); },
      ringOf: function (id) { var d = byId.get(id); return d ? ringOf(d) : null; },
      labels: function () { return lastLabels.map(function (l) { return { id: l.id, kind: l.kind, box: l.box.slice() }; }); },
      dots: function () { return lastDots.map(function (l) { return { id: l.id, box: l.box.slice() }; }); },
      overlays: function () { return OVERLAYS.map(function (b) { return b.slice(); }); },
      camera: function () { return { s: cam.s, w: W, h: H }; },
      shapeSVG: function (catId) { return shapeSVG(byCat[catId] ? byCat[catId].shape : 'circle'); }
    };
    // A fit check reads the drawn label boxes from the page, so the instance hangs off its host.
    host.dsNodeGraph = api;
    return api;
  }

  window.DSNodeGraph = { mount: mount, shapeSVG: shapeSVG, SHAPES: SHAPES };
})();
