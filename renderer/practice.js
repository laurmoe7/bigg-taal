// Practice worksheets: Claude makes them (copy a prompt to chat, paste the JSON reply back), you do them in the app,
// the app marks what it can, Claude marks the rest, and every result feeds a running record of your weak spots.
// Loads after app.js and shares its scope.
S.sheets = S.sheets || []; S.skills = S.skills || {};
Object.assign(ui, { wsTab: 'practice', sheetId: '', askReply: '', fbText: '' });
// What to ask Claude for (remembered between visits): how many items, topics, grammar, weak spots, your own words.
const askPrefs = () => (S.askPrefs = Object.assign({ count: 12, weak: true, useWords: true, topics: [], custom: '', grammar: [], kinds: [], note: '' }, S.askPrefs || {}));
const ownTopics = (a) => String(a.custom || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const previewText = (list) => (list.length ? list.slice(0, 3).join(', ') + (list.length > 3 ? ' +' + (list.length - 3) : '') : 'none picked: a mix');
Object.assign(ui, { pickOpen: {} });
const KINDS = [['mc', 'Multiple choice'], ['fill', 'Fill in the gap'], ['order', 'Put in order'], ['translate', 'Translate'], ['correct', 'Fix the mistake'], ['write', 'Write sentences']];
const kindName = (k) => (KINDS.find((x) => x[0] === k) || [0, k])[1];
const GRAMMAR_CHOICES = L.SKILLS.filter((k) => k !== 'other');

const sheetById = (id) => S.sheets.find((s) => s.id === id);
const TYPE_LABEL = { mc: 'Choose', fill: 'Fill in', order: 'Put in order', translate: 'Translate', correct: 'Fix the mistake', write: 'Write' };
const VERDICT = { right: ['✓', 'Right'], close: ['≈', 'Almost: check the spelling'], partly: ['◐', 'Partly right'], wrong: ['✗', 'Not quite'], unsure: ['?', 'Needs checking'], blank: ['–', 'Skipped'] };
const skillName = (k) => L.SKILL_NAMES[k] || k;
function ensureSheetData() { S.sheets = S.sheets || []; S.skills = S.skills || {}; }
function sheetState(sh) {
  if (!sh.checkedAt) return Object.keys(sh.answers || {}).some((k) => sh.answers[k]) ? { label: 'in progress', cls: 'butter' } : { label: 'new', cls: 'sky' };
  const pending = sh.items.filter((it) => ((sh.results || {})[it.id] || {}).verdict === 'unsure').length;
  const sc = L.sheetScore(sh);
  return pending ? { label: `${pending} to check`, cls: 'pink' } : { label: `done · ${Math.round((sc.got / Math.max(1, sc.marked || sc.of)) * 100)}%`, cls: 'mint' };
}

// ---------- Quick practice: worksheets made from the downloaded dictionary and sentences, no Claude needed ----------
// builds a worksheet from a pool of words ({nl,en,article,pos}) out of the dictionary and real sentences, and opens it
async function makeQuickSheet(pool, types, count, title, hard) {
  try { await Promise.all([loadData('dict'), loadData('sentences')]); } catch { return toast('Could not load the dictionary data.'); }
  const idx = await sentenceData();
  const sheet = L.buildLocalSheet({ pool, types, count, dict: DICT, dix: dictIndex(), sentences: SENTENCES, six: idx, hard: !!hard });
  if (!sheet) return toast(pool.length ? 'Could not make questions from those words. Try more question types or word groups.' : 'No words match that yet. Try "Any of my words".');
  sheet.title = (title || 'Quick practice') + ' (' + sheet.items.length + ' items)' + (hard ? ' 🔥' : ''); sheet.hard = !!hard;
  sheet.id = L.uid(); sheet.created = Date.now(); sheet.answers = {}; sheet.results = {}; S.sheets.push(sheet); ui.sheetId = sheet.id; ui.wsTab = 'practice'; save();
  toast('Worksheet ready: ' + sheet.items.length + ' items'); render(); $('#main').scrollTop = 0;
}
const quickPrefs = () => (S.quickPrefs = Object.assign({ count: 12, recent: true, trouble: true, mine: false, common: false, types: L.LOCAL_TYPES.map((t) => t[0]) }, S.quickPrefs || {}));
function quickTab() {
  const q = quickPrefs(), live = liveWords(), td = today();
  const nRecent = L.recentWords(live, td, 7).length, nTrouble = L.troubleWords(live).length;
  const src = (k, label, n, tip) => `<button class="chip ${q[k] ? 'on' : ''}" data-act="q-src" data-v="${k}" title="${tip}">${q[k] ? '✓ ' : ''}${label}${n == null ? '' : ' <small>' + n + '</small>'}</button>`;
  return `<div class="card" style="max-width:760px"><h2>Which words?</h2>
    <div class="chips2">${src('recent', '🌱 Recently learned', nRecent, 'Words you started or reviewed in the last 7 days')}${src('trouble', '🎯 Words I find hard', nTrouble, 'Words you have missed or still rate low')}${src('mine', '📚 Any of my words', live.length, 'A random mix from your whole list')}${src('common', '💡 New common words', null, 'Common Dutch words you do not have yet (top 1,500)')}</div>
    <h2 style="margin-top:16px">What kind of questions?</h2>
    <div class="chips2">${L.LOCAL_TYPES.map(([id, name]) => `<button class="chip ${q.types.includes(id) ? 'on' : ''}" data-act="q-type" data-v="${id}">${q.types.includes(id) ? '✓ ' : ''}${name}</button>`).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="switch ${q.hard ? 'on' : ''}" role="switch" aria-checked="${!!q.hard}" data-act="q-hard" title="No dictionary. Right answers give 50% more XP."><i></i>🔥 Hard mode <small>no dictionary · +50% XP</small></button></div>
    <div class="row" style="margin-top:10px"><label class="muted">Items <select id="q-count">${[8, 12, 16, 20].map((n) => `<option ${q.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="primary" data-act="q-build">⚡ Make my worksheet</button></div>
    <p class="muted" style="margin:10px 0 0;font-size:13px">Pick more than one group to mix them. Answers are marked in the app and count towards My mistakes.</p></div>`;
}
Object.assign(ACT, {
  'q-src': (el) => { const q = quickPrefs(); q[el.dataset.v] = !q[el.dataset.v]; save(); render(); },
  'q-type': (el) => { const q = quickPrefs(), v = el.dataset.v; q.types = q.types.includes(v) ? q.types.filter((x) => x !== v) : q.types.concat(v); if (!q.types.length) q.types = [v]; save(); render(); },
  'q-build': async () => {
    const q = quickPrefs(); q.count = +readField('q-count') || 12;
    if (!q.recent && !q.trouble && !q.mine && !q.common) return toast('Pick which words to practise first.');
    toast('Making your worksheet...');
    try { await Promise.all([loadData('dict'), loadData('sentences')]); if (q.common) await loadData('freq'); } catch { return toast('Could not load the dictionary data.'); }
    const live = liveWords(), td = today(), pool = [], have = new Set(), add = (w) => { const k = w.nl.toLowerCase(); if (!have.has(k)) { have.add(k); pool.push({ nl: w.nl.replace(/^(de|het|een)\s+/i, ''), en: w.en, article: w.article || '', pos: w.pos || 'other' }); } };
    if (q.trouble) L.troubleWords(live).slice(0, 25).forEach(add);
    if (q.recent) L.recentWords(live, td, 7).slice(0, 25).forEach(add);
    if (q.mine) L.pick(live, 25).forEach(add);
    if (q.common) L.pick(L.suggestWords(FREQ, S.words, S.knownFreq, 0, 1500), 12).forEach((f) => add({ nl: f[0], en: f[1], article: /^(de|het)$/.test(f[3]) ? f[3] : '', pos: f[4] === 'n' ? 'noun' : f[4] === 'v' ? 'verb' : 'other' }));
    await makeQuickSheet(pool, q.types, q.count, 'Quick practice', q.hard);
  },
});

VIEWS.sheets = () => {
  const tab = (id, label) => `<button class="tab ${ui.wsTab === id ? 'on' : ''}" data-act="ws-tab" data-t="${id}">${label}</button>`;
  const head = `<div class="top"><div><h1>Worksheets</h1></div></div><div class="tabs">${tab('practice', '✨ Practice with Claude')}${tab('quick', '⚡ Quick practice')}${tab('mistakes', '🎯 My mistakes')}</div>`;
  if (ui.wsTab === 'quick') return head + quickTab();
  if (ui.wsTab === 'mistakes') return head + mistakesTab();
  const open = sheetById(ui.sheetId);
  return head + (open ? sheetPage(open) : practiceHome());
};

// ---------- make one ----------
function practiceHome() {
  ensureSheetData();
  const a = askPrefs(), weak = L.weakSkills(S.skills, 3), topics = a.topics.concat(ownTopics(a)), grammar = a.grammar.map((k) => L.SKILL_NAMES[k]);
  const sheets = S.sheets.filter((s) => !s.archived).sort((x, y) => y.created - x.created), archived = S.sheets.filter((s) => s.archived).sort((x, y) => y.created - x.created);
  const chip = (act, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" data-l="${esc(label)}">${on ? '✓ ' : ''}${esc(label)}</button>`;
  const selRow = (k) => `<div class="row sel-row"><button class="ghost mini" data-act="ws-selall" data-k="${k}" data-on="1">Select all</button><button class="ghost mini" data-act="ws-selall" data-k="${k}" data-on="">Deselect all</button></div>`;
  const section = (id, title, list, body) => `<details class="pick" id="${id}" ${ui.pickOpen[id] ? 'open' : ''}><summary><b>${title}</b><span class="pill ${list.length ? 'sky' : ''}" id="${id}-n">${list.length}</span><span class="muted pv" id="${id}-pv">${esc(previewText(list))}</span></summary>${body}</details>`;
  return `<div class="ws-grid">
    <div class="card"><h2>1 · Ask Claude for a worksheet</h2>
      <div class="row preset-row"><select id="ws-preset" title="Your saved setups"><option value="">📌 Saved setups${(S.presets || []).length ? '' : ' (none yet)'}</option>${(S.presets || []).map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
        <button class="ghost mini" data-act="ws-preset-use">Use</button><button class="ghost mini" data-act="ws-preset-del" title="Delete the selected setup">🗑</button>
        <span class="grow"></span><input type="text" id="ws-preset-name" placeholder="Name this setup" style="max-width:190px"><button class="ghost mini" data-act="ws-preset-save">💾 Save</button></div>
      <div class="row opts-row"><label class="muted">Items <select id="ws-count">${[8, 12, 16, 20].map((n) => `<option ${a.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label title="Add my weakest skills${weak.length ? ': ' + weak.map((w) => skillName(w.skill)).join(', ') : ' (none yet)'}"><input type="checkbox" id="ws-weak" ${a.weak ? 'checked' : ''}> My weak spots</label>
        <label title="Use the words I know least from my list"><input type="checkbox" id="ws-words" ${a.useWords ? 'checked' : ''}> My words</label></div>
      ${section('pk-topics', 'Topics', topics, `${selRow('topics')}<div class="chips2">${L.TOPICS.map((t) => chip('ws-topic', t, t, a.topics.includes(t))).join('')}</div>
        <div class="inner"><label class="f" style="margin-top:4px">Your own topics</label><textarea id="ws-custom" class="own-topics" rows="3" spellcheck="false" placeholder="e.g. cycling, my cat, the dentist (separate with commas or new lines)">${esc(a.custom)}</textarea></div>`)}
      ${section('pk-gram', 'Grammar', grammar, `${selRow('grammar')}<div class="chips2">${GRAMMAR_CHOICES.map((k) => chip('ws-gram', k, L.SKILL_NAMES[k], a.grammar.includes(k))).join('')}</div>`)}
      ${section('pk-kinds', 'Exercise types', (a.kinds || []).map(kindName), `${selRow('kinds')}<div class="chips2">${KINDS.map(([k, n]) => chip('ws-kind', k, n, (a.kinds || []).includes(k))).join('')}</div><p class="muted" style="margin:8px 0 0;font-size:13px">Pick none for a good mix.</p>`)}
      <label class="f">Anything else?</label>
      <textarea id="ws-note" class="big-note" placeholder="A situation to practise (a phone call to the doctor), a style, things to avoid, how hard it should be...">${esc(a.note)}</textarea>
      <div class="row" style="margin-top:12px"><button class="primary" data-act="ws-copy">📋 Copy prompt for Claude</button><button class="ghost" data-act="ws-clear">Clear my choices</button></div></div>
    <div class="ws-side">
      <div class="card"><h2>2 · Paste Claude's reply</h2>
        <textarea id="ws-reply" class="big-paste" placeholder="Paste the whole reply here...">${esc(ui.askReply)}</textarea>
        <div class="row" style="margin-top:8px"><button class="primary" data-act="ws-make">Make my worksheet</button></div></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h2>My worksheets</h2>
        ${sheets.map((sh) => { const st = sheetState(sh); return `<div class="ws-row"><span class="t" title="${esc(sh.title)}">${esc(sh.title)}</span><span class="pill ${st.cls}">${esc(st.label)}</span><button class="primary" data-act="ws-open" data-id="${sh.id}">${sh.checkedAt ? 'Review' : 'Do it'}</button><button class="ghost" data-act="ws-arch" data-id="${sh.id}" title="Archive (hide it, keep your progress)">📦</button><button class="ghost" data-act="ws-del" data-id="${sh.id}" title="Delete">🗑</button></div>`; }).join('') || `<p class="muted" style="margin:0">${archived.length ? 'All tidy! Your old worksheets are archived below.' : 'None yet. Your first one will show up here.'}</p>`}</div>
  ${archived.length ? `<div class="card" style="margin-top:16px"><h2 data-act="ws-showarch" style="cursor:pointer;margin:0">${ui.showArch ? '▾' : '▸'} Archived <span class="pill">${archived.length}</span></h2>${ui.showArch ? archived.map((sh) => `<div class="ws-row"><span class="t" title="${esc(sh.title)}">${esc(sh.title)}</span><button class="ghost" data-act="ws-open" data-id="${sh.id}">Review</button><button class="ghost" data-act="ws-arch" data-id="${sh.id}">↩ Restore</button><button class="ghost" data-act="ws-del" data-id="${sh.id}" title="Delete">🗑</button></div>`).join('') : ''}</div>` : ''}`;
}
// Update the counts and previews without redrawing the page (a redraw would flash).
function refreshPicked() {
  const a = askPrefs(), topics = a.topics.concat(ownTopics(a)), grammar = a.grammar.map((k) => L.SKILL_NAMES[k]);
  for (const [id, list] of [['pk-topics', topics], ['pk-gram', grammar], ['pk-kinds', (a.kinds || []).map(kindName)]]) {
    const n = $('#' + id + '-n'), pv = $('#' + id + '-pv');
    if (n) { n.textContent = list.length; n.className = 'pill ' + (list.length ? 'sky' : ''); }
    if (pv) pv.textContent = previewText(list);
  }
}
function toggleChip(el, list) {
  const a = askPrefs(), arr = a[list], i = arr.indexOf(el.dataset.v), on = i < 0;
  if (on) arr.push(el.dataset.v); else arr.splice(i, 1);
  el.classList.toggle('on', on); el.textContent = (on ? '✓ ' : '') + el.dataset.l;
  save(); refreshPicked();
}

// ---------- do one ----------
// the gap in a question ("___" or "m_____") glows so your eye goes straight to it
const glowBlanks = (html) => html.replace(/([A-Za-zÀ-ÿ]?)(_{2,})/g, '<span class="blank">$1$2</span>');
function hintHtml(q, it) { return glowBlanks(hintHtml0(q, it)); }
function hintHtml0(q) { return esc(q); } // questions are plain text: the dictionary is the help now
// An order question: drag the word tiles into the answer row (or tap them). Drag inside the row to reorder, drag back (or tap) to remove.
const orderSentence = (words, idx) => idx.map((i) => words[i]).reduce((s, w) => s + (/^[.,!?;:]+$/.test(w) ? '' : s ? ' ' : '') + w, '');
function orderTile(parts, it, i, locked) {
  const w = parts.words[i], h = null; // no translations on the tiles: the point is to work the order out yourself
  return `<span class="tile otile${h ? ' hw' + (h.known ? '' : ' unk') : ''}${locked ? ' lock' : ''}" ${locked ? '' : 'draggable="true"'} data-act="${locked ? '' : 'ord-tap'}" data-id="${it.id}" data-i="${i}"${h ? ` data-tip="${esc(h.tip)}"` : ''}>${esc(w)}</span>`;
}
function orderInner(it, parts, sh) {
  const placed = ((sh.orderIdx || {})[it.id] || []).filter((i) => i < parts.words.length), locked = !!sh.checkedAt;
  const left = parts.words.map((_, i) => i).filter((i) => !placed.includes(i));
  return `<div class="ozone ${placed.length ? '' : 'empty'}" data-zone="ans" data-id="${it.id}">${placed.length ? placed.map((i) => orderTile(parts, it, i, locked)).join('') : '<span class="ohint">Drag the words here, in the right order</span>'}</div>
    <div class="tiles obank" data-zone="bank" data-id="${it.id}">${left.map((i) => orderTile(parts, it, i, locked)).join('')}${left.length || locked ? '' : '<span class="muted tcount">All words used 🎉</span>'}${placed.length && !locked ? `<button class="ghost mini" data-act="ord-reset" data-id="${it.id}">↺ Start over</button>` : ''}</div>`;
}
function orderQ(it, typed) {
  const sh = sheetById(ui.sheetId), parts = L.orderParts(it.q);
  if (!parts || !sh) return `<div class="wsq">${hintHtml(it.q, it)}</div>`;
  sh.orderIdx = sh.orderIdx || {};
  return `<div class="wsq" style="margin-bottom:6px">${esc(parts.prefix || 'Put the words in order:')}</div><div class="oq" id="oq-${it.id}">${orderInner(it, parts, sh)}</div>`;
}
function orderSet(id, idx) {
  const sh = sheetById(ui.sheetId), it = sh && sh.items.find((x) => x.id === id), parts = it && L.orderParts(it.q); if (!parts || sh.checkedAt) return;
  sh.orderIdx = sh.orderIdx || {}; sh.orderIdx[id] = idx;
  const box = document.getElementById('oq-' + id); if (box) box.innerHTML = orderInner(it, parts, sh);
  const h = document.getElementById('wa-' + id);
  if (h) { h.value = orderSentence(parts.words, idx); h.dispatchEvent(new Event('input', { bubbles: true })); } else { sh.answers[id] = orderSentence(parts.words, idx); save(); }
}
const orderCur = (id) => { const sh = sheetById(ui.sheetId); return ((sh && sh.orderIdx && sh.orderIdx[id]) || []).slice(); };
let ODRAG = null;
document.addEventListener('dragstart', (e) => {
  const t = e.target.closest && e.target.closest('.otile[draggable="true"]'); if (!t) return;
  ODRAG = { id: t.dataset.id, i: +t.dataset.i }; t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.textContent);
});
document.addEventListener('dragend', () => { ODRAG = null; clearDropLine(); document.querySelectorAll('.dragging,.dropping').forEach((x) => x.classList.remove('dragging', 'dropping')); });
function orderAt(z, i, e) { // where in the answer row a drop at the pointer would go
  const tiles = [...z.querySelectorAll('.otile')].filter((t) => +t.dataset.i !== i); let at = tiles.length;
  for (let k = 0; k < tiles.length; k++) { const r = tiles[k].getBoundingClientRect(); if (e.clientY < r.top || (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2)) { at = k; break; } }
  return { at, tiles };
}
const clearDropLine = () => document.querySelectorAll('.dropline').forEach((x) => x.remove());
document.addEventListener('dragover', (e) => {
  const z = ODRAG && e.target.closest && e.target.closest('[data-zone]'); if (!z || z.dataset.id !== ODRAG.id) return;
  e.preventDefault(); document.querySelectorAll('.dropping').forEach((x) => x !== z && x.classList.remove('dropping')); z.classList.add('dropping');
  if (z.dataset.zone !== 'ans') return clearDropLine();
  const { at, tiles } = orderAt(z, ODRAG.i, e), ref = tiles[at] || null, cur = z.querySelector('.dropline');
  if (cur && (ref ? cur.nextElementSibling === ref : !cur.nextElementSibling || cur.nextElementSibling.classList.contains('ohint'))) return;
  clearDropLine(); const line = document.createElement('span'); line.className = 'dropline';
  if (ref) z.insertBefore(line, ref); else z.appendChild(line);
});
document.addEventListener('drop', (e) => {
  const z = ODRAG && e.target.closest && e.target.closest('[data-zone]'); if (!z || z.dataset.id !== ODRAG.id) return;
  e.preventDefault(); const { id, i } = ODRAG; ODRAG = null;
  let idx = orderCur(id).filter((x) => x !== i);
  if (z.dataset.zone === 'ans') {
    idx.splice(orderAt(z, i, e).at, 0, i);
  }
  orderSet(id, idx);
});

// ---------- Bigg cheers you on while you work ----------
const WS_SAY = {
  start: ['Take your time, I am right here. 🌸', 'One question at a time. 💗', 'Ready when you are! ✨', 'Stuck on a word? Click me and open my dictionary. 📖', 'I brought my dictionary, just in case. 📖'],
  answered: ['Nice one! ✨', 'Good answer! 🌱', 'You are doing well. 💗', 'Looks good to me! 🌸', 'Not sure about a word? My dictionary is right here. 📖', 'Look anything up in my dictionary, I do not mind. 📖'],
  half: ['Halfway there! 🌟', 'Half done already! ✨'],
  all: ['All answered! Press Check when you are ready. 🎉'],
  perfect: ['A perfect score! Well done! 🎉', 'Every single one right. Great work! 💗'],
  good: ['Great job, most of them were right! ⭐', 'Nicely done! 🌸'],
  low: ['Mistakes are how we learn. Let us go through them together. 💗', 'A few tricky ones. We will get them next time! 🌱'],
};
const WS_HARD = {
  start: ['Hard mode! No dictionary, just you. 💪', 'I left my dictionary at home. You have got this! 💪', 'No dictionary this time. I believe in you! 🔥'],
  answered: ['Look at you, no dictionary needed! 💪', 'Nice, and with no help at all! ✨', 'Strong answer! 🔥'],
};
function wsPickLine(k) {
  const sh = sheetById(ui.sheetId), hard = !!(sh && sh.hard); // hard mode: Bigg has no dictionary, so he never mentions it
  return rnd(hard ? WS_SAY[k].filter((x) => !/📖/.test(x)).concat(WS_HARD[k] || []) : WS_SAY[k]);
}
function wsCoach(sh) {
  const answered = sh.items.filter((it) => (sh.answers[it.id] || '').trim()).length;
  if (!ui.wsCoach || ui.wsCoach.id !== sh.id) ui.wsCoach = { id: sh.id, n: answered, line: wsPickLine('start'), act: 'in', played: false };
  return ui.wsCoach;
}
// Bigg's reaction when one more question gets answered. Returns { line, act, burst }.
function wsMoment(answered, total) {
  if (answered === total) return { line: wsPickLine('all'), act: 'cheer', burst: '🎉' };
  if (answered === Math.ceil(total / 2)) return { line: wsPickLine('half'), act: 'wiggle', burst: '✨' };
  return { line: wsPickLine('answered'), act: rnd(['nod', 'hop', 'bounce', 'twirl', 'wave']), burst: rnd(['💗', '', '']) };
}
const wsAnswered = (sh) => sh.items.filter((it) => (sh.answers[it.id] || '').trim()).length;
function markDiff(text, against, cls) {
  const toks = String(text).split(/(\s+)/), norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ''), A = toks.filter((t) => t.trim()).map(norm), B = String(against || '').split(/\s+/).filter(Boolean).map(norm);
  const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Set(); let i = 0, j = 0;
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { keep.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  let w = -1;
  return toks.map((t) => { if (!t.trim()) return t; w++; return keep.has(w) || !A[w] ? esc(t) : `<u class="${cls}">${esc(t)}</u>`; }).join('');
}
function sheetPage(sh) {
  sh.answers = sh.answers || {}; sh.results = sh.results || {};
  const answered = sh.items.filter((it) => (sh.answers[it.id] || '').trim()).length, st = sheetState(sh), sc = L.sheetScore(sh);
  const pending = sh.items.filter((it) => (sh.results[it.id] || {}).verdict === 'unsure');
  const items = sh.items.map((it) => {
    const r = sh.results[it.id], mine = sh.answers[it.id] || '', checked = !!sh.checkedAt;
    let input;
    if (it.type === 'mc') input = `<div class="opts">${it.options.map((o) => `<button class="${mine === o ? 'sel' : ''} ${checked && r ? (o === it.answer ? 'ok' : mine === o ? 'no' : '') : ''}" data-act="ws-pick" data-id="${it.id}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    else if (it.type === 'order' && L.orderParts(it.q)) input = `<input type="hidden" id="wa-${it.id}" value="${esc(mine)}">`;
    else if (it.type === 'fill' || it.type === 'order') input = `<input type="text" class="big-in" style="text-align:left;font-size:18px" id="wa-${it.id}" value="${esc(mine)}" autocomplete="off" spellcheck="false" placeholder="${it.type === 'order' ? 'Write the sentence in the right order' : 'Your answer'}">`;
    else input = `<textarea id="wa-${it.id}" style="min-height:${it.type === 'write' ? 90 : 54}px" spellcheck="false" placeholder="${it.type === 'write' ? 'Write your sentences here' : 'Your answer'}">${esc(mine)}</textarea>`;
    let res = '';
    if (checked && r) {
      const [ic, lab] = VERDICT[r.verdict] || ['?', ''];
      const bad = r.verdict !== 'right' && r.verdict !== 'blank', ans = r.correct || it.answer || '', alts = !r.correct && it.alt && it.alt.length ? it.alt : [], why = r.explain || it.why || '', tr = r.tr || it.tr || '';
      const row = (label, body, cls) => `<div class="v-row"><span class="v-label">${label}</span><div class="v-text ${cls || ''}">${body}</div></div>`;
      res = `<div class="verdict ${r.verdict}"><div class="v-head"><b class="v-title">${ic} ${lab}</b>${r.by ? `<small class="muted">checked by ${r.by === 'claude' ? 'Claude' : 'you'}</small>` : ''}</div>
        ${bad && mine.trim() && r.verdict !== 'unsure' ? row('You wrote', it.type === 'correct' && ans ? markDiff(mine, ans, 'badu') : esc(mine), 'mine') : ''}
        ${bad && ans ? row(r.verdict === 'unsure' ? 'Model answer' : 'Answer', it.type === 'correct' ? markDiff(ans, it.q, 'fixu') : esc(ans), 'ans') : ''}
        ${bad && alts.length ? row('Also fine', `<ul class="v-alts">${alts.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`) : ''}
        ${tr && r.verdict !== 'blank' ? row('In English', esc(tr), 'tr') : ''}
        ${why ? `<div class="v-why"><span>💡</span><span>${esc(why)}</span></div>` : ''}
        ${r.verdict === 'unsure' ? `<div class="v-self"><span class="v-ask">Did you get it right?</span><button class="ghost" data-act="ws-self" data-id="${it.id}" data-v="right">I got it ✓</button><button class="ghost" data-act="ws-self" data-id="${it.id}" data-v="wrong">Not quite ✗</button></div>` : ''}</div>`;
    }
    return `<div class="card wsitem"><div class="row"><b class="wsnum">${it.id}</b><span class="pill sky">${esc(skillName(it.skill))}</span><span class="pill">${TYPE_LABEL[it.type]}</span></div>
      ${it.type === 'order' ? orderQ(it, mine) : `<div class="wsq">${hintHtml(it.q, it)}</div>`}${it.clue ? `<div class="wsclue"><span>In English</span> ${esc(it.clue)}</div>` : ''}${input}${res}</div>`;
  }).join('<div style="height:12px"></div>');
  const fb = sh.summary ? `<div class="card upd" style="margin-top:16px"><h2>What to improve 🌸</h2>${sh.summary.good ? `<p>${esc(sh.summary.good)}</p>` : ''}
      ${sh.summary.improve.length ? `<ul>${sh.summary.improve.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${sh.summary.next ? `<p class="muted">Next time: ${esc(sh.summary.next)}</p>` : ''}
      <button class="primary" data-act="ws-next" data-id="${sh.id}">Make my next worksheet from this</button></div>` : '';
  const claude = sh.checkedAt ? `<div class="card" id="ws-claude-card" style="margin-top:16px"><h2>Ask Claude to mark it</h2>
      <p class="muted">${pending.length ? `${pending.length} item${pending.length === 1 ? '' : 's'} need Claude to judge (translations, rewrites, writing). ` : 'Everything is marked already. '}Claude can also write you a summary of what to improve.</p>
      <div class="row" style="margin-bottom:10px"><button class="switch ${S.explainAll ? 'on' : ''}" role="switch" aria-checked="${!!S.explainAll}" data-act="ws-explain-all" title="Claude explains why each wrong answer was wrong, shown next to it on the worksheet"><i></i>💬 Explain my wrong answers</button></div>
      <div class="row"><button class="primary" data-act="ws-copy-check" data-id="${sh.id}">📋 Copy for Claude</button><button class="ghost" data-act="ws-self-top">👀 I'll check it myself</button></div>
      <textarea id="ws-fb" style="margin-top:10px" placeholder="Paste Claude's whole reply here...">${esc(ui.fbText)}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="ws-apply" data-id="${sh.id}">Apply Claude's marking</button></div></div>` : '';
  const wc = wsCoach(sh), coachBar = `<div class="coach ws-coach">${pigSvg('happy', wc.played ? '' : 'act-' + wc.act, { stage: pigStage(), book: !sh.hard })}<div class="cbub"><span>${esc(wc.line)}</span></div>${sh.hard ? '' : '<button class="ghost mini dp-open" data-act="dp-toggle" title="Look a word up while you work">📖 Dictionary</button>'}</div>`;
  wc.played = true;
  return `${coachBar}<div class="top"><div><button class="ghost" data-act="ws-back">← All worksheets</button><h2 style="margin:12px 0 0;font-size:28px;font-weight:900">${esc(sh.title)}</h2><p class="sub">${answered} of ${sh.items.length} answered${sh.checkedAt ? ` · ${sc.got % 1 ? sc.got.toFixed(2).replace(/0$/, '') : sc.got} of ${sc.marked} marked right` : ''}</p></div><span class="pill ${st.cls}">${esc(st.label)}</span></div>
    <div class="row hardrow"><button class="switch ${sh.hard ? 'on' : ''}" role="switch" aria-checked="${!!sh.hard}" data-act="ws-hard" title="Bigg leaves his dictionary at home. Right answers give 50% more XP."><i></i>🔥 Hard mode <small>no dictionary · +50% XP</small></button>
      <span class="muted tipnote">${sh.hard ? 'No dictionary this time. Good luck! 💪' : 'Click Bigg to open his dictionary whenever you need it. 📖'}</span></div>
    ${items}
    <div class="row" style="margin:18px 0 0"><button class="primary" data-act="ws-check">${sh.checkedAt ? '🔄 Check again' : '✅ Check my answers'}</button><span class="muted">Choose and fill-in items are marked right away. Nothing is sent anywhere.</span></div>
    ${fb}${claude}`;
}

// ---------- mistakes ----------
function mistakesTab() {
  const all = Object.entries(S.skills || {}).filter(([, s]) => s.hist && s.hist.length).map(([skill, s]) => {
    const total = s.hist.length, wrong = s.hist.filter((x) => !x).length, recent = s.hist.slice(-10), older = s.hist.slice(0, -10);
    const acc = (total - wrong) / total, racc = recent.reduce((a, b) => a + b, 0) / recent.length, oacc = older.length ? older.reduce((a, b) => a + b, 0) / older.length : null;
    return { skill, s, total, wrong, acc, trend: oacc == null ? '' : racc > oacc + 0.1 ? '↗ improving' : racc < oacc - 0.1 ? '↘ slipping' : '→ steady' };
  }).sort((a, b) => a.acc - b.acc || b.wrong - a.wrong);
  if (!all.length) return `<div class="empty">${pigSvg('happy', '', { stage: pigStage(), note: true })}<p>Nothing tracked yet. Do a practice worksheet and I'll keep score. 🌸</p><button class="primary" data-act="ws-tab" data-t="practice">Make a worksheet</button></div>`;
  return `<div class="row" style="margin-bottom:14px"><button class="primary" data-act="ws-from-weak">✨ Worksheet from my weak spots</button></div>
    <div class="grid g2">${all.map((x) => `<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(skillName(x.skill))}</h2><span class="pill ${x.acc >= 0.8 ? 'mint' : x.acc >= 0.5 ? 'butter' : 'bad'}">${Math.round(x.acc * 100)}%</span></div>
      <div class="bar" style="margin:8px 0"><i style="width:${Math.round(x.acc * 100)}%"></i></div>
      <p class="muted" style="margin:0">Missed ${x.wrong} of your last ${x.total}${x.trend ? ' · ' + x.trend : ''}${x.s.last ? ' · last ' + esc(x.s.last) : ''}</p>
      ${x.s.examples && x.s.examples.length ? `<details style="margin-top:8px"><summary>Recent mistakes</summary>${x.s.examples.slice(0, 4).map((e) => `<div class="ex-row"><div class="muted">${esc(e.q || '')}</div><div>You wrote: <span class="bad-t">${esc(e.yours || '(blank)')}</span></div><div>Better: <b class="ok-t">${esc(e.correct || '')}</b></div>${e.note ? `<div class="muted">${esc(e.note)}</div>` : ''}</div>`).join('')}</details>` : ''}
      <button class="ghost" style="margin-top:10px" data-act="ws-skill-clear" data-k="${esc(x.skill)}">Reset this skill</button></div>`).join('')}</div>`;
}

// ---------- actions ----------
const readField = (id) => ($('#' + id) || {}).value || '';
function recordResult(sh, it, r, example) {
  if (r.recorded) return;
  r.recorded = true;
  gainXp(Math.round(({ right: XP.itemRight, close: XP.itemClose, partly: XP.itemPartly, wrong: XP.itemWrong }[r.verdict] || 0) * (sh.hard ? 1.5 : 1))); // hard mode: +50%
  if (['right', 'close'].includes(r.verdict)) bumpDay('sOk'); else if (['wrong', 'partly'].includes(r.verdict)) { bumpDay('sMiss'); if (it.word) noteMiss(it.word, 'sheet'); }
  const ex = { q: it.q, yours: (sh.answers[it.id] || '').trim(), correct: r.correct || it.answer, note: r.explain || it.why };
  if (r.verdict === 'right') L.recordOutcome(S.skills, it.skill, true, null, today());
  else if (r.verdict === 'close') { L.recordOutcome(S.skills, it.skill, true, null, today()); L.recordOutcome(S.skills, 'spelling', false, ex, today()); }
  else if (r.verdict === 'wrong' || r.verdict === 'partly') {
    const ks = r.skills && r.skills.length ? r.skills : [it.skill];
    ks.forEach((k) => L.recordOutcome(S.skills, k, false, ex, today()));
    if (!ks.includes(it.skill) && r.by !== 'claude') L.recordOutcome(S.skills, it.skill, false, ex, today());
  }
}
Object.assign(ACT, {
  'ws-tab': (el) => { ui.wsTab = el.dataset.t; ui.sheetId = ui.wsTab === 'practice' ? ui.sheetId : ''; render(); },
  'ws-back': () => { ui.sheetId = ''; ui.fbText = ''; render(); },
  'ws-open': (el) => { ui.sheetId = el.dataset.id; ui.fbText = ''; render(); $('#main').scrollTop = 0; },
  'ws-arch': (el) => { const sh = sheetById(el.dataset.id); if (!sh) return; sh.archived = !sh.archived; save(); toast(sh.archived ? 'Archived 📦' : 'Restored'); render(); },
  'ws-showarch': () => { ui.showArch = !ui.showArch; render(); },
  'ws-del': (el) => { S.sheets = S.sheets.filter((s) => s.id !== el.dataset.id); save(); render(); },
  'ws-copy': () => {
    const a = askPrefs(); a.count = +readField('ws-count') || 12; a.weak = $('#ws-weak').checked; a.useWords = $('#ws-words').checked; a.note = readField('ws-note').trim(); save();
    const words = a.useWords ? liveWords().slice().sort((x, y) => x.box - y.box).slice(0, 30) : [];
    copyText(L.sheetPrompt({ count: a.count, topics: a.topics.concat(ownTopics(a)), grammar: a.grammar, kinds: a.kinds || [], words, weak: a.weak ? L.weakSkills(S.skills, 3) : [], note: a.note }));
  },
  'ws-selall': (el) => {
    const k = el.dataset.k, on = !!el.dataset.on, a = askPrefs(), all = k === 'topics' ? L.TOPICS : k === 'kinds' ? KINDS.map((x) => x[0]) : GRAMMAR_CHOICES;
    a[k] = on ? all.slice() : [];
    const box = el.closest('details.pick');
    if (box) box.querySelectorAll('.chip').forEach((c) => { c.classList.toggle('on', on); c.textContent = (on ? '✓ ' : '') + c.dataset.l; });
    save(); refreshPicked();
  },
  'ws-preset-save': () => {
    const name = readField('ws-preset-name').trim(); if (!name) return toast('Give this setup a name first.');
    const a = askPrefs(); a.count = +readField('ws-count') || a.count; a.weak = $('#ws-weak').checked; a.useWords = $('#ws-words').checked; a.note = readField('ws-note').trim(); a.custom = readField('ws-custom');
    const snap = JSON.parse(JSON.stringify({ count: a.count, weak: a.weak, useWords: a.useWords, topics: a.topics, custom: a.custom, grammar: a.grammar, kinds: a.kinds || [], note: a.note }));
    const old = (S.presets || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (old) old.prefs = snap; else S.presets.push({ id: L.uid(), name, prefs: snap });
    save(); toast('Saved setup: ' + name); render();
  },
  'ws-preset-use': () => { const x = (S.presets || []).find((y) => y.id === readField('ws-preset')); if (!x) return toast('Pick a saved setup first.'); S.askPrefs = Object.assign({}, askPrefs(), JSON.parse(JSON.stringify(x.prefs))); save(); toast('Using: ' + x.name); render(); },
  'ws-preset-del': () => { const id = readField('ws-preset'), x = (S.presets || []).find((y) => y.id === id); if (!x) return toast('Pick a saved setup first.'); S.presets = S.presets.filter((y) => y.id !== id); save(); toast('Deleted: ' + x.name); render(); },
  'ws-hard': () => {
    const sh = sheetById(ui.sheetId); if (!sh) return;
    if (sh.checkedAt || wsAnswered(sh) > 0) return toast('Hard mode can only be switched before you answer the first question.');
    sh.hard = !sh.hard; save(); toast(sh.hard ? 'Hard mode on: no dictionary, +50% XP 🔥' : 'Hard mode off'); ui.wsCoach = null; if (sh.hard) { ui.dpOpen = false; dpDraw(false); } render();
  },
  'q-hard': () => { const q = quickPrefs(); q.hard = !q.hard; save(); render(); },
  'ws-topic': (el) => toggleChip(el, 'topics'),
  'ws-gram': (el) => toggleChip(el, 'grammar'),
  'ws-kind': (el) => { askPrefs().kinds = askPrefs().kinds || []; toggleChip(el, 'kinds'); },
  'ws-clear': () => { const a = askPrefs(); a.topics = []; a.grammar = []; a.kinds = []; a.custom = ''; a.note = ''; save(); render(); },
  'ws-make': () => {
    const text = readField('ws-reply'); ui.askReply = text;
    if (!text.trim()) return toast('Paste Claude\'s reply first');
    const r = L.parseSheet(text);
    if (r.error) { toast(r.error); return render(); }
    const sh = Object.assign(r.sheet, { id: L.uid(), created: Date.now(), answers: {}, results: {} });
    S.sheets.push(sh); ui.askReply = ''; ui.sheetId = sh.id; save();
    toast(`Worksheet ready: ${sh.items.length} items${sh.skipped ? ` (${sh.skipped} unusable skipped)` : ''}`); render(); $('#main').scrollTop = 0;
  },
  'ws-pick': (el) => { const sh = sheetById(ui.sheetId); sh.answers[el.dataset.id] = el.dataset.v; save(); const k = $('#main').scrollTop; render(); $('#main').scrollTop = k; },
  'ws-check': () => {
    const sh = sheetById(ui.sheetId); let first = !sh.checkedAt;
    for (const it of sh.items) {
      const prev = sh.results[it.id];
      if (prev && prev.by) continue; // Claude's or your own marking stays
      const m = L.autoMark(it, sh.answers[it.id]);
      const r = Object.assign(prev && prev.recorded ? prev : {}, { verdict: m.verdict });
      sh.results[it.id] = r;
      if (m.final && m.verdict !== 'blank') recordResult(sh, it, r);
    }
    sh.checkedAt = sh.checkedAt || Date.now(); save();
    if (first) { count('sheets'); chime('ok'); }
    const pend = sh.items.filter((it) => sh.results[it.id].verdict === 'unsure').length;
    ui.say = rnd(PIG.right); toast(pend ? `Marked! ${pend} item${pend === 1 ? '' : 's'} need Claude or a self-check.` : 'All marked! Great work! 💗'); render();
  },
  'ws-self-top': () => { $('#main').scrollTo({ top: 0, behavior: 'smooth' }); },
  'ord-tap': (el) => {
    const id = el.dataset.id, i = +el.dataset.i, idx = orderCur(id);
    orderSet(id, idx.includes(i) ? idx.filter((x) => x !== i) : idx.concat(i));
  },
  'ord-reset': (el) => orderSet(el.dataset.id, []),
  'ws-self': (el) => {
    const sh = sheetById(ui.sheetId), it = sh.items.find((x) => x.id === el.dataset.id);
    const r = sh.results[it.id]; r.verdict = el.dataset.v; r.by = 'self'; recordResult(sh, it, r); save(); const k = $('#main').scrollTop; render(); $('#main').scrollTop = k;
  },
  'ws-explain-all': () => { S.explainAll = !S.explainAll; save(); render(); },
  'ws-copy-check': (el) => { const sh = sheetById(el.dataset.id); copyText(L.checkPrompt(sh, { explainAll: !!S.explainAll })); },
  'ws-apply': (el) => {
    const sh = sheetById(el.dataset.id), text = readField('ws-fb'); ui.fbText = text;
    if (!text.trim()) return toast('Paste Claude\'s reply first');
    const f = L.parseFeedback(text, sh);
    if (f.error) { toast(f.error); return render(); }
    let n = 0, n2 = 0;
    for (const [id, fr] of Object.entries(f.results)) {
      const it = sh.items.find((x) => x.id === id), prev = sh.results[id] || {};
      if (prev.verdict && prev.verdict !== 'unsure' && prev.verdict !== 'blank' && !prev.by) { // the app already marked this one for sure: keep its verdict, but take Claude's explanation
        if (fr.explain) { prev.explain = fr.explain; n2++; } if (fr.tr && !prev.tr) prev.tr = fr.tr; continue;
      }
      const r = Object.assign(prev, { verdict: fr.verdict, correct: fr.correct, explain: fr.explain, tr: fr.tr || prev.tr, skills: fr.skills, by: 'claude' });
      sh.results[id] = r; recordResult(sh, it, r); n++; // recordResult skips anything already counted
    }
    sh.summary = f.summary; ui.fbText = ''; save(); chime('goal'); toast(`Applied Claude's marking${n ? ` to ${n} item${n === 1 ? '' : 's'}` : ''}${n2 ? `${n ? ' and' : ' with'} ${n2} explanation${n2 === 1 ? '' : 's'}` : ''}`); render();
  },
  'ws-next': (el) => { const sh = sheetById(el.dataset.id), a = askPrefs(); a.note = (sh.summary && sh.summary.next) || ''; a.weak = true; save(); ui.sheetId = ''; render(); },
  'ws-from-weak': () => { askPrefs().weak = true; ui.wsTab = 'practice'; ui.sheetId = ''; render(); },
  'ws-skill-clear': (el) => { delete S.skills[el.dataset.k]; save(); render(); },
});
// remember what is typed without re-rendering on every key
document.addEventListener('input', (e) => {
  const t = e.target, id = t.id || '';
  if (id.startsWith('wa-')) { const sh = sheetById(ui.sheetId); if (sh) { sh.answers[id.slice(3)] = t.value; save(); } }
  else if (id === 'ws-reply') ui.askReply = t.value;
  else if (id === 'ws-note') { askPrefs().note = t.value; save(); }
  else if (id === 'ws-custom') { askPrefs().custom = t.value; save(); refreshPicked(); }
  else if (id === 'ws-fb') ui.fbText = t.value;
});
// remember which pickers are open, so a redraw keeps them open
document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.classList && d.classList.contains('pick')) ui.pickOpen[d.id] = d.open; }, true);
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'ws-count') { askPrefs().count = +e.target.value; save(); } else if (id === 'ws-weak') { askPrefs().weak = e.target.checked; save(); } else if (id === 'ws-words') { askPrefs().useWords = e.target.checked; save(); }
});

// Bigg reacts to answers and to marking
(() => {
  const basePick = ACT['ws-pick'], baseCheck = ACT['ws-check'];
  ACT['ws-pick'] = (el) => {
    const sh = sheetById(ui.sheetId), had = !!(sh.answers[el.dataset.id] || '').trim(), c = wsCoach(sh);
    if (!had) { const mo = wsMoment(wsAnswered(sh) + 1, sh.items.length); Object.assign(c, { line: mo.line, act: mo.act, played: false, n: wsAnswered(sh) + 1 }); setTimeout(() => mo.burst && burstBits(mo.burst), 60); }
    basePick(el);
  };
  ACT['ws-check'] = () => {
    const sh = sheetById(ui.sheetId), first = !sh.checkedAt; baseCheck(); if (first) gainXp(XP.sheet * (sh.hard ? 2 : 1));
    const sc = L.sheetScore(sh), r = sc.marked ? sc.got / sc.marked : 0, c = wsCoach(sh);
    const k = r >= 0.99 ? 'perfect' : r >= 0.7 ? 'good' : 'low';
    Object.assign(c, { line: wsPickLine(k), act: k === 'perfect' ? 'spin' : k === 'good' ? 'cheer' : 'sway', played: false });
    render(); { const cc = document.getElementById('ws-claude-card'); if (cc) cc.scrollIntoView({ block: 'center', behavior: 'smooth' }); } setTimeout(() => { burstBits(k === 'perfect' ? '🎉' : k === 'good' ? '⭐' : '💗'); if (k === 'perfect') confetti(); }, 80);
  };
  const baseSelf = ACT['ws-self'];
  ACT['ws-self'] = (el) => {
    if (el.classList.contains('picked')) return;
    el.classList.add('picked'); el.closest('.v-self').classList.add('chose-' + el.dataset.v);
    burstBits(el.dataset.v === 'right' ? '✨' : '💗');
    setTimeout(() => baseSelf(el), 450);
  };
  document.addEventListener('input', (e) => { // typing an answer: Bigg reacts in place
    const id = e.target.id || ''; if (!id.startsWith('wa-')) return;
    const sh = sheetById(ui.sheetId); if (!sh) return;
    const c = wsCoach(sh), n = wsAnswered(sh);
    if (n > c.n) { const mo = wsMoment(n, sh.items.length); c.n = n; c.line = mo.line; c.act = mo.act; c.played = true; coachSay(mo.line, mo.act, mo.burst); }
    else if (n < c.n) c.n = n;
  });
})();


// ---------- Bigg's dictionary: opens next to the worksheet so you can look words up while you work ----------
ui.dpQ = ui.dpQ || ''; ui.dpLang = ui.dpLang || 'nl'; // which language you are searching in
function dpResults() {
  if (typeof DICT === 'undefined') return '<div class="empty">Loading the dictionary...</div>';
  const q = ui.dpQ.trim(), en = ui.dpLang === 'en'; if (!q) return en ? '<div class="empty">Type an English word to find the Dutch for it.</div>' : '<div class="empty">Type a Dutch word. Plurals and past tenses work too (huizen, ging).</div>';
  const res = L.dictSearch(DICT, dictIndex(), q, 40).filter((x) => (x.how === 'english') === en).slice(0, 12); if (!res.length) return '<div class="empty">' + (en ? 'No Dutch word found for that.' : 'Nothing found for that word.') + '</div>';
  return res.map(({ e, how }) => `<div class="dp-item"><div class="dp-top"><span><b>${e[2] === 'de' || e[2] === 'het' ? `<span class="art-${e[2]}">${e[2]}</span> ` : ''}${esc(e[0])}</b> <small class="muted">${esc(L.POS_NAMES[e[1]] || '')}${how === 'form' ? ' · form of this word' : how === 'english' ? ' · English match' : ''}</small></span>${haveWord(e[0]) ? '<span class="have">✓ In My words</span>' : `<button class="primary mini" data-act="dp-add" data-w="${esc(e[0])}" data-t="${e[1]}">+ Add</button>`}</div><div class="dp-mean">${esc(dictMean(e).mean)}</div>${dictMean(e).note ? `<small class="muted">${esc(dictMean(e).note)}</small><br>` : ''}${formsLine(e) ? `<small class="muted">${esc(formsLine(e))}</small>` : ''}</div>`).join('');
}
function dpPanel() {
  let el = document.getElementById('dp-panel');
  if (!el) { el = document.createElement('div'); el.id = 'dp-panel'; document.body.appendChild(el); }
  return el;
}
function dpDraw(focus) {
  const el = dpPanel(); el.classList.toggle('show', !!ui.dpOpen);
  if (!ui.dpOpen) return;
  el.innerHTML = `<div class="dp-head"><b>📖 Bigg's dictionary</b><button class="ghost mini" data-act="dp-toggle" title="Close (Esc)">✕</button></div>
    <div class="seg dp-seg" role="group"><button class="${ui.dpLang === 'nl' ? 'on' : ''}" data-act="dp-lang" data-v="nl">Dutch → English</button><button class="${ui.dpLang === 'en' ? 'on' : ''}" data-act="dp-lang" data-v="en">English → Dutch</button></div>
    <input type="text" id="dp-q" placeholder="${ui.dpLang === 'en' ? 'Type an English word...' : 'Type a Dutch word...'}" value="${esc(ui.dpQ)}" autocomplete="off" spellcheck="false"><div class="dp-res" id="dp-res">${dpResults()}</div>`;
  if (typeof DICT === 'undefined') loadData('dict').then(() => { if (ui.dpOpen) { const r = document.getElementById('dp-res'); if (r) r.innerHTML = dpResults(); } }).catch(() => {});
  if (focus) { const i = document.getElementById('dp-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}
Object.assign(ACT, {
  'dp-lang': (el) => { ui.dpLang = el.dataset.v; dpDraw(true); },
  'dp-toggle': () => { const sh = sheetById(ui.sheetId); if (sh && sh.hard) return toast('Hard mode: no dictionary this time 💪'); ui.dpOpen = !ui.dpOpen; dpDraw(true); },
  'dp-add': async (el) => { await ACT['dict-add'](el); dpDraw(false); },
});
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.ws-coach svg.pig')) ACT['dp-toggle'](); });
document.addEventListener('input', (e) => { if (e.target.id === 'dp-q') { ui.dpQ = e.target.value; const r = document.getElementById('dp-res'); if (r) r.innerHTML = dpResults(); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.dpOpen && !document.querySelector('.dd-list.show')) { ui.dpOpen = false; dpDraw(false); } });
(() => { // the dictionary belongs to the worksheet page: it closes when you leave it
  const base = render;
  render = function () { base.apply(this, arguments); if (ui.dpOpen && !(ui.view === 'sheets' && ui.sheetId && sheetById(ui.sheetId))) { ui.dpOpen = false; dpDraw(false); } };
})();
// clicking anywhere outside the dictionary closes it (Bigg and his Dictionary button toggle it themselves)
document.addEventListener('mousedown', (e) => {
  if (!ui.dpOpen || !e.target.closest) return;
  if (e.target.closest('#dp-panel') || e.target.closest('.ws-coach svg.pig') || e.target.closest('.dp-open') || e.target.closest('.dd-list') || e.target.closest('input, textarea, select, .dd-btn')) return;
  ui.dpOpen = false; dpDraw(false);
});
