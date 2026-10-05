/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   design-system/components/linked-picker/behavior.js
   version  1.1.0
   refresh  node sync.mjs linked-picker "<this folder>"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   linked-picker · behaviour · v1.1.0

   Renders the linked-picker from a plain object and keeps one selection:

     const picker = DSLinkedPicker.mount(el, {
       leftLabel:  '01 / Choose a skill',
       rightLabel: '02 / Open a system',
       gutter:     'Linked to',
       idle:       'Pick a skill or a system.',      status line before a pick
       foot:       ['left hint', 'right hint'],      optional
       leftNoun:   'skill', rightNoun: 'system',     for "2 linked systems"
       left:  [{ id, mark, sub, title, detail? }],
       right: [{ id, mark, title, sub?, detail? }],
       links: [[leftId, rightId, why?], ...],
       detail: { id: { kicker, title, body, facts: [[k, v]], links: [{label, href}] } }   optional
     });
     picker.select('left'|'right', id)   picker.clear()

   1.1.0 options
     hover: true       pointer or focus on an item selects it; leaving the lists clears
     detail: false     no detail panel under the lists
     item.href         the item renders as a link; with hover on, a click follows it

   Rules it keeps
     one selection at a time; a second press on the same item clears it
     the status line names the selection and counts what it links to
     a selected left item draws wires to its right items, and the reverse
     resting wires stay faint so the whole web is visible before any pick
     the detail panel lists the other side as buttons, each with the reason
       the link exists; pressing one moves the selection there
     Escape clears. Items are buttons, so Tab and Enter work.
     counts are computed from links, never typed in

   Colours come from the component CSS, which reads tokens, so a style or
   theme switch needs no repaint here. Plain script, no module, no network.
   ============================================================================ */
(function () {
  if (window.DSLinkedPicker) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var tag = function (d, slot) { return d.href ? '<a data-slot="' + slot + '" href="' + esc(d.href) + '" data-id="' + esc(d.id) + '">' : '<button type="button" data-slot="' + slot + '" data-id="' + esc(d.id) + '" aria-pressed="false">'; };
  var untag = function (d) { return d.href ? '</a>' : '</button>'; };
  var plural = function (n, noun) { return n + ' linked ' + noun + (n === 1 ? '' : 's'); };

  function mount(host, cfg) {
    var left = cfg.left || [], right = cfg.right || [], links = (cfg.links || []).filter(function (l) { return l[0] && l[1]; });
    var byL = {}, byR = {}; left.forEach(function (d) { byL[d.id] = d; }); right.forEach(function (d) { byR[d.id] = d; });
    var toR = {}, toL = {};
    links.forEach(function (l) {
      if (!byL[l[0]] || !byR[l[1]]) throw new Error('linked-picker: link ' + l[0] + ' to ' + l[1] + ' points at a missing item');
      (toR[l[0]] = toR[l[0]] || []).push({ id: l[1], why: l[2] || '' });
      (toL[l[1]] = toL[l[1]] || []).push({ id: l[0], why: l[2] || '' });
    });
    var sel = null;

    host.classList.add('linked-picker'); host.setAttribute('data-component', 'linked-picker');
    var row = function (d) {
      var n = (toR[d.id] || []).length;
      return '<li>' + tag(d, 'row') + '<span class="lp-mark"><b>' + esc(d.mark) + '</b>' + (d.sub ? '<small>' + esc(d.sub) + '</small>' : '') + '</span>' +
        '<span class="lp-title">' + esc(d.title) + '</span><span class="lp-count" title="' + n + ' linked">' + n + '</span>' + untag(d) + '</li>';
    };
    var card = function (d) {
      var n = (toL[d.id] || []).length;
      return '<li>' + tag(d, 'card') + '<span class="lp-mark"><b>' + esc(d.mark) + '</b></span>' +
        '<span class="lp-title">' + esc(d.title) + '<small>' + (d.sub ? esc(d.sub) + ' · ' : '') + (n ? 'Shared by ' + n + ' ' + esc(cfg.leftNoun || 'item') + (n === 1 ? '' : 's') : 'Nothing links here yet') + '</small></span><span class="lp-arrow" aria-hidden="true">↗</span>' + untag(d) + '</li>';
    };
    host.innerHTML =
      '<p data-slot="status" aria-live="polite"></p>' +
      '<div data-slot="body">' +
        '<div data-slot="left"><p data-slot="label">' + esc(cfg.leftLabel || '') + '</p><ul>' + left.map(row).join('') + '</ul></div>' +
        '<p data-slot="gutter">' + esc(cfg.gutter || 'Linked to') + '</p>' +
        '<div data-slot="right"><p data-slot="label">' + esc(cfg.rightLabel || '') + '</p><ul>' + right.map(card).join('') + '</ul></div>' +
        '<svg data-slot="wires" aria-hidden="true"></svg>' +
      '</div>' +
      '<div data-slot="detail" hidden aria-live="polite"></div>' +
      '<p data-slot="foot"><span>' + esc((cfg.foot || [])[0] || '') + '</span><span>' + esc((cfg.foot || [])[1] || '') + '</span></p>';

    var q = function (s) { return host.querySelector(s); };
    var body = q('[data-slot="body"]'), svg = q('[data-slot="wires"]'), status = q('[data-slot="status"]'), detail = q('[data-slot="detail"]');
    var elL = {}, elR = {};
    host.querySelectorAll('[data-slot="row"]').forEach(function (b) { elL[b.dataset.id] = b; });
    host.querySelectorAll('[data-slot="card"]').forEach(function (b) { elR[b.dataset.id] = b; });

    function linkedSet() {
      if (!sel) return null;
      var list = sel.side === 'left' ? toR[sel.id] : toL[sel.id];
      return new Set((list || []).map(function (x) { return x.id; }));
    }
    function wires() {
      if (getComputedStyle(svg).display === 'none') return;
      var b = body.getBoundingClientRect(), out = [], set = linkedSet();
      svg.setAttribute('viewBox', '0 0 ' + b.width + ' ' + b.height);
      links.forEach(function (l) {
        var a = elL[l[0]].getBoundingClientRect(), c = elR[l[1]].getBoundingClientRect();
        var x1 = a.right - b.left, y1 = a.top + a.height / 2 - b.top, x2 = c.left - b.left, y2 = c.top + c.height / 2 - b.top, dx = (x2 - x1) * 0.5;
        var on = sel && ((sel.side === 'left' && sel.id === l[0]) || (sel.side === 'right' && sel.id === l[1]));
        out.push('<path class="lp-wire' + (on ? ' on' : '') + '" d="M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>');
        if (on) out.push('<circle class="lp-end" cx="' + x1 + '" cy="' + y1 + '" r="3.5"/><circle class="lp-end" cx="' + x2 + '" cy="' + y2 + '" r="3.5"/>');
      });
      svg.innerHTML = out.join('');
    }
    function paintDetail() {
      if (!sel || cfg.detail === false) { detail.hidden = true; detail.innerHTML = ''; return; }
      var side = sel.side, item = (side === 'left' ? byL : byR)[sel.id], d = (cfg.detail || {})[sel.id] || {};
      var others = (side === 'left' ? toR : toL)[sel.id] || [], otherBy = side === 'left' ? byR : byL;
      var entries = others.map(function (o) {
        return '<li><button type="button" data-go="' + esc(o.id) + '">' + esc(otherBy[o.id].title) + '</button><span>' + esc(o.why) + '</span></li>';
      }).concat((d.facts || []).map(function (f) { return '<li><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></li>'; }));
      detail.hidden = false;
      detail.innerHTML = '<p data-slot="kicker">' + esc(d.kicker || (side === 'left' ? cfg.leftNoun : cfg.rightNoun) || '') + '</p><h3>' + esc(d.title || item.title) + '</h3>' +
        (d.body ? '<p>' + esc(d.body) + '</p>' : '') +
        (entries.length ? '<ul data-slot="entries">' + entries.join('') + '</ul>' : '<p>' + esc(cfg.noLinks || 'Nothing links to this yet.') + '</p>') +
        ((d.links || []).length ? '<div data-slot="open">' + d.links.map(function (l) { return '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>'; }).join('') + '</div>' : '');
    }
    function paint() {
      var set = linkedSet(), narrow = getComputedStyle(svg).display === 'none';
      Object.keys(elL).forEach(function (id) {
        var on = sel && sel.side === 'left' && sel.id === id, lk = sel && sel.side === 'right' && set.has(id);
        if (elL[id].tagName === 'BUTTON') elL[id].setAttribute('aria-pressed', String(!!on)); elL[id].classList.toggle('is-on', !!on); elL[id].classList.toggle('is-linked', !!lk); elL[id].classList.toggle('is-dim', !!sel && !on && !lk);
      });
      Object.keys(elR).forEach(function (id) {
        var on = sel && sel.side === 'right' && sel.id === id, lk = sel && sel.side === 'left' && set.has(id);
        if (elR[id].tagName === 'BUTTON') elR[id].setAttribute('aria-pressed', String(!!on)); elR[id].classList.toggle('is-on', !!on); elR[id].classList.toggle('is-linked', !!lk); elR[id].classList.toggle('is-dim', !!sel && !on && !lk);
      });
      if (!sel) status.textContent = cfg.idle || (left.length + ' ' + (cfg.leftNoun || 'item') + 's, ' + right.length + ' ' + (cfg.rightNoun || 'item') + 's, ' + links.length + ' links.');
      else {
        var it = (sel.side === 'left' ? byL : byR)[sel.id];
        status.textContent = it.title + ' · ' + plural(set.size, sel.side === 'left' ? cfg.rightNoun || 'item' : cfg.leftNoun || 'item');
      }
      paintDetail(); wires();
    }
    function select(side, id) { sel = (sel && sel.side === side && sel.id === id) ? null : { side: side, id: id }; paint(); if (cfg.onSelect) cfg.onSelect(sel); }
    host.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { var s = sel.side === 'left' ? 'right' : 'left'; sel = { side: s, id: go.dataset.go }; paint(); if (cfg.onSelect) cfg.onSelect(sel); return; }
      var r = e.target.closest('[data-slot="row"]'), c = e.target.closest('[data-slot="card"]');
      if (cfg.hover && (r || c) && (r || c).tagName === 'A') return;
      if (r) select('left', r.dataset.id); else if (c) select('right', c.dataset.id);
    });
    if (cfg.hover) {
      var peek = function (e) {
        var t = e.target.closest('[data-slot="row"], [data-slot="card"]'); if (!t) return;
        var side = t.dataset.slot === 'row' ? 'left' : 'right';
        if (sel && sel.side === side && sel.id === t.dataset.id) return;
        sel = { side: side, id: t.dataset.id }; paint(); if (cfg.onSelect) cfg.onSelect(sel);
      };
      var leave = function () { if (sel) { sel = null; paint(); if (cfg.onSelect) cfg.onSelect(null); } };
      body.addEventListener('mouseover', peek); body.addEventListener('focusin', peek);
      body.addEventListener('mouseleave', function () { if (!body.contains(document.activeElement)) leave(); });
      body.addEventListener('focusout', function (e) { if (!body.contains(e.relatedTarget)) leave(); });
    }
    host.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) { sel = null; paint(); if (cfg.onSelect) cfg.onSelect(null); } });
    if (window.ResizeObserver) new ResizeObserver(wires).observe(body); else window.addEventListener('resize', wires);
    window.addEventListener('load', wires);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(wires);
    paint();
    return { select: function (side, id) { sel = { side: side, id: id }; paint(); }, clear: function () { sel = null; paint(); }, redraw: wires };
  }
  window.DSLinkedPicker = { mount: mount };
})();
