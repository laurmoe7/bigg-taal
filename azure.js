// Azure Speech, the online Dutch voices (nl-NL Colette, Fenna, Maarten; nl-BE Dena, Arnaud).
// Plain Node, no Electron: main.js uses it, and tests/azure.test.js tests it with a pretend network.
// Docs: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
//
// Safety rules kept here: the key is only ever sent to <region>.tts.speech.microsoft.com (the region is checked), the voice name is checked,
// and the free monthly allowance (500,000 characters on the F0 tier) is counted so the app stops before it, and uses an offline voice instead.

const FREE_CHARS = 500000;
const SAFE_CHARS = 450000; // stop a little early; the service's own count may differ slightly from ours

const validRegion = (r) => /^[a-z0-9]{3,30}$/.test(String(r || ''));
const validVoice = (v) => /^nl-(NL|BE)-[A-Za-z]+Neural$/.test(String(v || ''));
const hostFor = (region) => `${region}.tts.speech.microsoft.com`;
const xmlEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

// the app's Piper-style length scale (1 = normal, 1.5 = slower) as a speaking-rate change for Azure (-50% .. +100%)
const ratePct = (ls) => Math.max(-50, Math.min(100, Math.round((1 / (Number(ls) || 1) - 1) * 100)));
function buildSsml(text, voice, ls) {
  if (!validVoice(voice)) throw new AzureError('bad', 'unknown voice');
  const pct = ratePct(ls), body = xmlEsc(text);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.slice(0, 5)}"><voice name="${voice}">${pct ? `<prosody rate="${pct > 0 ? '+' : ''}${pct}%">${body}</prosody>` : body}</voice></speak>`;
}

// what went wrong, in a few kinds the app can talk about: auth (bad key), limit (quota or too fast), network, bad (our request), server
class AzureError extends Error { constructor(code, message) { super(message || code); this.code = code; } }
const codeOfStatus = (s) => (s === 401 || s === 403 ? 'auth' : s === 429 ? 'limit' : s === 400 || s === 415 ? 'bad' : 'server');

// ---------- the monthly character count ----------
const monthOf = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const usedIn = (usage, month) => (usage && usage.month === month ? usage.chars || 0 : 0); // a new month starts from zero
const canSpend = (usage, month, n) => usedIn(usage, month) + n <= SAFE_CHARS;
const addUsage = (usage, month, n) => ({ month, chars: usedIn(usage, month) + n });

// ---------- the request ----------
async function synthesize({ key, region, voice, text, ls, fetchImpl, timeoutMs }) {
  if (!key) throw new AzureError('auth', 'no key');
  if (!validRegion(region)) throw new AzureError('bad', 'unknown region');
  const ssml = buildSsml(text, voice, ls), f = fetchImpl || fetch, ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs || 12000);
  let res;
  try {
    res = await f(`https://${hostFor(region)}/cognitiveservices/v1`, {
      method: 'POST', signal: ctl.signal, body: ssml,
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'BiggTaal' },
    });
  } catch (e) { throw new AzureError('network', e && e.name === 'AbortError' ? 'timed out' : (e && e.message) || 'no connection'); } finally { clearTimeout(t); }
  if (!res.ok) throw new AzureError(codeOfStatus(res.status), 'HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new AzureError('server', 'the audio was empty');
  return buf;
}

module.exports = { FREE_CHARS, SAFE_CHARS, validRegion, validVoice, hostFor, ratePct, buildSsml, AzureError, codeOfStatus, monthOf, usedIn, canSpend, addUsage, synthesize };
