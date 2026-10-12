// Reading: Dutch texts (written by Claude through copy and paste, or pasted from anywhere) where every word is tappable.
// Loads after app.js and shares its scope.
Object.assign(ui, { readId: '', readPop: null, readDraft: '', readTitle: '', readReply: '' });
const readPrefs = () => (S.readPrefs = Object.assign({ level: 'B1', length: 'medium', topic: '', useWords: true, note: '' }, S.readPrefs || {}));
const readById = (id) => (S.reads || []).find((r) => r.id === id);

// every form of every word in your list -> that word, so inflected words in a text still count as known
function knownFormMap() {
  const map = new Map();
  for (const w of liveWords()) for (const f of L.exampleForms(w.nl, w.pos)) if (f && !map.has(f)) map.set(f, w);
  return map;
}
// what a tapped word means: your own list first, then the dictionary
function lookupToken(tok, map) {
  const key = tok.toLowerCase().replace(/^'|'$/g, '');
  const mine = map.get(key);
  let dict = null;
  if (typeof DICT !== 'undefined') { const r = L.dictSearch(DICT, dictIndex(), key, 1)[0]; if (r) dict = r; }
  return { key, mine, dict };
}
function readerHtml(r) {
  const map = knownFormMap(), paras = r.text.split(/\n\s*\n/);
  return paras.map((p) => '<p>' + L.tokenize(p).map((x) => (x.w ? `<span class="rw ${map.has(x.w.toLowerCase()) ? 'known' : ''}" data-act="read-word" data-w="${esc(x.w)}">${esc(x.w)}</span>` : esc(x.t))).join('') + '</p>').join('');
}
function popHtml(r) {
  const pop = ui.readPop; if (!pop) return '<div class="popbox muted">Tap any word to see what it means.</div>';
  if (typeof DICT === 'undefined') { loadData('dict').then(() => { if (ui.view === 'reading') render(); }).catch(() => {}); return '<div class="popbox muted">Looking it up...</div>'; }
  const map = knownFormMap(), { key, mine, dict } = lookupToken(pop, map);
  let body;
  if (mine) body = `<b>${mine.article ? esc(mine.article) + ' ' : ''}${esc(mine.nl)}</b> = ${esc(mine.en)} <span class="pill mint">in your list</span>${mine.nl.toLowerCase() !== key ? `<div class="muted" style="font-size:13px">"${esc(pop)}" is a form of ${esc(mine.nl)}</div>` : ''}`;
  else if (dict) { const e = dict.e, fl = formsLine(e); body = `<b>${e[2] === 'de' || e[2] === 'het' ? e[2] + ' ' : ''}${esc(e[0])}</b> <span class="muted">${L.POS_NAMES[e[1]] || ''}</span> = ${esc(e[4].split('; ').slice(0, 3).join('; '))}${fl ? `<div class="muted" style="font-size:13px">${esc(fl)}</div>` : ''}${dict.how === 'form' ? `<div class="muted" style="font-size:13px">"${esc(pop)}" is a form of ${esc(e[0])}</div>` : ''}`; }
  else body = `<b>${esc(pop)}</b> <span class="muted">is not in the dictionary (it may be a name or a very rare word)</span>`;
  const canAdd = !mine && dict;
  return `<div class="popbox"><button class="ghost mini" data-act="say" data-t="${esc(pop)}" title="Listen">🔊</button><div class="grow">${body}</div>${canAdd ? '<button class="primary mini" data-act="read-add">➕ Add to my words</button>' : ''}</div>`;
}

VIEWS.reading = () => {
  const r = readById(ui.readId);
  if (r) {
    const map = knownFormMap(), toks = L.tokenize(r.text).filter((x) => x.w).map((x) => x.w.toLowerCase()), uniq = [...new Set(toks)], known = uniq.filter((w) => map.has(w)).length;
    return `<div class="top"><div><button class="ghost" data-act="read-back">← All texts</button><h1 style="margin-top:12px">${esc(r.title || 'Reading text')}</h1>
      <p class="sub">${toks.length} words · you already know ${known} of ${uniq.length} different ones. Tap a word to see what it means.</p></div>
      <div class="row"><button class="ghost" data-act="read-listen">🔊 Listen</button>${r.questions && r.questions.length ? '<button class="primary" data-act="read-quiz">📝 Do the questions</button>' : ''}<button class="ghost" data-act="read-del" title="Delete this text">🗑</button></div></div>
    <div class="reader card">${readerHtml(r)}</div><div class="popwrap" id="popwrap">${popHtml(r)}</div>`;
  }
  const p = readPrefs(), texts = (S.reads || []).slice().sort((a, b) => b.created - a.created);
  const opt = (arr, cur) => arr.map(([v, n]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${n}</option>`).join('');
  return `<div class="top"><div><h1>Reading</h1><p class="sub">Read Dutch at your level and tap any word you do not know.</p></div></div>
  <div class="ws-grid">
    <div class="card"><h2>1 · Ask Claude for a text</h2>
      <div class="row opts-row"><label class="muted">Level <select id="rd-level">${opt([['A2', 'A2'], ['B1', 'B1'], ['B2', 'B2']], p.level)}</select></label>
        <label class="muted">Length <select id="rd-length">${opt([['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']], p.length)}</select></label>
        <label title="Weave in words you are learning"><input type="checkbox" id="rd-words" ${p.useWords ? 'checked' : ''}> Use my words</label></div>
      <label class="f">Topic</label><input type="text" id="rd-topic" value="${esc(p.topic)}" placeholder="e.g. a visit to the doctor, my neighbours, a day in Utrecht">
      <label class="f">Anything else?</label><textarea id="rd-note" class="own-topics" rows="3" placeholder="A style (a letter, a dialogue, a news item), things to avoid...">${esc(p.note)}</textarea>
      <div class="row" style="margin-top:12px"><button class="primary" data-act="read-copy">📋 Copy prompt for Claude</button></div></div>
    <div class="ws-side"><div class="card"><h2>2 · Paste the reply (or any Dutch text)</h2>
      <input type="text" id="rd-title" value="${esc(ui.readTitle)}" placeholder="Title (optional, for your own texts)">
      <textarea id="rd-reply" class="big-paste" placeholder="Paste Claude's whole reply here, or a Dutch text from a website, a book or a letter...">${esc(ui.readReply)}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="read-make">Add this text</button></div></div></div>
  </div>
  <div class="card" style="margin-top:16px"><h2>My texts</h2>${texts.map((t) => `<div class="ws-row"><span class="t" title="${esc(t.title)}">${esc(t.title || 'Reading text')}</span><span class="pill sky">${L.tokenize(t.text).filter((x) => x.w).length} words</span><button class="primary" data-act="read-open" data-id="${t.id}">Read</button><button class="ghost" data-act="read-del" data-id="${t.id}" title="Delete">🗑</button></div>`).join('') || '<p class="muted" style="margin:0">None yet. Add your first text above.</p>'}</div>`;
};

Object.assign(ACT, {
  'read-copy': () => {
    const p = readPrefs(); p.level = readField('rd-level') || p.level; p.length = readField('rd-length') || p.length; p.topic = readField('rd-topic').trim(); p.note = readField('rd-note').trim(); p.useWords = $('#rd-words').checked; save();
    const words = p.useWords ? L.pick(L.troubleWords(liveWords()).concat(L.recentWords(liveWords(), today(), 14)), 12) : [];
    copyText(L.readingPrompt({ level: p.level, length: p.length, topic: p.topic, words, note: p.note }));
  },
  'read-make': () => {
    const raw = readField('rd-reply'); ui.readReply = raw; ui.readTitle = readField('rd-title');
    const r = L.parseReading(raw); if (r.error) return toast(r.error);
    const item = Object.assign(r.reading, { id: L.uid(), created: Date.now() });
    if (!item.title) item.title = ui.readTitle.trim() || item.text.split(/\s+/).slice(0, 5).join(' ') + '...';
    S.reads.push(item); ui.readReply = ''; ui.readTitle = ''; ui.readId = item.id; ui.readPop = null; save(); toast('Text added: ' + item.title); render(); $('#main').scrollTop = 0;
  },
  'read-open': (el) => { ui.readId = el.dataset.id; ui.readPop = null; render(); $('#main').scrollTop = 0; },
  'read-back': () => { ui.readId = ''; ui.readPop = null; render(); },
  'read-del': (el) => { const id = el.dataset.id || ui.readId; S.reads = S.reads.filter((x) => x.id !== id); if (ui.readId === id) ui.readId = ''; save(); render(); },
  'read-listen': () => { const r = readById(ui.readId); if (r) speak(r.text.replace(/\s+/g, ' ')); },
  'read-word': (el) => { // tap a word: show it below the text without redrawing the page
    ui.readPop = el.dataset.w; speak(el.dataset.w);
    document.querySelectorAll('.rw.sel').forEach((x) => x.classList.remove('sel')); el.classList.add('sel');
    const box = $('#popwrap'); if (box) box.innerHTML = popHtml(readById(ui.readId));
  },
  'read-add': async () => {
    const r = readById(ui.readId), pop = ui.readPop; if (!r || !pop || typeof DICT === 'undefined') return;
    const hit = L.dictSearch(DICT, dictIndex(), pop, 1)[0]; if (!hit) return;
    const o = L.dictToWord(hit.e);
    if (haveWord(o.nl)) return toast(o.nl + ' is already in your list');
    S.words.push(L.newWord(Object.assign(o, { example: L.sentenceWith(r.text, pop) || '', exampleEn: '' }))); save();
    gainXp(XP.readAdd); toast('Added ' + o.nl + ' to My words'); render();
    ui.readPop = pop; const box = $('#popwrap'); if (box) box.innerHTML = popHtml(r);
  },
  'read-quiz': () => {
    const r = readById(ui.readId); if (!r || !r.questions || !r.questions.length) return;
    const sh = { id: L.uid(), title: 'Questions: ' + (r.title || 'Reading text'), created: Date.now(), answers: {}, results: {}, skipped: 0, items: r.questions.map((q, i) => Object.assign({}, q, { id: String(i + 1) })) };
    S.sheets.push(sh); ui.sheetId = sh.id; ui.wsTab = 'practice'; save(); go('sheets');
  },
});
document.addEventListener('change', (e) => { const p = readPrefs(), id = e.target.id; if (id === 'rd-level') { p.level = e.target.value; save(); } else if (id === 'rd-length') { p.length = e.target.value; save(); } else if (id === 'rd-words') { p.useWords = e.target.checked; save(); } });
document.addEventListener('input', (e) => { const id = e.target.id; if (id === 'rd-reply') ui.readReply = e.target.value; else if (id === 'rd-title') ui.readTitle = e.target.value; else if (id === 'rd-topic') { readPrefs().topic = e.target.value; save(); } else if (id === 'rd-note') { readPrefs().note = e.target.value; save(); } });
