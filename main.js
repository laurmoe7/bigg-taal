// BiggTaal main process: window, tray, saved data, lesson reminders.
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

app.setAppUserModelId('com.laurmoe.biggtaal');
if (!app.requestSingleInstanceLock()) app.quit();

const dataFile = () => path.join(app.getPath('userData'), 'data.json');
const icon = () => path.join(__dirname, 'build', 'icon.png');
let win = null, tray = null, quitting = false;
let cache = null; // last saved state, read by the reminder timer

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
  win.on('close', (e) => {
    const s = (cache && cache.settings) || {};
    if (!quitting && s.tray) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => { win = null; });
}
function showWin() { if (!win) createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

function createTray() {
  const img = nativeImage.createFromPath(icon()).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('BiggTaal');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open BiggTaal', click: showWin },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', showWin);
}

// Reminders: once a day at the chosen time, unless the daily goal is already met and no lesson is open.
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function notify(title, body) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: icon() });
  n.on('click', showWin);
  n.show();
}
let lastRemind = '';
function tick() {
  const s = cache && cache.settings;
  if (!s || !s.remindersOn) return;
  const d = new Date();
  const hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if (hhmm < (s.reminderTime || '19:00') || lastRemind === today()) return;
  lastRemind = today();
  const log = (cache.log || {})[today()] || {};
  const live = (cache.words || []).filter((w) => !w.deleted);
  const newLeft = Math.max(0, (s.newPerDay == null ? 10 : s.newPerDay) - (log.newWords || 0));
  const dueWords = live.filter((w) => w.reps > 0 && (!w.due || w.due <= today())).length + Math.min(newLeft, live.filter((w) => !w.reps).length);
  const open = (cache.lessons || []).filter((l) => l.status !== 'done').sort((a, b) => ((a.due || '9') < (b.due || '9') ? -1 : 1));
  const next = open[0];
  if ((log.reviews || 0) >= (s.dailyGoal || 10) && !next) return;
  const bits = [];
  if (next) bits.push(`Next lesson: ${next.title}${next.due && next.due < today() ? ' (whenever you are ready!)' : ''}.`);
  if (dueWords) bits.push(`${dueWords} flashcards are waiting for you.`);
  const hello = ['Yay, it is Dutch time! 🌸', 'Bigg is so excited to study with you! 💗', 'A tiny bit of Dutch makes a big difference! ✨', 'Your little plant is cheering for you! 🌱'];
  notify(hello[Math.floor(Math.random() * hello.length)], bits.join(' ') || 'Just a few minutes of Dutch today. You can do it! 💗');
}

ipcMain.handle('data:load', () => { cache = readData(); return cache; });
ipcMain.handle('data:save', (_e, state) => { cache = state; writeData(state); return true; });
ipcMain.handle('data:where', () => dataFile());
ipcMain.handle('data:reveal', () => { shell.showItemInFolder(dataFile()); });
ipcMain.handle('notify:test', () => notify('Hi, it is Bigg! 🌸', 'Reminders work. I will cheer you on every day!'));
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
  cache = readData();
  createWindow();
  createTray();
  setInterval(tick, 30000);
  setTimeout(tick, 5000);
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (!(cache && cache.settings && cache.settings.tray)) app.quit(); });
