// Installs the installer in dist/ for the version in package.json onto this PC, silently, with no download:
// closes BiggTaal if it is open, runs the installer, checks the version, and reopens the app.
// Usage: node scripts/install-local.js [--dry] [--no-launch]   (build first: npm run dist, or use: npm run ship:local)
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const dry = process.argv.includes('--dry'), noLaunch = process.argv.includes('--no-launch');
const version = require('../package.json').version;
const installer = path.join(__dirname, '..', 'dist', `BiggTaal-Setup-${version}.exe`);
const appExe = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'BiggTaal', 'BiggTaal.exe');
const fail = (m) => { console.error('install-local: ' + m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const running = () => /BiggTaal\.exe/i.test(spawnSync('tasklist', ['/FI', 'IMAGENAME eq BiggTaal.exe', '/NH'], { encoding: 'utf8' }).stdout || '');
const installedVersion = () => (spawnSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Item -LiteralPath $env:VT_EXE).VersionInfo.ProductVersion`], { encoding: 'utf8', env: Object.assign({}, process.env, { VT_EXE: appExe }) }).stdout || '').trim();

(async () => {
  if (!fs.existsSync(installer)) fail(`${path.basename(installer)} not found in dist/. Build it first with: npm run dist`);
  const wasRunning = running();
  console.log(`installer: ${path.basename(installer)}\nbefore: ${fs.existsSync(appExe) ? installedVersion() : 'not installed'}${wasRunning ? ' (app is open)' : ''}`);
  if (dry) return console.log('dry run: would close the app, run the installer with /S, then reopen the app.');
  if (wasRunning) {
    spawnSync('taskkill', ['/IM', 'BiggTaal.exe'], { stdio: 'ignore' }); // polite close first
    for (let i = 0; i < 16 && running(); i++) await sleep(500);
    if (running()) { spawnSync('taskkill', ['/F', '/IM', 'BiggTaal.exe'], { stdio: 'ignore' }); await sleep(1500); }
  }
  const r = spawnSync(installer, ['/S'], { stdio: 'inherit' });
  if (r.status !== 0) fail(`the installer stopped with code ${r.status} (code 2 usually means another installer or the app is still running)`);
  const after = installedVersion();
  console.log('after: ' + after);
  if (!after.startsWith(version)) fail(`expected version ${version} but found ${after}`);
  if ((wasRunning || process.argv.includes('--launch')) && !noLaunch) { spawn(appExe, [], { detached: true, stdio: 'ignore' }).unref(); console.log('reopened BiggTaal'); }
  console.log('done');
})();
