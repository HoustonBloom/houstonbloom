/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/components/orbit-map/behavior.js
   version  1.0.0
   refresh  node sync.mjs orbit-map "C:/Users/Megan/Claude_Projects/AI Projects/Houston Bloom/Website"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   orbit-map · behaviour · v1.0.0

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

   Plain script, not a module, so a page that opens from disk can inline it.
   ============================================================================ */
(function () {
  if (window.DSOrbitMap) return;

  /*__ICONS_START__*/
  var ICONS = {
   "initiative": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body d=\"M4.74367 13.3962C4.68363 13.3521 4.61154 13.3274 4.53707 13.3255C4.46261 13.3236 4.38935 13.3445 4.32714 13.3855C4.26493 13.4265 4.21674 13.4855 4.18907 13.5546C4.1614 13.6238 4.15556 13.6998 4.17234 13.7723C4.98168 17.3476 8.18394 20.025 12.0004 20.025C12.8109 20.0253 13.6166 19.9023 14.3901 19.6602C14.4615 19.6382 14.5244 19.5948 14.5703 19.5359C14.6163 19.477 14.643 19.4054 14.6469 19.3308C14.6509 19.2563 14.6318 19.1823 14.5923 19.1188C14.5528 19.0554 14.4948 19.0057 14.4261 18.9763C12.7171 18.223 11.0506 17.3765 9.43421 16.4407C7.81655 15.5118 6.25071 14.4954 4.74367 13.3962ZM22.7941 15.8078C22.603 15.5533 22.3787 15.2861 22.1238 15.0085C22.0405 14.9167 21.935 14.848 21.8174 14.8088C21.6998 14.7697 21.5742 14.7614 21.4525 14.7849C21.3308 14.8084 21.2173 14.8629 21.1227 14.943C21.0282 15.0231 20.9559 15.1262 20.9127 15.2424C20.9127 15.2497 20.9077 15.2565 20.905 15.2638C20.8595 15.3873 20.8489 15.5209 20.8742 15.6501C20.8996 15.7792 20.9599 15.8989 21.0486 15.9961C22.0855 17.136 22.2533 17.752 22.2104 17.882C22.1192 17.9837 21.433 18.1961 19.559 17.721C19.2906 17.6529 18.9969 17.5699 18.678 17.4721C18.4726 17.4088 18.263 17.3406 18.0493 17.2673C18.3849 16.8823 18.6832 16.4662 18.9402 16.0248C18.948 16.0116 18.9562 15.9984 18.9639 15.9847C19.66 14.7721 20.026 13.3982 20.0254 12C20.0256 11.7106 20.0104 11.4214 19.9798 11.1336C19.5435 7.11337 16.1315 3.97495 12.0004 3.97495C10.2476 3.97396 8.54299 4.54894 7.1489 5.61142C6.30393 6.25453 5.59386 7.05772 5.0592 7.97515C5.0519 7.98838 5.04369 8.0016 5.03594 8.01482C4.78184 8.45752 4.57067 8.92351 4.40534 9.40644C4.23541 9.2584 4.07142 9.11143 3.91335 8.96552C3.66758 8.73753 3.44963 8.52642 3.25584 8.32716C1.90754 6.9474 1.74704 6.24749 1.78945 6.118C1.88064 6.01632 2.49802 5.85034 4.00637 6.17773C4.13532 6.20609 4.26959 6.1985 4.39453 6.15581C4.51947 6.11312 4.6303 6.03695 4.71494 5.93561L4.73135 5.91555C4.81003 5.82101 4.86308 5.70784 4.88543 5.58689C4.90778 5.46595 4.89867 5.34129 4.85898 5.22488C4.8193 5.10847 4.75036 5.00421 4.65878 4.92211C4.56721 4.84 4.45607 4.78281 4.33603 4.75602C3.97803 4.67487 3.61613 4.61202 3.25174 4.5677C1.851 4.40675 0.934053 4.68261 0.525962 5.38845C0.378228 5.64288 0.236422 6.0765 0.401938 6.69252C0.646793 7.60719 1.51952 8.71701 2.75473 9.87973C3.14823 10.2504 3.57821 10.6262 4.03692 11.0032C4.37068 11.2768 4.72087 11.5531 5.08108 11.8276C5.32153 12.01 5.56699 12.1924 5.81747 12.3748C6.06795 12.5572 6.32177 12.7362 6.57894 12.9119C7.73755 13.7149 8.96183 14.4859 10.1624 15.1776C10.5983 15.4287 11.0336 15.6719 11.4683 15.9072C11.903 16.1425 12.3342 16.3675 12.7619 16.5825C13.7604 17.084 14.7385 17.5363 15.6737 17.9244C16.0746 18.091 16.4669 18.2454 16.8505 18.3876C17.3927 18.5892 17.9161 18.7665 18.415 18.9161L18.4651 18.9312C19.6383 19.2804 20.6273 19.4642 21.4052 19.4783H21.4845C22.4712 19.4783 23.1397 19.1874 23.4716 18.612C23.8861 17.8998 23.6577 16.9559 22.7941 15.8078Z\"/><path data-cut fill=\"none\" stroke-width=\"1.4\" stroke-linecap=\"round\" d=\"M5.58398 5.84561C3.24554 5.11665 1.57717 5.02784 1.15749 5.75289C0.344045 7.15909 4.53895 11.0964 10.5267 14.5467C16.5145 17.997 22.0285 19.6535 22.8424 18.2469C23.255 17.5331 22.38 16.1699 20.6368 14.5492\"/></svg>",
   "principle": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body fill-rule=\"evenodd\" d=\"M13.287 3.26625C12.8493 2.06459 11.1507 2.06459 10.713 3.26625L8.72673 8.72674L3.26624 10.713C2.06457 11.1507 2.06457 12.8493 3.26624 13.287L8.72673 15.2733L10.713 20.7338C11.1507 21.9354 12.8493 21.9354 13.287 20.7338L15.2733 15.2733L20.7337 13.287C21.9354 12.8493 21.9354 11.1507 20.7337 10.713L15.2733 8.72674L13.287 3.26625Z\"/><path data-cut d=\"M10.9448 8.2556C11.3034 7.2712 12.6956 7.27123 13.0542 8.2556L13.8765 10.5163L16.1382 11.3396C17.1226 11.6982 17.1226 13.0904 16.1382 13.449L13.8765 14.2712L13.0542 16.5329C12.6956 17.5174 11.3034 17.5174 10.9448 16.5329L10.1216 14.2712L7.86084 13.449C6.87647 13.0904 6.87644 11.6982 7.86084 11.3396L10.1216 10.5163L10.9448 8.2556Z\"/></svg>",
   "product": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body d=\"M2.44999 10.575L6.64999 6.37501C6.88332 6.14167 7.15832 5.97501 7.47499 5.87501C7.79165 5.77501 8.11665 5.75834 8.44999 5.82501L9.74999 6.10001C8.84999 7.16667 8.14165 8.13334 7.62499 9.00001C7.10832 9.86667 6.60832 10.9167 6.12499 12.15L2.44999 10.575ZM7.57499 12.85C7.95832 11.65 8.47932 10.5167 9.13799 9.45001C9.79665 8.38334 10.5923 7.38334 11.525 6.45001C12.9917 4.98334 14.6667 3.88767 16.55 3.16301C18.4333 2.43834 20.1917 2.21734 21.825 2.50001C22.1083 4.13334 21.8917 5.89167 21.175 7.77501C20.4583 9.65834 19.3667 11.3333 17.9 12.8C16.9833 13.7167 15.9833 14.5127 14.9 15.188C13.8167 15.8633 12.675 16.3923 11.475 16.775L7.57499 12.85ZM15.888 10.425C16.446 10.425 16.9167 10.2333 17.3 9.85001C17.6833 9.46667 17.875 8.996 17.875 8.438C17.875 7.88 17.6833 7.40901 17.3 7.02501C16.9167 6.64101 16.446 6.44934 15.888 6.45001C15.33 6.45067 14.859 6.64234 14.475 7.02501C14.091 7.40767 13.8993 7.87867 13.9 8.438C13.9007 8.99734 14.0923 9.46801 14.475 9.85001C14.8577 10.232 15.3287 10.4237 15.888 10.425ZM13.775 21.875L12.175 18.2C13.4083 17.7167 14.4627 17.2167 15.338 16.7C16.2133 16.1833 17.184 15.475 18.25 14.575L18.5 15.875C18.5667 16.2083 18.55 16.5377 18.45 16.863C18.35 17.1883 18.1833 17.4673 17.95 17.7L13.775 21.875ZM4.04999 16.05C4.63332 15.4667 5.34165 15.1707 6.17499 15.162C7.00832 15.1533 7.71665 15.441 8.29999 16.025C8.88332 16.609 9.17499 17.3173 9.17499 18.15C9.17499 18.9827 8.88332 19.691 8.29999 20.275C7.88332 20.6917 7.18732 21.05 6.21199 21.35C5.23665 21.65 3.89099 21.9167 2.17499 22.15C2.40832 20.4333 2.67499 19.0917 2.97499 18.125C3.27499 17.1583 3.63332 16.4667 4.04999 16.05Z\"/><path data-cut d=\"M5.92354 14.8374C4.95834 14.8475 4.13791 15.1903 3.46227 15.8659C2.97967 16.3485 2.56463 17.1497 2.21715 18.2693C1.86968 19.3889 1.56082 20.9429 1.29056 22.9312C3.27811 22.661 4.83672 22.3521 5.9664 22.0047C7.09607 21.6572 7.90221 21.2421 8.38481 20.7595C9.06046 20.0831 9.39828 19.2627 9.39828 18.2983C9.39828 17.3338 9.06046 16.5134 8.38481 15.837C7.70917 15.1606 6.88875 14.8274 5.92354 14.8374Z\"/><circle data-cut cx=\"15.82\" cy=\"8.29\" r=\"2.5\"/></svg>",
   "research": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path data-body d=\"M21 14.0004C21.2652 14.0004 21.5196 14.1057 21.7071 14.2933C21.8946 14.4808 22 14.7352 22 15.0004C22 16.8569 21.2625 18.6374 19.9497 19.9501C18.637 21.2629 16.8565 22.0004 15 22.0004C14.7348 22.0004 14.4804 21.895 14.2929 21.7075C14.1053 21.52 14 21.2656 14 21.0004C14 20.7352 14.1053 20.4808 14.2929 20.2933C14.4804 20.1057 14.7348 20.0004 15 20.0004C16.3261 20.0004 17.5978 19.4736 18.5355 18.5359C19.4732 17.5982 20 16.3265 20 15.0004C20 14.7352 20.1053 14.4808 20.2929 14.2933C20.4804 14.1057 20.7348 14.0004 21 14.0004ZM17 13.5004C17.2652 13.5004 17.5196 13.6057 17.7071 13.7933C17.8946 13.9808 18 14.2352 18 14.5004C18 15.4286 17.6312 16.3189 16.9749 16.9753C16.3185 17.6316 15.4282 18.0004 14.5 18.0004C14.2451 18.0001 13.9999 17.9025 13.8146 17.7275C13.6293 17.5526 13.5177 17.3134 13.5028 17.059C13.4879 16.8046 13.5707 16.554 13.7342 16.3586C13.8978 16.1631 14.1299 16.0375 14.383 16.0074L14.5 16.0004C14.8729 16.0004 15.2324 15.8615 15.5084 15.6108C15.7844 15.3601 15.9572 15.0156 15.993 14.6444L16 14.5004C16 14.2352 16.1053 13.9808 16.2929 13.7933C16.4804 13.6057 16.7348 13.5004 17 13.5004ZM3.17098 11.4134L7.17098 15.4144C7.31231 15.5557 7.46065 15.6837 7.61598 15.7984L6.70698 16.7084C6.51945 16.8959 6.26515 17.0012 5.99998 17.0012C5.73482 17.0012 5.48051 16.8959 5.29298 16.7084L2.29298 13.7084C2.20001 13.6155 2.12625 13.5052 2.07592 13.3838C2.0256 13.2624 1.99969 13.1323 1.99969 13.0009C1.99969 12.8695 2.0256 12.7393 2.07592 12.6179C2.12625 12.4966 2.20001 12.3863 2.29298 12.2934L3.17098 11.4134ZM8.41398 3.00039L14 8.58639C14.3749 8.96145 14.5856 9.47006 14.5856 10.0004C14.5856 10.5307 14.3749 11.0393 14 11.4144L13.414 11.9994L14.207 12.7934C14.3891 12.982 14.4899 13.2346 14.4877 13.4968C14.4854 13.759 14.3802 14.0098 14.1948 14.1952C14.0094 14.3806 13.7586 14.4858 13.4964 14.4881C13.2342 14.4903 12.9816 14.3895 12.793 14.2074L12 13.4134L11.414 14.0004C11.0389 14.3753 10.5303 14.586 9.99998 14.586C9.46965 14.586 8.96104 14.3753 8.58598 14.0004L2.99998 8.41439C2.65942 8.07302 2.45366 7.6201 2.42058 7.13904C2.3875 6.65797 2.52934 6.18116 2.81998 5.79639L2.94698 5.64439L2.99998 5.58639L5.58598 3.00039C5.96104 2.62545 6.46965 2.41482 6.99998 2.41482C7.53031 2.41482 8.03893 2.62545 8.41398 3.00039ZM13.707 2.29339L16.707 5.29339C16.8945 5.48092 16.9998 5.73523 16.9998 6.00039C16.9998 6.26555 16.8945 6.51986 16.707 6.70739L15.799 7.61739C15.6821 7.45984 15.5537 7.3111 15.415 7.17239L11.414 3.17239L12.293 2.29239C12.4805 2.10492 12.7348 1.9996 13 1.9996C13.2651 1.9996 13.5195 2.10592 13.707 2.29339Z\"/></svg>"
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

    function button(n, isPrinciple) {
      var c = byCat[n.category];
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-slot', isPrinciple ? 'star' : 'item');
      b.setAttribute('data-id', n.id);
      b.setAttribute('data-cat', c.series);
      b.setAttribute('data-icon', c.icon);
      b.setAttribute('aria-label', n.label + ', ' + c.label);
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
      items.concat(principles).forEach(function (n) {
        var present = n.static || state.visible.has(n.id);
        var isActive = !n.static && state.today.has(n.id);
        var x = isActive ? n.ax : n.gx, y = isActive ? n.ay : n.gy;
        n.x = x; n.y = y;
        var h = present ? hi(n) : 'gone';
        var b = n.el;
        b.style.left = x + '%'; b.style.top = y + '%';
        b.setAttribute('data-state', h);
        b.toggleAttribute('data-active', isActive);
        b.toggleAttribute('data-selected', selectedId === n.id);
        b.setAttribute('data-place', W < 560 && !n.static ? (y < CY ? 'above' : 'below') : placement(x, y));   // a phone has no room beside
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

    function hover(id) { hoverId = id; paint(); if (opts.onHover) opts.onHover(id && byId[id] && !byId[id].static ? id : (id || null)); }
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

  window.DSOrbitMap = { mount: mount, iconFor: function (key, dim) { return img(key, dim); }, ICON_BY_SERIES: ICON_BY_SERIES };
})();
