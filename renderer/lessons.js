// Book lessons: the list, and a page per lesson (study this lesson, reading view with tap-to-add,
// finding new words in the text, exercises checked with Claude). Loads after app.js and shares its scope.
Object.assign(ui, { lessonId: '', tap: '', cand: [], textEdit: false, paste: '', exOpen: '', lessonFilter: '' });

const lessonBanner = () => (ui.lessonFilter ? `<div class="card upd" style="margin-bottom:14px"><div class="row"><div class="grow"><b>Studying only: ${esc(ui.lessonFilter)}</b></div><button class="ghost" data-act="lf-clear">Use all my words</button></div></div>` : '');
const lessonById = (id) => S.lessons.find((l) => l.id === id && !l.deleted);
const lessonWords = (title) => liveWords().filter((w) => w.lesson === title);
const dots = (w) => `<span class="lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${w.box >= i ? 'on' : ''}"></i>`).join('')}</span>`;
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(`Copied. Paste it into Claude: about ${L.estimateTokens(text).toLocaleString()} tokens to send, plus its reply.`); } catch { toast('Could not copy'); }
}
const shortest = (text, tok) => {
  const re = new RegExp('(^|[^A-Za-zÀ-ÿ])' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-zÀ-ÿ])', 'i');
  return L.sentences(text).filter((s) => re.test(s)).sort((a, b) => a.length - b.length)[0] || '';
};
const guessArticle = (text, tok) => {
  const c = (a) => (text.match(new RegExp('\\b' + a + '\\s+' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi')) || []).length;
  const d = c('de'), h = c('het'); return d > h ? 'de' : h > d ? 'het' : '';
};
const artSelect = (id, val) => `<select id="${id}"><option value="">–</option><option value="de" ${val === 'de' ? 'selected' : ''}>de</option><option value="het" ${val === 'het' ? 'selected' : ''}>het</option></select>`;

// ---------- the list ----------
VIEWS.lessons = () => {
  const open = lessonById(ui.lessonId);
  if (open) return lessonPage(open);
  const ls = S.lessons.filter((l) => !l.deleted).sort((a, b) => (a.status === 'done') - (b.status === 'done') || ((a.due || '9') < (b.due || '9') ? -1 : 1));
  const mark = { todo: '', doing: '…', done: '✓' };
  return `<div class="top"><div><h1>Book lessons</h1><p class="sub">Your NT2school lessons. Open one to study its words, read the text, and check exercises.</p></div><a class="ghost" style="text-decoration:none" href="https://www.nt2school.nl/nl/" target="_blank">Open NT2school ↗</a></div>
  <div class="card"><div class="row"><input type="text" class="grow" id="l-title" placeholder="Lesson, e.g. Les 12 – Wonen" data-enter="lesson-add"><input type="date" id="l-due" style="width:auto" value="${L.addDays(today(), 3)}"><button class="primary" data-act="lesson-add">Add lesson</button></div></div>
  <div style="margin-top:14px">${ls.map((l) => {
    const st = L.lessonStats(S.words, l.title), pct = st.total ? Math.round((st.learned / st.total) * 100) : 0;
    return `<div class="lesson ${l.status === 'done' ? 'done' : ''}"><button class="chk ${l.status === 'done' ? 'on' : ''}" data-act="lesson-cycle" data-id="${l.id}" title="todo → doing → done">${mark[l.status] || ''}</button>
    <div class="lt">${esc(l.title)} ${l.status === 'doing' ? '<span class="pill butter">doing</span>' : ''}<div class="${l.due && l.due < today() && l.status !== 'done' ? 'warn' : 'muted'}" style="font-weight:600;font-size:13px">${l.due ? (l.due < today() && l.status !== 'done' ? 'Overdue · ' : 'Due ') + esc(l.due) : 'No due date'}${st.total ? ` · ${st.total} words, ${st.learned} learned` : ''}</div>${st.total ? `<div class="bar mini"><i style="width:${pct}%"></i></div>` : ''}</div>
    <button class="primary" data-act="lesson-open" data-id="${l.id}">Open</button><button class="ghost" data-act="lesson-del" data-id="${l.id}" title="Delete lesson">🗑</button></div>`;
  }).join('') || '<div class="empty">No lessons yet. Add your next chapter above.</div>'}</div>`;
};

// ---------- one lesson ----------
function lessonPage(l) {
  const st = L.lessonStats(S.words, l.title), pct = st.total ? Math.round((st.learned / st.total) * 100) : 0;
  const stBtn = (s, label) => `<button class="ghost ${l.status === s ? 'on' : ''}" data-act="lesson-status" data-id="${l.id}" data-s="${s}">${label}</button>`;
  return `<div class="top"><div><button class="ghost" data-act="lesson-back">← All lessons</button><h1 style="margin-top:12px">${esc(l.title)}</h1><p class="sub">${st.total ? `${st.total} words · ${st.learned} learned` : 'No words from this lesson yet'}</p></div>
    <div class="row">${stBtn('todo', 'To do')}${stBtn('doing', 'Doing')}${stBtn('done', '✓ Done')}<input type="date" id="ld-due" value="${esc(l.due || '')}" style="width:auto" title="Due date"></div></div>
  <div class="grid g2">
    <div class="card"><h2>Study this lesson</h2>
      ${st.total ? `<div class="bar"><i style="width:${pct}%"></i></div><p class="muted">${st.learned} learned · ${st.learning} learning · ${st.fresh} new</p>` : '<p class="muted">Add this lesson\'s words below, then study just them.</p>'}
      <div class="row"><button class="primary" data-act="lesson-study" data-k="cards" ${st.total ? '' : 'disabled'}>🃏 Flashcards</button><button class="ghost" data-act="lesson-study" data-k="listen" ${st.total ? '' : 'disabled'}>🎧 Listening</button><button class="ghost" data-act="lesson-study" data-k="sheets" ${st.total ? '' : 'disabled'}>📝 Worksheet</button></div></div>
    <div class="card"><h2>Ask Claude about this lesson</h2><p class="muted">Copies the lesson text with a request to explain the tricky parts and give you the words as JSON you can paste back in.</p>
      <button class="ghost" data-act="lesson-claude" ${l.text ? '' : 'disabled'}>📋 Copy lesson for Claude</button></div>
  </div>
  ${textCard(l)}
  ${wordsCard(l)}
  ${exercisesCard(l)}`;
}

function textCard(l) {
  if (!l.text || ui.textEdit) {
    return `<div class="card" style="margin-top:16px"><h2>Lesson text</h2><p class="muted">Paste the reading or dialogue from the lesson. Then you can tap any word, and I can find the new words for you.</p>
      <textarea id="lt-text" style="min-height:160px" placeholder="Paste the lesson text here...">${esc(ui.textDraft != null ? ui.textDraft : l.text || '')}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="text-save">Save text</button>${l.text ? '<button class="ghost" data-act="text-cancel">Cancel</button>' : ''}</div></div>`;
  }
  const idx = L.wordIndex(S.words);
  const body = L.tokenize(l.text).map((p) => {
    if (!p.w) return esc(p.t);
    const w = L.findWord(p.t, idx), key = L.norm(p.t), s = w ? L.wordState(w) : L.isStop(key) ? 'plain' : 'none'; // small function words stay plain
    return `<span class="tw tw-${s} ${ui.tap && ui.tap === key ? 'sel' : ''}" data-act="tap" data-w="${esc(key)}">${esc(p.t)}</span>`;
  }).join('');
  return `<div class="card" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Lesson text</h2><button class="ghost" data-act="text-edit">✎ Edit text</button></div>
    <div class="legend"><span class="tw tw-known">known</span><span class="tw tw-learning">learning</span><span class="tw tw-new">new in your list</span><span class="tw tw-none">not in your list: tap to add</span></div>
    <div class="reading">${body}</div>${ui.tap ? tapPanel(l, idx) : '<p class="muted" style="margin-bottom:0">Tap a word to hear it and see or add its meaning.</p>'}</div>`;
}

function tapPanel(l, idx) {
  const tok = ui.tap, w = L.findWord(tok, idx);
  if (w) {
    return `<div class="tap"><div class="row"><div class="grow"><b style="font-size:20px">${w.article ? `<span class="art-${w.article}">${w.article}</span> ` : ''}${esc(w.nl)}</b> <span class="muted">= ${esc(w.en)}</span><div>${dots(w)} <span class="pill">${esc(w.lesson || 'no lesson')}</span></div>${w.example ? `<div class="fc-ex">${esc(w.example)}</div>` : ''}</div>
      <button class="speak" data-act="say" data-t="${esc((w.article ? w.article + ' ' : '') + w.nl)}">🔊</button>${w.lesson === l.title ? '' : `<button class="ghost" data-act="tap-tag" data-id="${w.id}">Add to this lesson</button>`}</div></div>`;
  }
  return `<div class="tap"><div class="row"><b style="font-size:18px">Add “${esc(tok)}”</b><button class="speak" data-act="say" data-t="${esc(tok)}">🔊</button><span class="muted">Not in your list yet. Use the dictionary form (werken, not werkt).</span></div>
    <div class="row" style="margin-top:8px">${artSelect('tap-art', guessArticle(l.text, tok))}<input type="text" class="grow" id="tap-nl" value="${esc(tok)}" placeholder="Dutch"><input type="text" class="grow" id="tap-en" data-focus placeholder="English" data-enter="tap-add"></div>
    <div class="row" style="margin-top:8px"><input type="text" class="grow" id="tap-ex" value="${esc(shortest(l.text, tok))}" placeholder="Example sentence"><button class="primary" data-act="tap-add">Add to my words</button></div></div>`;
}

function wordsCard(l) {
  const rows = ui.cand;
  const have = lessonWords(l.title);
  return `<div class="card" style="margin-top:16px"><h2>New words</h2>
    <p class="muted">${have.length ? `${have.length} words are tagged with this lesson. ` : ''}Find words in the lesson text that aren't in your list yet. I guess de/het and pull out the sentence each one is in, so you only fill in the English. Or let Claude do it.</p>
    <div class="row"><button class="primary" data-act="cand-find" ${l.text ? '' : 'disabled'}>🔎 Find new words in the text</button>${l.text ? '' : '<span class="muted">Save the lesson text first.</span>'}</div>
    ${rows.length ? `<table class="words cands" style="margin-top:10px"><tr><th></th><th>Word</th><th>de/het</th><th>English</th><th>From the text</th></tr>${rows.map((c, i) => `<tr>
      <td><input type="checkbox" id="c-pick-${i}" ${c.pick ? 'checked' : ''}></td><td><b>${esc(c.w)}</b> <small class="muted">×${c.n}</small>${c.phrase ? ' <span class="pill sky">phrase</span>' : c.pos === 'verb' ? ' <span class="pill butter">verb?</span>' : ''}</td>
      <td>${c.phrase ? '' : artSelect('c-art-' + i, c.article)}</td><td><input type="text" id="c-en-${i}" value="${esc(c.en)}" placeholder="English"></td><td class="muted ex">${esc(c.example)}</td></tr>`).join('')}</table>
      <div class="row" style="margin-top:10px"><button class="primary" data-act="cand-add">➕ Add checked words that have English</button><button class="ghost" data-act="cand-claude">📋 Copy list for Claude</button><button class="ghost" data-act="cand-clear">Clear</button></div>` : ''}
    <details style="margin-top:14px" ${ui.paste ? 'open' : ''}><summary>Paste a word list, or Claude's whole reply</summary>
      <p class="muted">One word per line like <code>de afspraak = appointment | Ik heb een afspraak.</code>, or paste Claude's reply: I'll find the JSON in it.</p>
      <textarea id="l-paste" placeholder="de afspraak = appointment">${esc(ui.paste)}</textarea><div class="row" style="margin-top:8px"><button class="primary" data-act="paste-import">Add to this lesson</button></div></details></div>`;
}

function exercisesCard(l) {
  const exs = l.exercises || [];
  return `<div class="card" style="margin-top:16px"><h2>Exercises</h2><p class="muted">Paste an exercise and your answers. Copy it for Claude to check and explain, then paste Claude's reply back to keep it with the lesson.</p>
    ${exs.map((ex) => `<details class="ex" ${ui.exOpen === ex.id ? 'open' : ''}><summary>${esc(ex.title || 'Exercise')} ${ex.feedback ? '<span class="pill mint">checked</span>' : ex.answers ? '<span class="pill butter">answered</span>' : ''}</summary>
      <label class="f">Exercise</label><textarea id="ex-text-${ex.id}">${esc(ex.text)}</textarea>
      <label class="f">My answers</label><textarea id="ex-ans-${ex.id}">${esc(ex.answers || '')}</textarea>
      <label class="f">Claude's feedback</label><textarea id="ex-fb-${ex.id}" placeholder="Paste Claude's reply here...">${esc(ex.feedback || '')}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="ex-claude" data-id="${ex.id}">📋 Copy for Claude</button><button class="ghost" data-act="ex-save" data-id="${ex.id}">Save</button><button class="ghost" data-act="ex-words" data-id="${ex.id}">➕ Add words from the reply</button><button class="ghost" data-act="ex-del" data-id="${ex.id}">🗑</button></div></details>`).join('')}
    <div style="margin-top:12px"><label class="f">New exercise</label><input type="text" id="exn-title" placeholder="Title, e.g. Oefening 3">
      <textarea id="exn-text" placeholder="Paste the exercise here..." style="margin-top:8px"></textarea><textarea id="exn-ans" placeholder="Your answers (optional)" style="margin-top:8px;min-height:70px"></textarea>
      <button class="primary" style="margin-top:8px" data-act="ex-add">Add exercise</button></div></div>`;
}

// ---------- actions ----------
const readVal = (id) => ($('#' + id) || {}).value || '';
const REGISTER = {
  'lesson-open': (el) => { ui.lessonId = el.dataset.id; ui.tap = ''; ui.cand = []; ui.paste = ''; ui.textEdit = false; ui.textDraft = null; render(); $('#main').scrollTop = 0; },
  'lesson-go': (el) => { ui.lessonId = el.dataset.id; ui.tap = ''; ui.cand = []; ui.paste = ''; ui.textEdit = false; ui.textDraft = null; go('lessons'); },
  'lesson-back': () => { ui.lessonId = ''; ui.tap = ''; render(); },
  'lesson-study': (el) => {
    const l = lessonById(ui.lessonId); if (!l) return;
    const k = el.dataset.k;
    if (k === 'sheets') { ui.ask.lesson = l.title; ui.wsTab = 'practice'; ui.sheetId = ''; return go('sheets'); }
    ui.lessonFilter = l.title; ui.cards = null; ui.listen = null; go(k);
  },
  'lesson-claude': () => { const l = lessonById(ui.lessonId); if (l && l.text) copyText(L.claudePrompt(l.title, l.text)); },
  'text-edit': () => { const l = lessonById(ui.lessonId); ui.textEdit = true; ui.textDraft = l.text || ''; render(); },
  'text-cancel': () => { ui.textEdit = false; ui.textDraft = null; render(); },
  'text-save': () => { const l = lessonById(ui.lessonId); l.text = readVal('lt-text').trim(); ui.textEdit = false; ui.textDraft = null; ui.tap = ''; save(); toast(l.text ? 'Lesson text saved' : 'Text cleared'); render(); },
  tap: (el) => { ui.tap = el.dataset.w; speak(el.dataset.w); const keep = $('#main').scrollTop; render(); $('#main').scrollTop = keep; },
  'tap-tag': (el) => { const w = S.words.find((x) => x.id === el.dataset.id), l = lessonById(ui.lessonId); w.lesson = l.title; save(); toast('Added to ' + l.title); render(); },
  'tap-add': () => {
    const l = lessonById(ui.lessonId), nl = readVal('tap-nl').trim(), en = readVal('tap-en').trim();
    if (!nl || !en) return toast('Type the English meaning too');
    const article = readVal('tap-art');
    S.words.push(L.newWord({ nl, en, article, pos: article ? 'noun' : 'other', example: readVal('tap-ex').trim(), lesson: l.title }));
    save(); toast(`Added ${article ? article + ' ' : ''}${nl}`); ui.tap = L.norm(nl); render();
  },
  'cand-find': () => {
    const l = lessonById(ui.lessonId);
    ui.cand = L.extractCandidates(l.text, S.words, 40).map((c) => Object.assign(c, { en: '', pick: true }));
    if (!ui.cand.length) toast('Nothing new found. You know all these words!'); render();
  },
  'cand-clear': () => { ui.cand = []; render(); },
  'cand-add': () => {
    const l = lessonById(ui.lessonId); let added = 0, waiting = 0; const keep = [];
    for (const c of ui.cand) {
      if (!c.pick) { keep.push(c); continue; }
      if (!c.en.trim()) { waiting++; keep.push(c); continue; }
      S.words.push(L.newWord({ nl: c.w, en: c.en.trim(), article: c.article, pos: c.article ? 'noun' : c.pos === 'verb' ? 'verb' : 'other', example: c.example, lesson: l.title })); added++;
    }
    ui.cand = keep; save();
    toast(added ? `Added ${added} word${added === 1 ? '' : 's'}${waiting ? `, ${waiting} still need English` : ''}` : 'Type the English first, or copy the list for Claude'); render();
  },
  'cand-claude': () => { const l = lessonById(ui.lessonId); const rows = ui.cand.filter((c) => c.pick); if (!rows.length) return toast('Nothing checked'); copyText(L.claudeWordsPrompt(l.title, rows)); },
  'paste-import': () => {
    const l = lessonById(ui.lessonId), t = readVal('l-paste');
    if (!t.trim()) return;
    if (importText(t, l.title)) { ui.paste = ''; const idx = L.wordIndex(S.words); ui.cand = ui.cand.filter((c) => !L.findWord(c.w, idx)); } else ui.paste = t;
    render();
  },
  'ex-add': () => {
    const l = lessonById(ui.lessonId), text = readVal('exn-text').trim();
    if (!text) return toast('Paste the exercise first');
    const ex = { id: L.uid(), title: readVal('exn-title').trim() || 'Exercise ' + ((l.exercises || []).length + 1), text, answers: readVal('exn-ans').trim(), feedback: '', created: Date.now() };
    (l.exercises = l.exercises || []).push(ex); ui.exOpen = ex.id; save(); render();
  },
  'ex-save': (el) => { saveEx(el.dataset.id); toast('Saved'); render(); },
  'ex-claude': (el) => { const ex = saveEx(el.dataset.id); copyText(L.exercisePrompt(lessonById(ui.lessonId).title, ex)); },
  'ex-words': (el) => {
    const ex = saveEx(el.dataset.id), l = lessonById(ui.lessonId);
    if (!ex.feedback.trim()) return toast('Paste Claude\'s reply first');
    if (!L.parseImport(ex.feedback).words.length) { toast('No word list found in that reply'); return render(); }
    importText(ex.feedback, l.title); render();
  },
  'ex-del': (el) => { const l = lessonById(ui.lessonId); l.exercises = (l.exercises || []).filter((x) => x.id !== el.dataset.id); save(); render(); },
  'lf-clear': () => { ui.lessonFilter = ''; ui.cards = null; ui.listen = null; render(); },
};
function saveEx(id) {
  const ex = lessonById(ui.lessonId).exercises.find((x) => x.id === id);
  ex.text = readVal('ex-text-' + id); ex.answers = readVal('ex-ans-' + id); ex.feedback = readVal('ex-fb-' + id);
  ui.exOpen = id; save(); return ex;
}
Object.assign(ACT, REGISTER);

// keep typed values while the page re-renders
const syncField = (e) => {
  const t = e.target, id = t.id || '';
  let m;
  if ((m = id.match(/^c-(pick|art|en)-(\d+)$/)) && ui.cand[+m[2]]) { const c = ui.cand[+m[2]]; if (m[1] === 'pick') c.pick = t.checked; else if (m[1] === 'art') c.article = t.value; else c.en = t.value; }
  else if (id === 'l-paste') ui.paste = t.value;
  else if (id === 'lt-text') ui.textDraft = t.value;
  else if (id === 'ld-due') { const l = lessonById(ui.lessonId); if (l) { l.due = t.value; save(); } }
};
document.addEventListener('input', syncField);
document.addEventListener('change', syncField);
