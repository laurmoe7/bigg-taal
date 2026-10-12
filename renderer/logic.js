// Pure rules for BiggTaal (no DOM), shared by the app and the tests.
(function (root) {
  const L = {};

  // ---------- dates ----------
  L.ymd = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  L.addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return L.ymd(new Date(y, m - 1, d + n)); };
  L.daysBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  L.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- state ----------
  L.defaultSettings = () => ({ dailyGoal: 10, newPerDay: 10, autoUpdate: true, rate: 0.9, voice: '', login: false, sound: true });
  L.emptyState = () => ({ v: 1, words: [], lessons: [], log: {}, settings: L.defaultSettings(), seeded: false });
  L.fixState = (s) => {
    const e = L.emptyState();
    s = Object.assign(e, s || {});
    s.settings = Object.assign(L.defaultSettings(), s.settings || {});
    s.words = s.words || []; s.lessons = s.lessons || []; s.log = s.log || {}; s.sheets = s.sheets || []; s.skills = s.skills || {};
    return s;
  };

  // ---------- spaced repetition (Leitner boxes) ----------
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
  // grade: 'again' | 'good' | 'easy'
  L.grade = (w, grade, today) => {
    const n = Object.assign({}, w);
    n.reps = (w.reps || 0) + 1;
    if (grade === 'again') { n.box = 0; n.lapses = (w.lapses || 0) + 1; n.due = today; }
    else {
      n.box = Math.min(L.INTERVALS.length - 1, (w.box || 0) + (grade === 'easy' ? 2 : 1));
      n.due = L.addDays(today, L.INTERVALS[n.box]);
    }
    return n;
  };
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

  // Rough size of a prompt in Claude tokens (about 3.6 characters each for mixed Dutch and English). An estimate, not a count.
  L.estimateTokens = (text) => Math.ceil(String(text || '').length / 3.6);

  // ---------- random helpers ----------
  L.shuffle = (arr, rnd) => { rnd = rnd || Math.random; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  L.pick = (arr, n, rnd) => L.shuffle(arr, rnd).slice(0, n);

  // ---------- worksheets ----------
  // Each section: { title, hint, items: [{ q, a }] }; answers are shown only on the key.
  const blank = (sentence, word) => {
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return re.test(sentence) ? sentence.replace(re, '________') : null;
  };
  L.scramble = (sentence, rnd) => {
    const words = sentence.replace(/[.!?]+$/, '').split(/\s+/);
    if (words.length < 3) return null;
    let s = words, tries = 0;
    do { s = L.shuffle(words, rnd); } while (s.join(' ') === words.join(' ') && ++tries < 8);
    return s.join(' / ');
  };
  L.makeWorksheet = (words, verbs, kinds, count, rnd) => {
    const live = words.filter((w) => !w.deleted);
    const sections = [];
    const nouns = live.filter((w) => w.article === 'de' || w.article === 'het');
    if (kinds.includes('article') && nouns.length) {
      sections.push({ title: 'De or het?', hint: 'Write the right article.', items: L.pick(nouns, count, rnd).map((w) => ({ q: '____ ' + w.nl, a: w.article + ' ' + w.nl })) });
    }
    if (kinds.includes('blank')) {
      const items = [];
      for (const w of L.shuffle(live.filter((x) => x.example), rnd)) {
        const q = blank(w.example, w.nl.replace(/^(zich )/, ''));
        if (q) items.push({ q: q + (w.en ? '   (' + w.en + ')' : ''), a: w.example });
        if (items.length >= count) break;
      }
      if (items.length) sections.push({ title: 'Fill in the blank', hint: 'Use the word in brackets as a clue. The form may change.', items });
    }
    if (kinds.includes('nl-en')) sections.push({ title: 'Dutch to English', hint: 'Translate.', items: L.pick(live, count, rnd).map((w) => ({ q: (w.article ? w.article + ' ' : '') + w.nl, a: w.en })) });
    if (kinds.includes('en-nl')) sections.push({ title: 'English to Dutch', hint: 'Translate, with de/het for nouns.', items: L.pick(live, count, rnd).map((w) => ({ q: w.en, a: (w.article ? w.article + ' ' : '') + w.nl })) });
    if (kinds.includes('order')) {
      const items = [];
      for (const w of L.shuffle(live.filter((x) => x.example), rnd)) {
        const q = L.scramble(w.example, rnd);
        if (q) items.push({ q, a: w.example });
        if (items.length >= Math.max(3, Math.round(count / 2))) break;
      }
      if (items.length) sections.push({ title: 'Put the words in order', hint: 'Write the full sentence. Remember: the verb is second in a main clause and last in a clause with omdat/dat/hoewel.', items });
    }
    if (kinds.includes('verbs') && verbs.length) {
      sections.push({ title: 'Verbs: present, past and perfect', hint: 'Fill in all the forms.', verbs: true, items: L.pick(verbs, Math.min(count, 10), rnd).map((v) => ({ q: v.inf + ' (' + v.en + ')', a: [v.ik, v.hij, v.sg, v.pl, v.perf].join('  |  '), v })) });
    }
    return sections;
  };
  L.worksheetHtml = (sections, withKey, title) => {
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let n = 0;
    const body = (key) => sections.map((s) => {
      let h = `<h2>${esc(s.title)}</h2><p class="hint">${esc(s.hint)}</p>`;
      if (s.verbs) {
        h += '<table><tr><th>Infinitive</th><th>ik</th><th>hij/zij</th><th>Past sg</th><th>Past pl</th><th>Perfect</th></tr>' +
          s.items.map((i) => key
            ? `<tr><td>${esc(i.q)}</td><td>${esc(i.v.ik)}</td><td>${esc(i.v.hij)}</td><td>${esc(i.v.sg)}</td><td>${esc(i.v.pl)}</td><td>${esc(i.v.perf)}</td></tr>`
            : `<tr><td>${esc(i.q)}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('') + '</table>';
      } else {
        h += '<ol>' + s.items.map((i) => `<li><span class="q">${esc(i.q)}</span>${key ? `<span class="a">${esc(i.a)}</span>` : '<span class="line"></span>'}</li>`).join('') + '</ol>';
      }
      return h;
    }).join('');
    n = sections.reduce((a, s) => a + s.items.length, 0);
    const css = 'body{font:14px/1.5 Segoe UI,Arial,sans-serif;color:#222;margin:0}h1{font-size:22px;margin:0 0 2px}h2{font-size:16px;margin:18px 0 2px;color:#d4574a}.hint{margin:0 0 6px;color:#777;font-size:12px}ol{padding-left:22px}li{margin:7px 0}.q{display:block}.line{display:block;border-bottom:1px solid #999;height:20px}.a{display:block;color:#1d7a55;font-weight:600}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:6px 5px;font-size:12px;text-align:left;height:24px}th{background:#fde8e3}.meta{color:#777;font-size:12px;margin-bottom:6px}.pb{page-break-before:always}';
    return `<!doctype html><meta charset="utf-8"><title>${esc(title || 'BiggTaal worksheet')}</title><style>${css}</style>` +
      `<h1>🌸 ${esc(title || 'BiggTaal worksheet')}</h1><div class="meta">Name: ______________  Date: ${L.ymd()}  ·  ${n} questions</div>` + body(false) +
      (withKey ? `<div class="pb"></div><h1>Answer key</h1>` + body(true) : '');
  };

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
  L.parseImport = (text) => {
    let j = L.extractJson(text);
    if (!j) return { words: L.parseVocab(text), lessons: [] };
    if (Array.isArray(j)) j = { words: j };
    const words = (j.words || []).filter((w) => w && w.nl && w.en).map((w) => ({ nl: String(w.nl), en: String(w.en), article: /^(de|het)$/.test(w.article || '') ? w.article : '', pos: w.pos || (w.article ? 'noun' : 'other'), example: w.example || '', exampleEn: w.exampleEn || '', lesson: w.lesson || '' }));
    const lessons = (j.lessons || []).filter((l) => l && l.title).map((l) => ({ title: String(l.title), due: l.due || '', notes: l.notes || '', status: l.status || 'todo' }));
    return { words, lessons };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
