# BiggTaal 🐷

A cute, dark Dutch learning app for Windows (Electron). Same pig and look as Varken board.

- **Flashcards** with spaced repetition (Leitner boxes), flip or type-the-answer, NL→EN, EN→NL or mixed. New words are capped per day.
- **Listening**: spell the word, pick the meaning, de/het, sentence dictation. Uses a Dutch voice installed in Windows.
- **Worksheets** made from your own words (de/het, blanks, translations, word order, verb forms), with an answer key, saved as PDF.
- **Book lessons**: your NT2school chapters with due dates, daily reminder notifications, a lesson helper (paste text, find new words, copy a prompt for Claude, import Claude's JSON).
- **Words**, **Grammar** cheat sheets (B1), daily Dutch saying, streak and daily goal, pig that cheers you on.

## Run / build

```
npm install
npm start          # run the app
npm test           # logic tests
npm run dist       # builds dist/BiggTaal Setup x.y.z.exe
```

Data is saved in `%APPDATA%\biggtaal\data.json` (one backup per day beside it).

## Files

`main.js` window, tray, reminders, saving. `preload.js` bridge. `renderer/logic.js` pure rules (tested). `renderer/seed.js` starter words, verbs, grammar, pig lines. `renderer/pig.js` the mascot. `renderer/app.js` screens.

## Claude import format

```json
{"words":[{"nl":"afspraak","en":"appointment","article":"de","example":"Ik heb een afspraak.","lesson":"Les 12"}],
 "lessons":[{"title":"Les 13","due":"2026-10-20"}]}
```
