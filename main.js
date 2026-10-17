// BiggTaal main process: window, saved data, voices, updates.
const { app, BrowserWindow, ipcMain, dialog, shell, screen, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const azure = require('./azure.js');

app.setAppUserModelId('com.laurmoe.biggtaal');
const firstInstance = app.requestSingleInstanceLock();
if (!firstInstance) app.quit(); // the running copy is brought to the front instead (second-instance below)

const dataFile = () => path.join(app.getPath('userData'), 'data.json');
const icon = () => path.join(__dirname, 'build', process.platform === 'win32' ? 'biggtaal-nl.ico' : 'icon.png');
let win = null, quitting = false;
let cache = null; // last saved state (the updater reads the autoUpdate setting from it)

// The app was called varkentaal before; copy its saved data over once.
function migrate() {
  try {
    const f = dataFile();
    if (fs.existsSync(f)) return;
    const old = path.join(app.getPath("appData"), "varkentaal", "data.json");
    if (fs.existsSync(old)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(old, f); }
  } catch {}
}
const backups = () => { try { return fs.readdirSync(path.dirname(dataFile())).filter((n) => /^backup-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort(); } catch { return []; } };
function readData() {
  const f = dataFile();
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  // data.json is there but cannot be read: never start over on top of it. Keep the broken file aside and load the newest good backup.
  try { fs.copyFileSync(f, f.replace(/\.json$/, '') + '-broken-' + Date.now() + '.json'); } catch {}
  for (const n of backups().reverse()) {
    try { return JSON.parse(fs.readFileSync(path.join(path.dirname(f), n), 'utf8')); } catch {}
  }
  return null;
}
function writeData(state) {
  const f = dataFile(), tmp = f + '.tmp';
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const b = path.join(path.dirname(f), 'backup-' + new Date().toISOString().slice(0, 10) + '.json');
  if (fs.existsSync(f) && !fs.existsSync(b)) { // one backup per day, before the first save of the day; the last 30 are kept
    fs.copyFileSync(f, b);
    for (const old of backups().slice(0, -30)) { try { fs.unlinkSync(path.join(path.dirname(f), old)); } catch {} }
  }
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, f);
}

// Zoom (Ctrl + / Ctrl - / Ctrl 0) is remembered between runs.
const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
const readPrefs = () => { try { return JSON.parse(fs.readFileSync(prefsFile(), 'utf8')); } catch { return {}; } };
function setZoom(z) {
  z = Math.min(1.6, Math.max(0.6, Math.round(z * 10) / 10));
  if (win && !win.isDestroyed()) win.webContents.setZoomFactor(z);
  try { fs.writeFileSync(prefsFile(), JSON.stringify(Object.assign(readPrefs(), { zoom: z }))); } catch {}
}

// `--quiet` (used when the app is started for testing): the window is never shown, so nothing pops up on the screen
const QUIET = process.argv.includes('--quiet');
function createWindow() {
  const wa = screen.getPrimaryDisplay().workAreaSize; // a good part of the screen (15% less than before)
  win = new BrowserWindow({
    width: Math.min(1500, Math.round(wa.width * 0.82)), height: Math.min(1064, Math.round(wa.height * 0.92)), minWidth: 820, minHeight: 560,
    backgroundColor: '#0f1c2b', title: 'BiggTaal', autoHideMenuBar: true, icon: icon(), show: !QUIET, skipTaskbar: QUIET,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false, backgroundThrottling: !QUIET },
  });
  win.removeMenu();
  // Run from the project folder, Windows would show the generic Electron icon on the taskbar: give the window the pig icon and
  // tell the taskbar which shortcut to use when you pin it (the same one as the desktop shortcut).
  if (process.platform === 'win32' && !app.isPackaged) {
    try { win.setAppDetails({ appId: 'com.laurmoe.biggtaal', appIconPath: path.join(__dirname, 'build', 'biggtaal-nl.ico'), appIconIndex: 0, relaunchDisplayName: 'BiggTaal', relaunchCommand: '"' + process.execPath + '" "' + app.getAppPath() + '"' }); } catch {}
  }
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = String(input.key || '').toLowerCase();
    if (input.control && (k === '=' || k === '+')) { e.preventDefault(); setZoom(win.webContents.getZoomFactor() + 0.1); }
    else if (input.control && k === '-') { e.preventDefault(); setZoom(win.webContents.getZoomFactor() - 0.1); }
    else if (input.control && k === '0') { e.preventDefault(); setZoom(1); }
    // Running from the project folder (not installed): Ctrl+R or F5 reloads the screens, so a change to renderer/ shows instantly.
    else if (!app.isPackaged && ((input.control && k === 'r') || k === 'f5')) { e.preventDefault(); win.webContents.reloadIgnoringCache(); }
  });
  win.webContents.once('did-finish-load', () => { const z = readPrefs().zoom; if (z) win.webContents.setZoomFactor(z); });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:/.test(url)) shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
}
function showWin() { if (QUIET) return; if (!win) createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

// Natural Dutch voices: the Piper engine plus voice models, bundled in ./voices (dev) or resources/voices (installed).
const voicesDir = () => (app.isPackaged ? path.join(process.resourcesPath, 'voices') : path.join(__dirname, 'voices'));
const piperExe = () => path.join(voicesDir(), 'piper', 'piper.exe');
function piperVoices() {
  try {
    if (!fs.existsSync(piperExe())) return [];
    const dir = path.join(voicesDir(), 'models');
    return fs.readdirSync(dir).filter((f) => /^nl_NL-[a-z0-9]+-medium\.onnx$/.test(f) && fs.existsSync(path.join(dir, f + '.json'))).map((f) => f.split('-')[1]);
  } catch { return []; }
}
ipcMain.handle('tts:voices', () => piperVoices());
// Online voices (Azure Speech). The key is encrypted with Windows' own protection (safeStorage) and kept in its own file next to the data,
// never in data.json, so it does not end up in exports or backups. Every clip is cached, so a word you have heard once plays offline later.
const azFile = () => path.join(app.getPath('userData'), 'azure.json');
const azRead = () => { try { return JSON.parse(fs.readFileSync(azFile(), 'utf8')); } catch { return {}; } };
const azWrite = (o) => { const tmp = azFile() + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o)); fs.renameSync(tmp, azFile()); };
function azKey() { const c = azRead(); if (!c.key || !safeStorage.isEncryptionAvailable()) return ''; try { return safeStorage.decryptString(Buffer.from(c.key, 'base64')); } catch { return ''; } }
let azLast = ''; const azTold = {};
function azProblem(e) { // remember what went wrong and tell the page, at most once every five minutes per kind of problem
  azLast = e.code || 'server';
  if (win && !win.isDestroyed() && Date.now() - (azTold[azLast] || 0) > 300000) { azTold[azLast] = Date.now(); win.webContents.send('azure:problem', azLast); }
}
async function azSynth(text, voice, ls) {
  const key = azKey(), month = azure.monthOf(), c = azRead();
  if (!key) throw new azure.AzureError('auth', 'no key');
  if (!azure.canSpend(c.usage, month, text.length)) throw new azure.AzureError('limit', 'the free characters of this month are used up');
  const buf = await azure.synthesize({ key, region: c.region || 'westeurope', voice, text, ls });
  const c2 = azRead(); c2.usage = azure.addUsage(c2.usage, month, text.length); azWrite(c2);
  return buf;
}
ipcMain.handle('azure:get', () => { const c = azRead(), m = azure.monthOf(); return { hasKey: !!azKey(), region: c.region || 'westeurope', month: m, chars: azure.usedIn(c.usage, m), limit: azure.FREE_CHARS, safe: azure.SAFE_CHARS, secure: safeStorage.isEncryptionAvailable(), last: azLast }; });
ipcMain.handle('azure:set', (_e, key, region) => {
  region = String(region || '').trim().toLowerCase(); key = String(key || '').trim();
  if (!azure.validRegion(region)) return Promise.reject(new Error('That region does not look right. It is a short name like westeurope.'));
  const c = azRead(); c.region = region;
  if (key) {
    if (!/^[A-Za-z0-9_-]{20,120}$/.test(key)) return Promise.reject(new Error('That does not look like a Speech key. Copy "Key 1" from the Azure portal.'));
    if (!safeStorage.isEncryptionAvailable()) return Promise.reject(new Error('Windows could not protect the key on this PC, so it was not saved.'));
    c.key = safeStorage.encryptString(key).toString('base64');
  }
  azWrite(c); azLast = ''; return true;
});
ipcMain.handle('azure:clear', () => { const c = azRead(); delete c.key; azWrite(c); azLast = ''; return true; });
ipcMain.handle('azure:test', async () => { try { await azSynth('Hallo, dit is een test van mijn stem.', 'nl-NL-ColetteNeural', 1); azLast = ''; return { ok: true }; } catch (e) { return { ok: false, code: e.code || 'server', message: e.message }; } });

const ttsInflight = new Map(); // identical requests share one run
function piperJob(out, text, voice, ls) {
  return new Promise((resolve, reject) => {
    const tmp = out + ".tmp";
    const p = spawn(piperExe(), ["--model", path.join(voicesDir(), "models", `nl_NL-${voice}-medium.onnx`), "--output_file", tmp, "--length_scale", String(ls)], { cwd: path.dirname(piperExe()), windowsHide: true });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0 && fs.existsSync(tmp)) { fs.renameSync(tmp, out); resolve(fs.readFileSync(out)); }
      else reject(new Error("piper failed (" + code + "): " + err.slice(-200)));
    });
    p.stdin.end(text + '\n');
  });
}
async function azureJob(out, text, voice, ls) {
  try {
    const buf = await azSynth(text, voice, ls);
    const tmp = out + '.tmp'; fs.writeFileSync(tmp, buf); fs.renameSync(tmp, out);
    return buf;
  } catch (e) { // no key, no internet, the free characters used up...: the page is told, and an offline voice reads it instead
    azProblem(e);
    const fb = piperVoices()[0];
    if (!fb) throw e;
    return synth(text, fb, ls);
  }
}
function synth(text, voice, ls) { // voice: a Piper name like "alex", or "az:nl-NL-ColetteNeural" for an Azure voice
  const online = voice.startsWith('az:'), cache = path.join(app.getPath("userData"), "tts-cache");
  fs.mkdirSync(cache, { recursive: true });
  const out = path.join(cache, crypto.createHash("sha1").update(voice + "|" + ls.toFixed(2) + "|" + text).digest("hex") + (online ? ".mp3" : ".wav"));
  if (fs.existsSync(out)) { const now = new Date(); try { fs.utimesSync(out, now, now); } catch {} return Promise.resolve(fs.readFileSync(out)); }
  if (ttsInflight.has(out)) return ttsInflight.get(out);
  const job = (online ? azureJob(out, text, voice.slice(3), ls) : piperJob(out, text, voice, ls)).finally(() => ttsInflight.delete(out));
  ttsInflight.set(out, job);
  return job;
}
ipcMain.handle("tts:speak", (_e, text, voice, lengthScale) => {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text) return Promise.reject(new Error("empty text"));
  voice = String(voice || '');
  if (voice.startsWith('az:') ? !azure.validVoice(voice.slice(3)) : !piperVoices().includes(voice)) return Promise.reject(new Error("unknown voice"));
  return synth(text, voice, Math.min(2.5, Math.max(0.5, Number(lengthScale) || 1)));
});
function trimCache() { // keep the audio cache from growing forever: drop clips not used for a month
  try {
    const dir = path.join(app.getPath('userData'), 'tts-cache');
    for (const f of fs.readdirSync(dir)) { const fp = path.join(dir, f); if (Date.now() - fs.statSync(fp).atimeMs > 30 * 864e5) fs.unlinkSync(fp); }
  } catch {}
}

// Updates: checks the GitHub releases of laurmoe7/bigg-taal (build.publish in package.json), downloads quietly, installs on restart.
const updateState = { status: 'idle', version: '', percent: 0, error: '' };
function setUpdate(patch) {
  Object.assign(updateState, patch);
  if (win && !win.isDestroyed()) win.webContents.send('update:state', updateState);
}
let updaterOn = false;
function initUpdater() {
  // Installed app: use the release feed. Dev run: only when VT_UPDATE_URL points at a test server (never in the installed app).
  if (app.isPackaged) updaterOn = true;
  else if (process.env.VT_UPDATE_URL) { autoUpdater.forceDevUpdateConfig = true; autoUpdater.setFeedURL({ provider: 'generic', url: process.env.VT_UPDATE_URL }); updaterOn = true; }
  if (!updaterOn) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => setUpdate({ status: 'checking', error: '' }));
  autoUpdater.on('update-available', (i) => setUpdate({ status: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => setUpdate({ status: 'current' }));
  autoUpdater.on('download-progress', (p) => setUpdate({ status: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (i) => {
    setUpdate({ status: 'ready', version: i.version, percent: 100 });
  });
  autoUpdater.on('error', (e) => setUpdate({ status: 'error', error: String((e && e.message) || e).slice(0, 200) }));
}
function checkUpdates(manual) {
  if (!updaterOn) return;
  if (!manual && cache && cache.settings && cache.settings.autoUpdate === false) return;
  if (updateState.status === 'downloading' || updateState.status === 'ready') return;
  autoUpdater.checkForUpdates().catch(() => {});
}
ipcMain.handle('update:state', () => updateState);
ipcMain.handle('update:check', () => { if (!updaterOn) setUpdate({ status: 'unavailable' }); else checkUpdates(true); });
// Silent install (no wizard), then the app reopens by itself.
ipcMain.handle('update:install', () => { quitting = true; autoUpdater.quitAndInstall(true, true); });
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('data:load', () => { cache = readData(); return cache; });
ipcMain.handle('data:save', (_e, state) => { cache = state; writeData(state); return true; });
ipcMain.on('data:save-sync', (e, state) => { try { cache = state; writeData(state); e.returnValue = true; } catch { e.returnValue = false; } });
ipcMain.handle('data:where', () => dataFile());
ipcMain.handle('data:reveal', () => { shell.showItemInFolder(dataFile()); });
ipcMain.handle('app:login', (_e, on) => { app.setLoginItemSettings({ openAtLogin: !!on }); return true; });
ipcMain.handle('file:export', async (_e, text, name) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text);
  return r.filePath;
});
ipcMain.handle('file:import', async () => {
  const r = await dialog.showOpenDialog(win, { defaultPath: app.getPath('documents'), properties: ['openFile'], filters: [{ name: 'JSON, text or CSV', extensions: ['json', 'txt', 'csv'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return { name: path.basename(r.filePaths[0]), text: fs.readFileSync(r.filePaths[0], 'utf8') };
});

app.on('second-instance', showWin);
app.whenReady().then(() => {
  if (!firstInstance) return;
  migrate();
  trimCache();
  cache = readData();
  createWindow();
  initUpdater();
  setTimeout(() => checkUpdates(false), 8000);
  setInterval(() => checkUpdates(false), 6 * 3600 * 1000);
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => app.quit());
