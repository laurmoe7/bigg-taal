// Flashcard keyboard shortcuts. The keys can be changed in Settings (S.settings.keys); Enter always works too.
const HOTKEY_DEFS = [['flip', 'Show the answer', ' '], ['again', 'Rate: Again', '1'], ['good', 'Rate: Good', '2'], ['easy', 'Rate: Easy', '3'], ['speak', 'Hear the word', 'p'], ['hint', 'Show a hint (typing mode)', 'h']];
const hotkeys = () => Object.assign(Object.fromEntries(HOTKEY_DEFS.map((d) => [d[0], d[2]])), (S && S.settings && S.settings.keys) || {});
const keyOf = (e) => e.key.toLowerCase();
const keyLabel = (k) => ({ ' ': 'Space', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' })[k] || (k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1));
// Flashcards: three ways to practise (flip, type and grade yourself, or type the Dutch word and only succeed when it is right),
// with Bigg as a coach: he holds a flashcard, drops in at the top when you start and reacts as you go.
// Loads after app.js and shares its scope.
const cardPrefs = () => {
  const p = (S.cardPrefs = Object.assign({ mode: 'flip', dir: 'nl-en', auto: false, strict: false, more: 20 }, S.cardPrefs || {}));
  if (p.mode === 'typing') { p.mode = 'type'; p.strict = true; } // the old separate strict mode is now a switch on Type
  return p;
};
const isStrict = () => { const p = cardPrefs(); return p.mode === 'type' && !!p.strict; };
const wordLabel = (w) => (w.article ? w.article + ' ' : '') + w.nl;

// ---------- starting a session ----------
function launchCards(pool, label) {
  const p = cardPrefs();
  if (!pool.length) return toast('Add some words first!');
  const dirFor = () => (isStrict() ? 'en-nl' : p.dir === 'mixed' ? rnd(['nl-en', 'en-nl']) : p.dir);
  ui.cards = {
    queue: pool.map((w) => ({ id: w.id, dir: dirFor(), again: false })), i: 0, flipped: false, res: null, typed: '', n: 0, good: 0, label: label || '',
    streak: 0, phase: 'ask', hint: 0, last: null, coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false },
  };
  if (p.auto) autoSpeak();
  render();
}
function startCards() { // today's cards: everything due, plus the day's new words
  const pool = dueList();
  if (!pool.length) return toast('Nothing is due. Use "Do more cards" below!');
  launchCards(pool.slice(0, 300), '');
}
// Do more than the daily amount: new words, earlier words ahead of schedule, or a random mix.
function startMore(kind) {
  const n = cardPrefs().more || 20, live = liveWords();
  let pool, label;
  if (kind === 'new') { pool = live.filter((w) => !w.reps).slice(0, n); label = 'new words'; if (!pool.length) return toast('No unseen words left. Add more on the Words page!'); }
  else if (kind === 'review') { pool = live.filter((w) => w.reps > 0 && !L.isDue(w, today())).sort((x, y) => (x.due || '').localeCompare(y.due || '')).slice(0, n); label = 'review ahead'; if (!pool.length) return toast('Nothing else to review yet.'); }
  else { pool = L.pick(live, n); label = 'random mix'; }
  launchCards(pool, label);
}
function curCard() { const c = ui.cards; if (!c || c.i >= c.queue.length) return null; const q = c.queue[c.i]; return { q, w: S.words.find((x) => x.id === q.id) }; }
function autoSpeak() { const c = curCard(); if (c && c.q.dir === 'nl-en' && cardPrefs().auto) speak(c.w.nl); }

// ---------- checking what you typed ----------
// Old "type answer" mode (you grade yourself afterwards): right | close | wrong
const bestCheck = (typed, w, dir) => {
  if (dir === 'nl-en') return L.check(typed, w.en);
  const a = L.check(typed, wordLabel(w)), b = L.check(typed, w.nl);
  return a === 'right' || b === 'right' ? 'right' : a === 'close' || b === 'close' ? 'close' : 'wrong';
};
// Strict mode: the Dutch word has to be right (accents and capitals do not matter; the article is optional)
const typedMatches = (typed, w) => { const t = L.norm(typed); return !!t && (t === L.norm(w.nl) || (!!w.article && t === L.norm(w.article + ' ' + w.nl))); };
function strictResult(typed, w) { // right | article (right word, wrong de/het) | close (one typo) | wrong
  if (typedMatches(typed, w)) return 'right';
  const t = L.norm(typed), m = t.match(/^(de|het)\s+(.+)$/);
  if (m && w.article && m[1] !== w.article && m[2] === L.norm(w.nl)) return 'article';
  const accepted = [L.norm(w.nl)].concat(w.article ? [L.norm(wordLabel(w))] : []);
  return accepted.some((a) => a.length > 4 && L.lev(t, a) <= 1) ? 'close' : 'wrong';
}

// ---------- the screens ----------
const moreCards = () => { // "Do more cards", before and after a session
  const live = liveWords(), fresh = live.filter((w) => !w.reps).length, ahead = live.filter((w) => w.reps > 0 && !L.isDue(w, today())).length;
  return `<div class="more"><div class="muted" style="margin-bottom:8px">Want to do more?</div>
    <div class="row" style="justify-content:center"><label class="muted">Cards <select id="fc-n">${[10, 20, 30, 50, 100].map((n) => `<option ${(cardPrefs().more || 20) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="ghost" data-act="cards-more" data-k="new" ${fresh ? '' : 'disabled'}>🌱 New words <span class="muted">${fresh}</span></button>
      <button class="ghost" data-act="cards-more" data-k="review" ${ahead ? '' : 'disabled'}>🔁 Review ahead <span class="muted">${ahead}</span></button>
      <button class="ghost" data-act="cards-more" data-k="random" ${live.length ? '' : 'disabled'}>🎲 Random mix</button></div></div>`;
};
// the keyboard shortcuts, shown on the flashcards page (change them in Settings)
const hotkeyBar = () => { const hk = hotkeys(), k = (id) => `<kbd class="kbd">${esc(keyLabel(hk[id]))}</kbd>`; return `<div class="og hkbar"><span class="muted" style="font-size:12px;letter-spacing:.08em;text-transform:uppercase">Keys</span><span>${k('flip')} flip</span><span>${k('again')} again</span><span>${k('good')} good</span><span>${k('easy')} easy</span><span>${k('speak')} hear it</span><span>${k('hint')} hint</span><button class="ghost mini" data-act="nav" data-v="settings" title="Change the shortcuts in Settings">Change</button></div>`; };
const modeChip = (m, label) => `<button class="ghost ${cardPrefs().mode === m ? 'on' : ''}" data-act="cpref" data-k="mode" data-v="${m}">${label}</button>`;
const dirChip = (d, label) => `<button class="ghost ${cardPrefs().dir === d ? 'on' : ''}" data-act="cpref" data-k="dir" data-v="${d}">${label}</button>`;

VIEWS.cards = () => {
  const p = cardPrefs(), c = ui.cards, due = dueList().length, strict = isStrict();
  const MODE_INFO = { flip: 'See the card, flip it, then rate how well you knew it.', type: 'Type your answer; the app checks it, then you rate yourself.', strict: 'Strict: English → Dutch, counts only if typed right. A miss means retyping it once.' };
  const dirBtn = (d, label) => strict ? `<button class="ghost ${d === 'en-nl' ? 'on' : ''}" disabled>${label}</button>` : dirChip(d, label);
  const sw = (on, k, label, off, tip) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="cpref" data-k="${k}" data-v="${on ? '' : '1'}" ${off ? 'disabled' : ''} title="${tip}"><i></i>${label}</button>`;
  const prefs = `<div class="fopts compact">
    <div class="og"><span class="muted">Mode</span>${modeChip('flip', 'Flip')}${modeChip('type', '⌨️ Type')}<span class="sep"></span>${sw(strict, 'strict', 'Strict', p.mode !== 'type', 'Only counts when you type the Dutch right (Type mode)')}</div>
    <div class="og"><span class="muted">Direction</span>${dirBtn('nl-en', 'NL → EN')}${dirBtn('en-nl', 'EN → NL')}${dirBtn('mixed', 'Mixed')}<span class="sep"></span>${sw(p.auto, 'auto', '🔊 Auto-speak', false, 'Say each word out loud when it appears')}</div>
    <div class="og hint muted">${strict ? MODE_INFO.strict : MODE_INFO[p.mode] || MODE_INFO.flip}</div>${hotkeyBar()}</div>`;
  if (!c) {
    return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${due} due today. Spaced repetition shows hard words more often.</p></div></div><div class="fc-wrap">${prefs}
      <div class="card" style="text-align:center;padding:30px">${pigSvg(due ? 'happy' : 'sleep', 'pig-md', { stage: pigStage(), card: true })}
      <p>${due ? `<b>${due}</b> cards are ready. I will be right here to cheer you on!` : 'Nothing is due right now. Nice!'}</p>
      ${due ? '<div class="row" style="justify-content:center"><button class="primary" data-act="cards-start">Start</button></div>' : ''}
      ${moreCards()}</div></div>`;
  }
  const cur = curCard();
  if (!cur) {
    const line = (c.coach && c.coach.kind === 'done' && c.coach.line) || rnd(COACH.done);
    return `<div class="top"><h1>Klaar! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-md act-cheer', { stage: pigStage(), card: true })}
      <h2>${c.n} cards reviewed</h2><p class="muted">${c.good} remembered first time (${c.n ? Math.round((c.good / c.n) * 100) : 0}%). ${esc(line)}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="cards-done">Back to today</button></div>
      ${moreCards()}</div></div>`;
  }
  const { q, w } = cur, nlFront = q.dir === 'nl-en', type = p.mode === 'type' && !strict;
  // the coach: Bigg holds a flashcard at the top; his animation plays once, right after something happened
  const co = c.coach || {}, act = co.played ? '' : 'act-' + co.act;
  co.played = true;
  const coach = `<div class="coach">${pigSvg('happy', act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span>${c.last ? `<small class="lastw">${c.last.ok ? '✓' : '→'} ${esc(wordLabel(c.last.w))} = ${esc(c.last.w.en)}</small>` : ''}</div></div>`;
  const frontHtml = nlFront
    ? `${w.article ? `<div class="fc-art">${esc(w.article)}</div>` : ''}<div class="fc-big">${esc(w.nl)}</div><button class="speak" data-act="say" data-t="${esc(wordLabel(w))}" title="Listen">🔊</button>`
    : `<div class="fc-big">${esc(w.en)}</div><div class="muted">in Dutch</div>${strict ? `<div class="fc-hint" id="fc-hint">${c.hint ? esc(L.hintText(w.nl, c.hint)) : ''}</div>` : ''}`;
  const ans = nlFront ? esc(w.en) : `${w.article ? `<span class="fc-art">${esc(w.article)}</span> ` : ''}${esc(w.nl)}`;
  const strictMsg = c.res === 'article' ? `Right word, but it is <b>${esc(w.article)}</b> ${esc(w.nl)}.` : c.res === 'close' ? 'Almost! Check the spelling.' : c.res === 'wrong' ? (c.typed ? `You typed: ${esc(c.typed)}` : 'That is okay, here is the word!') : '';
  const backHtml = `<div class="fc-big ${c.res ? 'ans ' + (c.res === 'article' ? 'close' : c.res) : ''}">${ans}</div>${!nlFront ? `<button class="speak" data-act="say" data-t="${esc(wordLabel(w))}">🔊</button>` : ''}${w.example ? `<div class="fc-ex">${esc(w.example)}${w.exampleEn ? '<br>' + esc(w.exampleEn) : ''}</div>` : ''}${strict ? (strictMsg ? `<div class="warn">${strictMsg}</div>` : '') : c.res === 'close' ? '<div class="warn">Close! Check the spelling.</div>' : c.res === 'wrong' ? `<div class="warn">You typed: ${esc(c.typed)}</div>` : ''}`;
  const sug = c.res === 'wrong' ? 'again' : 'good';
  const iv = L.previewIntervals(w, today());
  const hk = hotkeys(), gradeBtns = `<div class="grades"><button class="g-again ${sug === 'again' ? 'on' : ''}" data-act="grade" data-g="again">Again<small><kbd class="kbd" title="Press this key">${keyLabel(hk.again)}</kbd> today</small></button><button class="g-good" data-act="grade" data-g="good">Good<small><kbd class="kbd" title="Press this key">${keyLabel(hk.good)}</kbd> ${iv.good}d</small></button><button class="g-easy" data-act="grade" data-g="easy">Easy<small><kbd class="kbd" title="Press this key">${keyLabel(hk.easy)}</kbd> ${iv.easy}d</small></button></div><div class="muted keyhint">⌨ Keyboard: press ${keyLabel(hk.again)}, ${keyLabel(hk.good)} or ${keyLabel(hk.easy)} to rate, ${keyLabel(hk.speak)} to hear it</div>`;
  let controls;
  if (strict) {
    controls = c.phase === 'miss'
      ? `<p class="muted" style="text-align:center;margin:4px 0 8px">Type it once to move on 🌱</p><input type="text" class="big-in" id="copy" data-focus autocomplete="off" spellcheck="false" placeholder="${esc(wordLabel(w))}"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="copy-ok">Continue</button><button class="ghost" data-act="copy-skip">Skip</button></div>`
      : `<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="Type the Dutch word... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="check">Check</button><button class="ghost" data-act="fc-hint">💡 Hint</button><button class="ghost" data-act="skip">I don't know</button></div>`;
  } else {
    controls = c.flipped ? gradeBtns : type
      ? `<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="Type the ${nlFront ? 'English' : 'Dutch'}... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="check">Check</button><button class="ghost" data-act="skip">I don't know</button></div>`
      : '<div class="row" style="justify-content:center"><button class="primary" data-act="flip">Show answer</button></div>';
  }
  const selfFlip = !type && !strict && !c.flipped;
  return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${c.i + 1} of ${c.queue.length}${c.label ? ' · ' + c.label : ''}</p></div><button class="ghost" data-act="cards-done">End session</button></div>
    <div class="fc-wrap">${coach}<div class="bar"><i style="width:${(c.i / c.queue.length) * 100}%"></i></div>
    <div class="fc ${c.flipped ? 'flip' : ''}" ${selfFlip ? 'data-act="flip"' : ''}><div class="fc-in"><div class="fc-face">${frontHtml}${selfFlip ? '<div class="muted">click or press Space to flip</div>' : ''}</div><div class="fc-face back">${backHtml}</div></div></div>
    ${controls}</div>`;
};

// ---------- going through the cards ----------
function burstBits(emoji) { // little emoji float up from Bigg
  const host = $('.coach'); if (!host || !emoji) return;
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('span');
    b.className = 'burst-bit'; b.textContent = emoji;
    b.style.left = 8 + Math.random() * 90 + 'px'; b.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px'); b.style.animationDelay = i * 70 + 'ms';
    host.appendChild(b); setTimeout(() => b.remove(), 1700);
  }
}
function gradeCard(g) {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  if (!cur.w.reps) L.bump(S.log, today(), 'newWords');
  const upd = L.grade(cur.w, g, today()); S.words[S.words.indexOf(cur.w)] = upd;
  c.n++; if (g !== 'again' && !cur.q.again) c.good++;
  if (g === 'again' && !cur.q.again) c.queue.push({ id: cur.q.id, dir: cur.q.dir, again: true });
  chime(g === 'again' ? 'bad' : 'ok');
  gainXp(g === 'again' ? XP.cardAgain : g === 'easy' ? XP.cardEasy : XP.cardGood);
  bumpDay(g === 'again' ? 'cMiss' : 'cOk'); if (g === 'again') noteMiss(cur.w.nl, 'cards');
  if (!isStrict()) c.last = { ok: g !== 'again', w: cur.w }; // (strict mode sets it itself, before grading)
  c.i++; c.flipped = false; c.res = null; c.typed = ''; c.phase = 'ask'; c.hint = 0;
  c.streak = g === 'again' ? 0 : c.streak + 1;
  const mo = L.coachMoment({ grade: g, streak: c.streak, done: c.i, total: c.queue.length });
  c.coach = { kind: mo.kind, act: mo.act, line: rnd(COACH[mo.kind]), played: false, burst: mo.burst };
  count('reviews'); autoSpeak();
  if (!curCard()) { c.coach = { kind: 'done', act: 'cheer', line: rnd(COACH.done), played: true }; chime('goal'); confetti(); gainXp(XP.session); }
  render();
  if (c.coach.burst) burstBits(c.coach.burst);
}
function checkTyped() {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  const typed = ($('#typed') || {}).value || '';
  if (isStrict()) {
    if (c.phase !== 'ask') return;
    if (!typed.trim()) return toast('Type the Dutch word first');
    const r = strictResult(typed, cur.w);
    c.typed = typed.trim();
    if (r === 'right') { c.last = { ok: true, w: cur.w }; speak(wordLabel(cur.w)); gradeCard('good'); }
    else { c.res = r; c.phase = 'miss'; c.flipped = true; chime('bad'); speak(wordLabel(cur.w)); render(); }
    return;
  }
  if (c.flipped) return;
  c.typed = typed; c.res = bestCheck(c.typed, cur.w, cur.q.dir); c.flipped = true;
  chime(c.res === 'wrong' ? 'bad' : 'ok'); if (c.res === 'right' && cur.q.dir === 'en-nl') speak(cur.w.nl); render();
}
function copyContinue(force) { // after a miss in strict mode: type the right word once, then it comes back later
  const c = ui.cards, cur = curCard(); if (!cur || c.phase !== 'miss') return;
  if (!force && !typedMatches(($('#copy') || {}).value || '', cur.w)) {
    const el = $('#copy'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    return toast('Not quite: look at the answer and try again 🌸');
  }
  c.last = { ok: false, w: cur.w };
  gradeCard('again');
}

Object.assign(ACT, {
  flip: () => { ui.cards.flipped = true; render(); },
  'cards-start': () => startCards(), 'cards-more': (el) => startMore(el.dataset.k), 'cards-done': () => { ui.cards = null; go('home'); },
  cpref: (el) => { const p = cardPrefs(); p[el.dataset.k] = el.dataset.k === 'auto' || el.dataset.k === 'strict' ? !!el.dataset.v : el.dataset.v; save(); render(); },
  grade: (el) => gradeCard(el.dataset.g), check: checkTyped,
  skip: () => {
    const c = ui.cards, cur = curCard(); if (!cur) return;
    c.res = 'wrong'; c.typed = ''; c.flipped = true;
    if (isStrict()) { c.phase = 'miss'; speak(wordLabel(cur.w)); }
    render();
  },
  'fc-hint': () => { const c = ui.cards, cur = curCard(); if (!cur) return; c.hint = Math.min(2, (c.hint || 0) + 1); const h = $('#fc-hint'); if (h) h.textContent = L.hintText(cur.w.nl, c.hint); const t = $('#typed'); if (t) t.focus(); },
  'copy-ok': () => copyContinue(false), 'copy-skip': () => copyContinue(true),
});
document.addEventListener('change', (e) => { if (e.target.id === 'fc-n') { cardPrefs().more = +e.target.value; save(); } });

// ---------- little helpers that make Bigg lively wherever he coaches (flashcards, listening, worksheets) ----------
const ACTS = ['in', 'hop', 'wiggle', 'nod', 'sway', 'spin', 'cheer', 'bounce', 'twirl', 'wave'];
// change what Bigg says and does without redrawing the page (for typing, where a redraw would be annoying)
function coachSay(line, act, burst) {
  const host = document.querySelector('.coach'); if (!host) return;
  const sp = host.querySelector('.cbub > span'); if (sp && line) sp.textContent = line;
  const pig = host.querySelector('svg.pig'); if (pig && act) { ACTS.forEach((x) => pig.classList.remove('act-' + x)); void pig.getBoundingClientRect(); pig.classList.add('act-' + act); }
  if (burst) burstBits(burst);
}
// when an animation ends he goes back to his gentle idle bob
document.addEventListener('animationend', (e) => { const t = e.target; if (t && t.matches && t.matches('.coach svg.pig')) ACTS.forEach((x) => t.classList.remove('act-' + x)); });
// poke him and he giggles
const POKES = ['Hehe, that tickles! 💗', 'Boop! 🌸', 'I am here, keep going! ✨', 'Hi hi! 🌱', 'You are doing so well! 💗', 'Wheee! 🎈'];
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.coach:not(.ws-coach) svg.pig')) coachSay(rnd(POKES), rnd(['bounce', 'twirl', 'wave', 'wiggle', 'hop']), rnd(['💗', '✨', '🌸', ''])); });
// safety net: whatever the animation events do, he settles back to his idle bob soon after a move starts
new MutationObserver(() => {
  const pig = document.querySelector('.coach svg.pig');
  if (pig && ACTS.some((x) => pig.classList.contains('act-' + x)) && !pig.dataset.settle) {
    pig.dataset.settle = '1';
    setTimeout(() => { ACTS.forEach((x) => pig.classList.remove('act-' + x)); delete pig.dataset.settle; }, 1400);
  }
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
