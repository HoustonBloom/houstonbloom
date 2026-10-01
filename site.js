/* Houston Bloom site script, loaded on every page. The share button it carried was removed 2026-10-01 on
   Megan's word; the copy with it is _deprecated/20261001_site.js.with-share. */
/* Dated items: an element with data-ends="<ISO time>" is removed once that time has passed, so a finished
   event leaves the page on its own. The build warns while its markup is still in the file. */
(function () {
  function sweep() {
    var now = Date.now();
    document.querySelectorAll('[data-ends]').forEach(function (el) { var t = Date.parse(el.getAttribute('data-ends')); if (t && now > t) el.remove(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep); else sweep();
})();

/* Links as a modal (Megan's note, 2026-10-01). Any link to links.html opens the Links view in a dialog over the
   current page instead of leaving it. Inside the dialog the page loads with ?embed, which hides its own header and
   footer. Escape, the close button and a click on the backdrop all close it. A modified click (new tab) is left alone. */
(function () {
  var embed = /[?&]embed\b/.test(location.search);
  var css = document.createElement('style');
  css.textContent = embed
    ? 'header, .nav-bar, [data-component="nav-bar"], body > footer { display: none !important; } body { padding-top: 0 !important; }'
    : '.links-modal { width: min(760px, calc(100vw - 32px)); height: min(860px, calc(100vh - 48px)); padding: 0; border: 1px solid var(--ink, currentColor); border-radius: var(--radius-lg, 16px); background: var(--paper, Canvas); overflow: hidden; }' +
      '.links-modal::backdrop { background: color-mix(in oklch, var(--ink, black) 55%, transparent); }' +
      '.links-modal iframe { display: block; width: 100%; height: 100%; border: 0; }' +
      '.links-modal-close { position: absolute; top: 10px; right: 10px; z-index: 1; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--ink, currentColor); background: var(--paper, Canvas); color: var(--ink, CanvasText); font-size: 22px; line-height: 1; cursor: pointer; }' +
      '@media (max-width: 640px) { .links-modal { width: 100vw; height: 100dvh; max-width: none; max-height: none; border-radius: 0; border: 0; } }';
  document.head.appendChild(css);
  if (embed) return;
  var dlg = null;
  function open(href) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'links-modal';
      dlg.setAttribute('aria-label', 'Houston Bloom links');
      dlg.innerHTML = '<button type="button" class="links-modal-close" aria-label="Close the links">\u00d7</button><iframe title="Houston Bloom links"></iframe>';
      dlg.querySelector('.links-modal-close').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    var f = dlg.querySelector('iframe');
    var src = href + (href.indexOf('?') < 0 ? '?embed' : '&embed');
    if (f.getAttribute('src') !== src) f.setAttribute('src', src);
    dlg.showModal();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var h = a.getAttribute('href');
    if (!/^(\.\/)?links\.html(#.*)?$/.test(h) || /links\.html$/.test(location.pathname)) return;
    e.preventDefault();
    open(h.replace(/#.*$/, ''));
  });
})();
