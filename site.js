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
