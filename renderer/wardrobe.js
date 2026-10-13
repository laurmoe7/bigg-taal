// Wardrobe: what Bigg wears and what floats around him. Two separate choices:
//  - an outfit or hat: seasons are free, a holiday hat is earned by opening BiggTaal on that holiday, level hats by reaching a level
//    (give a look in LOOK_DEFS a `level` number to make it one);
//  - a background effect (BG_DEFS): the four seasonal ones are free, a few others too, and the cute confetti is unlocked on your birthday.
// Loads after levels.js and shares its scope.
// S.wardrobe = { owned: [look ids, and 'bg:<id>' for backgrounds], worn: 'auto' | 'none' | a look id, bg: 'auto' | 'none' | a background id, fresh: [...] }

const SEASON_LOOKS = ['winter', 'spring', 'summer', 'autumn'];
// background effects: id = a key of FALLS (looks.js). `season` makes it the automatic one for that season; `earn: 'birthday'` locks it until your birthday.
const BG_DEFS = {
  snow: { emoji: '❄️', name: 'Snowfall', season: 'winter' },
  petal: { emoji: '🌸', name: 'Blossom petals', season: 'spring' },
  sun: { emoji: '☀️', name: 'Sunshine sparkles', season: 'summer' },
  leaf: { emoji: '🍂', name: 'Autumn leaves', season: 'autumn' },
  stars: { emoji: '✨', name: 'Twinkle stars' },
  hearts: { emoji: '💗', name: 'Floating hearts' },
  bubbles: { emoji: '🫧', name: 'Bubbles' },
  confetti: { emoji: '🎉', name: 'Cute confetti', earn: 'birthday' },
};
const wd = () => { const x = S.wardrobe || (S.wardrobe = {}); if (!Array.isArray(x.owned)) x.owned = []; if (!Array.isArray(x.fresh)) x.fresh = []; if (!x.worn) x.worn = 'auto'; if (!x.bg) x.bg = 'auto'; return x; }; // always the same object
const lookIsHoliday = (id) => !!(LOOK_DEFS[id] && LOOK_DEFS[id].hat && !LOOK_DEFS[id].level && !SEASON_LOOKS.includes(id));
const lookIsLevel = (id) => !!(LOOK_DEFS[id] && LOOK_DEFS[id].level);
const lookOwned = (id) => SEASON_LOOKS.includes(id) || wd().owned.includes(id);
const bgOwned = (id) => !!BG_DEFS[id] && (!BG_DEFS[id].earn || wd().owned.includes('bg:' + id));
const lookName = (id) => (LOOK_DEFS[id] ? LOOK_DEFS[id].label.replace(/\s*\(.*\)\s*$/, '').replace(/^[^\p{L}\p{N}]+/u, '') : id);
const lookEmoji = (id) => (LOOK_DEFS[id] ? (LOOK_DEFS[id].label.match(/^\S+/) || [''])[0] : '');
const lookWhen = (id) => ((LOOK_DEFS[id] && LOOK_DEFS[id].label.match(/\(([^)]*)\)/)) || [])[1] || '';
const bgHow = (id) => (BG_DEFS[id].earn === 'birthday' ? 'Unlocked on ' + lookName('birthday') + (lookWhen('birthday') ? ' (' + lookWhen('birthday') + ')' : '') : 'Free');

function earn(id) { // id: a look id, or 'bg:<id>'. The celebration comes once everything new has been collected (flushEarned).
  const w = wd(); if (w.owned.includes(id)) return false;
  w.owned.push(id); w.fresh.push(id); save(); (ui.earnBatch = ui.earnBatch || []).push(id);
  ui.sideSig = ''; if (typeof renderSide === 'function') renderSide();
  return true;
}
const earnLook = (id) => !!LOOK_DEFS[id] && earn(id);
const earnBg = (id) => !!BG_DEFS[id] && earn('bg:' + id);
// called when the app opens, when you come back to it, and when you level up
function checkEarned() {
  if (!S || !S.settings) return;
  const h = L.holidayOf(new Date());
  if (h && lookIsHoliday(h)) earnLook(h);
  if (h === 'birthday') earnBg('confetti');
  const lv = levelNow().level;
  for (const id of Object.keys(LOOK_DEFS)) if (lookIsLevel(id) && lv >= LOOK_DEFS[id].level) earnLook(id);
  const batch = ui.earnBatch || []; ui.earnBatch = []; if (batch.length) celebrate(batch);
}
// the celebration: Bigg cheers in his new hat (or with his new background), with confetti. Several at once show as a row.
const celebName = (x) => (x.startsWith('bg:') ? BG_DEFS[x.slice(3)].emoji + ' ' + BG_DEFS[x.slice(3)].name : lookEmoji(x) + ' ' + lookName(x));
const celebWhy = (x) => (x.startsWith('bg:') ? 'Unlocked on ' + lookName('birthday') + '! 🎂' : lookIsLevel(x) ? 'Earned by reaching level ' + LOOK_DEFS[x].level + '!' : 'Earned by opening BiggTaal on ' + lookName(x) + '!');
function celebrate(ids) {
  document.querySelectorAll('.celeb').forEach((x) => x.remove());
  const one = ids.length === 1 ? ids[0] : '', isBg = one.startsWith('bg:');
  const box = document.createElement('div'); box.className = 'celeb';
  box.innerHTML = `<div class="celeb-card"><div class="celeb-sparks">${['✨', '🎉', '💗', '⭐', '🌸', '✨'].map((e, i) => `<span style="--a:${i * 60}deg;--d:${i * 0.12}s">${e}</span>`).join('')}</div>
    <div class="celeb-stage">${pigSvg('happy', 'celeb-pig act-cheer', { stage: 3, look: one && !isBg ? one : '', bg: isBg ? one.slice(3) : '' })}</div>
    <div class="celeb-big">${one ? (isBg ? 'New background!' : 'New hat!') : ids.length + ' new things!'}</div>
    ${one ? `<div class="celeb-name">${esc(celebName(one))}</div><p class="muted" style="margin:4px 0 14px">${esc(celebWhy(one))}</p>` : `<div class="celeb-row">${ids.slice(0, 14).map((x) => `<span title="${esc(celebName(x))}">${x.startsWith('bg:') ? esc(BG_DEFS[x.slice(3)].emoji) : pigSvg('happy', 'celeb-mini', { stage: 3, look: x, bg: '' })}</span>`).join('')}</div><p class="muted" style="margin:6px 0 14px">They are all in your wardrobe now.</p>`}
    <div class="row" style="justify-content:center">${one ? `<button class="primary" data-act="celeb-wear" data-v="${esc(one)}">Wear it</button>` : ''}<button class="${one ? 'ghost' : 'primary'}" data-act="celeb-go">Open wardrobe</button><button class="ghost" data-act="celeb-close">Close</button></div></div>`;
  document.body.appendChild(box); confetti(); chime('goal'); setTimeout(() => confetti(), 700);
  clearTimeout(celebrate.t); celebrate.t = setTimeout(() => { if (box.isConnected) box.remove(); }, 14000);
}
window.addEventListener('focus', () => { try { checkEarned(); } catch {} });

const eye = (act, id) => `<span class="wd-eye" data-act="${act}" data-v="${id}" title="Preview on Bigg">👁</span>`;
function wdTile(id, fresh, worn) {
  const own = lookOwned(id), on = worn === id, sub = on ? 'Wearing' : own ? 'Wear' : lookIsLevel(id) ? '🔒 Reach level ' + LOOK_DEFS[id].level : '🔒 ' + (lookWhen(id) || 'On the holiday');
  return `<button class="wd-tile ${on ? 'on' : ''} ${own ? '' : 'lock'}" data-act="wd-wear" data-v="${id}" title="${esc(own ? lookName(id) : 'Open BiggTaal on ' + lookName(id) + (lookWhen(id) ? ' (' + lookWhen(id) + ')' : '') + ' to earn this')}">
    ${fresh ? '<span class="wd-new">NEW</span>' : ''}${eye('wd-preview', id)}${pigSvg('happy', 'wd-pig', { stage: pigStage(), look: id, bg: '' })}<b>${esc(lookEmoji(id))} ${esc(lookName(id))}</b><small>${esc(sub)}</small></button>`;
}
function wdSpecial(act, v, emoji, name, sub, on, pig) {
  return `<button class="wd-tile ${on ? 'on' : ''}" data-act="${act}" data-v="${v}">${pig}<b>${emoji} ${name}</b><small>${on ? 'Using' : sub}</small></button>`;
}
function wdBgTile(id, fresh, cur) {
  const d = BG_DEFS[id], own = bgOwned(id), on = cur === id;
  return `<button class="wd-tile wd-bgtile ${on ? 'on' : ''} ${own ? '' : 'lock'}" data-act="wd-bg" data-v="${id}">
    ${fresh ? '<span class="wd-new">NEW</span>' : ''}${eye('wd-preview-bg', id)}<span class="wd-bgprev">${pigSvg('happy', 'wd-pig wd-showfall', { stage: pigStage(), look: '', bg: id })}</span><b>${d.emoji} ${esc(d.name)}</b><small>${esc(on ? 'Using' : own ? (d.season ? 'Use · ' + d.season : 'Use') : '🔒 ' + bgHow(id))}</small></button>`;
}
VIEWS.wardrobe = () => {
  const w = wd(), fresh = new Set(w.fresh.length ? w.fresh : ui.wdFresh || []);
  if (w.fresh.length) { ui.wdFresh = w.fresh.slice(); w.fresh = []; save(); ui.sideSig = ''; setTimeout(() => { if (typeof renderSide === 'function') renderSide(); }, 0); }
  const tab = ui.wdTab === 'bg' ? 'bg' : 'hats', now = currentLook(), nowBg = currentBg();
  const pv = ui.wdPreview && LOOK_DEFS[ui.wdPreview] ? ui.wdPreview : '', pvBg = ui.wdPreviewBg && BG_DEFS[ui.wdPreviewBg] ? ui.wdPreviewBg : '';
  const showLook = pv || now, showBg = pvBg || nowBg;
  const holiday = Object.keys(LOOK_DEFS).filter(lookIsHoliday), levels = Object.keys(LOOK_DEFS).filter(lookIsLevel).sort((a, b) => LOOK_DEFS[a].level - LOOK_DEFS[b].level);
  const got = holiday.filter(lookOwned).length + levels.filter(lookOwned).length, total = holiday.length + levels.length;
  const tiles = (ids) => ids.map((id) => wdTile(id, fresh.has(id), w.worn)).join('');
  const bgs = Object.keys(BG_DEFS), bgGot = bgs.filter(bgOwned).length;
  const lockNote = pv && !lookOwned(pv) ? (lookIsLevel(pv) ? 'Reach level ' + LOOK_DEFS[pv].level : 'Open BiggTaal on ' + lookName(pv) + (lookWhen(pv) ? ' (' + lookWhen(pv) + ')' : '')) + ' to earn this hat.' : pvBg && !bgOwned(pvBg) ? bgHow(pvBg) + ' to unlock this background.' : '';
  const previewing = pv || pvBg;
  const side = `<aside class="card wd-side">
    <div class="wd-stage">${pigSvg('happy', 'wd-big', { stage: pigStage(), look: showLook, bg: showBg })}</div>
    ${previewing ? '<span class="pill sky">👁 Previewing</span>' : ''}
    <div class="wd-info"><div><small>Hat or outfit</small><b>${showLook ? esc(lookEmoji(showLook) + ' ' + lookName(showLook)) : 'Nothing'}</b></div><div><small>Background</small><b>${showBg ? esc(BG_DEFS[showBg].emoji + ' ' + BG_DEFS[showBg].name) : 'None'}</b></div></div>
    <p class="muted wd-note">${previewing ? esc(lockNote || 'Just a preview. Press Wear to keep it.') : w.worn === 'auto' && w.bg === 'auto' ? 'Bigg is choosing from the season and the day.' : 'You chose this look.'}</p>
    <div class="row wd-actions">${previewing ? `${pv && lookOwned(pv) ? `<button class="primary" data-act="wd-wear" data-v="${pv}">Wear hat</button>` : ''}${pvBg && bgOwned(pvBg) ? `<button class="primary" data-act="wd-bg" data-v="${pvBg}">Use background</button>` : ''}<button class="ghost" data-act="wd-stop">Stop previewing</button>` : '<button class="ghost" data-act="wd-all" data-v="auto">✨ Let Bigg decide</button><button class="ghost" data-act="wd-all" data-v="none">Take everything off</button>'}</div></aside>`;
  const hatsTab = `<h2 class="wd-h">Everyday</h2><div class="wd-grid">${wdSpecial('wd-wear', 'auto', '✨', 'Automatic', 'Follows the season', w.worn === 'auto', pigSvg('happy', 'wd-pig', { stage: pigStage(), look: L.lookOf(), bg: '' }))}${wdSpecial('wd-wear', 'none', '🚫', 'Nothing', 'No hat or outfit', w.worn === 'none', pigSvg('happy', 'wd-pig', { stage: pigStage(), look: '', bg: '' }))}</div>
    <h2 class="wd-h">Seasons</h2><div class="wd-grid">${tiles(SEASON_LOOKS)}</div>
    <h2 class="wd-h">Holiday hats <small class="muted">open BiggTaal on the day to earn them</small></h2><div class="wd-grid">${tiles(holiday)}</div>
    <h2 class="wd-h">Level rewards <small class="muted">earned by reaching a level</small></h2><div class="wd-grid">${tiles(levels)}</div>`;
  const bgTab = `<h2 class="wd-h">Everyday</h2><div class="wd-grid">${wdSpecial('wd-bg', 'auto', '✨', 'Automatic', 'Follows the season', w.bg === 'auto', pigSvg('happy', 'wd-pig wd-showfall', { stage: pigStage(), look: '', bg: SEASON_BG[L.seasonOf()] || '' }))}${wdSpecial('wd-bg', 'none', '🚫', 'None', 'Nothing floating around', w.bg === 'none', pigSvg('happy', 'wd-pig', { stage: pigStage(), look: '', bg: '' }))}</div>
    <h2 class="wd-h">Seasons</h2><div class="wd-grid">${bgs.filter((id) => BG_DEFS[id].season).map((id) => wdBgTile(id, fresh.has('bg:' + id), w.bg)).join('')}</div>
    <h2 class="wd-h">Anytime</h2><div class="wd-grid">${bgs.filter((id) => !BG_DEFS[id].season).map((id) => wdBgTile(id, fresh.has('bg:' + id), w.bg)).join('')}</div>`;
  return `<div class="top"><div><h1>Wardrobe</h1><p class="sub">Pick a hat or outfit, and a background, separately. Hats come from holidays and levels.</p></div><span class="pill sky">${tab === 'hats' ? got + ' / ' + total + ' hats' : bgGot + ' / ' + bgs.length + ' backgrounds'}</span></div>
  <div class="wd-layout">${side}<div class="wd-main"><div class="seg wd-tabs" role="tablist"><button class="${tab === 'hats' ? 'on' : ''}" data-act="wd-tab" data-v="hats">🎩 Hats &amp; outfits</button><button class="${tab === 'bg' ? 'on' : ''}" data-act="wd-tab" data-v="bg">✨ Backgrounds</button></div>${tab === 'hats' ? hatsTab : bgTab}</div></div>`;
};
const wdChanged = () => { ui.sideSig = ''; ui.say = ''; render(); };
Object.assign(ACT, {
  'wd-tab': (el) => { ui.wdTab = el.dataset.v; render(); },
  'wd-preview': (el) => { ui.wdPreview = el.dataset.v || ''; render(); },
  'wd-preview-bg': (el) => { ui.wdPreviewBg = el.dataset.v || ''; render(); },
  'wd-stop': () => { ui.wdPreview = ''; ui.wdPreviewBg = ''; render(); },
  'wd-wear': (el) => {
    const id = el.dataset.v, w = wd();
    if (id !== 'auto' && id !== 'none' && !lookOwned(id)) return ACT['wd-preview'](el); // not earned yet: show it on Bigg instead
    ui.wdPreview = ''; w.worn = id; save(); wdChanged();
    if (id !== 'auto' && id !== 'none') toast('Bigg is wearing: ' + lookName(id));
  },
  'wd-bg': (el) => {
    const id = el.dataset.v, w = wd();
    if (id !== 'auto' && id !== 'none' && !bgOwned(id)) return ACT['wd-preview-bg'](el);
    ui.wdPreviewBg = ''; w.bg = id; save(); wdChanged();
    if (id !== 'auto' && id !== 'none') toast('Background: ' + BG_DEFS[id].name);
  },
  'celeb-close': () => document.querySelectorAll('.celeb').forEach((x) => x.remove()),
  'celeb-go': () => { document.querySelectorAll('.celeb').forEach((x) => x.remove()); ui.wdTab = 'hats'; go('wardrobe'); },
  'celeb-wear': (el) => {
    const id = el.dataset.v, w = wd(); document.querySelectorAll('.celeb').forEach((x) => x.remove());
    if (id.startsWith('bg:')) { w.bg = id.slice(3); ui.wdTab = 'bg'; } else { w.worn = id; ui.wdTab = 'hats'; }
    save(); ui.sideSig = ''; go('wardrobe');
  },
  'dev-celeb': () => { const v = readField('dev-hat'); if (v) celebrate([v]); },
  'dev-celeb-many': () => celebrate(['christmas', 'halloween', 'wizardhat', 'legend', 'bg:confetti']),
  'wd-all': (el) => { const w = wd(); ui.wdPreview = ''; ui.wdPreviewBg = ''; w.worn = w.bg = el.dataset.v; save(); wdChanged(); },
});

// leaving the wardrobe ends a preview
(() => { const baseGo = go; go = function (v) { if (v !== 'wardrobe') { ui.wdPreview = ''; ui.wdPreviewBg = ''; } return baseGo.apply(this, arguments); }; })();

// ---------- Settings > Developer tools: play the celebrations without earning anything ----------
document.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('dev-card')) ui.devOpen = e.target.open; }, true); // remember if it is open
function devCard() {
  const hats = Object.keys(LOOK_DEFS).filter((id) => lookIsHoliday(id) || lookIsLevel(id) || SEASON_LOOKS.includes(id));
  return `<details class="card dev-card" ${ui.devOpen ? 'open' : ''}><summary><h2 style="display:inline">🛠 Developer tools</h2> <small class="muted">preview things, nothing is saved</small></summary>
    <div class="dev-row"><label class="f" style="flex:1 1 260px">A hat or background celebration<select id="dev-hat">${hats.map((id) => `<option value="${id}">${esc(lookEmoji(id) + ' ' + lookName(id))}</option>`).join('')}${Object.keys(BG_DEFS).map((id) => `<option value="bg:${id}">${esc(BG_DEFS[id].emoji + ' ' + BG_DEFS[id].name)} (background)</option>`).join('')}</select></label>
      <button class="ghost" data-act="dev-celeb">🎉 Play it</button><button class="ghost" data-act="dev-celeb-many">🎁 Several at once</button></div>
    <div class="dev-row"><label class="f" style="flex:0 1 150px">Level-up for level<input type="number" id="dev-lv" min="2" max="99" value="${Math.min(99, levelNow().level + 1)}"></label><button class="ghost" data-act="dev-level">⭐ Level-up overlay</button><button class="ghost" data-act="dev-mix">🌈 Daily mix complete</button></div>
    <div class="dev-row"><button class="ghost" data-act="dev-recap" data-v="0">📅 Weekly recap: this week</button><button class="ghost" data-act="dev-recap" data-v="1">📅 Weekly recap: last week</button></div></details>`;
}
