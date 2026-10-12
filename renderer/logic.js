// Pure rules for BiggTaal (no DOM), shared by the app and the tests.
(function (root) {
  const L = {};

  // ---------- dates ----------
  L.ymd = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  L.addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return L.ymd(new Date(y, m - 1, d + n)); };
  L.daysBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  L.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- state ----------
  L.defaultSettings = () => ({ dailyGoal: 10, newPerDay: 10, autoUpdate: true, rate: 0.9, voice: '', login: false, sound: true, theme: 'lagoon', looks: true });
  L.emptyState = () => ({ v: 1, words: [], lessons: [], log: {}, settings: L.defaultSettings(), seeded: false });
  L.fixState = (s) => {
    const e = L.emptyState();
    s = Object.assign(e, s || {});
    s.settings = Object.assign(L.defaultSettings(), s.settings || {});
    s.words = s.words || []; s.lessons = s.lessons || []; s.log = s.log || {}; s.sheets = s.sheets || []; s.skills = s.skills || {}; s.knownFreq = s.knownFreq || []; s.missLog = s.missLog || []; s.snap = s.snap || {}; s.reads = s.reads || []; s.presets = s.presets || []; s.knownFreq = s.knownFreq || [];
    return s;
  };

  // ---------- spaced repetition ----------
  L.INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];
  L.newWord = (o) => Object.assign({ id: L.uid(), nl: '', en: '', article: '', pos: 'other', example: '', exampleEn: '', lesson: '', box: 0, due: '', reps: 0, lapses: 0, created: Date.now() }, o);
  L.isDue = (w, today) => !w.due || w.due <= today;
  L.dueWords = (words, today) => words.filter((w) => !w.deleted && L.isDue(w, today)).sort((a, b) => a.box - b.box || (a.due || '').localeCompare(b.due || ''));
  // Today's study queue: every reviewed word that is due, plus up to newPerDay never-seen words (minus the ones started today).
  L.queue = (words, today, newPerDay, newToday) => {
    const live = words.filter((w) => !w.deleted);
    const rev = live.filter((w) => w.reps > 0 && L.isDue(w, today)).sort((a, b) => a.box - b.box || (a.due || "").localeCompare(b.due || ""));
    const fresh = live.filter((w) => !w.reps).slice(0, Math.max(0, newPerDay - (newToday || 0)));
    return rev.concat(fresh);
  };
  // FSRS (Free Spaced Repetition Scheduler, v5 default weights). Each word keeps stab (days until recall drops to 90%),
  // diff (1 easy .. 10 hard) and last (date of last review). 'box' is kept as a simple 0-7 level derived from stab, for the dots and tabs.
  const FW = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const FF = 19 / 81, FC = -0.5, MAXI = 365;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const GN = { again: 1, good: 3, easy: 4 };
  const d0 = (g) => clamp(FW[4] - Math.exp(FW[5] * (g - 1)) + 1, 1, 10);
  L.retrievability = (t, s) => Math.pow(1 + (FF * t) / s, FC);
  L.boxFromStab = (s) => (s < 1 ? 0 : Math.min(7, 1 + Math.floor(Math.log2(s))));
  // words from before FSRS (Leitner box only) get a starting stability from their old interval
  const fsrsState = (w, today) => {
    if (!w.reps) return null;
    if (w.stab) return { s: w.stab, d: w.diff || 5, last: w.last || today };
    const iv = L.INTERVALS[w.box || 0] || 0.5;
    return { s: Math.max(0.5, iv), d: 5, last: w.due && iv ? L.addDays(w.due, -iv) : today };
  };
  L.nextFsrs = (w, grade, today) => {
    const g = GN[grade], st = fsrsState(w, today);
    if (!st) return { s: FW[g - 1], d: d0(g) };
    const t = Math.max(0, L.daysBetween(st.last, today)), r = L.retrievability(t, st.s);
    const dd = st.d + (-FW[6] * (g - 3)) * ((10 - st.d) / 9);
    const d = clamp(FW[7] * d0(4) + (1 - FW[7]) * dd, 1, 10);
    let s;
    if (t < 1) s = st.s * Math.exp(FW[17] * (g - 3 + FW[18])); // reviewed again the same day
    else if (g === 1) s = Math.min(st.s, FW[11] * Math.pow(d, -FW[12]) * (Math.pow(st.s + 1, FW[13]) - 1) * Math.exp(FW[14] * (1 - r)));
    else s = st.s * (1 + Math.exp(FW[8]) * (11 - d) * Math.pow(st.s, -FW[9]) * (Math.exp(FW[10] * (1 - r)) - 1) * (g === 4 ? FW[16] : 1));
    return { s: clamp(s, 0.1, 36500), d };
  };
  const ivOf = (s) => clamp(Math.round(s), 1, MAXI);
  // grade: 'again' | 'good' | 'easy'
  L.grade = (w, grade, today) => {
    const n = Object.assign({}, w), f = L.nextFsrs(w, grade, today);
    n.reps = (w.reps || 0) + 1; n.stab = f.s; n.diff = f.d; n.last = today;
    if (grade === 'again') { n.lapses = (w.lapses || 0) + 1; n.due = today; n.box = 0; }
    else { n.due = L.addDays(today, ivOf(f.s)); n.box = Math.max(1, L.boxFromStab(f.s)); }
    return n;
  };
  // days until the next review for each answer, to show on the buttons
  L.previewIntervals = (w, today) => ({ again: 0, good: ivOf(L.nextFsrs(w, 'good', today).s), easy: ivOf(L.nextFsrs(w, 'easy', today).s) });
  L.mastery = (words) => {
    const live = words.filter((w) => !w.deleted);
    const learned = live.filter((w) => w.box >= 4).length;
    return { total: live.length, learned, learning: live.filter((w) => w.box > 0 && w.box < 4).length, fresh: live.filter((w) => !w.reps).length };
  };

  // ---------- activity log, streak ----------
  L.bump = (log, today, key, n) => { const d = log[today] || (log[today] = {}); d[key] = (d[key] || 0) + (n == null ? 1 : n); return d; };
  L.streak = (log, today) => {
    const active = (d) => log[d] && ((log[d].reviews || 0) + (log[d].lessons || 0) + (log[d].listen || 0)) > 0;
    let day = active(today) ? today : L.addDays(today, -1); // today not studied yet doesn't break it
    let n = 0;
    while (active(day)) { n++; day = L.addDays(day, -1); }
    return n;
  };
  L.week = (log, today) => { const out = []; for (let i = 6; i >= 0; i--) { const d = L.addDays(today, -i); out.push({ d, n: ((log[d] || {}).reviews || 0) + ((log[d] || {}).listen || 0) }); } return out; };

  // ---------- answer checking ----------
  L.norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  L.lev = (a, b) => {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  };
  // 'right' | 'close' (one typo or a missing accent) | 'wrong'. `answer` may hold alternatives split by / or ;
  L.check = (typed, answer) => {
    const t = L.norm(typed); if (!t) return 'wrong';
    const alts = String(answer).split(/[\/;]/).map((a) => a.replace(/\(.*?\)/g, '')).map(L.norm).filter(Boolean);
    if (alts.includes(t)) return String(answer).split(/[\/;]/).some((a) => a.trim().toLowerCase() === typed.trim().toLowerCase()) ? 'right' : 'close';
    if (alts.some((a) => a.length > 4 && L.lev(t, a) <= 1)) return 'close';
    return 'wrong';
  };
  L.stripArticle = (s) => String(s).replace(/^(de|het|een)\s+/i, '');

  // ---------- dictation: word diff, letter diff, confusable sounds ----------
  // Sounds Dutch learners mix up when writing what they hear. `rules` are [a, b] spelling pairs that sound alike or close; `re` finds practice words.
  L.SOUNDS = {
    'ij-ei': { name: 'ij / ei', tip: 'ij and ei sound the same, so you have to learn each word: tijd, rijk, prijs (ij) but klein, trein, reis (ei).', re: /ij|ei/, rules: [['ij', 'ei']] },
    'eu-ui': { name: 'eu / ui', tip: 'eu is a rounded "uh" (neus); ui is a different sound (huis). Say them slowly with your lips.', re: /eu|ui/, rules: [['eu', 'ui']] },
    'au-ou': { name: 'au / ou', tip: 'au and ou sound the same (auto, koud). Learn the spelling word by word.', re: /au|ou/, rules: [['au', 'ou']] },
    'g-ch': { name: 'g / ch', tip: 'Both are throaty "h" sounds. g is voiced (goed), ch is not (toch, nacht).', re: /g|ch/, rules: [['g', 'ch']] },
    'ie-i': { name: 'ie / i', tip: 'ie is long (niet), i is short (nit). A short i is followed by two consonants or ends a closed syllable.', re: /ie|i/, rules: [['ie', 'i']] },
    'oe-u': { name: 'oe / u', tip: 'oe is like English "oo" (boek), u is a short rounded sound (bus).', re: /oe|u/, rules: [['oe', 'u']] },
    'long-short': { name: 'long / short vowel', tip: 'In an open syllable a long vowel is written once (ma-ken), in a closed syllable twice (maan). Check: does the plural keep the long vowel? maan, manen.', re: /aa|ee|oo|uu/, rules: [['aa', 'a'], ['ee', 'e'], ['oo', 'o'], ['uu', 'u']] },
    'dt': { name: 'final d / t', tip: 'A final d sounds like t (hond). Make the plural to hear it: honden, so it is a d.', re: /[dt]$/, rules: [['d', 't']] },
    'v-f': { name: 'v / f', tip: 'v and f sound close in Dutch. Try the word in a sentence or its plural to remember which it is.', re: /[vf]/, rules: [['v', 'f']] },
    'z-s': { name: 'z / s', tip: 'z is voiced, s is not. Many Dutch speakers blur them, so learn the spelling per word.', re: /[zs]/, rules: [['z', 's']] },
    'dbl': { name: 'double consonants', tip: 'After a short vowel you need two consonants (kappen), after a long vowel one (kapen).', re: /([^aeiou])\1/, collapse: true },
  };
  const collapseCons = (s) => s.replace(/([^aeiou' ])\1/g, '$1');
  // Which known confusions explain why `typed` was written instead of `target`? (both lowercase, no accents)
  L.soundTags = (target, typed) => {
    const t = L.norm(target), y = L.norm(typed), tags = [];
    if (!t || !y || t === y) return tags;
    for (const [id, s] of Object.entries(L.SOUNDS)) {
      if (s.collapse) { if (collapseCons(t) === collapseCons(y)) tags.push(id); continue; }
      let hit = false;
      for (const [a, b] of s.rules) for (const [from, to] of [[a, b], [b, a]]) {
        let i = y.indexOf(from);
        while (i >= 0 && !hit) { if (y.slice(0, i) + to + y.slice(i + from.length) === t) hit = true; i = y.indexOf(from, i + 1); }
      }
      if (hit) tags.push(id);
    }
    return tags;
  };
  // Compare what was heard with what was typed, word by word. Words: { w, status: ok | close | missed, typed }.
  L.diffWords = (target, typed) => {
    const T = String(target).replace(/[.!?,;:"]+/g, ' ').split(/\s+/).filter((w) => L.norm(w));
    const tn = T.map(L.norm), yn = L.norm(typed).split(' ').filter(Boolean);
    const m = tn.length, n = yn.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = tn[i] === yn[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const matchT = new Array(m).fill(-1), matchY = new Array(n).fill(-1);
    for (let i = 0, j = 0; i < m && j < n;) { if (tn[i] === yn[j]) { matchT[i] = j; matchY[j] = i; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    const words = T.map((w, i) => ({ w, status: matchT[i] >= 0 ? 'ok' : 'missed', typed: matchT[i] >= 0 ? yn[matchT[i]] : '' }));
    // pair up unmatched words that sit in the same gap, in order: near misses are 'close'
    const used = new Set();
    const anchors = [];
    matchT.forEach((j, i) => { if (j >= 0) anchors.push([i, j]); });
    anchors.push([m, n]);
    let pi = 0, pj = 0;
    for (const [ai, aj] of anchors) {
      const gt = [], gy = [];
      for (let k = pi; k < ai; k++) gt.push(k);
      for (let k = pj; k < aj; k++) gy.push(k);
      gt.forEach((ti, k) => {
        if (k >= gy.length) return;
        words[ti].typed = yn[gy[k]]; used.add(gy[k]);
        if (L.lev(tn[ti], yn[gy[k]]) <= Math.max(1, Math.floor(tn[ti].length / 3))) words[ti].status = "close";
      });
      pi = ai + 1; pj = aj + 1;
    }
    const extra = yn.filter((_, k) => matchY[k] < 0 && !used.has(k));
    const ok = words.filter((x) => x.status === 'ok').length, close = words.filter((x) => x.status === 'close').length;
    const score = m ? (ok + close * 0.5) / m : 0;
    return { words, extra, score, result: ok === m && !extra.length ? 'right' : score >= 0.8 ? 'close' : 'wrong' };
  };
  // Per-letter marks for the target: [{ c, ok }], plus the typed letters that were not needed.
  L.letterDiff = (target, typed) => {
    const strip = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const t = strip(target), y = strip(typed).trim(), m = t.length, n = y.length;
    const dp = Array.from({ length: m + 1 }, (_, a) => { const r = new Array(n + 1).fill(0); r[0] = a; return r; });
    for (let b = 0; b <= n; b++) dp[0][b] = b;
    for (let a = 1; a <= m; a++) for (let b = 1; b <= n; b++) dp[a][b] = Math.min(dp[a - 1][b] + 1, dp[a][b - 1] + 1, dp[a - 1][b - 1] + (t[a - 1] === y[b - 1] ? 0 : 1));
    const cells = Array.from(String(target), (c) => ({ c, ok: false })), extra = [];
    let a = m, b = n;
    while (a > 0 || b > 0) {
      if (a > 0 && b > 0 && t[a - 1] === y[b - 1] && dp[a][b] === dp[a - 1][b - 1]) { cells[a - 1].ok = true; a--; b--; }
      else if (a > 0 && b > 0 && dp[a][b] === dp[a - 1][b - 1] + 1) { a--; b--; }
      else if (a > 0 && dp[a][b] === dp[a - 1][b] + 1) a--;
      else { extra.unshift(y[b - 1]); b--; }
    }
    return { cells, extra };
  };
  // Hint text for dictation: level 1 = word lengths, level 2 = lengths plus first letters.
  L.hintText = (target, level) => String(target).replace(/[.!?,;:"]+/g, '').split(/\s+/).filter(Boolean).map((w) => (level >= 2 ? w[0] : '_') + '_'.repeat(Math.max(0, w.length - 1))).join('  ');
  // Words to practise a sound with.
  L.soundWords = (words, id) => { const s = L.SOUNDS[id]; return s ? words.filter((w) => !w.deleted && s.re.test(L.norm(L.stripArticle(w.nl)).replace(/\s+/g, ''))) : []; };

  // Pulls the JSON out of a whole pasted reply (plain JSON, a fenced block, or JSON buried in text). null if there is none.
  L.extractJson = (text) => {
    text = String(text || '');
    try { return JSON.parse(text); } catch {}
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) { try { return JSON.parse(fence[1]); } catch {} }
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== '{' && text[i] !== '[') continue;
      let depth = 0, inStr = false, esc = false;
      for (let j = i; j < text.length; j++) {
        const d = text[j];
        if (inStr) { if (esc) esc = false; else if (d === '\\') esc = true; else if (d === '"') inStr = false; continue; }
        if (d === '"') inStr = true;
        else if (d === '{' || d === '[') depth++;
        else if (d === '}' || d === ']') {
          depth--;
          if (depth === 0) { try { const v = JSON.parse(text.slice(i, j + 1)); if (v && (v.words || v.lessons || Array.isArray(v))) return v; } catch {} break; }
        }
      }
    }
    return null;
  };
  // ---------- practice worksheets made by Claude, done in the app, tracked by skill ----------
  L.SKILLS = ['word order', 'de/het', 'verb forms', 'past tense', 'separable verbs', 'prepositions', 'adjectives', 'plurals', 'spelling', 'vocabulary', 'pronouns', 'negation', 'questions', 'connectors', 'other'];
  L.SKILL_NAMES = { 'word order': 'Word order', 'de/het': 'De / het', 'verb forms': 'Verb forms', 'past tense': 'Past tense', 'separable verbs': 'Separable verbs', prepositions: 'Prepositions', adjectives: 'Adjective endings', plurals: 'Plurals & diminutives', spelling: 'Spelling', vocabulary: 'Vocabulary', pronouns: 'Pronouns', negation: 'Negation (niet/geen)', questions: 'Questions', connectors: 'Connectors (omdat, dat...)', other: 'Other' };
  L.normSkill = (s) => {
    const t = String(s || '').toLowerCase().trim();
    if (L.SKILLS.includes(t)) return t;
    const map = [[/separab|scheidbaar/, 'separable verbs'], [/word.?order|inversion|verb.?second|position/, 'word order'], [/de.?\/?.?het|\barticle|lidwoord|gender/, 'de/het'], [/adject|ending/, 'adjectives'],
      [/past|perfect|imperfect|participle|tense/, 'past tense'], [/verb|conjug/, 'verb forms'], [/prepos/, 'prepositions'], [/plural|dimin/, 'plurals'], [/spell/, 'spelling'], [/vocab|word.?choice|meaning/, 'vocabulary'],
      [/pronoun/, 'pronouns'], [/negat|niet|geen/, 'negation'], [/question/, 'questions'], [/connect|conjunct|omdat|subordinate|bijzin|clause/, 'connectors']];
    for (const [re, id] of map) if (re.test(t)) return id;
    return 'other';
  };
  const ITEM_TYPES = ['mc', 'fill', 'order', 'translate', 'correct', 'write'];
  // Reads Claude's worksheet reply: { sheet } or { error }.
  L.parseSheet = (text) => {
    const j = L.extractJson(text);
    if (!j) return { error: 'I could not find a worksheet in that text. Paste the whole reply from Claude, JSON included.' };
    const ws = j.worksheet || j, raw = Array.isArray(ws) ? ws : ws.items;
    if (!Array.isArray(raw) || !raw.length) return { error: 'That JSON has no worksheet items.' };
    const items = []; let skipped = 0;
    raw.slice(0, 30).forEach((r) => {
      if (!r || typeof r !== 'object') { skipped++; return; }
      const type = String(r.type || '').toLowerCase(), q = String(r.q || r.question || '').trim(), answer = String(r.answer == null ? '' : r.answer).trim();
      if (!ITEM_TYPES.includes(type) || !q || (!answer && type !== 'write')) { skipped++; return; }
      const it = { id: String(items.length + 1), type, q, answer, alt: (Array.isArray(r.alt) ? r.alt : []).map(String).map((x) => x.trim()).filter(Boolean), why: String(r.why || r.explanation || '').trim(), skill: L.normSkill(r.skill || r.category) };
      if (type === 'mc') {
        const options = (Array.isArray(r.options) ? r.options : []).map(String);
        if (options.length < 2 || !options.includes(answer)) { skipped++; return; }
        it.options = options;
      }
      items.push(it);
    });
    if (!items.length) return { error: 'None of the items could be used. Ask Claude to follow the JSON shape exactly.' };
    return { sheet: { title: String(ws.title || 'Practice worksheet').slice(0, 80), items, skipped } };
  };
  // Marks one answer. verdict: right | close | wrong | unsure (needs Claude or a self-check) | blank. final = no further checking needed.
  L.autoMark = (item, typed) => {
    const t = String(typed || '').trim();
    if (!t) return { verdict: 'blank', final: false };
    if (item.type === 'mc') return { verdict: t === item.answer ? 'right' : 'wrong', final: true };
    if (item.type === 'write') return { verdict: 'unsure', final: false };
    const accepted = [item.answer].concat(item.alt || []).filter(Boolean), n = L.norm(t);
    if (accepted.some((a) => L.norm(a) === n)) return { verdict: 'right', final: true };
    if (item.type === 'fill') return { verdict: accepted.some((a) => a.length > 4 && L.lev(n, L.norm(a)) <= 1) ? 'close' : 'wrong', final: true };
    return { verdict: 'unsure', final: false }; // several translations or word orders can be right: let Claude judge
  };
  L.SCORE = { right: 1, close: 0.75, partly: 0.5, wrong: 0, unsure: 0, blank: 0 };
  L.sheetScore = (sheet) => {
    const rs = sheet.items.map((it) => (sheet.results && sheet.results[it.id]) || null);
    const marked = rs.filter((r) => r && r.verdict && !['unsure', 'blank'].includes(r.verdict));
    return { got: marked.reduce((a, r) => a + (L.SCORE[r.verdict] || 0), 0), of: sheet.items.length, marked: marked.length };
  };
  // Running record per skill: the last 30 outcomes (1 = right, 0 = missed) and a few recent mistakes.
  L.recordOutcome = (skills, skill, ok, example, date) => {
    const k = L.normSkill(skill), s = skills[k] || (skills[k] = { hist: [], examples: [], last: '' });
    s.hist.push(ok ? 1 : 0); if (s.hist.length > 30) s.hist.shift();
    s.last = date || s.last;
    if (!ok && example) { s.examples.unshift(example); s.examples = s.examples.slice(0, 5); }
    return s;
  };
  L.weakSkills = (skills, n) => Object.entries(skills || {}).map(([skill, s]) => {
    const total = s.hist.length, wrong = s.hist.filter((x) => !x).length;
    return { skill, total, wrong, acc: total ? (total - wrong) / total : 1, examples: s.examples, last: s.last };
  }).filter((x) => x.wrong > 0).sort((a, b) => b.wrong - a.wrong || a.acc - b.acc).slice(0, n || 3);
  const JSON_SHEET = '{"worksheet":{"title":"Short title","items":[{"type":"mc","skill":"de/het","q":"___ huis is groot.","options":["De","Het"],"answer":"Het","why":"huis is a het-word."},{"type":"fill","skill":"past tense","q":"Gisteren ___ ik naar de winkel. (gaan)","answer":"ging","alt":[],"why":"Strong verb: gaan, ging, gegaan."},{"type":"translate","skill":"word order","q":"Tomorrow I have an appointment.","answer":"Morgen heb ik een afspraak.","alt":["Ik heb morgen een afspraak."],"why":"The verb stays second."}]}}';
  const LEVEL = 'I am learning Dutch (A2 done, working on B1) with NT2school';
  L.TOPICS = ['Housing & neighbours', 'Work & jobs', 'Health & the doctor', 'Shopping & money', 'Travel & transport', 'Food & restaurants', 'Family & friends', 'Daily routine', 'School & courses', 'Government & paperwork', 'Free time & hobbies', 'Weather & nature', 'News & society', 'Technology'];
  L.sheetPrompt = (o) => {
    const wordList = (o.words || []).slice(0, 40).map((w) => w.nl + (w.en ? ' (' + w.en + ')' : '')).join(', ');
    const lines = [`${LEVEL}. Please make me a practice worksheet of ${o.count || 12} items that I will complete inside my BiggTaal app, so reply with ONLY one JSON object in a code block and no other text.`];
    if (o.topics && o.topics.length) lines.push('Topics to include (spread them across the items): ' + o.topics.join(', ') + '.');
    if (o.grammar && o.grammar.length) lines.push('Grammar to include (at least two items for each): ' + o.grammar.map((g) => L.SKILL_NAMES[g] || g).join(', ') + '.');
    if (wordList) lines.push('Use these words from my own list where it makes sense: ' + wordList + '.');
    if (o.weak && o.weak.length) lines.push('My weak spots, so make at least half of the items practise these:\n' + o.weak.map((w) => `- ${L.SKILL_NAMES[w.skill] || w.skill}: missed ${w.wrong} of my last ${w.total}${w.examples && w.examples[0] ? `; for example I wrote "${w.examples[0].yours}" where "${w.examples[0].correct}" was right` : ''}`).join('\n'));
    if (o.note) lines.push('In my own words, what else I want: ' + o.note);
    lines.push('Item types, use a good mix: "mc" (2 to 4 options), "fill" (one gap), "order" (words in a sentence for me to put in order), "translate" (English to Dutch), "correct" (a sentence with one mistake for me to fix), "write" (1 to 2 sentences about a given topic).');
    lines.push(`Rules: B1 level; every item must stand on its own; never show the answer in the question. For fill, order, translate and correct give the single best answer in "answer" and every other fully correct version in "alt". For mc, "answer" must equal one of "options" exactly. "why" is one short English sentence naming the rule. "skill" must be one of: ${L.SKILLS.join(', ')}. For "write" give a model answer in "answer".`);
    lines.push('JSON shape, shown with three items:\n```json\n' + JSON_SHEET + '\n```');
    return lines.join('\n\n');
  };
  const RESULT_SHAPE = '{"results":[{"id":"3","verdict":"partly","correct":"Morgen heb ik een afspraak.","explain":"One short English sentence about the rule.","skills":["word order"]}],"summary":{"good":"What went well.","improve":["Concrete thing 1","Concrete thing 2"],"next":"What to focus on in the next worksheet."}}';
  L.checkPrompt = (sheet) => {
    const rows = sheet.items.map((it) => {
      const r = (sheet.results && sheet.results[it.id]) || {}, mine = (sheet.answers && sheet.answers[it.id]) || '';
      const need = r.verdict === 'unsure' || r.verdict === 'blank' || !r.verdict;
      return `${it.id}. [${need ? 'CHECK' : 'auto: ' + r.verdict}] (${it.type}, ${it.skill}) ${it.q}${it.options ? ' Options: ' + it.options.join(' / ') : ''}\n   my answer: ${mine || '(left blank)'}\n   expected: ${it.answer || '(model answer not given)'}${it.alt && it.alt.length ? ' | also fine: ' + it.alt.join(' | ') : ''}`;
    });
    return `${LEVEL}. I did this worksheet in my BiggTaal app. Items marked CHECK still need your marking; the auto ones were already marked by the app (you can still comment on them in the summary).\n\n` +
      `For every CHECK item give: verdict (right, partly or wrong), the corrected Dutch in "correct" if it is not right, ONE short English sentence in "explain" naming the rule, and "skills" with the grammar areas of my mistake, each one of: ${L.SKILLS.join(', ')}. ` +
      `Be kind and encouraging. Accept any fully correct alternative, not only the expected answer. Then write a "summary": what went well, 2 to 4 concrete things I should improve, and a suggested focus for my next worksheet. Reply with ONLY this JSON in a code block:\n\`\`\`json\n${RESULT_SHAPE}\n\`\`\`\n\nWORKSHEET "${sheet.title}":\n` + rows.join('\n');
  };
  // Reads Claude's marking reply: { results: {id: {verdict, correct, explain, skills}}, summary } or { error }.
  L.parseFeedback = (text, sheet) => {
    const j = L.extractJson(text);
    if (!j || (!Array.isArray(j.results) && !j.summary)) return { error: 'I could not find the marking in that text. Paste the whole reply from Claude, JSON included.' };
    const ids = new Set(sheet.items.map((it) => it.id)), results = {};
    for (const r of j.results || []) {
      const id = String(r && r.id);
      if (!ids.has(id)) continue;
      const v = String(r.verdict || '').toLowerCase();
      results[id] = { verdict: ['right', 'partly', 'wrong'].includes(v) ? v : 'wrong', correct: String(r.correct || ''), explain: String(r.explain || ''), skills: (Array.isArray(r.skills) ? r.skills : []).map(L.normSkill) };
    }
    const sm = j.summary || {};
    return { results, summary: { good: String(sm.good || ''), improve: (Array.isArray(sm.improve) ? sm.improve : sm.improve ? [sm.improve] : []).map(String), next: String(sm.next || '') } };
  };

  // "Put in order: vergadering / heb / ik" -> { prefix: 'Put in order:', words: ['vergadering', 'heb', 'ik'] } (null if there is no word list)
  L.orderParts = (q) => {
    const s = String(q || ''), slash = s.indexOf('/');
    if (slash < 0) return null;
    const colon = s.lastIndexOf(':', slash);
    const words = s.slice(colon >= 0 ? colon + 1 : 0).split('/').map((x) => x.trim()).filter(Boolean);
    return words.length >= 2 ? { prefix: colon >= 0 ? s.slice(0, colon + 1).trim() : '', words } : null;
  };
  // Which of the given words have been typed so far (each typed word counts once). Returns an array of booleans.
  L.usedWords = (words, typed) => {
    let rest = ' ' + L.norm(typed) + ' ';
    return words.map((w) => {
      const needle = ' ' + L.norm(w) + ' ', i = needle.trim() ? rest.indexOf(needle) : -1;
      if (i < 0) return false;
      rest = rest.slice(0, i) + ' ' + rest.slice(i + needle.length);
      return true;
    });
  };

  // ---------- real example sentences (Tatoeba) ----------
  // sentences: [[dutch, english], ...]. The index maps every lower-case word to the sentences it appears in.
  const toks = (s) => s.toLowerCase().match(/[a-zà-ÿ']+/g) || [];
  L.buildSentenceIndex = (sentences) => {
    const idx = new Map();
    sentences.forEach((p, i) => { for (const t of new Set(toks(p[0]))) { const a = idx.get(t); if (a) a.push(i); else idx.set(t, [i]); } });
    return idx;
  };
  // the forms a word might show up in: verbs by their stem (werken -> werk, werkt, werkte, gewerkt...), nouns with s/en/e
  // separable verbs: afvragen = af + vragen ("Ik vraag me af")
  L.sepSplit = (nl) => { const m = nl.toLowerCase().replace(/^(de|het|een|zich)\s+/, '').trim().match(/^(af|aan|op|uit|in|mee|na|om|onder|over|toe|terug|weg|door|voor|bij|samen|vast|neer|rond|los|binnen|buiten|mis|thuis|weer)(.{4,}en)$/); return m ? { prefix: m[1], rest: m[2] } : null; };
  L.wordForms = (nl, pos) => {
    const w0 = nl.toLowerCase().replace(/^(de|het|een|zich)\s+/, '').trim(); if (!w0 || w0.includes(' ')) return [w0];
    const sep = (pos === 'verb' || /en$/.test(w0)) && L.sepSplit(w0), w = sep ? sep.rest : w0;
    const forms = new Set([w]);
    if (sep) forms.add(w0);
    if (pos === 'verb' || /en$/.test(w)) {
      const st0 = w.replace(/en$/, ''), stems = new Set([st0]); // spelling changes: vrag -> vraag, lez -> lees, leev -> leef
      if (/[^aeiou][aeiou][^aeiou]$/.test(st0)) stems.add(st0.replace(/([aeiou])([^aeiou])$/, '$1$1$2'));
      for (const s of [...stems]) { if (/z$/.test(s)) stems.add(s.slice(0, -1) + 's'); if (/v$/.test(s)) stems.add(s.slice(0, -1) + 'f'); }
      for (const st of stems) if (st.length >= 2) [st, st + 't', st + 'e', st + 'en', st + 'te', st + 'ten', 'ge' + st + 't', 'ge' + st + 'd', 'ge' + st + 'en'].forEach((f) => forms.add(f));
    }
    if (pos !== 'verb') [w + 's', w + 'en', w + 'e', w + 't'].forEach((f) => forms.add(f));
    return [...forms];
  };
  // up to n sentences using the word, shortest first
  L.sentencesFor = (nl, pos, idx, sentences, n) => {
    const forms = L.wordForms(nl, pos), hit = new Set();
    if (forms.length === 1 && forms[0].includes(' ')) sentences.forEach((p, i) => { if (p[0].toLowerCase().includes(forms[0])) hit.add(i); });
    else for (const f of forms) for (const i of idx.get(f) || []) hit.add(i);
    const sep = L.sepSplit(nl); // a separable verb needs its little word in the sentence too ("... af")
    if (sep) for (const i of [...hit]) if (!(toks(sentences[i][0]).includes(sep.prefix) || toks(sentences[i][0]).includes(nl.toLowerCase().replace(/^(de|het|een|zich)\s+/, '')))) hit.delete(i);
    return [...hit].sort((a, b) => sentences[a][0].length - sentences[b][0].length).slice(0, n || 5).map((i) => sentences[i]);
  };
  // the words to underline in an example sentence (all forms of the word, and the little word of a separable verb)
  L.exampleForms = (nl, pos) => { const f = L.wordForms(nl, pos), sep = L.sepSplit(nl); return sep ? f.concat(sep.prefix) : f; };
  // Words from the frequency list (FREQ = [[dutch, english, rank], ...]) that are not in your list yet, within a rank band.
  L.suggestWords = (freq, words, known, lo, hi) => {
    const have = new Set(words.filter((w) => !w.deleted).map((w) => w.nl.toLowerCase().replace(/^(de|het|een|zich)\s+/, '')));
    const skip = new Set(known || []);
    return freq.filter((f) => f[2] > lo && f[2] <= hi && !have.has(f[0]) && !skip.has(f[0]));
  };

  // ---------- dictionary (Wiktionary: [word, type, article, forms, meanings]) ----------
  L.POS_NAMES = { n: 'noun', v: 'verb', a: 'adjective', d: 'adverb', p: 'preposition', c: 'conjunction', r: 'pronoun', e: 'determiner', i: 'interjection', u: 'number', t: 'article', h: 'phrase', x: 'particle' };
  L.POS_KEYS = { n: 'noun', v: 'verb' }; // what the Words page calls them
  // every form a lookup should find: the word, a noun's plural, a verb's past/participle and present forms, an adjective's comparative and superlative
  L.dictForms = (e) => {
    const out = [e[0].toLowerCase()], f = e[3] ? e[3].split(',') : [];
    if (e[1] === 'n' && f[0]) out.push(f[0].toLowerCase());
    if (e[1] === 'v') { f.slice(0, 2).forEach((x) => out.push(x.toLowerCase())); const w = e[0].toLowerCase(); if (/en$/.test(w) && f[0]) { const st = w.slice(0, -2); out.push(st, st + 't', st + 'en', f[0] + 'n'); } }
    if (e[1] === 'a') f.forEach((x) => out.push(x.toLowerCase()));
    return out;
  };
  L.buildDictIndex = (dict) => { const forms = new Map(); dict.forEach((e, i) => { for (const f of L.dictForms(e)) { const a = forms.get(f); if (a) { if (!a.includes(i)) a.push(i); } else forms.set(f, [i]); } }); return { forms }; };
  // Dutch or English lookup. Results: exact words first, then other forms of a word (plural, past tense...), then words starting with it, then English matches.
  L.dictSearch = (dict, ix, q, n) => {
    q = (q || '').toLowerCase().trim().replace(/^(de|het|een|to)\s+/, ''); if (q.length < 2) return [];
    n = n || 30; const out = [], seen = new Set(), add = (i, how) => { if (!seen.has(i) && out.length < n) { seen.add(i); out.push({ e: dict[i], how }); } };
    const rank = (i) => ('nvad'.indexOf(dict[i][1]) + 1 || 9);
    (ix.forms.get(q) || []).filter((i) => dict[i][0].toLowerCase() === q).sort((a, b) => rank(a) - rank(b)).forEach((i) => add(i, 'word'));
    (ix.forms.get(q) || []).sort((a, b) => rank(a) - rank(b)).forEach((i) => add(i, 'form'));
    if (q.length >= 3) for (let i = 0; i < dict.length && out.length < n; i++) if (dict[i][0].toLowerCase().startsWith(q)) add(i, 'prefix');
    // English: the closer the match is to the start of the meanings, and the shorter the word, the higher it ranks
    const eq = q.replace(/^tos+/, ''), hits = [];
    for (let i = 0; i < dict.length; i++) { const segs = dict[i][4].toLowerCase().split(/;s*/); let best = 99;
      segs.forEach((sg, k) => { const parts = sg.split(/,s*/).map((x) => x.replace(/^tos+/, '')); const j = parts.indexOf(eq); if (j >= 0) best = Math.min(best, k * 3 + j); else if (parts.some((x) => x.split(' ').includes(eq))) best = Math.min(best, 20 + k); });
      if (best < 99) hits.push([best, dict[i][0].length, i]); }
    hits.sort((x, y) => x[0] - y[0] || x[1] - y[1]).forEach((h) => add(h[2], 'english'));
    return out;
  };
  // an entry as a ready-to-add word
  L.dictToWord = (e) => ({ nl: e[0], en: e[4].split('; ').slice(0, 2).join('; '), article: e[2] === 'de' || e[2] === 'het' ? e[2] : '', pos: e[1] === 'n' ? 'noun' : e[1] === 'v' ? 'verb' : 'other' });

  // ---------- worksheets built from the downloaded data (no Claude needed) ----------
  L.LOCAL_TYPES = [['meaning', '🎯 Meanings'], ['article', '🔀 De / het'], ['cloze', '✏️ Fill the gap'], ['forms', '🔧 Verb forms'], ['order', '🧩 Word order']];
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((rnd || Math.random)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const shortEn = (en) => String(en || '').split(/[;,]/)[0].replace(/^to\s+/, 'to ').trim();
  // words you started or reviewed in the last few days
  L.recentWords = (words, today, days) => words.filter((w) => !w.deleted && ((w.reps > 0 && w.last && L.daysBetween(w.last, today) <= days) || (w.created && L.daysBetween(L.ymd(new Date(w.created)), today) <= days)));
  // words you miss: lapses first, then the lowest levels
  L.troubleWords = (words) => words.filter((w) => !w.deleted && w.reps > 0 && ((w.lapses || 0) > 0 || (w.box || 0) <= 1)).sort((a, b) => (b.lapses || 0) - (a.lapses || 0) || (a.box || 0) - (b.box || 0));
  // o: { pool: [{nl,en,article,pos}], types, count, dict, dix, sentences, six, rnd }. Returns a sheet in the same shape Claude's worksheets use.
  L.buildLocalSheet = (o) => {
    const rnd = o.rnd || Math.random, pool = o.pool || [], types = o.types && o.types.length ? o.types : L.LOCAL_TYPES.map((t) => t[0]), items = [], seenQ = new Set();
    if (!pool.length) return null;
    const entry = (w) => { const r = L.dictSearch(o.dict, o.dix, w.nl, 6).filter((x) => x.how === 'word'); return (r.find((x) => (w.pos === 'verb' ? x.e[1] === 'v' : w.pos === 'noun' ? x.e[1] === 'n' : true)) || r[0] || {}).e || null; };
    const wordsOf = (s) => s.replace(/[.!?]+$/, '').split(/\s+/);
    const make = {
      meaning: (w) => {
        const ans = shortEn(w.en); if (!ans) return null;
        const en0 = entry(w), ty = en0 ? en0[1] : w.pos === 'verb' ? 'v' : w.pos === 'noun' ? 'n' : null, opts = new Set([ans]); let tries = 0;
        while (opts.size < 4 && tries++ < 60) { const e = o.dict[Math.floor(rnd() * o.dict.length)]; const m = shortEn(e[4]); if (m && m.length < 30 && m.toLowerCase() !== ans.toLowerCase() && (!ty || e[1] === ty)) opts.add(m); }
        if (opts.size < 4) return null;
        return { type: 'mc', skill: 'vocabulary', q: 'What does "' + w.nl + '" mean?', options: shuffle([...opts], rnd), answer: ans, why: (w.article ? w.article + ' ' : '') + w.nl + ' = ' + w.en };
      },
      article: (w) => { const e = entry(w), art = /^(de|het)$/.test(w.article) ? w.article : e && /^(de|het)$/.test(e[2]) ? e[2] : ''; if (!art) return null; return { type: 'mc', skill: 'de/het', q: '___ ' + w.nl, options: ['de', 'het'], answer: art, why: art + ' ' + w.nl }; },
      cloze: (w) => {
        const forms = L.wordForms(w.nl, w.pos), cand = L.sentencesFor(w.nl, w.pos, o.six, o.sentences, 8);
        for (const [nl, en] of shuffle(cand, rnd)) {
          const m = nl.match(/[A-Za-zÀ-ÿ']+/g) || [], tok = m.find((t) => forms.includes(t.toLowerCase())); if (!tok) continue;
          const q = nl.replace(new RegExp('\\b' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), tok[0] + '_'.repeat(Math.max(2, tok.length - 1)));
          if (q === nl) continue;
          return { type: 'fill', skill: 'vocabulary', q: q, answer: tok, alt: [], why: nl + ' = ' + en };
        }
        return null;
      },
      forms: (w) => {
        const e = entry(w); if (!e || e[1] !== 'v' || !e[3]) return null; const f = e[3].split(','), past = f[0], part = f[1];
        if (past && (!part || rnd() < 0.5)) return { type: 'fill', skill: 'past tense', q: 'Past tense (ik): ' + e[0] + ' → ___', answer: past, alt: [], why: e[0] + ' – ' + past + ' – ' + (part || '?') + (f[2] ? ' (' + f[2] + ')' : '') };
        if (part) return { type: 'fill', skill: 'past tense', q: 'Past participle of "' + e[0] + '":  ik heb/ben ___', answer: part, alt: [], why: e[0] + ' – ' + (past || '?') + ' – ' + part + (f[2] ? ' (' + f[2] + ')' : '') };
        return null;
      },
      order: (w) => {
        const cand = L.sentencesFor(w.nl, w.pos, o.six, o.sentences, 12).filter((p) => { const n = wordsOf(p[0]).length; return n >= 4 && n <= 8; });
        if (!cand.length) return null;
        const [nl, en] = cand[Math.floor(rnd() * cand.length)], ws = wordsOf(nl);
        let sh = shuffle(ws, rnd), k = 0; while (sh.join(' ') === ws.join(' ') && k++ < 8) sh = shuffle(ws, rnd);
        return { type: 'order', skill: 'word order', q: 'Put in order: ' + sh.join(' / '), answer: ws.join(' '), alt: [], why: nl + ' = ' + en };
      },
    };
    const order = shuffle(pool, rnd);
    for (let i = 0; i < o.count * 6 && items.length < o.count; i++) {
      const w = order[i % order.length];
      for (let t = 0; t < types.length; t++) {
        const it = make[types[(i + t) % types.length]](w); if (!it || seenQ.has(it.q)) continue;
        seenQ.add(it.q); items.push(Object.assign(it, { id: String(items.length + 1), alt: it.alt || [], word: w.nl })); break;
      }
    }
    return items.length ? { title: 'Quick practice (' + items.length + ' items)', items, skipped: 0 } : null;
  };

  // ---------- mistakes review, reading texts and progress ----------
  // Words you missed in the last few days (flashcards, listening, worksheets), most missed first. log: [{ nl, d, s }]
  L.missedWords = (words, log, today, days) => {
    const cnt = new Map();
    for (const m of log || []) if (L.daysBetween(m.d, today) >= 0 && L.daysBetween(m.d, today) < (days || 7)) cnt.set(m.nl.toLowerCase(), (cnt.get(m.nl.toLowerCase()) || 0) + 1);
    return words.filter((w) => !w.deleted && cnt.has(w.nl.toLowerCase())).sort((a, b) => cnt.get(b.nl.toLowerCase()) - cnt.get(a.nl.toLowerCase()) || (a.box || 0) - (b.box || 0));
  };
  // sums a few counters over the 7 days ending today (offset 0) or the 7 days before that (offset 1)
  L.weekSum = (log, today, keys, offset) => {
    let n = 0; const end = -7 * (offset || 0);
    for (let i = 0; i < 7; i++) { const d = log[L.addDays(today, end - i)] || {}; for (const k of keys) n += d[k] || 0; }
    return n;
  };
  // right answers out of all answers recorded in a day (flashcards, listening and worksheets together); null if nothing recorded
  L.dayAccuracy = (d) => { d = d || {}; const ok = (d.cOk || 0) + (d.lOk || 0) + (d.sOk || 0), bad = (d.cMiss || 0) + (d.lMiss || 0) + (d.sMiss || 0); return ok + bad ? ok / (ok + bad) : null; };
  L.weekAccuracy = (log, today, offset) => {
    const ok = L.weekSum(log, today, ['cOk', 'lOk', 'sOk'], offset), bad = L.weekSum(log, today, ['cMiss', 'lMiss', 'sMiss'], offset);
    return ok + bad ? ok / (ok + bad) : null;
  };
  // today's snapshot of how many words you know (box 4+), started and own; one per day
  L.takeSnapshot = (snap, words, today) => { const live = words.filter((w) => !w.deleted); snap[today] = { learned: live.filter((w) => (w.box || 0) >= 4).length, started: live.filter((w) => w.reps > 0).length, total: live.length }; return snap[today]; };
  L.readingPrompt = (o) => {
    const len = { short: 'about 80 words', medium: 'about 150 words', long: 'about 250 words' }[o.length] || 'about 150 words';
    const lines = ['I am learning Dutch (A2 done, working on B1) with NT2school. Write me a Dutch reading text, ' + len + ', at ' + (o.level || 'B1') + ' level' + (o.topic ? ' about: ' + o.topic : ' on an everyday topic') + '.'];
    if (o.words && o.words.length) lines.push('Try to use these words naturally (I am learning them): ' + o.words.slice(0, 15).map((w) => w.nl).join(', ') + '.');
    if (o.note) lines.push('Also: ' + o.note);
    lines.push('Natural, real-sounding Dutch; split it into short paragraphs; no English inside the text; no word lists.');
    lines.push('Also write 3 multiple-choice comprehension questions IN DUTCH about the text, each with 3 options, and the correct answer must be one of the options exactly.');
    lines.push('Reply with ONLY this JSON in a code block, nothing else: {"reading":{"title":"Short Dutch title","text":"First paragraph.\\n\\nSecond paragraph.","questions":[{"q":"Vraag?","options":["A","B","C"],"answer":"B","why":"One short English sentence."}]}}');
    return lines.join('\n');
  };
  // Reads Claude's reply (or a plain pasted text). Returns { reading: { title, text, questions } } or { error }.
  L.parseReading = (raw) => {
    // some replies have real line breaks inside the quoted text: turn those into \n so the JSON can be read
    const fix = (x) => String(x || '').replace(/"(?:[^"\\]|\\.)*"/g, (m) => m.split('\r').join('').split('\n').join('\\n'));
    const j = [raw, fix(raw)].map((x) => L.extractJson(x)).find((c) => c && typeof (c.reading || c).text === 'string') || null, r = j && (j.reading || j);
    if (r && typeof r.text === 'string' && r.text.trim().length >= 20) {
      const questions = (Array.isArray(r.questions) ? r.questions : []).map((q, i) => ({ id: String(i + 1), type: 'mc', skill: 'vocabulary', q: String(q.q || q.question || '').trim(), options: (q.options || []).map(String), answer: String(q.answer == null ? '' : q.answer).trim(), alt: [], why: String(q.why || '').trim() }))
        .filter((q) => q.q && q.options.length >= 2 && q.options.includes(q.answer));
      return { reading: { title: String(r.title || 'Reading text').slice(0, 80), text: r.text.trim(), questions } };
    }
    const t = String(raw || '').trim();
    if (/^\s*(```[a-z]*\s*)?[{[]/.test(t) && /"(text|reading)"/.test(t)) return { error: 'That looks like JSON but I could not read it. Ask Claude to reply with the JSON again.' };
    if (t.length < 20) return { error: 'Paste a Dutch text first (at least a sentence or two).' };
    return { reading: { title: '', text: t.replace(/^```[a-z]*\n?|```$/g, '').trim(), questions: [] } };
  };
  // the words of a reading text as [{ w, i }] tokens plus plain text pieces, so the reader can make each word tappable
  L.tokenize = (text) => { const out = [], re = /[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*/g; let last = 0, m; while ((m = re.exec(text))) { if (m.index > last) out.push({ t: text.slice(last, m.index) }); out.push({ w: m[0] }); last = m.index + m[0].length; } if (last < text.length) out.push({ t: text.slice(last) }); return out; };
  // the sentence of a text that contains a word
  L.sentenceWith = (text, word) => { const re = new RegExp('(^|[^A-Za-zÀ-ÿ])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-zÀ-ÿ])', 'i'); return (text.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).find((s) => re.test(s)) || ''; };

  // ---------- seasons and holidays (from Varken board) ----------
  // winter, spring, summer or autumn (northern hemisphere, local time)
  function seasonOf(d) {
    const m = (d || new Date()).getMonth();
    return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  }
  // Easter Sunday by the usual Gregorian computus.
  function easterSunday(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
  }
  // A holiday look for the day, or ''. Christmas 18-25 Dec, Halloween 25-31 Oct, King's Day 27 Apr (26 if that is
  // a Sunday), Mother's/Father's Day, Prinsjesdag, Sint-Maarten, Bevrijdingsdag, Sinterklaas 3-5 Dec, New Year 30 Dec-1 Jan, Valentine 12-14 Feb, St Patrick, 4 July, Carnival, birthday 10 May, Thanksgiving (US: 4th Thursday of Nov) and the day before, Easter from Good Friday to Easter Monday.
  // The n-th given weekday (0 = Sunday) of a month, as a day number.
  const nthWeekday = (y, m, weekday, n) => 1 + ((weekday - new Date(y, m, 1).getDay() + 7) % 7) + 7 * (n - 1);
  function holidayOf(d) {
    const date = d || new Date(), y = date.getFullYear(), m = date.getMonth(), day = date.getDate();
    if (m === 11 && day >= 18 && day <= 25) return 'christmas';
    if (m === 9 && day >= 25) return 'halloween';
    if (m === 3 && day === (new Date(y, 3, 27).getDay() === 0 ? 26 : 27)) return 'kingsday';
    if (m === 10) {
      const fourth = 1 + ((4 - new Date(y, 10, 1).getDay() + 7) % 7) + 21;
      if (day === fourth || day === fourth - 1) return 'thanksgiving';
    }
    if (m === 4 && day === 10) return 'birthday'; // Lauren's
    if (m === 4 && day === 5) return 'bevrijding'; // Bevrijdingsdag
    if (m === 4 && day === nthWeekday(y, 4, 0, 2)) return 'mothersday'; // 2nd Sunday of May, the same in NL and the US
    if (m === 5 && day === nthWeekday(y, 5, 0, 3)) return 'fathersday'; // 3rd Sunday of June
    if (m === 8 && day === nthWeekday(y, 8, 2, 3)) return 'prinsjesdag'; // 3rd Tuesday of September
    if (m === 10 && day === 11) return 'sintmaarten';
    if (m === 11 && day >= 3 && day <= 5) return 'sinterklaas';
    if ((m === 11 && day >= 30) || (m === 0 && day === 1)) return 'newyear';
    if (m === 1 && day >= 12 && day <= 14) return 'valentine';
    if (m === 2 && day === 17) return 'stpatrick';
    if (m === 6 && (day === 3 || day === 4)) return 'fourth';
    const diff = Math.round((new Date(y, m, day) - easterSunday(y)) / 86400000);
    if (diff >= -50 && diff <= -47) return 'carnival'; // Saturday to Tuesday before Ash Wednesday
    return diff >= -2 && diff <= 1 ? 'easter' : '';
  }
  const lookOf = (d) => holidayOf(d) || seasonOf(d);
  L.seasonOf = seasonOf; L.holidayOf = holidayOf; L.lookOf = lookOf; L.easterSunday = easterSunday;

  // ---------- levels (XP) ----------
  // 99 levels, shaped like RuneScape: each level costs a little more than the last, and the cost doubles about every 7 levels, so the
  // last levels take most of the XP (level 92 is roughly halfway to 99). Cost of level n -> n+1 = 150 + 0.75 x 2^(n/7).
  L.MAX_LEVEL = 99;
  L.XP_TO = (() => { const t = [0, 0]; for (let n = 1; n < 99; n++) t[n + 1] = t[n] + Math.round(150 + 0.75 * Math.pow(2, n / 7)); return t; })(); // XP_TO[n] = total XP to reach level n
  // Dutch names spread over the 99 levels: [first level, Dutch name, English hint]
  L.LEVEL_NAMES = [[1, 'Zaadje', 'little seed'], [5, 'Kiem', 'sprout'], [10, 'Spruit', 'shoot'], [16, 'Scheut', 'new growth'], [22, 'Knop', 'bud'], [29, 'Bloempje', 'little flower'], [36, 'Boompje', 'little tree'], [43, 'Bosje', 'little grove'],
    [50, 'Taalvriend', 'language friend'], [57, 'Prater', 'chatterbox'], [64, 'Woordenheld', 'word hero'], [71, 'Taalheld', 'language hero'], [78, 'Taalridder', 'language knight'], [85, 'Taalmeester', 'language master'], [92, 'Taalkoning', 'language king'],
    [96, 'Taalfee', 'language fairy'], [99, 'Taallegende', 'language legend']];
  L.levelNeed = (level) => (level >= L.MAX_LEVEL ? 0 : L.XP_TO[level + 1] - L.XP_TO[level]); // XP to get from this level to the next
  L.levelTitle = (level) => { let n = L.LEVEL_NAMES[0]; for (const x of L.LEVEL_NAMES) if (level >= x[0]) n = x; return [n[1], n[2]]; };
  L.levelInfo = (xp) => {
    xp = Math.max(0, Math.floor(xp || 0)); let level = 1;
    while (level < L.MAX_LEVEL && xp >= L.XP_TO[level + 1]) level++;
    const max = level >= L.MAX_LEVEL, into = xp - L.XP_TO[level], need = L.levelNeed(level);
    return { level, into, need, pct: max ? 100 : Math.round((into / need) * 100), total: xp, title: L.levelTitle(level), max };
  };
  L.xpText = (info) => (info.max ? 'MAX LEVEL · ' + info.total.toLocaleString() + ' XP' : info.into.toLocaleString() + ' / ' + info.need.toLocaleString() + ' XP');
  // starting XP for someone who already practised: a bit for every card, listening answer and worksheet so far, plus every word you have
  L.xpFromHistory = (log, words) => {
    let xp = 0; // days since levels began count their real XP; older days get a small allowance for what you did
    for (const d of Object.values(log || {})) xp += d.xp != null ? d.xp : (d.reviews || 0) * 4 + (d.listen || 0) * 4 + (d.sheets || 0) * 15;
    return Math.round(xp + (words || []).filter((w) => !w.deleted && w.reps > 0).length); // a little for every word you have started
  };

  // How Bigg reacts after a flashcard is graded. grade: 'again' | 'good' | 'easy'; streak = right answers in a row (this one included);
  // done = cards graded so far; total = cards in the session now. Returns { kind (a COACH list), act (an animation), burst (emoji to float up) }.
  L.coachMoment = ({ grade, streak, done, total, rnd }) => {
    rnd = rnd || Math.random;
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    if (grade === 'again') return { kind: 'again', act: 'sway', burst: '' };
    if (streak === 3) return { kind: 'streak3', act: 'cheer', burst: '⭐' };
    if (streak === 5) return { kind: 'streak5', act: 'spin', burst: '🔥' };
    if (streak >= 8 && streak % 4 === 0) return { kind: 'streak8', act: 'cheer', burst: '🎉' };
    if (total - done === 1) return { kind: 'last', act: 'hop', burst: '' };
    if (total >= 6 && done === Math.floor(total / 2)) return { kind: 'half', act: 'wiggle', burst: '✨' };
    return { kind: 'right', act: pick(['hop', 'wiggle', 'nod', 'bounce', 'twirl', 'wave']), burst: rnd() < 0.35 ? '💗' : '' };
  };

  // Rough size of a prompt in Claude tokens (about 3.6 characters each for mixed Dutch and English). An estimate, not a count.
  L.estimateTokens = (text) => Math.ceil(String(text || '').length / 3.6);

  // ---------- random helpers ----------
  L.shuffle = (arr, rnd) => { rnd = rnd || Math.random; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  L.pick = (arr, n, rnd) => L.shuffle(arr, rnd).slice(0, n);

  // ---------- import / paste parsing ----------
  // One word per line: "de afspraak = appointment", "afspraak; appointment", "afspraak<TAB>appointment", "afspraak - appointment | example sentence"
  L.parseVocab = (text) => {
    const out = [];
    for (let line of String(text || '').split(/\r?\n/)) {
      line = line.trim(); if (!line || line.startsWith('#')) continue;
      let example = '';
      const bar = line.split('|'); if (bar.length > 1) { line = bar[0].trim(); example = bar.slice(1).join('|').trim(); }
      const parts = line.split(/\t|\s=\s|=|;|\s[-–—]\s/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      let nl = parts[0], en = parts.slice(1).join('; ');
      let article = ''; const m = nl.match(/^(de|het)\s+(.+)$/i);
      if (m) { article = m[1].toLowerCase(); nl = m[2]; }
      out.push(L.newWord({ nl, en, article, pos: article ? 'noun' : /^(zich\s)?\S+en$/.test(nl) ? 'verb' : 'other', example }));
    }
    return out;
  };
  // Merge incoming words: skip ones we already have (same nl, case-insensitive); returns { words, added, skipped }.
  L.mergeWords = (have, incoming) => {
    const seen = new Set(have.filter((w) => !w.deleted).map((w) => w.nl.toLowerCase()));
    const words = have.slice(); let added = 0, skipped = 0;
    for (const w of incoming) {
      if (!w.nl || seen.has(w.nl.toLowerCase())) { skipped++; continue; }
      seen.add(w.nl.toLowerCase()); words.push(L.newWord(w)); added++;
    }
    return { words, added, skipped };
  };
  // JSON the user got from Claude: { words: [{nl,en,article,example}], lessons: [{title,due,notes}] } (or just an array of words)
  // A list copied from a course page: each word on its own line (often after "Start" and a tab), a blank line, then its English on the next line:
  //   afmaken <tab>  /  (blank)  /  to finish  /  Start <tab> bijkomen <tab>  /  (blank)  /  to recuperate ...
  L.looksLikeListing = (text) => /^\s*Start[ \t]+\S/mi.test(text) || /^\s*Start\s*$/mi.test(text) || /\t[ \t]*\r?\n[ \t]*\r?\n[ \t]*\S/.test(text);
  L.parseListing = (text) => {
    const lines = String(text || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').split('\n')
      .map((s) => s.replace(/^\s*Start(?:[ \t]+|$)/i, '').trim()).filter(Boolean); // drop the "Start" prefix, tabs and blank lines
    const out = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      let nl = lines[i], en = lines[i + 1], article = '';
      const m = nl.match(/^(de|het)\s+(.+)$/i);
      if (m) { article = m[1].toLowerCase(); nl = m[2]; }
      out.push(L.newWord({ nl, en, article, pos: article ? 'noun' : /^(zich\s)?\S+en$/.test(nl) ? 'verb' : 'other' }));
    }
    out.leftover = lines.length % 2; // a last line without a partner
    return out;
  };
  L.parseImport = (text) => {
    let j = L.extractJson(text);
    if (!j) return { words: L.looksLikeListing(text) ? L.parseListing(text) : L.parseVocab(text), lessons: [] };
    if (Array.isArray(j)) j = { words: j };
    const words = (j.words || []).filter((w) => w && w.nl && w.en).map((w) => ({ nl: String(w.nl), en: String(w.en), article: /^(de|het)$/.test(w.article || '') ? w.article : '', pos: w.pos || (w.article ? 'noun' : 'other'), example: w.example || '', exampleEn: w.exampleEn || '', lesson: w.lesson || '' }));
    const lessons = (j.lessons || []).filter((l) => l && l.title).map((l) => ({ title: String(l.title), due: l.due || '', notes: l.notes || '', status: l.status || 'todo' }));
    return { words, lessons };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
