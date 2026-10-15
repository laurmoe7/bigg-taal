// The Words page: tabs by kind of word, a search box, a letter strip and pages of word cards,
// so the list stays easy to move around however big it gets. Loads after app.js and shares its scope.
Object.assign(ui.words, { band: '0-1500', tab: 'all', sort: 'az', letter: '', page: 0, art: '', back: 'all' });

const WORDS_PER_PAGE = 48;
const isNoun = (w) => !!w.article || w.pos === 'noun';
const isVerb = (w) => !isNoun(w) && w.pos === 'verb';
// [id, icon, name, which words belong]
const WORD_TABS = [
  ['all', '📚', 'All', () => true],
  ['noun', '🏷️', 'Nouns', isNoun],
  ['verb', '🏃', 'Verbs', isVerb],
  ['other', '🧩', 'Other', (w) => !isNoun(w) && !isVerb(w)],
  ['hard', '🎯', 'Needs work', (w) => w.reps > 0 && w.box < 4 && (w.box <= 1 || w.lapses >= 2)],
  ['new', '🌱', 'New', (w) => !w.reps],
  ['done', '✅', 'Learned', (w) => w.box >= 4],
];
const firstLetter = (w) => { const c = L.norm(w.nl).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; };
const sortWords = (arr, how) => (how === 'new' ? arr.slice().sort((a, b) => b.created - a.created)
  : how === 'hard' ? arr.slice().sort((a, b) => a.box - b.box || (b.lapses || 0) - (a.lapses || 0) || a.nl.localeCompare(b.nl, 'nl'))
    : arr.slice().sort((a, b) => a.nl.localeCompare(b.nl, 'nl')));

const wordCard = (w) => `<div class="wcard"><div class="wtop"><div class="wt">${w.article ? `<span class="art-${w.article}">${w.article}</span> ` : ''}<b>${esc(w.nl)}</b></div><button class="ghost mini" data-act="say" data-t="${esc((w.article ? w.article + ' ' : '') + w.nl)}" title="Listen">🔊</button></div>
  <div class="we">${esc(w.en)}</div>${w.example ? `<div class="wex">${esc(w.example)}</div>` : ''}
  <div class="wf"><span class="lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${w.box >= i ? 'on' : ''}"></i>`).join('')}</span><span><button class="ghost mini" data-act="word-edit" data-id="${w.id}" title="Edit">✎</button> <button class="ghost mini" data-act="word-del" data-id="${w.id}" title="Delete">🗑</button></span></div></div>`;

VIEWS.words = () => {
  const f = ui.words, all = liveWords(), m = L.mastery(S.words);
  const head = `<div class="top"><div><h1>Words</h1></div></div>`;
  const sec = f.tab === 'recall' ? 'recall' : f.tab === 'dict' || f.tab === 'suggest' ? 'dict' : 'mine';
  const secBar = `<div class="tabs"><button class="tab ${sec === 'mine' ? 'on' : ''}" data-act="wt-sec" data-v="mine">📚 My words <small>${all.length}</small></button><button class="tab ${sec === 'dict' ? 'on' : ''}" data-act="wt-sec" data-v="dict">📖 Dictionary</button><button class="tab ${sec === 'recall' ? 'on' : ''}" data-act="wt-sec" data-v="recall">🧠 Blank-page recall</button></div>`;
  const tabBtn = (id, label) => `<button class="${f.tab === id ? 'on' : ''}" data-act="wt-tab" data-t="${id}">${label}</button>`;
  const tabs = secBar + (sec === 'recall' ? '' : sec === 'mine'
    ? `<div class="seg">${WORD_TABS.map(([id, ic, name, fn]) => tabBtn(id, `${ic} ${name} <small>${all.filter(fn).length}</small>`)).join('')}${tabBtn('add', '➕ Add manually')}</div>`
    : `<div class="seg">${tabBtn('dict', '🔎 Look up')}${tabBtn('suggest', '💡 Suggested')}</div>`);
  if (f.tab === 'recall') return head + tabs + rcPage();
  if (f.tab === 'add') return head + tabs + addWordsTab();
  if (f.tab === 'suggest') return head + tabs + suggestTab();
  if (f.tab === 'dict') return head + tabs + dictTab();
  const def = WORD_TABS.find((t) => t[0] === f.tab) || WORD_TABS[0];
  let ws = all.filter(def[3]);
  if (f.tab === 'noun' && f.art) ws = ws.filter((w) => w.article === f.art);
  const q = f.q.trim().toLowerCase();
  if (q) ws = ws.filter((w) => (w.nl + ' ' + w.en).toLowerCase().includes(q));
  const letters = [...new Set(ws.map(firstLetter))].sort();
  if (f.letter && !letters.includes(f.letter)) f.letter = '';
  const shown = sortWords(f.letter ? ws.filter((w) => firstLetter(w) === f.letter) : ws, f.sort);
  const pages = Math.max(1, Math.ceil(shown.length / WORDS_PER_PAGE));
  if (f.page >= pages) f.page = pages - 1;
  const pageWords = shown.slice(f.page * WORDS_PER_PAGE, (f.page + 1) * WORDS_PER_PAGE);
  const chip = (act, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}">${esc(label)}</button>`;
  const toolbar = `<div class="row wbar"><input type="text" class="grow" id="w-search" placeholder="Search Dutch or English..." value="${esc(f.q)}">
    ${f.tab === 'noun' ? `<span class="chips2" style="margin:0">${chip('wt-art', '', 'All', !f.art)}${chip('wt-art', 'de', 'de', f.art === 'de')}${chip('wt-art', 'het', 'het', f.art === 'het')}</span>` : ''}
    <select id="w-sort"><option value="az" ${f.sort === 'az' ? 'selected' : ''}>A–Z</option><option value="new" ${f.sort === 'new' ? 'selected' : ''}>Newest first</option><option value="hard" ${f.sort === 'hard' ? 'selected' : ''}>Hardest first</option></select></div>`;
  const strip = ws.length > 24 && letters.length > 1 ? `<div class="letters">${chip('wt-letter', '', 'All', !f.letter)}${letters.map((c) => chip('wt-letter', c, c, f.letter === c)).join('')}</div>` : '';
  const pager = pages > 1 ? `<div class="pager"><button class="ghost" data-act="wt-page" data-d="-1" ${f.page === 0 ? 'disabled' : ''}>‹ Previous</button><span class="muted">Page ${f.page + 1} of ${pages} · ${shown.length} words</span><button class="ghost" data-act="wt-page" data-d="1" ${f.page >= pages - 1 ? 'disabled' : ''}>Next ›</button></div>` : '';
  const empty = `<div class="empty">${q || f.letter ? 'No words match.' : f.tab === 'hard' ? 'Nothing needs extra work. 🌸' : f.tab === 'done' ? 'No words learned yet. Keep going, they will come! 🌱' : 'No words here yet.'}</div>`;
  return head + tabs + toolbar + strip + (pageWords.length ? `<div class="wgrid">${pageWords.map(wordCard).join('')}</div>` : empty) + pager;
};

// real example sentences for the word in the form (Tatoeba)
const exList = () => (ui.exFound ? (ui.exFound.length ? '<div class="muted" style="margin:10px 0 4px">Tap one to use it:</div>' + ui.exFound.map((p, i) => `<button class="exs" data-act="ex-use" data-i="${i}"><b>${esc(p[0])}</b><span class="muted">${esc(p[1])}</span></button>`).join('') : '<div class="muted" style="margin-top:10px">No sentences found for that word.</div>') : '');

// Suggested words: the most common Dutch words you do not have yet
const BANDS = [['0-500', 'Top 500'], ['0-1500', 'Top 1,500'], ['1500-3000', '1,500 – 3,000'], ['3000-6000', '3,000 – 6,000']];
const SUG_PER_PAGE = 24;
const guessPos = (nl) => (/^(zich\s)?\S+en$/.test(nl) ? 'verb' : 'other');
const artOf = (a) => (a === 'de' || a === 'het' ? a : '');
function suggestList() { const [lo, hi] = ui.words.band.split('-').map(Number); return L.suggestWords(FREQ, S.words, S.knownFreq, lo, hi); }
function suggestTab() {
  const f = ui.words;
  if (typeof FREQ === 'undefined') { loadData('freq').then(() => { if (ui.view === 'words' && f.tab === 'suggest') render(); }).catch(() => { f.sugErr = true; render(); }); return f.sugErr ? '<div class="empty">Could not load the word list.</div>' : '<div class="empty">Loading words...</div>'; }
  const list = suggestList(), pages = Math.max(1, Math.ceil(list.length / SUG_PER_PAGE));
  if (f.page >= pages) f.page = pages - 1;
  const shown = list.slice(f.page * SUG_PER_PAGE, (f.page + 1) * SUG_PER_PAGE);
  const card = (x) => `<div class="wcard"><div class="wtop"><div class="wt">${artOf(x[3]) ? `<span class="art-${x[3]}">${x[3]}</span> ` : ''}<b>${esc(x[0])}</b>${x[4] ? ` <span class="muted" style="font-size:12px">${L.POS_NAMES[x[4]] || ''}</span>` : ''}</div><button class="ghost mini" data-act="say" data-t="${esc((artOf(x[3]) ? x[3] + ' ' : '') + x[0])}" title="Listen">🔊</button></div>
    <div class="we">${esc(x[1])}</div><div class="wf"><span class="muted" style="font-size:12px" title="Rank among the most common Dutch words">#${x[2]}</span><span><button class="ghost mini" data-act="sg-know" data-w="${esc(x[0])}" title="I already know this">✓ Know it</button> <button class="primary mini" data-act="sg-add" data-w="${esc(x[0])}">➕ Add</button></span></div></div>`;
  const pager = pages > 1 ? `<div class="pager"><button class="ghost" data-act="wt-page" data-d="-1" ${f.page === 0 ? 'disabled' : ''}>‹ Previous</button><span class="muted">Page ${f.page + 1} of ${pages} · ${list.length} words</span><button class="ghost" data-act="wt-page" data-d="1" ${f.page >= pages - 1 ? 'disabled' : ''}>Next ›</button></div>` : '';
  return `<p class="muted" style="margin:0 0 10px">The most common Dutch words that are not in your list yet. Adding one also finds a real example sentence for it. Meanings come from Wiktionary, so give them a quick check.</p>
    <div class="row wbar"><span class="chips2" style="margin:0">${BANDS.map(([v, n]) => `<button class="chip ${f.band === v ? 'on' : ''}" data-act="sg-band" data-v="${v}">${n}</button>`).join('')}</span>
    <span class="grow"></span><button class="primary" data-act="sg-addn" ${shown.length ? '' : 'disabled'}>➕ Add these ${shown.length}</button></div>
    ${shown.length ? `<div class="wgrid">${shown.map(card).join('')}</div>` : '<div class="empty">You have all of these. Try the next range! 🌸</div>'}${pager}`;
}
async function addSuggested(words) { // words: [dutch, ...]; adds them with real example sentences when found
  const items = words.map((nl) => FREQ.find((x) => x[0] === nl)).filter(Boolean);
  let idx = null; try { idx = await sentenceData(); } catch {}
  for (const [nl, en, , art, ty] of items) {
    const pos = ty === 'n' ? 'noun' : ty === 'v' ? 'verb' : 'other', ex = idx ? L.sentencesFor(nl, pos, idx, SENTENCES, 1)[0] : null;
    S.words.push(L.newWord({ nl, en, pos, article: artOf(art), example: ex ? ex[0] : '', exampleEn: ex ? ex[1] : '' }));
  }
  gainXp(Math.min(12, items.length * XP.addWord)); save(); toast(items.length === 1 ? 'Added ' + items[0][0] : 'Added ' + items.length + ' words'); render();
}

// Dictionary: Dutch to English or English to Dutch, from Wiktionary
let DICT_IX = null;
const haveWord = (nl) => liveWords().some((x) => x.nl.toLowerCase().replace(/^(de|het|een|zich)\s+/, '') === nl.toLowerCase());
const dictIndex = () => (DICT_IX = DICT_IX || L.buildDictIndex(DICT));
const dictMean = (e) => L.dictExplain(DICT, dictIndex(), e); // plain-English meaning, plus a note for grammar-only entries
const formsLine = (e) => { const f = e[3] ? e[3].split(',') : []; return e[1] === 'n' && f[0] ? 'plural: ' + f[0] : e[1] === 'v' && f.length ? 'past: ' + (f[0] || '') + (f[1] ? ' · participle: ' + f[1] : '') + (f[2] ? ' · ' + f[2] : '') : e[1] === 'a' && f.length ? f.join(', ') : ''; };
function dictResults(q) {
  const res = L.dictSearch(DICT, dictIndex(), q, 30);
  if (!q.trim()) return '<div class="empty">Type a Dutch or English word to look it up. You can also search for a plural or a past tense, like <b>huizen</b> or <b>ging</b>.</div>';
  if (!res.length) return '<div class="empty">Nothing found for that word.</div>';
  return '<div class="wgrid">' + res.map(({ e, how }) => `<div class="wcard"><div class="wtop"><div class="wt">${artOf(e[2]) ? `<span class="art-${e[2]}">${e[2]}</span> ` : e[2] === 'de/het' ? '<span class="muted">de/het</span> ' : ''}<b>${esc(e[0])}</b> <span class="muted" style="font-size:12px">${L.POS_NAMES[e[1]] || ''}</span></div><button class="ghost mini" data-act="say" data-t="${esc((artOf(e[2]) ? e[2] + ' ' : '') + e[0])}" title="Listen">🔊</button></div>
    <div class="we">${esc(dictMean(e).mean)}</div>${dictMean(e).note ? `<div class="wnote">${esc(dictMean(e).note)}</div>` : ''}${formsLine(e) ? `<div class="wex">${esc(formsLine(e))}</div>` : ''}
    <div class="wf"><span class="muted" style="font-size:12px">${how === 'form' ? 'form of this word' : how === 'english' ? 'English match' : ''}</span>${haveWord(e[0]) ? '<span class="have">✓ In My words</span>' : `<button class="primary mini" data-act="dict-add" data-w="${esc(e[0])}" data-t="${e[1]}">➕ Add</button>`}</div></div>`).join('') + '</div>';
}
function dictTab() {
  if (typeof DICT === 'undefined') { loadData('dict').then(() => { if (ui.view === 'words' && ui.words.tab === 'dict') render(); }).catch(() => {}); return '<div class="empty">Loading the dictionary...</div>'; }
  return `<p class="muted" style="margin:0 0 10px">${DICT.length.toLocaleString()} Dutch entries from Wiktionary. Find a word, then press Add to put it in My words.</p>
    <div class="row wbar"><input type="text" class="grow" id="d-q" data-focus placeholder="Look up a Dutch or English word..." value="${esc(ui.words.dq || '')}"></div><div id="d-res">${dictResults(ui.words.dq || '')}</div>`;
}

function addWordsTab() {
  const ed = ui.edit ? S.words.find((w) => w.id === ui.edit) : null;
  return `<div class="ws-grid">
  <div class="card"><h2>${ed ? 'Edit word' : 'Add a word'}</h2>
    <div class="row"><select id="w-art"><option value="">no article</option><option value="de" ${ed && ed.article === 'de' ? 'selected' : ''}>de</option><option value="het" ${ed && ed.article === 'het' ? 'selected' : ''}>het</option></select>
    <input type="text" class="grow" id="w-nl" data-focus placeholder="Dutch word" value="${esc(ed ? ed.nl : '')}"><input type="text" class="grow" id="w-en" placeholder="English" value="${esc(ed ? ed.en : '')}" data-enter="word-save"></div>
    <div class="row" style="margin-top:8px"><input type="text" class="grow" id="w-ex" placeholder="Example sentence (optional but great for worksheets)" value="${esc(ed ? ed.example : '')}" data-enter="word-save">
    <button class="ghost" data-act="dict-fill" title="Fill in de/het and the English from the dictionary">📖 Look up</button>
    <button class="ghost" data-act="ex-find" title="Look up real sentences that use this word">🔎 Find examples</button>
    <button class="primary" data-act="word-save">${ed ? 'Save' : 'Add'}</button>${ed ? '<button class="ghost" data-act="word-cancel">Cancel</button>' : ''}</div>
    <div id="ex-list">${exList()}</div></div>
  <div class="card"><h2>Add many at once</h2>
    <p class="muted" style="margin-top:0">Paste in any of these: one word per line like <code>de afspraak = appointment | Ik heb een afspraak.</code> (also <code>;</code>, tab or <code>-</code>); a list copied from a course page, where each word is followed by a blank line and its English (with or without a <code>Start</code> in front); or the JSON Claude gave you.</p>
    <textarea id="w-bulk" class="big-paste" placeholder="de afspraak = appointment">${esc(ui.draftText)}</textarea>
    <div class="row" style="margin-top:8px"><button class="primary" data-act="bulk-add">Import</button></div></div></div>`;
}

Object.assign(ACT, {
  'dict-add': async (el) => {
    const e = DICT.find((x) => x[0] === el.dataset.w && x[1] === el.dataset.t); if (!e) return;
    const o = L.dictToWord(e, dictMean(e).mean); let ex = null; try { ex = (await examplesFor(o.nl, o.pos, 1))[0]; } catch {}
    if (S.words.some((x) => !x.deleted && x.nl.toLowerCase() === o.nl.toLowerCase())) return toast(o.nl + ' is already in your list');
    S.words.push(L.newWord(Object.assign(o, { example: ex ? ex[0] : '', exampleEn: ex ? ex[1] : '' }))); gainXp(XP.addWord); save(); toast('Added ' + o.nl + ' to My words'); render();
  },
  'dict-fill': async () => {
    const nl = $('#w-nl').value.trim(); if (!nl) return toast('Type the Dutch word first.');
    try { await loadData('dict'); } catch { return toast('Could not load the dictionary.'); }
    const r = L.dictSearch(DICT, dictIndex(), nl, 1)[0]; if (!r) return toast('Not found in the dictionary.');
    const o = L.dictToWord(r.e, dictMean(r.e).mean); $('#w-nl').value = r.how === 'word' ? o.nl : nl; if (o.article) $('#w-art').value = o.article; if (!$('#w-en').value) $('#w-en').value = o.en;
    toast(r.how === 'form' ? nl + ' is a form of ' + o.nl + ' (filled in for ' + o.nl + ')' : 'Filled in'); if (r.how === 'form') $('#w-nl').value = o.nl;
  },
  'sg-band': (el) => { ui.words.band = el.dataset.v; ui.words.page = 0; render(); },
  'sg-add': (el) => addSuggested([el.dataset.w]),
  'sg-addn': () => addSuggested(suggestList().slice(ui.words.page * SUG_PER_PAGE, (ui.words.page + 1) * SUG_PER_PAGE).map((x) => x[0])),
  'sg-know': (el) => { S.knownFreq.push(el.dataset.w); save(); render(); },
  'ex-find': async () => {
    const nl = $('#w-nl').value.trim(); if (!nl) return toast('Type the Dutch word first.');
    const pos = $('#w-art').value ? 'noun' : guessPos(nl);
    try { ui.exFound = await examplesFor(nl, pos, 6); } catch { return toast('Could not load the sentences.'); }
    const l = $('#ex-list'); if (l) l.innerHTML = exList();
  },
  'ex-use': (el) => { const p = ui.exFound && ui.exFound[+el.dataset.i]; if (!p) return; $('#w-ex').value = p[0]; ui.exEn = p; toast('Using that sentence'); },
  'wt-sec': (el) => { const f = ui.words; f.tab = el.dataset.v === 'recall' ? 'recall' : el.dataset.v === 'mine' ? (f.lastMine || 'all') : (f.lastDict || 'dict'); f.page = 0; ui.edit = null; render(); $('#main').scrollTop = 0; },
  'wt-tab': (el) => { const f = ui.words; f.tab = el.dataset.t; if (f.tab === 'dict' || f.tab === 'suggest') f.lastDict = f.tab; else f.lastMine = f.tab; f.page = 0; f.letter = ''; if (f.tab !== 'add') { ui.edit = null; f.back = f.tab; } render(); $('#main').scrollTop = 0; },
  'wt-letter': (el) => { ui.words.letter = el.dataset.v; ui.words.page = 0; render(); },
  'wt-art': (el) => { ui.words.art = el.dataset.v; ui.words.page = 0; render(); },
  'wt-page': (el) => { ui.words.page = Math.max(0, ui.words.page + +el.dataset.d); render(); $('#main').scrollTop = 0; },
  'word-edit': (el) => { const f = ui.words; if (f.tab !== 'add') f.back = f.tab; ui.edit = el.dataset.id; f.tab = 'add'; render(); $('#main').scrollTop = 0; },
  'word-cancel': () => { ui.edit = null; ui.words.tab = ui.words.back || 'all'; render(); },
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'w-search') { ui.words.q = e.target.value; ui.words.page = 0; const pos = e.target.selectionStart; render(); const s = $('#w-search'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }
  else if (e.target.id === 'w-bulk') ui.draftText = e.target.value;
  else if (e.target.id === 'd-q') { ui.words.dq = e.target.value; const r = $('#d-res'); if (r) r.innerHTML = dictResults(ui.words.dq); }
});
document.addEventListener('change', (e) => { if (e.target.id === 'w-sort') { ui.words.sort = e.target.value; ui.words.page = 0; render(); } });
