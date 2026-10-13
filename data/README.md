# Word and sentence data

These files power the **Dictionary**, **Suggested** words, **Find examples** and **Real sentences** features.
They are built by `node scripts/build-data.js <folder>` from three free sources:

| File | Source | Licence |
| --- | --- | --- |
| `dict.js` | Dutch Wiktionary, extracted by [kaikki.org](https://kaikki.org/dictionary/Dutch/) (wiktextract) | CC BY-SA 4.0 |
| `freq.js` | [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Dutch, from OpenSubtitles), matched to dictionary base forms | CC BY-SA 4.0 |
| `sentences.js` | [Tatoeba](https://tatoeba.org) sentence pairs via [manythings.org/anki](https://www.manythings.org/anki/) | CC BY 2.0 FR |
| `renderer/flags/*.svg` | [flag-icons](https://github.com/lipis/flag-icons) 7.5.0 (4x3 flags of the countries in the Bonus Lessons) | MIT (see `renderer/flags/LICENSE.txt`) |
| `renderer/mapdata.js` | Continents and rivers: [Natural Earth](https://www.naturalearthdata.com) 50m countries and rivers. Dutch provinces: CBS / PDOK boundaries via [cartomap](https://github.com/cartomap/nl). Simplified by `scripts/build-maps.js` | Natural Earth: public domain. Provinces: CC BY 4.0 (CBS open data), not re-checked against cartomap's repo |

Wiktionary meanings are shortened for flashcards, so give them a quick check.
