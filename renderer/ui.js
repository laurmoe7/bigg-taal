// UI polish: themed dropdown menus, button ripples and counting numbers. Loads last and shares the global scope.

// ---------- themed dropdowns ----------
// Every <select> is shown as a styled button with a styled list. The real <select> stays in the page (hidden), so the code that reads
// its value, and the 'change' events it listens for, keep working exactly as before.
let ddOpen = null; // { wrap, sel, list, items, at }
function ddLabel(sel) { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; }
function closeDd(refocus) {
  if (!ddOpen) return;
  const { wrap, list } = ddOpen; ddOpen = null;
  wrap.classList.remove('open'); list.classList.remove('show');
  setTimeout(() => list.remove(), 140);
  if (refocus) { const b = wrap.querySelector('.dd-btn'); if (b) b.focus(); }
}
function pickDd(sel, wrap, value) {
  sel.value = value; wrap.querySelector('.dd-label').textContent = ddLabel(sel);
  sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
}
function openDd(wrap, sel) {
  if (sel.disabled) return;
  if (ddOpen) { const same = ddOpen.wrap === wrap; closeDd(); if (same) return; }
  const list = document.createElement('div'); list.className = 'dd-list'; list.setAttribute('role', 'listbox');
  const items = [];
  const addOpt = (o, parent) => {
    const it = document.createElement('div'); it.className = 'dd-item' + (o.selected ? ' sel' : '') + (o.disabled ? ' off' : ''); it.setAttribute('role', 'option');
    it.dataset.v = o.value; it.innerHTML = '<span class="dd-check">✓</span><span>' + esc(o.textContent) + '</span>';
    it.addEventListener('mousedown', (e) => e.preventDefault());
    it.addEventListener('click', () => { if (o.disabled) return; pickDd(sel, wrap, o.value); closeDd(true); });
    it.addEventListener('mousemove', () => hlDd(items.indexOf(it)));
    parent.appendChild(it); items.push(it);
  };
  [...sel.children].forEach((ch) => {
    if (ch.tagName === 'OPTGROUP') { const g = document.createElement('div'); g.className = 'dd-group'; g.textContent = ch.label; list.appendChild(g); [...ch.children].forEach((o) => addOpt(o, list)); } else addOpt(ch, list);
  });
  document.body.appendChild(list);
  const b = wrap.getBoundingClientRect(), vh = window.innerHeight;
  list.style.minWidth = Math.max(b.width, 160) + 'px';
  list.style.left = Math.min(b.left, window.innerWidth - list.offsetWidth - 12) + 'px';
  const h = Math.min(list.scrollHeight, 340), below = vh - b.bottom - 14;
  if (below >= h || below >= 180) { list.style.top = b.bottom + 6 + 'px'; list.style.maxHeight = Math.min(340, below) + 'px'; list.classList.add('down'); }
  else { list.style.maxHeight = Math.min(340, b.top - 14) + 'px'; list.style.top = Math.max(8, b.top - Math.min(h, b.top - 14) - 6) + 'px'; list.classList.add('up'); }
  requestAnimationFrame(() => list.classList.add('show'));
  wrap.classList.add('open');
  ddOpen = { wrap, sel, list, items, at: Math.max(0, sel.selectedIndex >= 0 ? items.findIndex((x) => x.classList.contains('sel')) : 0) };
  hlDd(ddOpen.at, true);
}
function hlDd(i, scroll) {
  if (!ddOpen || i < 0 || i >= ddOpen.items.length) return;
  ddOpen.at = i; ddOpen.items.forEach((x, k) => x.classList.toggle('hl', k === i));
  if (scroll) ddOpen.items[i].scrollIntoView({ block: 'nearest' });
}
function enhanceSelects() {
  document.querySelectorAll('select:not([data-dd])').forEach((sel) => {
    sel.dataset.dd = '1';
    const cs = getComputedStyle(sel), wrap = document.createElement('span');
    wrap.className = 'dd-wrap' + (sel.style.width === '100%' ? ' full' : '');
    if (cs.maxWidth && cs.maxWidth !== 'none') wrap.style.maxWidth = cs.maxWidth;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox');
    if (sel.disabled) btn.disabled = true;
    btn.innerHTML = '<span class="dd-label"></span><svg class="dd-caret" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.querySelector('.dd-label').textContent = ddLabel(sel);
    btn.addEventListener('click', (e) => { e.preventDefault(); openDd(wrap, sel); });
    btn.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (!ddOpen) openDd(wrap, sel); else if (e.key === 'ArrowDown') hlDd(ddOpen.at + 1, true); else if (e.key === 'ArrowUp') hlDd(ddOpen.at - 1, true); else { const it = ddOpen.items[ddOpen.at]; if (it) it.click(); } }
      else if (e.key === 'Escape' && ddOpen) { e.preventDefault(); e.stopPropagation(); closeDd(true); }
      else if (e.key === 'Tab') closeDd();
    });
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(btn); wrap.appendChild(sel); sel.style.display = 'none';
  });
}
document.addEventListener('mousedown', (e) => { if (ddOpen && !e.target.closest('.dd-list') && !e.target.closest('.dd-wrap')) closeDd(); });
window.addEventListener('blur', () => closeDd()); window.addEventListener('resize', () => closeDd());
// the page scrolling closes an open list, but scrolling the list itself (to reach the later months, say) must not
document.addEventListener('scroll', (e) => { if (ddOpen && e.target && e.target.nodeType === 1 && ddOpen.list.contains(e.target)) return; closeDd(); }, true);
let ddQueued = false;
new MutationObserver(() => { if (ddQueued) return; ddQueued = true; requestAnimationFrame(() => { ddQueued = false; enhanceSelects(); }); }).observe(document.body, { childList: true, subtree: true });
enhanceSelects();

// ---------- ripple on buttons ----------
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('.primary, .ghost, .tab, .chip, .seg button, .theme');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, dot = document.createElement('span');
  dot.className = 'ripple'; dot.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(dot); setTimeout(() => dot.remove(), 650);
});

// ---------- numbers count up when a page opens ----------
function countUp(el) {
  if (el.children.length) return;
  const m = el.textContent.match(/^(\D*)(\d[\d,]*)(.*)$/); if (!m) return;
  const end = parseInt(m[2].replace(/,/g, ''), 10); if (!end || end > 100000) return;
  const t0 = performance.now(), dur = 650;
  const tick = (t) => { const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3))); el.textContent = m[1] + v.toLocaleString() + m[3]; if (k < 1) requestAnimationFrame(tick); else el.textContent = m[1] + m[2] + m[3]; };
  requestAnimationFrame(tick);
}
if (typeof render === 'function') {
  const baseRender = render;
  render = function () {
    const before = ui.rendered; baseRender.apply(this, arguments);
    if (before !== ui.view && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('#main .stat > b').forEach(countUp);
  };
}

// ---------- grammar terms explain themselves on hover ----------
const GLOSS = {
  'main clause': 'A sentence part that can stand on its own. The verb sits in second place: "Ik werk vandaag."',
  'subordinate clause': 'A part that depends on a main clause and starts with a word like "dat", "omdat" or "als". The verb goes to the end: "...omdat ik moe ben."',
  'conjugated verb': 'The verb with its ending changed to fit the subject and tense (ik werk, hij werkt, wij werkten). Also called the finite verb.',
  'finite verb': 'The verb with its ending changed to fit the subject and tense (ik werk, hij werkt, wij werkten).',
  'infinitive': 'The basic form of a verb, as in the dictionary: werken, lopen, hebben.',
  'past simple': 'The one-word past tense: ik werkte, ik liep, wij aten. Mostly used in writing and with hebben, zijn and the modal verbs.',
  'past participle': 'The verb form used after hebben or zijn for the perfect tense: gewerkt, gelopen, gehad.',
  'auxiliary verb': 'A helping verb, like hebben or zijn in "Ik heb gewerkt".',
  'modal verb': 'A verb that says can, must, want or may: kunnen, moeten, willen, mogen, zullen. The other verb goes to the end as an infinitive.',
  'separable verb': 'A verb whose first part splits off and moves to the end: "Ik bel je morgen op" (opbellen).',
  'prefix': 'A little piece added to the front of a word, like op- in opbellen.',
  'suffix': 'A little piece added to the end of a word, like -je in huisje.',
  'direct object': 'The thing or person the action happens to: "Ik zie de hond."',
  'indirect object': 'The person who receives something: "Ik geef de hond een bot" (de hond).',
  'subject': 'Who or what does the action: in "De hond slaapt", the subject is "de hond".',
  'object': 'The thing or person the action happens to: "Ik zie de hond."',
  'definite article': '"de" or "het", the Dutch "the".',
  'indefinite article': '"een", the Dutch "a / an".',
  'article': 'The small word before a noun: de, het (the) or een (a).',
  'de-word': 'A noun that takes "de": de man, de stad. Most plurals use "de" too.',
  'het-word': 'A noun that takes "het": het huis, het boek. Diminutives (-je) are always het-words.',
  'diminutive': 'A "little" form of a noun ending in -je: huis → huisje. It is always a het-word.',
  'plural': 'More than one: huis → huizen.',
  'singular': 'Just one: huis.',
  'adjective': 'A word that describes a noun: groot, mooi, oud.',
  'adverb': 'A word that tells how, when or where something happens: snel, morgen, hier.',
  'preposition': 'A little word that shows place, time or relation: in, op, naar, met, voor.',
  'conjunction': 'A word that joins parts of a sentence: en, maar, want, omdat, dat.',
  'relative pronoun': '"die" or "dat" linking to a noun before it: "het huis dat ik koop".',
  'reflexive pronoun': 'A pronoun that points back to the subject: me, je, zich, ons ("Ik was me").',
  'pronoun': 'A word that stands in for a noun: ik, jij, hij, ze, het.',
  'possessive': 'A word showing who owns something: mijn, jouw, zijn, haar, ons.',
  'inversion': 'Verb before subject. After a time word or question word the verb stays second, so the subject follows it: "Morgen werk ik."',
  'word order': 'The order of the words in a sentence. In Dutch it follows strict rules.',
  'time word': 'A word like "gisteren", "morgen" or "vaak" that says when. Starting a sentence with one makes the verb come right after it.',
  'present perfect': 'The everyday past tense: hebben/zijn plus the past participle ("Ik heb gewerkt").',
  'perfect tense': 'The everyday past tense: hebben/zijn plus the past participle ("Ik heb gewerkt").',
  'simple past': 'The one-word past tense: ik werkte, ik liep. Mostly used in writing and for hebben/zijn/modals.',
  'imperfect': 'The one-word past tense: ik werkte, ik liep.',
  'present tense': 'Describes what happens now: ik werk.',
  'past tense': 'Describes what already happened: ik werkte / ik heb gewerkt.',
  'future': 'What will happen. Dutch often just uses the present with a time word, or "zullen" + infinitive.',
  'imperative': 'The command form: "Kom hier!", "Wacht even."',
  'comparative': 'The "more" form: groter, sneller, mooier.',
  'superlative': 'The "most" form: het grootst, het snelst.',
  'negation': 'Making a sentence negative with "niet" or "geen".',
  'inflection': 'Changing the ending of a word to fit grammar, like groot → grote.',
  'stem': 'The verb without -en: werken → werk. It is the base of ik-forms.',
  'ending': 'The letters added to the end of a word to change its form.',
  'clause': 'A group of words with its own subject and verb.',
  'tense': 'The time a verb talks about: now, past or future.',
  'noun': 'A word for a person, place or thing: huis, man, stad.',
  'verb': 'A word for an action or state: werken, zijn, hebben.',
  'gender': 'Whether a noun is a de-word or a het-word.',
  'particle': 'A small word that shifts meaning or tone, like "toch", "maar" or "even".',
  'vowel': 'a, e, i, o, u (and ij).',
  'consonant': 'Any letter that is not a vowel.',
};
const GLOSS_RE = new RegExp('\\b(' + Object.keys(GLOSS).sort((a, b) => b.length - a.length).join('|') + ')(s|es)?\\b', 'gi');
function glossify(root) {
  if (S.settings.gloss === false) return;
  document.querySelectorAll('.v-why > span:last-child, .gram p, .upd p, .upd li, .gloss').forEach((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach((n) => {
      if (n.parentNode.closest && n.parentNode.closest('.hw, .gl')) return;
      const txt = n.nodeValue; GLOSS_RE.lastIndex = 0; if (!GLOSS_RE.test(txt)) return;
      GLOSS_RE.lastIndex = 0; const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = GLOSS_RE.exec(txt))) {
        frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const s = document.createElement('span'); s.className = 'hw gl'; s.dataset.tip = GLOSS[m[1].toLowerCase()]; s.textContent = m[0]; frag.appendChild(s); last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(txt.slice(last))); n.parentNode.replaceChild(frag, n);
    });
  });
}
if (typeof render === 'function') {
  const glossRender = render;
  render = function () { glossRender.apply(this, arguments); try { glossify(); } catch (e) {} };
}

// ---------- hover bubbles: the word being explained is underlined ----------
// (a real element instead of a CSS ::after, so part of the text can be styled)
const hwTip = document.createElement('div'); hwTip.id = 'hwtip'; document.body.appendChild(hwTip);
function hwTipHtml(el) {
  const tip = el.dataset.tip || '';
  if (!el.dataset.wt) return esc(tip);
  return tip.split('  |  ').map((seg) => { const m = seg.match(/^((?:de|het) )?([^:]+): ([\s\S]*)$/); return m ? esc(m[1] || '') + '<u>' + esc(m[2]) + '</u>: ' + esc(m[3]) : esc(seg); }).join('<span class="sep">|</span>');
}
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest && e.target.closest('.hw[data-tip]'); if (!el) return;
  hwTip.innerHTML = hwTipHtml(el); hwTip.classList.add('show');
  const r = el.getBoundingClientRect(), w = hwTip.offsetWidth, h = hwTip.offsetHeight;
  hwTip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  hwTip.style.top = (r.top - h - 10 < 8 ? r.bottom + 10 : r.top - h - 10) + 'px';
});
document.addEventListener('mouseout', (e) => { const el = e.target.closest && e.target.closest('.hw[data-tip]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hwTip.classList.remove('show'); });
document.addEventListener('mousedown', () => hwTip.classList.remove('show'));

// ---------- rest while you are away: the endless animations pause when the window is in the background ----------
const idleCheck = () => document.body.classList.toggle('idle', document.hidden || !document.hasFocus());
window.addEventListener('blur', () => document.body.classList.add('idle'));
window.addEventListener('focus', idleCheck);
document.addEventListener('visibilitychange', idleCheck);

// if the saved data finished loading before the last scripts ran, the first draw may have been too early: draw the page again now
if (typeof S !== 'undefined' && S && S.settings) { render(); if (typeof checkEarned === 'function') checkEarned(); }

// ---------- mini Bigg in the corner oinks when you click him ----------
function oink() {
  if ((S && S.settings && S.settings.sound === false) || vol() <= 0) return;
  try {
    actx = actx || new AudioContext(); const ctx = actx, t = ctx.currentTime, p = 0.9 + Math.random() * 0.22; // a slightly different pitch each time
    const v = vol(), burst = (start, f0, f1, dur, vol, band) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * p, t + start); o.frequency.exponentialRampToValueAtTime(f1 * p, t + start + dur);
      f.type = 'bandpass'; f.frequency.value = band; f.Q.value = 2.2;
      g.gain.setValueAtTime(0.0001, t + start); g.gain.exponentialRampToValueAtTime(vol * v, t + start + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(f).connect(g).connect(ctx.destination); o.start(t + start); o.stop(t + start + dur + 0.03);
    };
    burst(0, 200, 115, 0.2, 0.5, 650);    // "oi": a low grunt
    burst(0.17, 310, 600, 0.17, 0.36, 1500); // "nk": the little squeal at the end
  } catch {}
}
document.addEventListener('click', (e) => {
  const pig = e.target.closest && e.target.closest('.logo .pig-logo'); if (!pig) return;
  oink(); pig.classList.remove('squish'); void pig.getBoundingClientRect(); pig.classList.add('squish');
});
