/* --------------------------------------------------------------------------
   VENDORED COPY. Do not edit here.
   version  2.0.0
   warning  An edit made in this copy is lost on the next sync.
   -------------------------------------------------------------------------- */

// Link Library v2.0.0 (design-system/components/link-library): a group of links with filter chips and a search box, so a
// long reference list stays usable instead of becoming a wall.
//
// Shared across repos. It ships markup, scoped styles and behaviour together,
// and a host builder inlines all three, because every page in this workspace has
// to open by double-clicking with no external requests, which is why this is not
// a script tag pointing somewhere.
//
// THE CHIPS ARE NOT INVENTED. v1.0 had chips authored from scratch and they were
// wrong. This version follows an existing, working gallery filter bar:
//
//   .chip            7px 14px, 100px radius, --mono at 0.7rem, letter-spacing
//                    0.04em, NO uppercase, --paper-white ground, 1.5px --rule
//                    border, transition all 150ms ease
//   :hover           border and text go to --ink, not to the accent
//   .chip.active     --ink ground, --cream text, driven by a CLASS. The ACCENT
//                    fill is reserved for preset chips, so a plain filter never
//                    wears it
//   .chip-count      0.66rem, --ink-softer, and --cream at 0.75 when active
//   .clear-action    dashed border, hover to the accent
//   .active-filters  a wash panel with a dashed accent border, an uppercase mono
//                    label, and one removable chip per active filter
//
// THE TOKEN CONTRACT, which is what makes it shared rather than copied:
//
//   Every visual property is named --llib-* and defaults through the host page's
//   own token, then to a literal. So the same component reads green in
//   one consumer and terracotta in another without either builder passing a
//   palette in.
//
//   One translation is deliberate: the source gallery uses rust as its accent, and in
//   one consumer rust means blocker and nothing else. So this maps the gallery's
//   rust role onto the host accent rather than onto rust.
//
// It degrades. With JavaScript off, every link is visible and the controls are
// hidden, because a reference list that needs a script to show you a link is
// worse than a wall of links.
//
//   import { html, css, js, VERSION } from '.../link-library.mjs'
//   page = HEAD + css + html(groups) + js
//
// groups: [{ group: 'In this repo', items: [{ label, href, detail? }] }]
//
// v1.2 (2026-09-26) adds an opt-in directory layout, for a page where the list
// IS the page (a link-in-bio view), not a reference block inside a longer page:
//
//   html(groups, { layout: 'directory', featured: { label, href, detail, image } })
//   items may also carry: thumb (image src), icon (trusted inline SVG markup),
//   mark (1 to 2 letters, drawn when there is neither), external (true: the
//   arrow is the out-of-site glyph and the link opens a new tab).
//
// Directory rows are one link each: picture, label, one detail line, arrow.
// Search goes full width above the chips, "/" focuses it from anywhere on the
// page, arrow keys move through the visible rows and Enter opens the marked
// one. Without layout: 'directory' the markup and behaviour are v1.1's, so an
// existing consumer changes nothing by upgrading.

export const VERSION = '2.0.0'

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ---- styles ----------------------------------------------------------------
// Scoped under .llib. 2.0.0 (2026-09-29): every value reads a token. The
// defaults read the design system's layer 2 names first, then the older host
// names a page off the system may define (--ink, --rule and the rest), and no
// literal sits behind either. Sizes read --space-*, --text-*, --radius-* and
// --dur-*, so the list follows the style like any other component.
export const css = `
.llib{--llib-ink:var(--color-text,var(--ink));
  --llib-ink-soft:var(--color-text-muted,var(--ink-soft));
  --llib-ink-softer:var(--color-text-muted,var(--ink-softer));
  --llib-ink-faint:var(--color-text-faint,var(--ink-faint));
  --llib-accent:var(--color-accent-text,var(--color-accent-deep,var(--accent-deep)));
  --llib-on-accent:var(--color-text-inverse,var(--cream));
  --llib-wash:var(--color-accent-soft,var(--accent-soft));
  --llib-paper:var(--color-surface,var(--paper-white));
  --llib-card:var(--color-surface-alt,var(--bg-card));
  --llib-cream:var(--color-text-inverse,var(--cream));
  --llib-rule:var(--color-border-strong,var(--rule));
  --llib-rule-soft:var(--color-border,var(--rule-soft));
  --llib-mono:var(--font-mono,var(--mono));
  --llib-display:var(--font-display);
  --llib-feat-ground:var(--field-bg,var(--color-text,var(--ink)));
  --llib-feat-ink:var(--field-ink,var(--color-text-inverse,var(--cream)));
  --llib-bw:var(--border-width,1px);
  --llib-fast:var(--dur-fast,0s);
  --llib-slow:var(--dur-slow,0s);
  --llib-ease:var(--ease,ease)}

.llib-controls{display:none;flex-wrap:wrap;align-items:center;gap:var(--space-sm) var(--space-base);margin-bottom:var(--space-base)}
.llib.is-live .llib-controls{display:flex}
.llib-chips{display:flex;flex-wrap:wrap;gap:var(--space-xs)}

/* The gallery chip, followed rather than reinterpreted. */
.llib-chip{padding:var(--space-xs) var(--space-base);border:var(--llib-bw) solid var(--llib-rule);border-radius:var(--radius-full);
  background:var(--llib-paper);font-family:var(--llib-mono);font-size:var(--text-caption);
  letter-spacing:0.04em;color:var(--llib-ink-soft);cursor:pointer;
  transition:border-color var(--llib-fast) var(--llib-ease),color var(--llib-fast) var(--llib-ease),background var(--llib-fast) var(--llib-ease);
  white-space:nowrap;display:inline-flex;align-items:center;gap:var(--space-xs);line-height:1.2}
.llib-chip:hover{border-color:var(--llib-ink);color:var(--llib-ink)}
.llib-chip:focus-visible{outline:2px solid var(--llib-accent);outline-offset:2px}
/* Selected state is a class. aria-pressed rides alongside it for screen
   readers rather than doing the painting. */
.llib-chip.active{background:var(--llib-ink);color:var(--llib-cream);border-color:var(--llib-ink)}
.llib-count-n{font-size:var(--text-caption);color:var(--llib-ink-softer);margin-left:2px}
.llib-chip.active .llib-count-n{color:var(--llib-cream);opacity:0.75}
.llib-chip--clear{color:var(--llib-ink-softer);border-style:dashed}
.llib-chip--clear:hover{color:var(--llib-accent);border-color:var(--llib-accent)}
.llib-chip--clear[hidden]{display:none}

.llib-search{position:relative;display:inline-flex;align-items:center;flex:1 1 190px;max-width:270px}
.llib-search input{width:100%;font-family:var(--llib-mono);font-size:var(--text-caption);
  letter-spacing:0.04em;color:var(--llib-ink);background:var(--llib-paper);
  border:var(--llib-bw) solid var(--llib-rule);border-radius:var(--radius-full);padding:var(--space-xs) var(--space-base);
  transition:border-color var(--llib-fast) var(--llib-ease)}
.llib-search input:hover{border-color:var(--llib-ink)}
.llib-search input:focus-visible{outline:2px solid var(--llib-accent);outline-offset:1px;border-color:var(--llib-accent)}
.llib-search input::placeholder{color:var(--llib-ink-softer)}
.llib-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* The active-filters panel names what is being filtered, each filter
   removable. Without it a narrowed list looks like a short list. */
.llib-af{display:flex;flex-wrap:wrap;gap:var(--space-xs);align-items:center;padding:var(--space-sm) var(--space-base);
  background:var(--llib-wash);border:var(--llib-bw) dashed var(--llib-accent);
  border-radius:var(--radius-lg);margin-bottom:var(--space-base)}
.llib-af[hidden]{display:none}
.llib-af-label{font-family:var(--llib-mono);font-size:var(--text-eyebrow);letter-spacing:0.12em;
  text-transform:uppercase;color:var(--llib-accent);margin-right:var(--space-xs);font-weight:600}
.llib-af-chip{display:inline-flex;align-items:center;gap:var(--space-xs);
  padding:var(--space-xs) var(--space-xs) var(--space-xs) var(--space-sm);background:var(--llib-paper);
  border:var(--llib-bw) solid var(--llib-accent);border-radius:var(--radius-full);
  font-family:var(--llib-mono);font-size:var(--text-caption);color:var(--llib-accent)}
.llib-af-x{width:18px;height:18px;border:0;background:var(--llib-accent);color:var(--llib-on-accent);
  border-radius:var(--radius-full);font-size:var(--text-eyebrow);line-height:1;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;padding:0}
.llib-af-x:hover{opacity:0.82}
.llib-af-x:focus-visible{outline:2px solid var(--llib-ink);outline-offset:2px}

/* ink-soft, not ink-softer: ink-softer measured 4.35:1 against a 4.5 floor on
   a cream card, 2026-08-31. */
.llib-count{font-family:var(--llib-mono);font-size:var(--text-caption);color:var(--llib-ink-soft);margin-bottom:var(--space-base)}
.llib:not(.is-live) .llib-count{display:none}

.llib-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-sm) var(--space-xl)}
.llib-group[hidden]{display:none}
.llib-group h3{font-family:var(--llib-mono);font-size:var(--text-eyebrow);letter-spacing:0.16em;
  text-transform:uppercase;font-weight:600;color:var(--llib-ink-soft);
  padding-bottom:var(--space-xs);margin:0 0 var(--space-xs);border-bottom:var(--llib-bw) solid var(--llib-rule-soft)}
.llib-group ul{list-style:none;margin:0;padding:0}
.llib-item{padding:var(--space-xs) 0}
.llib-item[hidden]{display:none}
.llib-item a{font-size:var(--text-body-sm);color:var(--llib-ink);text-decoration:none}
.llib-item a:hover{color:var(--llib-accent);text-decoration:underline;text-underline-offset:3px}
.llib-item a:focus-visible{outline:2px solid var(--llib-accent);outline-offset:2px;border-radius:var(--radius-sm)}
.llib-detail{display:block;font-size:var(--text-caption);color:var(--llib-ink-soft);margin-top:1px}
.llib-empty{font-size:var(--text-body-sm);color:var(--llib-ink-soft);background:var(--llib-card);
  border:var(--llib-bw) dashed var(--llib-rule);border-radius:var(--radius-lg);padding:var(--space-base)}
.llib-empty[hidden]{display:none}

/* ---- directory layout: opt-in with html(groups, { layout: 'directory' }) */
.llib--dir .llib-controls{flex-direction:column;align-items:stretch;gap:var(--space-md)}
.llib--dir .llib-search{max-width:none;flex-basis:auto}
.llib--dir .llib-search input{font-family:inherit;font-size:var(--text-body);letter-spacing:0;
  padding:var(--space-md) calc(var(--space-2xl) - var(--space-xs)) var(--space-md) var(--space-base)}
.llib-kbd{position:absolute;right:var(--space-md);font-family:var(--llib-mono);font-size:var(--text-eyebrow);
  line-height:1;padding:3px 6px;border:var(--llib-bw) solid var(--llib-rule);border-radius:var(--radius-sm);
  color:var(--llib-ink-soft);pointer-events:none}
.llib--dir .llib-chips{gap:var(--space-sm)}
/* In the directory the chips are navigation, not metadata, so they take the
   body face, and the selected one takes the accent with its own ink. */
.llib--dir .llib-chip{font-family:inherit;font-size:var(--text-body-sm);letter-spacing:0;padding:var(--space-sm) var(--space-base);
  min-height:40px;color:var(--llib-ink-soft)}
.llib--dir .llib-chip:hover{border-color:var(--llib-accent);color:var(--llib-ink)}
.llib--dir .llib-chip.active{background:var(--llib-accent);border-color:var(--llib-accent);
  color:var(--llib-on-accent);font-weight:600}
.llib--dir .llib-chip.active .llib-count-n{color:inherit;opacity:0.8}
.llib--dir .llib-count-n{font-family:var(--llib-mono);font-size:var(--text-caption)}
/* All and Escape already clear, so the Clear button stays in the markup and
   is hidden here. */
.llib--dir .llib-chip--clear{display:none}
.llib--dir .llib-af,.llib--dir .llib-count{display:none}
.llib--dir .llib-groups{grid-template-columns:1fr;gap:var(--space-lg)}
.llib--dir .llib-group h3{border-bottom:0;margin-bottom:var(--space-xs);padding:0 var(--space-sm)}
.llib--dir .llib-item{padding:0}
.llib-row{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:var(--space-md);
  align-items:center;min-height:64px;padding:var(--space-sm);border-radius:var(--radius-lg);
  color:var(--llib-ink);text-decoration:none;transition:background-color var(--llib-fast) var(--llib-ease)}
.llib--dir .llib-item a.llib-row{font-size:inherit;color:var(--llib-ink);text-decoration:none}
.llib-row:hover,.llib-row.is-active{background:var(--llib-card)}
.llib-thumb{width:48px;height:48px;border-radius:var(--radius-md);overflow:hidden;display:grid;
  place-items:center;background:var(--llib-paper);border:var(--llib-bw) solid var(--llib-rule);
  color:var(--llib-accent);font-family:var(--llib-display);font-size:var(--text-body-lg)}
.llib-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.llib-thumb svg{width:55%;height:55%}
.llib-t{display:grid;min-width:0;gap:2px}
.llib-t b{font-size:var(--text-body);font-weight:600;line-height:1.3}
.llib-t small{font-size:var(--text-caption);color:var(--llib-ink-soft);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.llib-arrow{color:var(--llib-ink-soft);transition:transform var(--llib-fast) var(--llib-ease)}
.llib-row:hover .llib-arrow,.llib-row.is-active .llib-arrow{color:var(--llib-ink);transform:translate(2px,-2px)}
.llib-feat{position:relative;display:grid;min-height:168px;margin-bottom:var(--space-base);
  border-radius:var(--radius-xl);overflow:hidden;text-decoration:none;background:var(--llib-feat-ground)}
.llib-feat img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  transition:transform var(--llib-slow) var(--llib-ease)}
.llib-feat:hover img{transform:scale(1.03)}
.llib-feat::after{content:"";position:absolute;inset:0;
  background:linear-gradient(to top,color-mix(in oklch,var(--llib-feat-ground) 85%,transparent),transparent 75%)}
.llib-feat-t{position:relative;z-index:1;align-self:end;display:grid;gap:2px;padding:var(--space-base) var(--space-lg);
  color:var(--llib-feat-ink)}
.llib-feat-t small{font-size:var(--text-caption);opacity:0.85}
.llib-feat-t b{font-size:var(--text-body-lg);font-weight:600}
.llib-feat:focus-visible,.llib-row:focus-visible{outline:2px solid var(--llib-accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.llib-row,.llib-arrow,.llib-feat img,.llib-chip,.llib-search input{transition:none}}

@media (max-width:640px){
  .llib-groups{grid-template-columns:1fr}
  .llib-search{max-width:none;flex-basis:100%}
}`

// ---- behaviour -------------------------------------------------------------
// Adds .is-live, which is what reveals the controls. No JS, no controls, every
// link visible. Group and text filters combine, and both are removable from the
// active-filters bar.
export const js = `
(function(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-llib]'), function(root){
    var chips  = root.querySelectorAll('[data-llib-filter]');
    var search = root.querySelector('[data-llib-search]');
    var countEl= root.querySelector('[data-llib-count]');
    var emptyEl= root.querySelector('[data-llib-empty]');
    var afEl   = root.querySelector('[data-llib-af]');
    var afList = root.querySelector('[data-llib-af-list]');
    var clearEl= root.querySelector('[data-llib-clear]');
    var groups = root.querySelectorAll('[data-llib-group]');
    var items  = root.querySelectorAll('[data-llib-item]');
    var active = '*';

    function labelOf(id){
      for (var i = 0; i < chips.length; i++) {
        if (chips[i].getAttribute('data-llib-filter') === id) {
          return chips[i].getAttribute('data-llib-label') || id;
        }
      }
      return id;
    }
    function setGroup(id){
      active = id;
      Array.prototype.forEach.call(chips, function(c){
        var on = c.getAttribute('data-llib-filter') === id;
        c.setAttribute('aria-pressed', String(on));   // for a screen reader
        c.classList.toggle('active', on);              // for the eye, per the gallery
      });
      apply();
    }
    function chipEl(text, onRemove){
      var s = document.createElement('span');
      s.className = 'llib-af-chip';
      s.appendChild(document.createTextNode(text));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'llib-af-x';
      b.setAttribute('aria-label', 'Remove filter: ' + text);
      b.appendChild(document.createTextNode('\\u00d7'));
      b.addEventListener('click', onRemove);
      s.appendChild(b);
      return s;
    }

    function apply(){
      var q = (search && search.value || '').trim().toLowerCase();
      var shown = 0;
      Array.prototype.forEach.call(groups, function(g){
        var gid = g.getAttribute('data-llib-group');
        var inGroup = 0;
        Array.prototype.forEach.call(g.querySelectorAll('[data-llib-item]'), function(li){
          var on = (active === '*' || active === gid)
                && (!q || (li.getAttribute('data-llib-text') || '').indexOf(q) !== -1);
          li.hidden = !on;
          if (on) { inGroup++; shown++; }
        });
        g.hidden = inGroup === 0;
      });

      if (countEl) {
        countEl.textContent = shown === items.length
          ? 'Showing all ' + items.length
          : 'Showing ' + shown + ' of ' + items.length;
      }
      if (emptyEl) emptyEl.hidden = shown !== 0;

      var filtering = (active !== '*') || !!q;
      if (clearEl) clearEl.hidden = !filtering;
      if (afEl && afList) {
        afList.innerHTML = '';
        if (active !== '*') afList.appendChild(chipEl(labelOf(active), function(){ setGroup('*'); }));
        if (q) afList.appendChild(chipEl('"' + q + '"', function(){ search.value = ''; apply(); }));
        afEl.hidden = !filtering;
      }
    }

    var dir = root.classList.contains('llib--dir');
    var at = -1;
    function rows(){
      return Array.prototype.filter.call(root.querySelectorAll('.llib-row'), function(r){
        return !r.closest('[hidden]');
      });
    }
    function mark(i){
      var rs = rows();
      rs.forEach(function(r){ r.classList.remove('is-active'); });
      at = (i < 0 || !rs.length) ? -1 : Math.min(i, rs.length - 1);
      if (at >= 0) rs[at].classList.add('is-active');
    }
    Array.prototype.forEach.call(chips, function(c){
      c.addEventListener('click', function(){ setGroup(c.getAttribute('data-llib-filter')); if (dir) mark(-1); });
    });
    if (search) {
      search.addEventListener('input', function(){ apply(); if (dir) mark(search.value.trim() ? 0 : -1); });
      search.addEventListener('keydown', function(e){
        if (e.key === 'Escape') { search.value = ''; apply(); if (dir) mark(-1); }
        if (!dir) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); mark(at + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mark(at - 1); }
        else if (e.key === 'Enter' && at >= 0) { e.preventDefault(); rows()[at].click(); }
      });
    }
    if (dir && search) {
      document.addEventListener('keydown', function(e){
        if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
        var a = document.activeElement;
        if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
        if (!root.offsetParent) return;
        e.preventDefault(); search.focus();
      });
    }
    if (clearEl) {
      clearEl.addEventListener('click', function(){
        if (search) search.value = '';
        setGroup('*');
      });
    }
    root.classList.add('is-live');
    apply();
  });
})();`

// ---- markup ----------------------------------------------------------------
export function html (groups, opts = {}) {
  const list = (groups || []).filter(g => g && g.items && g.items.length)
  const total = list.reduce((n, g) => n + g.items.length, 0)
  const allLabel = opts.allLabel || 'All'
  const placeholder = opts.searchPlaceholder || 'Search'

  if (!total) return `<div class="llib"><p class="llib-empty">No links recorded.</p></div>`

  const chip = (id, label, n, pressed) =>
    `<button type="button" class="llib-chip${pressed === 'true' ? ' active' : ''}" data-llib-filter="${esc(id)}" data-llib-label="${esc(label)}" aria-pressed="${pressed}">${esc(label)} <span class="llib-count-n">${n}</span></button>`

  const chips = [
    chip('*', allLabel, total, 'true'),
    ...list.map((g, i) => chip('g' + i, g.group, g.items.length, 'false'))
  ].join('')

  const dir = opts.layout === 'directory'
  const ext = it => it.external ? ' target="_blank" rel="noopener"' : ''
  const thumb = it => it.thumb ? `<img src="${esc(it.thumb)}" alt="" loading="lazy">`
    : it.icon ? it.icon
    : `<span aria-hidden="true">${esc(it.mark || (it.label || '?').slice(0, 1))}</span>`
  const itemHtml = it => dir
    ? `<a class="llib-row" href="${esc(it.href)}"${ext(it)}><span class="llib-thumb">${thumb(it)}</span><span class="llib-t"><b>${esc(it.label)}</b>${it.detail ? `<small>${esc(it.detail)}</small>` : ''}</span><span class="llib-arrow" aria-hidden="true">${it.external ? '&#8599;' : '&#8594;'}</span></a>`
    : `<a href="${esc(it.href)}">${esc(it.label)}</a>
            ${it.detail ? `<span class="llib-detail">${esc(it.detail)}</span>` : ''}`

  const body = list.map((g, i) => `
      <section class="llib-group" data-llib-group="g${i}">
        <h3>${esc(g.group)}</h3>
        <ul>${g.items.map(it => `
          <li class="llib-item" data-llib-item data-llib-text="${esc(((it.label || '') + ' ' + (it.detail || '') + ' ' + g.group).toLowerCase())}">
            ${itemHtml(it)}
          </li>`).join('')}
        </ul>
      </section>`).join('')

  const f = dir && opts.featured
  const featured = f ? `
    <a class="llib-feat" href="${esc(f.href)}"${f.external === false ? '' : ' target="_blank" rel="noopener"'}>${f.image ? `<img src="${esc(f.image)}" alt="" loading="lazy">` : ''}<span class="llib-feat-t">${f.detail ? `<small>${esc(f.detail)}</small>` : ''}<b>${esc(f.label)} &#8599;</b></span></a>` : ''

  const searchBox = `<label class="llib-search">
        <span class="llib-sr" data-audit-ignore>Search links</span>
        <input type="search" data-llib-search placeholder="${esc(placeholder)}" autocomplete="off">${dir ? '<kbd class="llib-kbd" aria-hidden="true">/</kbd>' : ''}
      </label>`
  const chipBar = `<div class="llib-chips" role="group" aria-label="Filter links by group">${chips}</div>`
  const NL = `
      `

  return `<div class="llib${dir ? ' llib--dir' : ''}" data-llib>${featured}
    <div class="llib-controls">
      ${dir ? searchBox + NL + chipBar : chipBar + NL + searchBox}
      <button type="button" class="llib-chip llib-chip--clear" data-llib-clear hidden>Clear</button>
    </div>
    <div class="llib-af" data-llib-af hidden>
      <span class="llib-af-label">Filtering by</span>
      <span data-llib-af-list></span>
    </div>
    <p class="llib-count" data-llib-count>Showing all ${total}</p>
    <div class="llib-groups">${body}
    </div>
    <p class="llib-empty" data-llib-empty hidden>Nothing matches that. Clear the search or pick ${esc(allLabel)}.</p>
  </div>`
}
