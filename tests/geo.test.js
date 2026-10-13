const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const G = require('../renderer/geodata.js');
const { MAPS } = require('../renderer/mapdata.js');

test('Europe data: unique ids, a flag file and a capital for every country', () => {
  assert.equal(new Set(G.EUROPE.map((c) => c.id)).size, G.EUROPE.length);
  for (const c of G.EUROPE) {
    assert.ok(c.name && c.en && c.cap && c.capEn, c.id);
    assert.ok(G.EUROPE_REGIONS.some((r) => r[0] === c.region), c.id + ' region');
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'renderer', 'flags', c.id + '.svg')), c.id + ' flag file');
    assert.ok(c.flag().includes('flags/' + c.id + '.svg'));
  }
  assert.equal(G.PROVINCES.length, 12);
});
test('typed answers: accents and capitals do not matter, typos are close, English is flagged', () => {
  const be = G.EUROPE.find((c) => c.id === 'be'), uk = G.EUROPE.find((c) => c.id === 'gb'), den = G.PROVINCES.find((p) => p.id === 'nb');
  assert.equal(G.geoJudge('belgie', be, 'name'), 'right');
  assert.equal(G.geoJudge('BELGIË', be, 'name'), 'right');
  assert.equal(G.geoJudge('Belgue', be, 'name'), 'close');
  assert.equal(G.geoJudge('Belgium', be, 'name'), 'english');
  assert.equal(G.geoJudge('Brussels', be, 'cap'), 'english');
  assert.equal(G.geoJudge('Engeland', uk, 'name'), 'right');
  assert.equal(G.geoJudge('', be, 'name'), 'wrong');
  assert.equal(G.geoJudge('den bosch', den, 'cap'), 'right');
});
test('levels and the question queue: weakest first', () => {
  assert.equal(G.geoLevel(undefined), 'new'); assert.equal(G.geoLevel({ c: 1, m: 0 }), 'learning');
  assert.equal(G.geoLevel({ c: 3, m: 1 }), 'known'); assert.equal(G.geoLevel({ c: 5, m: 0 }), 'mastered');
  const items = G.EUROPE.slice(0, 10), stats = {}; items.forEach((it, i) => { stats[it.id] = { c: i < 5 ? 6 : 0, m: i < 5 ? 0 : 1 }; });
  const q = G.geoPickQueue(items, stats, 5, () => 0.5).map((x) => x.id);
  assert.deepEqual(new Set(q), new Set(items.slice(5).map((x) => x.id)));
});
test('options: four different answers including the right one', () => {
  for (const key of [(c) => c.name, (c) => c.cap, (c) => c.id]) {
    const it = G.EUROPE[3], o = G.geoOptions(G.EUROPE, it, key);
    assert.equal(o.length, 4); assert.ok(o.some((x) => x.id === it.id)); assert.equal(new Set(o.map(key)).size, 4);
  }
  const p = G.geoOptions(G.PROVINCES, G.PROVINCES[0], (x) => x.cap); assert.equal(p.length, 4);
});
const LISTS = { europe: G.EUROPE, asia: G.ASIA, africa: G.AFRICA, namerica: G.NAMERICA, samerica: G.SAMERICA, oceania: G.OCEANIA };
const CONTINENTS = Object.assign({}, LISTS);
test('every continent: unique ids, names, capitals, a flag file and a map position', () => {
  const seen = new Set();
  for (const [name, list] of Object.entries(LISTS)) {
    for (const c of list) {
      assert.ok(c.name && c.en && c.cap && c.capEn, name + ' ' + c.id);
      assert.ok(!seen.has(c.id), 'duplicate country ' + c.id); seen.add(c.id);
      assert.ok(fs.existsSync(path.join(__dirname, '..', 'renderer', 'flags', c.id + '.svg')), c.id + ' flag file');
      assert.ok(MAPS[name].pts[c.id] && MAPS[name].pts[c.id].every(Number.isFinite), name + ' ' + c.id + ' has a position on its map');
    }
  }
  assert.ok(seen.size > 190, 'about the whole world: ' + seen.size);
  for (const c of G.SAMERICA) assert.equal(c.region, 'sa');
});
test('the Americas map (for the flags lesson) has every country of both continents', () => {
  const drawn = new Set(MAPS.americas.shapes.map((x) => x[0]));
  for (const c of G.AMERICAS) assert.ok(MAPS.americas.pts[c.id] && (drawn.has(c.id) || MAPS.americas.small.includes(c.id)), c.id);
});
test('the world lists every country once, grouped by continent, and has a map of its own', () => {
  const total = Object.values(CONTINENTS).reduce((n, l) => n + l.length, 0);
  assert.equal(G.WORLD.length, total); assert.equal(new Set(G.WORLD.map((c) => c.id)).size, total);
  for (const c of G.WORLD) { assert.ok(G.WORLD_REGIONS.some((r) => r[0] === c.region), c.id + ' continent ' + c.region); assert.ok(MAPS.world.pts[c.id], c.id + ' on the world map'); }
});
test('every Dutch province has a flag file', () => {
  for (const p of G.PROVINCES) { const f = path.join(__dirname, '..', 'renderer', 'flags', 'nl-' + p.id + '.svg'); assert.ok(fs.existsSync(f), p.id); const t = fs.readFileSync(f, 'utf8'); assert.ok(t.includes('<svg') && !/<script|onload=|javascript:/i.test(t), p.id + ' is a plain svg'); }
});
test('maps: every country and province can be lit up, tiny states get a ring, nothing is broken', () => {
  for (const [name, list] of Object.entries(LISTS)) {
    const m = MAPS[name], drawn = new Set(m.shapes.map((x) => x[0]));
    for (const c of list) assert.ok(drawn.has(c.id) || m.small.includes(c.id), name + ' ' + c.id + ' is drawn or ringed');
    assert.ok(m.vb.length === 4 && m.vb.every(Number.isFinite) && m.vb[2] > 100 && m.vb[3] > 100, name + ' frame');
  }
  for (const id of ['mc', 'va', 'sm', 'li', 'mt']) assert.ok(MAPS.europe.small.includes(id), id + ' ring');
  for (const p of G.PROVINCES) { assert.ok(MAPS.provinces.shapes.some((x) => x[0] === p.id), p.id); assert.ok(MAPS.provinces.ctr[p.id] && MAPS.provinces.pts[p.id], p.id + ' labels'); }
  assert.ok(!JSON.stringify(MAPS).includes('NaN'));
});
test('seas, rivers and mountains: unique, with a drawing each', () => {
  assert.equal(new Set(G.WATERS.map((w) => w.id)).size, G.WATERS.length);
  for (const w of G.WATERS) { assert.ok(['sea', 'river', 'mountain'].includes(w.region), w.id); const f = MAPS.europe.feat[w.id]; assert.ok(f && (f.d || f.p), w.id + ' drawing'); if (f.p) assert.ok(f.p.every(Number.isFinite)); }
  for (const w of G.WATERS.filter((x) => x.region === 'river')) assert.ok(MAPS.europe.feat[w.id].d, w.id + ' is a line');
});
