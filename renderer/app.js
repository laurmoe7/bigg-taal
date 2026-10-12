// BiggTaal page code. State S is saved whole through window.vt (Electron) or localStorage (fallback).
let S = L.emptyState();
const ui = { view: 'home', cards: null, listen: null, say: '', words: { q: '', lesson: '', sort: 'new' }, sheet: null, lessonId: '', edit: null, draftText: '', cand: [] };
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => L.ymd();
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ''));

// ---------- saving ----------
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { if (window.vt) window.vt.save(S); else try { localStorage.setItem('biggtaal', JSON.stringify(S)); } catch {} }, 250);
}
async function load() {
  let d = null;
  try { d = window.vt ? await window.vt.load() : JSON.parse(localStorage.getItem('biggtaal') || 'null'); } catch {}
  S = L.fixState(d);
  if (!S.seeded) {
    const w = L.parseVocab(SEED_WORDS); w.forEach((x) => { x.lesson = 'Starter B1'; });
    S.words = L.mergeWords(S.words, w).words; S.seeded = true; save();
  }
  if (window.vt && S.settings.login != null) window.vt.launchAtLogin(S.settings.login);
}

// ---------- sound, speech, toast ----------
let actx;
function chime(kind) {
  if (!S.settings.sound) return;
  try {
    actx = actx || new AudioContext();
    const notes = kind === 'goal' ? [523, 659, 784, 1047] : kind === 'bad' ? [262] : [659, 880];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.11;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.32);
    });
  } catch {}
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function confetti() {
  const bits = ['🌸', '💗', '✨', '🌱', '⭐', '🎉'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('div'); c.className = 'confetti'; c.textContent = rnd(bits);
    c.style.left = Math.random() * 100 + 'vw'; c.style.animationDelay = Math.random() * 0.6 + 's'; c.style.fontSize = 14 + Math.random() * 18 + 'px';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
  }
}
let VOICES = [];
function loadVoices() { try { VOICES = speechSynthesis.getVoices(); } catch { VOICES = []; } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (ui.view === 'settings' || ui.view === 'listen') render(); }; }
const dutchVoices = () => VOICES.filter((v) => /^nl\b|^nl[-_]/i.test(v.lang));
function nlVoice() { return VOICES.find((v) => v.name === S.settings.voice && /^nl/i.test(v.lang)) || dutchVoices()[0]; }
function speak(text, slow) {
  const v = nlVoice();
  if (!v) { toast('No Dutch voice found. See Settings > Voice.'); return false; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = Math.max(0.3, S.settings.rate * (slow ? 0.65 : 1));
  speechSynthesis.speak(u); return true;
}

// ---------- activity ----------
function count(key, n) {
  const before = (S.log[today()] || {}).reviews || 0;
  L.bump(S.log, today(), key, n);
  const after = (S.log[today()] || {}).reviews || 0;
  if (key === 'reviews' && before < S.settings.dailyGoal && after >= S.settings.dailyGoal) { chime('goal'); confetti(); toast('Daily goal reached! Yay! 🎉'); ui.say = rnd(PIG.goal); }
  save();
}
const dueList = () => L.queue(S.words, today(), S.settings.newPerDay, todayStats().newWords);
const todayStats = () => S.log[today()] || {};
const liveWords = () => S.words.filter((w) => !w.deleted);
const openLessons = () => S.lessons.filter((l) => !l.deleted && l.status !== 'done').sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
const isNight = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };

// ---------- pig ----------
function pigMood() {
  if (isNight()) return 'sleep';
  const over = openLessons().filter((l) => l.due && l.due < today()).length;
  if (over || dueList().length > 150) return 'worry';
  return 'happy';
}
function pigStage() { const r = todayStats().reviews || 0, g = S.settings.dailyGoal; return r >= g ? 3 : r >= g * 0.6 ? 2 : r >= g * 0.3 ? 1 : 0; }
function pigLine() {
  const due = dueList().length, st = L.streak(S.log, today()), t = todayStats(), open = openLessons();
  const over = open.find((l) => l.due && l.due < today());
  if (isNight()) return rnd(PIG.night);
  if (!liveWords().length) return rnd(PIG.welcome);
  if (over) return fill(rnd(PIG.overdue), { t: over.title });
  if ((t.reviews || 0) >= S.settings.dailyGoal) return st > 2 && Math.random() < 0.5 ? fill(rnd(PIG.streak), { s: st }) : rnd(PIG.goal);
  const pool = [];
  if (due) pool.push(...PIG.due.map((x) => fill(x, { n: due })));
  else pool.push(...PIG.nothingDue);
  if (open.length) pool.push(...PIG.lesson.map((x) => fill(x, { t: open[0].title })));
  else if (S.lessons.length) pool.push(...PIG.lessonsDone);
  if (st > 1) pool.push(...PIG.streak.map((x) => fill(x, { s: st })));
  return rnd(pool);
}

// ---------- shell ----------
const NAV = [['home', '🏠', 'Today', '#ff9d8e'], ['cards', '🃏', 'Flashcards', '#7fd4f0'], ['listen', '🎧', 'Listening', '#9ccbff'], ['sheets', '📝', 'Worksheets', '#ffe08a'],
  ['lessons', '📖', 'Book lessons', '#8ff0c8'], ['words', '🔤', 'Words', '#ffb38a'], ['grammar', '🧠', 'Grammar', '#ffa6c4'], ['settings', '⚙️', 'Settings', '#cfc6ee']];
function renderSide() {
  const due = dueList().length, open = openLessons().length;
  $('#side').innerHTML = `<div class="logo">${pigSvg('happy', '', { stage: pigStage() })}<div><b>BiggTaal</b><span>Nederlands leren</span></div></div>` +
    NAV.map(([id, ic, name, col]) => `<button class="nav ${ui.view === id ? 'on' : ''}" data-act="nav" data-v="${id}"><span class="ic" style="background:${col}">${ic}</span><span class="t">${name}</span>` +
      (id === 'cards' && due ? `<span class="badge">${due}</span>` : id === 'lessons' && open ? `<span class="badge">${open}</span>` : '') + '</button>').join('') +
    `<div class="side-foot">🔥 ${L.streak(S.log, today())}-day streak<br>${liveWords().length} words</div>`;
}
function render() {
  renderSide();
  const v = VIEWS[ui.view] || VIEWS.home;
  const main = $('#main'), keep = main.scrollTop;
  main.innerHTML = v();
  main.scrollTop = keep;
  const f = $('[data-focus]'); if (f) f.focus();
}
function go(v) { ui.view = v; ui.say = ''; render(); $('#main').scrollTop = 0; }

const VIEWS = {};

// ---------- home ----------
VIEWS.home = () => {
  const t = todayStats(), g = S.settings.dailyGoal, due = dueList().length, m = L.mastery(S.words), st = L.streak(S.log, today());
  if (!ui.say) ui.say = pigLine();
  const week = L.week(S.log, today()), max = Math.max(5, ...week.map((x) => x.n));
  const open = openLessons(), next = open[0], pv = PROVERBS[Math.floor(Date.now() / 864e5) % PROVERBS.length];
  const dn = (d) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(d + 'T12:00').getDay()];
  return `<div class="hero">${pigSvg(pigMood(), '', { stage: pigStage(), note: true, cap: isNight() })}<div class="bubble" id="bubble">${esc(ui.say)}</div></div>
  <div class="grid g4">
    <div class="card stat s-coral"><i class="si">🎯</i><b>${(t.reviews || 0)} / ${g}</b><span>cards today</span><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, ((t.reviews || 0) / g) * 100)}%"></i></div></div>
    <div class="card stat s-sun"><i class="si">🔥</i><b>${st}</b><span>day streak</span></div>
    <div class="card stat s-aqua"><i class="si">🃏</i><b>${due}</b><span>cards due now</span></div>
    <div class="card stat s-mint"><i class="si">🌱</i><b>${m.learned} <small class="muted">/ ${m.total}</small></b><span>words learned (box 4+)</span></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h2>Start here</h2>
      <div class="row">
        <button class="primary" data-act="nav" data-v="cards">🃏 ${due ? `Review ${due} cards` : 'Flashcards'}</button>
        <button class="ghost" data-act="nav" data-v="listen">🎧 Listening</button>
        <button class="ghost" data-act="nav" data-v="sheets">📝 Worksheet</button>
      </div></div>
    <div class="card"><h2>Book lesson</h2>${next
      ? `<div class="row"><div class="grow"><b>${esc(next.title)}</b><div class="${next.due && next.due < today() ? 'warn' : 'muted'}">${next.due ? (next.due < today() ? 'Overdue since ' : 'Due ') + esc(next.due) : 'No due date'}</div></div>
         <button class="ghost" data-act="lesson-status" data-id="${next.id}" data-s="done">✓ Done</button><button class="ghost" data-act="nav" data-v="lessons">Open</button></div>`
      : `<p class="muted">${S.lessons.length ? 'No open lessons. 🎉' : 'Add your NT2school lessons so I can remind you.'}</p><button class="ghost" data-act="nav" data-v="lessons">Add lessons</button>`}</div>
    <div class="card"><h2>Last 7 days</h2><div class="week">${week.map((x, i) => `<div class="${i === 6 ? 'today' : ''}"><i style="height:${Math.round((x.n / max) * 44)}px"></i>${dn(x.d)}</div>`).join('')}</div></div>
    <div class="card"><h2>Spreuk van de dag</h2><div style="font-size:18px;font-weight:800">${esc(pv[0])}</div><div class="muted">${esc(pv[1])}</div>
      <button class="ghost" style="margin-top:10px" data-act="say" data-t="${esc(pv[0])}">🔊 Listen</button></div>
  </div>`;
};

// ---------- flashcards ----------
const bestCheck = (typed, w, dir) => {
  if (dir === 'nl-en') return L.check(typed, w.en);
  const a = L.check(typed, (w.article ? w.article + ' ' : '') + w.nl), b = L.check(typed, w.nl);
  return a === 'right' || b === 'right' ? 'right' : a === 'close' || b === 'close' ? 'close' : 'wrong';
};
const cardPrefs = () => (S.cardPrefs = S.cardPrefs || { mode: 'flip', dir: 'nl-en', auto: false });
function startCards(extra) {
  const p = cardPrefs();
  let pool = dueList();
  if (extra || !pool.length) pool = L.pick(liveWords(), 10);
  pool = pool.slice(0, 40);
  if (!pool.length) return toast('Add some words first!');
  ui.cards = { queue: pool.map((w) => ({ id: w.id, dir: p.dir === 'mixed' ? rnd(['nl-en', 'en-nl']) : p.dir, again: false })), i: 0, flipped: false, res: null, typed: '', n: 0, good: 0, extra: !!extra };
  if (p.auto) autoSpeak();
  render();
}
function curCard() { const c = ui.cards; if (!c || c.i >= c.queue.length) return null; const q = c.queue[c.i]; return { q, w: S.words.find((x) => x.id === q.id) }; }
function autoSpeak() { const c = curCard(); if (c && c.q.dir === 'nl-en' && cardPrefs().auto) speak(c.w.nl); }
VIEWS.cards = () => {
  const p = cardPrefs(), c = ui.cards, due = dueList().length;
  const prefs = `<div class="row" style="margin-bottom:6px">
    <span class="muted">Mode</span> <button class="ghost ${p.mode === 'flip' ? 'on' : ''}" data-act="cpref" data-k="mode" data-v="flip">Flip</button><button class="ghost ${p.mode === 'type' ? 'on' : ''}" data-act="cpref" data-k="mode" data-v="type">Type answer</button>
    <span class="muted">Direction</span> <button class="ghost ${p.dir === 'nl-en' ? 'on' : ''}" data-act="cpref" data-k="dir" data-v="nl-en">NL → EN</button><button class="ghost ${p.dir === 'en-nl' ? 'on' : ''}" data-act="cpref" data-k="dir" data-v="en-nl">EN → NL</button><button class="ghost ${p.dir === 'mixed' ? 'on' : ''}" data-act="cpref" data-k="dir" data-v="mixed">Mixed</button>
    <button class="ghost ${p.auto ? 'on' : ''}" data-act="cpref" data-k="auto" data-v="${p.auto ? '' : '1'}">🔊 Auto-speak</button></div>`;
  if (!c) {
    return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${due} due today. Spaced repetition shows hard words more often.</p></div></div><div class="fc-wrap">${prefs}
      <div class="card" style="text-align:center;padding:30px">${pigSvg(due ? 'happy' : 'sleep', '', { stage: pigStage() })}
      <p>${due ? `<b>${due}</b> cards are ready.` : 'Nothing is due right now. Nice!'}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="cards-start">${due ? 'Start' : 'Practice 10 random words'}</button>${due ? '<button class="ghost" data-act="cards-extra">Practice 10 random instead</button>' : ''}</div></div></div>`;
  }
  const cur = curCard();
  if (!cur) {
    return `<div class="top"><h1>Klaar! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', '', { stage: pigStage(), note: true })}
      <h2>${c.n} cards reviewed</h2><p class="muted">${c.good} remembered first time (${c.n ? Math.round((c.good / c.n) * 100) : 0}%). ${rnd(PIG.right)}</p>
      <div class="row" style="justify-content:center"><button class="primary" data-act="cards-done">Back to today</button><button class="ghost" data-act="cards-start">More cards</button></div></div></div>`;
  }
  const { q, w } = cur, nlFront = q.dir === 'nl-en', type = p.mode === 'type';
  const frontHtml = nlFront ? `${w.article ? `<div class="fc-art">${esc(w.article)}</div>` : ''}<div class="fc-big">${esc(w.nl)}</div><button class="speak" data-act="say" data-t="${esc((w.article ? w.article + ' ' : '') + w.nl)}" title="Listen">🔊</button>` : `<div class="fc-big">${esc(w.en)}</div><div class="muted">in Dutch</div>`;
  const ans = nlFront ? esc(w.en) : `${w.article ? `<span class="fc-art">${esc(w.article)}</span> ` : ''}${esc(w.nl)}`;
  const backHtml = `<div class="fc-big ${c.res ? 'ans ' + c.res : ''}">${ans}</div>${!nlFront ? `<button class="speak" data-act="say" data-t="${esc((w.article ? w.article + ' ' : '') + w.nl)}">🔊</button>` : ''}${w.example ? `<div class="fc-ex">${esc(w.example)}${w.exampleEn ? '<br>' + esc(w.exampleEn) : ''}</div>` : ''}${c.res === 'close' ? '<div class="warn">Close! Check the spelling.</div>' : ''}${c.res === 'wrong' ? `<div class="warn">You typed: ${esc(c.typed)}</div>` : ''}`;
  const sug = c.res === 'wrong' ? 'again' : 'good';
  const gradeBtns = `<div class="grades"><button class="g-again ${sug === 'again' ? 'on' : ''}" data-act="grade" data-g="again">Again<small>1 · today</small></button><button class="g-good" data-act="grade" data-g="good">Good<small>2 · ${L.INTERVALS[Math.min(7, w.box + 1)]}d</small></button><button class="g-easy" data-act="grade" data-g="easy">Easy<small>3 · ${L.INTERVALS[Math.min(7, w.box + 2)]}d</small></button></div>`;
  return `<div class="top"><div><h1>Flashcards</h1><p class="sub">${c.i + 1} of ${c.queue.length}${c.extra ? ' · practice' : ''}</p></div><button class="ghost" data-act="cards-done">End session</button></div>
    <div class="fc-wrap"><div class="bar"><i style="width:${(c.i / c.queue.length) * 100}%"></i></div>
    <div class="fc ${c.flipped ? 'flip' : ''}" ${!type && !c.flipped ? 'data-act="flip"' : ''}><div class="fc-in"><div class="fc-face">${frontHtml}${!type ? '<div class="muted">click or press Space to flip</div>' : ''}</div><div class="fc-face back">${backHtml}</div></div></div>
    ${c.flipped ? gradeBtns : type ? `<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="Type the ${nlFront ? 'English' : 'Dutch'}... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="check">Check</button><button class="ghost" data-act="skip">I don't know</button></div>` : '<div class="row" style="justify-content:center"><button class="primary" data-act="flip">Show answer</button></div>'}
    </div>`;
};
function gradeCard(g) {
  const c = ui.cards, cur = curCard(); if (!cur) return;
  if (!cur.w.reps) L.bump(S.log, today(), "newWords");
  const upd = L.grade(cur.w, g, today()); S.words[S.words.indexOf(cur.w)] = upd;
  c.n++; if (g !== 'again' && !cur.q.again) c.good++;
  if (g === 'again' && !cur.q.again) c.queue.push({ id: cur.q.id, dir: cur.q.dir, again: true });
  chime(g === 'again' ? 'bad' : 'ok');
  c.i++; c.flipped = false; c.res = null; c.typed = '';
  count('reviews'); autoSpeak(); render();
}
function checkTyped() {
  const c = ui.cards, cur = curCard(); if (!cur || c.flipped) return;
  c.typed = ($('#typed') || {}).value || ''; c.res = bestCheck(c.typed, cur.w, cur.q.dir); c.flipped = true;
  chime(c.res === 'wrong' ? 'bad' : 'ok'); if (c.res === 'right' && cur.q.dir === 'en-nl') speak(cur.w.nl); render();
}

// ---------- listening ----------
const LMODES = [['word', '✍️ Spell the word', 'Hear a Dutch word and type it'], ['meaning', '🎯 What does it mean?', 'Hear a word and pick the English'], ['article', '🔀 De or het?', 'Hear a noun and pick the article'], ['sentence', '💬 Sentence dictation', 'Hear a whole sentence and type it']];
function startListen(mode) {
  let pool = liveWords();
  if (mode === 'article') pool = pool.filter((w) => w.article);
  if (mode === 'sentence') pool = pool.filter((w) => w.example);
  pool = L.pick(pool, 10);
  if (pool.length < (mode === 'meaning' ? 4 : 1)) return toast('Not enough words for this mode yet.');
  ui.listen = { mode, queue: pool, i: 0, res: null, typed: '', n: 0, good: 0, opts: null, picked: '' };
  prepListen(); render(); setTimeout(listenSay, 150);
}
function prepListen() {
  const l = ui.listen, w = l.queue[l.i]; if (!w) return;
  if (l.mode === 'meaning') l.opts = L.shuffle([w.en, ...L.pick(liveWords().filter((x) => x.id !== w.id && x.en !== w.en), 3).map((x) => x.en)]);
}
function listenSay(slow) {
  const l = ui.listen; if (!l || !l.queue[l.i]) return;
  const w = l.queue[l.i]; speak(l.mode === 'sentence' ? w.example : (l.mode === 'article' ? w.nl : w.nl), slow);
}
VIEWS.listen = () => {
  const l = ui.listen, haveVoice = !!nlVoice();
  const warn = haveVoice ? '' : `<div class="card" style="border-color:var(--butter);margin-bottom:14px"><b class="warn">No Dutch voice found on this PC.</b><br>Windows needs the Dutch language pack for text-to-speech: Settings → Time &amp; language → Language &amp; region → Add a language → Nederlands (Nederland), and tick <i>Text-to-speech</i>. Then restart BiggTaal.</div>`;
  if (!l) return `<div class="top"><div><h1>Listening</h1><p class="sub">Train your ear with the PC's Dutch voice.</p></div></div>${warn}
    <div class="grid g2">${LMODES.map(([id, name, d]) => `<div class="card"><h2>${name}</h2><p class="muted">${d}</p><button class="primary" data-act="listen-start" data-m="${id}">Start (10)</button></div>`).join('')}</div>`;
  const w = l.queue[l.i];
  if (!w) return `<div class="top"><h1>Klaar! 🎧</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', '', { note: true, stage: pigStage() })}<h2>${l.good} of ${l.n} right</h2>
    <div class="row" style="justify-content:center"><button class="primary" data-act="listen-start" data-m="${l.mode}">Again</button><button class="ghost" data-act="listen-exit">Other modes</button></div></div></div>`;
  let body;
  if (l.mode === 'meaning') body = `<div class="opts">${l.opts.map((o) => `<button data-act="listen-pick" data-v="${esc(o)}" class="${l.res ? (o === w.en ? 'ok' : o === l.picked ? 'no' : '') : ''}">${esc(o)}</button>`).join('')}</div>`;
  else if (l.mode === 'article') body = `<div class="opts"><button data-act="listen-pick" data-v="de" class="${l.res ? (w.article === 'de' ? 'ok' : l.picked === 'de' ? 'no' : '') : ''}">de</button><button data-act="listen-pick" data-v="het" class="${l.res ? (w.article === 'het' ? 'ok' : l.picked === 'het' ? 'no' : '') : ''}">het</button></div>`;
  else body = l.res ? '' : `<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="Type what you hear... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="listen-check">Check</button></div>`;
  let result = '';
  if (l.res) {
    const target = l.mode === 'sentence' ? w.example : l.mode === 'meaning' ? w.en : l.mode === 'article' ? w.article + ' ' + w.nl : (w.article ? w.article + ' ' : '') + w.nl;
    result = `<div class="card" style="margin-top:14px;text-align:center"><div class="fc-big ans ${l.res}">${l.res === 'right' ? rnd(PIG.right) : l.res === 'close' ? rnd(PIG.close) : rnd(PIG.wrong)}</div><div style="font-size:20px;margin:8px 0">${esc(target)}</div>${l.mode !== 'sentence' && l.mode !== 'meaning' ? '' : `<div class="muted">${esc(l.mode === 'sentence' ? w.exampleEn || w.en : w.nl)}</div>`}${l.typed ? `<div class="muted">You typed: ${esc(l.typed)}</div>` : ''}<button class="primary" style="margin-top:10px" data-act="listen-next" data-focus>Next →</button></div>`;
  }
  return `<div class="top"><div><h1>Listening</h1><p class="sub">${LMODES.find((m) => m[0] === l.mode)[1]} · ${l.i + 1} of ${l.queue.length}</p></div><button class="ghost" data-act="listen-exit">End</button></div>
    <div class="fc-wrap">${warn}<div class="card" style="text-align:center;padding:26px"><button class="speak big" data-act="listen-say" title="Play">🔊</button><div style="margin-top:12px"><button class="ghost" data-act="listen-slow">🐢 Slow</button></div></div>${body}${result}</div>`;
};
function finishListen(res) {
  const l = ui.listen; l.res = res; l.n++; if (res === 'right') l.good++;
  chime(res === 'wrong' ? 'bad' : 'ok'); count('listen'); render();
}
function listenCheck() {
  const l = ui.listen, w = l.queue[l.i]; if (!w || l.res) return;
  l.typed = ($('#typed') || {}).value || '';
  if (l.mode === 'sentence') {
    const a = L.norm(l.typed).split(' ').filter(Boolean), b = L.norm(w.example).split(' ');
    const hit = b.filter((x, i) => a[i] === x).length / b.length;
    finishListen(hit === 1 ? 'right' : hit >= 0.8 ? 'close' : 'wrong');
  } else finishListen(L.check(l.typed, L.stripArticle(w.nl)) === 'right' || L.check(l.typed, w.nl) === 'right' ? 'right' : L.check(l.typed, w.nl) === 'close' ? 'close' : 'wrong');
}

// ---------- words ----------
VIEWS.words = () => {
  const f = ui.words, e = ui.edit, q = f.q.toLowerCase();
  const lessons = [...new Set(liveWords().map((w) => w.lesson).filter(Boolean))];
  let ws = liveWords().filter((w) => (!q || (w.nl + ' ' + w.en).toLowerCase().includes(q)) && (!f.lesson || w.lesson === f.lesson));
  ws = f.sort === 'new' ? ws.slice().sort((a, b) => b.created - a.created) : f.sort === 'az' ? ws.slice().sort((a, b) => a.nl.localeCompare(b.nl)) : ws.slice().sort((a, b) => a.box - b.box);
  const ed = e ? S.words.find((w) => w.id === e) : null;
  return `<div class="top"><div><h1>Words</h1><p class="sub">${liveWords().length} words. Everything here feeds flashcards, listening and worksheets.</p></div></div>
  <div class="card"><h2>${ed ? 'Edit word' : 'Add a word'}</h2>
    <div class="row"><select id="w-art"><option value="">no article</option><option value="de" ${ed && ed.article === 'de' ? 'selected' : ''}>de</option><option value="het" ${ed && ed.article === 'het' ? 'selected' : ''}>het</option></select>
    <input type="text" class="grow" id="w-nl" placeholder="Dutch word" value="${esc(ed ? ed.nl : '')}"><input type="text" class="grow" id="w-en" placeholder="English" value="${esc(ed ? ed.en : '')}"></div>
    <div class="row" style="margin-top:8px"><input type="text" class="grow" id="w-ex" placeholder="Example sentence (optional but great for worksheets)" value="${esc(ed ? ed.example : '')}"><input type="text" class="grow" id="w-lesson" placeholder="Lesson / tag (optional)" value="${esc(ed ? ed.lesson : '')}">
    <button class="primary" data-act="word-save">${ed ? 'Save' : 'Add'}</button>${ed ? '<button class="ghost" data-act="word-cancel">Cancel</button>' : ''}</div>
    <details style="margin-top:12px"><summary>Paste a list or import from Claude</summary>
      <p class="muted">One word per line, like <code>de afspraak = appointment | Ik heb een afspraak.</code> (also <code>;</code>, tab, or <code>-</code>). Or paste the JSON Claude gave you.</p>
      <textarea id="w-bulk" placeholder="de afspraak = appointment">${esc(ui.draftText)}</textarea><div class="row" style="margin-top:8px"><input type="text" id="w-bulk-lesson" class="grow" placeholder="Tag these with a lesson (optional)"><button class="primary" data-act="bulk-add">Import</button></div></details></div>
  <div class="row" style="margin:14px 0"><input type="text" class="grow" id="w-search" placeholder="Search..." value="${esc(f.q)}">
    <select id="w-lessonf"><option value="">All lessons</option>${lessons.map((x) => `<option ${f.lesson === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
    <select id="w-sort"><option value="new" ${f.sort === 'new' ? 'selected' : ''}>Newest</option><option value="az" ${f.sort === 'az' ? 'selected' : ''}>A–Z</option><option value="hard" ${f.sort === 'hard' ? 'selected' : ''}>Hardest first</option></select></div>
  <div class="card" style="padding:6px 10px"><table class="words"><tr><th>Dutch</th><th>English</th><th>Level</th><th></th></tr>
  ${ws.slice(0, 300).map((w) => `<tr><td>${w.article ? `<span class="art-${w.article}">${w.article}</span> ` : ''}<b>${esc(w.nl)}</b>${w.example ? `<div class="muted" style="font-size:13px">${esc(w.example)}</div>` : ''}</td><td>${esc(w.en)}${w.lesson ? `<div><span class="pill">${esc(w.lesson)}</span></div>` : ''}</td>
    <td><span class="lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${w.box >= i ? 'on' : ''}"></i>`).join('')}</span></td>
    <td style="white-space:nowrap"><button class="ghost" data-act="say" data-t="${esc((w.article ? w.article + ' ' : '') + w.nl)}">🔊</button> <button class="ghost" data-act="word-edit" data-id="${w.id}">✎</button> <button class="ghost" data-act="word-del" data-id="${w.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No words match.</td></tr>'}</table>${ws.length > 300 ? `<p class="muted" style="padding:8px">Showing 300 of ${ws.length}. Use search.</p>` : ''}</div>`;
};

// ---------- worksheets ----------
const SHEET_KINDS = [['article', 'De or het?'], ['blank', 'Fill in the blank'], ['nl-en', 'Dutch → English'], ['en-nl', 'English → Dutch'], ['order', 'Word order'], ['verbs', 'Verb forms (present / past / perfect)']];
VIEWS.sheets = () => {
  const o = (ui.sheetOpts = ui.sheetOpts || { kinds: ['article', 'blank', 'nl-en', 'order', 'verbs'], count: 8, lesson: '', key: true });
  const lessons = [...new Set(liveWords().map((w) => w.lesson).filter(Boolean))];
  return `<div class="top"><div><h1>Worksheets</h1><p class="sub">Made from your own words. A fresh sheet every time, with an answer key on the last page.</p></div></div>
  <div class="card"><h2>What should it include?</h2>
    <div class="row">${SHEET_KINDS.map(([k, n]) => `<button class="ghost ${o.kinds.includes(k) ? 'on' : ''}" data-act="sheet-kind" data-k="${k}">${o.kinds.includes(k) ? '✓ ' : ''}${n}</button>`).join('')}</div>
    <div class="row" style="margin-top:12px"><label class="muted">Questions per section <input type="number" id="s-count" min="3" max="20" value="${o.count}" style="width:80px"></label>
      <select id="s-lesson"><option value="">All words</option>${lessons.map((x) => `<option ${o.lesson === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <button class="ghost ${o.key ? 'on' : ''}" data-act="sheet-key">${o.key ? '✓ ' : ''}Answer key</button>
      <button class="primary" data-act="sheet-make">✨ Generate</button></div></div>
  ${ui.sheet ? `<div class="row" style="margin:14px 0"><button class="primary" data-act="sheet-pdf">💾 Save as PDF (to print)</button><span class="muted">${ui.sheet.n} questions</span></div><div class="sheet-prev" id="sheet-prev"></div>` : ''}`;
};
function makeSheet() {
  const o = ui.sheetOpts;
  o.count = Math.max(3, Math.min(20, +($('#s-count') || {}).value || o.count)); o.lesson = ($('#s-lesson') || {}).value || '';
  const words = o.lesson ? liveWords().filter((w) => w.lesson === o.lesson) : liveWords();
  const sections = L.makeWorksheet(words, SEED_VERBS, o.kinds, o.count);
  if (!sections.length) return toast('Nothing to build. Add words (with examples for blanks and word order).');
  const title = 'Dutch practice' + (o.lesson ? ' – ' + o.lesson : '');
  ui.sheet = { html: L.worksheetHtml(sections, o.key, title), n: sections.reduce((a, s) => a + s.items.length, 0) };
  render();
  const body = new DOMParser().parseFromString(ui.sheet.html, 'text/html').body;
  $('#sheet-prev').innerHTML = body.innerHTML.replace(/<script[\s\S]*?<\/script>/gi, '');
  count('sheets');
}

// ---------- lessons ----------
VIEWS.lessons = () => {
  const ls = S.lessons.filter((l) => !l.deleted).sort((a, b) => (a.status === 'done') - (b.status === 'done') || ((a.due || '9') < (b.due || '9') ? -1 : 1));
  const sel = ls.find((l) => l.id === ui.lessonId);
  const mark = { todo: '', doing: '…', done: '✓' };
  return `<div class="top"><div><h1>Book lessons</h1><p class="sub">Your NT2school lessons. I'll nudge you to do them.</p></div><a class="ghost" style="text-decoration:none" href="https://www.nt2school.nl/nl/" target="_blank">Open NT2school ↗</a></div>
  <div class="card"><div class="row"><input type="text" class="grow" id="l-title" placeholder="Lesson, e.g. Les 12 – Wonen" data-enter="lesson-add"><input type="date" id="l-due" style="width:auto" value="${L.addDays(today(), 3)}"><button class="primary" data-act="lesson-add">Add lesson</button></div></div>
  <div style="margin-top:14px">${ls.map((l) => `<div class="lesson ${l.status === 'done' ? 'done' : ''}"><button class="chk ${l.status === 'done' ? 'on' : ''}" data-act="lesson-cycle" data-id="${l.id}" title="todo → doing → done">${mark[l.status] || ''}</button>
    <div class="lt">${esc(l.title)} ${l.status === 'doing' ? '<span class="pill butter">doing</span>' : ''}<div class="${l.due && l.due < today() && l.status !== 'done' ? 'warn' : 'muted'}" style="font-weight:600;font-size:13px">${l.due ? (l.due < today() && l.status !== 'done' ? 'Overdue · ' : 'Due ') + esc(l.due) : 'No due date'}</div></div>
    <button class="ghost ${ui.lessonId === l.id ? 'on' : ''}" data-act="lesson-open" data-id="${l.id}">Helper</button><button class="ghost" data-act="lesson-del" data-id="${l.id}">🗑</button></div>`).join('') || '<div class="empty">No lessons yet. Add your next chapter above.</div>'}</div>
  ${sel ? lessonHelper(sel) : ''}`;
};
function lessonHelper(l) {
  return `<div class="card" style="margin-top:14px"><h2>Lesson helper: ${esc(l.title)}</h2>
    <p class="muted">Paste text or a word list from the lesson. I can find words you don't have yet, add a vocab list, or prepare a message for Claude to explain it and make flashcards.</p>
    <textarea id="l-text" placeholder="Paste lesson text, or a word list like “de afspraak = appointment”...">${esc(ui.draftText)}</textarea>
    <div class="row" style="margin-top:8px"><button class="ghost" data-act="lesson-cands">🔎 Find new words</button><button class="primary" data-act="lesson-import">➕ Add as vocab list / Claude JSON</button><button class="ghost" data-act="lesson-claude">📋 Copy for Claude</button></div>
    ${ui.cand.length ? `<p class="muted" style="margin-bottom:2px">Words in this text you don't have yet (click + to move into the box with a blank to fill in):</p>${ui.cand.map((c) => `<span class="cand">${esc(c.w)} <small class="muted">×${c.n}</small><button data-act="cand-add" data-w="${esc(c.w)}">+</button></span>`).join('')}` : ''}
    <p class="muted" style="margin-top:10px">Claude tip: use <b>Copy for Claude</b>, paste it into our chat, and I'll reply with JSON. Paste that JSON in the box above and press <i>Add</i>.</p></div>`;
}

// ---------- grammar ----------
VIEWS.grammar = () => `<div class="top"><div><h1>Grammar cheat sheets</h1><p class="sub">B1 essentials, short and practical.</p></div></div><div class="grid g2 gram">${GRAMMAR.map((g) => `<div class="card"><h3>${g.t}</h3>${g.b.map((p) => `<p>${p}</p>`).join('')}</div>`).join('')}</div>`;

// ---------- settings ----------
VIEWS.settings = () => {
  const s = S.settings, nl = dutchVoices();
  return `<div class="top"><div><h1>Settings</h1></div></div>
  <div class="grid g2">
  <div class="card"><h2>Reminders</h2>
    <label class="row"><input type="checkbox" id="s-rem" ${s.remindersOn ? 'checked' : ''}> Remind me to study</label>
    <label class="f">Time each day</label><input type="time" id="s-time" value="${esc(s.reminderTime)}" style="width:auto">
    <label class="f">Daily goal (cards)</label><input type="number" id="s-goal" min="3" max="200" value="${s.dailyGoal}" style="width:100px">
    <label class="f">New words per day</label><input type="number" id="s-new" min="0" max="50" value="${s.newPerDay}" style="width:100px">
    <label class="row" style="margin-top:12px"><input type="checkbox" id="s-tray" ${s.tray ? 'checked' : ''}> Keep running in the system tray when I close the window <span class="muted">(needed for reminders)</span></label>
    <label class="row" style="margin-top:6px"><input type="checkbox" id="s-login" ${s.login ? 'checked' : ''}> Start with Windows</label>
    <label class="row" style="margin-top:6px"><input type="checkbox" id="s-sound" ${s.sound ? 'checked' : ''}> Sounds</label>
    <div class="row" style="margin-top:12px"><button class="primary" data-act="settings-save">Save</button><button class="ghost" data-act="notify-test">🔔 Test notification</button></div></div>
  <div class="card"><h2>Voice</h2>
    ${nl.length ? `<select id="s-voice" style="width:100%">${nl.map((v) => `<option value="${esc(v.name)}" ${s.voice === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select>`
      : `<p class="warn">No Dutch voice found. Windows: Settings → Time &amp; language → Language &amp; region → Add a language → Nederlands, include <i>Text-to-speech</i>, then restart this app.</p>`}
    <label class="f">Speed</label><input type="range" id="s-rate" min="0.5" max="1.3" step="0.05" value="${s.rate}">
    <div class="row" style="margin-top:10px"><button class="ghost" data-act="voice-test">🔊 Test voice</button></div></div>
  <div class="card"><h2>Your data</h2><p class="muted">Saved on this PC only${window.vt ? '' : ' (browser storage)'}. A backup copy is made once a day.</p>
    <div class="row"><button class="ghost" data-act="data-reveal">📂 Show data folder</button><button class="ghost" data-act="data-export">⬆ Export everything</button><button class="ghost" data-act="data-import">⬇ Import file</button></div>
    <div class="row" style="margin-top:8px"><button class="ghost" data-act="reseed">Re-add starter words</button></div></div>
  <div class="card"><h2>About</h2><p class="muted">BiggTaal 0.2 · made for Lauren · Bigg is Varken's little brother, and he thinks you are doing great. 🌸</p></div></div>`;
};
function saveSettings() {
  const s = S.settings;
  s.remindersOn = $('#s-rem').checked; s.reminderTime = $('#s-time').value || '19:00'; s.dailyGoal = Math.max(3, +$('#s-goal').value || 10); s.newPerDay = Math.max(0, +$('#s-new').value);
  s.tray = $('#s-tray').checked; s.login = $('#s-login').checked; s.sound = $('#s-sound').checked;
  const v = $('#s-voice'); if (v) s.voice = v.value; s.rate = +$('#s-rate').value || 0.9;
  save(); if (window.vt) { window.vt.save(S); window.vt.launchAtLogin(s.login); }
  toast('Saved'); ui.say = ''; render();
}

// ---------- actions ----------
function importText(text, lesson) {
  const r = L.parseImport(text);
  if (lesson) r.words.forEach((w) => { w.lesson = w.lesson || lesson; });
  const m = L.mergeWords(S.words, r.words); S.words = m.words;
  let ln = 0; for (const l of r.lessons) { S.lessons.push({ id: L.uid(), title: l.title, due: l.due, notes: l.notes, status: l.status, created: Date.now() }); ln++; }
  save();
  toast(`Added ${m.added} word${m.added === 1 ? '' : 's'}${m.skipped ? `, ${m.skipped} skipped` : ''}${ln ? `, ${ln} lesson${ln === 1 ? '' : 's'}` : ''}`);
  return m.added + ln;
}
const ACT = {
  nav: (el) => { ui.cards = ui.cards && ui.view === 'cards' ? ui.cards : null; go(el.dataset.v); },
  say: (el) => speak(el.dataset.t),
  flip: () => { ui.cards.flipped = true; render(); },
  'cards-start': () => startCards(false), 'cards-extra': () => startCards(true), 'cards-done': () => { ui.cards = null; go('home'); },
  cpref: (el) => { const p = cardPrefs(); p[el.dataset.k] = el.dataset.k === 'auto' ? !!el.dataset.v : el.dataset.v; save(); render(); },
  grade: (el) => gradeCard(el.dataset.g), check: checkTyped,
  skip: () => { const c = ui.cards; c.res = 'wrong'; c.typed = ''; c.flipped = true; render(); },
  'listen-start': (el) => startListen(el.dataset.m), 'listen-exit': () => { ui.listen = null; render(); },
  'listen-say': () => listenSay(), 'listen-slow': () => listenSay(true), 'listen-check': listenCheck,
  'listen-pick': (el) => { const l = ui.listen, w = l.queue[l.i]; if (l.res) return; l.picked = el.dataset.v; finishListen(el.dataset.v === (l.mode === 'article' ? w.article : w.en) ? 'right' : 'wrong'); },
  'listen-next': () => { const l = ui.listen; l.i++; l.res = null; l.typed = ''; l.picked = ''; prepListen(); render(); if (l.queue[l.i]) setTimeout(listenSay, 150); },
  'word-save': () => {
    const nl = $('#w-nl').value.trim(), en = $('#w-en').value.trim(); if (!nl || !en) return toast('Need both Dutch and English');
    const o = { nl, en, article: $('#w-art').value, example: $('#w-ex').value.trim(), lesson: $('#w-lesson').value.trim() }; o.pos = o.article ? 'noun' : 'other';
    if (ui.edit) Object.assign(S.words.find((w) => w.id === ui.edit), o); else S.words.push(L.newWord(o));
    ui.edit = null; save(); toast('Saved'); render();
  },
  'word-edit': (el) => { ui.edit = el.dataset.id; render(); $('#w-nl').focus(); }, 'word-cancel': () => { ui.edit = null; render(); },
  'word-del': (el) => { const w = S.words.find((x) => x.id === el.dataset.id); w.deleted = true; save(); toast('Deleted ' + w.nl); render(); },
  'bulk-add': () => { const t = $('#w-bulk').value; if (!t.trim()) return; if (importText(t, $('#w-bulk-lesson').value.trim())) ui.draftText = ''; render(); },
  'sheet-kind': (el) => { const k = ui.sheetOpts.kinds, i = k.indexOf(el.dataset.k); if (i < 0) k.push(el.dataset.k); else k.splice(i, 1); render(); },
  'sheet-key': () => { ui.sheetOpts.key = !ui.sheetOpts.key; render(); }, 'sheet-make': makeSheet,
  'sheet-pdf': async () => { if (!window.vt) return toast('PDF saving works in the installed app.'); const f = await window.vt.printSheet(ui.sheet.html); if (f) toast('Saved PDF'); },
  'lesson-add': () => { const t = $('#l-title').value.trim(); if (!t) return toast('Give the lesson a name'); S.lessons.push({ id: L.uid(), title: t, due: $('#l-due').value, status: 'todo', created: Date.now() }); save(); ui.say = ''; render(); },
  'lesson-cycle': (el) => ACT['lesson-status']({ dataset: { id: el.dataset.id, s: { todo: 'doing', doing: 'done', done: 'todo' }[S.lessons.find((l) => l.id === el.dataset.id).status] } }),
  'lesson-status': (el) => {
    const l = S.lessons.find((x) => x.id === el.dataset.id); l.status = el.dataset.s;
    if (l.status === 'done') { l.doneAt = Date.now(); count('lessons'); chime('goal'); confetti(); ui.say = 'Les klaar! You did it, I am so proud! ⭐'; toast('Lesson done! 🎉'); } else save();
    render();
  },
  'lesson-open': (el) => { ui.lessonId = ui.lessonId === el.dataset.id ? '' : el.dataset.id; ui.cand = []; render(); },
  'lesson-del': (el) => { S.lessons.find((l) => l.id === el.dataset.id).deleted = true; save(); render(); },
  'lesson-cands': () => { ui.draftText = $('#l-text').value; ui.cand = L.candidates(ui.draftText, S.words, 40); if (!ui.cand.length) toast('Nothing new found'); render(); },
  'cand-add': (el) => { ui.draftText = ($('#l-text').value.replace(/\s+$/, '') + '\n' + el.dataset.w + ' = ').replace(/^\n/, ''); ui.cand = ui.cand.filter((c) => c.w !== el.dataset.w); render(); const t = $('#l-text'); t.focus(); t.scrollTop = t.scrollHeight; },
  'lesson-import': () => { const t = $('#l-text').value; if (!t.trim()) return; const l = S.lessons.find((x) => x.id === ui.lessonId); if (importText(t, l && l.title)) { ui.draftText = ''; ui.cand = []; } else ui.draftText = t; render(); },
  'lesson-claude': async () => { const t = $('#l-text').value; if (!t.trim()) return toast('Paste the lesson text first'); const l = S.lessons.find((x) => x.id === ui.lessonId); try { await navigator.clipboard.writeText(L.claudePrompt(l.title, t)); toast('Copied. Paste it into Claude.'); } catch { toast('Could not copy'); } },
  'settings-save': saveSettings, 'notify-test': () => window.vt ? window.vt.testNotify() : toast('Notifications work in the installed app.'),
  'voice-test': () => { const v = $('#s-voice'); if (v) S.settings.voice = v.value; S.settings.rate = +$('#s-rate').value || 0.9; speak('Hoi Lauren! Welkom bij BiggTaal. Veel plezier met leren!'); },
  'data-reveal': () => window.vt && window.vt.reveal(),
  'data-export': async () => { if (!window.vt) return toast('Export works in the installed app.'); const f = await window.vt.exportFile(JSON.stringify(S, null, 1), 'BiggTaal-backup.json'); if (f) toast('Exported'); },
  'data-import': async () => { if (!window.vt) return; const f = await window.vt.importFile(); if (f) { importText(f.text); render(); } },
  reseed: () => { const w = L.parseVocab(SEED_WORDS); w.forEach((x) => { x.lesson = 'Starter B1'; }); const m = L.mergeWords(S.words, w); S.words = m.words; save(); toast(`Added ${m.added} starter words`); render(); },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el); return; }
  const p = e.target.closest('.hero .pig'); if (p) { p.classList.remove('hop'); void p.offsetWidth; p.classList.add('hop'); ui.say = rnd([...PIG.poke, pigLine()]); const b = $('#bubble'); if (b) b.textContent = ui.say; chime('ok'); }
});
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'w-search') { ui.words.q = e.target.value; const pos = e.target.selectionStart; render(); const s = $('#w-search'); s.focus(); s.setSelectionRange(pos, pos); }
  else if (id === 'w-lessonf') { ui.words.lesson = e.target.value; render(); } else if (id === 'w-sort') { ui.words.sort = e.target.value; render(); }
  else if (id === 'w-bulk' || id === 'l-text') ui.draftText = e.target.value;
});
document.addEventListener('keydown', (e) => {
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === 'Enter' && e.target.id === 'typed') { e.preventDefault(); ui.view === 'cards' ? checkTyped() : listenCheck(); return; }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter) { ACT[e.target.dataset.enter](); return; }
  if (inField) return;
  if (ui.view === 'cards' && ui.cards && curCard()) {
    const c = ui.cards;
    if (!c.flipped && (e.key === ' ' || e.key === 'Enter') && cardPrefs().mode === 'flip') { e.preventDefault(); ACT.flip(); }
    else if (c.flipped && ['1', '2', '3'].includes(e.key)) gradeCard(['again', 'good', 'easy'][+e.key - 1]);
    else if (c.flipped && e.key === 'Enter') { e.preventDefault(); gradeCard(c.res === 'wrong' ? 'again' : 'good'); }
    else if (e.key.toLowerCase() === 'p') { const w = curCard().w; speak((w.article ? w.article + ' ' : '') + w.nl); }
  } else if (ui.view === 'listen' && ui.listen) {
    if (e.key === 'Enter' && ui.listen.res) { e.preventDefault(); ACT['listen-next'](); } else if (e.key.toLowerCase() === 'p') listenSay();
  }
});

load().then(() => { render(); });
