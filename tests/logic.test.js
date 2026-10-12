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

test('worksheet: article, blank, verbs, order; key shows answers', () => {
  const words = L.parseVocab('de afspraak = appointment | Ik heb morgen een afspraak met de dokter.\nhet huis = house | Het huis is erg groot.\nde buurman = neighbour | Mijn buurman is vriendelijk.');
  const verbs = [{ inf: 'gaan', en: 'to go', ik: 'ga', hij: 'gaat', sg: 'ging', pl: 'gingen', perf: 'is gegaan' }];
  const s = L.makeWorksheet(words, verbs, ['article', 'blank', 'nl-en', 'en-nl', 'order', 'verbs'], 5, () => 0.3);
  assert.equal(s.length, 6);
  assert.ok(s[1].items[0].q.includes('________'));
  assert.ok(/\/ /.test(s[4].items[0].q));
  const noKey = L.worksheetHtml(s, false), key = L.worksheetHtml(s, true);
  assert.ok(!noKey.includes('is gegaan')); assert.ok(key.includes('is gegaan')); assert.ok(key.includes('Answer key'));
});

test('scramble keeps the same words', () => {
  const q = L.scramble('Ik heb morgen een afspraak met de dokter.');
  assert.deepEqual(q.split(' / ').sort(), 'Ik heb morgen een afspraak met de dokter'.split(' ').sort());
  assert.equal(L.scramble('Te kort'), null);
});

test('candidates: frequent unknown words, no stop words or known', () => {
  const c = L.candidates('De gemeente stuurt een brief. De gemeente wil een afspraak. Het huis is groot.', [L.newWord({ nl: 'huis', en: 'house' })]);
  assert.equal(c[0].w, 'gemeente');
  assert.ok(!c.some((x) => x.w === 'huis' || x.w === 'het'));
});

test('fixState fills defaults', () => {
  const s = L.fixState({ words: [1], settings: { dailyGoal: 5 } });
  assert.equal(s.settings.dailyGoal, 5); assert.equal(s.settings.reminderTime, '19:00'); assert.deepEqual(s.lessons, []);
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
