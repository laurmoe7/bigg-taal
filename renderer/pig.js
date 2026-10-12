// Bigg, Varken's little brother: a round, extra-chubby coral pig (viewBox 120 x 120). Moods: happy, sleep, worry, sniff.
const PIG_INK = '#3a1a22';
function sproutSvg(stage) {
  const stem = (top) => `<path d="M60 30 Q60 ${top + 12} 58 ${top}" fill="none" stroke="#4fcf9a" stroke-width="3.4" stroke-linecap="round"/>`;
  const leaves = (y) => `<path d="M59 ${y} Q42 ${y - 6} 36 ${y + 4} Q48 ${y + 10} 59 ${y} Z" fill="#9af5cf"/><path d="M60 ${y + 2} Q77 ${y - 6} 85 ${y + 4} Q71 ${y + 12} 60 ${y + 2} Z" fill="#6fe2b4"/>`;
  if (stage <= 0) return '<path d="M60 30 Q60 24 60 20" fill="none" stroke="#4fcf9a" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="60" cy="17" rx="4" ry="5.5" fill="#9af5cf"/>';
  if (stage === 1) return stem(10) + '<path d="M58 12 Q42 4 36 14 Q48 22 58 12 Z" fill="#9af5cf"/><path d="M59 16 Q76 6 84 16 Q70 26 59 16 Z" fill="#6fe2b4"/>';
  if (stage === 2) return stem(8) + leaves(22) + '<ellipse cx="58" cy="5" rx="5" ry="7" fill="#ffd36e"/><path d="M53 8 Q58 12 63 8 Q61 13 58 13 Q55 13 53 8 Z" fill="#6fe2b4"/>';
  return stem(7) + leaves(22) +
    '<g transform="translate(58 5)"><circle r="3.4" fill="#ff8f7e"/><g fill="#ffd36e"><circle cy="-6.6" r="3.9"/><circle cx="6.3" cy="-2" r="3.9"/><circle cx="3.9" cy="5.3" r="3.9"/><circle cx="-3.9" cy="5.3" r="3.9"/><circle cx="-6.3" cy="-2" r="3.9"/></g><circle r="3.4" fill="#ff8f7e"/></g>' +
    '<path d="M78 6 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z" fill="#fff1b0"/><path d="M38 10 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1z" fill="#fff1b0"/>';
}
const NIGHTCAP = `<g class="nightcap"><path d="M30 42 Q34 14 64 12 Q90 12 96 28 Q102 38 106 54 Q98 48 92 48 Q78 42 60 42 Q42 42 30 42 Z" fill="#7fd4f0"/>
  <path d="M30 42 Q48 36 62 38 Q82 38 94 46" fill="none" stroke="#c4efff" stroke-width="5" stroke-linecap="round"/><circle cx="107" cy="56" r="6.5" fill="#fff4de"/></g>`;

function pigSvg(mood, cls, opts) {
  const m = mood || 'happy', o = opts || {}, stage = o.stage == null ? 1 : o.stage;
  const eye = (x, dx, big) => `<ellipse cx="${x}" cy="64" rx="${big ? 5.8 : 5.2}" ry="${big ? 6.6 : 6}" fill="${PIG_INK}"/><circle cx="${x - 1.6 + dx}" cy="61.6" r="2.3" fill="#fff"/><circle cx="${x + 2 + dx}" cy="66.6" r="1.1" fill="#fff" opacity=".85"/>`;
  const eyes = {
    happy: eye(43, 0, 1) + eye(77, 0, 1),
    sleep: `<path d="M37 65 q6 5.5 12 0" fill="none" stroke="${PIG_INK}" stroke-width="2.8" stroke-linecap="round"/><path d="M71 65 q6 5.5 12 0" fill="none" stroke="${PIG_INK}" stroke-width="2.8" stroke-linecap="round"/>`,
    worry: eye(43, 0) + eye(77, 0) + `<path d="M35 55 l12 -3.5 M85 55 l-12 -3.5" fill="none" stroke="${PIG_INK}" stroke-width="2.2" stroke-linecap="round"/>`,
    sniff: eye(43, 1.8) + eye(77, 1.8),
  }[m];
  const extra = {
    happy: '<text class="day-note" x="97" y="46" font-size="13" font-weight="800" fill="#ffd6cf">♪</text>',
    sleep: '<text x="94" y="38" font-size="14" font-weight="800" fill="#7fd4f0">z</text><text x="104" y="26" font-size="10" font-weight="800" fill="#7fd4f0">z</text>',
    worry: '<path d="M100 36 q5 6 0 10.5 q-5 -4.5 0 -10.5z" fill="#8fd3ff"/>',
    sniff: '',
  }[m];
  const note = o.note
    ? `<g transform="rotate(-6 60 94)"><rect x="32" y="84" width="56" height="32" rx="5" fill="#fff0b8"/><path d="M32 106 q10 -2 18 4 l-18 6 z" fill="#f2d78a"/>
    <path d="M40 94 h26 M40 101 h18" stroke="#d3ad55" stroke-width="2.4" stroke-linecap="round"/><path d="M70 92 l4 4 8 -9" fill="none" stroke="#ff6f5f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <ellipse cx="29" cy="95" rx="7.5" ry="9.5" transform="rotate(-24 29 95)" fill="#ffa89b"/><ellipse cx="91" cy="95" rx="7.5" ry="9.5" transform="rotate(24 91 95)" fill="#ffa89b"/>`
    : '<ellipse cx="11" cy="86" rx="7.5" ry="10.5" transform="rotate(20 11 86)" fill="#ffa89b"/><ellipse cx="109" cy="86" rx="7.5" ry="10.5" transform="rotate(-20 109 86)" fill="#ffa89b"/>';
  return `<svg class="pig bigg ${cls || ''} pig-${m}" viewBox="0 0 120 120" aria-hidden="true"><g class="pig-all">
    <ellipse cx="42" cy="106" rx="11" ry="6.4" fill="#ff9d91"/><ellipse cx="78" cy="106" rx="11" ry="6.4" fill="#ff9d91"/>
    <g class="ear ear-l"><path d="M24 50 Q14 26 32 20 Q50 20 54 38 Z" fill="#ffa89b"/><path d="M29 44 Q23 30 34 26 Q45 27 48 38 Z" fill="#f28f86"/></g><g class="ear ear-r"><path d="M96 50 Q106 26 88 20 Q70 20 66 38 Z" fill="#ffa89b"/><path d="M91 44 Q97 30 86 26 Q75 27 72 38 Z" fill="#f28f86"/></g>
    <ellipse cx="60" cy="70" rx="52" ry="40" fill="#ffb5a8"/>
    <ellipse cx="60" cy="84" rx="34" ry="22" fill="#ffdcd3" opacity=".6"/>
    ${o.cap ? NIGHTCAP : `<g class="sprout-slot">${sproutSvg(stage)}</g>`}
    <g class="pig-eyes">${eyes}</g>
    <ellipse cx="29" cy="77" rx="10" ry="6.2" fill="#ff918a" opacity=".8"/><ellipse cx="91" cy="77" rx="10" ry="6.2" fill="#ff918a" opacity=".8"/>
    <g class="snout"><ellipse cx="60" cy="76" rx="9.4" ry="6.4" fill="#f58c82"/><ellipse cx="56.6" cy="76" rx="1.2" ry="1.9" fill="${PIG_INK}"/><ellipse cx="63.4" cy="76" rx="1.2" ry="1.9" fill="${PIG_INK}"/></g>
    ${note}
    </g>${extra}
  </svg>`;
}
