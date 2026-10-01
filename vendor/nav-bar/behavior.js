/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/components/nav-bar/behavior.js
   version  1.2.0
   refresh  node sync.mjs nav-bar "C:/Users/Megan/Claude_Projects/AI Projects/Houston Bloom/Website"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   nav-bar · v1.2.0 · behavior

   Optional. component.css works without it and gives the 1.1.0 header.
   Reasons and sources: _context/mobile-nav.md.

   API
     DSNavBar.enhance(root?)   enhance every .nav-bar under root (default:
                               document). Safe to call again after a page
                               re-renders its header; a bar is enhanced once.

   What it adds to a bar that has a <nav> and a .header-actions:
     a menu button in the actions, aria-controls the nav, aria-expanded on
     its state. CSS shows it below 480px. Escape closes the menu and returns
     focus to the button; choosing a link or clicking outside closes it.

     data-nav-hidden on a scroll down past the header's own height, removed
     on a scroll up of more than 8px. Only while the bar is sticky and the
     viewport is 600px wide or less. Never while the bar holds focus or its
     menu is open. CSS does the movement.

   Runs on DOMContentLoaded for the bars already in the page.
   ============================================================================ */
(function () {
  var THRESHOLD = 8;
  var narrow = window.matchMedia('(max-width: 600px)');
  var count = 0;
  var last = window.scrollY;

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<g class="when-closed"><path d="M4 7h16M4 12h16M4 17h16"/></g>' +
    '<g class="when-open"><path d="M6 6l12 12M18 6L6 18"/></g></svg>';

  function setOpen(bar, open) {
    bar.toggleAttribute('data-nav-open', open);
    var b = bar.querySelector('.nav-toggle');
    if (b) b.setAttribute('aria-expanded', String(open));
    if (open) bar.removeAttribute('data-nav-hidden');
  }

  function enhanceOne(bar) {
    if (bar.hasAttribute('data-nav-menu')) return;
    var nav = bar.querySelector('nav');
    var actions = bar.querySelector('.header-actions');
    if (!nav || !actions) return;
    if (!nav.id) nav.id = 'nav-bar-links-' + (++count);

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-toggle';
    b.setAttribute('aria-label', 'Menu');
    b.setAttribute('aria-controls', nav.id);
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = ICON;
    actions.appendChild(b);
    bar.setAttribute('data-nav-menu', '');

    b.addEventListener('click', function () { setOpen(bar, !bar.hasAttribute('data-nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(bar, false); });
    bar.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar.hasAttribute('data-nav-open')) { setOpen(bar, false); b.focus(); }
    });
  }

  function enhance(root) {
    (root || document).querySelectorAll('.nav-bar').forEach(enhanceOne);
  }

  document.addEventListener('click', function (e) {
    document.querySelectorAll('.nav-bar[data-nav-open]').forEach(function (bar) {
      if (!bar.contains(e.target)) setOpen(bar, false);
    });
  });

  window.addEventListener('scroll', function () {
    var y = window.scrollY, d = y - last;
    if (Math.abs(d) < THRESHOLD) return;
    document.querySelectorAll('.nav-bar[data-nav-menu]').forEach(function (bar) {
      var held = bar.hasAttribute('data-nav-open') || bar.contains(document.activeElement);
      if (!narrow.matches || held || getComputedStyle(bar).position !== 'sticky') {
        bar.removeAttribute('data-nav-hidden');
        return;
      }
      bar.toggleAttribute('data-nav-hidden', d > 0 && y > bar.offsetHeight);
    });
    last = y;
  }, { passive: true });

  window.DSNavBar = { enhance: enhance };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
