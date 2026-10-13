// Verb trainer (a tab on the Grammar page): drills on the past tense, the past participle and hebben/zijn.
// Verbs come from a built-in list of the irregular verbs every learner needs, a list of regular verbs ('t kofschip) and the verbs in your own
// word list (read from the dictionary). The ones you miss come back more often. Loads after app.js and shares its scope.

// [infinitive, meaning, past singular (| alternative), past plural (| alternative), past participle, hebben or zijn]
const VERBS_IRREG = [
  ['zijn', 'to be', 'was', 'waren', 'geweest', 'zijn'], ['hebben', 'to have', 'had', 'hadden', 'gehad', 'hebben'], ['worden', 'to become', 'werd', 'werden', 'geworden', 'zijn'],
  ['gaan', 'to go', 'ging', 'gingen', 'gegaan', 'zijn'], ['komen', 'to come', 'kwam', 'kwamen', 'gekomen', 'zijn'], ['zien', 'to see', 'zag', 'zagen', 'gezien', 'hebben'],
  ['doen', 'to do', 'deed', 'deden', 'gedaan', 'hebben'], ['kunnen', 'can, to be able', 'kon', 'konden', 'gekund', 'hebben'], ['willen', 'to want', 'wilde|wou', 'wilden|wouden', 'gewild', 'hebben'],
  ['moeten', 'must, to have to', 'moest', 'moesten', 'gemoeten', 'hebben'], ['mogen', 'may, to be allowed', 'mocht', 'mochten', 'gemogen', 'hebben'], ['weten', 'to know (a fact)', 'wist', 'wisten', 'geweten', 'hebben'],
  ['geven', 'to give', 'gaf', 'gaven', 'gegeven', 'hebben'], ['nemen', 'to take', 'nam', 'namen', 'genomen', 'hebben'], ['staan', 'to stand', 'stond', 'stonden', 'gestaan', 'hebben'],
  ['liggen', 'to lie (be lying)', 'lag', 'lagen', 'gelegen', 'hebben'], ['zitten', 'to sit', 'zat', 'zaten', 'gezeten', 'hebben'], ['spreken', 'to speak', 'sprak', 'spraken', 'gesproken', 'hebben'],
  ['schrijven', 'to write', 'schreef', 'schreven', 'geschreven', 'hebben'], ['lezen', 'to read', 'las', 'lazen', 'gelezen', 'hebben'], ['vinden', 'to find', 'vond', 'vonden', 'gevonden', 'hebben'],
  ['denken', 'to think', 'dacht', 'dachten', 'gedacht', 'hebben'], ['brengen', 'to bring', 'bracht', 'brachten', 'gebracht', 'hebben'], ['kopen', 'to buy', 'kocht', 'kochten', 'gekocht', 'hebben'],
  ['zoeken', 'to look for', 'zocht', 'zochten', 'gezocht', 'hebben'], ['blijven', 'to stay', 'bleef', 'bleven', 'gebleven', 'zijn'], ['beginnen', 'to begin', 'begon', 'begonnen', 'begonnen', 'zijn'],
  ['helpen', 'to help', 'hielp', 'hielpen', 'geholpen', 'hebben'], ['kiezen', 'to choose', 'koos', 'kozen', 'gekozen', 'hebben'], ['slapen', 'to sleep', 'sliep', 'sliepen', 'geslapen', 'hebben'],
  ['eten', 'to eat', 'at', 'aten', 'gegeten', 'hebben'], ['drinken', 'to drink', 'dronk', 'dronken', 'gedronken', 'hebben'], ['vallen', 'to fall', 'viel', 'vielen', 'gevallen', 'zijn'],
  ['houden', 'to hold, to keep', 'hield', 'hielden', 'gehouden', 'hebben'], ['krijgen', 'to get', 'kreeg', 'kregen', 'gekregen', 'hebben'], ['laten', 'to let, to leave', 'liet', 'lieten', 'gelaten', 'hebben'],
  ['heten', 'to be called', 'heette', 'heetten', 'geheten', 'hebben'], ['trekken', 'to pull', 'trok', 'trokken', 'getrokken', 'hebben'], ['winnen', 'to win', 'won', 'wonnen', 'gewonnen', 'hebben'],
  ['verliezen', 'to lose', 'verloor', 'verloren', 'verloren', 'hebben'], ['begrijpen', 'to understand', 'begreep', 'begrepen', 'begrepen', 'hebben'], ['breken', 'to break', 'brak', 'braken', 'gebroken', 'hebben'],
  ['bieden', 'to offer', 'bood', 'boden', 'geboden', 'hebben'], ['slaan', 'to hit', 'sloeg', 'sloegen', 'geslagen', 'hebben'], ['sluiten', 'to close', 'sloot', 'sloten', 'gesloten', 'hebben'],
  ['vragen', 'to ask', 'vroeg', 'vroegen', 'gevraagd', 'hebben'], ['roepen', 'to call out', 'riep', 'riepen', 'geroepen', 'hebben'], ['bestaan', 'to exist', 'bestond', 'bestonden', 'bestaan', 'hebben'],
  ['ontvangen', 'to receive', 'ontving', 'ontvingen', 'ontvangen', 'hebben'],
];
const VERBS_REG = [
  ['werken', 'to work', 'werkte', 'werkten', 'gewerkt', 'hebben'], ['maken', 'to make', 'maakte', 'maakten', 'gemaakt', 'hebben'], ['spelen', 'to play', 'speelde', 'speelden', 'gespeeld', 'hebben'],
  ['wonen', 'to live (somewhere)', 'woonde', 'woonden', 'gewoond', 'hebben'], ['leren', 'to learn', 'leerde', 'leerden', 'geleerd', 'hebben'], ['horen', 'to hear', 'hoorde', 'hoorden', 'gehoord', 'hebben'],
  ['bellen', 'to call (phone)', 'belde', 'belden', 'gebeld', 'hebben'], ['praten', 'to talk', 'praatte', 'praatten', 'gepraat', 'hebben'], ['reizen', 'to travel', 'reisde', 'reisden', 'gereisd', 'zijn'],
  ['fietsen', 'to cycle', 'fietste', 'fietsten', 'gefietst', 'hebben'], ['koken', 'to cook', 'kookte', 'kookten', 'gekookt', 'hebben'], ['wachten', 'to wait', 'wachtte', 'wachtten', 'gewacht', 'hebben'],
  ['leven', 'to live (be alive)', 'leefde', 'leefden', 'geleefd', 'hebben'], ['ontmoeten', 'to meet', 'ontmoette', 'ontmoetten', 'ontmoet', 'hebben'], ['studeren', 'to study', 'studeerde', 'studeerden', 'gestudeerd', 'hebben'],
  ['bestellen', 'to order', 'bestelde', 'bestelden', 'besteld', 'hebben'], ['proberen', 'to try', 'probeerde', 'probeerden', 'geprobeerd', 'hebben'], ['verhuizen', 'to move house', 'verhuisde', 'verhuisden', 'verhuisd', 'zijn'],
];
const vtVerb = (a, reg) => ({ inf: a[0], en: a[1], past: a[2], pl: a[3], part: a[4], aux: a[5], reg });
const VT_POOLS = [['irreg', 'Irregular verbs'], ['reg', "Regular verbs ('t kofschip)"], ['mine', 'Verbs from my words'], ['all', 'Everything']];
const VT_FOCUS = [['mixed', 'A mix'], ['past', 'Past tense'], ['part', 'Past participle'], ['aux', 'Hebben or zijn?']];
const vtState = (ui.vt = ui.vt || { screen: 'start', pool: 'irreg', focus: 'mixed', n: 10, items: [], i: 0, res: null, typed: '', right: 0 });
const vtStats = () => (S.verbs = S.verbs || {});
const vtNorm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const vtParts = (v) => `<b>${esc(v.inf)}</b> – ${esc(v.past.split('|')[0])}${v.pl ? ' / ' + esc(v.pl.split('|')[0]) : ''} – ${esc(v.part)} ${v.aux ? ` <span class="muted">(${esc(v.aux)})</span>` : ''}`;

// the verbs in your own list, with their forms from the dictionary (past tense, participle, hebben or zijn)
async function vtMyVerbs() {
  try { await loadData('dict'); } catch { return []; }
  const out = [], seen = new Set();
  for (const w of liveWords()) {
    const nl = w.nl.toLowerCase().replace(/^(zich|te)\s+/, '').trim(); if (seen.has(nl) || !/en$/.test(nl) || L.sepSplit(nl)) continue; // separable verbs split in a sentence, so they are left out
    const e = (dictIndex().forms.get(nl) || []).map((i) => DICT[i]).find((x) => x[1] === 'v' && x[0].toLowerCase() === nl); if (!e || !e[3]) continue;
    const f = e[3].split(','); if (f.length < 2 || !f[0] || !f[1] || /\s/.test(f[0])) continue;
    const aux = /zijn/.test(f[2] || '') && !/hebben/.test(f[2] || '') ? 'zijn' : /hebben/.test(f[2] || '') && !/zijn/.test(f[2] || '') ? 'hebben' : ''; // both, or unknown: not asked
    seen.add(nl); out.push({ inf: nl, en: w.en || e[4].split(';')[0], past: f[0], pl: '', part: f[1], aux, reg: false, mine: true });
  }
  return out;
}
async function vtPool(pool) {
  const irreg = VERBS_IRREG.map((a) => vtVerb(a, false)), reg = VERBS_REG.map((a) => vtVerb(a, true));
  if (pool === 'irreg') return irreg; if (pool === 'reg') return reg;
  const mine = await vtMyVerbs();
  return pool === 'mine' ? mine : irreg.concat(reg, mine);
}
// one question per verb: the ones you miss most are picked first
function vtBuild(verbs, focus, n) {
  const st = vtStats(), score = (v) => ((st[v.inf] || {}).bad || 0) * 2 - ((st[v.inf] || {}).ok || 0) + Math.random() * 2.5;
  const picked = verbs.slice().sort((a, b) => score(b) - score(a)).slice(0, n);
  return L.shuffle(picked).map((v) => {
    const kinds = ['past', 'part']; if (v.aux) kinds.push('aux'); if (v.pl) kinds.push('plural');
    const kind = focus === 'mixed' || (focus === 'aux' && !v.aux) ? kinds[Math.floor(Math.random() * kinds.length)] : focus;
    return { v, kind: kind === 'past' && v.pl && Math.random() < 0.3 ? 'plural' : kind };
  });
}
function vtAnswers(it) { const v = it.v; return (it.kind === 'past' ? v.past : it.kind === 'plural' ? v.pl : it.kind === 'aux' ? v.aux : v.part).split('|').map(vtNorm); }
function vtQuestion(it) {
  const v = it.v;
  return { past: ['Past tense, ik', `ik <span class="vt-gap">___</span>`], plural: ['Past tense, wij', `wij <span class="vt-gap">___</span>`], part: ['Past participle', `ik heb/ben <span class="vt-gap">___</span>`], aux: ['Which helping verb?', `ik <span class="vt-gap">___</span> ${esc(v.part)}`] }[it.kind];
}
function vtView() {
  const s = vtState;
  if (s.screen === 'q') {
    const it = s.items[s.i], v = it.v, [label, line] = vtQuestion(it), done = !!s.res;
    const note = done && v.reg ? `<p class="muted vt-note">'t kofschip: the stem of <b>${esc(v.inf)}</b> ends in <b>${esc(L.kofschip(v.inf).letter)}</b>, so the endings are <b>-${L.kofschip(v.inf).suffix}</b> (past) and <b>-${L.kofschip(v.inf).suffix === 'te' ? 't' : 'd'}</b> (participle).</p>` : '';
    const input = it.kind === 'aux' ? `<div class="opts">${['hebben', 'zijn'].map((o) => `<button class="${done && vtAnswers(it).includes(o) ? 'ok' : done && s.typed === o ? 'no' : ''}" data-act="vt-pick" data-v="${o}" ${done ? 'disabled' : ''}>${o}</button>`).join('')}</div>`
      : `<input type="text" class="big-in" id="vt-in" data-focus data-enter="vt-submit" autocomplete="off" spellcheck="false" placeholder="Type it..." value="${esc(s.typed)}" ${done ? 'disabled' : ''}>`;
    return `<div class="top"><div><h1>Verb trainer</h1><p class="sub">Question ${s.i + 1} of ${s.items.length}</p></div></div>
      <div class="card vt-card"><div class="bar" style="margin-bottom:14px"><i style="width:${Math.round((s.i / s.items.length) * 100)}%"></i></div>
        <div class="vt-label">${esc(label)}</div><div class="vt-verb">${esc(v.inf)}</div><div class="muted" style="margin:-2px 0 10px">${esc(v.en)}</div><div class="vt-line">${line}</div>${input}
        ${done ? `<div class="verdict ${s.res}"><div class="v-head"><b class="v-title">${s.res === 'right' ? '✓ Right!' : '✗ Not quite'}</b></div>${s.res === 'wrong' ? `<div class="v-row"><span class="v-label">Answer</span><div class="v-text ans">${esc(vtAnswers(it).join(' or '))}</div></div>` : ''}<div class="v-row"><span class="v-label">All forms</span><div class="v-text">${vtParts(v)}${v.pl ? '' : ''}</div></div></div>${note}` : ''}
        <div class="row" style="margin-top:14px">${done ? `<button class="primary" data-act="vt-next">${s.i + 1 >= s.items.length ? 'See my results' : 'Next'} ➜</button><span class="muted">or press Enter</span>` : it.kind === 'aux' ? '' : '<button class="primary" data-act="vt-submit">Check</button><button class="ghost" data-act="vt-skip">I do not know</button>'}</div></div>`;
  }
  if (s.screen === 'done') {
    const missed = s.items.filter((x) => x.bad);
    return `<div class="top"><div><h1>Verb trainer</h1><p class="sub">Round finished</p></div></div><div class="card vt-card"><div class="vt-score">${s.right} <small>/ ${s.items.length}</small></div><p class="muted" style="text-align:center;margin:0 0 12px">${s.right === s.items.length ? 'Perfect! Bigg is doing a happy spin. 🎉' : s.right >= s.items.length * 0.7 ? 'Great work! 🌸' : 'These take time. They will come back so you can practise them. 💗'}</p>
      ${missed.length ? `<h3 class="dl-h">To practise</h3>${missed.map((x) => `<div class="dl-row"><div>${vtParts(x.v)}<small class="muted">${esc(x.v.en)}</small></div></div>`).join('')}` : ''}
      <div class="row" style="margin-top:14px"><button class="primary" data-act="vt-again">Practise again</button>${missed.length ? '<button class="ghost" data-act="vt-missed">Only the ones I missed</button>' : ''}<button class="ghost" data-act="vt-menu">Change what I practise</button></div></div>`;
  }
  const chip = (act, id, name, cur) => `<button class="chip ${cur === id ? 'on' : ''}" data-act="${act}" data-v="${id}">${cur === id ? '✓ ' : ''}${esc(name)}</button>`;
  return `<div class="top"><div><h1>Verb trainer</h1><p class="sub">Practise the past tense and the past participle, and learn which verbs take zijn.</p></div></div>
    <div class="card" style="max-width:760px"><h2>Which verbs?</h2><div class="chips2">${VT_POOLS.map(([id, n]) => chip('vt-pool', id, n, s.pool)).join('')}</div>
      <h2 style="margin-top:16px">What do you want to practise?</h2><div class="chips2">${VT_FOCUS.map(([id, n]) => chip('vt-focus', id, n, s.focus)).join('')}</div>
      <div class="row" style="margin-top:16px"><label class="muted">Questions <select id="vt-n">${[5, 10, 15, 20].map((n) => `<option ${s.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="primary" data-act="vt-go">▶ Start</button></div>
      <p class="muted" style="margin:10px 0 0;font-size:13px">Verbs you get wrong come back more often. Every right answer gives a little XP.</p></div>`;
}
async function vtStartRound(verbs) {
  const s = vtState; if (!verbs.length) return toast('No verbs found for that choice yet. Try another one.');
  s.items = vtBuild(verbs, s.focus, s.n); s.i = 0; s.res = null; s.typed = ''; s.right = 0; s.screen = 'q'; render();
}
function vtAnswer(typed) {
  const s = vtState, it = s.items[s.i]; if (s.res) return;
  const ok = vtAnswers(it).includes(vtNorm(typed)), st = (vtStats()[it.v.inf] = vtStats()[it.v.inf] || { ok: 0, bad: 0 });
  s.typed = typed; s.res = ok ? 'right' : 'wrong'; it.bad = !ok; if (ok) { s.right++; st.ok++; gainXp(6); chime('ok'); } else { st.bad++; gainXp(1); chime('bad'); }
  save(); render();
}
Object.assign(ACT, {
  'vt-pool': (el) => { vtState.pool = el.dataset.v; render(); },
  'vt-focus': (el) => { vtState.focus = el.dataset.v; render(); },
  'vt-go': async () => { vtState.n = +readField('vt-n') || vtState.n; await vtStartRound(await vtPool(vtState.pool)); },
  'vt-submit': () => vtAnswer(readField('vt-in')),
  'vt-skip': () => vtAnswer(''),
  'vt-pick': (el) => vtAnswer(el.dataset.v),
  'vt-next': () => { const s = vtState; if (!s.res) return; if (s.i + 1 >= s.items.length) { s.screen = 'done'; gainXp(15); chime('goal'); if (s.right === s.items.length) confetti(); } else { s.i++; s.res = null; s.typed = ''; } render(); },
  'vt-again': async () => vtStartRound(await vtPool(vtState.pool)),
  'vt-missed': () => vtStartRound(vtState.items.filter((x) => x.bad).map((x) => x.v)),
  'vt-menu': () => { vtState.screen = 'start'; render(); },
});
document.addEventListener('keydown', (e) => { // Enter goes on to the next question
  if (e.key !== 'Enter' || ui.view !== 'grammar' || ui.grTab !== 'verbs' || vtState.screen !== 'q' || !vtState.res) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.target.disabled) return;
  e.preventDefault(); ACT['vt-next']();
});
