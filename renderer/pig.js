// Bigg, Varken's little brother: a round, extra-chubby coral pig (viewBox 120 x 120). Moods: happy, sleep, worry, sniff.
const PIG_INK = '#3a1a22';
// The flower that grows on Bigg's head as you practise: a sprout, then leaves, a bud and a bloom. Each day it is a different flower (picked from the date).
const FLOWER_KINDS = ['daisy', 'tulip', 'sunflower', 'blossom', 'rose', 'bluebell', 'poppy'];
const FLOWER_BUD = { daisy: '#ffd36e', tulip: '#ff7fa6', sunflower: '#ffc640', blossom: '#ffb3cf', rose: '#ff4f6d', bluebell: '#8fb4ff', poppy: '#ff6b4a' };
const FLOWER_NAME = { daisy: 'daisy', tulip: 'tulip', sunflower: 'sunflower', blossom: 'cherry blossom', rose: 'rose', bluebell: 'bluebell', poppy: 'poppy' };
function flowerOfDay() {
  const d = typeof today === 'function' ? today() : '';
  let h = 7; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FLOWER_KINDS[h % FLOWER_KINDS.length];
}
const bloomSvg = (kind) => ({
  daisy: '<circle r="3.4" fill="#ff8f7e"/><g fill="#ffd36e"><circle cy="-6.6" r="3.9"/><circle cx="6.3" cy="-2" r="3.9"/><circle cx="3.9" cy="5.3" r="3.9"/><circle cx="-3.9" cy="5.3" r="3.9"/><circle cx="-6.3" cy="-2" r="3.9"/></g><circle r="3.4" fill="#ff8f7e"/>',
  tulip: '<path d="M-6.4 -1 Q-6.8 -10 -3.4 -12 Q0 -8 3.4 -12 Q6.8 -10 6.4 -1 Q6 6 0 7 Q-6 6 -6.4 -1 Z" fill="#ff7fa6"/><path d="M0 -12 Q-3.6 -3 0 6.4 Q3.6 -3 0 -12 Z" fill="#ff9ec4"/><path d="M-5 -1 Q-4.6 3 -2 5" stroke="#ffc0d8" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  sunflower: `${Array.from({ length: 12 }, (_, i) => `<ellipse cy="-6.6" rx="2" ry="3.6" fill="${i % 2 ? '#ffd35a' : '#ffbf2f'}" transform="rotate(${i * 30})"/>`).join('')}<circle r="4.4" fill="#8a5a2c"/><circle r="2.6" fill="#6a421f"/><circle cx="-1.2" cy="-1.2" r=".7" fill="#c89a5c"/><circle cx="1.4" cy=".8" r=".7" fill="#c89a5c"/>`,
  blossom: `${[0, 72, 144, 216, 288].map((a) => `<path d="M0 0 C-5 -3 -6 -9 -2.4 -10.4 L0 -8.2 L2.4 -10.4 C6 -9 5 -3 0 0 Z" fill="#ffb3cf" transform="rotate(${a})"/>`).join('')}<circle r="2" fill="#ff7fa6"/><g stroke="#ff4f7d" stroke-width=".8" stroke-linecap="round"><path d="M0 0 L0 -3.4 M0 0 L3.2 -1 M0 0 L-3.2 -1 M0 0 L2 2.8 M0 0 L-2 2.8"/></g>`,
  rose: '<circle r="7.4" fill="#e03a5c"/><circle r="5.6" fill="#ff4f6d"/><path d="M-4.6 -1 Q-3 -5.6 1 -5 Q5.4 -4 4 0 Q2.6 4.4 -1.6 3.6 Q-5 2.6 -3 -1 Q-1.4 -3.2 1 -2 Q2.4 -.8 .8 .6" stroke="#b92a48" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M-5 -4 Q-3 -7 0 -7" stroke="#ff9aae" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  bluebell: `${[[-5.4, 1, -18], [0, 4, 0], [5.4, 1, 18]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-2.2 -5 Q-4.8 1 -3.4 3.6 Q-1.6 2.6 0 3.6 Q1.6 2.6 3.4 3.6 Q4.8 1 2.2 -5 Z" fill="#8fb4ff"/><path d="M-2.2 -5 Q0 -6.6 2.2 -5 L1 -1 Q0 -.4 -1 -1 Z" fill="#6f95f0"/><path d="M-3.4 3.6 Q-1.6 2.6 0 3.6 Q1.6 2.6 3.4 3.6" stroke="#cfe0ff" stroke-width=".9" fill="none"/></g>`).join('')}<path d="M-5.4 -4.6 Q-3 -9 0 -9 Q3 -9 5.4 -4.6" stroke="#4fcf9a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  poppy: '<g fill="#ff6b4a"><circle cx="-4.2" cy="-3.2" r="5.2"/><circle cx="4.2" cy="-3.2" r="5.2"/><circle cx="-3.6" cy="3.2" r="5"/><circle cx="3.6" cy="3.2" r="5"/></g><circle r="5" fill="#ff8a64" opacity=".6"/><circle r="2.6" fill="#3a2a3a"/><g fill="#3a2a3a"><circle cy="-4.2" r=".8"/><circle cx="4" cy="-1.4" r=".8"/><circle cx="2.6" cy="3.4" r=".8"/><circle cx="-2.6" cy="3.4" r=".8"/><circle cx="-4" cy="-1.4" r=".8"/></g>',
})[kind];
function sproutSvg(stage, kind) {
  kind = kind || flowerOfDay();
  const stem = (top) => `<path d="M60 30 Q60 ${top + 12} 58 ${top}" fill="none" stroke="#4fcf9a" stroke-width="3.4" stroke-linecap="round"/>`;
  const leaves = (y) => `<path d="M59 ${y} Q42 ${y - 6} 36 ${y + 4} Q48 ${y + 10} 59 ${y} Z" fill="#9af5cf"/><path d="M60 ${y + 2} Q77 ${y - 6} 85 ${y + 4} Q71 ${y + 12} 60 ${y + 2} Z" fill="#6fe2b4"/>`;
  if (stage <= 0) return '<path d="M60 30 Q60 24 60 20" fill="none" stroke="#4fcf9a" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="60" cy="17" rx="4" ry="5.5" fill="#9af5cf"/>';
  if (stage === 1) return stem(10) + '<path d="M58 12 Q42 4 36 14 Q48 22 58 12 Z" fill="#9af5cf"/><path d="M59 16 Q76 6 84 16 Q70 26 59 16 Z" fill="#6fe2b4"/>';
  if (stage === 2) return stem(8) + leaves(22) + `<ellipse cx="58" cy="5" rx="5" ry="7" fill="${FLOWER_BUD[kind]}"/><path d="M53 8 Q58 12 63 8 Q61 13 58 13 Q55 13 53 8 Z" fill="#6fe2b4"/>`;
  return stem(7) + leaves(22) + `<g transform="translate(58 5)">${bloomSvg(kind)}</g>` +
    '<path d="M78 6 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z" fill="#fff1b0"/><path d="M38 10 l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1z" fill="#fff1b0"/>';
}
const NIGHTCAP = `<g class="nightcap"><path d="M30 42 Q34 14 64 12 Q90 12 96 28 Q102 38 106 54 Q98 48 92 48 Q78 42 60 42 Q42 42 30 42 Z" fill="#7fd4f0"/>
  <path d="M30 42 Q48 36 62 38 Q82 38 94 46" fill="none" stroke="#c4efff" stroke-width="5" stroke-linecap="round"/><circle cx="107" cy="56" r="6.5" fill="#fff4de"/></g>`;

function pigSvg(mood, cls, opts) {
  const m = mood || 'happy', o = opts || {}, stage = o.stage == null ? 1 : o.stage;
  const lookId = o.look === undefined ? currentLook() : o.look, look = LOOK_DEFS[lookId] || {}, bgId = o.bg === undefined ? currentBg() : o.bg; // what he wears today (hats sit about 3px higher on his rounder head)
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
  const CARD = `<g class="card-grp"><g transform="rotate(-6 60 98)"><rect x="33" y="82" width="54" height="36" rx="6" fill="#fffaf0" stroke="#f1d9a6" stroke-width="1.8"/><rect x="33" y="82" width="54" height="9" rx="5" fill="#ffd99a"/>
    <text x="60" y="111" text-anchor="middle" font-size="19" font-weight="900" fill="#ff8f7e" font-family="Nunito, Segoe UI, sans-serif">?</text><path d="M78 97 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2z" fill="#ffd36e"/></g>
    <ellipse cx="30" cy="97" rx="7.5" ry="9.5" transform="rotate(-24 30 97)" fill="#ffa89b"/><ellipse cx="90" cy="97" rx="7.5" ry="9.5" transform="rotate(24 90 97)" fill="#ffa89b"/></g>`;
  const BOOK = `<g class="card-grp"><g transform="rotate(-5 60 98)"><rect x="35" y="78" width="50" height="42" rx="5" fill="#7a5cd1"/><rect x="35" y="78" width="9" height="42" rx="4" fill="#5b3fb0"/><rect x="38" y="81" width="44" height="36" rx="3" fill="none" stroke="#a48cf0" stroke-width="1.2" opacity=".7"/>
    
    <path d="M71 78 h9 v13.5 l-4.5 -4 l-4.5 4 z" fill="#ff5d6c"/><path d="M71 78 h9 v3 h-9 z" fill="#e03f50"/>
    <text x="60" y="104" text-anchor="middle" font-size="22" font-weight="900" fill="#ffe7a1" font-family="Nunito, Segoe UI, sans-serif">?</text></g>
    <ellipse cx="30" cy="97" rx="7.5" ry="9.5" transform="rotate(-24 30 97)" fill="#ffa89b"/><ellipse cx="90" cy="97" rx="7.5" ry="9.5" transform="rotate(24 90 97)" fill="#ffa89b"/></g>`;
  const note = o.book ? BOOK : o.card ? CARD : o.note
    ? `<g transform="rotate(-6 60 94)"><rect x="32" y="84" width="56" height="32" rx="5" fill="#fff0b8"/><path d="M32 106 q10 -2 18 4 l-18 6 z" fill="#f2d78a"/>
    <path d="M40 94 h26 M40 101 h18" stroke="#d3ad55" stroke-width="2.4" stroke-linecap="round"/><path d="M70 92 l4 4 8 -9" fill="none" stroke="#ff6f5f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <ellipse cx="29" cy="95" rx="7.5" ry="9.5" transform="rotate(-24 29 95)" fill="#ffa89b"/><ellipse cx="91" cy="95" rx="7.5" ry="9.5" transform="rotate(24 91 95)" fill="#ffa89b"/>`
    : '<ellipse cx="11" cy="86" rx="7.5" ry="10.5" transform="rotate(20 11 86)" fill="#ffa89b"/><ellipse cx="109" cy="86" rx="7.5" ry="10.5" transform="rotate(-20 109 86)" fill="#ffa89b"/>';
  return `<svg class="pig bigg ${cls || ''} pig-${m}${lookId ? ' look-' + lookId : ''}" viewBox="0 0 120 120" aria-hidden="true"><g class="pig-all">
    <ellipse cx="42" cy="106" rx="11" ry="6.4" fill="#ff9d91"/><ellipse cx="78" cy="106" rx="11" ry="6.4" fill="#ff9d91"/>
    <g class="ear ear-l"><path d="M24 50 Q14 26 32 20 Q50 20 54 38 Z" fill="#ffa89b"/><path d="M29 44 Q23 30 34 26 Q45 27 48 38 Z" fill="#f28f86"/></g><g class="ear ear-r"><path d="M96 50 Q106 26 88 20 Q70 20 66 38 Z" fill="#ffa89b"/><path d="M91 44 Q97 30 86 26 Q75 27 72 38 Z" fill="#f28f86"/></g>
    <ellipse cx="60" cy="70" rx="52" ry="40" fill="#ffb5a8"/>
    <ellipse cx="60" cy="84" rx="34" ry="22" fill="#ffdcd3" opacity=".6"/>
    ${look.earmuffs && !o.cap ? EARMUFFS : ''}
    ${o.cap ? NIGHTCAP : look.hat ? `<g transform="translate(0 -3)">${HATS[look.hat]}</g>` : `<g class="sprout-slot">${sproutSvg(stage)}</g>`}
    <g class="pig-eyes">${eyes}</g>
    ${look.shades && !o.cap ? SHADES : ''}
    <ellipse cx="29" cy="77" rx="10" ry="6.2" fill="#ff918a" opacity=".8"/><ellipse cx="91" cy="77" rx="10" ry="6.2" fill="#ff918a" opacity=".8"/>
    <g class="snout"><ellipse cx="60" cy="76" rx="9.4" ry="6.4" fill="#f58c82"/><ellipse cx="56.6" cy="76" rx="1.2" ry="1.9" fill="${PIG_INK}"/><ellipse cx="63.4" cy="76" rx="1.2" ry="1.9" fill="${PIG_INK}"/></g>
    ${look.scarf && !o.cap ? SCARF : ''}
    ${note}
    ${bgId && FALLS[bgId] && m !== 'sleep' ? FALLS[bgId] : ''}
    </g>${extra}
  </svg>`;
}
