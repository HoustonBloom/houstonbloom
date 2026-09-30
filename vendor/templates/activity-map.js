/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/templates/activity-map.js
   version  1.0.0
   refresh  node sync.mjs --template activity-map "C:/Users/Megan/Claude_Projects/AI Projects/Houston Bloom/Website"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   activity-map.js · v1.0.0 · the runtime for templates/activity-map.css

     DSActivityMap.mount(root, data, {
       head:  html string for the nav row (the host's nav-bar), optional
       url:   'hash' to keep at=, node= and cat= in the hash query, or none
       title: the rail heading, defaults to data.subject.label
     }) -> { destroy }

   data is an activity-map/v1 log (templates/activity-map.md, "The activity
   contract"), as adapters/changelog.mjs writes it:
     { subject, categories[], nodes[], entries[{ ts, node, category, label, summary?, open? }] }

   It builds the stage, mounts the components (time-scrubber, node-graph,
   category-list, detail-panel) and keeps them on one position:
     the set at a position   every static node, and every timed node whose
                             first entry is on or before that day
     size                    that node's entries up to the day
     today                   nodes with an entry on the day itself
     counts                  nodes in the set per category
   A node the log never mentions is not drawn, and a day with no entry is
   not a position: the scrubber only stops on days that have one.

   Needs: time-scrubber, node-graph behaviour loaded first.
   ============================================================================ */
(function () {
  if (window.DSActivityMap) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

  function validate(d) {
    if (!d || d.schema !== 'activity-map/v1') throw new Error('activity-map: expected schema activity-map/v1');
    var ids = new Set(d.categories.map(function (c) { return c.id; }));
    d.nodes.forEach(function (n) { if (!ids.has(n.category)) throw new Error('activity-map: node ' + n.id + ' has undeclared category ' + n.category); });
    d.entries.forEach(function (e) { if (!e.ts || !ids.has(e.category)) throw new Error('activity-map: entry ' + e.ts + ' ' + e.node + ' has no ts or an undeclared category'); });
  }

  function mount(root, data, opts) {
    opts = opts || {};
    validate(data);
    var cats = data.categories, byCat = {}, byNode = {};
    cats.forEach(function (c) { byCat[c.id] = c; });
    data.nodes.forEach(function (n) { byNode[n.id] = n; });

    // Active days, and per-day counts for the histogram.
    var dayMap = {};
    data.entries.forEach(function (e) {
      var d = dayMap[e.ts] || (dayMap[e.ts] = { day: e.ts, count: 0, byCat: {} });
      d.count++; d.byCat[e.category] = (d.byCat[e.category] || 0) + 1;
    });
    var days = Object.keys(dayMap).sort().map(function (k) {
      var d = dayMap[k], top = null;
      for (var c in d.byCat) if (!top || d.byCat[c] > d.byCat[top]) top = c;
      return { day: d.day, count: d.count, cat: byCat[top].series };
    });
    if (!days.length) { root.textContent = 'This log has no entries yet.'; return { destroy: function () {} }; }
    var dayList = days.map(function (d) { return d.day; });

    // Two graphs share one interface: orbit (a personal site's Explorer view:
    // the day's work comes forward) and nodes (the Node App Template engine:
    // how everything connects). opts.graphs lists the ones offered, first is
    // the default; the choice rides in the URL as g=.
    var graphs = (opts.graphs || [opts.graph || 'nodes']).filter(function (g) { return g === 'orbit' ? !!window.DSOrbitMap : !!window.DSNodeGraph; });
    if (!graphs.length) graphs = ['nodes'];
    root.innerHTML =
      '<div class="tpl tpl--activity-map">' +
        '<div class="am-head">' + (opts.head || '') + '</div>' +
        '<div class="am-body">' +
          '<aside class="am-rail" aria-label="Categories and detail">' +
            '<h1 class="am-title">' + esc(opts.title || 'Activity map') + '</h1>' +
            (graphs.length > 1 ? '<div class="am-graphs" role="group" aria-label="Map view">' + graphs.map(function (g) { return '<button type="button" data-graph="' + g + '">' + (g === 'orbit' ? 'Orbit' : 'Graph') + '</button>'; }).join('') + '</div>' : '') +
            '<p class="am-span">' + days.length + ' active days · ' + DSTimeScrubber.fmtDate(days[0].day) + ' to ' + DSTimeScrubber.fmtDate(days[days.length - 1].day) + '</p>' +
            '<ul class="category-list" data-component="category-list"></ul>' +
            '<section class="detail-panel" data-component="detail-panel" aria-live="polite"></section>' +
          '</aside>' +
          '<div class="am-map"></div>' +
        '</div>' +
        '<div class="am-time"></div>' +
      '</div>';
    var $ = function (s) { return root.querySelector(s); };
    var list = $('.category-list'), panel = $('.detail-panel');

    // URL: at=, node=, cat= in the hash query.
    function readUrl() {
      if (opts.url !== 'hash') return {};
      var q = (location.hash.split('?')[1] || '');
      var p = new URLSearchParams(q);
      return { at: p.get('at'), node: p.get('node'), cat: p.get('cat'), g: p.get('g') };
    }
    function writeUrl() {
      if (opts.url !== 'hash') return;
      var base = location.hash.split('?')[0], p = new URLSearchParams();
      var s = time.get();
      p.set('at', s.live ? 'live' : s.day);
      if (selected) p.set('node', selected);
      if (catOn) p.set('cat', catOn);
      if (graphs.length > 1 && graphKind !== graphs[0]) p.set('g', graphKind);
      history.replaceState(null, '', (base || '#') + '?' + p.toString());
    }
    var u = readUrl();
    var selected = u.node && byNode[u.node] ? u.node : null;
    var hovered = null;
    var catOn = u.cat && byCat[u.cat] ? u.cat : null;
    var graphKind = graphs.indexOf(u.g) >= 0 ? u.g : graphs[0];

    var time = DSTimeState.create({ days: dayList, value: u.at && u.at !== 'live' ? u.at : null });

    // The rail's key matches the graph on screen: shapes for the node graph,
    // the category icons for the orbit.
    function paintList() {
      list.setAttribute('data-key', graphKind);
      list.innerHTML = cats.map(function (c) {
        var key = graphKind === 'orbit'
          ? '<span data-slot="swatch" data-icon>' + DSOrbitMap.iconFor(c.icon || DSOrbitMap.ICON_BY_SERIES[c.series], false) + '</span>'
          : DSNodeGraph.shapeSVG(c.shape || DSNodeGraph.SHAPES[c.series]).replace('<svg ', '<svg data-slot="swatch" ');
        return '<li><button type="button" data-slot="row" data-cat="' + c.series + '" data-id="' + esc(c.id) + '" aria-pressed="' + (catOn === c.id) + '">' +
          key + '<span data-slot="label">' + esc(c.label) + '</span><span data-slot="count">0</span></button></li>';
      }).join('');
    }
    paintList();
    // The rail drives the map: hovering a category brings it forward there.
    list.addEventListener('pointerover', function (e) { var b = e.target.closest('[data-slot="row"]'); if (b && graph.hoverCategory) graph.hoverCategory(b.dataset.id); });
    list.addEventListener('pointerleave', function () { if (graph.hoverCategory) graph.hoverCategory(null); });
    list.addEventListener('focusin', function (e) { var b = e.target.closest('[data-slot="row"]'); if (b && graph.hoverCategory) graph.hoverCategory(b.dataset.id); });
    list.addEventListener('focusout', function () { if (graph.hoverCategory) graph.hoverCategory(null); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-slot="row"]'); if (!b) return;
      catOn = catOn === b.dataset.id ? null : b.dataset.id;
      render(); writeUrl();
    });

    var graph = null;
    function mountGraph() {
      var el = $('.am-map'); el.innerHTML = ''; el.className = 'am-map';
      // the orbit's Activity ring already shows the date; the node graph has no ring, so the bar carries it
      $('.am-time').setAttribute('data-readout', graphKind === 'orbit' ? 'external' : 'flag');
      $('.tpl--activity-map').setAttribute('data-graph', graphKind);
      var engine = graphKind === 'orbit' ? DSOrbitMap : DSNodeGraph;
      graph = engine.mount(el, {
        subject: data.subject, categories: cats, nodes: data.nodes,
        onHover: function (id) { hovered = id; paintPanel(); },
        onSelect: function (id) { selected = id; paintPanel(); writeUrl(); },
        onOpen: function (id) { var n = byNode[id], href = opts.hrefFor ? opts.hrefFor(id) : n && n.open; if (href) location.href = href; }
      });
      if (selected) graph.select(selected);
      root.querySelectorAll('.am-graphs [data-graph]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.graph === graphKind)); });
    }
    mountGraph();
    root.querySelectorAll('.am-graphs [data-graph]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.graph === graphKind) return;
        graphKind = b.dataset.graph; paintList(); mountGraph(); render(); writeUrl(); playhead();
      });
    });

    DSTimeScrubber.mount($('.am-time'), { time: time, days: days, label: 'Timeline of ' + data.subject.label, now: data.built });

    // The orbit draws a trail from its centre to the playhead: tell it where that is.
    function playhead() {
      if (!graph || !graph.setPlayhead) return;
      var th = root.querySelector('.time-scrubber [data-slot="thumb"]'), m = $('.am-map');
      if (!th || !m) return;
      var a = th.getBoundingClientRect(), b = m.getBoundingClientRect();
      graph.setPlayhead(a.left + a.width / 2 - b.left);
    }
    if (window.ResizeObserver) new ResizeObserver(playhead).observe(root);

    // What exists at a position.
    function at(s) {
      var visible = new Set(), size = new Map(), today = new Set();
      data.nodes.forEach(function (n) { if (n.static) visible.add(n.id); });
      data.entries.forEach(function (e) {
        if (e.ts > s.day) return;
        visible.add(e.node);
        size.set(e.node, (size.get(e.node) || 0) + 1);
        if (e.ts === s.day) today.add(e.node);
      });
      return { visible: visible, size: size, today: today };
    }
    var cur = null;
    function render() {
      var s = time.get();
      cur = at(s);
      var vis = cur.visible;
      cur.cat = catOn;   // one category forward: the rest stay drawn, dimmed
      var last = dayList[dayList.length - 1];
      cur.readout = { live: s.live, days: Math.round((Date.parse(last + 'T12:00:00') - Date.parse(s.day + 'T12:00:00')) / 86400000), date: DSTimeScrubber.fmtDate(s.day) };
      graph.update(cur);
      requestAnimationFrame(playhead);
      list.querySelectorAll('[data-slot="row"]').forEach(function (b) {
        var id = b.dataset.id, n = 0;
        vis.forEach(function (v) { if (byNode[v].category === id) n++; });
        b.querySelector('[data-slot="count"]').textContent = n;
        b.setAttribute('aria-pressed', String(catOn === id));
      });
      paintPanel();
    }

    function entryList(items, noDate) {
      // Rows that would show only a date collapse by day, with a count.
      var seen = {}, rows = [];
      items.forEach(function (e) {
        var bare = !e.summary && byNode[e.node] && e.label === byNode[e.node].label && items.every(function (x) { return x.node === e.node; });
        if (bare && seen[e.ts]) { seen[e.ts].n++; return; }
        var r = { e: e, n: 1 }; if (bare) seen[e.ts] = r; rows.push(r);
      });
      return '<ol data-slot="entries">' + rows.map(function (r) {
        var e = r.e;
        // A public entry's label is its node's name; in a node's own panel that
        // repeats the heading on every row, so the row keeps only the date.
        var named = e.label && !(byNode[e.node] && e.label === byNode[e.node].label && items.every(function (x) { return x.node === e.node; }));
        var when = noDate ? (r.n > 1 ? r.n + ' sessions' : '') : DSTimeScrubber.fmtDate(e.ts) + (r.n > 1 ? ' · ' + r.n + ' sessions' : '');
        var body = (when ? '<time datetime="' + e.ts + '">' + when + '</time>' : '') + (named ? '<b>' + esc(e.label) + '</b>' : '') + (e.summary ? '<span>' + esc(e.summary) + '</span>' : '');
        return '<li>' + (e.open ? '<a href="' + esc(e.open) + '">' + body + '</a>' : body) + '</li>';
      }).join('') + '</ol>';
    }
    function related(head, items) {
      if (!items.length) return '';
      return '<div data-slot="related"><p data-slot="rh">' + head + ' (' + items.length + ')</p><ul>' + items.map(function (x) {
        var cc = byCat[x.category];
        var mark = graphKind === 'orbit' ? DSOrbitMap.iconFor(cc.icon || DSOrbitMap.ICON_BY_SERIES[cc.series], false) : DSNodeGraph.shapeSVG(cc.shape || DSNodeGraph.SHAPES[cc.series]);
        return '<li><button type="button" data-go="' + esc(x.id) + '" data-cat="' + cc.series + '">' + mark + esc(x.label) + '</button></li>';
      }).join('') + '</ul></div>';
    }
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b) return;
      selected = b.dataset.go; hovered = null; graph.select(selected); paintPanel(); writeUrl();
    });
    function paintPanel() {
      var s = time.get(), id = hovered || selected, html;
      panel.toggleAttribute('data-idle', !id);
      if (id && byNode[id]) {
        var n = byNode[id], c = byCat[n.category];
        var mine = data.entries.filter(function (e) { return e.node === id && e.ts <= s.day; });
        var links = (n.links || []).map(function (l) { return byNode[l]; }).filter(Boolean);
        var servedBy = n.static ? data.nodes.filter(function (x) { return (x.links || []).indexOf(id) >= 0 && cur.visible.has(x.id); }) : [];
        var meta = n.static ? servedBy.length + ' of the projects on the map serve this principle'
          : mine.length ? mine.length + (mine.length === 1 ? ' entry' : ' entries') + ' to ' + DSTimeScrubber.fmtDate(s.day) + ' · since ' + DSTimeScrubber.fmtDate(n.since) : 'No entries yet at this date';
        // The template's two lists: real connections, then the rest of the group.
        // Both are buttons and move the map, as they do in the Node App Template.
        var connected = n.static ? servedBy : links.filter(function (x) { return x.static || cur.visible.has(x.id); });
        var sibs = data.nodes.filter(function (x) { return x.category === n.category && x.id !== n.id && (x.static || cur.visible.has(x.id)); });
        html = '<p data-slot="kicker">' + esc(c.label) + '</p><h2 data-slot="title">' + esc(n.label) + '</h2><p data-slot="meta">' + esc(meta) + '</p>' +
          (n.open ? '<a data-slot="open" href="' + esc(n.open) + '">Open ' + esc(n.label) + '</a>' : '') +
          (mine.length ? entryList(mine.slice(-6).reverse()) : '') +
          related('Connected to', connected) + related('Same group', sibs);
      } else {
        var todays = data.entries.filter(function (e) { return e.ts === s.day; });
        // The orbit's Activity ring already shows the date, so its day view drops the date heading and the date on every row.
        var ring = graphKind === 'orbit';
        html = '<p data-slot="kicker">' + (s.live ? 'Live · latest day' : 'On this day') + '</p>' +
          (ring ? '' : '<h2 data-slot="title">' + DSTimeScrubber.fmtDate(s.day) + '</h2>') +
          '<p data-slot="meta">' + cur.visible.size + ' nodes on the map · ' + todays.length + (todays.length === 1 ? ' entry' : ' entries') + ' this day</p>' +
          (todays.length ? entryList(todays.slice(0, 6), ring) : '<p data-slot="empty">No entries on this day.</p>');
      }
      panel.innerHTML = html;
    }

    var off = time.subscribe(function () { render(); writeUrl(); });
    render();
    return { destroy: function () { off(); root.innerHTML = ''; }, time: time };
  }

  window.DSActivityMap = { mount: mount, validate: validate };
})();
