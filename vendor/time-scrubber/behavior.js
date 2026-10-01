/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/components/time-scrubber/behavior.js
   version  2.0.0
   refresh  node sync.mjs time-scrubber "C:/Users/Megan/Documents/HoustonBloom"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   time-scrubber · behaviour · v2.0.0

   Two objects, one file, because they are one coupling:

   DSTimeState  the one position object every part of an activity-map reads.
                A day string, 'YYYY-MM-DD', or the named stop 'live'.
                  const time = DSTimeState.create({ days, live, value })
                  time.get()            -> { day, live, index }
                  time.set(dayOrLive, source)
                  time.subscribe(fn)    -> fn({ day, live, index }, source)

   DSTimeScrubber  the control that moves it.
                  DSTimeScrubber.mount(el, {
                    time,                 a DSTimeState
                    days,                 [{ day, count, cat, nodes }] one per active day, oldest first;
                                          cat is the 1-4 series of that day's largest category;
                                          nodes, optional, the ids that day touches
                    breakAfter: 45,       a gap longer than this many days draws a break
                    label: 'Timeline',    the slider's accessible name
                  })

   The scale is ACTIVE DAYS: every day with an entry takes one equal slot, and
   a gap longer than breakAfter adds one slot, drawn as a cut in the rail. On a
   linear track three years of sparse history squeeze the busy months into
   the last tenth of the bar, which the site audit of 2026-09-27 measured;
   this keeps every active day findable and still shows where time passed.
   Nothing is interpolated between days: a position is always a real day.

   Keys, per the APG slider pattern: Left/Right one active day, PageUp/Down
   ten, Home the first day, End the Live stop, [ and ] the same as Left and
   Right, Space play or pause. A click on the track jumps there (WCAG 2.5.7).
   Playback never starts on its own and is off under reduced motion.

   The centre of the transport has three faces, read off root[data-mode]:
     live     at the Live stop: play, which starts again from the first day
     past     scrubbed back, paused: Go live, which plays forward to Live
     playing  pause
   Any move by hand (drag, keys, the other four buttons) pauses. Megan,
   2026-10-01: scrubbing back pauses, Go live moves forward and then shows
   play. Under reduced motion Go live jumps straight to Live.

   Playback rate: one active day per step at the 1.0 rate, except that a day
   touching a node the day before did not stays twice as long. Megan,
   2026-10-01. Without days[].nodes every step is the base rate.

   Plain script, not a module, so a page that opens from disk can inline it.
   ============================================================================ */
(function () {
  if (window.DSTimeScrubber) return;

  var DAY = 86400000;
  var toMs = function (d) { return Date.parse(d + 'T12:00:00'); };
  var fmtDate = function (d) { return new Date(toMs(d)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;
  // Moment's thresholds: exact days up to 45, then months, then years past 11 months.
  function ago(day, now) {
    var n = Math.round((now - toMs(day)) / DAY);
    if (!rtf) return n + ' days ago';
    if (n < 46) return rtf.format(-n, 'day');
    var months = Math.round(n / 30.44);
    if (months < 11) return rtf.format(-months, 'month');
    return rtf.format(-Math.round(n / 365.25), 'year');
  }

  /* ---- DSTimeState --------------------------------------------------------- */
  var DSTimeState = {
    create: function (opts) {
      var days = opts.days.slice();
      var subs = [];
      var state = { day: days[days.length - 1], live: true, index: days.length - 1 };
      function set(v, source) {
        var next;
        if (v === 'live' || v == null) next = { day: days[days.length - 1], live: true, index: days.length - 1 };
        else {
          var i = days.indexOf(v);
          if (i < 0) { // not an active day: the last active day on or before it
            i = -1;
            for (var k = 0; k < days.length; k++) if (days[k] <= v) i = k;
            if (i < 0) i = 0;
          }
          next = { day: days[i], live: false, index: i };
        }
        if (next.day === state.day && next.live === state.live) return;
        state = next;
        subs.forEach(function (fn) { fn(state, source); });
      }
      if (opts.value) set(opts.value, 'init');
      return {
        days: days,
        get: function () { return state; },
        set: set,
        step: function (n, source) { var i = Math.max(0, Math.min(days.length - 1, state.index + n)); set(i === days.length - 1 && n > 0 ? 'live' : days[i], source); },
        subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }
      };
    }
  };

  /* ---- icons ---------------------------------------------------------------- */
  var I = {
    prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 3L5 8l8 5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l8 5-8 5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    first: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    last: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>'
  };

  /* ---- DSTimeScrubber -------------------------------------------------------- */
  function mount(root, opts) {
    var time = opts.time, days = opts.days, breakAfter = opts.breakAfter || 45;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var now = toMs(time.days[time.days.length - 1]);
    if (opts.now) now = toMs(opts.now);

    // Slot positions on the active-day scale, breaks included.
    var slots = [], breaks = [], u = 0;
    days.forEach(function (d, i) {
      if (i > 0) {
        var gap = (toMs(d.day) - toMs(days[i - 1].day)) / DAY;
        if (gap > breakAfter) { breaks.push({ at: u + 0.5, days: Math.round(gap) }); u += 1; }
      }
      slots.push(u); u += 1;
    });
    var span = Math.max(1, u - 1);
    var frac = function (i) { return slots[i] / span; };

    root.classList.add('time-scrubber');
    root.setAttribute('data-component', 'time-scrubber');
    root.innerHTML =
      '<div data-slot="bar">' +
        '<div data-slot="stage">' +
          '<div data-slot="track" role="slider" tabindex="0" aria-label="' + (opts.label || 'Timeline') + '" aria-valuemin="0" aria-valuemax="' + (days.length - 1) + '">' +
            '<div data-slot="hist" aria-hidden="true"></div><div data-slot="rail"></div><div data-slot="fill"></div>' +
            '<div data-slot="breaks" aria-hidden="true"></div><div data-slot="thumb"></div><div data-slot="flag" aria-hidden="true"></div><div data-slot="tip" hidden></div>' +
          '</div>' +
          '<div data-slot="ticks" aria-hidden="true"></div>' +
        '</div>' +
        '<div data-slot="transport">' +
          '<div data-slot="controls">' +
            '<button type="button" data-slot="first" aria-label="First active day">' + I.first + '</button>' +
            '<button type="button" data-slot="prev" aria-label="Previous active day">' + I.prev + '</button>' +
            '<button type="button" data-slot="play" aria-label="Play">' + I.play + '</button>' +
            '<button type="button" data-slot="live">Go live</button>' +
            '<button type="button" data-slot="next" aria-label="Next active day">' + I.next + '</button>' +
            '<button type="button" data-slot="last" aria-label="Latest active day">' + I.last + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p data-slot="readout" aria-live="polite" data-audit-ignore><span data-slot="date"></span><span data-slot="ago"></span><span data-slot="count"></span></p>';

    var q = function (s) { return root.querySelector('[data-slot="' + s + '"]'); };
    var track = q('track'), hist = q('hist'), ticks = q('ticks'), tip = q('tip');
    var maxCount = days.reduce(function (m, d) { return Math.max(m, d.count); }, 1);

    breaks.forEach(function (b) {
      var s = document.createElement('span');
      s.style.left = (b.at / span * 100) + '%';
      s.title = b.days + ' days with no entries';
      q('breaks').appendChild(s);
    });

    // Histogram and ticks depend on pixel width, so they redraw on resize.
    var width = 0;
    function layout() {
      width = track.getBoundingClientRect().width;
      if (!width) return;
      var narrow = width < 600;
      var minGap = narrow ? 10 : 6;
      hist.textContent = '';
      var bins = [];
      days.forEach(function (d, i) {
        var x = frac(i) * width, b = bins[bins.length - 1];
        if (b && x - b.x < minGap) { b.count += d.count; b.last = i; if (d.count > b.top) { b.top = d.count; b.cat = d.cat; } }
        else bins.push({ x: x, count: d.count, top: d.count, cat: d.cat, first: i, last: i });
      });
      var binMax = bins.reduce(function (m, b) { return Math.max(m, b.count); }, 1);
      bins.forEach(function (b) {
        var i = document.createElement('i');
        i.style.left = (b.x / width * 100) + '%';
        i.style.height = Math.max(6, Math.round(Math.sqrt(b.count / binMax) * 24)) + 'px';
        i.dataset.cat = b.cat || 1;
        i.dataset.last = b.last;
        hist.appendChild(i);
      });
      // Ticks: month labels where the month changes, the year where the year
      // changes, thinned so labels sit at least 80px (64 narrow) apart.
      ticks.textContent = '';
      var min = narrow ? 64 : 80, lastX = -Infinity, lastYear = null;
      days.forEach(function (d, i) {
        var y = d.day.slice(0, 4), m = d.day.slice(0, 7);
        var prevM = i ? days[i - 1].day.slice(0, 7) : null;
        if (m === prevM) return;
        var x = frac(i) * width;
        var isYear = y !== lastYear;
        if (x - lastX < min && !(isYear && x - lastX >= min * 0.6)) return;
        var s = document.createElement('span');
        s.style.left = (x / width * 100) + '%';
        if (isYear) { s.dataset.year = ''; s.textContent = y; }
        else s.textContent = new Date(toMs(d.day)).toLocaleDateString(undefined, { month: 'short' });
        ticks.appendChild(s);
        lastX = x; lastYear = y;
      });
      paint(time.get());
    }

    function countLabel(i) { var c = days[i].count; return c + (c === 1 ? ' entry' : ' entries'); }
    function paint(s) {
      track.style.setProperty('--pos', frac(s.index));
      q('date').textContent = fmtDate(s.day);
      var f = frac(s.index), fl = q('flag');
      fl.textContent = fmtDate(s.day);
      fl.setAttribute('data-edge', f > 0.94 ? 'end' : f < 0.06 ? 'start' : '');
      q('ago').textContent = s.live ? 'Live' : ago(s.day, now);
      q('count').textContent = countLabel(s.index);
      mode();
      track.setAttribute('aria-valuenow', s.index);
      track.setAttribute('aria-valuetext', fmtDate(s.day) + (s.live ? ', live' : ', ' + ago(s.day, now)) + ', ' + countLabel(s.index));
      Array.prototype.forEach.call(hist.children, function (b) { b.toggleAttribute('data-past', +b.dataset.last <= s.index); });
    }
    time.subscribe(paint);

    // Pointer: capture on down, read on move, paint once per frame.
    function indexAt(x) {
      var f = Math.max(0, Math.min(1, x / width)) * span, best = 0, bd = Infinity;
      for (var i = 0; i < slots.length; i++) { var d = Math.abs(slots[i] - f); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    var rect = null, pending = null, raf = 0;
    function go(i, source) { time.set(i === days.length - 1 ? 'live' : days[i].day, source); }
    function frame() { raf = 0; if (pending != null) { go(indexAt(pending - rect.left), 'drag'); pending = null; } }
    track.addEventListener('pointerdown', function (e) {
      stop();
      rect = track.getBoundingClientRect(); width = rect.width;
      track.setPointerCapture(e.pointerId);
      root.setAttribute('data-dragging', '');
      go(indexAt(e.clientX - rect.left), 'drag');
      track.focus({ preventScroll: true });
    });
    track.addEventListener('pointermove', function (e) {
      var r = rect || track.getBoundingClientRect();
      if (root.hasAttribute('data-dragging')) { pending = e.clientX; if (!raf) raf = requestAnimationFrame(frame); }
      if (e.pointerType === 'mouse') {
        var i = indexAt(e.clientX - r.left);
        tip.hidden = false;
        tip.style.left = (frac(i) * 100) + '%';
        tip.textContent = fmtDate(days[i].day) + ' · ' + countLabel(i);
      }
    });
    var up = function () { root.removeAttribute('data-dragging'); rect = null; };
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);
    track.addEventListener('pointerleave', function () { tip.hidden = true; });

    track.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown' || k === '[') time.step(-1, 'key');
      else if (k === 'ArrowRight' || k === 'ArrowUp' || k === ']') time.step(1, 'key');
      else if (k === 'PageDown') time.step(-10, 'key');
      else if (k === 'PageUp') time.step(10, 'key');
      else if (k === 'Home') time.set(days[0].day, 'key');
      else if (k === 'End') time.set('live', 'key');
      else if (k === ' ') toggle();
      else return;
      e.preventDefault();
    });

    // Playback: one active day per step, stopping at Live. A day that brings
    // in a node the day before did not stays twice as long.
    var timer = 0, base = Math.max(60, Math.min(400, 24000 / days.length));
    var seen = days.map(function (d) { return d.nodes ? d.nodes.reduce(function (m, n) { m[n] = 1; return m; }, {}) : null; });
    function isNew(i) {
      if (i < 1 || !seen[i] || !seen[i - 1]) return false;
      for (var n in seen[i]) if (!seen[i - 1][n]) return true;
      return false;
    }
    function mode() {
      var m = timer ? 'playing' : time.get().live ? 'live' : 'past';
      root.setAttribute('data-mode', m);
      q('play').innerHTML = m === 'playing' ? I.pause : I.play;
      q('play').setAttribute('aria-label', m === 'playing' ? 'Pause' : 'Play from the first day');
      q('play').hidden = m === 'past';
      q('live').hidden = m !== 'past';
    }
    function tick() {
      if (time.get().live) return stop();
      time.step(1, 'play');
      timer = setTimeout(tick, time.get().live ? 0 : base * (isNew(time.get().index) ? 2 : 1));
    }
    function stop() { if (!timer) return; clearTimeout(timer); timer = 0; mode(); }
    function start() {
      if (reduce) return;
      if (time.get().live) time.set(days[0].day, 'play');
      timer = setTimeout(tick, base * (isNew(time.get().index) ? 2 : 1));
      mode();
    }
    function toggle() { if (timer) stop(); else start(); }
    function goLive() {
      var wasFocused = document.activeElement === q('live');
      if (reduce) time.set('live', 'button'); else start();
      if (wasFocused) q('play').focus({ preventScroll: true });
    }
    if (reduce) { q('play').disabled = true; q('play').title = 'Playback is off while reduced motion is on'; }
    q('play').addEventListener('click', toggle);
    q('prev').addEventListener('click', function () { stop(); time.step(-1, 'button'); });
    q('next').addEventListener('click', function () { stop(); time.step(1, 'button'); });
    q('first').addEventListener('click', function () { stop(); time.set(days[0].day, 'button'); });
    q('last').addEventListener('click', function () { stop(); time.set('live', 'button'); });
    q('live').addEventListener('click', goLive);

    if (window.ResizeObserver) new ResizeObserver(layout).observe(track); else window.addEventListener('resize', layout);
    layout();
    mode();
    return { layout: layout, stop: stop };
  }

  window.DSTimeState = DSTimeState;
  window.DSTimeScrubber = { mount: mount, ago: ago, fmtDate: fmtDate };
})();
