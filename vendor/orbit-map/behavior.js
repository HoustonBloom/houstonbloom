/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/components/orbit-map/behavior.js
   version  1.2.0
   refresh  node sync.mjs orbit-map "C:/Users/Megan/Claude_Projects/AI Projects/Houston Bloom/Website"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   orbit-map · behaviour · v1.2.0

   The second map for an activity-map, ported from the Explorer view of a
   personal website (its landing: projects-slide, center-node, the rail in
   experimental-landing-v2), where the owner watches her own work move. It
   answers "what was I working on, and what does it serve" rather than "how
   is everything connected", which is node-graph's question. Same interface
   as node-graph, so the template takes either.

   What it carries from the source, behaviour for behaviour:
     every project waits as a faint ghost of its category icon on an outer
     ring, at a stable golden-angle position
     a project worked on that day comes to the front: it moves to an inner
     ring, grows, lights up, wears a glass label chip, drifts in a slow
     orbit, and a tapered beam runs to it from the centre
     design principles sit as stars at the edges and twinkle
     hover a project: its principles light up and tapered lines run to them;
     everything else dims
     hover a principle: every project that serves it lights, and lines run
     from the principle to each
     hover a rail category: that category comes forward; the principles
     category lights every principle
     the centre is the Activity ring: "Today" at the live stop, otherwise
     the days ago and the date
     a trail of energy runs from the centre down to the playhead
     first tap selects, second tap opens the node
   One fix on the way over: the source had four slots for active projects,
   so a fifth landed on the first. Active projects spread evenly instead.

     const map = DSOrbitMap.mount(el, {
       subject, categories: [{ id, label, series, static?, icon? }], nodes,
       onHover(id|null), onSelect(id|null), onOpen(id)
     });
     map.update({ visible, today, size, cat, readout: { live, days, date } });
     map.select(id|null); map.hoverCategory(catId|null); map.setPlayhead(xPx|null)

   Icons are one-colour glyphs traced from the source site's artwork
   (initiative planet, product rocket, research flask, principle star),
   kept as files beside this one and inlined below by build-icons.mjs. They
   paint with currentColor, so each category takes its style's --map-cat
   colour. The original two-tone artwork is kept in icons/brand/.

   1.1.0 (2026-09-30)
     picking a category (rail press or hover) gathers its items into a ring round the centre and
     animates them there, staggered, while everything else falls to a whisper; they return when the
     category is released. The ring is sized from the map in pixels, so it is round at any aspect.
     a project with no drawing of its own wears its category's glyph, not its initial.

   1.2.0 (2026-10-01)
     DSOrbitMap.registerIcon(key, svg) adds a glyph to the set before mount, so a site can give its
     categories its own drawings (categories[].icon names the key). Mark the filled parts data-body so
     the dim (outline) mode still reads. Nothing changes for a page that registers none.

   Plain script, not a module, so a page that opens from disk can inline it.
   ============================================================================ */
(function () {
  if (window.DSOrbitMap) return;

  /*__ICONS_START__*/
  var ICONS = {
   "initiative": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><defs><clipPath id=\"og-planet\"><circle cx=\"12\" cy=\"12\" r=\"6.4\"/></clipPath></defs><g transform=\"rotate(24 12 12)\"><path data-body data-stroke data-ring data-part=\"ring-back\" fill=\"none\" stroke-width=\"1.6\" d=\"M1.4 12A10.6 3.4 0 0 1 22.6 12\"/></g><circle data-body data-part=\"planet\" cx=\"12\" cy=\"12\" r=\"6.4\"/><g clip-path=\"url(#og-planet)\"><g data-part=\"bands\"><path data-tone=\"light\" fill=\"none\" stroke-width=\"1.3\" d=\"M3 9.6Q12 6.6 21 9.6\"/><path data-tone=\"dark\" fill=\"none\" stroke-width=\"1.9\" d=\"M3 12.6Q12 15.4 21 12.6\"/><path data-tone=\"light\" fill=\"none\" stroke-width=\"0.9\" d=\"M3 15.6Q12 18.6 21 15.6\"/></g></g><g transform=\"rotate(24 12 12)\"><path data-body data-stroke data-ring data-part=\"ring-front\" fill=\"none\" stroke-width=\"1.6\" d=\"M1.4 12A10.6 3.4 0 0 0 22.6 12\"/></g><g transform=\"rotate(-20 12 12)\"><circle data-body data-part=\"moon\" cx=\"12\" cy=\"12\" r=\"1.55\"/></g></svg>",
   "principle": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body fill-rule=\"evenodd\" d=\"M13.287 3.26625C12.8493 2.06459 11.1507 2.06459 10.713 3.26625L8.72673 8.72674L3.26624 10.713C2.06457 11.1507 2.06457 12.8493 3.26624 13.287L8.72673 15.2733L10.713 20.7338C11.1507 21.9354 12.8493 21.9354 13.287 20.7338L15.2733 15.2733L20.7337 13.287C21.9354 12.8493 21.9354 11.1507 20.7337 10.713L15.2733 8.72674L13.287 3.26625Z\"/><path data-cut d=\"M10.9448 8.2556C11.3034 7.2712 12.6956 7.27123 13.0542 8.2556L13.8765 10.5163L16.1382 11.3396C17.1226 11.6982 17.1226 13.0904 16.1382 13.449L13.8765 14.2712L13.0542 16.5329C12.6956 17.5174 11.3034 17.5174 10.9448 16.5329L10.1216 14.2712L7.86084 13.449C6.87647 13.0904 6.87644 11.6982 7.86084 11.3396L10.1216 10.5163L10.9448 8.2556Z\"/></svg>",
   "product": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body data-part=\"hull\" d=\"M2.44999 10.575L6.64999 6.37501C6.88332 6.14167 7.15832 5.97501 7.47499 5.87501C7.79165 5.77501 8.11665 5.75834 8.44999 5.82501L9.74999 6.10001C8.84999 7.16667 8.14165 8.13334 7.62499 9.00001C7.10832 9.86667 6.60832 10.9167 6.12499 12.15L2.44999 10.575Z M7.57499 12.85C7.95832 11.65 8.47932 10.5167 9.13799 9.45001C9.79665 8.38334 10.5923 7.38334 11.525 6.45001C12.9917 4.98334 14.6667 3.88767 16.55 3.16301C18.4333 2.43834 20.1917 2.21734 21.825 2.50001C22.1083 4.13334 21.8917 5.89167 21.175 7.77501C20.4583 9.65834 19.3667 11.3333 17.9 12.8C16.9833 13.7167 15.9833 14.5127 14.9 15.188C13.8167 15.8633 12.675 16.3923 11.475 16.775L7.57499 12.85Z M15.888 10.425C16.446 10.425 16.9167 10.2333 17.3 9.85001C17.6833 9.46667 17.875 8.996 17.875 8.438C17.875 7.88 17.6833 7.40901 17.3 7.02501C16.9167 6.64101 16.446 6.44934 15.888 6.45001C15.33 6.45067 14.859 6.64234 14.475 7.02501C14.091 7.40767 13.8993 7.87867 13.9 8.438C13.9007 8.99734 14.0923 9.46801 14.475 9.85001C14.8577 10.232 15.3287 10.4237 15.888 10.425Z M13.775 21.875L12.175 18.2C13.4083 17.7167 14.4627 17.2167 15.338 16.7C16.2133 16.1833 17.184 15.475 18.25 14.575L18.5 15.875C18.5667 16.2083 18.55 16.5377 18.45 16.863C18.35 17.1883 18.1833 17.4673 17.95 17.7L13.775 21.875Z\"/><path data-body data-part=\"flame\" d=\"M4.04999 16.05C4.63332 15.4667 5.34165 15.1707 6.17499 15.162C7.00832 15.1533 7.71665 15.441 8.29999 16.025C8.88332 16.609 9.17499 17.3173 9.17499 18.15C9.17499 18.9827 8.88332 19.691 8.29999 20.275C7.88332 20.6917 7.18732 21.05 6.21199 21.35C5.23665 21.65 3.89099 21.9167 2.17499 22.15C2.40832 20.4333 2.67499 19.0917 2.97499 18.125C3.27499 17.1583 3.63332 16.4667 4.04999 16.05Z\"/><g transform=\"translate(5.9 18.6) scale(0.55) translate(-5.9 -18.6)\"><path data-glow data-part=\"flame-core\" d=\"M5.92354 14.8374C4.95834 14.8475 4.13791 15.1903 3.46227 15.8659C2.97967 16.3485 2.56463 17.1497 2.21715 18.2693C1.86968 19.3889 1.56082 20.9429 1.29056 22.9312C3.27811 22.661 4.83672 22.3521 5.9664 22.0047C7.09607 21.6572 7.90221 21.2421 8.38481 20.7595C9.06046 20.0831 9.39828 19.2627 9.39828 18.2983C9.39828 17.3338 9.06046 16.5134 8.38481 15.837C7.70917 15.1606 6.88875 14.8274 5.92354 14.8374Z\"/></g><circle data-cut cx=\"15.82\" cy=\"8.29\" r=\"2.5\"/></svg>",
   "research": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body data-part=\"wave1\" d=\"M21 14.0004C21.2652 14.0004 21.5196 14.1057 21.7071 14.2933C21.8946 14.4808 22 14.7352 22 15.0004C22 16.8569 21.2625 18.6374 19.9497 19.9501C18.637 21.2629 16.8565 22.0004 15 22.0004C14.7348 22.0004 14.4804 21.895 14.2929 21.7075C14.1053 21.52 14 21.2656 14 21.0004C14 20.7352 14.1053 20.4808 14.2929 20.2933C14.4804 20.1057 14.7348 20.0004 15 20.0004C16.3261 20.0004 17.5978 19.4736 18.5355 18.5359C19.4732 17.5982 20 16.3265 20 15.0004C20 14.7352 20.1053 14.4808 20.2929 14.2933C20.4804 14.1057 20.7348 14.0004 21 14.0004Z\"/><path data-body data-part=\"wave2\" d=\"M17 13.5004C17.2652 13.5004 17.5196 13.6057 17.7071 13.7933C17.8946 13.9808 18 14.2352 18 14.5004C18 15.4286 17.6312 16.3189 16.9749 16.9753C16.3185 17.6316 15.4282 18.0004 14.5 18.0004C14.2451 18.0001 13.9999 17.9025 13.8146 17.7275C13.6293 17.5526 13.5177 17.3134 13.5028 17.059C13.4879 16.8046 13.5707 16.554 13.7342 16.3586C13.8978 16.1631 14.1299 16.0375 14.383 16.0074L14.5 16.0004C14.8729 16.0004 15.2324 15.8615 15.5084 15.6108C15.7844 15.3601 15.9572 15.0156 15.993 14.6444L16 14.5004C16 14.2352 16.1053 13.9808 16.2929 13.7933C16.4804 13.6057 16.7348 13.5004 17 13.5004Z\"/><path data-body data-part=\"dish\" d=\"M3.17098 11.4134L7.17098 15.4144C7.31231 15.5557 7.46065 15.6837 7.61598 15.7984L6.70698 16.7084C6.51945 16.8959 6.26515 17.0012 5.99998 17.0012C5.73482 17.0012 5.48051 16.8959 5.29298 16.7084L2.29298 13.7084C2.20001 13.6155 2.12625 13.5052 2.07592 13.3838C2.0256 13.2624 1.99969 13.1323 1.99969 13.0009C1.99969 12.8695 2.0256 12.7393 2.07592 12.6179C2.12625 12.4966 2.20001 12.3863 2.29298 12.2934L3.17098 11.4134Z M8.41398 3.00039L14 8.58639C14.3749 8.96145 14.5856 9.47006 14.5856 10.0004C14.5856 10.5307 14.3749 11.0393 14 11.4144L13.414 11.9994L14.207 12.7934C14.3891 12.982 14.4899 13.2346 14.4877 13.4968C14.4854 13.759 14.3802 14.0098 14.1948 14.1952C14.0094 14.3806 13.7586 14.4858 13.4964 14.4881C13.2342 14.4903 12.9816 14.3895 12.793 14.2074L12 13.4134L11.414 14.0004C11.0389 14.3753 10.5303 14.586 9.99998 14.586C9.46965 14.586 8.96104 14.3753 8.58598 14.0004L2.99998 8.41439C2.65942 8.07302 2.45366 7.6201 2.42058 7.13904C2.3875 6.65797 2.52934 6.18116 2.81998 5.79639L2.94698 5.64439L2.99998 5.58639L5.58598 3.00039C5.96104 2.62545 6.46965 2.41482 6.99998 2.41482C7.53031 2.41482 8.03893 2.62545 8.41398 3.00039Z M13.707 2.29339L16.707 5.29339C16.8945 5.48092 16.9998 5.73523 16.9998 6.00039C16.9998 6.26555 16.8945 6.51986 16.707 6.70739L15.799 7.61739C15.6821 7.45984 15.5537 7.3111 15.415 7.17239L11.414 3.17239L12.293 2.29239C12.4805 2.10492 12.7348 1.9996 13 1.9996C13.2651 1.9996 13.5195 2.10592 13.707 2.29339Z\"/></svg>"
  };
  /*__ICONS_END__*/

  var ICON_BY_SERIES = { 1: 'initiative', 2: 'product', 3: 'research', 4: 'principle' };
  var CX = 50, CY = 47;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  // Glyphs are inline SVG painted with currentColor, so a category takes its style's colour and a theme
  // switch needs no repaint. mode "lit" fills the body and cuts the detail out in the ground colour;
  // mode "dim" is the same shape as an outline, which stays readable where a faint fill would not.
  var img = function (key, dim) {
    var s = ICONS[key] || '';
    return s ? s.replace('<svg ', '<svg class="og" data-mode="' + (dim ? 'dim' : 'lit') + '" aria-hidden="true" focusable="false" ') : '';
  };

  // Label placement from the source: always away from the centre, never off an edge.
  function placement(x, y) {
    var dx = x - CX, dy = y - CY;
    if (y > 72) return 'above';
    if (y < 12) return 'below';
    if (x < 15 || x > 85) return dy < 0 ? 'above' : 'below';
    if (Math.abs(dy) > Math.abs(dx) * 1.5) return dy < 0 ? 'above' : 'below';
    return dx > 0 ? 'right' : 'left';
  }

  function mount(host, opts) {
    var cats = opts.categories, byCat = {};
    cats.forEach(function (c) { c.icon = c.icon || ICON_BY_SERIES[c.series] || 'product'; byCat[c.id] = c; });
    var nodes = opts.nodes.map(function (n) { return Object.assign({}, n); });
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var principles = nodes.filter(function (n) { return n.static; });
    var items = nodes.filter(function (n) { return !n.static; })
      .sort(function (a, b) { return (a.since || '') < (b.since || '') ? -1 : (a.since || '') > (b.since || '') ? 1 : a.id < b.id ? -1 : 1; });
    var serves = function (n) { return (n.links || []).filter(function (l) { return byId[l] && byId[l].static; }); };

    // Stable ghost positions: the golden angle on an outer ellipse.
    var golden = Math.PI * (3 - Math.sqrt(5));
    items.forEach(function (n, i) {
      var a = i * golden - Math.PI / 2;
      n.gx = Math.max(7, Math.min(93, CX + Math.cos(a) * 41));
      n.gy = Math.max(8, Math.min(84, CY + Math.sin(a) * 30));
    });
    // Principle stars: fixed stations round the edge, as the source placed them.
    var STATIONS = [[9, 16], [50, 9], [91, 16], [6, 52], [94, 52], [50, 88], [25, 88], [75, 88]];
    principles.forEach(function (p, i) { var s = STATIONS[i % STATIONS.length]; p.gx = s[0]; p.gy = s[1]; });
    // A hovered glyph grows to about twice its size, so a ghost must not sit beside a star, the ring, an
    // active slot or another ghost. One relaxation pass pushes each ghost off whatever is too close, in
    // units where a percent of the height and 1.54 percent of the width are the same distance.
    (function () {
      var ASP = 1.54, keep = [[CX, CY, 27]];
      principles.forEach(function (p) { keep.push([p.gx, p.gy, 17]); });
      [-45, 45, 135, 225].forEach(function (d) { var a = d * Math.PI / 180; keep.push([CX + Math.cos(a) * 21, CY + Math.sin(a) * 16, 15]); });
      for (var pass = 0; pass < 80; pass++) {
        var moved = false;
        items.forEach(function (n, i) {
          var near = keep.concat(items.filter(function (m) { return m !== n; }).map(function (m) { return [m.gx, m.gy, 14]; }));
          near.forEach(function (k) {
            var dx = (n.gx - k[0]) * ASP, dy = n.gy - k[1], d = Math.hypot(dx, dy) || 0.01;
            if (d >= k[2]) return;
            var push = (k[2] - d) / 2 + 0.05;
            n.gx = Math.max(7, Math.min(93, n.gx + dx / d * push / ASP));
            n.gy = Math.max(8, Math.min(84, n.gy + dy / d * push));
            moved = true;
          });
        });
        if (!moved) break;
      }
    })();

    host.classList.add('orbit-map');
    host.setAttribute('data-component', 'orbit-map');
    host.setAttribute('data-audit-ignore', '');
    // The four category gradients are drawn once, here, and every glyph fills from them (fill: url(#og-gN)).
    // Their stops are the category colour swung along hue, so a style's four colours stay the identity and the
    // brand-derived shift adds the interest; see component.css.
    var defs = '<svg data-slot="paint" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
      [1, 2, 3, 4].map(function (n) { return '<linearGradient id="og-g' + n + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" data-n="' + n + '" data-end="a"/><stop offset="1" data-n="' + n + '" data-end="b"/></linearGradient>'; }).join('') +
      '</defs></svg>';
    host.innerHTML =
      '<div data-slot="mesh" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' + defs +
      '<svg data-slot="energy" aria-hidden="true"></svg>' +
      '<svg data-slot="beams" aria-hidden="true"><defs><linearGradient id="orbit-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" data-stop="a"/><stop offset="100%" data-stop="b"/></linearGradient></defs><g data-slot="beam-g"></g></svg>' +
      '<div data-slot="centre" aria-live="polite"><span data-slot="c-kicker">Activity</span><i></i><b data-slot="c-big"></b><small data-slot="c-unit"></small><i></i><span data-slot="c-date"></span></div>' +
      '<div data-slot="items"></div>';
    var itemsEl = host.querySelector('[data-slot="items"]'), beamG = host.querySelector('[data-slot="beam-g"]');
    var beamsSvg = host.querySelector('[data-slot="beams"]'), energy = host.querySelector('[data-slot="energy"]');

    // keyStyle "outline": a category is a colour and an outline style (solid, dashed, dotted, double), and each
    // project wears its own drawing in a badge; a project with no drawing wears its initial, a principle its star.
    var outlineKey = opts.keyStyle === 'outline';
    if (outlineKey) host.setAttribute('data-keystyle', 'outline');
    function button(n, isPrinciple) {
      var c = byCat[n.category];
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-slot', isPrinciple ? 'star' : 'item');
      b.setAttribute('data-id', n.id);
      b.setAttribute('data-cat', c.series);
      b.setAttribute('data-icon', c.icon);
      b.setAttribute('aria-label', n.label + ', ' + c.label);
      if (outlineKey) {
        b.setAttribute('data-outline', c.outline || 'solid');
        var inner = n.glyph ? n.glyph.replace('<svg ', '<svg class="tool" focusable="false" ') :
          (isPrinciple ? img('principle', false) : img(c.icon, true).replace('class="og"', 'class="og tool"'));
        b.innerHTML = '<span data-slot="glyph" data-badge>' + inner + '</span><span data-slot="label">' + esc(n.label) + '</span>';
      } else
      b.innerHTML = '<span data-slot="glyph"><span data-v="dim">' + img(c.icon, true) + '</span><span data-v="lit">' + img(c.icon, false) + '</span></span><span data-slot="label">' + esc(n.label) + '</span>';
      b.addEventListener('pointerenter', function () { hover(n.id); });
      b.addEventListener('pointerleave', function () { hover(null); });
      b.addEventListener('focus', function () { hover(n.id); });
      b.addEventListener('blur', function () { hover(null); });
      b.addEventListener('click', function () {
        if (isPrinciple) return;
        if (selectedId === n.id) { if (opts.onOpen) opts.onOpen(n.id); return; }
        select(n.id, true);
      });
      itemsEl.appendChild(b); n.el = b;
    }
    items.forEach(function (n, i) { button(n, false); n.el.style.setProperty('--n', i); });
    principles.forEach(function (n, i) { button(n, true); n.el.style.setProperty('--n', i + 3); });
    host.addEventListener('click', function (e) { if (e.target === host || e.target === itemsEl) select(null, true); });
    host.addEventListener('keydown', function (e) { if (e.key === 'Escape') select(null, true); });

    var state = { visible: new Set(), today: new Set(), size: new Map(), cat: null, readout: null };
    var hoverId = null, selectedId = null, catHover = null, playX = null;

    // ---- highlight rules, from the source's getHighlight ----------------------------------
    function hi(n) {
      var focus = hoverId || selectedId;
      var cat = catHover || state.cat;
      if (n.static) {
        if (focus && byId[focus] && !byId[focus].static) return serves(byId[focus]).indexOf(n.id) >= 0 ? 'on' : 'off';
        if (focus && byId[focus] && byId[focus].static) return focus === n.id ? 'on' : 'off';
        if (cat) return byCat[cat].static ? 'on' : 'off';
        return 'rest';
      }
      if (focus && byId[focus]) {
        if (focus === n.id) return 'on';
        if (byId[focus].static) return serves(n).indexOf(focus) >= 0 ? 'near' : 'off';
        return 'off';
      }
      if (cat) return n.category === cat ? 'on' : 'off';
      return 'rest';
    }

    function play(n) {
      n.el.setAttribute('data-play', '');
      clearTimeout(n.pt);
      n.pt = setTimeout(function () { n.el.removeAttribute('data-play'); }, 5200);
    }
    function paint() {
      var W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) return;
      host.toggleAttribute('data-narrow', W < 560);
      var focus = hoverId || selectedId;
      // Active projects: evenly spaced on an inner ellipse, oldest first.
      var active = items.filter(function (n) { return state.today.has(n.id); });
      var ri = W < 560 ? [26, 17] : [21, 16];
      active.forEach(function (n, k) {
        // first slot upper right, as the source placed it; the rest evenly round
        var a = -Math.PI / 4 + k * 2 * Math.PI / Math.max(active.length, 1);
        n.ax = CX + Math.cos(a) * ri[0]; n.ay = CY + Math.sin(a) * ri[1];
      });
      // A category in focus gathers into a ring round the centre. The radius is in pixels so the ring is round
      // whatever the map's shape; past eight items a second, inner ring takes every other one.
      var catFocus = catHover || state.cat, ring = [];
      if (catFocus) {
        ring = items.concat(principles).filter(function (n) { return n.category === catFocus && (n.static || state.visible.has(n.id)); });
        var R = W < 560 ? Math.min(W * 0.34, H * 0.3) : Math.min(W * 0.27, H * 0.34), two = ring.length > 8, cnt = two ? Math.ceil(ring.length / 2) : ring.length;
        ring.forEach(function (n, k) {
          var inner = two && k % 2 === 1, idx = two ? Math.floor(k / 2) : k, rr = inner ? R * 0.58 : R;
          var a = -Math.PI / 2 + idx * 2 * Math.PI / Math.max(cnt, 1) + (inner ? Math.PI / Math.max(cnt, 1) : 0);
          n.rx = CX + Math.cos(a) * rr / W * 100; n.ry = CY + Math.sin(a) * rr / H * 100; n.ra = a; n.rk = k;
        });
      }
      items.concat(principles).forEach(function (n) {
        var present = n.static || state.visible.has(n.id);
        var isActive = !n.static && state.today.has(n.id);
        var inRing = ring.indexOf(n) >= 0;
        var x = inRing ? n.rx : isActive ? n.ax : n.gx, y = inRing ? n.ry : isActive ? n.ay : n.gy;
        n.x = x; n.y = y;
        var h = present ? hi(n) : 'gone';
        var b = n.el;
        b.style.left = x + '%'; b.style.top = y + '%';
        b.style.setProperty('--k', inRing ? n.rk : 0);
        b.toggleAttribute('data-ring', inRing);
        b.setAttribute('data-state', h);
        b.toggleAttribute('data-active', isActive);
        // a glyph that has just become lit (arrived, hovered, connected) plays its motion for a few seconds
        var lit = present && (isActive || h === 'on' || h === 'near');
        if (lit && !n.lit) play(n);
        n.lit = lit;
        b.toggleAttribute('data-selected', selectedId === n.id);
        // Labels: a phone has no room beside, so above or below. On a wider map a ghost's label goes to the side,
        // away from the centre, so it never stacks against the label of a star above or below it.
        var place = placement(x, y);
        if (!n.static && !isActive && W >= 560) place = x < 15 ? 'right' : x > 85 ? 'left' : x < CX ? 'left' : 'right';
        if (inRing) { var ca = Math.cos(n.ra), sa = Math.sin(n.ra); place = ca > 0.55 ? 'right' : ca < -0.55 ? 'left' : sa < 0 ? 'above' : 'below'; }
        b.setAttribute('data-place', inRing ? place : W < 560 && !n.static ? (y < CY ? 'above' : 'below') : place);
        b.hidden = !present;
        b.tabIndex = present ? 0 : -1;
      });
      // Beams: centre to each active project at rest; project to its principles on focus.
      var lines = [];
      if (focus && byId[focus]) {
        var f = byId[focus];
        if (f.static) items.forEach(function (n) { if (state.visible.has(n.id) && serves(n).indexOf(f.id) >= 0) lines.push([f, n, 1]); });
        else serves(f).forEach(function (p) { lines.push([f, byId[p], 1]); });
      } else if (!catHover && !state.cat) {
        active.forEach(function (n) { lines.push([{ x: CX, y: CY, centre: true }, n, 0.9]); });
      }
      beamsSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      beamG.innerHTML = lines.map(function (l) {
        var ax = l[0].x * W / 100, ay = l[0].y * H / 100, bx = l[1].x * W / 100, by = l[1].y * H / 100;
        var dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        var sa = l[0].centre ? (W < 560 ? 48 : 64) : 22, sb = 16;
        var sx = ax + ux * sa, sy = ay + uy * sa, ex = bx - ux * sb, ey = by - uy * sb;
        var hw = l[0].centre ? 1.6 : 2;
        return '<polygon points="' + (sx - uy * hw).toFixed(1) + ',' + (sy + ux * hw).toFixed(1) + ' ' + (sx + uy * hw).toFixed(1) + ',' + (sy - ux * hw).toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1) + '" fill="url(#orbit-beam)" fill-opacity="' + l[2] + '"/>';
      }).join('');
      // The centre readout
      var r = state.readout;
      if (r) {
        host.querySelector('[data-slot="c-big"]').textContent = r.live ? 'Today' : r.days;
        host.querySelector('[data-slot="c-unit"]').textContent = r.live ? '' : (r.days === 1 ? 'day ago' : 'days ago');
        host.querySelector('[data-slot="c-date"]').textContent = r.date;
      }
      host.toggleAttribute('data-focus', !!(focus || catHover || state.cat));
      paintEnergy(W, H);
    }

    // The energy trail from the centre down to the playhead, as the source drew it.
    var STRANDS = [[-5, 5, 10, -14, 1.8, '1 8', .6, 0], [3, 10, -5, -8, 1, '2 12', .4, .15], [-2, 14, 4, -5, 2.2, '1 6', .55, .35], [7, 7, -9, -11, .7, '3 14', .35, .5], [-4, 18, 7, -3, 1.4, '1 10', .3, .7], [5, 12, -11, -9, .5, '2 16', .25, .9], [-8, 3, 12, -16, 1, '1 5', .5, 1.1], [1, 20, -3, -2, .6, '1 18', .2, 1.3]];
    function paintEnergy(W, H) {
      energy.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      if (playX == null) { energy.innerHTML = ''; return; }
      var sx = CX * W / 100, sy = CY * H / 100 + (W < 560 ? 34 : 60), ex = Math.max(8, Math.min(W - 8, playX)), ey = H + 4;
      var k = W / 100, kh = H / 100;
      var path = function (s) { return 'M' + sx + ' ' + sy + ' C' + (sx + s[0] * k) + ' ' + (sy + (ey - sy) * 0.4 + s[1] * kh) + ', ' + (ex + s[2] * k) + ' ' + (ey - (ey - sy) * 0.3 + s[3] * kh) + ', ' + ex + ' ' + ey; };
      energy.innerHTML = '<g data-slot="haze">' + STRANDS.slice(0, 3).map(function (s) { return '<path d="' + path(s) + '" stroke-width="' + (s[4] * 2.2) + '"/>'; }).join('') + '</g>' +
        STRANDS.map(function (s) { return '<path data-slot="strand" d="' + path(s) + '" stroke-width="' + s[4] + '" stroke-dasharray="' + s[5] + '" opacity="' + s[6] + '" style="animation-delay:' + s[7] + 's"/>'; }).join('');
    }

    function hover(id) { hoverId = id; if (id && byId[id] && byId[id].el && !byId[id].static) play(byId[id]); paint(); if (opts.onHover) opts.onHover(id && byId[id] && !byId[id].static ? id : (id || null)); }
    function select(id, fromUser) { selectedId = id; paint(); if (fromUser && opts.onSelect) opts.onSelect(id); }

    if (window.ResizeObserver) new ResizeObserver(paint).observe(host); else window.addEventListener('resize', paint);
    paint();
    return {
      update: function (s) { state = s; paint(); },
      select: function (id) { select(id, false); },
      hoverCategory: function (cat) { catHover = cat; paint(); },
      setPlayhead: function (x) { playX = x; paintEnergy(host.clientWidth, host.clientHeight); },
      refit: paint
    };
  }

  function registerIcon(key, svg) { if (key && typeof svg === 'string' && svg.indexOf('<svg ') === 0) ICONS[key] = svg; }
  window.DSOrbitMap = { mount: mount, iconFor: function (key, dim) { return img(key, dim); }, registerIcon: registerIcon, ICON_BY_SERIES: ICON_BY_SERIES };
})();
