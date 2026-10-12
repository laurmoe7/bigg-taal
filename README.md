# BiggTaal 🐷

A cute, dark Dutch learning app for Windows (Electron). Same pig and look as Varken board.

- **Flashcards** with spaced repetition (Leitner boxes) in three modes: flip, type the answer and grade yourself, or **type the Dutch word and only succeed when it is right** (a miss shows the answer and you type it once to move on). Bigg holds a flashcard, drops in at the top when you start and cheers, sways and spins as you go. Do more than the daily amount with new words, review ahead or a random mix.
- **Listening**: spell the word, pick the meaning, de/het, sentence dictation. Uses a Dutch voice installed in Windows.
- **Worksheets**: practice worksheets that Claude writes from the topics and grammar you pick, your words and your weak spots (you copy a prompt to chat and paste the JSON reply back), done inside the app, marked instantly where possible and by Claude for open answers, with a running record of your mistakes by skill.
- **Words** in tabs (all, nouns, verbs, other, needs work, new, learned, add), with search, a letter strip and pages of cards, so a big list stays easy to use; **Grammar** cheat sheets (B1), daily Dutch saying, streak and daily goal, a mascot who cheers you on.

## Run / build

```
npm install
npm start          # run the app
npm test           # logic tests
npm run voices     # downloads the Piper engine + Dutch voices into ./voices (checksum-verified)
npm run dist       # builds dist/BiggTaal Setup x.y.z.exe (fetches voices first if missing)
```

Data is saved in `%APPDATA%\biggtaal\data.json` (one backup per day beside it).

## Updates and releases

The installed app checks the GitHub releases of this repo a few seconds after start and every 6 hours, downloads a newer version quietly (only the changed parts), and installs it when you restart. Settings has a switch and a Check now button. Your data lives outside the app and is kept.

To ship a version: bump `version` in package.json, `npm test`, `npm run dist`, then publish the three files electron-updater needs (the installer, its `.blockmap` and `latest.yml`):

```
gh release create vX.Y.Z dist/BiggTaal-Setup-X.Y.Z.exe dist/BiggTaal-Setup-X.Y.Z.exe.blockmap dist/latest.yml --title "BiggTaal X.Y.Z"
```

The repo must be public (or the app would need a token) for installed apps to see the release. To test updating without a release, run `npm start` with `VT_UPDATE_URL=http://127.0.0.1:PORT` and a `dev-app-update.yml` (git-ignored) pointing at a folder that serves a newer `latest.yml`.

## How the app runs on this PC

The Desktop and Start-menu shortcuts run the app straight from this project folder (`npm run shortcut` recreates them). There is no installer and no build step for day-to-day use: whatever is saved in the folder is what opens next time. Ctrl+R or F5 reloads the screens while it is open; Ctrl + / Ctrl - / Ctrl 0 zoom in, out and back to normal (remembered). The window opens at about 96% of the screen (a change to `main.js` needs a restart). Words and progress live in `%APPDATA%iggtaal`, outside the folder, so editing code never touches them. The folder has to stay where it is, with its `node_modules` and `voices` folders.

Installers are only for sharing or a backup copy: `npm run dist` builds one, `npm run ship:local` builds and installs it silently (note: the installer rewrites the shortcuts to point at the installed copy; run `npm run shortcut` to point them back at the folder).

## Voices

Listening uses natural offline Dutch voices (alex, pim) from [Piper](https://github.com/rhasspy/piper) (MIT) with voice models from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) (CC0). They are not stored in git; `npm run voices` downloads them into `voices/` and the installer bundles them. Audio is generated on demand and cached in the data folder (`tts-cache`). Windows voices still work as a fallback.

## Files

`main.js` window, saving, voices, updates. `preload.js` bridge. `renderer/logic.js` pure rules (tested). `renderer/seed.js` starter words, verbs, grammar, pig lines. `renderer/pig.js` the mascot. `renderer/app.js` screens. `scripts/get-voices.js` downloads the voices.

## Claude import format

```json
{"words":[{"nl":"afspraak","en":"appointment","article":"de","example":"Ik heb een afspraak.","lesson":"Les 12"}],
 "lessons":[{"title":"Les 13","due":"2026-10-20"}]}
```

## Learning tools

- **FSRS scheduling**: flashcard reviews are timed with FSRS (the modern spaced-repetition algorithm used by Anki). The Again / Good / Easy buttons show the real number of days until you see the card again. Older words carry over from the previous box system.
- **Suggested words** (Words > Suggested): the most common Dutch words you do not have yet, in bands (top 500, 1,500, ...), added one by one or 24 at a time, each with a real example sentence.
- **Find examples** (Words > Add words): real Dutch sentences with English translations for the word you are adding.
- **Real sentences** (Listening): dictation with real Tatoeba sentences that use your words.
- Data sources and licences are in `data/README.md`.
- **Dictionary** (Words > Dictionary): look up Dutch or English words, including plurals and past tenses, with de/het, plural and verb forms from Wiktionary. **Add** puts a word in your list with an example sentence; **Look up** in the add form fills in de/het and the English.
