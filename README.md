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
- **Quick practice** (Worksheets > Quick practice): worksheets built on the spot from the dictionary and real sentences, no Claude needed. Pick recently learned words, words you find hard, any of your words, or new common words, and choose question types (meanings, de/het, fill the gap, verb forms, word order). They are marked in the app and feed My mistakes.
- **Mistakes review** (Today): words you missed in the last 7 days across flashcards, listening and worksheets, ready to practise as flashcards, a listening round or a worksheet.
- **Saved setups** (Worksheets > Practice with Claude): name and reuse your favourite worksheet requests.
- **Progress**: weekly cards, listening answers, new words and accuracy compared with last week, a 14-day activity chart, your word-growth line, weak skills, trouble words and sounds.
- **Seasons and holidays** (Settings > Seasons & holidays): like on Varken board, Bigg wears a scarf in winter, shades in summer, and a hat for Christmas, Halloween, King's Day, Easter, Sinterklaas, New Year, Carnival, Valentine, St Patrick, Mother's and Father's Day, Prinsjesdag, Sint-Maarten, Bevrijdingsdag, 4th of July, Thanksgiving and your birthday, with falling petals, snow or leaves. He says seasonal things too. Switch it off, or try any look, in Settings.
- **Levels** instead of streaks: every card, listening answer, worksheet question, added word and finished session earns XP. Reaching a new level (Zaadje, Kiem, Spruit, Scheut, Knop, Bloempje...) gets a celebration from Bigg. Your level and XP bar are in the side menu and on the Today page.
- **Themes and polish**: six colour themes (Lagoon, Plum, Midnight, Slate, and the light Cream and Blossom), themed dropdown menus everywhere, ripples on buttons, animated checkboxes and sliders, bars that grow in, numbers that count up and a softly drifting background. Reduced-motion settings in Windows turn the movement off.
- **Hard mode** (worksheets): a switch on every worksheet and in Quick practice. Bigg leaves his dictionary at home and right answers give 50% more XP.
- **Daily mix**: on Today, three parts (flashcards, listening, a worksheet from your trouble words) with a bonus when all are done.
- **Wardrobe**: choose what Bigg wears. Seasons are free, a holiday hat is earned by opening BiggTaal on that holiday, and level hats can be added by giving a look in looks.js a level.
- **Bigg's dictionary**: click Bigg on a worksheet to look words up (Dutch to English or English to Dutch) while you work.
