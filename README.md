# BiggTaal 🐷

A cute, dark Dutch learning app for Windows (Electron). Same pig and look as Varken board.

- **Flashcards** with spaced repetition (Leitner boxes), flip or type-the-answer, NL→EN, EN→NL or mixed. New words are capped per day.
- **Listening**: spell the word, pick the meaning, de/het, sentence dictation. Uses a Dutch voice installed in Windows.
- **Worksheets**: practice worksheets that Claude writes from your words, lessons and weak spots (you copy a prompt to chat and paste the JSON reply back), done inside the app, marked instantly where possible and by Claude for open answers, with a running record of your mistakes by skill. The old printable sheets (made offline, saved as PDF) are still there on their own tab.
- **Book lessons**: your NT2school chapters with due dates and a page per lesson: study just that lesson (flashcards, listening, worksheet), a reading view where you tap any word to hear it or add it, a finder for new words in the text (guesses de/het and pulls the example sentence), and exercises you can check with Claude (copy a ready-made prompt, paste the reply back, import the words).
- **Words**, **Grammar** cheat sheets (B1), daily Dutch saying, streak and daily goal, pig that cheers you on.

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

## Installing a build on this PC

`npm run ship:local` builds the installer and installs it on this PC silently (no download, no wizard): it closes BiggTaal if open, installs over the existing copy, checks the version and reopens the app. Your data stays. `npm run install:local -- --dry` shows what it would do.

## Voices

Listening uses natural offline Dutch voices (alex, pim) from [Piper](https://github.com/rhasspy/piper) (MIT) with voice models from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) (CC0). They are not stored in git; `npm run voices` downloads them into `voices/` and the installer bundles them. Audio is generated on demand and cached in the data folder (`tts-cache`). Windows voices still work as a fallback.

## Files

`main.js` window, saving, voices, updates. `preload.js` bridge. `renderer/logic.js` pure rules (tested). `renderer/seed.js` starter words, verbs, grammar, pig lines. `renderer/pig.js` the mascot. `renderer/app.js` screens. `scripts/get-voices.js` downloads the voices.

## Claude import format

```json
{"words":[{"nl":"afspraak","en":"appointment","article":"de","example":"Ik heb een afspraak.","lesson":"Les 12"}],
 "lessons":[{"title":"Les 13","due":"2026-10-20"}]}
```
