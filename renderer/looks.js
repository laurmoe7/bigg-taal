// Bigg's seasonal and holiday clothes, ported from Varken board (his big brother): hats, scarves, shades and falling petals, snow or leaves.
// Loads before pig.js, which draws them (pigSvg opts.look). Holiday dates live in logic.js (L.holidayOf). A hat takes the place of his sprout for those days; at night the nightcap wins.
const party = (body, trim, dots) => `<g class="hat"><g transform="rotate(-9 60 46)"><path d="M43 46 L60 4 L77 46 Z" fill="${body}"/>${dots}<path d="M43 46 Q60 52 77 46" fill="none" stroke="${trim}" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="4" r="5.5" fill="${trim}"/></g></g>`;
const heart = (x, y, s, f) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C-6 -4 -12 4 0 12 C12 4 6 -4 0 4Z" fill="${f}"/>`;
// A striped scarf round his middle, just under the snout, with a tail on the right. Drawn over the sticky note. The
// stripes are clipped to the scarf's own shape so they can't spill out.
const SCARF_BAND = 'M20 79 Q60 95 100 79 L99 91 Q60 107 21 91 Z';
const SCARF_TAIL = 'M82 94 L98 91 L100 114 L84 118 Z';
const SCARF = `<g class="scarf"><clipPath id="scarfClip"><path d="${SCARF_BAND}"/><path d="${SCARF_TAIL}"/></clipPath>
  <path d="${SCARF_BAND}" fill="#b9a4ff"/><path d="${SCARF_TAIL}" fill="#b9a4ff"/>
  <g clip-path="url(#scarfClip)" stroke="#ff9ec7" stroke-width="3.6">${[24, 36, 48, 60, 72, 84, 96].map((x) => `<path d="M${x} 74 l8 48"/>`).join('')}</g>
  <path d="M86 118 l-.5 4.5 M91 117 l-.5 4.5 M96 116 l-.5 4.5" stroke="#efe8ff" stroke-width="1.8" stroke-linecap="round"/></g>`;
const EARMUFFS = `<g class="earmuffs"><path d="M17 56 Q60 -8 103 56" fill="none" stroke="#b9a4ff" stroke-width="4.5" stroke-linecap="round"/><circle cx="17" cy="58" r="9" fill="#c9b8ff"/><circle cx="103" cy="58" r="9" fill="#c9b8ff"/><circle cx="14.5" cy="55.5" r="2.4" fill="#efe8ff"/><circle cx="100.5" cy="55.5" r="2.4" fill="#efe8ff"/></g>`;
const SHADES = `<g class="shades"><rect x="36" y="44" width="20" height="11" rx="5" fill="#3a2f66"/><rect x="64" y="44" width="20" height="11" rx="5" fill="#3a2f66"/><path d="M56 48 h8" stroke="#3a2f66" stroke-width="2.4"/><path d="M39 47 l6 0 M67 47 l6 0" stroke="#b9a4ff" stroke-width="1.6" stroke-linecap="round"/></g>`;
const HATS = {
  santa: `<g class="hat"><path d="M32 44 Q36 16 66 14 Q92 14 98 30 Q104 40 108 56 Q100 50 94 50 Q80 44 62 44 Q44 44 32 44 Z" fill="#ff6b82"/>
    <path d="M30 47 Q60 36 98 50" fill="none" stroke="#fffaf5" stroke-width="9" stroke-linecap="round"/><circle cx="109" cy="58" r="7" fill="#fffaf5"/></g>`,
  witch: `<g class="hat"><path d="M40 46 Q50 30 56 8 Q58 4 64 6 Q66 14 72 22 Q80 34 84 46 Z" fill="#6b4cb0"/><ellipse cx="62" cy="46" rx="33" ry="7" fill="#553a94"/>
    <path d="M44 41 Q62 47 80 41 L82 46 Q62 52 42 46 Z" fill="#ffb26b"/><rect x="58" y="41" width="8" height="8" rx="1.5" fill="none" stroke="#ffe29a" stroke-width="2"/>
    <path d="M62 8 Q74 4 76 14" fill="none" stroke="#6b4cb0" stroke-width="5" stroke-linecap="round"/></g>`,
  crown: `<g class="hat"><path d="M36 46 L38 24 L50 35 L60 18 L70 35 L82 24 L84 46 Z" fill="#ffd35a" stroke="#f0a93a" stroke-width="2" stroke-linejoin="round"/>
    <rect x="36" y="42" width="48" height="6" rx="2" fill="#ff8a3d"/><circle cx="60" cy="33" r="3.6" fill="#ff8a3d"/><circle cx="38" cy="24" r="2.6" fill="#fffaf0"/><circle cx="82" cy="24" r="2.6" fill="#fffaf0"/><circle cx="60" cy="18" r="2.6" fill="#fffaf0"/></g>`,
  pilgrim: `<g class="hat"><path d="M45 44 L48 16 Q60 12 72 16 L75 44 Z" fill="#7a5644"/><ellipse cx="60" cy="45" rx="31" ry="6.5" fill="#5f4234"/>
    <rect x="46" y="35" width="28" height="8" fill="#3d2b24"/><rect x="55" y="33.5" width="10" height="11" rx="1.5" fill="none" stroke="#ffd35a" stroke-width="2.4"/><rect x="58" y="37" width="4" height="4" fill="#ffd35a"/></g>`,
  birthday: party('#ff9ec7', '#ffe29a', '<circle cx="56" cy="28" r="2.4" fill="#fff4b0"/><circle cx="64" cy="36" r="2.4" fill="#b9a4ff"/><circle cx="55" cy="40" r="2" fill="#8fd3ff"/><circle cx="62" cy="20" r="1.8" fill="#fff"/>'),
  newyear: party('#3a2f86', '#ffd35a', '<path d="M56 30 l1.3 2.8 3 .3 -2.2 2 .7 3 -2.8 -1.6 -2.8 1.6 .7 -3 -2.2 -2 3 -.3z" fill="#ffd35a"/><circle cx="64" cy="22" r="1.6" fill="#ffd35a"/>'),
  sinterklaas: `<g class="hat"><path d="M40 46 Q42 22 60 4 Q78 22 80 46 Z" fill="#e63950"/>
    <rect x="39" y="40" width="42" height="8" rx="3" fill="#ffd35a"/><rect x="58.4" y="12" width="3.2" height="16" fill="#ffd35a"/><rect x="53" y="17.5" width="14" height="3.2" fill="#ffd35a"/></g>`,
  carnival: `<g class="hat"><path d="M36 46 Q30 28 31 14 Q44 22 54 36 Z" fill="#ff9a3d"/><path d="M48 38 Q54 20 60 6 Q66 20 72 38 Z" fill="#b57bff"/><path d="M66 36 Q76 22 89 14 Q90 28 84 46 Z" fill="#ff9a3d"/>
    <path d="M36 46 Q60 38 84 46" fill="none" stroke="#ffe29a" stroke-width="5" stroke-linecap="round"/><circle cx="31" cy="14" r="4" fill="#ffd35a"/><circle cx="60" cy="6" r="4" fill="#ffd35a"/><circle cx="89" cy="14" r="4" fill="#ffd35a"/></g>`,
  valentine: `<g class="hat"><path d="M34 44 Q60 34 86 44" fill="none" stroke="#ff7fa6" stroke-width="4.5" stroke-linecap="round"/><path d="M44 40 Q40 32 42 24 M76 40 Q80 32 78 24" fill="none" stroke="#ff7fa6" stroke-width="2.4" stroke-linecap="round"/>${heart(42, 12, 1, '#ff4f7d')}${heart(78, 12, 1, '#ffb3cf')}</g>`,
  stpatrick: `<g class="hat"><path d="M46 42 L48 12 H72 L74 42 Z" fill="#4ec98a"/><ellipse cx="60" cy="43" rx="30" ry="6.5" fill="#3aa06b"/><rect x="47" y="33" width="26" height="8" fill="#2a7a52"/><rect x="56" y="32" width="8" height="10" rx="1.5" fill="none" stroke="#ffd35a" stroke-width="2.2"/>
    <circle cx="57" cy="22" r="3.2" fill="#c6f7da"/><circle cx="63" cy="22" r="3.2" fill="#c6f7da"/><circle cx="60" cy="18" r="3.2" fill="#c6f7da"/></g>`,
  fourth: `<g class="hat"><path d="M46 42 L48 10 H72 L74 42 Z" fill="#fffaf5"/><path d="M48 12 h4 l1 30 h-4z M56 11 h4 v31 h-4z M64 11 h4 v31 h-4z M70 12 h2 l1.5 30 h-3z" fill="#ff6b82"/>
    <rect x="46" y="30" width="28" height="12" fill="#4a5fd0"/><path d="M52 36 l1 2 2 .2 -1.5 1.4 .5 2 -2 -1 -2 1 .5 -2 -1.5 -1.4 2 -.2z M66 36 l1 2 2 .2 -1.5 1.4 .5 2 -2 -1 -2 1 .5 -2 -1.5 -1.4 2 -.2z" fill="#fffaf5" transform="scale(.9) translate(6 3.5)"/>
    <ellipse cx="60" cy="43" rx="31" ry="6.5" fill="#3a47a8"/><ellipse cx="60" cy="10" rx="12" ry="3" fill="#ff8aa0"/></g>`,
  mothersday: `<g class="hat"><path d="M30 47 Q60 22 90 47" fill="none" stroke="#5fd3a0" stroke-width="3.4" stroke-linecap="round"/>
    ${[[34, 42, '#ff9ec7'], [46, 33, '#d9ccff'], [60, 29, '#fff0f6'], [74, 33, '#ffc6a0'], [86, 42, '#ff9ec7']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><circle cx="0" cy="-3.6" r="3.2" fill="${c}"/><circle cx="3.6" cy="0" r="3.2" fill="${c}"/><circle cx="0" cy="3.6" r="3.2" fill="${c}"/><circle cx="-3.6" cy="0" r="3.2" fill="${c}"/><circle r="2" fill="#ffd35a"/></g>`).join('')}</g>`,
  fathersday: `<g class="hat"><path d="M36 46 Q38 20 62 18 Q86 20 88 46 Z" fill="#8a6a54"/><path d="M68 40 Q96 38 102 48 Q82 50 66 46 Z" fill="#6f523f"/><circle cx="62" cy="17" r="3.2" fill="#6f523f"/><path d="M40 40 Q62 34 86 40" fill="none" stroke="#a88468" stroke-width="2.4"/></g>`,
  prinsjesdag: `<g class="hat"><ellipse cx="60" cy="44" rx="42" ry="8" fill="#d9ccff"/><path d="M42 44 Q44 22 60 20 Q76 22 78 44 Z" fill="#e8dcff"/><path d="M42 40 Q60 46 78 40 L78 45 Q60 51 42 45 Z" fill="#ff7fa6"/>
    <g transform="translate(46 32)"><circle cx="0" cy="-3.2" r="3" fill="#fff0f6"/><circle cx="3.2" cy="0" r="3" fill="#fff0f6"/><circle cx="0" cy="3.2" r="3" fill="#fff0f6"/><circle cx="-3.2" cy="0" r="3" fill="#fff0f6"/><circle r="2" fill="#ffd35a"/></g>
    <path d="M76 30 Q98 6 104 20 Q92 20 82 38 Z" fill="#fffaf5" stroke="#d9ccff" stroke-width="1"/></g>`,
  sintmaarten: `<g class="hat"><path d="M53 24 Q60 6 67 24" fill="none" stroke="#8a6a54" stroke-width="2.4" stroke-linecap="round"/><path d="M47 44 L45 27 Q60 19 75 27 L73 44 Z" fill="#ff9a3d"/><ellipse cx="60" cy="44" rx="14" ry="3" fill="#e8762a"/><ellipse cx="60" cy="27" rx="15" ry="3.6" fill="#ffb26b"/>
    <circle cx="60" cy="36" r="9" fill="#ffe97a" opacity=".9"/><path d="M60 31 l1.4 3 3.2 .3 -2.4 2.1 .8 3.2 -3 -1.7 -3 1.7 .8 -3.2 -2.4 -2.1 3.2 -.3z" fill="#ff9a3d"/></g>`,
  bevrijding: `<g class="hat"><clipPath id="bevClip"><path d="M34 46 Q36 18 62 16 Q88 18 90 46 Z"/></clipPath><g clip-path="url(#bevClip)"><rect x="30" y="12" width="64" height="14" fill="#ff6b6b"/><rect x="30" y="26" width="64" height="10" fill="#fffaf5"/><rect x="30" y="36" width="64" height="12" fill="#5b7bff"/></g>
    <path d="M32 46 Q62 40 92 46" fill="none" stroke="#ff9a3d" stroke-width="5" stroke-linecap="round"/><circle cx="62" cy="14" r="5.4" fill="#ff9a3d"/></g>`,
  bunny: `<g class="hat"><path d="M38 40 Q28 6 42 3 Q54 4 54 38 Z" fill="#fff4f8"/><path d="M42 36 Q36 10 43 8 Q50 9 49 35 Z" fill="#ffb3cf"/>
    <path d="M82 40 Q92 6 78 3 Q66 4 66 38 Z" fill="#fff4f8"/><path d="M78 36 Q84 10 77 8 Q70 9 71 35 Z" fill="#ffb3cf"/>
    <path d="M34 44 Q60 36 86 44" fill="none" stroke="#d9a6ff" stroke-width="5" stroke-linecap="round"/></g>`,
};
// Falling bits: one piece per colour, each with its own start, speed and delay so they never move in step.
const petalPath = (f, s) => `<path transform="scale(${s || 1})" d="M0 0 q3 -5 6 0 q-3 5 -6 0z" fill="${f}"/>`;
const starPath = (f) => `<path d="M0 -3 l.9 2 2.1 .2 -1.6 1.4 .5 2.2 -1.9 -1.1 -1.9 1.1 .5 -2.2 -1.6 -1.4 2.1 -.2z" fill="${f}"/>`;
const fallPieces = (shape, colors) => colors.map((c, i) => `<g class="fall" style="--x:${-84 + i * (96 / Math.max(1, colors.length - 1)) | 0}px;--t:${14 + (i % 3) * 3}s;--d:${(i * 2.9) % 12}s">${shape(c, i)}</g>`).join('');
const FALLS = {
  petal: fallPieces((c) => petalPath(c, 1.2), ['#ffc6dc', '#fff0f6', '#ffa6c4', '#e9d8ff', '#ffe0ec', '#ffb3cf']),
  orange: fallPieces((c) => petalPath(c, 1.2), ['#ffa94d', '#ff8a3d', '#ffd9a8', '#fffaf0', '#ffc27a', '#ff9a3d']),
  leaf: fallPieces((c) => petalPath(c, 1.5), ['#ffb26b', '#e8624a', '#ffd35a', '#c9794a', '#ff9a3d']),
  snow: fallPieces((c, i) => `<circle r="${[2.8, 2, 3.2, 1.8, 2.5, 2.2][i % 6]}" fill="${c}"/>`, ['#ffffff', '#e6f1ff', '#ffffff', '#d4e8ff', '#ffffff', '#f0f7ff']),
  hearts: fallPieces((c) => heart(0, 0, .45, c), ['#ff7fa6', '#ffb3cf', '#ff4f7d', '#ffd0e0', '#ff9ec7', '#e0457b']),
  clover: fallPieces((c) => `<circle cx="-1.6" r="1.8" fill="${c}"/><circle cx="1.6" r="1.8" fill="${c}"/><circle cy="-2" r="1.8" fill="${c}"/>`, ['#4ec98a', '#8ff0c8', '#3aa06b', '#b8f5d0', '#5fd3a0', '#6ee0a8']),
  stars: fallPieces((c) => starPath(c), ['#ffe29a', '#fffaf0', '#ff8aa0', '#8fb4ff', '#ffd35a', '#ffffff']),
  nuts: fallPieces((c) => `<circle r="1.9" fill="${c}"/><circle cx="4" cy="3" r="1.4" fill="${c}"/>`, ['#d9a066', '#c68a4f', '#e8b878', '#b97a46', '#f0c890']),
  dutch: fallPieces((c, i) => `<rect width="5" height="2.4" fill="${c}" transform="rotate(${i * 41})"/>`, ['#ff6b6b', '#fffaf5', '#5b7bff', '#ff9a3d', '#fffaf5', '#ff6b6b']),
  confetti: fallPieces((c, i) => `<rect width="5" height="2.4" fill="${c}" transform="rotate(${i * 37})"/>`, ['#ff7fa6', '#8fd3ff', '#ffe29a', '#b9a4ff', '#8ff0c8', '#ffa94d', '#ff6b82']),
};
const LOOK_DEFS = {
  winter: { label: '❄️ Winter (scarf and earmuffs)', earmuffs: true, scarf: true },
  spring: { label: '🌸 Spring', fall: 'petal' },
  summer: { label: '😎 Summer', shades: true },
  autumn: { label: '🍂 Autumn', fall: 'leaf' },
  christmas: { label: '🎅 Christmas (18-25 Dec)', hat: 'santa', fall: 'snow' },
  halloween: { label: '🎃 Halloween (25-31 Oct)', hat: 'witch', fall: 'leaf' },
  kingsday: { label: "👑 King's Day (27 Apr)", hat: 'crown', fall: 'orange' },
  thanksgiving: { label: '🦃 Thanksgiving', hat: 'pilgrim', fall: 'leaf' },
  easter: { label: '🐰 Easter (Good Friday to Monday)', hat: 'bunny', fall: 'petal' },
  birthday: { label: '🎂 Lauren\'s birthday (10 May)', hat: 'birthday', fall: 'confetti' },
  sinterklaas: { label: '🎁 Sinterklaas (3-5 Dec)', hat: 'sinterklaas', fall: 'nuts' },
  newyear: { label: '🎆 New Year (30 Dec-1 Jan)', hat: 'newyear', fall: 'confetti' },
  carnival: { label: '🎭 Carnival', hat: 'carnival', fall: 'confetti' },
  valentine: { label: '💘 Valentine (12-14 Feb)', hat: 'valentine', fall: 'hearts' },
  stpatrick: { label: '☘️ St Patrick (17 Mar)', hat: 'stpatrick', fall: 'clover' },
  mothersday: { label: "💐 Mother's Day (2nd Sun of May)", hat: 'mothersday', fall: 'petal' },
  fathersday: { label: "🧢 Father's Day (3rd Sun of June)", hat: 'fathersday' },
  prinsjesdag: { label: '👒 Prinsjesdag (3rd Tue of Sept)', hat: 'prinsjesdag', fall: 'petal' },
  sintmaarten: { label: '🏮 Sint-Maarten (11 Nov)', hat: 'sintmaarten', fall: 'stars' },
  bevrijding: { label: '🇳🇱 Bevrijdingsdag (5 May)', hat: 'bevrijding', fall: 'dutch' },
  fourth: { label: '🎆 4th of July (3-4 Jul)', hat: 'fourth', fall: 'stars' },
};

// What Bigg says on special days and in each season (he is always sweet).
const LOOK_SAYS = {
  christmas: ['Merry Kerstmis! I love learning Dutch with you by the tree. 🎄', 'Ho ho ho! Santa pigs are the cutest, right?', 'Hot cocoa and a few Dutch words? Perfect. ☕'],
  halloween: ['Boo! Did I scare you? I am just a happy little witch. 🎃', 'Happy Halloween! Trick or treat, I pick treat. 💗', 'Look at my witch hat! Do you like it?'],
  kingsday: ['Lang leve de koning! Oranje boven! 🧡', 'Happy Koningsdag! Do I look royal in my crown?', 'Everything is orange today, even my heart. 🧡'],
  thanksgiving: ['Happy Thanksgiving! I am thankful for you. 💗', 'Thankful for every Dutch word you learn!', 'Gobble gobble! Pass the pumpkin pie. 🥧'],
  easter: ['Vrolijk Pasen! Hop hop hop! 🐰', 'Look at my bunny ears! Do you like them?', 'Happy Easter! Chocolate eggs for everyone. 🥚'],
  birthday: ['Happy birthday, Lauren!! 🎂 You are my favourite human.', 'Gefeliciteerd! I wore my party hat just for you. 🎉', 'It is your day! Learn one word, then eat cake. 💗'],
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
const looksPrefs = { preview: '' }; // '' = today's look, 'none' = no clothes, or a look id
const lookOn = () => !(S && S.settings) || S.settings.looks !== false;
// The look Bigg wears now: a preview if one is picked, else today's season or holiday (or none when switched off).
const currentLook = () => (looksPrefs.preview === 'none' ? '' : looksPrefs.preview || (lookOn() ? L.lookOf() : ''));
// Things he says because of the day: holidays often, seasons now and then.
function contextLines(d) {
  if (!lookOn() && !looksPrefs.preview) return [];
  const date = d || new Date(), hol = L.holidayOf(date), out = [];
  if (hol && LOOK_SAYS[hol]) out.push(...LOOK_SAYS[hol], ...LOOK_SAYS[hol]);
  if (SEASON_SAYS[L.seasonOf(date)]) out.push(...SEASON_SAYS[L.seasonOf(date)]);
  return out;
}
