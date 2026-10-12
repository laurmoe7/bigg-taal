// Practice worksheets: Claude makes them (copy a prompt to chat, paste the JSON reply back), you do them in the app,
// the app marks what it can, Claude marks the rest, and every result feeds a running record of your weak spots.
// Loads after app.js and shares its scope.
S.sheets = S.sheets || []; S.skills = S.skills || {};
Object.assign(ui, { wsTab: 'practice', sheetId: '', askReply: '', fbText: '' });
// What to ask Claude for (remembered between visits): how many items, topics, grammar, weak spots, your own words.
const askPrefs = () => (S.askPrefs = Object.assign({ count: 12, weak: true, useWords: true, topics: [], custom: '', grammar: [], note: '' }, S.askPrefs || {}));
const ownTopics = (a) => String(a.custom || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const previewText = (list) => (list.length ? list.slice(0, 3).join(', ') + (list.length > 3 ? ' +' + (list.length - 3) : '') : 'none picked: a mix');
Object.assign(ui, { pickOpen: {} });
const GRAMMAR_CHOICES = L.SKILLS.filter((k) => k !== 'other');

const sheetById = (id) => S.sheets.find((s) => s.id === id);
const TYPE_LABEL = { mc: 'Choose', fill: 'Fill in', order: 'Put in order', translate: 'Translate', correct: 'Find the mistake', write: 'Write' };
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
async function makeQuickSheet(pool, types, count, title) {
  try { await Promise.all([loadData('dict'), loadData('sentences')]); } catch { return toast('Could not load the dictionary data.'); }
  const idx = await sentenceData();
  const sheet = L.buildLocalSheet({ pool, types, count, dict: DICT, dix: dictIndex(), sentences: SENTENCES, six: idx });
  if (!sheet) return toast(pool.length ? 'Could not make questions from those words. Try more question types or word groups.' : 'No words match that yet. Try "Any of my words".');
  sheet.title = (title || 'Quick practice') + ' (' + sheet.items.length + ' items)';
  sheet.id = L.uid(); sheet.created = Date.now(); sheet.answers = {}; sheet.results = {}; S.sheets.push(sheet); ui.sheetId = sheet.id; ui.wsTab = 'practice'; save();
  toast('Worksheet ready: ' + sheet.items.length + ' items'); render(); $('#main').scrollTop = 0;
}
const quickPrefs = () => (S.quickPrefs = Object.assign({ count: 12, recent: true, trouble: true, mine: false, common: false, types: L.LOCAL_TYPES.map((t) => t[0]) }, S.quickPrefs || {}));
function quickTab() {
  const q = quickPrefs(), live = liveWords(), td = today();
  const nRecent = L.recentWords(live, td, 7).length, nTrouble = L.troubleWords(live).length;
  const src = (k, label, n, tip) => `<button class="chip ${q[k] ? 'on' : ''}" data-act="q-src" data-v="${k}" title="${tip}">${q[k] ? '✓ ' : ''}${label}${n == null ? '' : ' <small>' + n + '</small>'}</button>`;
  return `<div class="top"><div><h1>Quick practice</h1><p class="sub">Worksheets made right here from the dictionary and real sentences. No copy and paste.</p></div></div>
  <div class="card" style="max-width:760px"><h2>Which words?</h2>
    <div class="chips2">${src('recent', '🌱 Recently learned', nRecent, 'Words you started or reviewed in the last 7 days')}${src('trouble', '🎯 Words I find hard', nTrouble, 'Words you have missed or still rate low')}${src('mine', '📚 Any of my words', live.length, 'A random mix from your whole list')}${src('common', '💡 New common words', null, 'Common Dutch words you do not have yet (top 1,500)')}</div>
    <h2 style="margin-top:16px">What kind of questions?</h2>
    <div class="chips2">${L.LOCAL_TYPES.map(([id, name]) => `<button class="chip ${q.types.includes(id) ? 'on' : ''}" data-act="q-type" data-v="${id}">${q.types.includes(id) ? '✓ ' : ''}${name}</button>`).join('')}</div>
    <div class="row" style="margin-top:16px"><label class="muted">Items <select id="q-count">${[8, 12, 16, 20].map((n) => `<option ${q.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
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
    await makeQuickSheet(pool, q.types, q.count, 'Quick practice');
  },
});

VIEWS.sheets = () => {
  const tab = (id, label) => `<button class="tab ${ui.wsTab === id ? 'on' : ''}" data-act="ws-tab" data-t="${id}">${label}</button>`;
  const head = `<div class="tabs">${tab('quick', '⚡ Quick practice')}${tab('practice', '✨ Practice with Claude')}${tab('mistakes', '🎯 My mistakes')}</div>`;
  if (ui.wsTab === 'quick') return head + quickTab();
  if (ui.wsTab === 'mistakes') return head + mistakesTab();
  const open = sheetById(ui.sheetId);
  return head + (open ? sheetPage(open) : practiceHome());
};

// ---------- make one ----------
function practiceHome() {
  ensureSheetData();
  const a = askPrefs(), weak = L.weakSkills(S.skills, 3), topics = a.topics.concat(ownTopics(a)), grammar = a.grammar.map((k) => L.SKILL_NAMES[k]);
  const sheets = S.sheets.slice().sort((x, y) => y.created - x.created);
  const chip = (act, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" data-l="${esc(label)}">${on ? '✓ ' : ''}${esc(label)}</button>`;
  const selRow = (k) => `<div class="row sel-row"><button class="ghost mini" data-act="ws-selall" data-k="${k}" data-on="1">Select all</button><button class="ghost mini" data-act="ws-selall" data-k="${k}" data-on="">Deselect all</button></div>`;
  const section = (id, title, list, body) => `<details class="pick" id="${id}" ${ui.pickOpen[id] ? 'open' : ''}><summary><b>${title}</b><span class="pill ${list.length ? 'sky' : ''}" id="${id}-n">${list.length}</span><span class="muted pv" id="${id}-pv">${esc(previewText(list))}</span></summary>${body}</details>`;
  return `<div class="top"><div><h1>Worksheets</h1><p class="sub">Claude writes it, you do it here, Claude marks it.</p></div></div>
  <div class="ws-grid">
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
        ${sheets.map((sh) => { const st = sheetState(sh); return `<div class="ws-row"><span class="t" title="${esc(sh.title)}">${esc(sh.title)}</span><span class="pill ${st.cls}">${esc(st.label)}</span><button class="primary" data-act="ws-open" data-id="${sh.id}">${sh.checkedAt ? 'Review' : 'Do it'}</button><button class="ghost" data-act="ws-del" data-id="${sh.id}" title="Delete">🗑</button></div>`; }).join('') || '<p class="muted" style="margin:0">None yet. Your first one will show up here.</p>'}</div>`;
}
// Update the counts and previews without redrawing the page (a redraw would flash).
function refreshPicked() {
  const a = askPrefs(), topics = a.topics.concat(ownTopics(a)), grammar = a.grammar.map((k) => L.SKILL_NAMES[k]);
  for (const [id, list] of [['pk-topics', topics], ['pk-gram', grammar]]) {
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
// ---------- hover hints: what the Dutch words in a question mean ----------
// Easy little words are skipped. Words you do not have in your list yet get a dotted underline ("might be new"); words you know are explained too, just without the underline.
const HINT_SKIP = new Set('de het een ik jij je we wij ze zij hij u en of is zijn ben bent heb hebt heeft hebben wordt worden was waren naar met van voor bij aan op in om te niet geen maar ook dan nog als dat die dit deze er mijn jouw uw ons onze hun dus toch wel zo'.split(' '));
const DUTCH_MARKERS = new Set('ik je een het de niet heb hebt naar maar ook wat hoe waar mijn geen dat dit wij hij ze zij jij jullie voor bij is zijn'.split(' ').filter((w) => !['is', 'zijn'].includes(w)));
const looksDutch = (q) => (String(q).toLowerCase().match(/[a-zà-ÿ']+/g) || []).some((w) => DUTCH_MARKERS.has(w));
let HINT_KNOWN = null; // form -> word in your list, built once per page draw
function wordTip(tok) {
  const key = tok.toLowerCase(), own = HINT_KNOWN && HINT_KNOWN.get(key);
  if (own && own.en) return { tip: (own.article ? own.article + ' ' : '') + own.nl + ': ' + String(own.en).slice(0, 70), known: true };
  if (typeof DICT === 'undefined') return null;
  const rs = L.dictSearch(DICT, dictIndex(), key, 6).filter((x) => x.how === 'word' || x.how === 'form').slice(0, 2); if (!rs.length) return null;
  const fmt = (r) => { const e = r.e; return (e[2] === 'de' || e[2] === 'het' ? e[2] + ' ' : '') + e[0] + ': ' + e[4].split('; ').slice(0, 2).join('; ').slice(0, 60) + (r.how === 'form' && e[0].toLowerCase() !== key ? ' (form of ' + e[0] + ')' : ''); };
  return { tip: rs.map(fmt).join('  |  '), known: false };
}
const hintWord = (w, cls) => { const h = HINT_SKIP.has(w.toLowerCase()) || w.length < 3 ? null : wordTip(w); return h ? { h, html: `<span class="hw ${h.known ? '' : 'unk'} ${cls || ''}" data-tip="${esc(h.tip)}">${esc(w)}</span>` } : null; };
// the gap in a question ("___" or "m_____") glows so your eye goes straight to it
const glowBlanks = (html) => html.replace(/([A-Za-zÀ-ÿ]?)(_{2,})/g, '<span class="blank">$1$2</span>');
function hintHtml(q) { return glowBlanks(hintHtml0(q)); }
function hintHtml0(q) {
  if (!looksDutch(q)) return esc(q);
  return L.tokenize(String(q)).map((x, i, arr) => {
    if (!x.w) return esc(x.t);
    const blank = /^_/.test((arr[i + 1] || {}).t || '') || /_$/.test((arr[i - 1] || {}).t || ''); // the word being asked for ("m_____") never gets a hint
    const r = blank ? null : hintWord(x.w);
    return r ? r.html : esc(x.w);
  }).join('');
}
// An order question shows its words as tiles that light up as you type them.
function orderQ(it, typed) {
  const parts = L.orderParts(it.q);
  if (!parts) return `<div class="wsq">${hintHtml(it.q)}</div>`;
  const used = L.usedWords(parts.words, typed);
  return `<div class="wsq" style="margin-bottom:6px">${esc(parts.prefix || 'Put the words in order:')}</div>
    <div class="tiles ${used.every(Boolean) ? 'all' : ''}" id="tiles-${it.id}">${parts.words.map((w, i) => { const h = HINT_SKIP.has(w.toLowerCase()) || w.length < 3 ? null : wordTip(w.replace(/[.,!?;:]+$/, '')); return `<span class="tile ${used[i] ? 'used' : ''}${h ? ' hw' + (h.known ? '' : ' unk') : ''}"${h ? ` data-tip="${esc(h.tip)}"` : ''}>${esc(w)}</span>`; }).join('')}<span class="muted tcount" id="tc-${it.id}">${used.filter(Boolean).length} of ${used.length} used</span></div>`;
}
function lightTiles(id) {
  const sh = sheetById(ui.sheetId), box = $('#tiles-' + id), it = sh && sh.items.find((x) => x.id === id);
  if (!box || !it) return;
  const parts = L.orderParts(it.q); if (!parts) return;
  const used = L.usedWords(parts.words, sh.answers[id] || '');
  box.querySelectorAll('.tile').forEach((t, i) => t.classList.toggle('used', !!used[i]));
  box.classList.toggle('all', used.every(Boolean));
  const c = $('#tc-' + id); if (c) c.textContent = used.filter(Boolean).length + ' of ' + used.length + ' used';
}

// ---------- Bigg cheers you on while you work ----------
const WS_SAY = {
  start: ['Take your time, I believe in you! 🌸', 'One question at a time, you can do this! 💗', 'Let us do this together! ✨'],
  answered: ['Nice, keep going! ✨', 'Good thinking! 🌱', 'You are on a roll! 💗', 'Ooh, I like that answer! 🌸'],
  half: ['Halfway there! 🌟', 'Half done, you are flying! ✨'],
  all: ['All answered! Press Check when you are ready! 🎉'],
  perfect: ['Perfect score! I am doing a happy spin! 🎉', 'Every single one! I am so proud of you! 💗'],
  good: ['Great job! Look at all those right answers! ⭐', 'Wonderful work! 🌸'],
  low: ['Mistakes are how we learn. We will practise these together! 💗', 'That was brave! Next time will be even better. 🌱'],
};
const wsPickLine = (k) => rnd(WS_SAY[k]);
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
function sheetPage(sh) {
  HINT_KNOWN = knownFormMap();
  if (typeof DICT === 'undefined') loadData('dict').then(() => { if (ui.view === 'sheets' && ui.sheetId && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) render(); }).catch(() => {});
  sh.answers = sh.answers || {}; sh.results = sh.results || {};
  const answered = sh.items.filter((it) => (sh.answers[it.id] || '').trim()).length, st = sheetState(sh), sc = L.sheetScore(sh);
  const pending = sh.items.filter((it) => (sh.results[it.id] || {}).verdict === 'unsure');
  const items = sh.items.map((it) => {
    const r = sh.results[it.id], mine = sh.answers[it.id] || '', checked = !!sh.checkedAt;
    let input;
    if (it.type === 'mc') input = `<div class="opts">${it.options.map((o) => `<button class="${mine === o ? 'sel' : ''} ${checked && r ? (o === it.answer ? 'ok' : mine === o ? 'no' : '') : ''}" data-act="ws-pick" data-id="${it.id}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    else if (it.type === 'fill' || it.type === 'order') input = `<input type="text" class="big-in" style="text-align:left;font-size:18px" id="wa-${it.id}" value="${esc(mine)}" autocomplete="off" spellcheck="false" placeholder="${it.type === 'order' ? 'Write the sentence in the right order' : 'Your answer'}">`;
    else input = `<textarea id="wa-${it.id}" style="min-height:${it.type === 'write' ? 90 : 54}px" spellcheck="false" placeholder="${it.type === 'write' ? 'Write your sentences here' : 'Your answer'}">${esc(mine)}</textarea>`;
    let res = '';
    if (checked && r) {
      const [ic, lab] = VERDICT[r.verdict] || ['?', ''];
      res = `<div class="verdict ${r.verdict}"><b>${ic} ${lab}</b>${r.by ? ` <small class="muted">(${r.by === 'claude' ? 'Claude' : 'you'})</small>` : ''}
        ${r.verdict !== 'right' && r.verdict !== 'blank' ? `<div>Answer: <b>${esc(r.correct || it.answer || '')}</b>${it.alt && it.alt.length && !r.correct ? ` <span class="muted">also fine: ${esc(it.alt.join(' · '))}</span>` : ''}</div>` : ''}
        ${r.explain || it.why ? `<div class="muted">${esc(r.explain || it.why)}</div>` : ''}
        ${r.verdict === 'unsure' ? `<div class="row" style="margin-top:6px">${it.answer ? `<span class="muted">Model answer: <b>${esc(it.answer)}</b></span>` : ''}<button class="ghost" data-act="ws-self" data-id="${it.id}" data-v="right">I got it ✓</button><button class="ghost" data-act="ws-self" data-id="${it.id}" data-v="wrong">Not quite ✗</button></div>` : ''}</div>`;
    }
    return `<div class="card wsitem"><div class="row"><b class="wsnum">${it.id}</b><span class="pill sky">${esc(skillName(it.skill))}</span><span class="pill">${TYPE_LABEL[it.type]}</span></div>
      ${it.type === 'order' ? orderQ(it, mine) : `<div class="wsq">${hintHtml(it.q)}</div>`}${input}${res}</div>`;
  }).join('<div style="height:12px"></div>');
  const fb = sh.summary ? `<div class="card upd" style="margin-top:16px"><h2>What to improve 🌸</h2>${sh.summary.good ? `<p>${esc(sh.summary.good)}</p>` : ''}
      ${sh.summary.improve.length ? `<ul>${sh.summary.improve.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${sh.summary.next ? `<p class="muted">Next time: ${esc(sh.summary.next)}</p>` : ''}
      <button class="primary" data-act="ws-next" data-id="${sh.id}">Make my next worksheet from this</button></div>` : '';
  const claude = sh.checkedAt ? `<div class="card" style="margin-top:16px"><h2>Ask Claude to mark it</h2>
      <p class="muted">${pending.length ? `${pending.length} item${pending.length === 1 ? '' : 's'} need Claude to judge (translations, rewrites, writing). ` : 'Everything is marked already. '}Claude can also write you a summary of what to improve.</p>
      <div class="row"><button class="primary" data-act="ws-copy-check" data-id="${sh.id}">📋 Copy for Claude</button></div>
      <textarea id="ws-fb" style="margin-top:10px" placeholder="Paste Claude's whole reply here...">${esc(ui.fbText)}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="ws-apply" data-id="${sh.id}">Apply Claude's marking</button></div></div>` : '';
  const wc = wsCoach(sh), coachBar = `<div class="coach ws-coach">${pigSvg('happy', wc.played ? '' : 'act-' + wc.act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(wc.line)}</span></div></div>`;
  wc.played = true;
  return `${coachBar}<div class="top"><div><button class="ghost" data-act="ws-back">← All worksheets</button><h1 style="margin-top:12px">${esc(sh.title)}</h1><p class="sub">${answered} of ${sh.items.length} answered${sh.checkedAt ? ` · ${sc.got % 1 ? sc.got.toFixed(2).replace(/0$/, '') : sc.got} of ${sc.marked} marked right` : ''}</p></div><span class="pill ${st.cls}">${esc(st.label)}</span></div>
    <p class="muted tipnote">💡 Hover over a Dutch word to see what it means. A dotted underline means it might be new to you.</p>
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
  if (!all.length) return `<div class="top"><div><h1>My mistakes</h1><p class="sub">Every worksheet answer is recorded here by skill, so you can see what to work on.</p></div></div><div class="empty">${pigSvg('happy', '', { stage: pigStage(), note: true })}<p>Nothing tracked yet. Do a practice worksheet and I'll keep score. 🌸</p><button class="primary" data-act="ws-tab" data-t="practice">Make a worksheet</button></div>`;
  return `<div class="top"><div><h1>My mistakes</h1><p class="sub">Your last 30 answers per skill. Weakest first.</p></div><button class="primary" data-act="ws-from-weak">✨ Worksheet from my weak spots</button></div>
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
  gainXp({ right: XP.itemRight, close: XP.itemClose, partly: XP.itemPartly, wrong: XP.itemWrong }[r.verdict] || 0);
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
  'ws-del': (el) => { S.sheets = S.sheets.filter((s) => s.id !== el.dataset.id); save(); render(); },
  'ws-copy': () => {
    const a = askPrefs(); a.count = +readField('ws-count') || 12; a.weak = $('#ws-weak').checked; a.useWords = $('#ws-words').checked; a.note = readField('ws-note').trim(); save();
    const words = a.useWords ? liveWords().slice().sort((x, y) => x.box - y.box).slice(0, 30) : [];
    copyText(L.sheetPrompt({ count: a.count, topics: a.topics.concat(ownTopics(a)), grammar: a.grammar, words, weak: a.weak ? L.weakSkills(S.skills, 3) : [], note: a.note }));
  },
  'ws-selall': (el) => {
    const k = el.dataset.k, on = !!el.dataset.on, a = askPrefs(), all = k === 'topics' ? L.TOPICS : GRAMMAR_CHOICES;
    a[k] = on ? all.slice() : [];
    const box = el.closest('details.pick');
    if (box) box.querySelectorAll('.chip').forEach((c) => { c.classList.toggle('on', on); c.textContent = (on ? '✓ ' : '') + c.dataset.l; });
    save(); refreshPicked();
  },
  'ws-preset-save': () => {
    const name = readField('ws-preset-name').trim(); if (!name) return toast('Give this setup a name first.');
    const a = askPrefs(); a.count = +readField('ws-count') || a.count; a.weak = $('#ws-weak').checked; a.useWords = $('#ws-words').checked; a.note = readField('ws-note').trim(); a.custom = readField('ws-custom');
    const snap = JSON.parse(JSON.stringify({ count: a.count, weak: a.weak, useWords: a.useWords, topics: a.topics, custom: a.custom, grammar: a.grammar, note: a.note }));
    const old = (S.presets || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (old) old.prefs = snap; else S.presets.push({ id: L.uid(), name, prefs: snap });
    save(); toast('Saved setup: ' + name); render();
  },
  'ws-preset-use': () => { const x = (S.presets || []).find((y) => y.id === readField('ws-preset')); if (!x) return toast('Pick a saved setup first.'); S.askPrefs = Object.assign({}, askPrefs(), JSON.parse(JSON.stringify(x.prefs))); save(); toast('Using: ' + x.name); render(); },
  'ws-preset-del': () => { const id = readField('ws-preset'), x = (S.presets || []).find((y) => y.id === id); if (!x) return toast('Pick a saved setup first.'); S.presets = S.presets.filter((y) => y.id !== id); save(); toast('Deleted: ' + x.name); render(); },
  'ws-topic': (el) => toggleChip(el, 'topics'),
  'ws-gram': (el) => toggleChip(el, 'grammar'),
  'ws-clear': () => { const a = askPrefs(); a.topics = []; a.grammar = []; a.custom = ''; a.note = ''; save(); render(); },
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
  'ws-self': (el) => {
    const sh = sheetById(ui.sheetId), it = sh.items.find((x) => x.id === el.dataset.id);
    const r = sh.results[it.id]; r.verdict = el.dataset.v; r.by = 'self'; recordResult(sh, it, r); save(); const k = $('#main').scrollTop; render(); $('#main').scrollTop = k;
  },
  'ws-copy-check': (el) => { const sh = sheetById(el.dataset.id); copyText(L.checkPrompt(sh)); },
  'ws-apply': (el) => {
    const sh = sheetById(el.dataset.id), text = readField('ws-fb'); ui.fbText = text;
    if (!text.trim()) return toast('Paste Claude\'s reply first');
    const f = L.parseFeedback(text, sh);
    if (f.error) { toast(f.error); return render(); }
    let n = 0;
    for (const [id, fr] of Object.entries(f.results)) {
      const it = sh.items.find((x) => x.id === id), prev = sh.results[id] || {};
      if (prev.verdict && prev.verdict !== 'unsure' && prev.verdict !== 'blank' && !prev.by) continue; // the app already marked this one for sure
      const r = Object.assign(prev, { verdict: fr.verdict, correct: fr.correct, explain: fr.explain, skills: fr.skills, by: 'claude' });
      sh.results[id] = r; recordResult(sh, it, r); n++; // recordResult skips anything already counted
    }
    sh.summary = f.summary; ui.fbText = ''; save(); chime('goal'); toast(`Applied Claude's marking${n ? ` to ${n} item${n === 1 ? '' : 's'}` : ''}`); render();
  },
  'ws-next': (el) => { const sh = sheetById(el.dataset.id), a = askPrefs(); a.note = (sh.summary && sh.summary.next) || ''; a.weak = true; save(); ui.sheetId = ''; render(); },
  'ws-from-weak': () => { askPrefs().weak = true; ui.wsTab = 'practice'; ui.sheetId = ''; render(); },
  'ws-skill-clear': (el) => { delete S.skills[el.dataset.k]; save(); render(); },
});
// remember what is typed without re-rendering on every key
document.addEventListener('input', (e) => {
  const t = e.target, id = t.id || '';
  if (id.startsWith('wa-')) { const sh = sheetById(ui.sheetId); if (sh) { sh.answers[id.slice(3)] = t.value; save(); lightTiles(id.slice(3)); } }
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
    const sh = sheetById(ui.sheetId), first = !sh.checkedAt; baseCheck(); if (first) gainXp(XP.sheet);
    const sc = L.sheetScore(sh), r = sc.marked ? sc.got / sc.marked : 0, c = wsCoach(sh);
    const k = r >= 0.99 ? 'perfect' : r >= 0.7 ? 'good' : 'low';
    Object.assign(c, { line: wsPickLine(k), act: k === 'perfect' ? 'spin' : k === 'good' ? 'cheer' : 'sway', played: false });
    render(); setTimeout(() => { burstBits(k === 'perfect' ? '🎉' : k === 'good' ? '⭐' : '💗'); if (k === 'perfect') confetti(); }, 80);
  };
  document.addEventListener('input', (e) => { // typing an answer: Bigg reacts in place
    const id = e.target.id || ''; if (!id.startsWith('wa-')) return;
    const sh = sheetById(ui.sheetId); if (!sh) return;
    const c = wsCoach(sh), n = wsAnswered(sh);
    if (n > c.n) { const mo = wsMoment(n, sh.items.length); c.n = n; c.line = mo.line; c.act = mo.act; c.played = true; coachSay(mo.line, mo.act, mo.burst); }
    else if (n < c.n) c.n = n;
  });
})();
