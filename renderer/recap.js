// Weekly recap: Monday to Sunday at a glance, with Bigg's comment. A notice on Today offers it (on Sundays for the week so far, and on the
// other days for the week that just ended), and Progress has buttons for this week and last week. The numbers come from L.weekRecap (logic.js).
// Loads after levels.js and shares its scope.

const recapNow = (offset) => L.weekRecap(S.log, S.xp || 0, today(), offset);
const RECAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const recapDate = (ymd) => new Date(ymd + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const recapDelta = (a, b, pct) => (b > 0 && a != null ? `<small class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${pct ? Math.abs(Math.round((a - b) * 100)) + ' pts' : Math.abs(Math.round(((a - b) / b) * 100)) + '%'} vs last week</small>` : '');

// a made-up busy week, for the developer preview when the real week is still empty
function recapDemo(offset) {
  const start = recapNow(offset).start, log = {}, xp = [40, 0, 120, 85, 0, 210, 60];
  xp.forEach((x, i) => { if (x) log[L.addDays(start, i)] = { xp: x, reviews: 8 + i, cOk: 7, cMiss: 2, lOk: 4, lMiss: 1, sOk: 5, sMiss: 1, newWords: i % 3 ? 1 : 0 }; });
  log[L.addDays(start, -3)] = { xp: 200, reviews: 12, cOk: 9, cMiss: 3 };
  return L.weekRecap(log, 4200, today(), offset);
}
function recapHtml(r, demo) {
  const max = Math.max(60, ...r.days.map((x) => x.xp)), tile = (icon, big, label, extra) => `<div class="rc-tile"><i>${icon}</i><b>${big}</b><span>${label}</span>${extra || ''}</div>`;
  return `<div class="recap-card"><div class="recap-head">${pigSvg('happy', 'recap-pig act-cheer', { stage: 3 })}<div><h2>Your week${demo ? ' <small class="muted">(sample)</small>' : ''}</h2><div class="muted">${recapDate(r.start)} – ${recapDate(r.end)}</div></div></div>
    <div class="recap-line">${esc(L.recapLine(r))}</div>
    <div class="recap-bars">${r.days.map((x, i) => `<div class="rb ${r.best && r.best.d === x.d ? 'best' : ''}" title="${esc(RECAP_DAYS[i] + ': ' + x.xp + ' XP')}"><b>${x.xp ? x.xp : ''}</b><i style="height:${Math.max(x.xp ? 6 : 3, Math.round((x.xp / max) * 78))}px"></i><small>${RECAP_DAYS[i]}</small></div>`).join('')}</div>
    ${r.best ? `<p class="muted" style="margin:6px 0 12px;text-align:center">⭐ Best day: ${RECAP_DAYS[r.days.indexOf(r.best)]} with ${r.best.xp} XP</p>` : ''}
    <div class="rc-tiles">${tile('⭐', r.xp.toLocaleString(), 'XP earned', recapDelta(r.xp, r.prev.xp))}${tile('📆', r.active + ' / 7', 'days practised')}${tile('🃏', r.cards, 'cards')}${tile('🎧', r.listen, 'listening answers')}${tile('📝', r.sheet, 'worksheet answers')}${tile('🎯', r.acc == null ? '–' : Math.round(r.acc * 100) + '%', 'answered right', r.acc != null && r.prev.acc != null ? recapDelta(Math.round(r.acc * 100) / 100, Math.round(r.prev.acc * 100) / 100, true) : '')}${tile('🌱', r.added, 'new words')}${tile('🏅', r.levelTo > r.levelFrom ? r.levelFrom + ' → ' + r.levelTo : 'Level ' + r.levelTo, r.levelTo > r.levelFrom ? 'levels gained' : 'your level')}</div>
    <div class="row" style="justify-content:center;margin-top:16px"><button class="primary" data-act="recap-close">Done</button></div></div>`;
}
function showRecap(offset, demo) {
  document.querySelectorAll('.recap').forEach((x) => x.remove());
  let r = recapNow(offset), isDemo = false; if (!r.active && demo) { r = recapDemo(offset); isDemo = true; }
  const box = document.createElement('div'); box.className = 'recap'; box.innerHTML = recapHtml(r, isDemo); document.body.appendChild(box);
  box.addEventListener('mousedown', (e) => { if (e.target === box) box.remove(); });
  if (!isDemo) { S.recapSeen = recapNow(offset).start; save(); if (ui.view === 'home') render(); }
}
// the card on Today
function recapNotice() {
  const sunday = new Date().getDay() === 0, offset = sunday ? 0 : 1, r = recapNow(offset);
  if (!r.active || S.recapSeen === r.start) return '';
  return `<div class="card recap-note"><span class="rn-ic">📅</span><div class="grow"><b>Your weekly recap is ready</b><div class="muted">${sunday ? 'This week so far, ' : 'Last week, '}${recapDate(r.start)} – ${recapDate(r.end)}: ${r.xp.toLocaleString()} XP over ${r.active} day${r.active === 1 ? '' : 's'}.</div></div><button class="primary" data-act="recap-open" data-v="${offset}">See my week</button><button class="ghost" data-act="recap-skip" data-v="${r.start}">Not now</button></div>`;
}
Object.assign(ACT, {
  'recap-open': (el) => showRecap(+el.dataset.v || 0, false),
  'recap-close': () => document.querySelectorAll('.recap').forEach((x) => x.remove()),
  'recap-skip': (el) => { S.recapSeen = el.dataset.v; save(); render(); },
  'dev-recap': (el) => showRecap(+el.dataset.v || 0, true),
});
