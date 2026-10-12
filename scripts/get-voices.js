// Downloads the Piper text-to-speech engine and two Dutch voices into ./voices (not committed to git).
// Usage: node scripts/get-voices.js
// Sources: github.com/rhasspy/piper (MIT) and huggingface.co/rhasspy/piper-voices (voices are CC0).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', 'voices');
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_NL';
const FILES = [
  { url: 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip', out: 'piper_windows_amd64.zip', size: 22477236, sha256: 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea' },
  { url: `${HF}/alex/medium/nl_NL-alex-medium.onnx`, out: 'models/nl_NL-alex-medium.onnx', size: 63531476, sha256: '22f0497c4d895a09fbc6a469459aa8954ea0955d3c6e19dbcc2e23acbb93e30b' },
  { url: `${HF}/alex/medium/nl_NL-alex-medium.onnx.json`, out: 'models/nl_NL-alex-medium.onnx.json', size: 4965 },
  { url: `${HF}/pim/medium/nl_NL-pim-medium.onnx`, out: 'models/nl_NL-pim-medium.onnx', size: 63516050, sha256: '403e58c3675c394f505c2428117bf34cc56e9542dcf6eadbdd3a84706c12e048' },
  { url: `${HF}/pim/medium/nl_NL-pim-medium.onnx.json`, out: 'models/nl_NL-pim-medium.onnx.json', size: 5037 },
];

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

(async () => {
  fs.mkdirSync(path.join(root, 'models'), { recursive: true });
  for (const f of FILES) {
    const dest = path.join(root, f.out);
    if (fs.existsSync(dest) && fs.statSync(dest).size === f.size && (!f.sha256 || sha(dest) === f.sha256)) { console.log('have', f.out); continue; }
    console.log('downloading', f.out, '...');
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`${f.url}: HTTP ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    const size = fs.statSync(dest).size;
    if (size !== f.size) throw new Error(`${f.out}: expected ${f.size} bytes, got ${size}`);
    const got = sha(dest);
    if (f.sha256 && got !== f.sha256) { fs.unlinkSync(dest); throw new Error(`${f.out}: checksum mismatch (${got})`); }
    console.log('  ok', size, 'bytes', f.sha256 ? 'checksum verified' : 'sha256 ' + got);
  }
  const zip = path.join(root, 'piper_windows_amd64.zip');
  if (!fs.existsSync(path.join(root, 'piper', 'piper.exe'))) {
    console.log('unpacking piper ...');
    execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Expand-Archive -LiteralPath $env:VT_ZIP -DestinationPath $env:VT_DEST -Force'], { stdio: 'inherit', env: Object.assign({}, process.env, { VT_ZIP: zip, VT_DEST: root }) });
  }
  console.log('done:', path.join(root, 'piper', 'piper.exe'));
})().catch((e) => { console.error(e.message); process.exit(1); });
