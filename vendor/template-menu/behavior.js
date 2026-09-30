/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   source   C:/Users/Megan/Documents/design-system/components/template-menu/behavior.js
   version  1.1.0
   refresh  node sync.mjs template-menu "C:/Users/Megan/Claude_Projects/AI Projects/Houston Bloom/Website"
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

/* ============================================================================
   template-menu · behaviour · v1.1.0

   The wiring component.css used to leave to the host: every .template-menu on
   the page opens on its trigger, and closes on a pick, a click anywhere else,
   or Escape (focus returns to the trigger). One document listener serves
   every instance, including menus rendered after load, so a host that
   re-renders its header needs no second call.

   Plain script, not a module, so a page that opens from disk can inline it.
   Loading it twice is harmless: the second load does nothing.
   ============================================================================ */
(function () {
  if (window.__dsTemplateMenu) return;
  window.__dsTemplateMenu = true;

  function parts(menu) {
    return { trigger: menu.querySelector('[data-slot="trigger"]'), list: menu.querySelector('[data-slot="list"]') };
  }
  function set(menu, on) {
    var p = parts(menu);
    if (!p.trigger || !p.list) return;
    p.trigger.setAttribute('aria-expanded', String(on));
    p.list.hidden = !on;
  }

  document.addEventListener('click', function (e) {
    var menus = document.querySelectorAll('.template-menu');
    Array.prototype.forEach.call(menus, function (menu) {
      var p = parts(menu);
      if (!p.trigger || !p.list) return;
      if (p.trigger.contains(e.target)) { set(menu, p.list.hidden); return; }
      if ((p.list.contains(e.target) && e.target.closest('a, button')) || !menu.contains(e.target)) set(menu, false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Array.prototype.forEach.call(document.querySelectorAll('.template-menu'), function (menu) {
      var p = parts(menu);
      if (!p.list || p.list.hidden) return;
      set(menu, false);
      p.trigger.focus();
    });
  });
})();
