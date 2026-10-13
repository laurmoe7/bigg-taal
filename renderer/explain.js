// Sentence explainer (a tab on the Grammar page): real Dutch sentences from the Tatoeba data, with the word-order rule behind each one.
// The reading of each sentence comes from L.explainSentence (logic.js). Loads after app.js and shares its scope.

const SX_PATS = [['all', 'All'], ['inversion', 'After a time word'], ['subordinate', 'Subordinate clauses'], ['perfect', 'Perfect tense'], ['modal', 'Modal verbs'], ['separable', 'Separable verbs'], ['question', 'Questions'], ['coord', 'want / maar / dus']];
const SX_ROLE = { verb: 'conjugated verb', subj: 'subject', time: 'first place', conj: 'conjunction', inf: 'infinitive / participle', part: 'separable prefix', q: 'question word' };
const sxState = (ui.sx = ui.sx || { pat: 'all', cur: null, showEn: false, ready: false, loading: false, pools: {}, scanned: 0 });
const sxVerbCache = new Map();
const sxFormsOf = (w) => (dictIndex().forms.get(w) || []).map((i) => DICT[i]);
const sxIsVerb = (w) => { // is this word a form of a Dutch verb (looked up in the dictionary's index of word forms)?
  if (sxVerbCache.has(w)) return sxVerbCache.get(w);
  let r = false; try { r = sxFormsOf(w).some((e) => e[1] === 'v'); } catch {}
  sxVerbCache.set(w, r); return r;
};
const sxSepCache = new Map();
const sxIsSep = (verb, part) => { // is there a real separable verb "part + verb", like op + bellen = opbellen?
  const key = verb + '|' + part; if (sxSepCache.has(key)) return sxSepCache.get(key);
  let r = ''; try { for (const v of sxFormsOf(verb).filter((x) => x[1] === 'v')) { const j = part + v[0].toLowerCase(); if (sxFormsOf(j).some((x) => x[1] === 'v' && x[0].toLowerCase() === j)) { r = j; break; } } } catch {}
  sxSepCache.set(key, r); return r;
};
const sxExplain = (nl) => L.explainSentence(nl, { isVerb: sxIsVerb, isSepVerb: sxIsSep });

// sentences that fit a pattern are collected in the background, a little at a time, so the page never freezes
async function sxInit() {
  const st = sxState; if (st.ready || st.loading) return; st.loading = true;
  try { await Promise.all([loadData('sentences'), loadData('dict')]); } catch { st.loading = false; return toast('Could not load the sentence data.'); }
  const pats = SX_PATS.slice(1).map((p) => p[0]), pools = (st.pools = {}); pats.forEach((p) => (pools[p] = []));
  const order = L.pick(Array.from({ length: SENTENCES.length }, (_, i) => i), SENTENCES.length); // shuffled
  const want = 120, limit = 14000; let at = 0;
  const step = () => {
    const t0 = performance.now();
    while (at < order.length && at < limit && performance.now() - t0 < 12) {
      const nl = SENTENCES[order[at++]][0];
      if (nl.length > 85 || !/^[A-Z]/.test(nl) || !/[.?!]$/.test(nl)) continue;
      const r = sxExplain(nl); if (r) r.pats.forEach((p) => { if (pools[p].length < want) pools[p].push(order[at - 1]); });
    }
    st.scanned = at;
    if (!st.cur && Object.values(pools).some((a) => a.length)) { sxNext(); if (ui.view === 'grammar' && ui.grTab === 'explain') render(); }
    const full = pats.every((p) => pools[p].length >= 40);
    if (at < order.length && at < limit && !(full && at > 3000)) setTimeout(step, 16); else { st.ready = true; if (ui.view === 'grammar' && ui.grTab === 'explain') { if (!st.cur) sxNext(); render(); } }
  };
  step();
}
function sxNext() {
  const st = sxState, pool = st.pat === 'all' ? [].concat(...Object.values(st.pools)) : st.pools[st.pat] || [];
  if (!pool.length) { st.cur = null; return; }
  for (let tries = 0; tries < 8; tries++) {
    const i = pool[Math.floor(Math.random() * pool.length)], pair = SENTENCES[i], r = sxExplain(pair[0]);
    if (!r) continue; if (st.pat !== 'all' && !r.pats.includes(st.pat)) continue;
    if (st.cur && st.cur.i === i && pool.length > 1) continue;
    st.cur = { i, nl: pair[0], en: pair[1], r }; st.showEn = false; return;
  }
}
function sxSentenceHtml(c) {
  let wi = -1;
  return L.tokenize(c.nl).map((x) => { if (!x.w) return esc(x.t); wi++; const role = c.r.roles[wi]; return role ? `<span class="sxw rl-${role}" title="${esc(SX_ROLE[role])}">${esc(x.w)}</span>` : esc(x.w); }).join('');
}
function sxView() {
  const st = sxState; if (!st.ready && !st.loading) sxInit();
  const c = st.cur;
  const chips = SX_PATS.map(([id, name]) => `<button class="chip ${st.pat === id ? 'on' : ''}" data-act="sx-pat" data-v="${id}">${st.pat === id ? '✓ ' : ''}${esc(name)}${id !== 'all' && st.pools[id] ? ` <small>${st.pools[id].length >= 120 ? '120+' : st.pools[id].length}</small>` : ''}</button>`).join('');
  let body;
  if (!c) body = `<div class="card"><p class="muted" style="margin:0">${st.ready ? 'No sentences found for that pattern yet. Try another one.' : 'Finding sentences for you... 🔍'}</p></div>`;
  else {
    const used = [...new Set(Object.values(c.r.roles))];
    body = `<div class="card sx-card"><div class="sx-sentence">${sxSentenceHtml(c)}</div>
      <div class="row" style="margin:8px 0 4px"><button class="ghost mini" data-act="say" data-t="${esc(c.nl)}" title="Hear it">🔊</button>${st.showEn ? `<span class="muted" style="font-weight:700">${esc(c.en || '')}</span>` : '<button class="ghost mini" data-act="sx-en">👁 Show English</button>'}</div>
      <div class="sx-legend">${used.map((r) => `<span><i class="rl-dot rl-${r}"></i>${esc(SX_ROLE[r])}</span>`).join('')}</div>
      ${c.r.findings.map((f, n) => `<div class="sx-find"><h3><span class="sx-n">${n + 1}</span> ${esc(f.title)}</h3><ul>${f.bullets.map((b) => `<li>${b}</li>`).join('')}</ul></div>`).join('')}
      <div class="row" style="margin-top:14px"><button class="primary" data-act="sx-next">Next sentence ➜</button><button class="ghost" data-act="sx-claude" title="Copies a question for Claude (also works in the free version)">✨ Ask Claude to explain more</button></div>
      <p class="muted" style="margin:10px 0 0;font-size:13px">These are rule-of-thumb explanations from word order. Real sentences can be trickier, so ask Claude when something does not fit.</p></div>`;
  }
  return `<div class="chips2" style="margin-bottom:12px">${chips}</div>${body}`;
}
const baseGrammar = VIEWS.grammar;
VIEWS.grammar = () => {
  const tab = (id, label) => `<button class="tab ${(ui.grTab || 'sheets') === id ? 'on' : ''}" data-act="gr-tab" data-v="${id}">${label}</button>`;
  return `<div class="top"><h1>Grammar</h1></div><div class="tabs">${tab('sheets', '📚 Cheat sheets')}${tab('explain', '🔍 Sentence explainer')}${tab('verbs', '🔧 Verb trainer')}</div>${ui.grTab === 'explain' ? sxView() : ui.grTab === 'verbs' ? vtView() : baseGrammar()}`;
};
Object.assign(ACT, {
  'gr-tab': (el) => { ui.grTab = el.dataset.v; render(); },
  'sx-pat': (el) => { sxState.pat = el.dataset.v; sxNext(); render(); },
  'sx-next': () => { sxNext(); render(); },
  'sx-en': () => { sxState.showEn = true; render(); },
  'sx-claude': () => {
    const c = sxState.cur; if (!c) return;
    copyText('I am learning Dutch (A2 done, working on B1). Please explain, step by step and in simple English, why this sentence is built the way it is: the word order, where each verb goes and why, and any other rule I should learn from it.\n\nDutch: ' + c.nl + '\nEnglish: ' + (c.en || '') + '\n\nEnd with two similar example sentences.');
  },
});
