// Phrases: a phrasebook of everyday sentences ("Waar is het toilet?", "Ik wil graag een ...") practised as flashcards.
// Three ways to practise (flip, type the whole sentence, fill the missing word), the same FSRS scheduling as the word cards,
// a Browse tab to hear every sentence, and a Patterns tab where you swap words into a sentence frame. Data lives in phrasedata.js.
// Progress is kept in S.phrases[id] (the same fields as a word: reps, stab, diff, due, box...). Loads after app.js and shares its scope.

const phSlug = (s) => L.norm(s).replace(/ /g, '-');
const PH_SKIP = new Set(['alstublieft', 'graag', 'even', 'weer', 'heel', 'erg', 'nodig']);
function phAutoFill(nl) { // the word to hide when a phrase has no chosen one: the longest real word
  const words = nl.replace(/[.!?,;:"]+/g, '').split(/\s+/).filter(Boolean);
  if (words.length < 3) return '';
  const c = words.filter((w) => w.length >= 4 && !PH_SKIP.has(w.toLowerCase()));
  return c.length ? c.reduce((a, b) => (b.length > a.length ? b : a)) : '';
}
let phCache = null;
function phAll() { // every phrase, with the sentences made from the patterns at the end
  if (phCache) return phCache;
  const seen = new Set(), out = [];
  const add = (p) => { p.id = phSlug(p.nl); if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } };
  PHRASES.forEach(([cat, nl, en, fill]) => add({ cat, nl, en, fill: fill || phAutoFill(nl) }));
  PH_PATTERNS.forEach((pt, pi) => pt.swaps.forEach(([sn, se]) => add({ cat: 'pat', nl: pt.nl.replace('{}', sn), en: pt.en.replace('{}', se), fill: sn, pat: pi })));
  return (phCache = out);
}
const phRec = (p) => (S.phrases && S.phrases[p.id]) || {};
const phIsDue = (p) => { const r = phRec(p); return r.reps > 0 && L.isDue(r, today()); };
const phIsNew = (p) => !phRec(p).reps;
const phPrefs = () => (S.phPrefs = Object.assign({ mode: 'flip', dir: 'en-nl', n: 20, cats: [], auto: true, strict: false }, S.phPrefs || {}));
const ph = (ui.ph = ui.ph || { tab: 'practice', sess: null, bcat: 'hello', pat: {} });
const phStrict = (kind) => !!phPrefs().strict && kind !== 'flip'; // strict: only counts when typed right; a miss means typing it once
const phFilled = (pt, j) => pt.nl.replace('{}', pt.swaps[j][0]);

function phGapHtml(p) { // the Dutch sentence with the hidden word as a gap
  const f = p.fill, m = new RegExp('(^|[^\\p{L}])(' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\p{L}])', 'iu').exec(p.nl);
  if (!m) return esc(p.nl);
  const i = m.index + m[1].length;
  return esc(p.nl.slice(0, i)) + '<span class="vt-gap">___</span>' + esc(p.nl.slice(i + f.length));
}
function phJudge(kind, typed, p) { // right | close (a typo or missing accent) | wrong
  const a = L.norm(kind === 'fill' ? p.fill : p.nl), t = L.norm(typed);
  if (!t) return 'wrong'; if (t === a) return 'right';
  return a.length > 4 && L.lev(t, a) <= (a.length > 24 ? 2 : 1) ? 'close' : 'wrong';
}

// ---------- starting a session ----------
const phSel = () => { const P = phPrefs(); return phAll().filter((p) => !P.cats.length || P.cats.includes(p.cat)); };
const phNewLeft = () => Math.max(0, S.settings.newPerDay - (todayStats().newPhrases || 0)); // new phrases still allowed today, like the new words
function phPool(kind) {
  const P = phPrefs(), items = phSel();
  if (kind === 'mix') return L.pick(items, P.n);
  if (kind === 'new') return items.filter(phIsNew).slice(0, P.n);
  if (kind === 'ahead') return items.filter((p) => phRec(p).reps > 0 && !phIsDue(p)).sort((x, y) => (phRec(x).due || '').localeCompare(phRec(y).due || '')).slice(0, P.n);
  return L.shuffle(items.filter(phIsDue)).slice(0, 300).concat(items.filter(phIsNew).slice(0, phNewLeft()));
}
function phStart(items, label) {
  if (!items.length) return toast('Nothing to practise there yet. Try another group or the random mix!');
  const P = phPrefs();
  ph.sess = {
    queue: items.map((p) => ({ id: p.id, kind: P.mode === 'fill' ? (p.fill ? 'fill' : 'type') : P.mode, dir: P.mode !== 'flip' ? 'en-nl' : P.dir === 'mixed' ? rnd(['nl-en', 'en-nl']) : P.dir, again: false })),
    i: 0, flipped: false, res: null, typed: '', hint: 0, n: 0, good: 0, streak: 0, label: label || '', last: null,
    coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false },
  };
  ph.tab = 'practice'; phAutoSay(); render();
}
const phCur = () => { const s = ph.sess; if (!s || s.i >= s.queue.length) return null; const q = s.queue[s.i]; return { q, p: phAll().find((x) => x.id === q.id) }; };
function phAutoSay() { const c = phCur(); if (c && phPrefs().auto && c.q.kind === 'flip' && c.q.dir === 'nl-en') speak(c.p.nl); }

// ---------- the screens ----------
// Phrases live on the Flashcards page as a second folder tab next to your words
const phTabs = () => `<div class="seg">${[['practice', '🃏 Practise'], ['browse', '📖 Browse'], ['patterns', '🧩 Patterns']].map(([id, n]) => `<button class="${ph.tab === id ? 'on' : ''}" data-act="ph-tab" data-v="${id}">${n}</button>`).join('')}</div>`;
const cardsTabs = () => `<div class="tabs">${[['words', '🃏 My words'], ['phrases', '💬 Phrases']].map(([id, n]) => `<button class="tab ${(ui.cardsTab || 'words') === id ? 'on' : ''}" data-act="cards-tab" data-v="${id}">${n}</button>`).join('')}</div>`;
function phrasesPage() {
  if (ph.sess) return phSession();
  const head = '<div class="top"><div><h1>Flashcards</h1></div></div>';
  return head + cardsTabs() + phTabs() + (ph.tab === 'browse' ? phBrowse() : ph.tab === 'patterns' ? phPatterns() : phStartScreen());
}
const phPrevCards = VIEWS.cards;
VIEWS.cards = () => {
  if (ui.cards) return phPrevCards();
  if (ui.cardsTab === 'phrases') return phrasesPage();
  const html = phPrevCards(), i = html.indexOf('<div class="fc-wrap">');
  return i < 0 ? html : html.slice(0, i) + cardsTabs() + html.slice(i);
};
function phStartScreen() { // laid out like the start page of the word cards: options, then Bigg with Start, then "Want to do more?"
  const P = phPrefs(), sel = phSel(), due = sel.filter(phIsDue).length, fresh = sel.filter(phIsNew).length, ahead = sel.filter((p) => phRec(p).reps > 0 && !phIsDue(p)).length;
  const ready = due + Math.min(fresh, phNewLeft()), flip = P.mode === 'flip', strict = phStrict(P.mode);
  const modeBtn = (v, label) => `<button class="ghost ${P.mode === v ? 'on' : ''}" data-act="ph-pref" data-k="mode" data-v="${v}">${label}</button>`;
  const dirBtn = (v, label) => `<button class="ghost ${(flip ? P.dir : 'en-nl') === v ? 'on' : ''}" data-act="ph-pref" data-k="dir" data-v="${v}" ${flip ? '' : 'disabled'}>${label}</button>`;
  const sw = (on, k, label, off, tip) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="ph-pref" data-k="${k}" data-v="${on ? '' : '1'}" ${off ? 'disabled' : ''} title="${tip}"><i></i>${label}</button>`;
  const MODE_INFO = { flip: 'See the sentence, flip it, then rate how well you knew it.', type: 'You see the English and type the whole Dutch sentence. Capitals, accents and punctuation do not matter.', fill: 'The Dutch sentence is shown with one word missing; type that word. A few very short phrases are typed in full.', strict: 'Strict: counts only if typed right. A miss shows the answer and you type it once to move on.' };
  const prefs = `<div class="fopts compact">
    <div class="og"><span class="muted">Mode</span>${modeBtn('flip', 'Flip')}${modeBtn('type', '⌨️ Type')}${modeBtn('fill', '✏️ Fill the blank')}<span class="sep"></span>${sw(strict, 'strict', 'Strict', flip, 'Only counts when you type it right (Type and Fill the blank)')}</div>
    <div class="og"><span class="muted">Direction</span>${dirBtn('en-nl', 'EN → NL')}${dirBtn('nl-en', 'NL → EN')}${dirBtn('mixed', 'Mixed')}<span class="sep"></span>${sw(P.auto, 'auto', '🔊 Auto-speak', false, 'Say each sentence out loud')}</div>
    <div class="og"><span class="muted">Group</span><select id="ph-cat-sel"><option value="">All phrases</option>${PH_CATS.map(([id, ic, name]) => `<option value="${id}" ${P.cats[0] === id ? 'selected' : ''}>${ic} ${esc(name)}</option>`).join('')}</select></div>
    <div class="og hint muted">${strict ? MODE_INFO.strict : MODE_INFO[P.mode]}</div></div>`;
  return `<div class="fc-wrap">${prefs}
    <div class="card" style="text-align:center;padding:30px">${pigSvg(ready ? 'happy' : 'sleep', 'pig-md', { stage: pigStage(), card: true })}
      <p>${ready ? `<b>${ready}</b> phrases are ready. I will be right here to cheer you on!` : 'Nothing is due right now. Nice!'}</p>
      ${ready ? '<div class="row" style="justify-content:center"><button class="primary" data-act="ph-go">Start</button></div>' : ''}
      <div class="more"><div class="muted" style="margin-bottom:8px">Want to do more?</div>
        <div class="row" style="justify-content:center"><label class="muted">Cards <select id="ph-n">${[10, 20, 30, 50, 100].map((n) => `<option ${P.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="ghost" data-act="ph-more" data-k="new" ${fresh ? '' : 'disabled'}>🌱 New phrases <span class="muted">${fresh}</span></button>
          <button class="ghost" data-act="ph-more" data-k="ahead" ${ahead ? '' : 'disabled'}>🔁 Review ahead <span class="muted">${ahead}</span></button>
          <button class="ghost" data-act="ph-more" data-k="mix" ${sel.length ? '' : 'disabled'}>🎲 Random mix</button></div></div></div></div>`;
}
function phBrowse() {
  const all = phAll(), cur = PH_CATS.find((c) => c[0] === ph.bcat) || PH_CATS[0];
  const status = (p) => { const r = phRec(p); return !r.reps ? '<span class="muted" title="Not practised yet">○</span>' : r.box >= 4 ? '<span title="Well known" style="color:var(--mint)">●</span>' : '<span title="Learning" style="color:var(--butter)">◐</span>'; };
  const rows = all.filter((p) => p.cat === cur[0]).map((p) => `<div class="dl-row"><div><b class="dl-big">${esc(p.nl)}</b><small class="muted">${esc(p.en)}</small></div><div style="flex-direction:row;align-items:center;gap:12px">${status(p)}<button class="speak" style="position:static" data-act="say" data-t="${esc(p.nl)}" title="Listen">🔊</button></div></div>`).join('');
  return `<div class="chips2" style="margin-bottom:12px">${PH_CATS.map(([id, ic, name]) => `<button class="chip ${cur[0] === id ? 'on' : ''}" data-act="ph-bcat" data-v="${id}">${ic} ${esc(name)}</button>`).join('')}</div>
    <div class="card" style="max-width:820px"><h2>${cur[1]} ${esc(cur[2])}</h2>${rows}<p class="muted" style="margin:10px 0 0;font-size:13px">○ new · ◐ learning · ● well known</p></div>`;
}
function phPatterns() {
  return `<p class="muted" style="margin:0 0 12px">Learn a frame once and swap words in and out. Tap a word to hear the whole sentence.</p><div class="grid g2">${PH_PATTERNS.map((pt, i) => {
    const j = ph.pat[i] || 0, line = pt.nl.split('{}'), en = pt.en.replace('{}', pt.swaps[j][1]);
    return `<div class="card"><div style="font-size:24px;font-weight:900;line-height:1.3">${esc(line[0])}<span class="vt-gap" style="letter-spacing:0;color:var(--pink)">${esc(pt.swaps[j][0])}</span>${esc(line[1])}</div><div class="muted" style="margin:2px 0 10px">${esc(en)}</div>
      <div class="chips2">${pt.swaps.map((s, k) => `<button class="chip ${k === j ? 'on' : ''}" data-act="ph-pat" data-i="${i}" data-j="${k}" title="${esc(s[1])}">${esc(s[0])}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="ghost" data-act="say" data-t="${esc(phFilled(pt, j))}">🔊 Hear it</button><button class="ghost" data-act="ph-pat-go" data-i="${i}">🃏 Practise these</button></div></div>`;
  }).join('')}</div>`;
}
function phSession() {
  const s = ph.sess, cur = phCur(), P = phPrefs();
  if (!cur) {
    const line = (s.coach && s.coach.kind === 'done' && s.coach.line) || rnd(COACH.done);
    return `<div class="top"><h1>Klaar! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-md act-cheer', { stage: pigStage(), card: true })}
      <h2>${s.n} phrases practised</h2><p class="muted">${s.good} right first time (${s.n ? Math.round((s.good / s.n) * 100) : 0}%). ${esc(line)}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="ph-end">Back to phrases</button></div></div></div>`;
  }
  const { q, p } = cur, kind = q.kind, typing = kind !== 'flip', nlFront = kind === 'flip' && q.dir === 'nl-en';
  const co = s.coach || {}, act = co.played ? '' : 'act-' + co.act; co.played = true;
  const coach = `<div class="coach">${pigSvg('happy', act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span>${s.last ? `<small class="lastw">${s.last.ok ? '✓' : '→'} ${esc(s.last.p.nl)}</small>` : ''}</div></div>`;
  const target = kind === 'fill' ? p.fill : p.nl;
  const hintLine = `<div class="fc-hint" id="ph-hint">${s.hint ? esc(L.hintText(target, s.hint)) : ''}</div>`;
  const front = nlFront ? `<div class="ph-big">${esc(p.nl)}</div>${speakBtn(p.nl)}`
    : kind === 'fill' ? `<div class="muted">${esc(p.en)}</div><div class="ph-big">${phGapHtml(p)}</div>${hintLine}`
    : `<div class="ph-big">${esc(p.en)}</div><div class="muted">in Dutch</div>${kind === 'type' ? hintLine : ''}`;
  const verdict = s.res === 'close' ? '<div class="warn">Almost! Check the spelling.</div>' : s.res === 'wrong' ? `<div class="warn">${s.typed ? 'You typed: ' + esc(s.typed) : 'That is okay, here it is!'}</div>` : '';
  const back = nlFront ? `<div class="ph-big">${esc(p.en)}</div><div class="fc-ex">${esc(p.nl)}</div>`
    : `<div class="ph-big ${s.res ? 'ans ' + s.res : ''}">${esc(p.nl)}</div>${speakBtn(p.nl)}<div class="fc-ex">${esc(p.en)}</div>${verdict}`;
  const sug = s.res === 'wrong' ? 'again' : 'good', iv = L.previewIntervals(phRec(p), today()), hk = hotkeys();
  const grades = `<div class="grades"><button class="g-again ${sug === 'again' ? 'on' : ''}" data-act="ph-grade" data-g="again">Again<small><kbd class="kbd">${keyLabel(hk.again)}</kbd> today</small></button><button class="g-good" data-act="ph-grade" data-g="good">Good<small><kbd class="kbd">${keyLabel(hk.good)}</kbd> ${iv.good}d</small></button><button class="g-easy" data-act="ph-grade" data-g="easy">Easy<small><kbd class="kbd">${keyLabel(hk.easy)}</kbd> ${iv.easy}d</small></button></div><div class="muted keyhint">⌨ Keyboard: press ${keyLabel(hk.again)}, ${keyLabel(hk.good)} or ${keyLabel(hk.easy)} to rate</div>`;
  const strict = phStrict(kind), copyIn = `<p class="muted" style="text-align:center;margin:4px 0 8px">Type it once to move on 🌱</p><input type="text" class="big-in" id="ph-copy" data-focus data-enter="ph-copy-ok" autocomplete="off" spellcheck="false" placeholder="${esc(target)}"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="ph-copy-ok">Continue</button><button class="ghost" data-act="ph-copy-skip">Skip</button></div>`;
  const controls = strict && s.flipped ? copyIn : s.flipped ? grades : typing
    ? `<input type="text" class="big-in" id="ph-in" data-focus data-enter="ph-check" autocomplete="off" spellcheck="false" placeholder="${kind === 'fill' ? 'Type the missing word... (Enter)' : 'Type the Dutch sentence... (Enter)'}"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="ph-check">Check</button><button class="ghost" data-act="ph-hint">💡 Hint ${kbdIn('hint')}</button><button class="ghost" data-act="ph-skip">I don't know</button></div>`
    : `<div class="row" style="justify-content:center"><button class="primary" data-act="ph-flip">Show answer ${kbdIn('flip')}</button></div>`;
  const selfFlip = !typing && !s.flipped;
  return `<div class="top"><div><h1>Phrases</h1><p class="sub">${s.i + 1} of ${s.queue.length}${s.label ? ' · ' + esc(s.label) : ''}</p></div><button class="ghost" data-act="ph-end">End session</button></div>
    <div class="fc-wrap">${coach}<div class="bar"><i style="width:${(s.i / s.queue.length) * 100}%"></i></div>
    <div class="fc ${s.flipped ? 'flip' : ''}" ${selfFlip ? 'data-act="ph-flip"' : ''}><div class="fc-in"><div class="fc-face">${front}${selfFlip ? '<div class="muted">click or press Space to flip</div>' : ''}</div><div class="fc-face back">${back}</div></div></div>
    ${controls}</div>`;
}

// ---------- going through the cards ----------
function phCopy(force) { // after a miss in strict mode: type the right answer once, then the card comes back later
  const cur = phCur(); if (!cur || !ph.sess.flipped) return;
  const target = cur.q.kind === 'fill' ? cur.p.fill : cur.p.nl;
  if (!force && L.norm(($('#ph-copy') || {}).value || '') !== L.norm(target)) {
    const el = $('#ph-copy'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    return toast('Not quite: look at the answer and try again 🌸');
  }
  phGrade('again');
}
function phReveal() { const s = ph.sess, c = phCur(); s.flipped = true; if (c && !(c.q.kind === 'flip' && c.q.dir === 'nl-en') && phPrefs().auto) speak(c.p.nl); render(); }
function phGrade(g) {
  const s = ph.sess, cur = phCur(); if (!cur) return;
  if (!phRec(cur.p).reps) bumpDay('newPhrases');
  S.phrases = S.phrases || {}; S.phrases[cur.p.id] = L.grade(phRec(cur.p), g, today());
  s.n++; if (g !== 'again' && !cur.q.again) s.good++;
  if (g === 'again' && !cur.q.again) s.queue.push({ id: cur.q.id, kind: cur.q.kind, dir: cur.q.dir, again: true });
  chime(g === 'again' ? 'bad' : 'ok'); gainXp(g === 'again' ? XP.cardAgain : g === 'easy' ? XP.cardEasy : XP.cardGood);
  bumpDay(g === 'again' ? 'cMiss' : 'cOk'); if (g === 'again') noteMiss(cur.p.nl, 'phrases');
  s.last = { ok: g !== 'again', p: cur.p };
  s.i++; s.flipped = false; s.res = null; s.typed = ''; s.hint = 0; s.streak = g === 'again' ? 0 : s.streak + 1;
  const mo = L.coachMoment({ grade: g, streak: s.streak, done: s.i, total: s.queue.length });
  s.coach = { kind: mo.kind, act: mo.act, line: rnd(COACH[mo.kind]), played: false, burst: mo.burst };
  count('reviews'); save(); phAutoSay();
  if (!phCur()) { s.coach = { kind: 'done', act: 'cheer', line: rnd(COACH.done), played: true }; chime('goal'); confetti(); gainXp(XP.session); }
  render(); if (s.coach.burst) burstBits(s.coach.burst);
}
function phCheck() {
  const s = ph.sess, cur = phCur(); if (!cur || s.flipped) return;
  const typed = ($('#ph-in') || {}).value || ''; if (!typed.trim()) return toast('Type something first, or press "I don\'t know"');
  s.typed = typed.trim(); s.res = phJudge(cur.q.kind, typed, cur.p);
  if (phStrict(cur.q.kind)) {
    if (s.res === 'right') { speak(cur.p.nl); return phGrade('good'); }
    chime('bad'); return phReveal(); // a miss (a typo counts too): the answer is shown and has to be typed once
  }
  chime(s.res === 'wrong' ? 'bad' : 'ok'); phReveal();
}
Object.assign(ACT, {
  'cards-tab': (el) => { ui.cardsTab = el.dataset.v; render(); },
  'ph-tab': (el) => { ph.tab = el.dataset.v; render(); },
  'ph-bcat': (el) => { ph.bcat = el.dataset.v; render(); },
  'ph-pref': (el) => { const P = phPrefs(), k = el.dataset.k; P[k] = k === 'auto' || k === 'strict' ? !!el.dataset.v : el.dataset.v; save(); render(); },
  'ph-go': () => phStart(phPool('due'), ''), 'ph-more': (el) => phStart(phPool(el.dataset.k), { new: 'new phrases', ahead: 'review ahead', mix: 'random mix' }[el.dataset.k]),
  'ph-pat': (el) => { const i = +el.dataset.i, j = +el.dataset.j; ph.pat[i] = j; speak(phFilled(PH_PATTERNS[i], j)); render(); },
  'ph-pat-go': (el) => { const pt = PH_PATTERNS[+el.dataset.i]; phStart(pt.swaps.map((_, j) => phAll().find((p) => p.id === phSlug(phFilled(pt, j)))).filter(Boolean), 'pattern'); },
  'ph-flip': () => phReveal(), 'ph-check': phCheck, 'ph-grade': (el) => phGrade(el.dataset.g),
  'ph-skip': () => { const s = ph.sess; s.res = 'wrong'; s.typed = ''; phReveal(); },
  'ph-hint': () => { const s = ph.sess, cur = phCur(); if (!cur) return; s.hint = Math.min(2, (s.hint || 0) + 1); const h = $('#ph-hint'); if (h) h.textContent = L.hintText(cur.q.kind === 'fill' ? cur.p.fill : cur.p.nl, s.hint); const t = $('#ph-in'); if (t) t.focus(); },
  'ph-copy-ok': () => phCopy(false), 'ph-copy-skip': () => phCopy(true),
  'ph-end': () => { ph.sess = null; render(); },
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'ph-cat-sel') { phPrefs().cats = e.target.value ? [e.target.value] : []; save(); render(); } if (e.target.id === 'ph-n') { phPrefs().n = +e.target.value; save(); render(); } });
document.addEventListener('keydown', (e) => {
  if (ui.view !== 'cards' || ui.cardsTab !== 'phrases' || !ph.sess || !phCur() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const s = ph.sess, c = phCur(), hk = hotkeys(), k = keyOf(e);
  if (!s.flipped && c.q.kind === 'flip' && (k === hk.flip || e.key === 'Enter')) { e.preventDefault(); phReveal(); }
  else if (s.flipped && phStrict(c.q.kind)) return;
  else if (s.flipped && (k === hk.again || k === hk.good || k === hk.easy)) { e.preventDefault(); phGrade(k === hk.again ? 'again' : k === hk.good ? 'good' : 'easy'); }
  else if (s.flipped && e.key === 'Enter') { e.preventDefault(); phGrade(s.res === 'wrong' ? 'again' : 'good'); }
  else if (k === hk.speak) speak(c.p.nl);
  else if (k === hk.hint && !s.flipped && c.q.kind !== 'flip') { e.preventDefault(); ACT['ph-hint'](); }
});
