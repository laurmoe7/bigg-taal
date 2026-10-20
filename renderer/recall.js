// Blank-page recall (a tab on the Words page): pick a group of words, then type every Dutch word you can remember from it, with no cards
// in front of you. Groups are your own words (started, nouns, verbs, lessons) or word lists by how common the words are (Starter, A1, A2, B1, B2),
// which you can look over first. Afterwards you see what you got and what you missed; missed words that are in your list are made due today so
// they come first in the next flashcard session, and missed words that are not in your list yet can be added. Loads after words.js and shares its scope.

const rcSetup = (ui.rcSetup = ui.rcSetup || { src: 'started', mins: 2, n: 40, show: false });
// word lists by how common the words are (the frequency list behind Suggested words): about the level a learner needs, not an official list
const RC_BANDS = [['b-starter', 'Starter: most common words, 1 to 300', 1, 300], ['b-a1', 'A1: 301 to 800', 301, 800], ['b-a2', 'A2: 801 to 1,600', 801, 1600], ['b-b1', 'B1: 1,601 to 3,000', 1601, 3000], ['b-b2', 'B2: 3,001 to 5,000', 3001, 5000]];
const rcBandCache = {};
function rcBandWords(id) { // [{ id, nl, en, article, band: true }] for a band, once the frequency list is loaded
  if (rcBandCache[id]) return rcBandCache[id];
  const [, , lo, hi] = RC_BANDS.find((b) => b[0] === id), seen = new Set(), out = [];
  for (const f of FREQ) if (f[2] >= lo && f[2] <= hi && f[0].length > 1 && !seen.has(f[0])) { seen.add(f[0]); out.push({ id: 'f' + f[2], nl: f[0], en: String(f[1]).split(';')[0].slice(0, 70), article: f[3] || '', band: true }); }
  return (rcBandCache[id] = out);
}
const rcOwned = (w) => (w.band ? liveWords().find((x) => x.nl.toLowerCase() === w.nl.toLowerCase()) : w); // your own copy of the word, if you have one
const rcSources = () => {
  const live = liveWords(), lessons = {};
  live.forEach((w) => { if (w.lesson) lessons[w.lesson] = (lessons[w.lesson] || 0) + 1; });
  const mine = [['started', 'Words I have started', live.filter((w) => w.reps > 0)], ['all', 'All my words', live], ['noun', 'Nouns', live.filter((w) => w.pos === 'noun')], ['verb', 'Verbs', live.filter((w) => w.pos === 'verb')]];
  Object.keys(lessons).filter((l) => lessons[l] >= 4).sort().forEach((l) => mine.push(['lesson:' + l, l, live.filter((w) => w.lesson === l)]));
  const list = mine.map(([id, name, words]) => ({ id, name, group: 'My words', words }));
  if (typeof FREQ !== 'undefined') RC_BANDS.forEach(([id, name]) => list.push({ id, name, group: 'Word lists, by how common the words are', words: rcBandWords(id) }));
  return list;
};
const rcSource = () => { const l = rcSources(); return l.find((x) => x.id === rcSetup.src) || l[0]; };
function rcStart() {
  const src = rcSource();
  if (src.words.length < 4) return toast('Not enough words in that group yet. Pick another one!');
  const pool = rcSetup.n && src.words.length > rcSetup.n ? L.pick(src.words, rcSetup.n) : src.words.slice();
  ui.rc = { screen: 'play', name: src.name, band: /^b-/.test(src.id), pool, found: [], extra: [], total: src.words.length, deadline: rcSetup.mins ? Date.now() + rcSetup.mins * 60000 : 0, tid: 0 };
  if (ui.rc.deadline) ui.rc.tid = setInterval(rcTick, 500);
  render();
}
function rcTick() {
  const r = ui.rc; if (!r || r.screen !== 'play') return clearInterval(r && r.tid);
  const left = Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000)), el = document.getElementById('rc-timer');
  if (el) { el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; el.classList.toggle('warn', left <= 15); }
  if (left <= 0) rcFinish();
}
function rcAdd() {
  const r = ui.rc, inp = $('#rc-in'); if (!r || r.screen !== 'play' || !inp) return;
  const parts = inp.value.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean); inp.value = '';
  let any = false;
  for (const t of parts) {
    const m = L.recallMatch(t, r.pool);
    if (m) { if (r.found.some((f) => f.w.id === m.w.id)) toast('You already have ' + wordLabel(m.w)); else { r.found.push(m); any = true; } }
    else if (!r.extra.includes(t)) r.extra.push(t);
  }
  if (any) chime('ok');
  rcPaint(); inp.focus();
}
function rcPaint() {
  const r = ui.rc, set = (id, h) => { const el = document.getElementById(id); if (el) el.innerHTML = h; };
  set('rc-count', `${r.found.length} <small class="muted">of ${r.pool.length}</small>`);
  set('rc-chips', r.found.map((f) => `<span class="chip on" title="${f.exact ? '' : 'spelling: ' + esc(wordLabel(f.w))}">✓ ${esc(wordLabel(f.w))}${f.exact ? '' : ' ~'}</span>`).join('') +
    r.extra.map((t) => `<span class="chip" title="Not one of the words in this group">${esc(t)} ?</span>`).join(''));
}
function rcFinish() {
  const r = ui.rc; if (!r || r.screen !== 'play') return;
  clearInterval(r.tid); r.screen = 'done';
  const got = new Set(r.found.map((f) => f.w.id)); r.missed = r.pool.filter((w) => !got.has(w.id));
  r.missed.forEach((w) => { const o = rcOwned(w); if (o && o.reps > 0 && !L.isDue(o, today())) o.due = today(); if (o && o.rv && o.rv.reps > 0 && !L.isDue(o.rv, today())) o.rv.due = today(); }); // the ones you missed come first in the next session
  S.rcLog = (S.rcLog || []).concat({ d: today(), name: r.name, found: r.found.length, total: r.pool.length }).slice(-30);
  if (r.found.length) { count('reviews', r.found.length); gainXp(Math.min(80, r.found.length * 4 + (r.missed.length ? 0 : 20))); chime('goal'); if (!r.missed.length) confetti(); }
  save(); if (ui.view === 'words') render();
}
const rcLast = () => { const l = (S.rcLog || [])[(S.rcLog || []).length - 1]; return l ? `<span class="muted">Last time: ${l.found} of ${l.total} (${esc(l.name)})</span>` : ''; };

function rcPage() { // the setup page: the Recall tab on the Words page
  if (typeof FREQ === 'undefined' && !ui.rcLoading) { ui.rcLoading = true; loadData('freq').then(() => { ui.rcLoading = false; if (ui.view === 'words' && ui.words.tab === 'recall' && !ui.rc) render(); }).catch(() => { ui.rcLoading = false; }); }
  const srcs = rcSources(), cur = rcSource(), groups = [...new Set(srcs.map((x) => x.group))];
  const sel = groups.map((g) => `<optgroup label="${esc(g)}">${srcs.filter((x) => x.group === g).map((x) => `<option value="${esc(x.id)}" ${cur.id === x.id ? 'selected' : ''}>${esc(x.name)} (${x.words.length})</option>`).join('')}</optgroup>`).join('');
  const band = !!(cur.words[0] && cur.words[0].band), owned = band ? cur.words.filter(rcOwned).length : 0;
  const list = rcSetup.show ? `<div class="rc-list">${cur.words.map((w) => `<div class="rc-item" title="${esc(w.en)}"><button class="speak" data-act="say" data-t="${esc(wordLabel(w))}" title="Listen">🔊</button><b>${esc(wordLabel(w))}</b><span class="muted">${esc(w.en)}</span></div>`).join('')}</div>` : '';
  const opts = (arr, cur) => arr.map(([v, t]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`).join('');
  return `<div class="card" style="max-width:860px"><h2 style="margin-top:0">🧠 Blank-page recall</h2>
    <p class="muted" style="margin:0 0 14px">Pick a group, then type every word you can remember from it, with no cards to look at. Pulling words out of your head is the strongest way to make them stick.</p>
    <div class="row"><label class="muted">Group <select id="rc-src">${sel}</select></label>${typeof FREQ === 'undefined' ? '<span class="muted">loading the word lists…</span>' : ''}</div>
    <div class="row" style="margin-top:10px"><label class="muted">How many <select id="rc-n">${opts([[20, '20 words'], [40, '40 words'], [80, '80 words'], [0, 'All of them']], rcSetup.n)}</select></label>
      <label class="muted">Time <select id="rc-mins">${opts([[1, '1 minute'], [2, '2 minutes'], [3, '3 minutes'], [5, '5 minutes'], [10, '10 minutes'], [0, 'No limit']], rcSetup.mins)}</select></label></div>
    <p class="muted" style="margin:10px 0 0;font-size:13px">${cur.words.length} words in this group${rcSetup.n && cur.words.length > rcSetup.n ? `: you get a random ${rcSetup.n} of them` : ''}.${band ? ` ${owned} of them are already in your words. Levels go by how common the words are, not an official list.` : ''}</p>
    <div class="row" style="margin-top:14px"><button class="primary" data-act="rc-go">▶ Start</button><button class="ghost ${rcSetup.show ? 'on' : ''}" data-act="rc-show">👀 ${rcSetup.show ? 'Hide' : 'Look over'} the list</button>${rcLast()}</div>
    ${list}</div>`;
}
function rcView() {
  const r = ui.rc;
  if (r.screen === 'play') {
    return `<div class="top"><div><h1>Blank-page recall</h1><p class="sub">${esc(r.name)}${r.total > r.pool.length ? ` · a random ${r.pool.length} of ${r.total}` : ''}</p></div><button class="ghost" data-act="rc-cancel">Cancel</button></div>
      <div class="fc-wrap"><div class="card" style="padding:22px">
        <div class="row" style="justify-content:space-between;margin-bottom:10px"><div style="font-size:34px;font-weight:900" id="rc-count"></div>${r.deadline ? '<div style="font-size:30px;font-weight:900" id="rc-timer">...</div>' : '<span class="muted">no time limit</span>'}</div>
        <p class="muted" style="margin:0 0 10px">Type a Dutch word you remember from this group and press Enter. Commas work for several at once. Articles are optional.</p>
        <input type="text" class="big-in" id="rc-in" data-focus data-enter="rc-add" autocomplete="off" spellcheck="false" placeholder="Type a word... (Enter)">
        <div class="chips2" id="rc-chips" style="margin-top:12px"></div>
        <div class="row" style="margin-top:14px"><button class="primary" data-act="rc-finish">I am done</button><span class="muted">${r.pool.length} words are hiding in this group</span></div></div></div>`;
  }
  const pct = r.pool.length ? Math.round((r.found.length / r.pool.length) * 100) : 0, ownMissed = r.missed.filter(rcOwned).length, newMissed = r.missed.length - ownMissed;
  const row = (w) => `<div class="dl-row"><div><b class="dl-big">${esc(wordLabel(w))}${r.band && rcOwned(w) ? ' <span class="pill mint">in my words</span>' : ''}</b><small class="muted">${esc(w.en)}</small></div><button class="speak" style="position:static" data-act="say" data-t="${esc(wordLabel(w))}" title="Listen">🔊</button></div>`;
  return `<div class="top"><div><h1>Blank-page recall</h1><p class="sub">${esc(r.name)}</p></div></div><div class="fc-wrap"><div class="card" style="padding:22px">
    <div class="vt-score" style="text-align:center">${r.found.length} <small>/ ${r.pool.length}</small></div>
    <p class="muted" style="text-align:center;margin:0 0 12px">${pct === 100 ? 'Every single one! Bigg is doing a happy spin. 🎉' : pct >= 60 ? 'Great recall! 🌸' : r.found.length ? 'A good start. The ones you missed come first in your next cards. 💗' : 'Nothing yet, and that is okay. Now you know which ones to look at. 💗'}</p>
    ${r.missed.length ? `<h3 class="dl-h">Missed (${r.missed.length})</h3>${r.missed.map(row).join('')}` : ''}
    ${r.extra.length ? `<h3 class="dl-h">Not in this group</h3><div class="chips2">${r.extra.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:14px">${ownMissed ? '<button class="primary" data-act="rc-practise">Practise the ones I missed</button>' : ''}${r.band && newMissed ? `<button class="${ownMissed ? 'ghost' : 'primary'}" data-act="rc-addmissed">➕ Add ${newMissed} missed word${newMissed === 1 ? '' : 's'} to my list</button>` : ''}<button class="ghost" data-act="rc-go">Another round</button><button class="ghost" data-act="rc-close">Back to recall</button></div></div></div>`;
}
const rcWords = VIEWS.words;
VIEWS.words = () => (ui.rc ? rcView() : rcWords());
Object.assign(ACT, {
  'rc-go': () => { clearInterval(ui.rc && ui.rc.tid); rcStart(); }, 'rc-add': rcAdd, 'rc-finish': rcFinish, 'rc-show': () => { rcSetup.show = !rcSetup.show; render(); },
  'rc-cancel': () => { if (ui.rc) clearInterval(ui.rc.tid); ui.rc = null; render(); }, 'rc-close': () => { ui.rc = null; render(); },
  'rc-practise': () => { const m = ui.rc.missed.map(rcOwned).filter(Boolean); ui.rc = null; go('cards'); launchCards(m, 'recall misses'); },
  'rc-addmissed': async () => { const r = ui.rc; await addSuggested(r.missed.filter((w) => !rcOwned(w)).map((w) => w.nl)); render(); },
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'rc-src') { rcSetup.src = e.target.value; render(); }
  if (e.target.id === 'rc-mins') rcSetup.mins = +e.target.value;
  if (e.target.id === 'rc-n') { rcSetup.n = +e.target.value; render(); }
});
// the chips are filled in after the page is drawn (and again if it is redrawn while you play)
new MutationObserver(() => { const c = document.getElementById('rc-chips'); if (ui.rc && ui.rc.screen === 'play' && c && !c.dataset.p) { c.dataset.p = '1'; rcPaint(); rcTick(); } }).observe(document.getElementById('main'), { childList: true });
