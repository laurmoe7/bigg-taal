const test = require('node:test');
const assert = require('node:assert');
const L = require('../renderer/logic.js');

test('grade moves boxes and due dates', () => {
  const w = L.newWord({ nl: 'huis', en: 'house' });
  const a = L.grade(w, 'good', '2026-10-12');
  assert.equal(a.box, 1); assert.equal(a.due, '2026-10-13');
  const b = L.grade(a, 'easy', '2026-10-13');
  assert.equal(b.box, 3); assert.equal(b.due, '2026-10-17');
  const c = L.grade(b, 'again', '2026-10-17');
  assert.equal(c.box, 0); assert.equal(c.due, '2026-10-17'); assert.equal(c.lapses, 1);
});

test('box never exceeds the top interval', () => {
  let w = L.newWord({ nl: 'x', en: 'y', box: 7 });
  w = L.grade(w, 'easy', '2026-01-01');
  assert.equal(w.box, L.INTERVALS.length - 1);
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
