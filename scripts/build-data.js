// Builds data/dict.js, data/freq.js and data/sentences.js from three downloaded sources (see data/README.md):
//   node scripts/build-data.js <folder with kaikki-nl.jsonl, nl_50k.txt and nld.txt>
//   kaikki-nl.jsonl  Dutch Wiktionary, https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl
//   nl_50k.txt       OpenSubtitles Dutch frequency list, hermitdave/FrequencyWords
//   nld.txt          Tatoeba Dutch-English pairs, https://www.manythings.org/anki/nld-eng.zip
const fs = require('fs'), path = require('path');
const dir = process.argv[2]; if (!dir) { console.error('usage: node scripts/build-data.js <download folder>'); process.exit(1); }
const out = path.join(__dirname, '..', 'data');
const lines = (f) => fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);

// ---------- dictionary ----------
const POS = { noun: 'n', verb: 'v', adj: 'a', adv: 'd', prep: 'p', conj: 'c', pron: 'r', det: 'e', intj: 'i', num: 'u', article: 't', phrase: 'h', prep_phrase: 'h', proverb: 'h', particle: 'x', postp: 'p' };
const BAD_TAGS = new Set(['form-of', 'alt-of', 'misspelling', 'obsolete', 'error-lua-exec', 'dialectal', 'rare', 'nonstandard']);
const clean = (g) => {
  let t = g.replace(/\s*\([^)]*\)/g, '').split(':')[0].replace(/\s+/g, ' ').trim().replace(/^(an?|the) (?=\S)/i, '');
  if (t.length > 45) t = t.split(/[,;]/)[0].trim();
  return (t || g).replace(/\.$/, '');
};
const meanings = (e) => {
  const res = [];
  for (const s of e.senses || []) {
    if (s.form_of || s.alt_of || (s.tags || []).some((t) => BAD_TAGS.has(t))) continue;
    const gl = s.glosses || [], g = gl[gl.length - 1]; if (!g || /^(inflection|plural|past|present|diminutive|alternative|obsolete|abbreviation|initialism|synonym|misspelling) .*\bof\b/i.test(g)) continue;
    const c = clean(g); if (c.length > 60 || res.includes(c)) continue; res.push(c);
    if (res.length === 3) break;
  }
  return res;
};
const withTags = (e, ...tags) => (e.forms || []).find((f) => f.form && f.form.length > 1 && !/ /.test(f.form) && tags.every((t) => (f.tags || []).includes(t)));
const articleOf = (e) => {
  const a = ((e.head_templates || [])[0] || {}).args || {}, g = String(a['1'] || '');
  const n = /n/.test(g), d = /[mfc]/.test(g);
  return n && d ? 'de/het' : n ? 'het' : d ? 'de' : '';
};
const entries = new Map(), forms = new Map(); // dictionary entries by word+type; inflected form -> base word
for (const line of lines('kaikki-nl.jsonl')) {
  if (!line) continue;
  let e; try { e = JSON.parse(line); } catch { continue; }
  const w = e.word; if (!w || w.length > 30) continue;
  const key = w.toLowerCase();
  const fo = (e.senses || []).find((s) => s.form_of && s.form_of[0]);
  if (fo && !forms.has(key)) forms.set(key, fo.form_of[0].word.toLowerCase());
  const p = POS[e.pos]; if (!p) continue;
  const m = meanings(e); if (!m.length) continue;
  const ent = [w, p, p === 'n' ? articleOf(e) : '', '', m.join('; ')];
  if (p === 'n') { const pl = withTags(e, 'plural'); if (pl) ent[3] = pl.form; }
  else if (p === 'v') {
    const sg = withTags(e, 'past', 'singular', 'first-person') || withTags(e, 'past', 'singular'), pp = withTags(e, 'participle', 'past');
    const aux = (((e.inflection_templates || [])[0] || {}).args || {}).aux;
    ent[3] = [sg && sg.form, pp && pp.form, aux].filter(Boolean).join(',');
  } else if (p === 'a') { const c = withTags(e, 'comparative'), s = withTags(e, 'superlative'); ent[3] = [c && c.form, s && s.form].filter(Boolean).join(','); }
  const prev = entries.get(key + '|' + p);
  if (prev) { if (!prev[2] && ent[2]) prev[2] = ent[2]; prev[4] = (prev[4] + '; ' + ent[4]).split('; ').filter((x, i, a) => a.indexOf(x) === i).slice(0, 3).join('; '); }
  else entries.set(key + '|' + p, ent);
}
const dict = [...entries.values()].sort((a, b) => a[0].localeCompare(b[0], 'nl'));
fs.writeFileSync(path.join(out, 'dict.js'), '// Dutch dictionary from Wiktionary (via kaikki.org), CC BY-SA 4.0. [word, type, article, forms, meanings]\n// type: n noun, v verb, a adjective, d adverb, p preposition, c conjunction, r pronoun, e determiner, i interjection, u number, t article, h phrase, x particle\n// forms: noun plural | verb "past singular,participle,auxiliary" | adjective "comparative,superlative"\nvar DICT = ' + JSON.stringify(dict) + ';\n');

// ---------- frequency list: common words, as dictionary base forms ----------
const byWord = new Map();
for (const e of dict) { const k = e[0].toLowerCase(), cur = byWord.get(k); if (!cur || (/^[nvadc]$/.test(e[1]) && !/^[nvadc]$/.test(cur[1]))) byWord.set(k, e); }
const freq = [], seen = new Set();
lines('nl_50k.txt').forEach((line, i) => {
  const w = line.split(' ')[0]; if (!w || !/^[a-zà-ÿ'-]{2,}$/i.test(w) || freq.length >= 6000) return;
  const base = byWord.has(w) ? w : forms.get(w), e = base && byWord.get(base);
  if (!e || seen.has(e[0]) || e[1] === 'h') return;
  seen.add(e[0]); freq.push([e[0], e[4].split('; ').slice(0, 2).join('; '), i + 1, e[2], e[1]]);
});
fs.writeFileSync(path.join(out, 'freq.js'), '// Dutch words by how common they are (OpenSubtitles frequency list), as dictionary base forms with meanings from Wiktionary. [word, meaning, rank, article, type]\nvar FREQ = ' + JSON.stringify(freq) + ';\n');

// ---------- sentences: short ones only ----------
const sen = [], dup = new Set();
for (const line of lines('nld.txt')) {
  const [en, nl] = line.split('\t'); if (!en || !nl) continue;
  const n = nl.trim().split(/\s+/).length;
  if (n < 3 || n > 10 || nl.length > 70 || dup.has(nl)) continue;
  dup.add(nl); sen.push([nl, en]);
}
fs.writeFileSync(path.join(out, 'sentences.js'), '// Real Dutch sentences with English translations (Tatoeba, CC BY 2.0 FR). [dutch, english]\nvar SENTENCES = ' + JSON.stringify(sen) + ';\n');
console.log('dictionary', dict.length, '| frequency words', freq.length, '| sentences', sen.length);
