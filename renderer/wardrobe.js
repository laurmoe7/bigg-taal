// Wardrobe: what Bigg wears. Seasons are free; a holiday hat is earned by opening BiggTaal on that holiday; level hats are earned by
// reaching a level (give a look in LOOK_DEFS a `level` number to make it one). Loads after levels.js and shares its scope.
// S.wardrobe = { owned: [look ids], worn: 'auto' | 'none' | a look id, fresh: [look ids not looked at yet] }

const SEASON_LOOKS = ['winter', 'spring', 'summer', 'autumn'];
const wd = () => { const x = S.wardrobe || (S.wardrobe = {}); if (!Array.isArray(x.owned)) x.owned = []; if (!Array.isArray(x.fresh)) x.fresh = []; if (!x.worn) x.worn = 'auto'; return x; }; // always the same object
const lookIsHoliday = (id) => !!(LOOK_DEFS[id] && LOOK_DEFS[id].hat && !LOOK_DEFS[id].level && !SEASON_LOOKS.includes(id));
const lookIsLevel = (id) => !!(LOOK_DEFS[id] && LOOK_DEFS[id].level);
const lookOwned = (id) => SEASON_LOOKS.includes(id) || wd().owned.includes(id);
const lookName = (id) => (LOOK_DEFS[id] ? LOOK_DEFS[id].label.replace(/\s*\(.*\)\s*$/, '').replace(/^[^\p{L}\p{N}]+/u, '') : id);
const lookEmoji = (id) => (LOOK_DEFS[id] ? (LOOK_DEFS[id].label.match(/^\S+/) || [''])[0] : '');
const lookWhen = (id) => ((LOOK_DEFS[id] && LOOK_DEFS[id].label.match(/\(([^)]*)\)/)) || [])[1] || '';

function earnLook(id) {
  const w = wd(); if (!LOOK_DEFS[id] || w.owned.includes(id)) return false;
  w.owned.push(id); w.fresh.push(id); save();
  ui.sideSig = ''; if (typeof renderSide === 'function') renderSide();
  chime('goal'); toast('👒 New in your wardrobe: ' + lookName(id) + '!');
  return true;
}
// called when the app opens, when you come back to it, and when you level up
function checkEarned() {
  if (!S || !S.settings) return;
  const h = L.holidayOf(new Date()); if (h && lookIsHoliday(h)) earnLook(h);
  const lv = levelNow().level;
  for (const id of Object.keys(LOOK_DEFS)) if (lookIsLevel(id) && lv >= LOOK_DEFS[id].level) earnLook(id);
}
window.addEventListener('focus', () => { try { checkEarned(); } catch {} });

function wdTile(id, ownedNow, worn, fresh) {
  const on = worn === id, sub = on ? 'Wearing' : ownedNow ? 'Wear' : lookIsLevel(id) ? '🔒 Reach level ' + LOOK_DEFS[id].level : '🔒 ' + (lookWhen(id) || 'On the holiday');
  return `<button class="wd-tile ${on ? 'on' : ''} ${ownedNow ? '' : 'lock'}" data-act="wd-wear" data-v="${id}" title="${esc(ownedNow ? lookName(id) : 'Open BiggTaal on ' + lookName(id) + (lookWhen(id) ? ' (' + lookWhen(id) + ')' : '') + ' to earn this')}">
    ${fresh ? '<span class="wd-new">NEW</span>' : ''}<span class="wd-eye" data-act="wd-preview" data-v="${id}" title="Preview on Bigg">👁</span>${pigSvg('happy', 'wd-pig', { stage: pigStage(), look: id })}<b>${esc(lookEmoji(id))} ${esc(lookName(id))}</b><small>${esc(sub)}</small></button>`;
}
VIEWS.wardrobe = () => {
  const w = wd(), fresh = new Set(w.fresh.length ? w.fresh : ui.wdFresh || []);
  if (w.fresh.length) { ui.wdFresh = w.fresh.slice(); w.fresh = []; save(); ui.sideSig = ''; setTimeout(() => { if (typeof renderSide === 'function') renderSide(); }, 0); }
  const worn = w.worn, now = currentLook(), pv = ui.wdPreview && LOOK_DEFS[ui.wdPreview] ? ui.wdPreview : '';
  const holiday = Object.keys(LOOK_DEFS).filter(lookIsHoliday), levels = Object.keys(LOOK_DEFS).filter(lookIsLevel).sort((a, b) => LOOK_DEFS[a].level - LOOK_DEFS[b].level);
  const got = holiday.filter(lookOwned).length + levels.filter(lookOwned).length, total = holiday.length + levels.length;
  const tiles = (ids) => ids.map((id) => wdTile(id, lookOwned(id), worn, fresh.has(id))).join('');
  const shown = pv || now;
  return `<div class="top"><div><h1>Wardrobe</h1><p class="sub">Dress Bigg up. Hats are earned on holidays and by reaching new levels.</p></div><span class="pill sky">${got} / ${total} hats</span></div>
  <div class="card wd-now">${pigSvg('happy', 'wd-big', { stage: pigStage(), look: shown })}
    <div><h2 style="margin:0 0 4px">${pv ? '👁 Previewing: ' : ''}${shown ? esc(lookEmoji(shown) + ' ' + lookName(shown)) : 'No clothes'}</h2>
      <p class="muted" style="margin:0 0 10px">${pv ? (lookOwned(pv) ? 'Just a preview. Press Wear to put it on.' : (lookIsLevel(pv) ? 'Reach level ' + LOOK_DEFS[pv].level : 'Open BiggTaal on ' + lookName(pv) + (lookWhen(pv) ? ' (' + lookWhen(pv) + ')' : '')) + ' to earn this one.') : worn === 'auto' ? 'Bigg picks his own outfit from the season and the day.' : worn === 'none' ? 'Bigg is wearing nothing special today.' : 'You chose this outfit.'}</p>
      <div class="row">${pv ? `${lookOwned(pv) ? `<button class="primary" data-act="wd-wear" data-v="${pv}">Wear it</button>` : ''}<button class="ghost" data-act="wd-preview" data-v="">Stop previewing</button>` : '<button class="ghost" data-act="wd-wear" data-v="auto">✨ Let Bigg decide</button><button class="ghost" data-act="wd-wear" data-v="none">Take everything off</button>'}</div></div></div></div>
  <h2 class="wd-h">Seasons</h2><div class="wd-grid">${tiles(SEASON_LOOKS)}</div>
  <h2 class="wd-h">Holiday hats <small class="muted">earned by opening BiggTaal on the day</small></h2><div class="wd-grid">${tiles(holiday)}</div>
  <h2 class="wd-h">Level rewards <small class="muted">earned by reaching a level</small></h2>
  ${levels.length ? `<div class="wd-grid">${tiles(levels)}</div>` : `<p class="muted" style="margin:0">Hats for reaching new levels are on their way. 🌱 You are level ${levelNow().level}.</p>`}`;
};
Object.assign(ACT, {
  'wd-preview': (el) => { ui.wdPreview = el.dataset.v || ''; render(); if (ui.wdPreview) $('#main').scrollTo({ top: 0, behavior: 'smooth' }); },
  'wd-wear': (el) => {
    const id = el.dataset.v, w = wd();
    if (id !== 'auto' && id !== 'none' && !lookOwned(id)) return ACT['wd-preview'](el); // not earned yet: show it on Bigg instead
    ui.wdPreview = ''; w.worn = id; save(); ui.sideSig = ''; ui.say = ''; render();
    if (id !== 'auto' && id !== 'none') toast('Bigg is wearing: ' + lookName(id));
  },
});

// leaving the wardrobe ends a preview
(() => { const baseGo = go; go = function (v) { if (v !== 'wardrobe') ui.wdPreview = ''; return baseGo.apply(this, arguments); }; })();
