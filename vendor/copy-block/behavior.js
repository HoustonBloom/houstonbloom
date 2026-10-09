/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   design-system/components/copy-block/behavior.js
   version  0.0.0
   refresh  node sync.mjs copy-block "<this folder>"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   copy-block · behaviour · v1.0.0

   One document listener for every [data-copy] button on the page, including
   ones rendered after load. A click copies the textContent of the element whose
   id the button names, then shows the copied label for 1.4s. Labels come from
   data-copy-label and data-copied-label, else "Copy" and "Copied".

   Plain script, not a module, so a page that opens from disk can inline it.
   Loading it twice is harmless. Where the clipboard is refused (some file://
   pages), the button selects the text instead, so a keyboard copy still works.
   ============================================================================ */
(function () {
  if (window.__dsCopyBlock) return;
  window.__dsCopyBlock = true;

  function select(el) {
    try { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var src = document.getElementById(b.getAttribute('data-copy'));
    if (!src) return;
    var lab = b.querySelector('[data-slot="label"]') || b;
    var idle = b.getAttribute('data-copy-label') || 'Copy';
    var done = b.getAttribute('data-copied-label') || 'Copied';
    var shown = function () { lab.textContent = done; setTimeout(function () { lab.textContent = idle; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(src.textContent).then(shown, function () { select(src); });
    } else {
      select(src);
    }
  });
})();
