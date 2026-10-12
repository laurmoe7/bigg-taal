// BiggTaal main process: window, saved data, voices, updates.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

app.setAppUserModelId('com.laurmoe.biggtaal');
if (!app.requestSingleInstanceLock()) app.quit();

const dataFile = () => path.join(app.getPath('userData'), 'data.json');
const icon = () => path.join(__dirname, 'build', 'icon.png');
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
function readData() {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return null; }
}
function writeData(state) {
  const f = dataFile(), tmp = f + '.tmp';
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const b = path.join(path.dirname(f), 'backup-' + new Date().toISOString().slice(0, 10) + '.json');
  if (fs.existsSync(f) && !fs.existsSync(b)) fs.copyFileSync(f, b); // one backup per day, before the first save of the day
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, f);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 820, minHeight: 560,
    backgroundColor: '#0f1c2b', title: 'BiggTaal', autoHideMenuBar: true, icon: icon(),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:/.test(url)) shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
}
function showWin() { if (!win) createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

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
const ttsInflight = new Map(); // identical requests share one piper run
function synth(text, voice, ls) {
  const cache = path.join(app.getPath("userData"), "tts-cache");
  fs.mkdirSync(cache, { recursive: true });
  const out = path.join(cache, crypto.createHash("sha1").update(voice + "|" + ls.toFixed(2) + "|" + text).digest("hex") + ".wav");
  if (fs.existsSync(out)) { const now = new Date(); try { fs.utimesSync(out, now, now); } catch {} return Promise.resolve(fs.readFileSync(out)); }
  if (ttsInflight.has(out)) return ttsInflight.get(out);
  const job = new Promise((resolve, reject) => {
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
  }).finally(() => ttsInflight.delete(out));
  ttsInflight.set(out, job);
  return job;
}
ipcMain.handle("tts:speak", (_e, text, voice, lengthScale) => {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text) return Promise.reject(new Error("empty text"));
  if (!piperVoices().includes(voice)) return Promise.reject(new Error("unknown voice"));
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
ipcMain.handle('update:install', () => { quitting = true; autoUpdater.quitAndInstall(false, true); });
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('data:load', () => { cache = readData(); return cache; });
ipcMain.handle('data:save', (_e, state) => { cache = state; writeData(state); return true; });
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
ipcMain.handle('print:sheet', async (_e, html) => { // save a worksheet as a PDF
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const pdf = await w.webContents.printToPDF({ pageSize: 'A4' });
  w.destroy();
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), 'BiggTaal-worksheet.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, pdf);
  shell.showItemInFolder(r.filePath);
  return r.filePath;
});

app.on('second-instance', showWin);
app.whenReady().then(() => {
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
