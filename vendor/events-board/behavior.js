/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   design-system/components/events-board/behavior.js
   version  1.0.0
   refresh  node sync.mjs events-board "<this folder>"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* events-board 1.0.0 behaviour: See poster swaps a poster in front of its sticky. The arrows step one poster at a time, grey out at each end, and hide
   while every poster already fits. Without this script the track still scrolls by swipe or trackpad. */
(function () {
  if (window.DSEventsBoard) return;
  function wire(board) {
    var track = board.querySelector('.eb-track'), nav = board.querySelector('.eb-nav');
    if (!track || !nav) return;
    var btns = nav.querySelectorAll('button');
    function step() {
      var p = track.querySelector('.eb-pin');
      return p ? p.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : 280;
    }
    function sync() {
      var max = track.scrollWidth - track.clientWidth;
      nav.hidden = max < 4;
      btns[0].disabled = track.scrollLeft < 4;
      btns[1].disabled = track.scrollLeft > max - 4;
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var from = track.scrollLeft, d = step() * (i === 0 ? -1 : 1);
        var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
        track.scrollBy({ left: d, behavior: calm ? 'auto' : 'smooth' });
        /* some embedded views never start a smooth scroll; jump instead */
        setTimeout(function () {
          if (Math.abs(track.scrollLeft - from) < 2) track.scrollBy({ left: d, behavior: 'auto' });
          sync(); setTimeout(sync, 400);
        }, 450);
      });
    });
    track.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    addEventListener('load', sync);
    sync();
  }
  /* See poster: brings the poster in front of its sticky until the pointer leaves the pin, the poster is
     tapped again, or Escape is pressed. Hover does the same on a mouse; this is the touch and keyboard way. */
  function wirePosters(board) {
    board.querySelectorAll('.eb-pin').forEach(function (pin) {
      var btn = pin.querySelector('[data-eb-see-poster]');
      if (!btn) return;
      function show(on) {
        pin.classList.toggle('is-poster', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      btn.addEventListener('click', function (e) { e.preventDefault(); show(!pin.classList.contains('is-poster')); });
      pin.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') show(false); });
      pin.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pin.classList.contains('is-poster')) { show(false); btn.focus(); } });
      var poster = pin.querySelector('.eb-poster');
      if (poster && poster.tagName !== 'A') poster.addEventListener('click', function () { show(false); });
    });
  }
  /* DSEventsBoard.mount(scope) wires every board under scope once; a page that renders after load calls it
     again after each render. Plain pages are wired on DOMContentLoaded. */
  function mount(scope) {
    (scope || document).querySelectorAll('.events-board').forEach(function (b) {
      if (b.dataset.ebWired) return;
      b.dataset.ebWired = '1';
      wire(b); wirePosters(b);
    });
  }
  window.DSEventsBoard = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(); }); else mount();
})();
