// Gives Electron's program file (node_modules/electron/dist/electron.exe) Bigg's pig icon and the name BiggTaal.
// The shortcuts start BiggTaal through that file, and Windows takes the taskbar, pinned and Task Manager icon from it, so without this you
// get the Electron atom. It uses rcedit, which is already in node_modules (a part of electron-builder), so nothing is downloaded.
// Usage: node scripts/stamp-icon.js          (npm run shortcut does this for you)
//        node scripts/stamp-icon.js <file>   (to try it on a copy)
// A new "npm install" of Electron brings the plain file back: run this again then. Close BiggTaal first (Windows locks a running program).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const rcedit = path.join(root, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
const exe = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const icon = path.join(root, 'build', 'icon.ico');
if (process.platform !== 'win32') { console.log('Only needed on Windows.'); process.exit(0); }
for (const f of [rcedit, exe, icon]) if (!fs.existsSync(f)) { console.error('Missing: ' + f + (f === rcedit ? '\n(run "npm install" in the project folder)' : '')); process.exit(1); }
try {
  execFileSync(rcedit, [exe, '--set-icon', icon, '--set-version-string', 'FileDescription', 'BiggTaal', '--set-version-string', 'ProductName', 'BiggTaal'], { stdio: 'pipe' });
  console.log('Done: ' + exe + ' now has the BiggTaal icon and name.');
} catch (e) {
  const why = String((e.stderr || '') + (e.message || ''));
  console.warn(/EBUSY|being used|denied|locked|Unable to commit/i.test(why) ? 'Could not change the icon because BiggTaal is open. Quit it (also from the tray), then run this again.' : 'Could not change the icon: ' + why.trim().slice(0, 300));
  process.exit(0); // not worth failing "npm run shortcut" over
}
