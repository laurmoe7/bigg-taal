// Sentence builder (a tab on the Grammar page): a real Dutch sentence cut into word tiles, which you put back in order from the English.
// The first word is given, so the job is where the verbs (and the rest) go. Sentences come from the explainer's pattern pools (explain.js),
// preferring ones with your own words; mistakes are explained with the explainer's findings. Grading: L.sbGrade (logic.js).

const SB_PATS = [['all', 'Mixed'], ['inversion', 'After a time word'], ['question', 'Questions'], ['modal', 'Modal verbs'], ['perfect', 'Perfect tense'], ['separable', 'Separable verbs'], ['coord', 'want / maar / dus'], ['subordinate', 'Subordinate clauses']];
const SB_LINES = {
  right: ['Perfect! Every word in its place. 🌸', 'Yes! That is exactly it! 💗', 'Goed zo! Bigg is impressed. ✨'],
  close: ['The verbs are in the right place! Only some other words moved.', 'So close! The grammar is right, a few other words are in a different spot.'],
  wrong: ['Not quite. Look where the verbs go:', 'Almost! Here is how it really goes:'],
};
const sb = (ui.sb = ui.sb || { pat: 'all', cur: null, ans: [], bank: [], res: null, bad: [], hint: 0, retry: false, n: 0, good: 0, recent: [] });
const sbStats = () => (S.sb = S.sb || {});
let sbMine = { n: -1, set: new Set() };
const sbMyForms = () => { // every form of the words you are learning, to find sentences that use them
  const live = liveWords(); if (sbMine.n === live.length) return sbMine.set;
  const set = new Set(); live.forEach((w) => L.wordForms(w.nl.replace(/^(de|het|een|zich)\s+/i, ''), w.pos).forEach((f) => set.add(f.toLowerCase())));
  return (sbMine = { n: live.length, set }).set;
};

function sbNext() {
  const st = sxState, pool = sb.pat === 'all' ? [].concat(...Object.values(st.pools)) : st.pools[sb.pat] || [];
  sb.res = null; sb.bad = []; sb.hint = 0; sb.retry = false;
  if (!pool.length) { sb.cur = null; return; }
  const mine = sbMyForms(); let best = null, bestScore = -1;
  for (const i of L.pick(pool, Math.min(pool.length, 40))) { // the best of a few random ones: short enough to build, not seen lately, with your words
    const pair = SENTENCES[i], r = sxExplain(pair[0]); if (!r || r.words.length < 4 || r.words.length > 10) continue;
    if (sb.pat !== 'all' && !r.pats.includes(sb.pat)) continue;
    const seen = sb.recent.indexOf(i), score = r.words.filter((w) => mine.has(w.toLowerCase())).length + Math.random() - (seen >= 0 ? 100 - seen : 0); // one seen lately only when nothing else fits, the oldest first
    if (score > bestScore) { best = { i, nl: pair[0], en: pair[1], r }; bestScore = score; }
  }
  sb.cur = best; if (!best) return;
  sb.recent = [best.i, ...sb.recent].slice(0, 30);
  sb.ans = [0]; sb.bank = L.shuffle(best.r.words.map((_, k) => k).slice(1));
  if (best.r.words.length > 2 && sb.bank.every((k, j) => k === j + 1)) sb.bank.reverse(); // never hand it over already in order
}
const sbWords = (idx) => idx.map((k) => sb.cur.r.words[k]);
const sbEnd = (c) => (c.nl.trim().match(/[.?!]+$/) || ['.'])[0];

function sbView() {
  const st = sxState; if (!st.ready && !st.loading) sxInit();
  if (!sb.cur && Object.values(st.pools).some((a) => a.length)) sbNext();
  const stats = sbStats();
  const chips = SB_PATS.map(([id, name]) => { const s = stats[id]; return `<button class="chip ${sb.pat === id ? 'on' : ''}" data-act="sb-pat" data-v="${id}">${sb.pat === id ? '✓ ' : ''}${esc(name)}${s && s.n ? ` <small>${s.ok}/${s.n}</small>` : ''}</button>`; }).join('');
  const c = sb.cur;
  if (!c) return `<div class="chips2" style="margin-bottom:12px">${chips}</div><div class="card"><p class="muted" style="margin:0">${st.ready ? 'No sentences found for that pattern yet. Try another one.' : 'Finding sentences for you... 🔍'}</p></div>`;
  const done = !!sb.res, full = !sb.bank.length;
  const tile = (k, pos, where) => {
    const role = done && !sb.bad.includes(pos) && c.r.roles[pos]; // after checking, the words in the right place get their grammar colour
    const cls = where !== 'ans' ? '' : role ? 'role rl-' + role : pos === 0 ? 'pinned' : done ? (sb.bad.includes(pos) ? 'bad' : 'ok') : '';
    const act = done || (where === 'ans' && pos === 0) ? '' : `data-act="sb-${where === 'ans' ? 'out' : 'in'}" data-v="${pos}"`;
    return `<button class="sb-tile ${cls}" ${act} ${act ? '' : 'tabindex="-1"'}>${esc(c.r.words[k])}</button>`;
  };
  const line = `<div class="sb-line ${done ? 'sb-' + sb.res : ''}">${sb.ans.map((k, p) => tile(k, p, 'ans')).join('')}${full ? `<span class="sb-end">${esc(sbEnd(c))}</span>` : '<span class="sb-gap"></span>'}</div>`;
  const bank = done ? '' : `<div class="sb-bank">${sb.bank.map((k, p) => tile(k, p, 'bank')).join('') || '<span class="muted">All words placed. Check it!</span>'}</div>`;
  let foot;
  if (!done) foot = `<div class="row" style="margin-top:14px"><button class="primary" data-act="sb-check" ${full ? 'data-focus' : 'disabled'}>Check</button><button class="ghost" data-act="sb-hint">💡 Hint</button><button class="ghost" data-act="sb-reset">↺ Start over</button><button class="ghost" data-act="sb-skip">Skip</button></div>`;
  else {
    const used = [...new Set(Object.values(c.r.roles))];
    foot = `<div class="sb-result"><b>${esc(sb.say || '')}</b>${sb.hint && sb.res === 'right' ? ' <span class="muted">(with a hint)</span>' : ''}
      ${sb.res === 'right' ? '' : `<div class="sx-sentence sb-real">${sxSentenceHtml(c)}</div>`}
      <div class="row" style="margin:6px 0 2px"><button class="ghost mini" data-act="say" data-t="${esc(c.nl)}" title="Hear it">🔊</button><div class="sx-legend" style="margin:0">${used.map((r) => `<span><i class="rl-dot rl-${r}"></i>${esc(SX_ROLE[r])}</span>`).join('')}</div></div>
      ${c.r.findings.map((f, n) => `<details class="sx-find" ${sb.res === 'right' ? '' : 'open'}><summary><h3><span class="sx-n">${n + 1}</span> ${esc(f.title)}</h3></summary><ul>${f.bullets.map((b) => `<li>${b}</li>`).join('')}</ul></details>`).join('')}
      <div class="row" style="margin-top:14px"><button class="primary" data-act="sb-next" data-focus>Next sentence ➜</button>${sb.res === 'right' ? '' : '<button class="ghost" data-act="sb-retry">↺ Try it again</button>'}</div></div>`;
  }
  return `<div class="chips2" style="margin-bottom:12px">${chips}</div>
    <div class="card sb-card"><div class="sb-head"><span class="muted">Put the words in the right order. The first word is given.</span>${sb.n ? `<span class="pill ${sb.good === sb.n ? 'mint' : 'sky'}">${sb.good} / ${sb.n} right</span>` : ''}</div>
      <div class="sb-en">${esc(c.en || '')}</div>${line}${bank}${foot}</div>`;
}

function sbCheck() {
  const c = sb.cur; if (!c || sb.res || sb.bank.length) return;
  const g = L.sbGrade(c.r.words, sbWords(sb.ans), c.r.roles);
  sb.res = g.res; sb.bad = g.bad; sb.say = g.alt ? 'Right! The sentence says "' + c.nl.replace(/[.?!]+$/, '') + '", but both orders of the verbs at the end are good Dutch. 🌸' : rnd(SB_LINES[g.res]);
  if (!sb.retry) { // only the first try counts
    sb.n++; if (g.res === 'right') sb.good++;
    const s = sbStats(), add = (id) => { const x = (s[id] = s[id] || { ok: 0, n: 0 }); x.n++; if (g.res === 'right') x.ok++; };
    add('all'); c.r.pats.forEach(add);
    gainXp(g.res === 'right' ? (sb.hint ? 8 : XP.itemRight) : g.res === 'close' ? XP.itemClose : XP.itemWrong); save();
  }
  chime(g.res === 'wrong' ? 'bad' : 'ok');
  render();
}
Object.assign(ACT, {
  'sb-pat': (el) => { sb.pat = el.dataset.v; sbNext(); render(); },
  'sb-in': (el) => { if (sb.res) return; sb.ans.push(sb.bank.splice(+el.dataset.v, 1)[0]); render(); },
  'sb-out': (el) => { const p = +el.dataset.v; if (sb.res || p === 0) return; sb.bank.push(sb.ans.splice(p, 1)[0]); render(); },
  'sb-reset': () => { if (sb.res) return; sb.bank.push(...sb.ans.splice(1)); render(); },
  'sb-hint': () => { // keep the words that are right so far, put the rest back and add the next one
    const c = sb.cur; if (!c || sb.res) return;
    const keep = Math.max(1, L.sbPrefix(c.r.words, sbWords(sb.ans))); sb.bank.push(...sb.ans.splice(keep));
    const want = c.r.words[keep], j = sb.bank.findIndex((k) => c.r.words[k].toLowerCase() === String(want).toLowerCase());
    if (j >= 0) sb.ans.push(sb.bank.splice(j, 1)[0]);
    sb.hint++; render();
  },
  'sb-check': sbCheck,
  'sb-skip': () => { sbNext(); render(); },
  'sb-next': () => { sbNext(); render(); },
  'sb-retry': () => { sb.bank = L.shuffle(sb.ans.splice(1)); sb.res = null; sb.bad = []; sb.retry = true; render(); },
});
