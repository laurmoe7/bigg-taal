// BiggTaal page code. State S is saved whole through window.vt (Electron) or localStorage (fallback).
let S = L.emptyState();
const ui = { view: 'home', cards: null, listen: null, say: '', words: { q: '', sort: 'new' }, edit: null, draftText: '' };
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
  S = L.fixState(d); applyTheme();
  if (!S.seeded) {
    const w = L.parseVocab(SEED_WORDS); 
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
  document.querySelectorAll('.toast').forEach((x) => x.remove()); // one message at a time
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(`Copied. Paste it into Claude: about ${L.estimateTokens(text).toLocaleString()} tokens to send, plus its reply.`); } catch { toast('Could not copy'); }
}
function confetti() {
  const bits = ['🌸', '💗', '✨', '🌱', '⭐', '🎉'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('div'); c.className = 'confetti'; c.textContent = rnd(bits);
    c.style.left = Math.random() * 100 + 'vw'; c.style.animationDelay = Math.random() * 0.6 + 's'; c.style.fontSize = 14 + Math.random() * 18 + 'px';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
  }
}
let VOICES = [], PIPER = [];
let UPD = { status: 'idle' }, APPV = '';
function loadVoices() { try { VOICES = speechSynthesis.getVoices(); } catch { VOICES = []; } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (ui.view === 'settings' || ui.view === 'listen') render(); }; }
async function loadPiper() { try { PIPER = window.vt && window.vt.ttsVoices ? await window.vt.ttsVoices() : []; } catch { PIPER = []; } }
const dutchVoices = () => VOICES.filter((v) => /^nl\b|^nl[-_]/i.test(v.lang));
const VOICE_NAMES = { alex: 'Alex', pim: 'Pim', ronnie: 'Ronnie' };
// settings.voice is 'piper:alex', 'win:<Windows voice name>', a bare Windows voice name (older saves) or '' (best available)
function voiceChoice() {
  const v = S.settings.voice || '';
  if (v.startsWith('piper:') && PIPER.includes(v.slice(6))) return { engine: 'piper', id: v.slice(6) };
  const wname = v.startsWith('win:') ? v.slice(4) : v.startsWith('piper:') ? '' : v;
  const w = dutchVoices().find((x) => x.name === wname);
  if (w) return { engine: 'win', voice: w };
  if (PIPER.length) return { engine: 'piper', id: PIPER[0] };
  return dutchVoices()[0] ? { engine: 'win', voice: dutchVoices()[0] } : null;
}
const voiceLabel = () => { const c = voiceChoice(); return !c ? '' : c.engine === 'piper' ? (VOICE_NAMES[c.id] || c.id) + ' (natural)' : c.voice.name.replace(/ - .*/, ''); };
const hasVoice = () => !!voiceChoice();
const lengthScale = (slow) => Math.min(2.5, Math.max(0.5, 0.9 / Math.max(0.3, S.settings.rate * (slow ? 0.65 : 1))));
let curAudio = null, speakToken = 0;
function stopSpeech() { speakToken++; try { speechSynthesis.cancel(); } catch {} if (curAudio) { curAudio.pause(); curAudio = null; } }
function speakWin(text, slow, voice) {
  const c = voice ? { voice } : voiceChoice();
  const v = c && c.voice; if (!v) return false;
  const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = Math.max(0.3, S.settings.rate * (slow ? 0.65 : 1));
  speechSynthesis.speak(u); return true;
}
async function speakPiper(text, slow, id) {
  const my = ++speakToken;
  try {
    const bytes = await window.vt.tts(text, id, lengthScale(slow));
    if (my !== speakToken) return; // a newer request replaced this one
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    const a = new Audio(url); curAudio = a; a.onended = () => URL.revokeObjectURL(url); await a.play();
  } catch (e) { if (my === speakToken && !speakWin(text, slow, dutchVoices()[0])) toast('Could not play the voice. See Settings > Voice.'); }
}
function speak(text, slow) {
  const c = voiceChoice();
  if (!c) { toast('No Dutch voice found. See Settings > Voice.'); return false; }
  stopSpeech();
  if (c.engine === 'piper') { speakPiper(text, slow, c.id); return true; }
  return speakWin(text, slow);
}
function warmSpeech(text) { const c = voiceChoice(); if (c && c.engine === 'piper') { window.vt.tts(text, c.id, lengthScale(false)).catch(() => {}); } }

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
const isNight = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };

// ---------- pig ----------
function pigMood() {
  if (isNight()) return 'sleep';
  if (dueList().length > 150) return 'worry';
  return 'happy';
}
function pigStage() { const r = todayStats().reviews || 0, g = S.settings.dailyGoal; return r >= g ? 3 : r >= g * 0.6 ? 2 : r >= g * 0.3 ? 1 : 0; }
function pigLine() {
  const due = dueList().length, st = L.streak(S.log, today()), t = todayStats();
  if (isNight()) return rnd(PIG.night);
  if (!liveWords().length) return rnd(PIG.welcome);
  if ((t.reviews || 0) >= S.settings.dailyGoal) return st > 2 && Math.random() < 0.5 ? fill(rnd(PIG.streak), { s: st }) : rnd(PIG.goal);
  const pool = [];
  if (due) pool.push(...PIG.due.map((x) => fill(x, { n: due })));
  else pool.push(...PIG.nothingDue);
  if (st > 1) pool.push(...PIG.streak.map((x) => fill(x, { s: st })));
  return rnd(pool);
}

// ---------- shell ----------
const NAV = [['home', '🏠', 'Today', '#ff9d8e'], ['cards', '🃏', 'Flashcards', '#7fd4f0'], ['listen', '🎧', 'Listening', '#9ccbff'], ['sheets', '📝', 'Worksheets', '#ffe08a'],
  ['words', '🔤', 'Words', '#ffb38a'], ['grammar', '🧠', 'Grammar', '#ffa6c4'], ['settings', '⚙️', 'Settings', '#cfc6ee']];
function renderSide() {
  const due = dueList().length, sig = [ui.view, due, L.streak(S.log, today()), liveWords().length, pigStage()].join('|');
  if (sig === ui.sideSig) return; // nothing in the sidebar changed: leave it alone (redrawing it restarts the logo animation)
  ui.sideSig = sig;
  $('#side').innerHTML = `<div class="logo">${pigSvg('happy', '', { stage: pigStage() })}<div><b>BiggTaal</b><span>Nederlands leren</span></div></div>` +
    NAV.map(([id, ic, name, col]) => `<button class="nav ${ui.view === id ? 'on' : ''}" data-act="nav" data-v="${id}"><span class="ic" style="background:${col}">${ic}</span><span class="t">${name}</span>` +
      (id === 'cards' && due ? `<span class="badge">${due}</span>` : '') + '</button>').join('') +
    `<div class="side-foot">🔥 ${L.streak(S.log, today())}-day streak<br>${liveWords().length} words</div>`;
}
function render() {
  renderSide();
  const v = VIEWS[ui.view] || VIEWS.home;
  const main = $('#main'), keep = main.scrollTop;
  main.classList.toggle('still', ui.rendered === ui.view); // same page again: no entrance animations, so nothing flashes
  ui.rendered = ui.view;
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
  const pv = PROVERBS[Math.floor(Date.now() / 864e5) % PROVERBS.length];
  const dn = (d) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(d + 'T12:00').getDay()];
  const upd = UPD.status === 'ready' ? `<div class="card upd"><div class="row"><div class="grow"><b>A new BiggTaal is ready! 🌸</b><div class="muted">Version ${esc(UPD.version)} has been downloaded. It installs when you restart, and your words and progress are safe.</div></div><button class="primary" data-act="update-install">Restart to update</button></div></div>` : '';
  return `${upd}<div class="hero">${pigSvg(pigMood(), '', { stage: pigStage(), note: true, cap: isNight() })}<div class="bubble" id="bubble">${esc(ui.say)}</div></div>
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
    <div class="card"><h2>Last 7 days</h2><div class="week">${week.map((x, i) => `<div class="${i === 6 ? 'today' : ''}"><i style="height:${Math.round((x.n / max) * 44)}px"></i>${dn(x.d)}</div>`).join('')}</div></div>
    <div class="card"><h2>Spreuk van de dag</h2><div style="font-size:18px;font-weight:800">${esc(pv[0])}</div><div class="muted">${esc(pv[1])}</div>
      <button class="ghost" style="margin-top:10px" data-act="say" data-t="${esc(pv[0])}">🔊 Listen</button></div>
  </div>`;
};

// ---------- listening ----------
const LMODES = [['word', '✍️ Spell the word', 'Hear a Dutch word and type it'], ['meaning', '🎯 What does it mean?', 'Hear a word and pick the English'], ['article', '🔀 De or het?', 'Hear a noun and pick the article'], ['sentence', '💬 Sentence dictation', 'Hear a whole sentence and type it'], ['real', '🌍 Real sentences', 'Dictation with real Dutch sentences that use your words']];
async function startReal() { // sentences from Tatoeba that use words you are learning
  toast('Finding real sentences...');
  let pool = [];
  try {
    const idx = await sentenceData(), mine = L.pick(liveWords().filter((w) => !w.example || true), 60), seen = new Set();
    for (const w of mine) { const f = L.sentencesFor(w.nl, w.pos, idx, SENTENCES, 4).find((p) => !seen.has(p[0])); if (f) { seen.add(f[0]); pool.push(Object.assign({}, w, { id: 'tat' + pool.length, example: f[0], en: f[1], article: '' })); } if (pool.length >= 10) break; }
  } catch { return toast('Could not load the sentences.'); }
  if (!pool.length) return toast('No sentences found for your words yet. Add some more words!');
  ui.listen = { mode: 'sentence', real: true, sound: '', queue: pool, i: 0, res: null, typed: '', n: 0, good: 0, opts: null, picked: '', hint: 0, diff: null, tags: [] };
  prepListen(); render(); setTimeout(listenSay, 150);
}
function startListen(mode, sound) {
  if (mode === 'real') { startReal(); return; }
  let pool = liveWords();
  if (sound) pool = L.soundWords(pool, sound);
  if (mode === 'article') pool = pool.filter((w) => w.article);
  if (mode === 'sentence') pool = pool.filter((w) => w.example);
  pool = L.pick(pool, 10);
  if (pool.length < (mode === 'meaning' ? 4 : sound ? 3 : 1)) return toast('Not enough words for this yet. Add some more!');
  ui.listen = { mode, sound: sound || '', queue: pool, i: 0, res: null, typed: '', n: 0, good: 0, opts: null, picked: '', hint: 0, diff: null, tags: [] };
  prepListen(); render(); setTimeout(listenSay, 150);
}
function prepListen() {
  const l = ui.listen, w = l.queue[l.i]; if (!w) return;
  l.hint = 0; l.diff = null; l.tags = [];
  warmSpeech(l.mode === 'sentence' ? w.example : w.nl);
  const nx = l.queue[l.i + 1]; if (nx) warmSpeech(l.mode === 'sentence' ? nx.example : nx.nl);
  if (l.mode === 'meaning') l.opts = L.shuffle([w.en, ...L.pick(liveWords().filter((x) => x.id !== w.id && x.en !== w.en), 3).map((x) => x.en)]);
}
function listenSay(slow) {
  const l = ui.listen; if (!l || !l.queue[l.i]) return;
  const w = l.queue[l.i]; speak(l.mode === 'sentence' ? w.example : w.nl, slow);
}
const soundStats = () => Object.entries(S.sounds || {}).filter(([id, v]) => L.SOUNDS[id] && v.n > 0).sort((a, b) => b[1].n - a[1].n);
VIEWS.listen = () => {
  const l = ui.listen, v = hasVoice();
  const warn = v ? '' : `<div class="card" style="border-color:var(--butter);margin-bottom:14px"><b class="warn">No Dutch voice found on this PC.</b><br>Windows needs the Dutch language pack for text-to-speech: Settings → Time &amp; language → Language &amp; region → Add a language → Nederlands (Nederland), and tick <i>Text-to-speech</i>. Then restart BiggTaal.</div>`;
  if (!l) {
    const st = soundStats().slice(0, 4), r = S.settings.rate;
    return `<div class="top"><div><h1>Listening</h1><p class="sub">Train your ear with the PC's Dutch voice${v ? ': ' + esc(voiceLabel()) : ''}.</p></div>
      <div class="row"><span class="muted">Speed</span>${[['Slow', 0.7], ['Normal', 0.9], ['Fast', 1.1]].map(([n, x]) => `<button class="ghost ${Math.abs(r - x) < 0.06 ? 'on' : ''}" data-act="rate" data-r="${x}">${n}</button>`).join('')}</div></div>${warn}
    ${st.length ? `<div class="card" style="margin-bottom:16px"><h2>Sounds to practise 🎯</h2><p class="muted">From the words you wrote down wrongly. Bigg picked the ones that trip you up most.</p>
      ${st.map(([id, x]) => `<div class="lesson" style="margin:6px 0"><div class="lt">${esc(L.SOUNDS[id].name)} <span class="pill pink">${x.n} slip${x.n === 1 ? '' : 's'}</span><div class="muted" style="font-weight:600;font-size:13px">${esc(L.SOUNDS[id].tip)}</div></div><button class="primary" data-act="listen-start" data-m="word" data-s="${id}">Practise</button></div>`).join('')}</div>` : ''}
    <div class="grid g2">${LMODES.map(([id, name, d]) => `<div class="card"><h2>${name}</h2><p class="muted">${d}</p><button class="primary" data-act="listen-start" data-m="${id}">Start (10)</button></div>`).join('')}</div>`;
  }
  const w = l.queue[l.i];
  if (!w) return `<div class="top"><h1>Klaar! 🎧</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-sm', { note: true, stage: pigStage() })}<h2>${l.good} of ${l.n} right</h2><p class="muted">${l.good === l.n ? 'Perfect! Your ears are getting so good! 💗' : 'Every round trains your ear a little more. 🌸'}</p>
    <div class="row" style="justify-content:center"><button class="primary" data-act="listen-start" data-m="${l.mode}" data-s="${l.sound}">Again</button><button class="ghost" data-act="listen-exit">Other modes</button></div></div></div>`;
  const dictation = l.mode === 'word' || l.mode === 'sentence';
  let body;
  if (l.mode === 'meaning') body = `<div class="opts">${l.opts.map((o) => `<button data-act="listen-pick" data-v="${esc(o)}" class="${l.res ? (o === w.en ? 'ok' : o === l.picked ? 'no' : '') : ''}">${esc(o)}</button>`).join('')}</div>`;
  else if (l.mode === 'article') body = `<div class="opts"><button data-act="listen-pick" data-v="de" class="${l.res ? (w.article === 'de' ? 'ok' : l.picked === 'de' ? 'no' : '') : ''}">de</button><button data-act="listen-pick" data-v="het" class="${l.res ? (w.article === 'het' ? 'ok' : l.picked === 'het' ? 'no' : '') : ''}">het</button></div>`;
  else body = l.res ? '' : `${l.hint ? `<div class="hint-line">${esc(L.hintText(l.mode === 'sentence' ? w.example : w.nl, l.hint))}</div>` : ''}<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="Type what you hear... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="listen-check">Check</button><button class="ghost" data-act="listen-hint">💡 ${l.hint ? (l.hint > 1 ? 'More hint used' : 'More hint') : 'Hint'}</button></div>`;
  let result = '';
  if (l.res) {
    const target = l.mode === 'sentence' ? w.example : l.mode === 'meaning' ? w.en : l.mode === 'article' ? w.article + ' ' + w.nl : (w.article ? w.article + ' ' : '') + w.nl;
    let detail = '';
    if (l.mode === 'sentence' && l.diff) {
      detail = `<div class="chips">${l.diff.words.map((x) => `<button class="wchip ${x.status}" data-act="listen-word" data-w="${esc(x.w)}" title="Click to hear this word">${esc(x.w)}${x.status !== 'ok' ? `<small>${x.typed ? 'you: ' + esc(x.typed) : 'missed'}</small>` : ''}</button>`).join('')}</div>${l.diff.extra.length ? `<div class="muted">Extra words: ${esc(l.diff.extra.join(', '))}</div>` : ''}<div class="muted" style="margin-top:6px">${esc(w.exampleEn || w.en)}</div>`;
    } else if (l.mode === 'word' && l.diff) {
      detail = `<div class="ltrs">${w.article ? `<span class="fc-art" style="margin-right:8px">${esc(w.article)}</span>` : ''}${l.diff.cells.map((c) => `<span class="ltr ${c.ok ? 'ok' : 'bad'}">${esc(c.c)}</span>`).join('')}</div>${l.diff.extra.length ? `<div class="muted">Extra letters you typed: ${esc(l.diff.extra.join(' '))}</div>` : ''}<div class="muted">${esc(w.en)}</div>`;
    } else detail = `<div style="font-size:20px;margin:8px 0">${esc(target)}</div>${l.mode === 'meaning' ? `<div class="muted">${esc(w.nl)}</div>` : ''}`;
    const tip = l.tags.length ? `<div class="tip">💡 <b>${esc(L.SOUNDS[l.tags[0]].name)}:</b> ${esc(L.SOUNDS[l.tags[0]].tip)}</div>` : '';
    result = `<div class="card" style="margin-top:14px;text-align:center"><div class="fc-big ans ${l.res}">${l.res === 'right' ? rnd(PIG.right) : l.res === 'close' ? rnd(PIG.close) : rnd(PIG.wrong)}</div>${detail}${tip}${l.typed && dictation && l.res !== 'right' ? `<div class="muted" style="margin-top:6px">You typed: ${esc(l.typed)}</div>` : ''}${l.hint && l.res === 'right' ? '<div class="muted">(with a hint)</div>' : ''}
      <div class="row" style="justify-content:center;margin-top:12px"><button class="ghost" data-act="listen-say">🔊 Again</button><button class="ghost" data-act="listen-slow">🐢 Slow</button><button class="primary" data-act="listen-next" data-focus>Next →</button></div></div>`;
  }
  return `<div class="top"><div><h1>Listening</h1><p class="sub">${l.sound ? 'Sound practice: ' + esc(L.SOUNDS[l.sound].name) : LMODES.find((m) => m[0] === l.mode)[1]} · ${l.i + 1} of ${l.queue.length}</p></div><button class="ghost" data-act="listen-exit">End</button></div>
    <div class="fc-wrap">${warn}<div class="card" style="text-align:center;padding:26px"><button class="speak big" data-act="listen-say" title="Play (P)">🔊</button><div style="margin-top:12px"><button class="ghost" data-act="listen-slow">🐢 Slow</button></div></div>${body}${result}</div>`;
};
function noteSlips(pairs) {
  const l = ui.listen, tags = new Set();
  for (const [target, typed] of pairs) L.soundTags(target, typed).forEach((t) => tags.add(t));
  l.tags = [...tags];
  S.sounds = S.sounds || {};
  for (const id of l.tags) { const x = S.sounds[id] || (S.sounds[id] = { n: 0 }); x.n++; x.last = today(); }
}
function finishListen(res) {
  const l = ui.listen; l.res = res; l.n++;
  if (res === 'right' && !l.hint) l.good++;
  if (res === 'right' && l.sound && S.sounds && S.sounds[l.sound]) S.sounds[l.sound].n = Math.max(0, S.sounds[l.sound].n - 1); // getting it right works the slip off the list
  chime(res === 'wrong' ? 'bad' : 'ok'); count('listen'); render();
}
function listenCheck() {
  const l = ui.listen, w = l.queue[l.i]; if (!w || l.res) return;
  l.typed = ($('#typed') || {}).value || '';
  if (l.mode === 'sentence') {
    l.diff = L.diffWords(w.example, l.typed);
    noteSlips(l.diff.words.filter((x) => x.status !== 'ok' && x.typed).map((x) => [x.w, x.typed]));
    finishListen(l.diff.result);
  } else {
    const typed = L.stripArticle(l.typed.trim()), want = w.nl;
    const c = L.check(typed, want);
    l.diff = L.letterDiff(want, typed);
    if (c !== 'right') noteSlips([[want, typed]]);
    finishListen(c);
  }
}

// ---------- grammar ----------
VIEWS.grammar = () => `<div class="top"><div><h1>Grammar cheat sheets</h1><p class="sub">B1 essentials, short and practical.</p></div></div><div class="grid g2 gram">${GRAMMAR.map((g) => `<div class="card"><h3>${g.t}</h3>${g.b.map((p) => `<p>${p}</p>`).join('')}</div>`).join('')}</div>`;

// ---------- the word and sentence data (loaded the first time it is needed; see data/README.md) ----------
const dataLoads = {};
function loadData(name) { // 'freq' (common words with meanings) or 'sentences' (real sentences)
  if (!dataLoads[name]) dataLoads[name] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '../data/' + name + '.js'; s.onload = res; s.onerror = () => { delete dataLoads[name]; rej(new Error('Could not load ' + name)); }; document.head.appendChild(s); });
  return dataLoads[name];
}
let SENT_INDEX = null;
async function sentenceData() { await loadData('sentences'); if (!SENT_INDEX) SENT_INDEX = L.buildSentenceIndex(SENTENCES); return SENT_INDEX; }
async function examplesFor(nl, pos, n) { const idx = await sentenceData(); return L.sentencesFor(nl, pos, idx, SENTENCES, n); }

// ---------- settings ----------
const THEMES = [['lagoon', 'Lagoon', '#0b1a28', '#ff8f7e', '#6fd3ee'], ['plum', 'Plum', '#1a1226', '#ff8fb1', '#b79cff'], ['forest', 'Forest', '#0e1c16', '#ff9a85', '#7fe3b4'],
  ['sunset', 'Sunset', '#221512', '#ff8a70', '#ffc46b'], ['slate', 'Slate', '#14161c', '#ff8f7e', '#8fb4ff'], ['cream', 'Cream (light)', '#fff6ee', '#f2705f', '#1fa3c4']];
function applyTheme() { const t = (S && S.settings && S.settings.theme) || 'lagoon'; document.documentElement.setAttribute('data-theme', THEMES.some((x) => x[0] === t) ? t : 'lagoon'); }

VIEWS.settings = () => {
  const s = S.settings, nl = dutchVoices(), vc = voiceChoice(), cur = vc ? (vc.engine === 'piper' ? 'piper:' + vc.id : 'win:' + vc.voice.name) : '';
  return `<div class="top"><div><h1>Settings</h1></div></div>
  <div class="card" style="margin-bottom:16px"><h2>Look</h2><p class="muted" style="margin-top:0">Pick the colours you like best.</p>
    <div class="themes">${THEMES.map(([id, name, bg, a, b]) => `<button class="theme ${S.settings.theme === id ? 'on' : ''}" data-act="theme" data-v="${id}"><span class="sw" style="background:${bg}"><i style="background:${a}"></i><i style="background:${b}"></i></span>${name}</button>`).join('')}</div></div>
  <div class="grid g2">
  <div class="card"><h2>Daily goals</h2>
    <label class="f">Daily goal (cards)</label><input type="number" id="s-goal" min="3" max="200" value="${s.dailyGoal}" style="width:100px">
    <label class="f">New words per day</label><input type="number" id="s-new" min="0" max="50" value="${s.newPerDay}" style="width:100px">
    <label class="row" style="margin-top:6px"><input type="checkbox" id="s-login" ${s.login ? 'checked' : ''}> Start with Windows</label>
    <label class="row" style="margin-top:6px"><input type="checkbox" id="s-sound" ${s.sound ? 'checked' : ''}> Sounds</label>
    <div class="row" style="margin-top:12px"><button class="primary" data-act="settings-save">Save</button></div></div>
  <div class="card"><h2>Voice</h2>
    ${PIPER.length || nl.length ? `<select id="s-voice" style="width:100%">${PIPER.length ? `<optgroup label="Natural voices (offline)">${PIPER.map((id) => `<option value="piper:${id}" ${cur === 'piper:' + id ? 'selected' : ''}>${VOICE_NAMES[id] || id}</option>`).join('')}</optgroup>` : ''}${nl.length ? `<optgroup label="Windows voices">${nl.map((x) => `<option value="win:${esc(x.name)}" ${cur === 'win:' + x.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>` : ''}</select>`
      : `<p class="warn">No Dutch voice found. Windows: Settings → Time &amp; language → Language &amp; region → Add a language → Nederlands, include <i>Text-to-speech</i>, then restart this app.</p>`}
    <label class="f">Speed</label><input type="range" id="s-rate" min="0.5" max="1.3" step="0.05" value="${s.rate}">
    <div class="row" style="margin-top:10px"><button class="ghost" data-act="voice-test">🔊 Test voice</button></div></div>
  <div class="card"><h2>Your data</h2><p class="muted">Saved on this PC only${window.vt ? '' : ' (browser storage)'}. A backup copy is made once a day.</p>
    <div class="row"><button class="ghost" data-act="data-reveal">📂 Show data folder</button><button class="ghost" data-act="data-export">⬆ Export everything</button><button class="ghost" data-act="data-import">⬇ Import file</button></div>
    <div class="row" style="margin-top:8px"><button class="ghost" data-act="reseed">Re-add starter words</button></div></div>
  <div class="card"><h2>Updates</h2><p class="muted">Version ${esc(APPV || '?')}. ${esc(updateText())}</p>
    <label class="row"><input type="checkbox" id="s-upd" ${s.autoUpdate !== false ? 'checked' : ''}> Look for new versions automatically</label>
    <div class="row" style="margin-top:12px"><button class="ghost" data-act="update-check">🔄 Check for updates</button>${UPD.status === 'ready' ? '<button class="primary" data-act="update-install">Restart to update</button>' : ''}</div></div>
  <div class="card"><h2>About</h2><p class="muted">BiggTaal 0.5.0 · made for Lauren · Bigg is Varken's little brother, and he thinks you are doing great. 🌸 Dictionary, word lists and sentences come from Wiktionary, OpenSubtitles and Tatoeba (see the data folder). Reviews are scheduled with FSRS.</p></div></div>`;
};
function updateText() {
  const u = UPD;
  return { idle: 'Updates are checked a few seconds after BiggTaal starts.', checking: 'Checking for updates...', current: 'You have the newest version. 💗', downloading: `Downloading version ${u.version} (${u.percent || 0}%)...`, ready: `Version ${u.version} is ready. Restart to install it.`, unavailable: 'Updates work in the installed app.', error: 'Could not check just now (' + (u.error || 'no connection') + '). I will try again later.' }[u.status] || '';
}
function saveSettings() {
  const s = S.settings;
  s.dailyGoal = Math.max(3, +$('#s-goal').value || 10); s.newPerDay = Math.max(0, +$('#s-new').value);
  s.autoUpdate = $('#s-upd').checked; s.login = $('#s-login').checked; s.sound = $('#s-sound').checked;
  const v = $('#s-voice'); if (v) s.voice = v.value; s.rate = +$('#s-rate').value || 0.9;
  save(); if (window.vt) { window.vt.save(S); window.vt.launchAtLogin(s.login); }
  toast('Saved'); ui.say = ''; render();
}

// ---------- actions ----------
function importText(text) {
  const r = L.parseImport(text);
  const m = L.mergeWords(S.words, r.words); S.words = m.words;
  save();
  toast(`Added ${m.added} word${m.added === 1 ? '' : 's'}${m.skipped ? `, ${m.skipped} skipped` : ''}`);
  return m.added;
}
const ACT = {
  nav: (el) => { ui.cards = ui.cards && ui.view === 'cards' ? ui.cards : null; go(el.dataset.v); },
  say: (el) => speak(el.dataset.t),
  'listen-start': (el) => startListen(el.dataset.m, el.dataset.s),
  rate: (el) => { S.settings.rate = +el.dataset.r; save(); render(); speak('Hoi, dit is de snelheid.'); },
  'listen-hint': () => { const l = ui.listen; l.hint = Math.min(2, l.hint + 1); const t = ($('#typed') || {}).value || ''; render(); const i = $('#typed'); if (i) { i.value = t; i.focus(); } },
  'listen-word': (el) => speak(el.dataset.w), 'listen-exit': () => { ui.listen = null; render(); },
  'listen-say': () => listenSay(), 'listen-slow': () => listenSay(true), 'listen-check': listenCheck,
  'listen-pick': (el) => { const l = ui.listen, w = l.queue[l.i]; if (l.res) return; l.picked = el.dataset.v; finishListen(el.dataset.v === (l.mode === 'article' ? w.article : w.en) ? 'right' : 'wrong'); },
  'listen-next': () => { const l = ui.listen; l.i++; l.res = null; l.typed = ''; l.picked = ''; prepListen(); render(); if (l.queue[l.i]) setTimeout(listenSay, 150); },
  'word-save': () => {
    const nl = $('#w-nl').value.trim(), en = $('#w-en').value.trim(); if (!nl || !en) return toast('Need both Dutch and English');
    const o = { nl, en, article: $('#w-art').value, example: $('#w-ex').value.trim() }; o.pos = o.article ? 'noun' : guessPos(nl);
    o.exampleEn = o.example && ui.exEn && ui.exEn[0] === o.example ? ui.exEn[1] : ''; ui.exEn = null; ui.exFound = null;
    if (ui.edit) Object.assign(S.words.find((w) => w.id === ui.edit), o); else S.words.push(L.newWord(o));
    const wasEdit = !!ui.edit; ui.edit = null; if (wasEdit) ui.words.tab = ui.words.back || 'all'; save(); toast(wasEdit ? 'Saved' : 'Added ' + nl); render();
  },
  'word-del': (el) => { const w = S.words.find((x) => x.id === el.dataset.id); w.deleted = true; save(); toast('Deleted ' + w.nl); render(); },
  'bulk-add': () => { const t = $('#w-bulk').value; if (!t.trim()) return; if (importText(t)) ui.draftText = ''; render(); },
  'settings-save': saveSettings,
  theme: (el) => { S.settings.theme = el.dataset.v; applyTheme(); save(); render(); },
  'voice-test': () => { const v = $('#s-voice'); if (v) S.settings.voice = v.value; S.settings.rate = +$('#s-rate').value || 0.9; speak('Hoi Lauren! Welkom bij BiggTaal. Veel plezier met leren!'); },
  'data-reveal': () => window.vt && window.vt.reveal(),
  'data-export': async () => { if (!window.vt) return toast('Export works in the installed app.'); const f = await window.vt.exportFile(JSON.stringify(S, null, 1), 'BiggTaal-backup.json'); if (f) toast('Exported'); },
  'data-import': async () => { if (!window.vt) return; const f = await window.vt.importFile(); if (f) { importText(f.text); render(); } },
  'update-check': () => { if (window.vt) window.vt.checkUpdate(); else toast('Updates work in the installed app.'); },
  'update-install': () => window.vt && window.vt.installUpdate(),
  reseed: () => { const w = L.parseVocab(SEED_WORDS);  const m = L.mergeWords(S.words, w); S.words = m.words; save(); toast(`Added ${m.added} starter words`); render(); },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el); return; }
  const p = e.target.closest('.hero .pig'); if (p) { p.classList.remove('hop'); void p.offsetWidth; p.classList.add('hop'); ui.say = rnd([...PIG.poke, pigLine()]); const b = $('#bubble'); if (b) b.textContent = ui.say; chime('ok'); }
});
document.addEventListener('keydown', (e) => {
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === 'Enter' && e.target.id === 'copy') { e.preventDefault(); copyContinue(false); return; }
  if (e.key === 'Enter' && e.target.id === 'typed') { e.preventDefault(); ui.view === 'cards' ? checkTyped() : listenCheck(); return; }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter) { ACT[e.target.dataset.enter](); return; }
  if (inField) return;
  if (ui.view === 'cards' && ui.cards && curCard() && !isStrict()) {
    const c = ui.cards;
    if (!c.flipped && (e.key === ' ' || e.key === 'Enter') && cardPrefs().mode === 'flip') { e.preventDefault(); ACT.flip(); }
    else if (c.flipped && ['1', '2', '3'].includes(e.key)) gradeCard(['again', 'good', 'easy'][+e.key - 1]);
    else if (c.flipped && e.key === 'Enter') { e.preventDefault(); gradeCard(c.res === 'wrong' ? 'again' : 'good'); }
    else if (e.key.toLowerCase() === 'p') { const w = curCard().w; speak((w.article ? w.article + ' ' : '') + w.nl); }
  } else if (ui.view === 'listen' && ui.listen) {
    if (e.key === 'Enter' && ui.listen.res) { e.preventDefault(); ACT['listen-next'](); } else if (e.key.toLowerCase() === 'p') listenSay();
  }
});

load().then(loadPiper).then(async () => {
  if (window.vt && window.vt.version) {
    try { APPV = await window.vt.version(); UPD = await window.vt.updateState(); } catch {}
    window.vt.onUpdate((s) => {
      UPD = s;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if ((ui.view === 'home' || ui.view === 'settings') && !typing) render();
    });
  }
  render();
});
