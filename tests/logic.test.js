const test = require('node:test');
const assert = require('node:assert');
const L = require('../renderer/logic.js');

test('FSRS: first reviews, then a lapse', () => {
  const w = L.newWord({ nl: 'huis', en: 'house' });
  const a = L.grade(w, 'good', '2026-10-12');
  assert.equal(a.due, '2026-10-15'); assert.equal(a.box, 2); assert.equal(a.reps, 1); // first Good: 3 days
  const e = L.grade(w, 'easy', '2026-10-12'); assert.ok(e.stab > a.stab);
  const b = L.grade(a, 'good', '2026-10-15');
  assert.ok(b.stab > a.stab * 1.5, 'stability grows after a successful review'); assert.ok(b.due > a.due);
  const c = L.grade(b, 'again', b.due);
  assert.equal(c.box, 0); assert.equal(c.due, b.due); assert.equal(c.lapses, 1); assert.ok(c.stab < b.stab);
  const aw = L.grade(w, 'again', '2026-10-12'); assert.equal(aw.due, '2026-10-12');
});
test('FSRS: reviewing late helps more than early; old Leitner words carry over', () => {
  const a = L.grade(L.newWord({ nl: 'x', en: 'y' }), 'good', '2026-10-12');
  const early = L.grade(a, 'good', '2026-10-13'), late = L.grade(a, 'good', '2026-10-25');
  assert.ok(late.stab > early.stab);
  const old = L.newWord({ nl: 'o', en: 'o', box: 4, reps: 5, due: '2026-10-20' }); // 8-day box, last seen 10-12
  const n = L.grade(old, 'good', '2026-10-20'); assert.ok(n.stab > 8 && n.box >= 4);
  assert.equal(L.previewIntervals(L.newWord({}), '2026-10-12').good, 3);
});
test('box never exceeds the top level', () => {
  const w = L.grade(L.newWord({ nl: 'x', en: 'y', box: 7, reps: 9, stab: 5000, last: '2025-01-01', due: '2025-01-02' }), 'easy', '2026-01-01');
  assert.ok(w.box <= 7 && w.due <= L.addDays('2026-01-01', 365));
});

test('dueWords: new and past-due only, deleted skipped', () => {
  const ws = [L.newWord({ nl: 'a', en: 'a' }), L.newWord({ nl: 'b', en: 'b', due: '2026-12-01' }), L.newWord({ nl: 'c', en: 'c', deleted: true })];
  assert.deepEqual(L.dueWords(ws, '2026-10-12').map((w) => w.nl), ['a']);
});

test('streak: counts back, today not yet studied does not break it', () => {
  const log = { '2026-10-10': { reviews: 3 }, '2026-10-11': { reviews: 1 } };
  assert.equal(L.streak(log, '2026-10-12'), 2);
  log['2026-10-12'] = { reviews: 1 };
  assert.equal(L.streak(log, '2026-10-12'), 3);
  assert.equal(L.streak({}, '2026-10-12'), 0);
});

test('check: exact, accent-insensitive, typo, alternatives, wrong', () => {
  assert.equal(L.check('appointment', 'appointment'), 'right');
  assert.equal(L.check('Appointment', 'appointment'), 'right');
  assert.equal(L.check('appointmant', 'appointment'), 'close');
  assert.equal(L.check('cafe', 'café'), 'close');
  assert.equal(L.check('to explain', 'to explain / to clarify'), 'right');
  assert.equal(L.check('to clarify', 'to explain / to clarify'), 'right');
  assert.equal(L.check('wage', 'wage, salary'), 'right'); // one of several meanings is enough
  assert.equal(L.check('Salary', 'wage, salary'), 'right');
  assert.equal(L.check('salery', 'wage, salary'), 'close');
  assert.equal(L.check('run', 'to run (fast, slow)'), 'wrong'); // a comma inside brackets is a note, not a second meaning
  assert.equal(L.check('to run', 'to run (fast, slow)'), 'right');
  assert.equal(L.check('fast', 'to run (fast, slow)'), 'wrong');
  assert.equal(L.check('house', 'appointment'), 'wrong');
  assert.equal(L.check('', 'x'), 'wrong');
  assert.equal(L.check('cat', 'cut'), 'wrong'); // short words: no typo forgiveness
});

test('parseVocab handles the common separators and examples', () => {
  const r = L.parseVocab('de afspraak = appointment | Ik heb een afspraak.\nverhuizen; to move house\nhet huis\thouse\n# comment\njunk');
  assert.equal(r.length, 3);
  assert.deepEqual([r[0].nl, r[0].article, r[0].en, r[0].example], ['afspraak', 'de', 'appointment', 'Ik heb een afspraak.']);
  assert.equal(r[1].pos, 'verb');
  assert.equal(r[2].article, 'het');
});

test('seed words all parse', () => {
  const src = require('fs').readFileSync(__dirname + '/../renderer/seed.js', 'utf8');
  const m = src.match(/const SEED_WORDS = `([\s\S]*?)`;/);
  const lines = m[1].split('\n').filter((l) => l.trim());
  const ws = L.parseVocab(m[1]);
  assert.equal(ws.length, lines.length);
  for (const w of ws) { assert.ok(w.nl && w.en, w.nl); assert.ok(w.example, w.nl); }
});

test('mergeWords skips duplicates', () => {
  const have = [L.newWord({ nl: 'Huis', en: 'house' })];
  const r = L.mergeWords(have, [{ nl: 'huis', en: 'house' }, { nl: 'boom', en: 'tree' }, { nl: 'boom', en: 'tree' }]);
  assert.equal(r.added, 1); assert.equal(r.skipped, 2); assert.equal(r.words.length, 2);
});

test('parseImport: JSON from Claude, bare array, plain text fallback', () => {
  const j = L.parseImport('{"words":[{"nl":"afspraak","en":"appointment","article":"de"},{"nl":"x"}],"lessons":[{"title":"Les 5","due":"2026-10-20"}]}');
  assert.equal(j.words.length, 1); assert.equal(j.words[0].pos, 'noun'); assert.equal(j.lessons[0].title, 'Les 5');
  assert.equal(L.parseImport('[{"nl":"a","en":"b"}]').words.length, 1);
  assert.equal(L.parseImport('huis = house').words.length, 1);
});

test('fixState fills defaults', () => {
  const s = L.fixState({ words: [1], settings: { dailyGoal: 5 } });
  assert.equal(s.settings.dailyGoal, 5); assert.equal(s.settings.newPerDay, 10); assert.deepEqual(s.lessons, []);
});

test('queue: due reviews plus a capped number of new words', () => {
  const ws = [];
  for (let i = 0; i < 30; i++) ws.push(L.newWord({ nl: 'n' + i, en: 'x' }));
  ws.push(L.newWord({ nl: 'r1', en: 'x', reps: 2, due: '2026-10-11', box: 2 }), L.newWord({ nl: 'r2', en: 'x', reps: 2, due: '2026-11-01', box: 2 }));
  assert.equal(L.queue(ws, '2026-10-12', 10, 0).length, 11);
  assert.equal(L.queue(ws, '2026-10-12', 10, 4).length, 7);
  assert.equal(L.queue(ws, '2026-10-12', 10, 10).length, 1);
  assert.equal(L.queue(ws, '2026-10-12', 0, 0)[0].nl, 'r1');
});

test('soundTags finds the confusion behind a misspelling', () => {
  assert.deepEqual(L.soundTags('tijd', 'teid'), ['ij-ei']);
  assert.deepEqual(L.soundTags('huis', 'heus'), ['eu-ui']);
  assert.ok(L.soundTags('hond', 'hont').includes('dt'));
  assert.ok(L.soundTags('maan', 'man').includes('long-short'));
  assert.ok(L.soundTags('kappen', 'kapen').includes('dbl'));
  assert.deepEqual(L.soundTags('boek', 'boek'), []);
  assert.deepEqual(L.soundTags('appel', 'zebra'), []);
});

test('diffWords: ok, close, missed and extra words', () => {
  const d = L.diffWords('Ik heb morgen een afspraak met de dokter.', 'ik heb morgen een afspraek met dokter');
  const st = Object.fromEntries(d.words.map((w) => [w.w, w.status]));
  assert.equal(st.Ik, 'ok'); assert.equal(st.afspraak, 'close'); assert.equal(st.de, 'missed'); assert.equal(st.dokter, 'ok');
  assert.equal(d.result, 'close');
  assert.equal(L.diffWords('Het huis is groot.', 'het huis is groot').result, 'right');
  assert.equal(L.diffWords('Het huis is groot.', 'banaan').result, 'wrong');
  assert.equal(L.diffWords('Het huis is groot.', 'het huis is erg groot').result, 'close');
});

test('letterDiff marks the letters that were not typed right', () => {
  const d = L.letterDiff('tijd', 'teid');
  assert.deepEqual(d.cells.map((c) => c.ok), [true, false, false, true]);
  assert.deepEqual(L.letterDiff('café', 'cafe').cells.every((c) => c.ok), true);
  const e = L.letterDiff('huis', 'huiis'); assert.equal(e.extra.join(''), 'i'); assert.ok(e.cells.every((c) => c.ok));
});

test('hintText and soundWords', () => {
  assert.equal(L.hintText('Het huis', 1), '___  ____');
  assert.equal(L.hintText('Het huis', 2), 'H__  h___');
  const ws = [L.newWord({ nl: 'tijd', en: 't' }), L.newWord({ nl: 'boek', en: 'b' }), L.newWord({ nl: 'de trein', article: 'de', en: 't' })];
  assert.deepEqual(L.soundWords(ws, 'ij-ei').map((w) => w.nl), ['tijd', 'de trein']);
});

test('extractJson pulls JSON out of a whole reply', () => {
  const reply = 'Sure! Here you go:\n```json\n{"words":[{"nl":"huurder","en":"tenant","article":"de"}]}\n```\nHope it helps {not json}.';
  assert.equal(L.extractJson(reply).words[0].nl, 'huurder');
  assert.equal(L.extractJson('Intro text {"words":[{"nl":"a","en":"b"}]} outro').words.length, 1);
  assert.equal(L.extractJson('no json here, only [brackets] and {braces}'), null);
  assert.equal(L.parseImport(reply).words[0].en, 'tenant');
  assert.equal(L.parseImport('huis = house').words.length, 1);
});

test('estimateTokens is a rough size', () => { assert.equal(L.estimateTokens(''), 0); assert.equal(L.estimateTokens('x'.repeat(360)), 100); assert.ok(L.estimateTokens(L.sheetPrompt({ count: 8 })) > 200); });

const SHEET_REPLY = 'Here you go!\n```json\n' + JSON.stringify({ worksheet: { title: 'Les 12 practice', items: [
  { type: 'mc', skill: 'de/het', q: '___ huis is groot.', options: ['De', 'Het'], answer: 'Het', why: 'huis is het.' },
  { type: 'fill', skill: 'Past tense', q: 'Gisteren ___ ik naar huis. (gaan)', answer: 'ging', alt: [] },
  { type: 'translate', skill: 'word order', q: 'Tomorrow I have an appointment.', answer: 'Morgen heb ik een afspraak.', alt: ['Ik heb morgen een afspraak.'] },
  { type: 'mc', q: 'bad item, answer not in options', options: ['a', 'b'], answer: 'c' },
  { type: 'quiz', q: 'unknown type', answer: 'x' },
  { type: 'write', skill: 'vocabulary', q: 'Write two sentences about your day.', answer: 'Ik werk en ik leer Nederlands.' },
] } }) + '\n```';

test('normSkill maps free text to known skills', () => {
  assert.equal(L.normSkill('Word Order'), 'word order'); assert.equal(L.normSkill('de/het'), 'de/het'); assert.equal(L.normSkill('definite articles'), 'de/het');
  assert.equal(L.normSkill('Past tense (perfect)'), 'past tense'); assert.equal(L.normSkill('adjective endings'), 'adjectives'); assert.equal(L.normSkill('subordinate clause'), 'connectors');
  assert.equal(L.normSkill('separable verb'), 'separable verbs'); assert.equal(L.normSkill('banana'), 'other'); assert.equal(L.normSkill(''), 'other');
});

test('parseSheet reads a worksheet and drops unusable items', () => {
  const r = L.parseSheet(SHEET_REPLY);
  assert.ok(r.sheet); assert.equal(r.sheet.title, 'Les 12 practice'); assert.equal(r.sheet.items.length, 4); assert.equal(r.sheet.skipped, 2);
  assert.deepEqual(r.sheet.items.map((i) => i.id), ['1', '2', '3', '4']); assert.equal(r.sheet.items[1].skill, 'past tense'); assert.equal(r.sheet.items[3].type, 'write');
  assert.ok(L.parseSheet('no json').error); assert.ok(L.parseSheet('{"worksheet":{"items":[]}}').error);
});

test('autoMark: mc and fill are final, open items need checking', () => {
  const [mc, fill, tr, wr] = L.parseSheet(SHEET_REPLY).sheet.items;
  assert.deepEqual(L.autoMark(mc, 'Het'), { verdict: 'right', final: true }); assert.equal(L.autoMark(mc, 'De').verdict, 'wrong');
  assert.equal(L.autoMark(fill, 'ging').verdict, 'right'); assert.equal(L.autoMark(fill, 'ga').verdict, 'wrong'); assert.equal(L.autoMark({ type: 'fill', answer: 'werkte', alt: [] }, 'werkter').verdict, 'close');
  assert.equal(L.autoMark(tr, 'ik heb morgen een afspraak').verdict, 'right'); assert.equal(L.autoMark(tr, 'Morgen ik heb een afspraak').verdict, 'unsure');
  assert.equal(L.autoMark(wr, 'Ik werk.').verdict, 'unsure'); assert.equal(L.autoMark(fill, '  ').verdict, 'blank');
});

test('recordOutcome and weakSkills track accuracy per skill', () => {
  const sk = {};
  L.recordOutcome(sk, 'word order', false, { q: 'q1', yours: 'a', correct: 'b' }, '2026-10-12');
  L.recordOutcome(sk, 'word order', false, null); L.recordOutcome(sk, 'word order', true);
  L.recordOutcome(sk, 'de/het', true); L.recordOutcome(sk, 'de/het', true);
  L.recordOutcome(sk, 'spelling', false);
  const w = L.weakSkills(sk, 3);
  assert.deepEqual(w.map((x) => x.skill), ['word order', 'spelling']); assert.equal(w[0].wrong, 2); assert.equal(w[0].total, 3); assert.equal(w[0].examples[0].yours, 'a');
  for (let i = 0; i < 40; i++) L.recordOutcome(sk, 'verb forms', i % 2);
  assert.equal(sk['verb forms'].hist.length, 30);
});

test('sheetPrompt and checkPrompt carry what Claude needs', () => {
  const p = L.sheetPrompt({ count: 10, topics: ['Work & jobs', 'Health & the doctor'], grammar: ['word order', 'de/het'], words: [{ nl: 'huurder', en: 'tenant' }], weak: [{ skill: 'word order', wrong: 5, total: 8, examples: [{ yours: 'Morgen ik heb', correct: 'Morgen heb ik' }] }], note: 'keep it short' });
  assert.ok(p.includes('10 items') && p.includes('Topics to include') && p.includes('Work & jobs, Health & the doctor') && p.includes('Grammar to include') && p.includes('Word order, De / het') && p.includes('huurder (tenant)') && p.includes('Word order: missed 5 of my last 8') && p.includes('Morgen ik heb') && p.includes('keep it short') && p.includes('"worksheet"'));
  assert.ok(!L.sheetPrompt({ count: 8 }).includes('Topics to include'));
  const sheet = Object.assign(L.parseSheet(SHEET_REPLY).sheet, { answers: { 1: 'Het', 3: 'Morgen ik heb een afspraak' }, results: { 1: { verdict: 'right' }, 3: { verdict: 'unsure' } } });
  const c = L.checkPrompt(sheet);
  assert.ok(c.includes('1. [auto: right]') && c.includes('3. [CHECK]') && c.includes('Morgen ik heb een afspraak') && c.includes('(left blank)') && c.includes('"summary"'));
});

test('parseFeedback reads the marking and the summary', () => {
  const sheet = L.parseSheet(SHEET_REPLY).sheet;
  const reply = 'Nice work!\n```json\n{"results":[{"id":"3","verdict":"partly","correct":"Morgen heb ik een afspraak.","explain":"Verb second.","skills":["Word order"]},{"id":"99","verdict":"right"}],"summary":{"good":"Good de/het.","improve":["Verb second after Morgen"],"next":"Word order"}}\n```';
  const f = L.parseFeedback(reply, sheet);
  assert.equal(Object.keys(f.results).length, 1); assert.equal(f.results['3'].verdict, 'partly'); assert.deepEqual(f.results['3'].skills, ['word order']);
  assert.equal(f.summary.improve[0], 'Verb second after Morgen');
  assert.ok(L.parseFeedback('hello', sheet).error);
  assert.deepEqual(L.sheetScore({ items: sheet.items, results: { 1: { verdict: 'right' }, 2: { verdict: 'close' }, 3: { verdict: 'unsure' } } }), { got: 1.75, of: 4, marked: 2 });
});

test('parseListing reads the Start / blank-line list format', () => {
  const text = 'ademen \t\n\nto breathe\nStart \tafmaken \t\n\nto finish\nStart \tbijkomen \t\n\nto recuperate\n';
  assert.ok(L.looksLikeListing(text));
  const r = L.parseListing(text);
  assert.deepEqual(r.map((w) => [w.nl, w.en, w.pos]), [['ademen', 'to breathe', 'verb'], ['afmaken', 'to finish', 'verb'], ['bijkomen', 'to recuperate', 'verb']]);
  assert.equal(r.leftover, 0);
  const viaImport = L.parseImport(text).words;
  assert.equal(viaImport.length, 3); assert.equal(viaImport[1].nl, 'afmaken'); assert.equal(viaImport[1].en, 'to finish');
  // Windows line endings, an article, a "Start" on its own line and a dangling last line
  const r2 = L.parseListing('Start\r\n\tde afspraak \t\r\n\r\nappointment\r\nStart\thet huis\r\n\r\nhouse\r\nStarten');
  assert.deepEqual(r2.map((w) => [w.nl, w.article, w.en]), [['afspraak', 'de', 'appointment'], ['huis', 'het', 'house']]); assert.equal(r2.leftover, 1);
  // ordinary lists are not mistaken for this format
  assert.ok(!L.looksLikeListing('de afspraak = appointment\nhet huis = house')); assert.equal(L.parseImport('de afspraak = appointment').words[0].nl, 'afspraak');
});

test('orderParts and usedWords light up the words as they are typed', () => {
  const p = L.orderParts('Put in order: vergadering / heb / ik / morgen / een / met / mijn / collega');
  assert.equal(p.prefix, 'Put in order:'); assert.equal(p.words.length, 8); assert.equal(p.words[0], 'vergadering');
  assert.deepEqual(L.orderParts('afspraak / heb / morgen'), { prefix: '', words: ['afspraak', 'heb', 'morgen'] });
  assert.equal(L.orderParts('Translate this sentence'), null);
  assert.deepEqual(L.usedWords(p.words, 'ik heb een vergadering'), [true, true, true, false, true, false, false, false]);
  assert.deepEqual(L.usedWords(['ik', 'ik', 'heb'], 'Ik heb.'), [true, false, true]); // a typed word is used once
  assert.deepEqual(L.usedWords(['vergadering', 'heb'], 'vergad'), [false, false]); // half a word does not count
  assert.deepEqual(L.usedWords(['naar huis', 'ga'], 'ik ga naar huis'), [true, true]); // a tile with two words
  assert.ok(L.usedWords(p.words, 'ik heb een vergadering met mijn collega morgen').every(Boolean));
});

test('coachMoment: calm after a miss, bigger cheers at streaks, halfway and last card', () => {
  const m = (o) => L.coachMoment(Object.assign({ grade: 'good', streak: 1, done: 1, total: 10, rnd: () => 0 }, o));
  assert.deepEqual(m({ grade: 'again', streak: 0 }), { kind: 'again', act: 'sway', burst: '' });
  assert.equal(m({ streak: 3 }).kind, 'streak3'); assert.equal(m({ streak: 5 }).act, 'spin'); assert.equal(m({ streak: 8 }).kind, 'streak8'); assert.equal(m({ streak: 9 }).kind, 'right'); assert.equal(m({ streak: 12 }).kind, 'streak8');
  assert.equal(m({ done: 9, total: 10 }).kind, 'last'); assert.equal(m({ done: 5, total: 10 }).kind, 'half'); assert.equal(m({ done: 2, total: 4 }).kind, 'right'); // too short a session for a halfway cheer
  assert.equal(m({ streak: 3, done: 9, total: 10 }).kind, 'streak3'); // streaks win over the last-card line
  const r = m({}); assert.equal(r.kind, 'right'); assert.ok(['hop', 'wiggle', 'nod', 'bounce', 'twirl', 'wave'].includes(r.act));
});
test('every coach moment has lines to say', () => {
  const src = require('fs').readFileSync(__dirname + '/../renderer/seed.js', 'utf8');
  const COACH = new Function(src + '; return COACH;')();
  for (const k of ['start', 'right', 'again', 'streak3', 'streak5', 'streak8', 'half', 'last', 'done']) assert.ok(COACH[k] && COACH[k].length >= 1, k);
});

test('Tatoeba sentences: find by word and by verb/noun forms, shortest first', () => {
  const S = [['Ik werk elke dag.', 'I work every day.'], ['Hij werkt hard aan zijn huis in de stad.', 'He works hard.'], ['Het huis is groot.', 'The house is big.'], ['De huizen zijn oud.', 'The houses are old.']];
  const idx = L.buildSentenceIndex(S);
  assert.deepEqual(L.sentencesFor('werken', 'verb', idx, S, 5).map((p) => p[0]), ['Ik werk elke dag.', 'Hij werkt hard aan zijn huis in de stad.']);
  assert.deepEqual(L.sentencesFor('het huis', 'noun', idx, S, 1).map((p) => p[0]), ['Het huis is groot.']);
  assert.equal(L.sentencesFor('huis', 'noun', idx, S, 5).length, 2); // the two with huis (huizen is irregular)
});
test('suggested words skip ones you have or already know, and respect the band', () => {
  const F = [['ik', 'I', 1], ['huis', 'house', 50], ['boom', 'tree', 900], ['hond', 'dog', 1500]];
  const mine = [L.newWord({ nl: 'huis', en: 'house', article: 'het' })];
  assert.deepEqual(L.suggestWords(F, mine, ['ik'], 0, 1000).map((x) => x[0]), ['boom']);
  assert.deepEqual(L.suggestWords(F, mine, [], 1000, 2000).map((x) => x[0]), ['hond']);
});


test('dictionary lookup: word, plural, past tense and English', () => {
  const D = [['huis', 'n', 'het', 'huizen', 'house, home'], ['gaan', 'v', '', 'ging,gegaan,zijn', 'to go'], ['huisarts', 'n', 'de', 'huisartsen', 'family doctor'], ['mooi', 'a', '', 'mooier,mooist', 'beautiful'], ['werken', 'v', '', 'werkte,gewerkt', 'to work']];
  const ix = L.buildDictIndex(D), find = (q) => L.dictSearch(D, ix, q).map((r) => r.e[0] + ':' + r.how);
  assert.deepEqual(find('het huis'), ['huis:word', 'huisarts:prefix']);
  assert.equal(find('huizen')[0], 'huis:form'); assert.equal(find('ging')[0], 'gaan:form'); assert.equal(find('werkt')[0], 'werken:form'); assert.equal(find('mooist')[0], 'mooi:form');
  assert.deepEqual(find('to go'), ['gaan:english']); assert.deepEqual(find('doctor'), ['huisarts:english']);
  assert.deepEqual(L.dictToWord(D[0]), { nl: 'huis', en: 'house, home', article: 'het', pos: 'noun' });
  assert.equal(L.dictToWord(['dag', 'n', 'de/het', '', 'day']).article, '');
});

test('dictionary lookup: Dutch spelling for past plurals, present forms, adjective endings and little words', () => {
  const D = [['krijgen', 'v', '', 'kreeg,gekregen', 'to get'], ['gaan', 'v', '', 'ging,gegaan,zijn', 'to go'], ['geven', 'v', '', 'gaf,gegeven', 'to give'], ['winnen', 'v', '', 'won,gewonnen', 'to win'],
    ['draaien', 'v', '', 'draaide,gedraaid', 'to turn'], ['zijn', 'v', '', 'was,geweest', 'to be'], ['binnenkomen', 'v', '', 'binnenkwam,binnengekomen,zijn', 'to enter'], ['studeren', 'v', '', 'studeerde,gestudeerd', 'to study'],
    ['groot', 'a', '', 'groter,grootst', 'big'], ['wit', 'a', '', 'witter,witst', 'white'], ['europees', 'a', '', '', 'European'], ['feest', 'n', 'het', 'feesten', 'party'], ['keuze', 'n', 'de', 'keuzen', 'choice'], ['elk', 'e', '', '', 'each']];
  const ix = L.buildDictIndex(D), hit = (q) => (L.dictSearch(D, ix, q, 1)[0] || { e: [''] }).e[0];
  for (const [q, w] of [['kregen', 'krijgen'], ['gaat', 'gaan'], ['geeft', 'geven'], ['gaven', 'geven'], ['wonnen', 'winnen'], ['draait', 'draaien'], ['is', 'zijn'], ['waren', 'zijn'], ['binnenkomt', 'binnenkomen'],
    ['studeert', 'studeren'], ['grote', 'groot'], ['grootste', 'groot'], ['witte', 'wit'], ['europese', 'europees'], ['feestje', 'feest'], ['keuzes', 'keuze'], ['elke', 'elk']]) assert.equal(hit(q), w, q);
  const D2 = D.concat([['was', 'n', 'de', 'wassen', 'laundry'], ['wassen', 'v', '', 'waste,gewassen', 'to wash'], ['niet', 'n', 'de', 'nieten', 'staple'], ['nieten', 'v', '', 'niette,geniet', 'to staple']]), ix2 = L.buildDictIndex(D2);
  assert.deepEqual(L.alsoFormOf(D2, ix2, 'was').map((x) => x.e[0] + ':' + x.label), ['zijn:past tense', 'wassen:present tense']);
  assert.deepEqual(L.alsoFormOf(D2, ix2, 'niet', new Map([['niet', 1], ['zijn', 2]])), []); // a rare look-alike stays out
  assert.equal(L.formLabel(D[0], 'kregen'), 'past tense');
  assert.equal(L.verbStem('maken'), 'maak'); assert.equal(L.verbStem('liggen'), 'lig'); assert.equal(L.verbStem('wandelen'), 'wandel'); assert.equal(L.verbStem('doen'), 'doe');
});

test('dictionary: grammar-only meanings become plain English with the root word', () => {
  const D = [['binnenkomen', 'v', '', 'binnenkwam,binnengekomen,zijn', 'to enter, to come inside'], ['komen', 'v', '', 'kwam,gekomen,zijn', 'to come'],
    ['binnenkwam', 'v', '', '', 'singular dependent-clause past indicative of binnenkomen'], ['binnenkwame', 'v', '', '', 'singular dependent-clause past subjunctive of binnenkomen'],
    ['sigaar', 'n', 'de', 'sigaren', 'cigar'], ['cigaar', 'n', 'de', '', 'dated spelling of sigaar']];
  const ix = L.buildDictIndex(D), ex = (w) => L.dictExplain(D, ix, D.find((d) => d[0] === w));
  assert.deepEqual(ex('binnenkwam'), { mean: 'past tense of binnenkomen (to enter, to come inside)', note: 'In a side clause it stays one word: …dat hij binnenkwam. In a main clause it splits: hij kwam binnen.' });
  assert.match(ex('binnenkwame').mean, /^old-fashioned wish form/); assert.equal(ex('cigaar').mean, 'old spelling of sigaar (cigar)');
  assert.deepEqual(ex('komen'), { mean: 'to come', note: '' });
  assert.equal(L.dictToWord(D[2], ex('binnenkwam').mean).en, 'past tense of binnenkomen (to enter, to come inside)');
});

test('worksheets built from the downloaded data', () => {
  const dict = [['werken', 'v', '', 'werkte,gewerkt,hebben', 'to work'], ['huis', 'n', 'het', 'huizen', 'house'], ['fiets', 'n', 'de', 'fietsen', 'bicycle'], ['boek', 'n', 'het', 'boeken', 'book'], ['stad', 'n', 'de', 'steden', 'city'], ['water', 'n', 'het', '', 'water']];
  const sentences = [['Ik werk elke dag in de stad.', 'I work every day in the city.'], ['Het huis is erg groot.', 'The house is very big.'], ['Wij werken samen op kantoor.', 'We work together.']];
  const dix = L.buildDictIndex(dict), six = L.buildSentenceIndex(sentences);
  const pool = [{ nl: 'werken', en: 'to work', article: '', pos: 'verb' }, { nl: 'huis', en: 'house', article: 'het', pos: 'noun' }];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const sheet = L.buildLocalSheet({ pool, count: 10, dict, dix, sentences, six, rnd });
  assert.ok(sheet && sheet.items.length >= 5);
  const by = (ty, sk) => sheet.items.filter((i) => i.type === ty && (!sk || i.skill === sk));
  assert.ok(by('mc', 'vocabulary').length && by('mc', 'vocabulary')[0].options.includes(by('mc', 'vocabulary')[0].answer));
  assert.ok(by('mc', 'de/het').every((i) => i.answer === 'het'));
  const cl = sheet.items.find((i) => i.type === 'fill' && /_{2,}/.test(i.q)); assert.ok(cl && /^(werk|werken|huis)$/.test(cl.answer), 'cloze blanks out the word as used'); assert.ok(!/[=(]/.test(cl.q) && cl.q.includes(cl.answer[0] + '_'), 'no translation in the question, just the first letter');
  const fo = sheet.items.find((i) => i.skill === 'past tense'); assert.ok(fo && ['werkte', 'gewerkt'].includes(fo.answer));
  const or = sheet.items.find((i) => i.type === 'order'); assert.ok(or && L.orderParts(or.q).words.length >= 4 && L.autoMark(or, or.answer).verdict === 'right');
  assert.equal(L.autoMark(by('mc')[0], by('mc')[0].answer).verdict, 'right');
  assert.equal(L.buildLocalSheet({ pool: [], count: 5, dict, dix, sentences, six }), null);
});
test('recent and trouble words', () => {
  const ws = [L.newWord({ nl: 'a', en: 'a', reps: 3, last: '2026-10-10', box: 3 }), L.newWord({ nl: 'b', en: 'b', reps: 5, last: '2026-08-01', box: 1, lapses: 2, created: 1 }), L.newWord({ nl: 'c', en: 'c', reps: 4, last: '2026-08-01', box: 5, created: 1 })];
  assert.deepEqual(L.recentWords(ws, '2026-10-12', 7).map((w) => w.nl), ['a']);
  assert.deepEqual(L.troubleWords(ws).map((w) => w.nl), ['b']);
});
test('separable verbs: example sentences need the little word too, and it gets underlined', () => {
  const S = [['Ik vraag me af of hij komt.', 'I wonder if he is coming.'], ['Dat is een goede vraag.', 'That is a good question.']];
  const idx = L.buildSentenceIndex(S);
  assert.deepEqual(L.sepSplit('zich afvragen'), { prefix: 'af', rest: 'vragen' }); assert.equal(L.sepSplit('werken'), null);
  assert.deepEqual(L.sentencesFor('zich afvragen', 'verb', idx, S, 5).map((p) => p[0]), ['Ik vraag me af of hij komt.']);
  const f = L.exampleForms('zich afvragen', 'verb'); assert.ok(f.includes('vraag') && f.includes('af'));
});

test('mistakes review: words missed in the last week, most missed first', () => {
  const ws = [L.newWord({ nl: 'huis', en: 'house', reps: 2 }), L.newWord({ nl: 'boek', en: 'book', reps: 2 }), L.newWord({ nl: 'fiets', en: 'bike', reps: 2 })];
  const log = [{ nl: 'boek', d: '2026-10-11', s: 'cards' }, { nl: 'Boek', d: '2026-10-12', s: 'listen' }, { nl: 'huis', d: '2026-10-10', s: 'cards' }, { nl: 'fiets', d: '2026-09-01', s: 'cards' }];
  assert.deepEqual(L.missedWords(ws, log, '2026-10-12', 7).map((w) => w.nl), ['boek', 'huis']);
});
test('progress counters: week sums, accuracy, snapshots', () => {
  const log = { '2026-10-12': { reviews: 10, cOk: 8, cMiss: 2, lOk: 5 }, '2026-10-05': { reviews: 7, cOk: 3, cMiss: 3 } };
  assert.equal(L.weekSum(log, '2026-10-12', ['reviews'], 0), 10); assert.equal(L.weekSum(log, '2026-10-12', ['reviews'], 1), 7);
  assert.equal(L.dayAccuracy(log['2026-10-12']), 13 / 15); assert.equal(L.dayAccuracy({}), null); assert.equal(L.weekAccuracy(log, '2026-10-12', 1), 0.5);
  const snap = {}; L.takeSnapshot(snap, [L.newWord({ box: 5, reps: 3 }), L.newWord({ box: 1, reps: 1 }), L.newWord({})], '2026-10-12');
  assert.deepEqual(snap['2026-10-12'], { learned: 1, started: 2, total: 3 });
});
test('reading texts: parse Claude reply or plain text, tokenize, find the sentence', () => {
  const reply = '```json\n{"reading":{"title":"Een dag","text":"Ik werk elke dag.\\n\\nHet is leuk.","questions":[{"q":"Wat doet hij?","options":["werken","slapen"],"answer":"werken","why":"x"},{"q":"bad","options":["a"],"answer":"z"}]}}\n```';
  const r = L.parseReading(reply);
  assert.equal(r.reading.title, 'Een dag'); assert.equal(r.reading.questions.length, 1); assert.ok(r.reading.text.includes('Het is leuk'));
  assert.equal(L.parseReading('Dit is een gewone Nederlandse tekst.').reading.text, 'Dit is een gewone Nederlandse tekst.'); assert.ok(L.parseReading('hoi').error);
  assert.deepEqual(L.tokenize("Ik ben d'r, ja!").filter((x) => x.w).map((x) => x.w), ['Ik', 'ben', "d'r", 'ja']);
  assert.equal(L.sentenceWith('Ik werk hier. Wij wonen daar!', 'wonen'), 'Wij wonen daar!');
  assert.ok(L.readingPrompt({ level: 'B1', length: 'short', topic: 'de dokter', words: [{ nl: 'afspraak' }] }).includes('afspraak'));
});

test('seasons and holidays (ported from Varken board)', () => {
  const d = (y, m, day) => new Date(y, m - 1, day);
  assert.equal(L.holidayOf(d(2026, 12, 20)), 'christmas'); assert.equal(L.holidayOf(d(2026, 10, 31)), 'halloween'); assert.equal(L.holidayOf(d(2026, 4, 27)), 'kingsday');
  assert.equal(L.holidayOf(d(2026, 4, 5)), 'easter'); assert.equal(L.holidayOf(d(2026, 5, 10)), 'mothersday'); L.setBirthday('2000-05-10'); assert.equal(L.holidayOf(d(2026, 5, 10)), 'birthday'); L.setBirthday(''); assert.equal(L.holidayOf(d(2026, 12, 4)), 'sinterklaas');
  assert.equal(L.holidayOf(d(2026, 1, 1)), 'newyear'); assert.equal(L.holidayOf(d(2026, 2, 14)), 'valentine'); assert.equal(L.holidayOf(d(2026, 7, 4)), 'fourth'); assert.equal(L.holidayOf(d(2026, 8, 20)), '');
  assert.equal(L.seasonOf(d(2026, 1, 15)), 'winter'); assert.equal(L.seasonOf(d(2026, 4, 15)), 'spring'); assert.equal(L.seasonOf(d(2026, 7, 15)), 'summer'); assert.equal(L.seasonOf(d(2026, 10, 15)), 'autumn');
  assert.equal(L.lookOf(d(2026, 12, 20)), 'christmas'); assert.equal(L.lookOf(d(2026, 8, 20)), 'summer');
  assert.equal(L.easterSunday(2026).getMonth(), 3); assert.equal(L.easterSunday(2026).getDate(), 5);
});

test('levels: 99 levels shaped like RuneScape, names spread out, start from old history', () => {
  assert.equal(L.XP_TO[2], 302); assert.equal(L.levelInfo(0).level, 1); assert.equal(L.levelInfo(301).level, 1); assert.equal(L.levelInfo(302).level, 2); assert.equal(L.levelInfo(302).into, 0);
  const total = L.XP_TO[99];
  assert.ok(total > 250000 && total < 330000, 'about 290,000 XP in all');
  assert.ok(L.XP_TO[92] / total > 0.48 && L.XP_TO[92] / total < 0.58, 'level 92 is about halfway');
  assert.ok(L.XP_TO[90] < total / 2 && L.XP_TO[92] >= total / 2, 'the halfway point sits at level 91-92');
  for (let n = 2; n < 99; n++) assert.ok(L.levelNeed(n) >= L.levelNeed(n - 1), 'every level costs at least as much as the last');
  assert.equal(L.levelInfo(total).level, 99); assert.equal(L.levelInfo(total).max, true); assert.equal(L.levelInfo(total * 3).level, 99); assert.equal(L.levelInfo(total - 1).level, 98);
  assert.equal(L.levelTitle(1)[0], 'Zaadje'); assert.equal(L.levelTitle(4)[0], 'Zaadje'); assert.equal(L.levelTitle(5)[0], 'Kiem'); assert.equal(L.levelTitle(92)[0], 'Taalkoning'); assert.equal(L.levelTitle(98)[0], 'Taalfee'); assert.equal(L.levelTitle(99)[0], 'Taallegende');
  assert.equal(L.levelInfo(151).pct, 50); assert.ok(/MAX/.test(L.xpText(L.levelInfo(total))));
  assert.equal(L.xpFromHistory({ a: { reviews: 10, listen: 5, sheets: 1 }, b: { reviews: 99, xp: 40 } }, [L.newWord({ reps: 2 }), L.newWord({}), L.newWord({ deleted: true, reps: 3 })]), 40 + 20 + 15 + 40 + 1);
});

test('order tiles: a punctuation tile lights up when you type that mark', () => {
  assert.deepEqual(L.usedWords(['heeft', 'de', '?'], 'heeft de'), [true, true, false]);
  assert.deepEqual(L.usedWords(['heeft', 'de', '?'], 'heeft de ?'), [true, true, true]);
  assert.deepEqual(L.usedWords(['heeft', 'de', '?'], 'heeft de?'), [true, true, true]);
  assert.deepEqual(L.usedWords(['ja', ',', ','], 'ja,'), [true, true, false]);
});

test('daily mix: steps finish by their own counts, and cards count as done when nothing is due', () => {
  const s0 = L.mixSteps({}, 10, 12); assert.deepEqual(s0.map((x) => x.done), [false, false, false]);
  const s1 = L.mixSteps({ reviews: 10, lOk: 3, lMiss: 2, sOk: 4, sMiss: 2 }, 10, 5); assert.deepEqual(s1.map((x) => x.done), [true, true, true]);
  assert.equal(L.mixSteps({}, 10, 0)[0].done, true);
});

test('sentence explainer: spots the word-order patterns and uses the words of the sentence', () => {
  const iv = { isVerb: (w) => ['woon', 'bel', 'werk'].includes(w) }; const pats = (s) => { const r = L.explainSentence(s, iv); return r ? r.pats : []; };
  assert.deepEqual(pats('Gisteren heb ik een boek gelezen.'), ['perfect', 'inversion']);
  const sub = L.explainSentence('Ik denk dat hij morgen komt.'); assert.deepEqual(sub.pats, ['subordinate']);
  assert.ok(sub.findings[0].bullets.some((b) => b.includes('hij komt morgen')));
  assert.deepEqual(pats('Ik wil morgen naar de winkel gaan.'), ['modal']);
  assert.deepEqual(pats('Waar woon je?'), ['question']); assert.deepEqual(pats('Heb je honger?'), ['question']);
  assert.deepEqual(pats('Ik bel je morgen op.'), ['separable']);
  assert.deepEqual(pats('Ik ben moe, want ik heb slecht geslapen.'), ['coord', 'perfect']);
  assert.equal(L.explainSentence('Het huis is groot.'), null);
  const q = L.explainSentence('Waar woon je?', iv); assert.equal(q.roles[0], 'q'); assert.equal(q.roles[1], 'verb');
});

test('weekly recap: Monday to Sunday sums, accuracy, best day and the level you started on', () => {
  const log = { '2026-10-05': { xp: 50, reviews: 10, cOk: 8, cMiss: 2 }, '2026-10-07': { xp: 120, reviews: 5, lOk: 5, lMiss: 1, sOk: 4, sMiss: 1 }, '2026-09-29': { xp: 40, reviews: 4 } };
  const r = L.weekRecap(log, 170, '2026-10-09', 0); // a Friday
  assert.equal(r.start, '2026-10-05'); assert.equal(r.end, '2026-10-11'); assert.equal(r.xp, 170); assert.equal(r.active, 2); assert.equal(r.cards, 15); assert.equal(r.best.d, '2026-10-07');
  assert.equal(Math.round(r.acc * 100), 81); assert.equal(r.prev.xp, 40); assert.equal(r.levelFrom, 1);
  const last = L.weekRecap(log, 170, '2026-10-14', 1); assert.equal(last.start, '2026-10-05'); assert.equal(last.xp, 170);
  assert.ok(L.recapLine(L.weekRecap({}, 0, '2026-10-09', 0)).includes('quiet'));
});
test("'t kofschip picks -te or -de from the stem of the infinitive", () => {
  const s = (v) => L.kofschip(v).suffix;
  assert.deepEqual(['werken', 'maken', 'praten', 'fietsen', 'wonen', 'reizen', 'leren', 'spelen', 'wachten'].map(s), ['te', 'te', 'te', 'te', 'de', 'de', 'de', 'de', 'te']);
});
test('cloze: finds the word, with its ending, in the example sentence', () => {
  const c = L.clozeOf('Zij werkt in een ziekenhuis.', 'werken', 'verb');
  assert.equal(c.form, 'werkt'); assert.equal(c.before, 'Zij '); assert.equal(c.after, ' in een ziekenhuis.');
  assert.equal(L.clozeOf('Ik heb een afspraak.', 'de afspraak', 'noun').form, 'afspraak');
  assert.equal(L.clozeOf('Het regent.', 'afspraak', 'noun'), null); assert.equal(L.clozeOf('', 'huis', 'noun'), null);
});
test('recall: typed words are matched to your words, typos allowed', () => {
  const pool = [L.newWord({ nl: 'afspraak', article: 'de' }), L.newWord({ nl: 'ziekenhuis', article: 'het' })];
  assert.equal(L.recallMatch('de afspraak', pool).exact, true); assert.equal(L.recallMatch(' Afspraak ', pool).w.nl, 'afspraak');
  const typo = L.recallMatch('ziekenhuus', pool); assert.equal(typo.w.nl, 'ziekenhuis'); assert.equal(typo.exact, false);
  assert.equal(L.recallMatch('fiets', pool), null); assert.equal(L.recallMatch('', pool), null);
});
test('settings: the volume starts at full and old saves get it', () => {
  assert.equal(L.defaultSettings().volume, 1);
  assert.equal(L.fixState({ settings: { rate: 0.8 } }).settings.volume, 1);
  assert.equal(L.fixState({ settings: { volume: 0.4 } }).settings.volume, 0.4);
});
test('repeat: a missed card comes back 2 or 3 cards later, further after a retype, and at most twice', () => {
  const s = { queue: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => ({ id, again: false })), i: 0 };
  assert.equal(L.requeueMiss(s, s.queue[0], false, () => 0), true); assert.deepEqual(s.queue[2], { id: 1, again: true, back: 1 });
  s.i = 2; assert.equal(L.requeueMiss(s, s.queue[2], true, () => 0), true); assert.deepEqual(s.queue[7], { id: 1, again: true, back: 2 });
  s.i = 7; const n = s.queue.length; assert.equal(L.requeueMiss(s, s.queue[7], false), false); assert.equal(s.queue.length, n);
  const end = { queue: [{ id: 1 }], i: 0 }; L.requeueMiss(end, end.queue[0], true, () => 0.99); assert.equal(end.queue.length, 2); // near the end it goes last
});
test('repeat: progress counts the cards you chose, plus the redos left', () => {
  const q = [{ id: 1 }, { id: 2 }, { id: 1, again: true }, { id: 3 }, { id: 2, again: true }];
  assert.equal(L.sessionProgress({ queue: q, i: 0 }), '1 of 3 · 2 to redo');
  assert.equal(L.sessionProgress({ queue: q, i: 2 }), '🔁 Redo · 2 of 3 done · 1 to redo');
  assert.equal(L.sessionProgress({ queue: q, i: 3 }), '3 of 3 · 1 to redo');
  assert.equal(L.sessionProgress({ queue: q, i: 4 }), '🔁 Redo · 3 of 3 done');
  assert.equal(L.sessionProgress({ queue: [{ id: 1 }, { id: 2 }], i: 1 }), '2 of 2');
});
