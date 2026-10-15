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
  S = L.fixState(d); if (S.settings.keys && S.settings.keys.skip === '4') S.settings.keys.skip = '5'; /* 4 was the first default, but 1-4 pick the answers in the Bonus quizzes */ applyTheme(); applyBgFx(); refreshBirthday(); if (typeof snapshotToday === 'function') snapshotToday(); if (typeof initXp === 'function') initXp();
  if (!S.seeded) {
    const w = L.parseVocab(SEED_WORDS); 
    S.words = L.mergeWords(S.words, w).words; S.seeded = true; save();
  }
  if (window.vt && S.settings.login != null) window.vt.launchAtLogin(S.settings.login);
}

// ---------- sound, speech, toast ----------
// the volume slider in Settings (0 to 1) scales the chimes, Bigg's oink and every voice
const vol = () => { const v = S && S.settings ? S.settings.volume : 1; return v == null || isNaN(v) ? 1 : Math.min(1, Math.max(0, +v)); };
let actx;
function chime(kind, force) { // force: play even with chimes switched off (the volume slider uses it, so you hear the level)
  if ((!S.settings.sound && !force) || vol() <= 0) return;
  try {
    actx = actx || new AudioContext();
    const notes = kind === 'goal' ? [523, 659, 784, 1047] : kind === 'bad' ? [262] : [659, 880];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.11;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * vol(), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
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
// online voices (Azure Speech): set up in Settings; the key itself stays in the main process and never comes here
let AZ = { hasKey: false, region: 'westeurope', chars: 0, limit: 500000, safe: 450000, secure: true, last: '' };
const AZ_VOICES = [['nl-NL-ColetteNeural', 'Colette'], ['nl-NL-FennaNeural', 'Fenna'], ['nl-NL-MaartenNeural', 'Maarten'], ['nl-BE-DenaNeural', 'Dena (Flemish)'], ['nl-BE-ArnaudNeural', 'Arnaud (Flemish)']];
async function loadAzure() { try { if (window.vt && window.vt.azureGet) AZ = Object.assign(AZ, await window.vt.azureGet()); } catch {} }
let UPD = { status: 'idle' }, APPV = '';
function loadVoices() { try { VOICES = speechSynthesis.getVoices(); } catch { VOICES = []; } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (ui.view === 'settings' || ui.view === 'listen') render(); }; }
async function loadPiper() { try { PIPER = window.vt && window.vt.ttsVoices ? await window.vt.ttsVoices() : []; } catch { PIPER = []; } await loadAzure(); }
const dutchVoices = () => VOICES.filter((v) => /^nl\b|^nl[-_]/i.test(v.lang));
const VOICE_NAMES = { alex: 'Alex', pim: 'Pim', ronnie: 'Ronnie' };
// settings.voice is 'piper:alex', 'win:<Windows voice name>', a bare Windows voice name (older saves) or '' (best available)
function voiceChoice() {
  const v = S.settings.voice || '';
  if (v.startsWith('azure:') && AZ.hasKey && AZ_VOICES.some((x) => x[0] === v.slice(6))) return { engine: 'azure', id: 'az:' + v.slice(6) }; // an online voice
  if (v.startsWith('piper:') && PIPER.includes(v.slice(6))) return { engine: 'piper', id: v.slice(6) };
  const wname = v.startsWith('win:') ? v.slice(4) : v.startsWith('piper:') ? '' : v;
  const w = dutchVoices().find((x) => x.name === wname);
  if (w) return { engine: 'win', voice: w };
  if (PIPER.length) return { engine: 'piper', id: PIPER[0] };
  return dutchVoices()[0] ? { engine: 'win', voice: dutchVoices()[0] } : null;
}
const voiceLabel = () => { const c = voiceChoice(); return !c ? '' : c.engine === 'azure' ? ((AZ_VOICES.find((x) => 'az:' + x[0] === c.id) || [])[1] || 'Online') + ' (online)' : c.engine === 'piper' ? (VOICE_NAMES[c.id] || c.id) + ' (natural)' : c.voice.name.replace(/ - .*/, ''); };
const hasVoice = () => !!voiceChoice();
const lengthScale = (slow) => Math.min(2.5, Math.max(0.5, 0.9 / Math.max(0.3, S.settings.rate * (slow ? 0.65 : 1))));
let curAudio = null, speakToken = 0;
function stopSpeech() { speakToken++; try { speechSynthesis.cancel(); } catch {} if (curAudio) { curAudio.pause(); curAudio = null; } }
function speakWin(text, slow, voice) {
  const c = voice ? { voice } : voiceChoice();
  const v = c && c.voice; if (!v) return false;
  const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = Math.max(0.3, S.settings.rate * (slow ? 0.65 : 1)); u.volume = vol();
  speechSynthesis.speak(u); return true;
}
async function speakPiper(text, slow, id) {
  const my = ++speakToken;
  try {
    const bytes = await window.vt.tts(text, id, lengthScale(slow));
    if (my !== speakToken) return; // a newer request replaced this one
    const url = URL.createObjectURL(new Blob([bytes], { type: bytes[0] === 0x52 ? 'audio/wav' : 'audio/mpeg' })); // Piper makes WAV, the online voices MP3
    const a = new Audio(url); a.volume = vol(); curAudio = a; a.onended = () => URL.revokeObjectURL(url); await a.play();
  } catch (e) { if (my === speakToken && !speakWin(text, slow, dutchVoices()[0])) toast('Could not play the voice. See Settings > Voice.'); }
}
function speak(text, slow) {
  const c = voiceChoice();
  if (!c) { toast('No Dutch voice found. See Settings > Voice.'); return false; }
  stopSpeech();
  if (c.engine === 'piper' || c.engine === 'azure') { speakPiper(text, slow, c.id); return true; } // both come from the main process, as audio
  return speakWin(text, slow);
}
// the voice test greeting; an online voice gets no name, so your name is never sent to Microsoft
const helloText = (rest) => { const c = voiceChoice(), name = userName(); return 'Hoi' + (name && !(c && c.engine === 'azure') ? ' ' + name : '') + rest; };
function warmSpeech(text) { const c = voiceChoice(); if (c && c.engine !== 'win') { window.vt.tts(text, c.id, lengthScale(false)).catch(() => {}); } }

// ---------- activity ----------
function count(key, n) {
  const before = (S.log[today()] || {}).reviews || 0;
  L.bump(S.log, today(), key, n);
  const after = (S.log[today()] || {}).reviews || 0;
  if (key === 'reviews' && before < S.settings.dailyGoal && after >= S.settings.dailyGoal) { chime('goal'); confetti(); toast('Daily goal reached! Yay! 🎉'); ui.say = rnd(PIG.goal); if (typeof gainXp === 'function') gainXp(XP.goal); }
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
  const due = dueList().length, lv = L.levelInfo(S.xp || 0), t = todayStats();
  if (isNight()) return rnd(PIG.night);
  if (!liveWords().length) return rnd(PIG.welcome);
  if ((t.reviews || 0) >= S.settings.dailyGoal) return Math.random() < 0.5 ? fill(rnd(PIG.level), { n: lv.level, x: lv.need - lv.into, m: lv.level + 1 }) : rnd(PIG.goal);
  const pool = [];
  if (due) pool.push(...PIG.due.map((x) => fill(x, { n: due })));
  else pool.push(...PIG.nothingDue);
  if (lv.max) pool.push('You are max level! A real language legend! 👑');
  else if (lv.level > 1 || lv.into > 20) pool.push(...PIG.level.map((x) => fill(x, { n: lv.level, x: lv.need - lv.into, m: lv.level + 1 })));
  const now = new Date(), h = now.getHours(), dow = now.getDay(); // the time of day, the weekend, little tips and the Bonus Lessons mix in too
  pool.push(...(h < 12 ? PIG.morning : h < 18 ? PIG.afternoon : PIG.evening), ...PIG.tips, ...PIG.bonus);
  if (dow === 0 || dow === 6) pool.push(...PIG.weekend); else if (dow === 1) pool.push(...PIG.monday);
  if (userName()) pool.push(...PIG.named.map((x) => fill(x, { name: userName() })));
  if (due) pool.push(...PIG.due.map((x) => fill(x, { n: due }))); // the cards that are due stay the most likely thing he says
  const ctx = contextLines(); // special days and seasons sneak in
  if (ctx.length && Math.random() < (L.holidayOf() ? 0.6 : 0.25)) return rnd(ctx);
  return rnd(pool);
}

// ---------- shell ----------
const NAV = [['home', '🏠', 'Today', '#ff9d8e'], ['cards', '🃏', 'Flashcards', '#7fd4f0'], ['listen', '🎧', 'Listening', '#9ccbff'], ['sheets', '📝', 'Worksheets', '#ffe08a'],
  ['words', '🔤', 'Words', '#ffb38a'], ['grammar', '🧠', 'Grammar', '#ffa6c4'], ['bonus', '🎁', 'Bonus Lessons', '#c9a7ff'], ['progress', '📈', 'Progress', '#b5b9ff'], ['wardrobe', '🎩', 'Wardrobe', '#a8e6cf'], ['settings', '⚙️', 'Settings', '#cfc6ee']];
function renderSide() {
  const lv = L.levelInfo(S.xp || 0); ui.sideLevel = lv.level;
  const due = dueList().length, fresh = ((S.wardrobe || {}).fresh || []).length, sig = [ui.view, due, lv.level, liveWords().length, pigStage(), currentLook(), currentBg(), fresh, today()].join('|');
  if (sig === ui.sideSig) return; // nothing in the sidebar changed: leave it alone (redrawing it restarts the logo animation)
  ui.sideSig = sig;
  $('#side').innerHTML = `<div class="logo">${pigSvg('happy', 'pig-logo', { stage: pigStage(), look: '', bg: '' })}<div><b>BiggTaal</b><span>Nederlands leren</span></div></div>` +
    NAV.map(([id, ic, name, col]) => `<button class="nav ${id === 'wardrobe' ? 'nav-bottom ' : ''}${ui.view === id ? 'on' : ''}" data-act="nav" data-v="${id}"><span class="ic" style="background:${col}">${ic}</span><span class="t">${name}</span>` +
      (id === 'cards' && due ? `<span class="badge">${due}</span>` : '') + (id === 'wardrobe' && fresh ? `<span class="badge">${fresh}</span>` : '') + '</button>').join('') +
    `<div class="side-foot"><div class="xp-row"><b>⭐ Level ${lv.level}</b><span>${esc(lv.title[0])}</span></div><div class="xp-bar"><i id="xpfill" style="width:${lv.pct}%"></i></div><div class="xp-sub" id="xpsub">${L.xpText(lv)}</div>${liveWords().length} words</div>`;
}
function render() {
  renderSide();
  const v = VIEWS[ui.view] || VIEWS.home;
  const main = $('#main'), keep = main.scrollTop;
  main.classList.toggle('still', ui.rendered === ui.view); // same page again: no entrance animations, so nothing flashes
  ui.rendered = ui.view;
  main.innerHTML = v();
  main.scrollTop = keep;
  if (typeof geoFit === 'function') geoFit(); // the Bonus quiz page is sized to the window
  const f = $('[data-focus]'); if (f) f.focus();
}
ui.wsScroll = {}; // where you were in each open worksheet, so coming back to it puts you at the same spot
function go(v) { if (ui.view === 'sheets' && ui.sheetId) ui.wsScroll[ui.sheetId] = $('#main').scrollTop; ui.view = v; ui.say = ''; render(); $('#main').scrollTop = (v === 'sheets' && ui.sheetId && ui.wsScroll[ui.sheetId]) || 0; }

const VIEWS = {};

// ---------- home ----------
const dailyPick = (list, n) => { const d = Math.floor(Date.now() / 864e5); return Array.from({ length: n }, (_, i) => list[(d * n + i) % list.length]); }; // the same few every time today, different tomorrow
VIEWS.home = () => {
  const t = todayStats(), g = S.settings.dailyGoal, due = dueList().length, m = L.mastery(S.words), lv = L.levelInfo(S.xp || 0);
  if (!ui.say) ui.say = pigLine();
  const week = L.week(S.log, today()), max = Math.max(5, ...week.map((x) => x.n));
  const pv = PROVERBS[Math.floor(Date.now() / 864e5) % PROVERBS.length];
  const dn = (d) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(d + 'T12:00').getDay()];
  const upd = UPD.status === 'ready' ? `<div class="card upd"><div class="row"><div class="grow"><b>A new BiggTaal is ready! 🌸</b><div class="muted">Version ${esc(UPD.version)} has been downloaded. It installs when you restart, and your words and progress are safe.</div></div><button class="primary" data-act="update-install">Restart to update</button></div></div>` : '';
  return `${upd}${typeof recapNotice === 'function' ? recapNotice() : ''}<div class="hero">${pigSvg(pigMood(), '', { stage: pigStage(), note: true, cap: isNight() })}<div class="bubble" id="bubble">${esc(ui.say)}</div></div>
  <div class="grid g4">
    <div class="card stat s-coral"><i class="si">🎯</i><b>${(t.reviews || 0)} / ${g}</b><span>cards today</span><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, ((t.reviews || 0) / g) * 100)}%"></i></div></div>
    <div class="card stat s-sun"><i class="si">⭐</i><b>Lv ${lv.level}</b><span>${esc(lv.title[0])}</span></div>
    <div class="card stat s-aqua"><i class="si">🃏</i><b>${due}</b><span>cards due now</span></div>
    <div class="card stat s-mint"><i class="si">🌱</i><b>${m.learned} <small class="muted">/ ${m.total}</small></b><span>words learned (box 4+)</span></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    ${typeof mixCard === 'function' ? mixCard() : ''}
    <div class="stack">${levelCard()}${mistakesCard()}</div>
    <div class="card daily"><h2>Spreuk van de dag</h2><div class="dl-row"><div><b class="dl-big">${esc(pv[0])}</b><small class="muted">${esc(pv[1])}</small></div><button class="ghost mini" data-act="say" data-t="${esc(pv[0])}" title="Listen">🔊</button></div>
      <h3 class="dl-h">Zinnen van de dag</h3>${dailyPick(DAILY_PHRASES, 2).map((x) => `<div class="dl-row"><div><b>${esc(x[0])}</b><small class="muted">${esc(x[1])}</small></div><button class="ghost mini" data-act="say" data-t="${esc(x[0])}" title="Listen">🔊</button></div>`).join('')}
      <h3 class="dl-h">Woorden van de dag</h3>${dailyPick(DAILY_WORDS, 2).map((x) => `<div class="dl-row"><div><b>${esc(x[0])}</b><small class="muted">${esc(x[1])}</small></div><button class="ghost mini" data-act="say" data-t="${esc(x[0])}" title="Listen">🔊</button></div>`).join('')}</div>
  </div>`;
};

// ---------- listening ----------
const LISTEN_ASK = ['Listen closely, I am right here! 🎧', 'Take your time, press 🔊 as often as you like!', 'Ready? Here comes the next one! 🌸', 'You can do it! 💗', 'Use the turtle if you want it slower! 🐢'];
const LMODES = [['word', '✍️ Spell the word', 'Hear a Dutch word and type it'], ['meaning', '🎯 What does it mean?', 'Hear a word and pick the English'], ['article', '🔀 De or het?', 'Hear a noun and pick the article'], ['sentence', '💬 Sentence dictation', 'Hear a real Dutch sentence that uses one of your words and type it']];
async function startReal() { // sentences from Tatoeba that use words you are learning
  toast('Finding real sentences...');
  let pool = [];
  try {
    const idx = await sentenceData(), mine = L.pick(liveWords().filter((w) => !w.example || true), 60), seen = new Set();
    for (const w of mine) { const own = w.example && w.exampleEn && !seen.has(w.example) ? [w.example, w.exampleEn] : null, f = own || L.sentencesFor(w.nl, w.pos, idx, SENTENCES, 4).find((p) => !seen.has(p[0])); if (f) { seen.add(f[0]); pool.push(Object.assign({}, w, { id: 'tat' + pool.length, example: f[0], en: f[1], article: '' })); } if (pool.length >= 10) break; }
  } catch { return toast('Could not load the sentences.'); }
  if (!pool.length) return toast('No sentences found for your words yet. Add some more words!');
  ui.listen = { mode: 'sentence', real: true, sound: '', queue: pool, i: 0, res: null, typed: '', n: 0, good: 0, opts: null, picked: '', hint: 0, diff: null, tags: [] };
  prepListen(); render(); setTimeout(listenSay, 150);
}
function startListen(mode, sound) {
  if (mode === 'sentence') { startReal(); return; }
  let pool = ui.listenPool || liveWords(); ui.listenPool = null;
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
  l.hint = 0; l.diff = null; l.tags = []; l.mean = null; l.showTr = false; l.ex = null;
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
    return `<div class="top"><div><h1>Listening</h1></div>
      <div class="row"><span class="muted">Speed</span>${[['Slow', 0.7], ['Normal', 0.9], ['Fast', 1.1]].map(([n, x]) => `<button class="ghost ${Math.abs(r - x) < 0.06 ? 'on' : ''}" data-act="rate" data-r="${x}">${n}</button>`).join('')}</div></div>${warn}
    ${st.length ? `<div class="card" style="margin-bottom:16px"><h2>Sounds to practise 🎯</h2><p class="muted">From the words you wrote down wrongly. Bigg picked the ones that trip you up most.</p>
      ${st.map(([id, x]) => `<div class="lesson" style="margin:6px 0"><div class="lt">${esc(L.SOUNDS[id].name)} <span class="pill pink">${x.n} slip${x.n === 1 ? '' : 's'}</span><div class="muted" style="font-weight:600;font-size:13px">${esc(L.SOUNDS[id].tip)}</div></div><button class="primary" data-act="listen-start" data-m="word" data-s="${id}">Practise</button></div>`).join('')}</div>` : ''}
    <div class="grid g2 lmodes">${LMODES.map(([id, name, d]) => `<div class="card"><h2>${name}</h2><p class="muted">${d}</p><button class="primary" data-act="listen-start" data-m="${id}">Start (10)</button></div>`).join('')}</div>`;
  }
  const w = l.queue[l.i];
  if (!w) return `<div class="top"><h1>Klaar! 🎧</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-sm', { note: true, stage: pigStage() })}<h2>${l.good} of ${l.n} right</h2><p class="muted">${l.good === l.n ? 'Perfect! Your ears are getting so good! 💗' : 'Every round trains your ear a little more. 🌸'}</p>
    <div class="row" style="justify-content:center"><button class="primary" data-act="listen-start" data-m="${l.mode}" data-s="${l.sound}">Again</button><button class="ghost" data-act="listen-exit">Other modes</button></div></div></div>`;
  const dictation = l.mode === 'word' || l.mode === 'sentence';
  let body;
  if (l.mode === 'meaning') body = `<div class="opts">${l.opts.map((o) => `<button data-act="listen-pick" data-v="${esc(o)}" class="${l.res ? (o === w.en ? 'ok' : o === l.picked ? 'no' : '') : ''}">${esc(o)}</button>`).join('')}</div>${l.res ? '' : '<div class="row" style="justify-content:center;margin-top:8px"><button class="ghost" data-act="listen-skip">🤷 I don\'t know</button></div>'}`;
  else if (l.mode === 'article') body = `<div class="opts"><button data-act="listen-pick" data-v="de" class="${l.res ? (w.article === 'de' ? 'ok' : l.picked === 'de' ? 'no' : '') : ''}">de</button><button data-act="listen-pick" data-v="het" class="${l.res ? (w.article === 'het' ? 'ok' : l.picked === 'het' ? 'no' : '') : ''}">het</button></div><div class="row" style="justify-content:center;margin-top:8px"><button class="ghost" data-act="listen-skip">🤷 I don't know</button></div>`;
  else body = l.res ? '' : `${l.hint ? `<div class="hint-line">${esc(L.hintText(l.mode === 'sentence' ? w.example : w.nl, l.hint))}</div>` : ''}<input type="text" class="big-in" id="typed" data-focus autocomplete="off" spellcheck="false" placeholder="Type what you hear... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="listen-check">Check</button><button class="ghost" data-act="listen-hint">💡 ${l.hint ? (l.hint > 1 ? 'More hint used' : 'More hint') : 'Hint'}</button><button class="ghost" data-act="listen-skip">🤷 I don't know</button></div>`;
  let result = '';
  if (l.res) {
    const target = l.mode === 'sentence' ? w.example : l.mode === 'meaning' ? w.en : l.mode === 'article' ? w.article + ' ' + w.nl : (w.article ? w.article + ' ' : '') + w.nl;
    let detail = '';
    if (l.mode === 'sentence' && l.diff) {
      detail = `<div class="chips">${l.diff.words.map((x) => `<button class="wchip ${x.status}" data-act="listen-word" data-w="${esc(x.w)}" title="Click to hear this word">${esc(x.w)}${x.status !== 'ok' ? `<small>${x.typed ? 'you: ' + esc(x.typed) : 'missed'}</small>` : ''}</button>`).join('')}</div>${l.diff.extra.length ? `<div class="muted">Extra words: ${esc(l.diff.extra.join(', '))}</div>` : ''}<div class="muted" style="margin-top:6px">${esc(w.exampleEn || w.en)}</div>`;
    } else if (l.mode === 'word' && l.diff) {
      detail = `<button class="wordbtn" data-act="listen-mean" data-w="${esc(w.nl)}" title="Tap for the meaning"><div class="ltrs">${w.article ? `<span class="fc-art" style="margin-right:8px">${esc(w.article)}</span>` : ''}${l.diff.cells.map((c) => `<span class="ltr ${c.ok ? 'ok' : 'bad'}">${esc(c.c)}</span>`).join('')}</div></button>${l.diff.extra.length ? `<div class="muted">Extra letters you typed: ${esc(l.diff.extra.join(' '))}</div>` : ''}`;
    } else detail = `<div style="font-size:20px;margin:8px 0">${esc(target)}</div>${l.mode === 'meaning' ? `<div class="muted">${esc(w.nl)}</div>` : ''}`;
    const exBox = l.ex ? `<div class="exbox"><button class="ghost mini" data-act="say" data-t="${esc(l.ex.nl)}" title="Hear the sentence">🔊</button><div><div class="exnl">${exHtml(l.ex.nl, w)}</div>${l.ex.en ? `<div class="muted">${esc(l.ex.en)}</div>` : ''}</div></div>` : '';
    const meanBox = l.mean ? `<div class="meaning">${meaningHtml(l.mean, w)}</div>` : '';
    const tip = l.tags.length ? `<div class="tip">💡 <b>${esc(L.SOUNDS[l.tags[0]].name)}:</b> ${esc(L.SOUNDS[l.tags[0]].tip)}</div>` : '';
    result = `<div class="card rcard" style="text-align:center">${detail}${meanBox}${exBox}${tip}${l.typed && dictation && l.res !== 'right' ? `<div class="muted" style="margin-top:6px">You typed: ${esc(l.typed)}</div>` : ''}${l.hint && l.res === 'right' ? '<div class="muted">(with a hint)</div>' : ''}
      <div class="row" style="justify-content:center;margin-top:12px"><button class="ghost" data-act="listen-say">🔊 Again</button><button class="ghost" data-act="listen-slow">🐢 Slow</button><button class="primary" data-act="listen-next" data-focus>Next →</button></div></div>`;
  }
  const co = l.coach || (l.coach = { kind: 'start', act: 'in', line: rnd(COACH.start), played: false }), actCls = co.played ? '' : 'act-' + co.act;
  co.played = true;
  const coachBar = `<div class="coach">${pigSvg('happy', actCls, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span></div></div>`;
  return `<div class="top"><div><h1>Listening</h1><p class="sub">${l.sound ? 'Sound practice: ' + esc(L.SOUNDS[l.sound].name) : LMODES.find((m) => m[0] === l.mode)[1]} · ${l.i + 1} of ${l.queue.length}</p></div><button class="ghost" data-act="listen-exit">End</button></div>
    <div class="fc-wrap lis">${coachBar}${warn}<div class="card lcard"><button class="speak big" data-act="listen-say" title="Play (P)">🔊</button><button class="ghost" data-act="listen-slow">🐢 Slow</button></div>${body}${result}</div>`;
};
// an example sentence for the word you just heard: your own, or a real one from Tatoeba
async function findExample() {
  const l = ui.listen, w = l && l.queue[l.i]; if (!w || l.mode === 'sentence' || l.ex) return;
  const i = l.i;
  if (w.example) { l.ex = { nl: w.example, en: w.exampleEn || '' }; render(); return; }
  try {
    const p = (await examplesFor(w.nl, w.pos, 4))[0]; if (!p) return;
    if (ui.listen === l && l.i === i && l.res) { l.ex = { nl: p[0], en: p[1] }; render(); }
  } catch {}
}
// the sentence with the word you practised in bold
function exHtml(sentence, w) {
  const forms = L.exampleForms(w.nl, w.pos);
  return esc(sentence).replace(/[A-Za-zÀ-ÿ']+/g, (t) => (forms.includes(t.toLowerCase()) ? '<u>' + t + '</u>' : t));
}
// what a word means: your own list first, then the dictionary
function meaningHtml(word, cur) {
  const key = word.toLowerCase().replace(/[.,!?;:"]/g, '').replace(/^(de|het|een)\s+/, '');
  const mine = liveWords().find((x) => x.nl.toLowerCase().replace(/^(de|het|een|zich)\s+/, '') === key) || (cur && cur.nl.toLowerCase() === key ? cur : null);
  if (mine && mine.en && mine.id && !String(mine.id).startsWith('tat')) return `<b>${mine.article ? esc(mine.article) + ' ' : ''}${esc(mine.nl)}</b> = ${esc(mine.en)}`;
  if (typeof DICT === 'undefined') return '<span class="muted">Looking it up...</span>';
  const r = L.dictSearch(DICT, dictIndex(), key, 1)[0];
  if (!r) return `<b>${esc(word)}</b> <span class="muted">is not in the dictionary</span>`;
  const e = r.e, fl = formsLine(e), dm = dictMean(e);
  return `<b>${e[2] === 'de' || e[2] === 'het' ? e[2] + ' ' : ''}${esc(e[0])}</b> <span class="muted">${L.POS_NAMES[e[1]] || ''}</span> = ${esc(dm.mean.split('; ').slice(0, 3).join('; '))}${dm.note ? `<div class="muted" style="font-size:13px">${esc(dm.note)}</div>` : ''}${fl ? `<div class="muted" style="font-size:13px">${esc(fl)}</div>` : ''}${r.how === 'form' ? `<div class="muted" style="font-size:13px">(${esc(key)} is the ${esc(formLabel(e, key))})</div>` : alsoLine(key) ? `<div class="muted" style="font-size:13px">${esc(alsoLine(key))}</div>` : ''}`;
}
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
  l.streak = res === 'right' ? (l.streak || 0) + 1 : 0;
  const mo = L.coachMoment({ grade: res === 'wrong' ? 'again' : 'good', streak: l.streak, done: l.n, total: l.queue.length });
  l.coach = res === 'close' ? { kind: 'close', act: 'nod', line: rnd(PIG.close), played: false } : { kind: mo.kind, act: mo.act, line: res === 'wrong' ? rnd(PIG.wrong) : rnd(COACH[mo.kind]), played: false, burst: mo.burst };
  if (l.mode === 'word') { l.mean = l.queue[l.i].nl; if (typeof DICT === 'undefined') loadData('dict').then(render).catch(() => {}); }
  gainXp(res === 'right' ? (l.hint ? 8 : XP.listenRight) : res === 'close' ? XP.listenClose : XP.listenWrong);
  bumpDay(res === 'right' ? 'lOk' : 'lMiss'); if (res !== 'right' && l.queue[l.i]) noteMiss(l.queue[l.i].nl, 'listen');
  chime(res === 'wrong' ? 'bad' : 'ok'); count('listen'); render(); findExample();
  if (l.coach.burst) burstBits(l.coach.burst);
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
VIEWS.grammar = () => `<div class="grid g2 gram">${GRAMMAR.map((g) => `<div class="card"><h3>${g.t}</h3>${g.b.map((p) => `<p>${p}</p>`).join('')}</div>`).join('')}</div>`;

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
const THEMES = [['slate', 'Slate', '#14161c', '#ff8f7e', '#8fb4ff'], ['lagoon', 'Lagoon', '#0b1a28', '#ff8f7e', '#6fd3ee'], ['plum', 'Plum', '#1a1226', '#ff8fb1', '#b79cff'], ['forest', 'Forest', '#0e1a15', '#ffb86b', '#7fd8a8'], ['dusty', 'Dusty', '#2a2024', '#ff9aae', '#a9d6b8'],
  ['cream', 'Cream', '#fff6ee', '#f2705f', '#1fa3c4'], ['blossom', 'Blossom', '#fff0f5', '#e8588a', '#7a6ad8']];
document.addEventListener('change', (e) => {
  if (e.target.id === 's-name' || e.target.id === 's-bday-m' || e.target.id === 's-bday-d') {
    if (e.target.id === 's-name') S.settings.name = e.target.value.trim();
    else { // the birthday is saved once both the month and the day are picked (the year is only a placeholder)
      const bd = (ui.bday = ui.bday || {}), cur = /^\d{4}-(\d{2})-(\d{2})$/.exec(S.settings.birthday || '');
      if (cur && bd.m == null) { bd.m = +cur[1]; bd.d = +cur[2]; }
      if (e.target.id === 's-bday-m') bd.m = +e.target.value || 0; else bd.d = +e.target.value || 0;
      if (bd.m && bd.d) { bd.d = Math.min(bd.d, new Date(2000, bd.m, 0).getDate()); S.settings.birthday = '2000-' + String(bd.m).padStart(2, '0') + '-' + String(bd.d).padStart(2, '0'); } else S.settings.birthday = '';
    }
    refreshBirthday(); save(); ui.say = ''; ui.sideSig = ''; if (typeof checkEarned === 'function') checkEarned(); render(); return;
  }
  if (e.target.id === 'fc-group') { cardPrefs().group = e.target.value; save(); render(); return; }
  if (e.target.id === 's-voice') { // a new voice takes effect (and is saved) as soon as it is picked, and says hello so you can hear it
    S.settings.voice = e.target.value; save(); speak(helloText(', zo klink ik. Veel plezier met leren!')); return;
  }
  if (e.target.id === 's-rate') { S.settings.rate = +e.target.value || 0.9; save(); speak('Zo snel praat ik nu.'); return; }
  if (['s-goal', 's-new'].includes(e.target.id)) { const g = +$('#s-goal').value, n = +$('#s-new').value; S.settings.dailyGoal = Math.max(3, Math.min(200, g || S.settings.dailyGoal)); S.settings.newPerDay = Math.max(0, Math.min(50, isNaN(n) ? S.settings.newPerDay : n)); e.target.value = e.target.id === 's-goal' ? S.settings.dailyGoal : S.settings.newPerDay; save(); ui.say = ''; return; }
  if (e.target.id === 's-vol') { S.settings.volume = +e.target.value; save(); chime('ok', true); return; } // a little chime at the new level
  if (e.target.id === 's-sound') { S.settings.sound = e.target.checked; save(); return; }
  if (e.target.id === 's-login') { S.settings.login = e.target.checked; save(); if (window.vt) window.vt.launchAtLogin(S.settings.login); return; }
  if (e.target.id === 's-upd') { S.settings.autoUpdate = e.target.checked; save(); return; }
  if (e.target.id === 's-bgfx') { S.settings.bgfx = e.target.checked; save(); applyBgFx(); }
  if (e.target.id === 's-gloss') { S.settings.gloss = e.target.checked; save(); render(); }
});
// while the volume slider moves, whatever is playing follows it
document.addEventListener('input', (e) => { if (e.target.id !== 's-vol') return; S.settings.volume = +e.target.value; const n = $('#s-vol-n'); if (n) n.textContent = Math.round(vol() * 100) + '%'; if (curAudio) curAudio.volume = vol(); try { speechSynthesis.cancel(); } catch {} });
// the floating hearts and sparkles behind every page can be switched off in Settings
function applyBgFx() { document.body.classList.toggle('nofx', S && S.settings && S.settings.bgfx === false); }
function applyTheme() { const t = (S && S.settings && S.settings.theme) || 'slate'; document.documentElement.setAttribute('data-theme', THEMES.some((x) => x[0] === t) ? t : 'slate'); }

VIEWS.settings = () => {
  const s = S.settings, nl = dutchVoices(), vc = voiceChoice(), cur = vc ? (vc.engine === 'piper' ? 'piper:' + vc.id : vc.engine === 'azure' ? 'azure:' + vc.id.slice(3) : 'win:' + vc.voice.name) : '';
  const bday = (() => {
    const c = /^\d{4}-(\d{2})-(\d{2})$/.exec(S.settings.birthday || ''), bd = ui.bday || {}, m = bd.m != null ? bd.m : c ? +c[1] : 0, d = bd.d != null ? bd.d : c ? +c[2] : 0;
    const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `<select id="s-bday-m"><option value="">Month</option>${MN.map((n, i) => `<option value="${i + 1}" ${m === i + 1 ? 'selected' : ''}>${n}</option>`).join('')}</select><select id="s-bday-d"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${d === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>`;
  })();
  const voiceSel = PIPER.length || nl.length || AZ.hasKey ? `<select id="s-voice" style="width:100%">${AZ.hasKey ? `<optgroup label="Online voices (Azure)">${AZ_VOICES.map(([id, name]) => `<option value="azure:${id}" ${cur === 'azure:' + id ? 'selected' : ''}>${name}</option>`).join('')}</optgroup>` : ''}${PIPER.length ? `<optgroup label="Natural voices (offline)">${PIPER.map((id) => `<option value="piper:${id}" ${cur === 'piper:' + id ? 'selected' : ''}>${VOICE_NAMES[id] || id}</option>`).join('')}</optgroup>` : ''}${nl.length ? `<optgroup label="Windows voices">${nl.map((x) => `<option value="win:${esc(x.name)}" ${cur === 'win:' + x.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>` : ''}</select>`
    : `<p class="warn">No Dutch voice found. Windows: Settings → Time &amp; language → Language &amp; region → Add a language → Nederlands, include <i>Text-to-speech</i>, then restart this app.</p>`;
  return `<div class="top"><div><h1>Settings</h1></div></div>
  <div class="card set-card"><h2>About you</h2>
    <div class="row"><label class="f" style="flex:1 1 220px">Your name<input type="text" id="s-name" value="${esc(S.settings.name || '')}" placeholder="What should Bigg call you?" autocomplete="off" maxlength="30"></label>
      <div class="f bday-row" style="flex:1 1 260px"><span>Your birthday</span><div class="row" style="gap:8px;flex-wrap:nowrap">${bday}</div></div></div></div>
  <div class="card set-card"><h2>Look</h2>
    <div class="themes">${THEMES.map(([id, name, bg, a, b]) => `<button class="theme ${S.settings.theme === id ? 'on' : ''}" data-act="theme" data-v="${id}"><span class="sw" style="background:${bg}"><i style="background:${a}"></i><i style="background:${b}"></i></span>${name}</button>`).join('')}</div>
    <label class="row" style="margin-top:12px"><input type="checkbox" id="s-bgfx" ${S.settings.bgfx !== false ? 'checked' : ''}> Floating hearts, flowers and sparkles behind the pages</label></div>
  <div class="grid g2 set-grid">
    <div class="card"><h2>Learning</h2>
      <label class="f">Daily goal (cards)</label><input type="number" id="s-goal" min="3" max="200" value="${s.dailyGoal}" style="width:100px">
      <label class="f">New words per day</label><input type="number" id="s-new" min="0" max="50" value="${s.newPerDay}" style="width:100px">
      <label class="row" style="margin-top:12px"><input type="checkbox" id="s-gloss" ${S.settings.gloss !== false ? 'checked' : ''}> Explain grammar terms when I hover over them</label></div>
    <div class="card"><h2>Sound</h2>
      <label class="row" style="margin-bottom:10px"><input type="checkbox" id="s-sound" ${s.sound ? 'checked' : ''}> Play chimes</label>
      <label class="f">Volume <span class="muted" id="s-vol-n">${Math.round(vol() * 100)}%</span></label><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${vol()}" style="margin-bottom:12px">
      <label class="f">Voice</label>${voiceSel}
      <label class="f">Speed</label><input type="range" id="s-rate" min="0.5" max="1.3" step="0.05" value="${s.rate}">
      <div class="row" style="margin-top:10px"><button class="ghost" data-act="voice-test">🔊 Test voice</button></div></div>
  </div>
  <div class="card set-card"><h2>Online voices (Azure)</h2>
    <p class="muted" style="margin:0 0 10px">Natural Dutch voices from Microsoft. They need internet and a free Azure Speech key. The Dutch you listen to is sent to Microsoft, every clip is saved on this PC so repeats work offline, and a built-in voice takes over if Azure is not available. The free plan has 500,000 characters a month; BiggTaal stops before that.</p>
    ${!window.vt ? '<p class="warn">Online voices work in the BiggTaal app, not in a browser.</p>' : AZ.secure === false ? '<p class="warn">Windows cannot protect a key on this PC, so online voices are switched off.</p>' : `
    ${AZ.hasKey ? `<div class="az-status"><b>✓ Key saved</b> <span class="muted">· region ${esc(AZ.region)} · pick a voice under Sound</span><div class="bar" style="margin:8px 0 4px"><i style="width:${Math.min(100, (AZ.chars / AZ.limit) * 100)}%"></i></div><span class="muted" style="font-size:13px">${AZ.chars.toLocaleString()} of ${AZ.limit.toLocaleString()} free characters used this month</span>${AZ.last ? `<div class="warn" style="margin-top:6px">Last problem: ${esc({ auth: 'the key was not accepted', limit: 'the free characters are used up', network: 'no connection', bad: 'a bad request', server: 'the service did not answer' }[AZ.last] || AZ.last)}</div>` : ''}</div>` : ''}
    <div class="row" style="margin-top:10px"><label class="f" style="flex:1 1 150px">Region<input type="text" id="s-az-region" value="${esc(AZ.region)}" placeholder="westeurope" autocomplete="off" spellcheck="false"></label>
      <label class="f" style="flex:2 1 260px">Speech key<input type="password" id="s-az-key" placeholder="${AZ.hasKey ? 'Saved. Paste a new key to replace it' : 'Paste Key 1 from your Speech resource'}" autocomplete="off" spellcheck="false"></label></div>
    <div class="row" style="margin-top:10px"><button class="primary" data-act="az-save">Save</button>${AZ.hasKey ? '<button class="ghost" data-act="az-test">▶ Test</button><button class="ghost" data-act="az-clear">Remove key</button>' : ''}</div>
    <details class="az-help"><summary>How to get a key</summary><ol class="muted"><li>Create a free Azure account at portal.azure.com.</li><li>Create a resource called <b>Speech</b>, choose the pricing tier <b>Free (F0)</b> and a region such as West Europe.</li><li>Open the resource, go to <b>Keys and Endpoint</b>, and copy <b>Key 1</b> and the <b>Location/Region</b> (for example westeurope) into the boxes above, in lowercase without spaces.</li><li>If Azure says a region is not accepting new customers, make the resource in another one, for example <b>North Europe</b> (northeurope), <b>Sweden Central</b> (swedencentral) or <b>Germany West Central</b> (germanywestcentral).</li></ol></details>`}</div>
  <div class="card set-card"><h2>Flashcard shortcuts</h2>
    <div class="hk-grid">${HOTKEY_DEFS.map(([id, name]) => `<div class="hk-row"><span>${esc(name)}</span><button class="hk-key ${ui.hkCapture === id ? 'wait' : ''}" data-act="hk-set" data-v="${id}" title="Click, then press the key you want">${ui.hkCapture === id ? 'Press a key…' : esc(keyLabel(hotkeys()[id]))}</button></div>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="ghost mini" data-act="hk-reset">↺ Back to the usual keys</button><span class="muted" style="font-size:13px">Click a key, then press the new one (Esc cancels). Enter always works for the answer and for rating, and Esc also skips. While you type an answer, letter keys need Ctrl (Ctrl+H); digits work as they are.</span></div></div>
  <div class="grid g2 set-grid">
    <div class="card"><h2>Your data</h2><p class="muted">Saved on this PC only${window.vt ? '' : ' (browser storage)'}. A backup copy is made once a day.</p>
      <div class="row"><button class="ghost" data-act="data-reveal">📂 Show data folder</button><button class="ghost" data-act="data-export">⬆ Export everything</button><button class="ghost" data-act="data-import">⬇ Import file</button></div>
      <div class="row" style="margin-top:8px"><button class="ghost" data-act="reseed">Re-add starter words</button></div></div>
    <div class="card"><h2>App</h2><p class="muted">BiggTaal ${esc(APPV || '0.5.0')}. ${esc(updateText())}</p>
      <label class="row"><input type="checkbox" id="s-login" ${s.login ? 'checked' : ''}> Start with Windows</label>
      <label class="row" style="margin-top:6px"><input type="checkbox" id="s-upd" ${s.autoUpdate !== false ? 'checked' : ''}> Look for new versions automatically</label>
      <div class="row" style="margin-top:12px"><button class="ghost" data-act="update-check">🔄 Check for updates</button>${UPD.status === 'ready' ? '<button class="primary" data-act="update-install">Restart to update</button>' : ''}</div></div>
  </div>
  ${typeof devCard === 'function' ? devCard() : ''}
  <p class="muted set-about">Bigg is Varken's little brother, and he thinks you are doing great. 🌸 Dictionary, word lists and sentences come from Wiktionary, OpenSubtitles and Tatoeba (see the data folder). Reviews are scheduled with FSRS.</p>`;
};
function updateText() {
  const u = UPD;
  return { idle: 'Updates are checked a few seconds after BiggTaal starts.', checking: 'Checking for updates...', current: 'You have the newest version. 💗', downloading: `Downloading version ${u.version} (${u.percent || 0}%)...`, ready: `Version ${u.version} is ready. Restart to install it.`, unavailable: 'Updates work in the installed app.', error: 'Could not check just now (' + (u.error || 'no connection') + '). I will try again later.' }[u.status] || '';
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
  'listen-word': (el) => { speak(el.dataset.w); ui.listen.mean = el.dataset.w; if (typeof DICT === 'undefined') loadData('dict').then(render).catch(() => {}); render(); }, 'listen-exit': () => { ui.listen = null; render(); },
  'listen-say': () => listenSay(), 'listen-slow': () => listenSay(true), 'listen-check': listenCheck,
  'listen-skip': () => {
    const l = ui.listen, w = l.queue[l.i]; if (!w || l.res) return;
    l.typed = ''; l.picked = '';
    if (l.mode === 'sentence') l.diff = L.diffWords(w.example, '');
    else if (l.mode === 'word') l.diff = L.letterDiff(w.nl, '');
    finishListen('wrong');
  },
  'listen-mean': (el) => { const l = ui.listen; l.mean = el.dataset.w; if (typeof DICT === 'undefined') loadData('dict').then(render).catch(() => {}); render(); },
  'listen-tr': () => { ui.listen.showTr = true; render(); },
  'listen-pick': (el) => { const l = ui.listen, w = l.queue[l.i]; if (l.res) return; l.picked = el.dataset.v; finishListen(el.dataset.v === (l.mode === 'article' ? w.article : w.en) ? 'right' : 'wrong'); },
  'listen-next': () => { const l = ui.listen; l.i++; if (!l.queue[l.i]) gainXp(XP.session); l.coach = { kind: 'ask', act: '', line: rnd(LISTEN_ASK), played: true }; l.res = null; l.typed = ''; l.picked = ''; prepListen(); render(); if (l.queue[l.i]) setTimeout(listenSay, 150); },
  'word-save': () => {
    const nl = $('#w-nl').value.trim(), en = $('#w-en').value.trim(); if (!nl || !en) return toast('Need both Dutch and English');
    const o = { nl, en, article: $('#w-art').value, example: $('#w-ex').value.trim() }; o.pos = o.article ? 'noun' : guessPos(nl);
    o.exampleEn = o.example && ui.exEn && ui.exEn[0] === o.example ? ui.exEn[1] : ''; ui.exEn = null; ui.exFound = null;
    if (ui.edit) Object.assign(S.words.find((w) => w.id === ui.edit), o); else S.words.push(L.newWord(o));
    const wasEdit = !!ui.edit; ui.edit = null; if (wasEdit) ui.words.tab = ui.words.back || 'all'; save(); toast(wasEdit ? 'Saved' : 'Added ' + nl); render();
  },
  'word-del': (el) => { const w = S.words.find((x) => x.id === el.dataset.id); w.deleted = true; save(); toast('Deleted ' + w.nl); render(); },
  'bulk-add': () => { const t = $('#w-bulk').value; if (!t.trim()) return; if (importText(t)) ui.draftText = ''; render(); },
  theme: (el) => { S.settings.theme = el.dataset.v; applyTheme(); save(); render(); },
  'az-save': async () => {
    const key = ($('#s-az-key') || {}).value || '', region = ($('#s-az-region') || {}).value || '';
    if (!key.trim() && !AZ.hasKey) return toast('Paste your Speech key first.');
    try { await window.vt.azureSet(key, region); await loadAzure(); toast(key.trim() ? 'Key saved. Pick an online voice under Sound.' : 'Region saved.'); render(); }
    catch (e) { toast(String(e && e.message ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); }
  },
  'az-test': async () => {
    toast('Asking Azure...'); const r = await window.vt.azureTest(); await loadAzure(); render();
    if (r.ok) toast('Azure works. 🎉'); else toast({ auth: 'Azure did not accept the key or region. Check both.', limit: 'The free characters are used up (or you are going too fast).', network: 'Could not reach Azure. Is the internet on?' }[r.code] || 'Azure did not answer (' + r.message + ').');
  },
  'az-clear': async () => { await window.vt.azureClear(); await loadAzure(); if ((S.settings.voice || '').startsWith('azure:')) { S.settings.voice = ''; save(); } toast('Key removed.'); render(); },
  'hk-set': (el) => { ui.hkCapture = ui.hkCapture === el.dataset.v ? '' : el.dataset.v; render(); },
  'hk-reset': () => { delete S.settings.keys; ui.hkCapture = ''; save(); toast('Shortcuts are back to the usual keys.'); render(); },
  'voice-test': () => { const v = $('#s-voice'); if (v) S.settings.voice = v.value; S.settings.rate = +$('#s-rate').value || 0.9; speak(helloText('! Welkom bij BiggTaal. Veel plezier met leren!')); },
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
  if (ui.hkCapture) { // Settings is waiting for the new key of a shortcut
    e.preventDefault(); e.stopPropagation(); const k = keyOf(e), act = ui.hkCapture;
    if (['shift', 'control', 'alt', 'meta', 'altgraph', 'capslock'].includes(k)) return;
    if (k === 'escape') { ui.hkCapture = ''; return render(); }
    if (['enter', 'tab'].includes(k)) return toast('Enter and Tab are kept for other things. Pick another key.');
    const keys = (S.settings.keys = Object.assign({}, hotkeys())), other = Object.keys(keys).find((x) => x !== act && keys[x] === k);
    if (other) { keys[other] = keys[act]; toast(keyLabel(k) + ' was used for "' + HOTKEY_DEFS.find((d) => d[0] === other)[1] + '", so the two keys swapped.'); }
    keys[act] = k; ui.hkCapture = ''; save(); return render();
  }
  if ((ui.view === 'cards' && ['typed', 'copy', 'ph-in', 'ph-copy'].includes(e.target.id)) || (ui.view === 'bonus' && e.target.id === 'geo-in')) { // while the typing box has focus: the skip key (or Esc) = I don't know, the hint key = hint
    const hk = hotkeys(), k = keyOf(e), plain = !e.ctrlKey && !e.altKey && !e.metaKey;
    const hit = (key) => (/^\p{L}$/u.test(key) ? e.ctrlKey && !e.altKey && k === key : plain && k === key); // a letter needs Ctrl, or it would be typed
    if (e.key === 'Escape' || hit(hk.skip)) { e.preventDefault(); ACT[{ typed: 'skip', copy: 'copy-skip', 'ph-in': 'ph-skip', 'ph-copy': 'ph-copy-skip', 'geo-in': 'geo-skip' }[e.target.id]](); return; }
    if (hit(hk.hint)) { const b = document.querySelector('[data-act="fc-hint"],[data-act="ph-hint"],[data-act="geo-hint"]'); if (b) { e.preventDefault(); b.click(); } return; }
  }
  if (e.key === ' ' && e.target.id === 'typed' && ui.view === 'cards' && ui.cards && spaceChecks(curCard()) && e.target.value.trim()) { e.preventDefault(); checkTyped(); return; } // a one-word answer: Space checks
  if (e.key === ' ' && e.target.id === 'ph-in' && typeof phSpace === 'function' && phSpace() && e.target.value.trim()) { e.preventDefault(); ACT['ph-check'](); return; } // a one-word fill the blank answer: Space checks
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.key === 'Enter' && e.target.id === 'copy') { e.preventDefault(); copyContinue(false); return; }
  if (e.key === 'Enter' && e.target.id === 'typed') { e.preventDefault(); ui.view === 'cards' ? checkTyped() : listenCheck(); return; }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter) { ACT[e.target.dataset.enter](); return; }
  if (inField) return;
  if (ui.view === 'cards' && ui.cards && curCard() && ui.cards.phase !== 'miss') {
    const c = ui.cards, hk = hotkeys(), k = keyOf(e);
    if (!c.flipped && (k === hk.flip || e.key === 'Enter') && cardPrefs().mode === 'flip') { e.preventDefault(); ACT.flip(); }
    else if (c.flipped && (k === hk.again || k === hk.good || k === hk.easy)) { e.preventDefault(); gradeCard(k === hk.again ? 'again' : k === hk.good ? 'good' : 'easy'); }
    else if (c.flipped && e.key === 'Enter') { e.preventDefault(); gradeCard(c.res === 'wrong' ? 'again' : 'good'); }
    else if (k === hk.skip && !c.flipped && document.querySelector('[data-act="skip"]')) { e.preventDefault(); ACT.skip(); }
    else if (k === hk.speak) { const w = curCard().w; speak((w.article ? w.article + ' ' : '') + w.nl); }
    else if (k === hk.hint && !c.flipped) { const b = document.querySelector('[data-act="fc-hint"]'); if (b) { e.preventDefault(); b.click(); } }
  } else if (ui.view === 'listen' && ui.listen) {
    if (e.key === 'Enter' && ui.listen.res) { e.preventDefault(); ACT['listen-next'](); } else if (keyOf(e) === hotkeys().speak) listenSay();
  }
});

load().then(loadPiper).then(() => (document.readyState === 'loading' ? new Promise((r) => document.addEventListener('DOMContentLoaded', r)) : 0)).then(async () => { // wait until every script has run
  if (window.vt && window.vt.version) {
    try { APPV = await window.vt.version(); UPD = await window.vt.updateState(); } catch {}
    if (window.vt.onAzureProblem) window.vt.onAzureProblem((code) => {
      toast({ auth: 'Azure did not accept the key, so a built-in voice is reading for now. Check it in Settings.', limit: 'The free online-voice characters for this month are used up, so a built-in voice is reading until next month.', network: 'Could not reach Azure (no internet?), so a built-in voice is reading for now.' }[code] || 'The online voice did not work just now, so a built-in voice is reading.');
      loadAzure().then(() => { if (ui.view === 'settings') render(); });
    });
    window.vt.onUpdate((s) => {
      UPD = s;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if ((ui.view === 'home' || ui.view === 'settings') && !typing) render();
    });
  }
  render(); if (typeof checkEarned === 'function') checkEarned();
});
