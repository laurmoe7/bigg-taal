// Practice worksheets: Claude makes them (copy a prompt to chat, paste the JSON reply back), you do them in the app,
// the app marks what it can, Claude marks the rest, and every result feeds a running record of your weak spots.
// Loads after app.js and lessons.js and shares their scope.
S.sheets = S.sheets || []; S.skills = S.skills || {};
const printableSheets = VIEWS.sheets; // the old print-and-write generator stays as a tab
Object.assign(ui, { wsTab: 'practice', sheetId: '', ask: { count: 12, weak: true, lesson: '', note: '', reply: '' }, fbText: '' });

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

VIEWS.sheets = () => {
  const tab = (id, label) => `<button class="tab ${ui.wsTab === id ? 'on' : ''}" data-act="ws-tab" data-t="${id}">${label}</button>`;
  const head = `<div class="tabs">${tab('practice', '✨ Practice with Claude')}${tab('mistakes', '🎯 My mistakes')}${tab('print', '🖨 Printable sheets')}</div>`;
  if (ui.wsTab === 'print') return head + printableSheets();
  if (ui.wsTab === 'mistakes') return head + mistakesTab();
  const open = sheetById(ui.sheetId);
  return head + (open ? sheetPage(open) : practiceHome());
};

// ---------- make one ----------
function practiceHome() {
  ensureSheetData();
  const a = ui.ask, weak = L.weakSkills(S.skills, 3);
  const lessons = [...new Set(liveWords().map((w) => w.lesson).filter(Boolean))];
  const sheets = S.sheets.slice().sort((x, y) => y.created - x.created);
  return `<div class="top"><div><h1>Practice worksheets</h1><p class="sub">Claude writes a worksheet for you, you do it right here, then Claude marks it and tells you what to improve.</p></div></div>
  <div class="grid g2">
  <div class="card"><h2>1 · Ask Claude for a worksheet</h2>
    <div class="row"><label class="muted">Items <select id="ws-count">${[8, 12, 16, 20].map((n) => `<option ${a.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <select id="ws-lesson"><option value="">Any of my words</option>${lessons.map((x) => `<option ${a.lesson === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
    <label class="row" style="margin-top:10px"><input type="checkbox" id="ws-weak" ${a.weak ? 'checked' : ''}> Focus on my weak spots ${weak.length ? '<span class="muted">(' + weak.map((w) => esc(skillName(w.skill))).join(', ') + ')</span>' : '<span class="muted">(none yet)</span>'}</label>
    <input type="text" id="ws-note" style="margin-top:10px" placeholder="Anything else? e.g. only past tense, or a dialogue about the doctor" value="${esc(a.note)}">
    <div class="row" style="margin-top:12px"><button class="primary" data-act="ws-copy">📋 Copy prompt for Claude</button></div>
    <p class="muted" style="margin-bottom:0">Paste it into our chat. Claude replies with the worksheet as JSON.</p></div>
  <div class="card"><h2>2 · Paste the worksheet here</h2>
    <textarea id="ws-reply" placeholder="Paste Claude's whole reply here...">${esc(a.reply)}</textarea>
    <div class="row" style="margin-top:8px"><button class="primary" data-act="ws-make">Make my worksheet</button></div></div></div>
  <h2 style="margin-top:22px">My worksheets</h2>
  ${sheets.map((sh) => { const st = sheetState(sh); return `<div class="lesson"><div class="lt">${esc(sh.title)}<div class="muted" style="font-weight:600;font-size:13px">${sh.items.length} items · ${new Date(sh.created).toLocaleDateString()}</div></div><span class="pill ${st.cls}">${esc(st.label)}</span><button class="primary" data-act="ws-open" data-id="${sh.id}">${sh.checkedAt ? 'Review' : 'Do it'}</button><button class="ghost" data-act="ws-del" data-id="${sh.id}">🗑</button></div>`; }).join('') || '<div class="empty">No worksheets yet. Ask Claude for your first one!</div>'}`;
}

// ---------- do one ----------
function sheetPage(sh) {
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
      <div class="wsq">${esc(it.q)}</div>${input}${res}</div>`;
  }).join('<div style="height:12px"></div>');
  const fb = sh.summary ? `<div class="card upd" style="margin-top:16px"><h2>What to improve 🌸</h2>${sh.summary.good ? `<p>${esc(sh.summary.good)}</p>` : ''}
      ${sh.summary.improve.length ? `<ul>${sh.summary.improve.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${sh.summary.next ? `<p class="muted">Next time: ${esc(sh.summary.next)}</p>` : ''}
      <button class="primary" data-act="ws-next" data-id="${sh.id}">Make my next worksheet from this</button></div>` : '';
  const claude = sh.checkedAt ? `<div class="card" style="margin-top:16px"><h2>Ask Claude to mark it</h2>
      <p class="muted">${pending.length ? `${pending.length} item${pending.length === 1 ? '' : 's'} need Claude to judge (translations, rewrites, writing). ` : 'Everything is marked already. '}Claude can also write you a summary of what to improve.</p>
      <div class="row"><button class="primary" data-act="ws-copy-check" data-id="${sh.id}">📋 Copy for Claude</button></div>
      <textarea id="ws-fb" style="margin-top:10px" placeholder="Paste Claude's whole reply here...">${esc(ui.fbText)}</textarea>
      <div class="row" style="margin-top:8px"><button class="primary" data-act="ws-apply" data-id="${sh.id}">Apply Claude's marking</button></div></div>` : '';
  return `<div class="top"><div><button class="ghost" data-act="ws-back">← All worksheets</button><h1 style="margin-top:12px">${esc(sh.title)}</h1><p class="sub">${answered} of ${sh.items.length} answered${sh.checkedAt ? ` · ${sc.got % 1 ? sc.got.toFixed(2).replace(/0$/, '') : sc.got} of ${sc.marked} marked right` : ''}</p></div><span class="pill ${st.cls}">${esc(st.label)}</span></div>
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
    const a = ui.ask; a.count = +readField('ws-count') || 12; a.lesson = readField('ws-lesson'); a.weak = $('#ws-weak').checked; a.note = readField('ws-note').trim();
    const words = a.lesson ? lessonWords(a.lesson) : liveWords().slice().sort((x, y) => x.box - y.box).slice(0, 30);
    copyText(L.sheetPrompt({ count: a.count, lessonTitle: a.lesson, words, weak: a.weak ? L.weakSkills(S.skills, 3) : [], note: a.note }));
  },
  'ws-make': () => {
    const text = readField('ws-reply'); ui.ask.reply = text;
    if (!text.trim()) return toast('Paste Claude\'s reply first');
    const r = L.parseSheet(text);
    if (r.error) { toast(r.error); return render(); }
    const sh = Object.assign(r.sheet, { id: L.uid(), created: Date.now(), answers: {}, results: {}, lesson: ui.ask.lesson || '' });
    S.sheets.push(sh); ui.ask.reply = ''; ui.sheetId = sh.id; save();
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
  'ws-next': (el) => { const sh = sheetById(el.dataset.id); ui.ask.note = (sh.summary && sh.summary.next) || ''; ui.ask.weak = true; ui.ask.lesson = sh.lesson || ''; ui.sheetId = ''; render(); },
  'ws-from-weak': () => { ui.ask.weak = true; ui.wsTab = 'practice'; ui.sheetId = ''; render(); },
  'ws-skill-clear': (el) => { delete S.skills[el.dataset.k]; save(); render(); },
});
// remember what is typed without re-rendering on every key
document.addEventListener('input', (e) => {
  const t = e.target, id = t.id || '';
  if (id.startsWith('wa-')) { const sh = sheetById(ui.sheetId); if (sh) { sh.answers[id.slice(3)] = t.value; save(); } }
  else if (id === 'ws-reply') ui.ask.reply = t.value;
  else if (id === 'ws-note') ui.ask.note = t.value;
  else if (id === 'ws-fb') ui.fbText = t.value;
});
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'ws-count') ui.ask.count = +e.target.value; else if (id === 'ws-lesson') ui.ask.lesson = e.target.value; else if (id === 'ws-weak') ui.ask.weak = e.target.checked;
});
