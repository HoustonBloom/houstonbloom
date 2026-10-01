/* Houston Bloom site script, loaded on every page.
   The share button: fixed at the bottom right, it shares the page's address as it is now, so the template
   (Website, Links, Activity) and any view state in the hash (a map filter, a node) travel with it. A phone
   gets its share sheet; anywhere without one the link is copied and the button says so.
   visual-assets: reviewed (the share glyph is a functional control glyph, kept inline) */
(function () {
  if (document.querySelector('.hb-share')) return;
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'hb-share';
  b.setAttribute('aria-label', 'Share this page');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg><span class="hb-share-label">Share</span>';
  var note = document.createElement('p');
  note.className = 'hb-share-note';
  note.setAttribute('role', 'status');
  note.hidden = true;
  var timer = null;
  function say(text) {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function () { note.hidden = true; }, 2200);
  }
  b.addEventListener('click', function () {
    var url = location.href, title = document.title;
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(url); });
      return;
    }
    copy(url);
  });
  function copy(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { say('Link copied'); }, function () { window.prompt('Copy this link', url); });
    } else window.prompt('Copy this link', url);
  }
  function add() { document.body.appendChild(note); document.body.appendChild(b); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
