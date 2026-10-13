// Levels: you earn XP for every bit of practice, and Bigg celebrates each level you reach. Replaces the old streak counter.
// Loads after app.js and shares its scope.

// Dutch level names (with a small English hint), growing like Bigg's sprout
const LEVEL_NAMES = L.LEVEL_TITLES;
const levelNow = () => L.levelInfo(S.xp || 0);

// start new saves from what you have already done (so nobody begins at level 1 after weeks of practice)
function initXp() {
  if (S.xp == null || isNaN(S.xp) || S.xpV !== 3) { S.xp = L.xpFromHistory(S.log, liveWords()); S.xpV = 3; save(); } // v3: 99 levels like RuneScape
}

// ---------- earning XP ----------
function gainXp(n, why) {
  n = Math.round(n); if (!n || !S || S.xp == null) return;
  const before = L.levelInfo(S.xp);
  S.xp += n; L.bump(S.log, today(), 'xp', n);
  const after = L.levelInfo(S.xp);
  paintXp(); xpPop(n);
  if (after.level > before.level) levelUp(after);
  save();
}
// the XP bar in the sidebar and on the Today page change in place (no redraw, so nothing flashes)
function paintXp() {
  const info = levelNow();
  const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  set('xpfill', (e) => { e.style.width = info.pct + '%'; });
  set('xpsub', (e) => { e.textContent = L.xpText(info); });
  set('xphome', (e) => { e.style.width = info.pct + '%'; });
  set('xphome-sub', (e) => { e.textContent = homeSub(info); });
  set('lvgraph', (e) => { e.innerHTML = lvGraph(); }); set('lvcap', (e) => { e.textContent = lvCaption(); });
  set('xptoday', (e) => { e.textContent = '+' + ((S.log[today()] || {}).xp || 0) + ' XP today'; });
  if (ui.sideLevel !== info.level) { ui.sideSig = ''; renderSide(); ui.sideLevel = info.level; }
}
function xpPop(n) {
  const el = document.createElement('div'); el.className = 'xp-pop'; el.textContent = '+' + n + ' XP';
  el.style.left = 24 + Math.random() * 90 + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}
// a big happy moment
function levelUp(info) {
  if (typeof checkEarned === 'function') setTimeout(checkEarned, 700); // level hats
  chime('goal'); confetti();
  const old = document.querySelector('.lvlup'); if (old) old.remove();
  const name = info.title;
  const box = document.createElement('div'); box.className = 'lvlup';
  box.innerHTML = `<div class="lvl-card">${pigSvg('happy', 'pig-md act-cheer', { stage: 3, card: false })}
    <div class="lvl-big">Level ${info.level}!</div><div class="lvl-name">${esc(name[0])} <small>${esc(name[1])}</small></div>
    <p class="muted" style="margin:6px 0 12px">${esc(info.level === 99 ? 'MAX LEVEL! You are a language legend! I am the proudest pig in the world! 👑' : info.level === 92 ? 'Level 92 is halfway to 99 in XP! What an amazing journey! 🌟' : rnd(LEVEL_SAYS))}</p><button class="primary" data-act="lvl-ok">Yay! 🎉</button></div>`;
  document.body.appendChild(box);
  setTimeout(() => { if (box.isConnected) box.remove(); }, 6500);
  ui.say = '';
}
const homeSub = (info) => (info.max ? 'Max level reached! 👑' : (info.need - info.into).toLocaleString() + ' XP to level ' + (info.level + 1));
const LEVEL_SAYS = ['I am doing a happy dance! You worked so hard! 💗', 'Look how far you have come! I am so proud of you! 🌟', 'Your Dutch is growing, just like my sprout! 🌱', 'You are amazing! Keep going, I am right here! ✨', 'A new level! I knew you could do it! 🎉'];
Object.assign(ACT, { 'lvl-ok': () => { const b = document.querySelector('.lvlup'); if (b) b.remove(); } });
document.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('lvlup')) e.target.remove(); });

// ---------- where the XP comes from ----------
// (called from the places where you practise: gradeCard, finishListen, recordResult, and so on)
const XP = { cardAgain: 3, cardGood: 10, cardEasy: 12, listenRight: 12, listenClose: 8, listenWrong: 3, itemRight: 10, itemClose: 7, itemPartly: 5, itemWrong: 3, session: 20, sheet: 25, goal: 50, addWord: 3, readAdd: 5 };

// ---------- the Today page card ----------
// The road to level 99: the XP curve with the part you have climbed filled in, a dot where you are, and a line at halfway (level 92).
function lvGraph() {
  const info = levelNow(), xp = S.xp || 0, top = L.XP_TO[99], W = 300, H = 104, pl = 6, pr = 8, pt = 8, pb = 16;
  const X = (n) => pl + ((n - 1) / 98) * (W - pl - pr), Y = (v) => H - pb - (v / top) * (H - pb - pt), f = (n) => n.toFixed(1);
  const pts = Array.from({ length: 99 }, (_, i) => [X(i + 1), Y(L.XP_TO[i + 1])]);
  const done = pts.slice(0, info.level); if (!info.max) done.push([X(info.level + info.into / info.need), Y(xp)]);
  const me = done[done.length - 1], base = H - pb, half = Y(L.XP_TO[92]);
  const path = (a) => a.map((p, i) => (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Your progress towards level 99"><defs><linearGradient id="lvgA" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--pink)"/><stop offset="1" style="stop-color:var(--mint)"/></linearGradient></defs>
    <path d="${path(pts)} L${f(X(99))} ${base} L${f(X(1))} ${base} Z" fill="#ffffff0b"/>
    <path d="${path(done)} L${f(me[0])} ${base} L${f(X(1))} ${base} Z" fill="url(#lvgA)" opacity=".4"/>
    <line x1="${f(pl)}" x2="${f(W - pr)}" y1="${f(half)}" y2="${f(half)}" stroke="#ffffff30" stroke-dasharray="3 4"/><text x="${f(pl + 2)}" y="${f(half - 3)}" font-size="8.5" fill="#ffffff80" font-weight="700">level 92 is halfway</text>
    <path d="${path(pts)}" fill="none" stroke="#ffffff30" stroke-width="2" stroke-linejoin="round"/><path d="${path(done)}" fill="none" stroke="url(#lvgA)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${f(me[0])}" x2="${f(me[0])}" y1="${f(me[1])}" y2="${base}" stroke="#ffffff55" stroke-dasharray="2 3"/><circle cx="${f(me[0])}" cy="${f(me[1])}" r="5.2" fill="#fff" opacity=".25"/><circle cx="${f(me[0])}" cy="${f(me[1])}" r="3.4" fill="#fff" style="stroke:var(--pink)" stroke-width="1.6"/>
    <g font-size="9" font-weight="800" fill="#ffffff90"><text x="${f(X(1))}" y="${H - 3}" text-anchor="start">Lv 1</text><text x="${f(Math.min(Math.max(me[0], 40), W - 60))}" y="${H - 3}" text-anchor="middle" fill="#fff">Lv ${info.level}</text><text x="${f(X(99))}" y="${H - 3}" text-anchor="end">Lv 99</text></g></svg>`;
}
const lvCaption = () => { const xp = S.xp || 0, top = L.XP_TO[99], pct = Math.min(100, (xp / top) * 100); return (pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '% of the way to level 99 · ' + Math.max(0, top - xp).toLocaleString() + ' XP to go'; };
function levelCard() {
  const info = levelNow(), t = (S.log[today()] || {}).xp || 0;
  return `<div class="card"><h2>⭐ Your level</h2>
    <div class="lvl-line"><b class="lvl-num">Level ${info.level}</b><span class="lvl-title">${esc(info.title[0])} <small class="muted">${esc(info.title[1])}</small></span></div>
    <div class="bar" style="margin:10px 0 6px"><i id="xphome" style="width:${info.pct}%"></i></div>
    <div class="muted" style="font-size:13px"><span id="xphome-sub">${homeSub(info)}</span> · <span id="xptoday">+${t} XP today</span></div>
    <div class="lvgraph" id="lvgraph">${lvGraph()}</div><div class="muted lvcap" id="lvcap">${lvCaption()}</div></div>`;
}
// if the saved data finished loading before this file ran, set up XP now (otherwise load() in app.js does it)
if (typeof S !== 'undefined' && S && S.settings) { initXp(); if (typeof render === 'function' && ui.view) render(); }

Object.assign(ACT, {
  'dev-level': () => { const n = Math.max(2, Math.min(99, +readField('dev-lv') || 2)); levelUp(L.levelInfo(L.XP_TO[n])); },
});
