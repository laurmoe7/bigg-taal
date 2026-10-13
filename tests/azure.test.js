const test = require('node:test');
const assert = require('node:assert');
const A = require('../azure.js');

test('SSML: the voice, the language, the speed and escaped text', () => {
  const s = A.buildSsml('Ik ben <blij> & "klaar"', 'nl-NL-ColetteNeural', 1);
  assert.ok(s.includes('xml:lang="nl-NL"') && s.includes('<voice name="nl-NL-ColetteNeural">'));
  assert.ok(s.includes('Ik ben &lt;blij&gt; &amp; &quot;klaar&quot;') && !s.includes('<blij>'));
  assert.ok(!s.includes('<prosody'), 'normal speed adds nothing');
  assert.ok(A.buildSsml('hoi', 'nl-BE-DenaNeural', 1.5).includes('xml:lang="nl-BE"') && A.buildSsml('hoi', 'nl-BE-DenaNeural', 1.5).includes('rate="-33%"'));
  assert.ok(A.buildSsml('hoi', 'nl-NL-FennaNeural', 0.8).includes('rate="+25%"'));
  assert.equal(A.ratePct(0.1), 100); assert.equal(A.ratePct(10), -50); assert.equal(A.ratePct('x'), 0);
  assert.throws(() => A.buildSsml('hoi', 'en-US-JennyNeural', 1), /unknown voice/);
  assert.throws(() => A.buildSsml('hoi', 'nl-NL-"><Evil', 1));
});

test('the key can only go to a Microsoft speech host', async () => {
  assert.equal(A.hostFor('westeurope'), 'westeurope.tts.speech.microsoft.com');
  for (const bad of ['', 'a', 'evil.com/x', 'west europe', 'a@b', 'x'.repeat(31)]) assert.equal(A.validRegion(bad), false, bad);
  let called = false;
  await assert.rejects(A.synthesize({ key: 'k', region: 'evil.com/x', voice: 'nl-NL-ColetteNeural', text: 'hoi', ls: 1, fetchImpl: async () => { called = true; } }), (e) => e.code === 'bad');
  assert.equal(called, false, 'nothing is sent for a bad region');
});

test('a good request: right URL, headers and body, audio back', async () => {
  let seen;
  const audio = Buffer.alloc(1000, 7);
  const out = await A.synthesize({ key: 'SECRET', region: 'westeurope', voice: 'nl-NL-MaartenNeural', text: 'Goedemorgen', ls: 1, fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true, status: 200, arrayBuffer: async () => audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.length) }; } });
  assert.equal(seen.url, 'https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.equal(seen.init.method, 'POST'); assert.equal(seen.init.headers['Ocp-Apim-Subscription-Key'], 'SECRET');
  assert.equal(seen.init.headers['Content-Type'], 'application/ssml+xml'); assert.ok(/mp3/.test(seen.init.headers['X-Microsoft-OutputFormat'])); assert.ok(seen.init.headers['User-Agent']);
  assert.ok(seen.init.body.includes('Goedemorgen') && !seen.init.body.includes('SECRET'), 'the key is a header, never in the text');
  assert.equal(out.length, 1000);
});

test('errors are sorted into kinds the app can explain', async () => {
  const fail = (status) => async () => ({ ok: false, status });
  const kind = (f) => A.synthesize({ key: 'k', region: 'westeurope', voice: 'nl-NL-FennaNeural', text: 'x', ls: 1, fetchImpl: f }).then(() => 'ok', (e) => e.code);
  assert.equal(await kind(fail(401)), 'auth'); assert.equal(await kind(fail(403)), 'auth');
  assert.equal(await kind(fail(429)), 'limit'); assert.equal(await kind(fail(400)), 'bad'); assert.equal(await kind(fail(503)), 'server');
  assert.equal(await kind(async () => { throw new Error('getaddrinfo ENOTFOUND'); }), 'network');
  assert.equal(await kind(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(10) })), 'server', 'an empty reply is not audio');
  assert.equal(await A.synthesize({ key: '', region: 'westeurope', voice: 'nl-NL-FennaNeural', text: 'x', ls: 1 }).then(() => 'ok', (e) => e.code), 'auth');
});

test('the free allowance: counted per month, stops early, starts again next month', () => {
  const oct = '2026-10', nov = '2026-11';
  assert.equal(A.monthOf(new Date(2026, 9, 5)), oct);
  let u = { month: oct, chars: 449990 };
  assert.equal(A.canSpend(u, oct, 10), true); assert.equal(A.canSpend(u, oct, 11), false, 'over the safe limit');
  assert.equal(A.canSpend(u, nov, 400000), true, 'a new month starts at zero');
  assert.deepEqual(A.addUsage(u, oct, 10), { month: oct, chars: 450000 });
  assert.deepEqual(A.addUsage(u, nov, 25), { month: nov, chars: 25 });
  assert.deepEqual(A.addUsage(undefined, oct, 5), { month: oct, chars: 5 });
  assert.ok(A.SAFE_CHARS < A.FREE_CHARS);
});
