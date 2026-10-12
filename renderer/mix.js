// Daily mix: a few minutes of everything (cards, listening, a worksheet from your trouble words), with a bonus when all three are done.
// Replaces the old "Start here" card on Today. Loads after levels.js and shares its scope. Steps come from L.mixSteps (logic.js).

const MIX_BONUS = 40;
const mixNow = () => L.mixSteps(todayStats(), S.settings.dailyGoal, dueList().length);

function mixCard() {
  const steps = mixNow(), done = steps.filter((s) => s.done).length, all = done === steps.length, next = steps.find((s) => !s.done);
  const row = (s) => `<button class="mix-row ${s.done ? 'done' : ''}" data-act="mix-go" data-v="${s.id}"><span class="mix-ic">${s.icon}</span>
    <span class="mix-t"><b>${esc(s.title)}</b><small class="muted">${esc(s.text)}</small><span class="bar"><i style="width:${Math.min(100, (s.have / s.need) * 100)}%"></i></span></span>
    <span class="mix-n">${s.done ? '✓' : Math.min(s.have, s.need) + ' / ' + s.need}</span></button>`;
  return `<div class="card mix"><h2>🌈 Daily mix <span class="pill ${all ? 'mint' : 'sky'}">${done} / ${steps.length}</span></h2>
    <p class="muted" style="margin:0 0 10px">${all ? 'All done for today! Bigg is so proud of you. 🎉' : 'A little of everything. Finish all three for bonus XP.'}</p>
    <div class="mix-rows">${steps.map(row).join('')}</div>
    <div class="row" style="margin-top:12px">${all ? `<button class="ghost" data-act="mix-go" data-v="cards">🃏 Keep practising</button>` : `<button class="primary" data-act="mix-go">▶ ${next.id === 'cards' ? 'Start' : 'Next'}: ${esc(next.title)}</button>`}<span class="muted">+${MIX_BONUS} XP bonus when all three are done</span></div></div>`;
}

// the bonus, once per day, the moment the last part is finished
function checkMix() {
  if (!S || !S.settings || S.xp == null) return;
  const m = (S.mix = S.mix || {}), td = today();
  if (m.done === td || !mixNow().every((s) => s.done)) return;
  m.done = td; save(); gainXp(MIX_BONUS); chime('goal'); confetti();
  toast('Daily mix complete! +' + MIX_BONUS + ' XP 🌈');
  if (ui.view === 'home') setTimeout(render, 50);
}
(() => {
  const base = render;
  render = function () { base.apply(this, arguments); try { checkMix(); } catch {} };
})();

async function mixSheet() { // a short worksheet from words you find hard or learned lately
  ui.view = 'sheets'; ui.sheetId = ''; toast('Making your worksheet...');
  try { await Promise.all([loadData('dict'), loadData('sentences')]); } catch { return toast('Could not load the dictionary data.'); }
  const live = liveWords(), pool = [], have = new Set();
  const add = (w) => { const k = w.nl.toLowerCase(); if (!have.has(k)) { have.add(k); pool.push({ nl: w.nl.replace(/^(de|het|een)\s+/i, ''), en: w.en, article: w.article || '', pos: w.pos || 'other' }); } };
  L.troubleWords(live).slice(0, 20).forEach(add); L.recentWords(live, today(), 7).slice(0, 20).forEach(add);
  if (pool.length < 8) L.pick(live, 20).forEach(add);
  await makeQuickSheet(pool, quickPrefs().types, 8, 'Daily mix', false);
}
Object.assign(ACT, {
  'mix-go': (el) => {
    const id = el.dataset.v || (mixNow().find((s) => !s.done) || { id: 'cards' }).id;
    if (id === 'cards') return go('cards');
    if (id === 'listen') { go('listen'); return startReal(); }
    return mixSheet();
  },
});
