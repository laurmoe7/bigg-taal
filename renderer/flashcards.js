// Flashcard keyboard shortcuts. The keys can be changed in Settings (S.settings.keys); Enter always works too.
const HOTKEY_DEFS = [['flip', 'Show the answer', ' '], ['again', 'Rate: Again', '1'], ['good', 'Rate: Good', '2'], ['easy', 'Rate: Easy', '3'], ['speak', 'Hear the word', 'p'], ['hint', 'Show a hint (typing mode)', 'h'], ['skip', "I don't know / skip", '5']];
const hotkeys = () => Object.assign(Object.fromEntries(HOTKEY_DEFS.map((d) => [d[0], d[2]])), (S && S.settings && S.settings.keys) || {});
const keyOf = (e) => e.key.toLowerCase();
const keyLabel = (k) => ({ ' ': 'Space', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓' })[k] || (k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1));
// Flashcards: three ways to practise (flip, type and grade yourself, or type the Dutch word and only succeed when it is right),
// with Bigg as a coach: he holds a flashcard, drops in at the top when you start and reacts as you go.
// Loads after app.js and shares its scope.
const cardPrefs = () => {
  const p = (S.cardPrefs = Object.assign({ mode: 'flip', dir: 'nl-en', auto: false, retype: false, repeat: false, more: 20, group: '' }, S.cardPrefs || {}));
  if (p.mode === 'typing') { p.mode = 'type'; p.strict = true; }
  if (p.strict) { p.retype = true; } // the old Strict switch became Retype (type the word after a miss), which works in every mode
  delete p.strict;
  return p;
};
// Space can check the typed answer when that answer is one word (no article to type first, no spaces in it), in the typing modes
const spaceChecks = (cur) => {
  const p = cardPrefs(); if (!cur) return false;
  if (p.mode === 'cloze') return !!cur.q.cz && !/\s/.test(cur.q.cz.form);
  if (p.mode !== 'type') return false;
  const want = cur.q.dir === 'en-nl' ? (cur.w.article ? ' ' : cur.w.nl) : cur.w.en;
  return !/\s/.test(want || ' ');
};
const spaceKbd = (cur) => (spaceChecks(cur) ? '<kbd class="kbd">Space</kbd>' : '');
// the English for a card's example sentence: the one saved on the word, else the matching pair from the sentence bank
const exEnOf = (w) => w.exampleEn || (w.example && typeof SEED_EN !== 'undefined' && SEED_EN[w.example]) || (w.example && typeof SENTENCES !== 'undefined' && Array.isArray(SENTENCES) ? (SENTENCES.find((x) => x[0] === w.example) || [])[1] || '' : '');
const clozeFor = (w) => (w.example ? L.clozeOf(w.example, w.nl, w.pos) : null); // the word as it stands in its example sentence, or null
const wordLabel = (w) => (w.article ? w.article + ' ' : '') + w.nl;

// ---------- the group of words to practise ----------
// Like the Group list of the phrases: all your words, one of the Words page tabs (nouns, verbs, needs work...) or one lesson.
const cardGroupFn = () => {
  const g = cardPrefs().group || '';
  if (g.startsWith('lesson:')) { const l = g.slice(7); return (w) => w.lesson === l; }
  const t = typeof WORD_TABS !== 'undefined' && WORD_TABS.find((x) => x[0] === g);
  return t ? t[3] : () => true;
};
const cardPool = () => S.words.filter((w) => !w.deleted && cardGroupFn()(w));
const cardDue = () => L.queue(cardPool(), today(), S.settings.newPerDay, todayStats().newWords); // today's cards, from the chosen group
function cardGroupSel() {
  const g = cardPrefs().group || '', live = liveWords(), lessons = {};
  live.forEach((w) => { if (w.lesson) lessons[w.lesson] = (lessons[w.lesson] || 0) + 1; });
  const tabs = typeof WORD_TABS !== 'undefined' ? WORD_TABS.filter((t) => t[0] !== 'all') : [];
  return `<select id="fc-group"><option value="">📚 All words (${live.length})</option>${tabs.map((t) => `<option value="${t[0]}" ${g === t[0] ? 'selected' : ''}>${t[1]} ${esc(t[2])} (${live.filter(t[3]).length})</option>`).join('')}${Object.keys(lessons).length ? `<optgroup label="Lessons">${Object.keys(lessons).sort().map((l) => `<option value="lesson:${esc(l)}" ${g === 'lesson:' + l ? 'selected' : ''}>${esc(l)} (${lessons[l]})</option>`).join('')}</optgroup>` : ''}</select>`;
}

// ---------- starting a session ----------
function launchCards(pool, label) {
  const p = cardPrefs();
  if (!pool.length) return toast('Add some words first!');
  let note = '';
  if (p.mode === 'cloze') { loadData('sentences'); // only words whose example sentence contains the word can be a fill-the-blank card
    const all = pool.length; pool = pool.filter((w) => clozeFor(w));
    if (!pool.length) return toast('Fill the blank needs words with an example sentence that uses the word. Try Find examples on the Words page.');
    if (pool.length < all) note = ` (${all - pool.length} without a usable example skipped)`;
  }
  const dirFor = () => (p.mode === 'cloze' ? 'en-nl' : p.dir === 'mixed' ? rnd(['nl-en', 'en-nl']) : p.dir);
  ui.cards = {
    queue: pool.map((w) => ({ id: w.id, dir: dirFor(), again: false, cz: p.mode === 'cloze' ? clozeFor(w) : null })), i: 0, flipped: false, res: null, typed: '', n: 0, good: 0, label: (label || '') + note,
    streak: 0, phase: 'ask', hint: 0, last: null, coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false },
  };
  if (p.auto) autoSpeak();
  render();
}
function startCards() { // today's cards: everything due, plus the day's new words
  const pool = cardDue();
  if (!pool.length) return toast('Nothing is due. Use "Do more cards" below!');
  launchCards(pool.slice(0, 300), '');
}
// Do more than the daily amount: new words, earlier words ahead of schedule, or a random mix.
function startMore(kind) {
  const n = cardPrefs().more || 20, live = cardPool();
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
// Retype: the word has to be typed right after a miss (accents and capitals do not matter; the article is optional)
const typedMatches = (typed, w, form) => { const t = L.norm(typed); return !!t && (form ? t === L.norm(form) : t === L.norm(w.nl) || (!!w.article && t === L.norm(w.article + ' ' + w.nl))); };

// ---------- the screens ----------
const moreCards = () => { // "Do more cards", before and after a session
  const live = cardPool(), fresh = live.filter((w) => !w.reps).length, ahead = live.filter((w) => w.reps > 0 && !L.isDue(w, today())).length;
  return `<div class="more"><div class="muted" style="margin-bottom:8px">Want to do more?</div>
    <div class="row" style="justify-content:center"><label class="muted">Cards <select id="fc-n">${[10, 20, 30, 50, 100].map((n) => `<option ${(cardPrefs().more || 20) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="ghost" data-act="cards-more" data-k="new" ${fresh ? '' : 'disabled'}>🌱 New words <span class="muted">${fresh}</span></button>
      <button class="ghost" data-act="cards-more" data-k="review" ${ahead ? '' : 'disabled'}>🔁 Review ahead <span class="muted">${ahead}</span></button>
      <button class="ghost" data-act="cards-more" data-k="random" ${live.length ? '' : 'disabled'}>🎲 Random mix</button></div></div>`;
};
// the keyboard shortcuts, shown on the flashcards page (change them in Settings)
// While the typing box has focus a letter key would type itself, so letters need Ctrl there (Ctrl+H); digits and other keys work directly. Esc always skips.
const typingKbd = (id) => { const k = hotkeys()[id]; return `<kbd class="kbd">${/^\p{L}$/u.test(k) ? 'Ctrl+' : ''}${esc(keyLabel(k))}</kbd>`; };
const skipKey = () => `<small class="btn-key">${typingKbd('skip')}</small>`; // the key shown under the "I don't know" / Skip button
const kbdIn = (id) => `<kbd class="kbd">${esc(keyLabel(hotkeys()[id]))}</kbd>`; // a key label drawn on the button it triggers
const speakBtn = (t) => `<span class="speakw"><button class="speak" data-act="say" data-t="${esc(t)}" title="Listen">🔊</button>${kbdIn('speak')}</span>`;
const modeChip = (m, label) => `<button class="ghost ${cardPrefs().mode === m ? 'on' : ''}" data-act="cpref" data-k="mode" data-v="${m}">${label}</button>`;
const dirChip = (d, label) => `<button class="ghost ${cardPrefs().dir === d ? 'on' : ''}" data-act="cpref" data-k="dir" data-v="${d}">${label}</button>`;

VIEWS.cards = () => {
  const p = cardPrefs(), c = ui.cards, due = cardDue().length;
  const MODE_INFO = { flip: 'See the card, flip it, then rate how well you knew it.', type: 'Type your answer; the app checks it, then you rate yourself.', cloze: 'Fill the missing word in its example sentence, in the form the sentence needs. Only words with an example sentence.' };
  const dirBtn = (d, label) => dirChip(d, label);
  const sw = (on, k, label, off, tip) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="cpref" data-k="${k}" data-v="${on ? '' : '1'}" ${off ? 'disabled' : ''} title="${tip}"><i></i>${label}</button>`;
  const prefs = `<div class="fopts compact">
    <div class="og"><span class="muted">Mode</span>${modeChip('flip', 'Flip')}${modeChip('type', '⌨️ Type')}${modeChip('cloze', '✏️ Fill the blank')}<span class="sep"></span>${sw(p.retype, 'retype', '✍️ Retype', false, 'When you get a card wrong, you have to type the right word before moving on')}${sw(p.repeat, 'repeat', '🔁 Repeat', false, 'A card you rate 1 or 2, or get wrong, comes back 2 or 3 cards later until you know it')}</div>
    <div class="og"><span class="muted">Direction</span>${dirBtn('nl-en', 'NL → EN')}${dirBtn('en-nl', 'EN → NL')}${dirBtn('mixed', 'Mixed')}<span class="sep"></span>${sw(p.auto, 'auto', '🔊 Auto-speak', false, 'Say each word out loud when it appears')}</div>
    <div class="og"><span class="muted">Group</span>${cardGroupSel()}</div>
    <div class="og hint muted">${MODE_INFO[p.mode] || MODE_INFO.flip}</div></div>`;
  if (!c) {
    return `<div class="top"><div><h1>Flashcards</h1></div></div><div class="fc-wrap">${prefs}
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
  const { q, w } = cur, cz = p.mode === 'cloze' && q.cz, nlFront = q.dir === 'nl-en', type = p.mode === 'type' || !!cz;
  // the coach: Bigg holds a flashcard at the top; his animation plays once, right after something happened
  const co = c.coach || {}, act = co.played ? '' : 'act-' + co.act;
  co.played = true;
  const coach = `<div class="coach">${pigSvg('happy', act, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span>${c.last ? `<small class="lastw">${c.last.ok ? '✓' : '→'} ${esc(wordLabel(c.last.w))} = ${esc(c.last.w.en)}</small>` : ''}</div></div>`;
  const czGap = cz ? `${esc(cz.before)}<span class="vt-gap">___</span>${esc(cz.after)}` : '';
  const czBack = cz ? `${esc(cz.before)}<b class="fc-form">${esc(cz.form)}</b>${esc(cz.after)}` : '';
  const frontHtml = cz ? `<div class="ph-big">${czGap}</div><div class="muted">the word means: <b>${esc(w.en)}</b></div><div class="fc-hint" id="fc-hint">${c.hint ? esc(L.hintText(cz.form, c.hint)) : ''}</div>`
    : nlFront
    ? `${w.article ? `<div class="fc-art">${esc(w.article)}</div>` : ''}<div class="fc-big">${esc(w.nl)}</div>${speakBtn(wordLabel(w))}`
    : `<div class="fc-big">${esc(w.en)}</div><div class="muted">in Dutch</div>`;
  const ans = nlFront ? esc(w.en) : `${w.article ? `<span class="fc-art">${esc(w.article)}</span> ` : ''}${esc(w.nl)}`;
  const czBase = cz && c.res === 'close' && L.norm(c.typed) === L.norm(w.nl) && L.norm(c.typed) !== L.norm(cz.form);
  const backHtml = cz ? `<div class="ph-big ${c.res ? 'ans ' + c.res : ''}">${czBack}</div>${speakBtn(w.example)}<div class="fc-ex">${esc(wordLabel(w))} = ${esc(w.en)}</div>${czBase ? `<div class="warn">Right word, but this sentence needs <b>${esc(cz.form)}</b>.</div>` : c.res === 'close' ? '<div class="warn">Close! Check the spelling.</div>' : c.res === 'wrong' ? (c.typed || !exEnOf(w) ? `<div class="warn">${c.typed ? 'You typed: ' + esc(c.typed) : 'That is okay, here it is!'}</div>` : '') : ''}${exEnOf(w) ? `<div class="${c.res === 'wrong' && !c.typed ? 'warn' : 'cz-en'}">${esc(exEnOf(w))}</div>` : ''}`
    : `<div class="fc-big ${c.res ? 'ans ' + (c.res === 'article' ? 'close' : c.res) : ''}">${ans}</div>${!nlFront ? speakBtn(wordLabel(w)) : ''}${w.example ? `<div class="fc-ex">${esc(w.example)}${exEnOf(w) ? '<br>' + esc(exEnOf(w)) : ''}</div>` : ''}${c.res === 'close' ? '<div class="warn">Close! Check the spelling.</div>' : c.res === 'wrong' ? `<div class="warn">You typed: ${esc(c.typed)}</div>` : ''}`;
  const sug = c.res === 'wrong' ? 'again' : 'good';
  const iv = L.previewIntervals(w, today());
  const hk = hotkeys(), gradeBtns = `<div class="grades"><button class="g-again ${sug === 'again' ? 'on' : ''}" data-act="grade" data-g="again"><span class="gl"><kbd class="kbd" title="Press this key">${keyLabel(hk.again)}</kbd>Again</span><small>today</small></button><button class="g-good" data-act="grade" data-g="good"><span class="gl"><kbd class="kbd" title="Press this key">${keyLabel(hk.good)}</kbd>Good</span><small>${iv.good}d</small></button><button class="g-easy" data-act="grade" data-g="easy"><span class="gl"><kbd class="kbd" title="Press this key">${keyLabel(hk.easy)}</kbd>Easy</span><small>${iv.easy}d</small></button></div><div class="muted keyhint">⌨ Keyboard: press ${keyLabel(hk.again)}, ${keyLabel(hk.good)} or ${keyLabel(hk.easy)} to rate, ${keyLabel(hk.speak)} to hear it</div>`;
  let controls;
  const want = cz ? cz.form : wordLabel(w);
  if (c.phase === 'miss') {
    controls = `<p class="muted" style="text-align:center;margin:4px 0 8px">Type it once to move on 🌱</p><input type="text" class="big-in" id="copy" data-focus autocomplete="off" spellcheck="false" placeholder="${esc(want)}"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="copy-ok">Continue</button><button class="ghost keyed" data-act="copy-skip">Skip${skipKey()}</button></div>`;
  } else {
    controls = c.flipped ? gradeBtns : type
      ? `<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="${cz ? 'Type the missing word... (Enter)' : `Type the ${nlFront ? 'English' : 'Dutch'}... (Enter)`}"><div class="row" style="justify-content:center;margin-top:10px">${spaceKbd(cur)}<button class="primary" data-act="check">Check</button>${cz ? `<button class="ghost keyed" data-act="fc-hint">💡 Hint<small class="btn-key">${typingKbd('hint')}</small></button>` : ''}<button class="ghost keyed" data-act="skip">I don't know${skipKey()}</button></div>`
      : `<div class="row" style="justify-content:center"><button class="primary keyed" data-act="flip">Show answer<small class="btn-key">${kbdIn('flip')}</small></button></div>`;
  }
  const selfFlip = !type && !c.flipped;
  return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${c.i + 1} of ${c.queue.length}${c.label ? ' · ' + c.label : ''}</p></div><button class="ghost" data-act="cards-done">End session</button></div>
    <div class="fc-wrap">${coach}<div class="bar"><i style="width:${(c.i / c.queue.length) * 100}%"></i></div>
    <div class="fc ${c.flipped ? 'flip' : ''} ${c.flipped && c.res ? 'r-' + (c.res === 'article' ? 'close' : c.res) : ''}${c.flipped && c.res === 'right' && w.article && !cz && !nlFront && L.norm(c.typed) === L.norm(w.nl) ? ' noart' : ''}" ${selfFlip ? 'data-act="flip"' : ''}><div class="fc-in"><div class="fc-face">${frontHtml}${selfFlip ? '<div class="muted">click or press Space to flip</div>' : ''}</div><div class="fc-face back">${backHtml}</div></div></div>
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
function gradeCard(g, retyped) {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  if (g === 'again' && cardPrefs().retype && !retyped) { c.flipped = true; c.phase = 'miss'; speak(wordLabel(cur.w)); render(); return; } // Retype: type the right word before it counts
  if (!cur.w.reps) L.bump(S.log, today(), 'newWords');
  const upd = L.grade(cur.w, g, today()); S.words[S.words.indexOf(cur.w)] = upd;
  c.n++; if (g !== 'again' && !cur.q.again) c.good++;
  const retry = { id: cur.q.id, dir: cur.q.dir, again: true, cz: cur.q.cz };
  if (cardPrefs().repeat) { // Repeat: a card rated 1 or 2 (or answered wrong) comes back 2 or 3 cards later; a retry rated 1 or wrong comes back again
    if (cur.q.again ? g === 'again' || c.res === 'wrong' : g !== 'easy' || c.res === 'wrong') c.queue.splice(Math.min(c.queue.length, c.i + 2 + Math.floor(Math.random() * 2)), 0, retry);
  } else if (g === 'again' && !cur.q.again) c.queue.push(retry);
  chime(g === 'again' ? 'bad' : 'ok');
  gainXp(g === 'again' ? XP.cardAgain : g === 'easy' ? XP.cardEasy : XP.cardGood);
  bumpDay(g === 'again' ? 'cMiss' : 'cOk'); if (g === 'again') noteMiss(cur.w.nl, 'cards');
  c.last = { ok: g !== 'again', w: cur.w };
  c.i++; if (c.queue[c.i] && c.last && c.queue[c.i].id === c.last.w.id) c.last = null; // the same card straight away: do not show its answer at the top
  c.flipped = false; c.res = null; c.typed = ''; c.phase = 'ask'; c.hint = 0;
  c.streak = g === 'again' ? 0 : c.streak + 1;
  const mo = L.coachMoment({ grade: g, streak: c.streak, done: c.i, total: c.queue.length });
  c.coach = { kind: mo.kind, act: mo.act, line: rnd(COACH[mo.kind]), played: false, burst: mo.burst };
  count('reviews'); autoSpeak();
  if (!curCard()) { c.coach = { kind: 'done', act: 'cheer', line: rnd(COACH.done), played: true }; chime('goal'); confetti(); gainXp(XP.session); }
  render();
  if (c.coach.burst) burstBits(c.coach.burst);
}
function clozeCheck(typed, form, base) { // right | close (a typo, or the dictionary form instead of the form the sentence needs) | wrong
  const t = L.norm(typed), f = L.norm(form); if (!t) return 'wrong'; if (t === f) return 'right';
  return t === L.norm(L.stripArticle(base)) || (f.length > 4 && L.lev(t, f) <= 1) ? 'close' : 'wrong';
}
function checkTyped() {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  const typed = ($('#typed') || {}).value || '';
  if (c.phase === 'miss') return;
  if (c.flipped) return;
  const cz = cardPrefs().mode === 'cloze' && cur.q.cz;
  c.typed = typed; c.res = cz ? clozeCheck(typed, cz.form, cur.w.nl) : bestCheck(c.typed, cur.w, cur.q.dir); c.flipped = true;
  chime(c.res === 'wrong' ? 'bad' : 'ok'); if (c.res === 'right' && cur.q.dir === 'en-nl') speak(cz ? cur.w.example : cur.w.nl);
  if (c.res === 'wrong' && cardPrefs().retype) { c.phase = 'miss'; speak(wordLabel(cur.w)); }
  render();
}
function copyContinue(force) { // after a miss with Retype on: type the right word once, then it comes back later
  const c = ui.cards, cur = curCard(); if (!cur || c.phase !== 'miss') return;
  const cz = cardPrefs().mode === 'cloze' && cur.q.cz;
  if (!force && !typedMatches(($('#copy') || {}).value || '', cur.w, cz ? cz.form : '')) {
    const el = $('#copy'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    return toast('Not quite: look at the answer and try again 🌸');
  }
  c.last = { ok: false, w: cur.w };
  gradeCard('again', true);
}

Object.assign(ACT, {
  flip: () => { ui.cards.flipped = true; render(); },
  'cards-start': () => startCards(), 'cards-more': (el) => startMore(el.dataset.k), 'cards-done': () => { ui.cards = null; go('home'); },
  cpref: (el) => { const p = cardPrefs(); p[el.dataset.k] = ['auto', 'retype', 'repeat'].includes(el.dataset.k) ? !!el.dataset.v : el.dataset.v; save(); render(); },
  grade: (el) => gradeCard(el.dataset.g), check: checkTyped,
  skip: () => {
    const c = ui.cards, cur = curCard(); if (!cur) return;
    c.res = 'wrong'; c.typed = ''; c.flipped = true;
    if (cardPrefs().retype) { c.phase = 'miss'; speak(wordLabel(cur.w)); }
    render();
  },
  'fc-hint': () => { const c = ui.cards, cur = curCard(); if (!cur) return; c.hint = Math.min(2, (c.hint || 0) + 1); const h = $('#fc-hint'); if (h) h.textContent = L.hintText(cardPrefs().mode === 'cloze' && cur.q.cz ? cur.q.cz.form : cur.w.nl, c.hint); const t = $('#typed'); if (t) t.focus(); },
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
