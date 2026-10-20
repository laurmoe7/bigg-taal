// Progress page, the mistakes log and the "Mistakes review" shortcut. Loads after app.js and shares its scope.

// ---------- remembering what you miss ----------
function noteMiss(nl, src) {
  if (!nl) return;
  S.missLog = S.missLog || [];
  S.missLog.push({ nl, d: today(), s: src });
  if (S.missLog.length > 400) S.missLog = S.missLog.slice(-400);
}
const bumpDay = (key) => L.bump(S.log, today(), key);
// once a day, remember how many words you know, for the growth chart
function snapshotToday() { S.snap = S.snap || {}; if (S.words && S.words.length) L.takeSnapshot(S.snap, S.words, today()); }

// ---------- Mistakes review (words you missed this week) ----------
const missedNow = () => L.missedWords(liveWords(), S.missLog, today(), 7);
function mistakesCard() {
  const m = missedNow(), n = m.length;
  return `<div class="card"><h2>🎯 Mistakes review</h2>
    ${n ? `<p class="muted" style="margin:0 0 10px"><b>${esc(m.slice(0, 4).map((w) => w.nl).join(', '))}${n > 4 ? ' +' + (n - 4) : ''}</b></p>
      <div class="row"><button class="primary" data-act="mr-cards">🃏 Flashcards</button><button class="ghost" data-act="mr-listen">🎧 Listening</button><button class="ghost" data-act="mr-sheet">📝 Worksheet</button></div>`
      : '<p class="muted" style="margin:0">No mistakes this week. 🌸</p>'}</div>`;
}
// Words that keep slipping (missed 4+ times and still weak): practise them, or give them a memory trick
function trickyCard() {
  const t = L.trickyWords(S.words); if (!t.length) return '';
  const noTrick = t.filter((w) => !w.trick).length;
  return `<div class="card"><h2>🧠 Tricky words</h2>
    <p class="muted" style="margin:0 0 10px">${t.slice(0, 5).map((w) => `<b>${esc(w.nl)}</b> <small>${L.missCount(w)}×</small>`).join(', ')}${t.length > 5 ? ' +' + (t.length - 5) : ''}${noTrick ? `<br>${noTrick} without a memory trick yet.` : ''}</p>
    <div class="row"><button class="primary" data-act="tr-cards">🃏 Practise them</button><button class="ghost" data-act="tr-words">💡 Add tricks</button></div></div>`;
}
Object.assign(ACT, {
  'tr-cards': () => { const t = L.trickyWords(S.words); if (!t.length) return; go('cards'); launchCards(t.slice(0, 15), 'Tricky words'); },
  'tr-words': () => { ui.words.tab = 'tricky'; go('words'); },
  'mr-cards': () => { const m = missedNow(); if (!m.length) return toast('No mistakes to review yet.'); go('cards'); launchCards(m.slice(0, 15), 'Mistakes review'); },
  'mr-listen': () => { const m = missedNow(); if (!m.length) return toast('No mistakes to review yet.'); go('listen'); ui.listenPool = m.slice(0, 15); startListen('word'); },
  'mr-sheet': async () => {
    const m = missedNow(); if (!m.length) return toast('No mistakes to review yet.');
    go('sheets'); ui.wsTab = 'practice';
    await makeQuickSheet(m.slice(0, 20).map((w) => ({ nl: w.nl.replace(/^(de|het|een)\s+/i, ''), en: w.en, article: w.article || '', pos: w.pos || 'other' })), L.LOCAL_TYPES.map((t) => t[0]), 12, 'Mistakes review');
  },
});

// ---------- Progress page ----------
const spark = (vals, w, h, color) => {
  const pts = vals.filter((v) => v != null); if (pts.length < 2) return '';
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1, n = vals.length;
  const xy = vals.map((v, i) => (v == null ? null : [Math.round((i / (n - 1)) * (w - 8) + 4), Math.round(h - 6 - ((v - lo) / span) * (h - 14))])).filter(Boolean);
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none"><polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${xy.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${color}"/>`).join('')}</svg>`;
};
const delta = (now, before, suffix) => {
  if (before == null || now == null) return '';
  const d = Math.round((now - before) * (suffix === '%' ? 100 : 1)); if (!d) return '<small class="muted">same as last week</small>';
  return `<small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '↗ +' : '↘ '}${d}${suffix || ''} vs last week</small>`;
};
VIEWS.progress = () => {
  snapshotToday();
  const td = today(), days = [];
  for (let i = 13; i >= 0; i--) { const d = L.addDays(td, -i); days.push({ d, n: ((S.log[d] || {}).reviews || 0) + ((S.log[d] || {}).listen || 0) + ((S.log[d] || {}).sheets || 0) * 5, acc: L.dayAccuracy(S.log[d]) }); }
  const maxN = Math.max(5, ...days.map((x) => x.n)), dn = (d) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(d + 'T12:00').getDay()];
  const cards = L.weekSum(S.log, td, ['reviews'], 0), cardsB = L.weekSum(S.log, td, ['reviews'], 1);
  const heard = L.weekSum(S.log, td, ['listen'], 0), heardB = L.weekSum(S.log, td, ['listen'], 1);
  const newW = L.weekSum(S.log, td, ['newWords'], 0), newWB = L.weekSum(S.log, td, ['newWords'], 1);
  const acc = L.weekAccuracy(S.log, td, 0), accB = L.weekAccuracy(S.log, td, 1), m = L.mastery(S.words);
  const snaps = []; for (let i = 29; i >= 0; i--) { const s = (S.snap || {})[L.addDays(td, -i)]; snaps.push(s ? s.learned : null); }
  const first = snaps.find((x) => x != null), last = snaps[snaps.length - 1];
  const weak = L.weakSkills(S.skills, 5), trouble = L.troubleWords(liveWords()).slice(0, 8);
  const sounds = Object.entries(S.sounds || {}).filter(([id, x]) => x.n > 0 && L.SOUNDS[id]).sort((a, b) => b[1].n - a[1].n).slice(0, 4);
  return `<div class="top"><div><h1>Progress</h1></div><div class="row"><button class="ghost" data-act="recap-open" data-v="0">📅 This week</button><button class="ghost" data-act="recap-open" data-v="1">📅 Last week</button></div></div>
  <div class="grid g4">
    <div class="card stat s-coral"><i class="si">🃏</i><b>${cards}</b><span>cards this week</span>${delta(cards, cardsB)}</div>
    <div class="card stat s-aqua"><i class="si">🎧</i><b>${heard}</b><span>listening answers</span>${delta(heard, heardB)}</div>
    <div class="card stat s-mint"><i class="si">🌱</i><b>${newW}</b><span>new words started</span>${delta(newW, newWB)}</div>
    <div class="card stat s-sun"><i class="si">🎯</i><b>${acc == null ? '–' : Math.round(acc * 100) + '%'}</b><span>answered right</span>${delta(acc, accB, '%')}</div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h2>Last 14 days</h2><div class="week wide">${days.map((x, i) => `<div class="${i === 13 ? 'today' : ''}" title="${x.d}: ${x.n}"><i style="height:${Math.round((x.n / maxN) * 56)}px"></i>${dn(x.d)}</div>`).join('')}</div>
      <p class="muted" style="margin:8px 0 0;font-size:13px">Each bar is cards, listening answers and worksheets that day.</p></div>
    <div class="card"><h2>Words you know</h2>
      <div class="big-num">${m.learned} <small class="muted">of ${m.total} words</small></div>
      ${spark(snaps, 320, 70, 'var(--mint)') || '<p class="muted" style="margin:6px 0 0">The growth line appears after a couple of days of practice.</p>'}
      ${first != null && last != null && snaps.filter((x) => x != null).length > 1 ? `<p class="muted" style="margin:6px 0 0;font-size:13px">${last - first >= 0 ? '+' : ''}${last - first} words in the last 30 days · ${m.learning} still being learned</p>` : ''}</div>
    <div class="card"><h2>Accuracy by day</h2>
      ${spark(days.map((x) => (x.acc == null ? null : Math.round(x.acc * 100))), 320, 70, 'var(--lav)') || '<p class="muted" style="margin:0">Shows up once you have answered on a few days.</p>'}</div>
    <div class="card"><h2>Skills to work on</h2>
      ${weak.length ? weak.map((w) => `<div class="prow"><span>${esc(L.SKILL_NAMES[w.skill] || w.skill)}</span><span class="bar2"><i style="width:${Math.round(w.acc * 100)}%"></i></span><b>${Math.round(w.acc * 100)}%</b></div>`).join('') + '<div class="row" style="margin-top:10px"><button class="ghost" data-act="ws-from-weak-go">✨ Worksheet from my weak spots</button></div>' : '<p class="muted" style="margin:0">Do a worksheet and your weakest skills will be listed here.</p>'}</div>
    <div class="card"><h2>Words that trip you up</h2>
      ${trouble.length ? `<div class="chips2" style="margin:0">${trouble.map((w) => `<span class="pill pink" title="missed ${w.lapses || 0}×">${esc(w.nl)}${w.lapses ? ` <small>${w.lapses}×</small>` : ''}</span>`).join('')}</div>` : '<p class="muted" style="margin:0">Nothing is tripping you up right now. 🌸</p>'}
      ${missedNow().length ? '<div class="row" style="margin-top:12px"><button class="ghost" data-act="mr-cards">🎯 Review this week\'s mistakes</button></div>' : ''}</div>
    <div class="card"><h2>Sounds to practise</h2>
      ${sounds.length ? sounds.map(([id, x]) => `<div class="prow"><span>${esc(L.SOUNDS[id].name)}</span><b>${x.n} slip${x.n === 1 ? '' : 's'}</b></div>`).join('') : '<p class="muted" style="margin:0">No spelling-by-ear slips recorded yet.</p>'}</div>
  </div>`;
};
ACT['ws-from-weak-go'] = () => { askPrefs().weak = true; go('sheets'); ui.wsTab = 'practice'; ui.sheetId = ''; render(); };
if (typeof S !== 'undefined' && S && S.settings) snapshotToday();
