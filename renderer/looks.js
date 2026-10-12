// Bigg's seasonal and holiday clothes, ported from Varken board (his big brother): hats, scarves, shades and falling petals, snow or leaves.
// Loads before pig.js, which draws them (pigSvg opts.look). Holiday dates live in logic.js (L.holidayOf). A hat takes the place of his sprout for those days; at night the nightcap wins.
const heart = (x, y, s, f) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C-6 -4 -12 4 0 12 C12 4 6 -4 0 4Z" fill="${f}"/>`;
// A striped scarf round his middle, just under the snout, with a tail on the right. Drawn behind the sticky note and his dictionary. The
// stripes are clipped to the scarf's own shape so they can't spill out.
const SCARF_BAND = 'M20 79 Q60 95 100 79 L99 91 Q60 107 21 91 Z';
const SCARF_TAIL = 'M82 94 L98 91 L100 114 L84 118 Z';
const SCARF = `<g class="scarf"><clipPath id="scarfClip"><path d="${SCARF_BAND}"/><path d="${SCARF_TAIL}"/></clipPath>
  <path d="${SCARF_BAND}" fill="#b9a4ff"/><path d="${SCARF_TAIL}" fill="#b9a4ff"/>
  <g clip-path="url(#scarfClip)" stroke="#ff9ec7" stroke-width="3.6">${[24, 36, 48, 60, 72, 84, 96].map((x) => `<path d="M${x} 74 l8 48"/>`).join('')}</g>
  <path d="M86 118 l-.5 4.5 M91 117 l-.5 4.5 M96 116 l-.5 4.5" stroke="#efe8ff" stroke-width="1.8" stroke-linecap="round"/></g>`;
const EARMUFFS = `<g class="earmuffs"><path d="M17 56 Q60 -8 103 56" fill="none" stroke="#b9a4ff" stroke-width="4.5" stroke-linecap="round"/><circle cx="17" cy="58" r="9" fill="#c9b8ff"/><circle cx="103" cy="58" r="9" fill="#c9b8ff"/><circle cx="14.5" cy="55.5" r="2.4" fill="#efe8ff"/><circle cx="100.5" cy="55.5" r="2.4" fill="#efe8ff"/></g>`;
const HEART_D = 'M0 11 C-15 0 -13 -13 -6 -12.5 C-2.5 -12 0 -9.5 0 -7 C0 -9.5 2.5 -12 6 -12.5 C13 -13 15 0 0 11 Z';
const heartLens = (cx, cy, id) => `<g transform="translate(${cx} ${cy - 1.5})"><clipPath id="lens${id}"><path d="${HEART_D}"/></clipPath>
  <path d="${HEART_D}" fill="url(#lensGrad)" fill-opacity=".86"/>
  <g clip-path="url(#lens${id})"><path d="M-16 4 Q0 15 16 4 L16 16 L-16 16 Z" fill="#9c1650" opacity=".32"/><path d="M-13 -10 L-8.4 -13 L-12 1 L-14 1 Z" fill="#fff" opacity=".5"/><path d="M-6.6 -11.6 L-4.6 -12.4 L-9.6 2 L-11 2 Z" fill="#fff" opacity=".32"/><ellipse cx="4.6" cy="5.6" rx="3.6" ry="1.4" transform="rotate(-24 4.6 5.6)" fill="#ffd0e4" opacity=".28"/></g>
  <path d="${HEART_D}" fill="none" stroke="#c2255f" stroke-width="3.4" stroke-linejoin="round" opacity=".35"/><path d="${HEART_D}" fill="none" stroke="#fff0f6" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="${HEART_D}" fill="none" stroke="#ffc2da" stroke-width=".7" stroke-linejoin="round" transform="scale(.8)" opacity=".8"/><circle cx="-5.8" cy="-6.4" r="1.1" fill="#fff"/></g>`;
const SHADES = `<g class="shades"><defs><linearGradient id="lensGrad" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ff86b8"/><stop offset=".55" stop-color="#e83f86"/><stop offset="1" stop-color="#b3205a"/></linearGradient></defs>
  <path d="M31 61 Q24 58.4 19 56" fill="none" stroke="#fff0f6" stroke-width="2.4" stroke-linecap="round"/><path d="M89 61 Q96 58.4 101 56" fill="none" stroke="#fff0f6" stroke-width="2.4" stroke-linecap="round"/><path d="M31 61 Q24 58.4 19 56" fill="none" stroke="#ffc2da" stroke-width=".8" stroke-linecap="round" opacity=".9"/>
  <path d="M53 57.8 Q60 53.8 67 57.8" fill="none" stroke="#fff0f6" stroke-width="2.8" stroke-linecap="round"/><path d="M53 57.8 Q60 53.8 67 57.8" fill="none" stroke="#ffc2da" stroke-width=".8" stroke-linecap="round" opacity=".9"/>
  ${heartLens(43, 64, 'L')}${heartLens(77, 64, 'R')}<circle cx="31.4" cy="60.6" r="1.7" fill="#ffd35a"/><circle cx="88.6" cy="60.6" r="1.7" fill="#ffd35a"/><circle cx="31" cy="60.2" r=".6" fill="#fff6cf"/><circle cx="88.2" cy="60.2" r=".6" fill="#fff6cf"/>
  <path transform="translate(98 49) scale(.9)" d="M0 -4 L1.1 -1.1 L4 0 L1.1 1.1 L0 4 L-1.1 1.1 L-4 0 L-1.1 -1.1Z" fill="#ffe29a"/></g>`;
const star = (x, y, s, f) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -4 l1.2 2.7 2.9 .3 -2.2 2 .6 2.9 -2.5 -1.5 -2.5 1.5 .6 -2.9 -2.2 -2 2.9 -.3z" fill="${f}"/>`;
const HATS = {
  stpatrick: `<g class="hat"><ellipse cx="60" cy="44.5" rx="33" ry="7.2" fill="#2a9560"/><path d="M45 44 L47 12 Q60 6 73 12 L75 44 Q60 48 45 44 Z" fill="#3fbf7a"/><ellipse cx="60" cy="12" rx="13.3" ry="3.6" fill="#58d894"/>
    <path d="M47 14 Q50 30 49 43" stroke="#ffffff30" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M45.6 33 Q60 38.5 74.4 33 L75 42 Q60 47 45 42 Z" fill="#1f5a3d"/><rect x="54.5" y="33" width="11" height="10" rx="2" fill="none" stroke="#ffd35a" stroke-width="2.6"/><rect x="57.6" y="36.4" width="4.8" height="3.4" rx=".8" fill="#ffd35a"/>
    <g transform="translate(72 24)"><circle cx="-2.4" cy="0" r="2.6" fill="#8ff0c8"/><circle cx="2.4" cy="0" r="2.6" fill="#8ff0c8"/><circle cx="0" cy="-2.6" r="2.6" fill="#8ff0c8"/><circle cx="0" cy="2.2" r="2.4" fill="#6ee0a8"/><path d="M0 4 q1 4 3 6" stroke="#2a9560" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>
    ${star(34, 24, .8, '#ffd35a')}${star(88, 40, .6, '#ffd35a')}</g>`,
  fourth: `<g class="hat"><clipPath id="fourthClip"><path d="M45 44 L47 12 Q60 7 73 12 L75 44 Z"/></clipPath>
    <ellipse cx="60" cy="44" rx="32" ry="7" fill="#2f3fa8"/><ellipse cx="60" cy="43" rx="32" ry="7" fill="#4a5fd0"/><path d="M32 43 Q60 50 88 43" fill="none" stroke="#7d8fff" stroke-width="1.4" opacity=".7"/>
    <g clip-path="url(#fourthClip)">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${44 + i * 4.5}" y="6" width="4.5" height="40" fill="${i % 2 ? '#fffaf5' : '#ff5d6c'}"/>`).join('')}<rect x="44" y="30" width="32" height="11" fill="#2f3fa8"/>
      <path d="M52 12 q-1 14 -1 18 M60 8 v22 M68 12 q1 14 1 18" stroke="#ffffff30" stroke-width="2.4" fill="none"/></g>
    <ellipse cx="60" cy="11.5" rx="13.2" ry="3.4" fill="#ffd9de"/><ellipse cx="60" cy="11" rx="13.2" ry="3.4" fill="none" stroke="#fffaf5" stroke-width="1"/>
    ${star(51, 35.5, 1.15, '#fffaf5')}${star(60, 35.5, 1.15, '#fffaf5')}${star(69, 35.5, 1.15, '#fffaf5')}
    <path d="M46 41 Q60 46 74 41" fill="none" stroke="#ffd35a" stroke-width="1.8" stroke-linecap="round"/>${star(88, 18, .9, '#ffd35a')}${star(33, 24, .7, '#fff')}</g>`,
};
// Falling bits: one piece per colour, each with its own start, speed and delay so they never move in step.
const petalPath = (f, s) => `<path transform="scale(${s || 1})" d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="${f}"/>`;
const starPath = (f) => `<path d="M0 -3 l.9 2 2.1 .2 -1.6 1.4 .5 2.2 -1.9 -1.1 -1.9 1.1 .5 -2.2 -1.6 -1.4 2.1 -.2z" fill="${f}"/>`;
const fallPieces = (shape, colors) => colors.map((c, i) => `<g class="fall" style="--x:${-84 + i * (96 / Math.max(1, colors.length - 1)) | 0}px;--t:${14 + (i % 3) * 3}s;--d:${(i * 2.9) % 12}s">${shape(c, i)}</g>`).join('');
const FALLS = {
  petal: fallPieces((c) => petalPath(c, 1.2), ['#ffc6dc', '#fff0f6', '#ffa6c4', '#e9d8ff', '#ffe0ec', '#ffb3cf']),
  leaf: fallPieces((c) => petalPath(c, 1.5), ['#ffb26b', '#e8624a', '#ffd35a', '#c9794a', '#ff9a3d']),
  snow: fallPieces((c, i) => `<circle r="${[2.8, 2, 3.2, 1.8, 2.5, 2.2][i % 6]}" fill="${c}"/>`, ['#ffffff', '#e6f1ff', '#ffffff', '#d4e8ff', '#ffffff', '#f0f7ff']),
  sun: fallPieces((c, i) => (i % 2 ? starPath(c) : `<circle r="${[2.2, 1.6, 2.6][i % 3]}" fill="${c}"/>`), ['#ffe36e', '#fff6b8', '#ffb347', '#ffffff', '#ffd35a', '#ffe9a0']),
};
const LOOK_DEFS = {
  winter: { label: '❄️ Winter (scarf and earmuffs)', earmuffs: true, scarf: true, fall: 'snow' },
  spring: { label: '🌸 Spring', hat: 'springhat', fall: 'petal' },
  summer: { label: '😎 Summer', shades: true, fall: 'sun' },
  autumn: { label: '🍂 Autumn', hat: 'autumnhat', fall: 'leaf' },
  christmas: { label: '🎅 Christmas (18-25 Dec)', hat: 'santa' },
  halloween: { label: '🎃 Halloween (25-31 Oct)', hat: 'witch' },
  kingsday: { label: "👑 King's Day (27 Apr)", hat: 'crown' },
  thanksgiving: { label: '🦃 Thanksgiving', hat: 'pilgrim' },
  easter: { label: '🐰 Easter (Good Friday to Monday)', hat: 'bunny' },
  birthday: { label: '🎂 Your birthday', hat: 'birthday' },
  sinterklaas: { label: '🎁 Sinterklaas (3-5 Dec)', hat: 'sinterklaas' },
  newyear: { label: '🎆 New Year (30 Dec-1 Jan)', hat: 'newyear' },
  carnival: { label: '🎭 Carnival', hat: 'carnival' },
  valentine: { label: '💘 Valentine (12-14 Feb)', hat: 'valentine' },
  stpatrick: { label: '☘️ St Patrick (17 Mar)', hat: 'stpatrick' },
  mothersday: { label: "💐 Mother's Day (2nd Sun of May)", hat: 'mothersday' },
  fathersday: { label: "🧢 Father's Day (3rd Sun of June)", hat: 'fathersday' },
  prinsjesdag: { label: '👒 Prinsjesdag (3rd Tue of Sept)', hat: 'prinsjesdag' },
  sintmaarten: { label: '🏮 Sint-Maarten (11 Nov)', hat: 'sintmaarten' },
  bevrijding: { label: '🇳🇱 Bevrijdingsdag (5 May)', hat: 'bevrijding' },
  leafband: { label: '🌱 Leaf crown (level 5)', hat: 'leafband', level: 5 },
  straw: { label: '🌻 Sun hat (level 10)', hat: 'straw', level: 10 },
  beanie: { label: '🧶 Knit beanie (level 20)', hat: 'beanie', level: 20 },
  cowboy: { label: '🤠 Cowboy hat (level 30)', hat: 'cowboy', level: 30 },
  tophat: { label: '🎩 Top hat (level 40)', hat: 'tophat', level: 40 },
  wizardhat: { label: '🧙 Wizard hat (level 50)', hat: 'wizardhat', level: 50 },
  gradcap: { label: '🎓 Graduation cap (level 60)', hat: 'gradcap', level: 60 },
  captain: { label: "⚓ Captain's cap (level 70)", hat: 'captain', level: 70 },
  knight: { label: "🛡️ Knight's helmet (level 80)", hat: 'knight', level: 80 },
  pirate: { label: '🏴‍☠️ Pirate hat (level 90)', hat: 'pirate', level: 90 },
  royal: { label: '👑 Royal crown (level 92)', hat: 'royal', level: 92 },
  legend: { label: '🌟 Legend tiara (level 99)', hat: 'legend', level: 99 },
  fourth: { label: '🎆 4th of July (3-4 Jul)', hat: 'fourth' },
};

// What Bigg says on special days and in each season (he is always sweet).
const LOOK_SAYS = {
  christmas: ['Merry Kerstmis! I love learning Dutch with you by the tree. 🎄', 'Ho ho ho! Santa pigs are the cutest, right?', 'Hot cocoa and a few Dutch words? Perfect. ☕'],
  halloween: ['Boo! Did I scare you? I am just a happy little witch. 🎃', 'Happy Halloween! Trick or treat, I pick treat. 💗', 'Look at my witch hat! Do you like it?'],
  kingsday: ['Lang leve de koning! Oranje boven! 🧡', 'Happy Koningsdag! Do I look royal in my crown?', 'Everything is orange today, even my heart. 🧡'],
  thanksgiving: ['Happy Thanksgiving! I am thankful for you. 💗', 'Thankful for every Dutch word you learn!', 'Gobble gobble! Pass the pumpkin pie. 🥧'],
  easter: ['Vrolijk Pasen! Hop hop hop! 🐰', 'Look at my bunny ears! Do you like them?', 'Happy Easter! Chocolate eggs for everyone. 🥚'],
  birthday: ['Happy birthday, {name}!! 🎂 You are my favourite human.', 'Gefeliciteerd! I wore my party hat just for you. 🎉', 'It is your day! Learn one word, then eat cake. 💗'],
  sinterklaas: ['Sinterklaas is coming! Is my shoe ready? 🎁', 'Pepernoten! Pepernoten! 💗', 'I have been a very good pig this year!'],
  newyear: ['Gelukkig nieuwjaar! Oliebollen first, Dutch later. 🎆', 'New year, new words! I believe in you. ✨', '3, 2, 1... happy new year! 🎉'],
  carnival: ['Alaaf! Look at my jester hat! 🎭', 'Carnival! Today is for dancing. And maybe one word. 💗', 'Do you like my costume?'],
  valentine: ['Happy Valentine! You are so loved. 💘', 'Roses are red, Dutch is fun, I am so proud of all you have done. 💗', 'Boop! That is a Valentine kiss.'],
  stpatrick: ['Lucky me, lucky you! Happy St Patrick\'s Day! ☘️', 'I found a four-leaf clover! Good luck today.', 'Top of the morning to you! 💚'],
  fourth: ['Happy 4th of July! Fireworks are pretty (and a little loud). 🎆', 'Have a wonderful 4th! 💗', 'Stars, stripes and Dutch words! 🌟'],
  mothersday: ['Happy Mother\'s Day! Moederdag! 💐 Give your mum a hug from me.', 'Flowers for all the mums today! 🌸'],
  fathersday: ['Happy Father\'s Day! Vaderdag! Give your dad a hug from me. 💗', 'Dad jokes are allowed today. Oink!'],
  prinsjesdag: ['Prinsjesdag! Look at my fancy hat! 👒', 'A fancy hat for a fancy day!'],
  sintmaarten: ['Sint-Maarten! Sinte Sinte Maarten... 🏮', 'Little lanterns and sweet songs tonight! 💗'],
  bevrijding: ['Happy Bevrijdingsdag! Free as a pig. 🇳🇱', 'Freedom day! Be proud of how far you have come. 💗'],
};
const SEASON_SAYS = {
  winter: ['Brrr! My scarf keeps me warm. Cosy Dutch time! ❄️', 'Hot chocolate and flashcards? Yes please! ☕'],
  spring: ['Spring! The flowers are blooming and so are you. 🌸', 'Lente! A fresh start for your Dutch. 🌷'],
  summer: ['Summer! Cool shades, warm heart. 😎', 'Ice cream after your cards? Deal! 🍦'],
  autumn: ['Autumn leaves! Cosy time for learning. 🍂', 'Pumpkin season! Pumpkin AND Dutch. 🎃'],
};
// Settings > Seasons & holidays: switched on by default; a look picked there is shown until the app is reloaded.
const userName = () => String((S && S.settings && S.settings.name) || '').trim();
// "{name}'s birthday (10 May)" in the wardrobe, and the date for the holiday check; call after loading and whenever the name or birthday changes
function refreshBirthday() {
  const s = (S && S.settings) || {}, n = userName(), b = String(s.birthday || ''), x = /^\d{4}-(\d{2})-(\d{2})$/.exec(b);
  LOOK_DEFS.birthday.label = '🎂 ' + (n ? n + "'s" : 'Your') + ' birthday' + (x ? ' (' + +x[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+x[1] - 1] + ')' : ' (set it in Settings)');
  L.setBirthday(b);
}
const looksPrefs = { preview: '' }; // '' = today's look, 'none' = no clothes, or a look id
const lookOn = () => true; // Bigg follows the season and holidays unless you pick an outfit in the wardrobe
// The look Bigg wears now: a preview if one is picked, else today's season or holiday (or none when switched off).
const wornChoice = () => (S && S.wardrobe && S.wardrobe.worn) || 'auto'; // 'auto' (season and holidays), 'none', or a look he owns
const currentLook = () => {
  if (looksPrefs.preview) return looksPrefs.preview === 'none' ? '' : looksPrefs.preview;
  const w = wornChoice(); if (w === 'none') return ''; if (w !== 'auto' && LOOK_DEFS[w]) return w;
  return lookOn() ? L.lookOf() : '';
};
// Things he says because of the day: holidays often, seasons now and then.
function contextLines(d) {
  const worn = wornChoice();
  if (worn !== 'auto' && worn !== 'none' && (LOOK_SAYS[worn] || SEASON_SAYS[worn])) return LOOK_SAYS[worn] || SEASON_SAYS[worn]; // an outfit you picked
  if (worn === 'none' || (!lookOn() && !looksPrefs.preview)) return [];
  const date = d || new Date(), hol = L.holidayOf(date), out = [];
  if (hol && LOOK_SAYS[hol]) out.push(...LOOK_SAYS[hol], ...LOOK_SAYS[hol]);
  for (let i = 0; i < out.length; i++) out[i] = out[i].replace(/\{name\}/g, userName() || 'friend');
  if (SEASON_SAYS[L.seasonOf(date)]) out.push(...SEASON_SAYS[L.seasonOf(date)]);
  return out;
}
