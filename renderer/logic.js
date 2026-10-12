// Pure rules for BiggTaal (no DOM), shared by the app and the tests.
(function (root) {
  const L = {};

  // ---------- dates ----------
  L.ymd = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  L.addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return L.ymd(new Date(y, m - 1, d + n)); };
  L.daysBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
  L.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- state ----------
  L.defaultSettings = () => ({ reminderTime: '19:00', remindersOn: true, dailyGoal: 10, newPerDay: 10, autoUpdate: true, rate: 0.9, voice: '', tray: false, login: false, sound: true });
  L.emptyState = () => ({ v: 1, words: [], lessons: [], log: {}, settings: L.defaultSettings(), seeded: false });
  L.fixState = (s) => {
    const e = L.emptyState();
    s = Object.assign(e, s || {});
    s.settings = Object.assign(L.defaultSettings(), s.settings || {});
    s.words = s.words || []; s.lessons = s.lessons || []; s.log = s.log || {};
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
    let j; try { j = JSON.parse(text); } catch { return { words: L.parseVocab(text), lessons: [] }; }
    if (Array.isArray(j)) j = { words: j };
    const words = (j.words || []).filter((w) => w && w.nl && w.en).map((w) => ({ nl: String(w.nl), en: String(w.en), article: /^(de|het)$/.test(w.article || '') ? w.article : '', pos: w.pos || (w.article ? 'noun' : 'other'), example: w.example || '', exampleEn: w.exampleEn || '', lesson: w.lesson || '' }));
    const lessons = (j.lessons || []).filter((l) => l && l.title).map((l) => ({ title: String(l.title), due: l.due || '', notes: l.notes || '', status: l.status || 'todo' }));
    return { words, lessons };
  };

  // Candidate new words from a pasted lesson text: frequent, not known, not tiny, not common function words.
  const STOP = new Set('de het een en of maar dat die dit deze ik jij je hij zij ze wij we jullie u mijn jouw zijn haar ons onze hun niet geen wel ook nog al nu dan toen hier daar waar wat wie hoe waarom als omdat want dus er is ben bent was waren heb hebt heeft had hadden wordt werd worden zal zou kan kon moet moest wil wilde mag met voor naar van uit bij op in aan om door over onder tot tegen zonder tussen naast na te zo erg heel zeer meer meest veel weinig alle alles iets niets iemand ieder elk elke dat dan'.split(/\s+/));
  L.candidates = (text, words, max) => {
    const known = new Set(words.map((w) => w.nl.toLowerCase()));
    const count = new Map();
    for (const t of String(text || '').toLowerCase().match(/[a-zà-ÿ'’-]{4,}/g) || []) {
      if (STOP.has(t) || known.has(t)) continue;
      count.set(t, (count.get(t) || 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, max || 40).map(([w, n]) => ({ w, n }));
  };

  // Prompt to paste into Claude so it turns a lesson into an importable file.
  L.claudePrompt = (lessonTitle, text) =>
    `I'm learning Dutch (A2 done, working on B1) with the NT2school lesson "${lessonTitle}". Below is the lesson text. ` +
    `Please (1) explain anything tricky in simple English, then (2) give me the useful new vocabulary as JSON I can import into my BiggTaal app, in exactly this shape: ` +
    `{"words":[{"nl":"afspraak","en":"appointment","article":"de","pos":"noun","example":"Ik heb morgen een afspraak.","exampleEn":"I have an appointment tomorrow.","lesson":"${lessonTitle}"}]}. ` +
    `Use "article" only for nouns ("de" or "het", otherwise ""). Keep examples short and B1 level.\n\n---\n${text}`;

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
