// Word forms (a tab on the Flashcards page): a sentence with a word missing, and you are told which word it is, but you have to type the
// right form of it: zijn → was, waren or geweest. The sentences come from the sentence bank (for the verbs in verbs.js) and from the
// example sentences of your own words. Loads after phrases.js and shares its scope.

const FM_KINDS = { past: 'past tense (singular)', pl: 'past tense (plural)', part: 'past participle', form: 'the form this sentence needs' };
const FM_GROUPS = [['all', 'Everything'], ['irreg', 'Irregular verbs'], ['reg', "Regular verbs ('t kofschip)"], ['mine', 'From my words']];
const fmPrefs = () => (S.fmPrefs = Object.assign({ group: 'all', n: 20, auto: false, retype: false, repeat: false }, S.fmPrefs || {}));
const fm = (ui.fm = ui.fm || { sess: null });
const fmRec = (it) => (S.forms && S.forms[it.id]) || {};
const fmIsDue = (it) => { const r = fmRec(it); return r.reps > 0 && L.isDue(r, today()); };
const fmIsNew = (it) => !fmRec(it).reps;
const fmNewLeft = () => Math.max(0, S.settings.newPerDay - (todayStats().newForms || 0));
const fmFormRe = /\p{L}+(?:['’-]\p{L}+)*/gu;

// ---------- the cards ----------
let fmVerbCache = null, fmLoading = false;
function fmVerbItems() { // needs the sentence bank (SENTENCES), which loads the first time it is wanted
  if (fmVerbCache) return fmVerbCache;
  if (typeof SENTENCES === 'undefined' || !Array.isArray(SENTENCES)) return [];
  const byForm = new Map(); // form -> [{ v, kind }]
  const addForm = (v, kind, field, reg) => String(field || '').split('|').forEach((f) => { f = f.trim().toLowerCase(); if (!f || f === v.inf) return; if (!byForm.has(f)) byForm.set(f, []); byForm.get(f).push({ v, kind, reg }); });
  [[VERBS_IRREG, false], [VERBS_REG, true]].forEach(([list, reg]) => list.forEach((a) => { const v = vtVerb(a, reg); addForm(v, 'past', v.past, reg); addForm(v, 'pl', v.pl, reg); addForm(v, 'part', v.part, reg); }));
  const taken = new Map(), out = [];
  for (const [nl, en] of SENTENCES) {
    if (nl.length > 75) continue;
    fmFormRe.lastIndex = 0; let m, n = 0, hit = null;
    while ((m = fmFormRe.exec(nl))) { n++; const c = byForm.get(m[0].toLowerCase()); if (c && !hit) hit = { m, c: c[0] }; }
    if (!hit) continue;
    const key = hit.c.v.inf + '|' + hit.c.kind, got = taken.get(key) || 0;
    if (got >= 2) continue; // two sentences per verb and form is plenty
    const rest = nl.toLowerCase().match(new RegExp('(^|[^\\p{L}])' + hit.m[0].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'gu')) || [];
    if (rest.length > 1) continue; // the form appears twice: the gap would be ambiguous
    taken.set(key, got + 1);
    out.push({ id: 'fv:' + key + ':' + L.norm(nl).replace(/\s+/g, '-').slice(0, 40), group: hit.c.reg ? 'reg' : 'irreg', inf: hit.c.v.inf, meaning: hit.c.v.en, kind: hit.c.kind, v: hit.c.v,
      form: hit.m[0], before: nl.slice(0, hit.m.index), after: nl.slice(hit.m.index + hit.m[0].length), nl, en });
  }
  return (fmVerbCache = out);
}
function fmMineItems() { // your own words whose example sentence uses another form of the word
  const out = [];
  S.words.filter((w) => !w.deleted && w.example).forEach((w) => {
    const c = L.clozeOf(w.example, w.nl, w.pos), base = L.stripArticle(w.nl).replace(/^zich\s+/, '');
    if (c && L.norm(c.form) !== L.norm(base)) out.push({ id: 'fw:' + w.id + ':' + L.norm(c.form), group: 'mine', inf: base, meaning: w.en, kind: 'form', form: c.form, before: c.before, after: c.after, nl: w.example, en: exEnOf(w) });
  });
  return out;
}
const fmAll = () => { if (!fmVerbCache && !fmLoading) { fmLoading = true; loadData('sentences').then(() => { fmLoading = false; if (ui.view === 'cards' && ui.cardsTab === 'forms') render(); }).catch(() => { fmLoading = false; }); } return fmVerbItems().concat(fmMineItems()); };
const fmSel = () => { const g = fmPrefs().group; return fmAll().filter((it) => g === 'all' || it.group === g); };

// ---------- starting a session ----------
function fmPool(kind) {
  const P = fmPrefs(), items = fmSel();
  if (kind === 'mix') return L.pick(items, P.n);
  if (kind === 'new') return items.filter(fmIsNew).slice(0, P.n);
  if (kind === 'ahead') return items.filter((it) => fmRec(it).reps > 0 && !fmIsDue(it)).sort((x, y) => (fmRec(x).due || '').localeCompare(fmRec(y).due || '')).slice(0, P.n);
  return L.shuffle(items.filter(fmIsDue)).slice(0, 300).concat(L.shuffle(items.filter(fmIsNew)).slice(0, fmNewLeft()));
}
function fmStart(items, label) {
  if (!items.length) return toast('Nothing to practise there yet. Try another group or the random mix!');
  fm.sess = {
    queue: items.map((it) => ({ id: it.id, again: false })), items: Object.fromEntries(items.map((it) => [it.id, it])),
    i: 0, flipped: false, res: null, typed: '', hint: 0, n: 0, good: 0, streak: 0, label: label || '', last: null, phase: '',
    coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false },
  };
  render();
}
const fmCur = () => { const s = fm.sess; if (!s || s.i >= s.queue.length) return null; const q = s.queue[s.i]; return { q, it: s.items[q.id] }; };
function fmJudge(typed, it) { // right | close (a typo or a missing accent) | wrong
  const t = L.norm(typed); if (!t) return 'wrong';
  const answers = [it.form].concat(it.kind === 'form' || !it.v ? [] : String(it.v[it.kind] || '').split('|')).map(L.norm);
  if (answers.includes(t)) return 'right';
  return answers.some((a) => a.length > 4 && L.lev(t, a) <= 1) ? 'close' : 'wrong';
}

// ---------- the screens ----------
function formsStartScreen() {
  const P = fmPrefs(), sel = fmSel(), due = sel.filter(fmIsDue).length, fresh = sel.filter(fmIsNew).length, ahead = sel.filter((it) => fmRec(it).reps > 0 && !fmIsDue(it)).length;
  const ready = due + Math.min(fresh, fmNewLeft());
  const sw = (on, k, label, tip) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="fm-pref" data-k="${k}" data-v="${on ? '' : '1'}" title="${tip}"><i></i>${label}</button>`;
  const prefs = `<div class="fopts compact">
    <div class="og"><span class="muted">Options</span>${sw(P.retype, 'retype', '✍️ Retype', 'When you get a card wrong, you have to type the right form before moving on')}${sw(P.repeat, 'repeat', '🔁 Repeat', 'A card you get wrong comes back a few cards later, up to 2 times')}${sw(P.auto, 'auto', '🔊 Auto-speak', 'Say each sentence out loud after you answer')}</div>
    <div class="og"><span class="muted">Group</span><select id="fm-grp">${FM_GROUPS.map(([id, n]) => `<option value="${id}" ${P.group === id ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="og hint muted">You get a sentence with a word missing and the word it comes from. Type the right form: zijn → was, waren or geweest.</div></div>`;
  const loading = !fmVerbCache && !sel.length;
  return `<div class="fc-wrap">${prefs}
    <div class="card" style="text-align:center;padding:30px">${pigSvg(ready ? 'happy' : 'sleep', 'pig-md', { stage: pigStage(), card: true })}
      <p>${loading ? 'Finding sentences…' : ready ? `<b>${ready}</b> sentences are ready. I will be right here to cheer you on!` : 'Nothing is due right now. Nice!'}</p>
      ${ready ? '<div class="row" style="justify-content:center"><button class="primary" data-act="fm-go">Start</button></div>' : ''}
      <div class="more"><div class="muted" style="margin-bottom:8px">Want to do more?</div>
        <div class="row" style="justify-content:center"><label class="muted">Cards <select id="fm-n">${[10, 20, 30, 50, 100].map((n) => `<option ${P.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="ghost" data-act="fm-more" data-k="new" ${fresh ? '' : 'disabled'}>🌱 New sentences <span class="muted">${fresh}</span></button>
          <button class="ghost" data-act="fm-more" data-k="ahead" ${ahead ? '' : 'disabled'}>🔁 Review ahead <span class="muted">${ahead}</span></button>
          <button class="ghost" data-act="fm-more" data-k="mix" ${sel.length ? '' : 'disabled'}>🎲 Random mix</button></div></div></div></div>`;
}
function formsPage() {
  if (fm.sess) return fmSession();
  return '<div class="top"><div><h1>Flashcards</h1></div></div>' + `<div class="tabrow">${cardsTabs()}</div>` + formsStartScreen();
}
const fmPrevCards = VIEWS.cards;
VIEWS.cards = () => (!ui.cards && ui.cardsTab === 'forms' ? formsPage() : fmPrevCards());

function fmSession() {
  const s = fm.sess, cur = fmCur();
  if (!cur) {
    const line = (s.coach && s.coach.kind === 'done' && s.coach.line) || rnd(COACH.done);
    return `<div class="top"><h1>Klaar! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-md act-cheer', { stage: pigStage(), card: true })}
      <h2>${s.n} sentences practised</h2><p class="muted">${s.good} right first time (${s.n ? Math.round((s.good / s.n) * 100) : 0}%). ${esc(line)}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="fm-end">Back to word forms</button></div></div></div>`;
  }
  const { it } = cur, P = fmPrefs();
  const co = s.coach || {}, act = co.played ? '' : 'act-' + co.act; co.played = true;
  const coach = `<div class="coach">${pigSvg('happy', act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span>${s.last ? `<small class="lastw">${s.last.ok ? '✓' : '→'} ${esc(s.last.it.inf)} → ${esc(s.last.it.form)}</small>` : ''}</div></div>`;
  const hintTxt = s.hint ? esc(FM_KINDS[it.kind]) + (s.hint > 1 ? ' · ' + esc(L.hintText(it.form, 2)) : '') : '';
  const front = `<div class="ph-big">${esc(it.before)}<span class="vt-gap">___</span>${esc(it.after)}</div>
    <div class="muted">the word: <b class="fm-base">${esc(it.inf)}</b> <span class="muted">(${esc(it.meaning)})</span></div><div class="fc-hint" id="fm-hint">${hintTxt}</div>`;
  const verdict = s.res === 'close' ? spellNote(s.typed, [it.form]) : s.res === 'wrong' ? (s.typed ? `<div class="warn">You typed: ${esc(s.typed)}</div>` : '') : '';
  const parts = it.v ? `<div class="fc-ex">${vtParts(it.v)}</div>` : `<div class="fc-ex">${esc(it.inf)} = ${esc(it.meaning)}</div>`;
  const back = `<div class="ph-big ${s.res ? 'ans ' + s.res : ''}">${esc(it.before)}<b class="fc-form">${esc(it.form)}</b>${esc(it.after)}</div>${speakBtn(it.nl)}${parts}${verdict}${it.en ? `<div class="${s.res === 'wrong' && !s.typed ? 'warn' : 'cz-en'}">${esc(it.en)}</div>` : ''}`;
  const sug = s.res === 'wrong' ? 'again' : 'good', iv = L.previewIntervals(fmRec(it), today()), hk = hotkeys();
  const grades = `<div class="grades"><button class="g-again ${sug === 'again' ? 'on' : ''}" data-act="fm-grade" data-g="again"><span class="gl"><kbd class="kbd">${keyLabel(hk.again)}</kbd>Again</span><small>today</small></button><button class="g-good" data-act="fm-grade" data-g="good"><span class="gl"><kbd class="kbd">${keyLabel(hk.good)}</kbd>Good</span><small>${iv.good}d</small></button><button class="g-easy" data-act="fm-grade" data-g="easy"><span class="gl"><kbd class="kbd">${keyLabel(hk.easy)}</kbd>Easy</span><small>${iv.easy}d</small></button></div><div class="muted keyhint">⌨ Keyboard: press ${keyLabel(hk.again)}, ${keyLabel(hk.good)} or ${keyLabel(hk.easy)} to rate, ${keyLabel(hk.speak)} to hear it</div>`;
  const copyIn = `<p class="muted" style="text-align:center;margin:4px 0 8px">Type it once to move on 🌱</p><input type="text" class="big-in" id="fm-copy" data-focus data-enter="fm-copy-ok" autocomplete="off" spellcheck="false" placeholder="${esc(it.form)}"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="fm-copy-ok">Continue</button><button class="ghost keyed" data-act="fm-copy-skip">Skip${skipKey()}</button></div>`;
  const controls = s.phase === 'miss' ? copyIn : s.flipped ? grades
    : `<input type="text" class="big-in" id="fm-in" data-focus data-enter="fm-check" autocomplete="off" spellcheck="false" placeholder="Type the right form... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><kbd class="kbd">Space</kbd><button class="primary" data-act="fm-check">Check</button><button class="ghost keyed" data-act="fm-hint">💡 Hint<small class="btn-key">${typingKbd('hint')}</small></button><button class="ghost keyed" data-act="fm-skip">I don't know${skipKey()}</button></div>`;
  return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${L.sessionProgress(s)}${s.label ? ' · ' + esc(s.label) : ''}</p></div><button class="ghost" data-act="fm-end">End session</button></div>
    <div class="fc-wrap">${coach}<div class="bar"><i style="width:${(s.i / s.queue.length) * 100}%"></i></div>
    <div class="fc ${s.flipped ? 'flip' : ''} ${s.flipped && s.res ? 'r-' + s.res : ''}"><div class="fc-in"><div class="fc-face">${front}</div><div class="fc-face back">${back}</div></div></div>
    ${controls}</div>`;
}

// ---------- going through the cards ----------
function fmReveal() { const s = fm.sess, c = fmCur(); s.flipped = true; if (c && fmPrefs().auto) speak(c.it.nl); render(); }
function fmCheck() {
  const s = fm.sess, cur = fmCur(); if (!cur || s.flipped) return;
  const typed = ($('#fm-in') || {}).value || ''; if (!typed.trim()) return toast('Type something first, or press "I don\'t know"');
  s.typed = typed.trim(); s.res = fmJudge(typed, cur.it);
  chime(s.res === 'wrong' ? 'bad' : 'ok');
  if (s.res === 'wrong' && fmPrefs().retype) s.phase = 'miss';
  fmReveal();
}
function fmCopy(force) { // after a miss with Retype on: type the right form once
  const cur = fmCur(); if (!cur || fm.sess.phase !== 'miss') return;
  if (!force && L.norm(($('#fm-copy') || {}).value || '') !== L.norm(cur.it.form)) {
    const el = $('#fm-copy'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    return toast('Not quite: look at the answer and try again 🌸');
  }
  fmGrade('again', true);
}
function fmGrade(g, retyped) {
  const s = fm.sess, cur = fmCur(); if (!cur) return;
  if (g === 'again' && fmPrefs().retype && !retyped) { s.flipped = true; s.phase = 'miss'; render(); return; } // Retype: type the right form before it counts
  if (!fmRec(cur.it).reps) bumpDay('newForms');
  S.forms = S.forms || {}; S.forms[cur.it.id] = L.grade(fmRec(cur.it), g, today());
  s.n++; if (g !== 'again' && !cur.q.again) s.good++;
  if (fmPrefs().repeat) { if (g === 'again' || s.res === 'wrong') L.requeueMiss(s, cur.q, retyped); } // Repeat: only a miss comes back, a few cards later and at most twice
  else if (g === 'again' && !cur.q.again) s.queue.push(Object.assign({}, cur.q, { again: true, back: 1 }));
  chime(g === 'again' ? 'bad' : 'ok'); gainXp(g === 'again' ? XP.cardAgain : g === 'easy' ? XP.cardEasy : XP.cardGood);
  bumpDay(g === 'again' ? 'cMiss' : 'cOk'); if (g === 'again') noteMiss(cur.it.inf, 'forms');
  s.last = { ok: g !== 'again', it: cur.it };
  s.i++; if (s.queue[s.i] && s.last && s.queue[s.i].id === s.last.it.id) s.last = null; // the same card straight away: do not show its answer at the top
  s.flipped = false; s.phase = ''; s.res = null; s.typed = ''; s.hint = 0; s.streak = g === 'again' ? 0 : s.streak + 1;
  const mo = L.coachMoment({ grade: g, streak: s.streak, done: s.i, total: s.queue.length });
  s.coach = { kind: mo.kind, act: mo.act, line: rnd(COACH[mo.kind]), played: false, burst: mo.burst };
  count('reviews'); save();
  if (!fmCur()) { s.coach = { kind: 'done', act: 'cheer', line: rnd(COACH.done), played: true }; chime('goal'); confetti(); gainXp(XP.session); }
  render(); if (s.coach.burst) burstBits(s.coach.burst);
}
Object.assign(ACT, {
  'fm-pref': (el) => { const P = fmPrefs(), k = el.dataset.k; P[k] = !!el.dataset.v; save(); render(); },
  'fm-go': () => fmStart(fmPool('due'), ''), 'fm-more': (el) => fmStart(fmPool(el.dataset.k), { new: 'new sentences', ahead: 'review ahead', mix: 'random mix' }[el.dataset.k]),
  'fm-check': fmCheck, 'fm-grade': (el) => fmGrade(el.dataset.g),
  'fm-skip': () => { const s = fm.sess; s.res = 'wrong'; s.typed = ''; if (fmPrefs().retype) s.phase = 'miss'; fmReveal(); },
  'fm-hint': () => { const s = fm.sess; if (!fmCur()) return; s.hint = Math.min(2, (s.hint || 0) + 1); const h = $('#fm-hint'), it = fmCur().it; if (h) h.textContent = FM_KINDS[it.kind] + (s.hint > 1 ? ' · ' + L.hintText(it.form, 2) : ''); const t = $('#fm-in'); if (t) t.focus(); },
  'fm-copy-ok': () => fmCopy(false), 'fm-copy-skip': () => fmCopy(true),
  'fm-end': () => { fm.sess = null; render(); },
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'fm-grp') { fmPrefs().group = e.target.value; save(); render(); }
  if (e.target.id === 'fm-n') { fmPrefs().n = +e.target.value; save(); render(); }
});
document.addEventListener('keydown', (e) => {
  if (ui.view !== 'cards' || ui.cardsTab !== 'forms' || !fm.sess || !fmCur() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const s = fm.sess, c = fmCur(), hk = hotkeys(), k = keyOf(e);
  if (s.phase === 'miss') return;
  if (s.flipped && (k === hk.again || k === hk.good || k === hk.easy)) { e.preventDefault(); fmGrade(k === hk.again ? 'again' : k === hk.good ? 'good' : 'easy'); }
  else if (s.flipped && e.key === 'Enter') { e.preventDefault(); fmGrade(s.res === 'wrong' ? 'again' : 'good'); }
  else if (s.flipped && k === hk.speak) speak(c.it.nl);
  else if (k === hk.skip && !s.flipped) { e.preventDefault(); ACT['fm-skip'](); }
  else if (k === hk.hint && !s.flipped) { e.preventDefault(); ACT['fm-hint'](); }
});
