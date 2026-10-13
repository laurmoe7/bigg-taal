// Bonus Lessons: extra lessons beside the Dutch itself, in two groups: Geography (maps, countries, capitals) and Flags.
// A lesson (deck) = a Learn tab (cards, or a tap-to-learn map) and a Quiz tab (choice and typing questions, weakest items first).
// Progress is kept in S.geo[deckId][itemId] = { c: right answers, m: misses, last }. Data and quiz rules are in geodata.js, map outlines in mapdata.js. Loads after app.js and shares its scope.

const geoSame = (a, b) => geoNorm(a) === geoNorm(b) || geoNorm(a).replace(/u/g, '') === geoNorm(b).replace(/u/g, '') || geoLev(geoNorm(a), geoNorm(b)) <= 1; // Luxemburg / Luxembourg

// a map with one item lit up (hi), one selected (sel), optional status colours (lv), tap targets (click), hover names (titles), labels and capital dots
// d is the lesson: d.map picks the outlines in MAPS; a lesson with d.feat (seas, rivers, mountains) draws its items as lines and markers on a plain Europe map
function geoMapSvg(d, o) {
  o = o || {}; const m = MAPS[d.map], by = (id) => d.items.find((x) => x.id === id) || {}, plain = !!d.feat;
  const path = ([id, p]) => {
    const own = id && !plain, lv = o.lv && own ? geoLevel(o.lv[id]) : '';
    const cls = 'mp ' + (own ? 'o' : 'x') + (lv === 'learning' ? ' l' : lv === 'known' || lv === 'mastered' ? ' k' : '') + (own && o.hi === id ? ' hi' : '') + (own && o.sel === id ? ' sel' : '');
    return `<path class="${cls}" d="${p}"${o.click && own ? ` data-act="geo-map" data-id="${id}"` : ''}>${o.titles && own ? `<title>${esc(by(id).name)}</title>` : ''}</path>`;
  };
  const top = (id) => (id && !plain ? m.shapes.filter((x) => x[0] === id) : []), rest = m.shapes.filter((x) => plain || !x[0] || (x[0] !== o.hi && x[0] !== o.sel));
  const r = m.r || 16, ringAt = (p) => (p ? `<circle class="ring" cx="${p[0]}" cy="${p[1]}" r="${r}"/>` : ''), ring = (id) => ringAt(m.pts[id]);
  const mark = plain ? '' : [o.hi, o.sel].filter((id) => id && (d.ringHi || (m.small && m.small.includes(id)))).map(ring).join(''); // on the world map every lit-up country gets a ring
  let feats = '';
  if (plain) { // lines for rivers, dots for seas, triangles for mountains
    feats = d.items.filter((it) => m.feat[it.id] && (o.all || o.hi === it.id || o.sel === it.id)).map((it) => {
      const f = m.feat[it.id], on = o.hi === it.id ? ' hi' : o.sel === it.id ? ' sel' : '', hit = o.click ? ` data-act="geo-map" data-id="${it.id}"` : '', ttl = o.titles ? `<title>${esc(it.name)}</title>` : '';
      if (f.d) return `<path class="fl${on}" d="${f.d}"/><path class="fl-hit" d="${f.d}"${hit}>${ttl}</path>`;
      const [x, y] = f.p, s = r * (on ? 0.2 : 0.14);
      const glyph = it.region === 'mountain' ? `<path class="fp mnt${on}" d="M${x - s},${y + s * 0.8}L${x},${y - s}L${x + s},${y + s * 0.8}Z"/>` : `<circle class="fp sea${on}" cx="${x}" cy="${y}" r="${s * 0.8}"/>`;
      return (on ? ringAt(f.p) : '') + glyph + (o.click ? `<circle class="fp-hit" cx="${x}" cy="${y}" r="${r * 0.4}"${hit}>${ttl}</circle>` : '');
    }).join('');
  }
  const tiny = !plain && o.click ? (m.small || []).filter((id) => m.pts[id] && by(id).id).map((id) => { // tiny countries get a dot you can tap
    const lv = o.lv ? geoLevel(o.lv[id]) : '', c = (lv === 'learning' ? ' l' : lv === 'known' || lv === 'mastered' ? ' k' : '') + (o.sel === id ? ' sel' : '');
    return `<circle class="sdot${c}" cx="${m.pts[id][0]}" cy="${m.pts[id][1]}" r="${r * 0.14}"/><circle class="fp-hit" cx="${m.pts[id][0]}" cy="${m.pts[id][1]}" r="${r * 0.4}" data-act="geo-map" data-id="${id}">${o.titles ? `<title>${esc(by(id).name)}</title>` : ''}</circle>`;
  }).join('') : '';
  const labels = o.labels && m.ctr ? Object.keys(m.ctr).map((id) => `<text class="mlabel" x="${m.ctr[id][0]}" y="${m.ctr[id][1] + 4}">${esc(by(id).name)}</text>`).join('') : '';
  const dots = o.dots && d.map === 'provinces' ? Object.keys(m.pts).map((id) => `<circle class="mdot" cx="${m.pts[id][0]}" cy="${m.pts[id][1]}" r="4"/>`).join('') : '';
  return `<svg class="geo-map ${o.cls || ''}" viewBox="${m.vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${rest.map(path).join('')}${top(o.sel).map(path).join('')}${top(o.hi).map(path).join('')}${mark}${tiny}${feats}${dots}${labels}</svg>`;
}
// what stands for an item: its flag, or a little map with it lit up
const geoVis = (it, d, cls) => (d.visual === 'map' ? geoMapSvg(d, { hi: it.id, cls: 'mini ' + (cls || '') }) : it.flag(cls));
const geoName = (it) => `<div class="big">${esc(it.name)}</div>`;
const geoMapAsk = (it, d) => geoMapSvg(d, { hi: it.id, cls: 'q' });

// ---------- the question types ----------
const GEO_K = {
  f2n: { id: 'f2n', optF: 'name', label: '🏳️ Flag → country', desc: 'See a flag, pick the country.', type: 'choice', ask: (it) => `<div class="geo-flag">${it.flag()}</div>`, prompt: 'Which country does this flag belong to?', opt: (it) => esc(it.name), key: (it) => it.name },
  n2f: { id: 'n2f', askF: 'name', label: '🚩 Country → flag', desc: 'See a country, pick its flag.', type: 'choice', ask: geoName, prompt: 'Which flag belongs to this country?', opt: (it) => it.flag(), key: (it) => it.id, optClass: 'flags' },
  tn: { id: 'tn', label: '⌨️ Type the country', desc: 'See a flag, type its Dutch name.', type: 'type', field: 'name', ask: (it) => `<div class="geo-flag">${it.flag()}</div>`, prompt: 'Type the Dutch name of this country.' },
  m2n: { id: 'm2n', optF: 'name', label: '🗺️ Map → country', desc: 'A country is lit up on the map: pick its name.', type: 'choice', ask: geoMapAsk, prompt: 'Which country is lit up on the map?', opt: (it) => esc(it.name), key: (it) => it.name },
  tmn: { id: 'tmn', label: '⌨️ Type from the map', desc: 'A country is lit up: type its Dutch name.', type: 'type', field: 'name', ask: geoMapAsk, prompt: 'Type the Dutch name of the lit-up country.' },
  c2n: { id: 'c2n', askF: 'name', optF: 'cap', label: '🏙️ Country → capital', desc: 'See a country, pick its capital.', type: 'choice', ask: geoName, prompt: 'What is the capital?', opt: (it) => esc(it.cap), key: (it) => it.cap },
  cap2n: { id: 'cap2n', askF: 'cap', optF: 'name', label: '📍 Capital → country', desc: 'See a capital, pick the country.', type: 'choice', ask: (it) => geoName({ name: it.cap }), prompt: 'Which country is this the capital of?', opt: (it) => esc(it.name), key: (it) => it.name },
  tc: { id: 'tc', askF: 'name', label: '⌨️ Type the capital', desc: 'See a country, type its capital.', type: 'type', field: 'cap', ask: geoName, prompt: 'Type the capital in Dutch.' },
  p2c: { id: 'p2c', askF: 'name', optF: 'cap', label: '🏙️ Province → capital', desc: 'See a province, pick its capital.', type: 'choice', ask: geoName, prompt: 'What is the capital of this province?', opt: (it) => esc(it.cap), key: (it) => it.cap },
  c2p: { id: 'c2p', askF: 'cap', optF: 'name', label: '📍 Capital → province', desc: 'See a capital, pick the province.', type: 'choice', ask: (it) => geoName({ name: it.cap }), prompt: 'Which province has this capital?', opt: (it) => esc(it.name), key: (it) => it.name },
  tcp: { id: 'tcp', askF: 'name', label: '⌨️ Type the capital', desc: 'See a province, type its capital.', type: 'type', field: 'cap', ask: geoName, prompt: 'Type the capital of this province.' },
  tp: { id: 'tp', askF: 'cap', label: '⌨️ Type the province', desc: 'See a capital, type its province.', type: 'type', field: 'name', ask: (it) => geoName({ name: it.cap }), prompt: 'Type the province this is the capital of.' },
  m2p: { id: 'm2p', optF: 'name', label: '🗺️ Map → province', desc: 'A province is lit up on the map: pick its name.', type: 'choice', ask: geoMapAsk, prompt: 'Which province is lit up on the map?', opt: (it) => esc(it.name), key: (it) => it.name },
  tmp: { id: 'tmp', label: '⌨️ Type from the map', desc: 'A province is lit up: type its name.', type: 'type', field: 'name', ask: geoMapAsk, prompt: 'Type the name of the lit-up province.' },
  f2p: { id: 'f2p', optF: 'name', label: '🏳️ Flag → province', desc: 'See a flag, pick the province.', type: 'choice', ask: (it) => `<div class="geo-flag">${it.flag()}</div>`, prompt: 'Which province does this flag belong to?', opt: (it) => esc(it.name), key: (it) => it.name },
  p2f: { id: 'p2f', askF: 'name', label: '🚩 Province → flag', desc: 'See a province, pick its flag.', type: 'choice', ask: geoName, prompt: 'Which flag belongs to this province?', opt: (it) => it.flag(), key: (it) => it.id, optClass: 'flags' },
  tfp: { id: 'tfp', label: '⌨️ Type the province', desc: 'See a flag, type the province.', type: 'type', field: 'name', ask: (it) => `<div class="geo-flag">${it.flag()}</div>`, prompt: 'Type the name of this province.' },
  m2w: { id: 'm2w', optF: 'name', label: '🗺️ Map → name', desc: 'Something is marked on the map: pick its name.', type: 'choice', ask: geoMapAsk, prompt: 'What is marked on the map?', opt: (it) => esc(it.name), key: (it) => it.name },
  tmw: { id: 'tmw', label: '⌨️ Type from the map', desc: 'Something is marked: type its Dutch name.', type: 'type', field: 'name', ask: geoMapAsk, prompt: 'Type the Dutch name of what is marked.' },
};
const geoCountryDeck = (id, title, icon, items, regions, full) => ({ id: 'g-' + id, section: 'geo', icon, title, full: full || 'Geography of ' + title, ringHi: id === 'world', items, regions, map: id, visual: 'map', showCap: true, noun: 'country', nounPl: 'countries', part: 'Which part?', kinds: ['m2n', 'tmn', 'c2n', 'cap2n', 'tc'].map((k) => GEO_K[k]) });
const geoFlagDeck = (id, title, icon, items, regions, full, kinds) => ({ id: 'f-' + id, section: 'flags', icon, title, full: full || 'Flags of ' + title, ringHi: id === 'world', items, regions, map: id, visual: 'flag', showCap: false, noun: 'country', nounPl: 'countries', part: 'Which part?', kinds: (kinds || ['f2n', 'n2f', 'tn']).map((k) => GEO_K[k]) });
const PROVINCE_FLAGS = PROVINCES.map((p) => Object.assign({}, p, { flag: (cls) => flagImg('nl-' + p.id, cls) })); // the same provinces, with their flags
const GEO_DECKS = [
  geoCountryDeck('world', 'World', '🌐', WORLD, WORLD_REGIONS, 'Geography of the world'), geoCountryDeck('europe', 'Europe', '🏰', EUROPE, EUROPE_REGIONS), geoCountryDeck('asia', 'Asia', '🏯', ASIA, ASIA_REGIONS), geoCountryDeck('africa', 'Africa', '🦒', AFRICA, AFRICA_REGIONS),
  geoCountryDeck('namerica', 'North & Central America', '🗽', NAMERICA, NAMERICA_REGIONS), geoCountryDeck('samerica', 'South America', '🦙', SAMERICA, null), geoCountryDeck('oceania', 'Oceania', '🦘', OCEANIA, OCEANIA_REGIONS),
  { id: 'provinces', section: 'geo', icon: '🌷', title: 'Dutch provinces', full: 'Provinces of the Netherlands', items: PROVINCES, regions: null, map: 'provinces', visual: 'map', showCap: true, noun: 'province', nounPl: 'provinces', part: 'Which part?', kinds: ['m2p', 'tmp', 'p2c', 'c2p', 'tcp', 'tp'].map((k) => GEO_K[k]) },
  { id: 'waters', section: 'geo', icon: '🌊', title: 'Seas, rivers & mountains', full: 'Seas, rivers & mountains', items: WATERS, regions: WATERS_REGIONS, map: 'europe', feat: true, visual: 'map', showCap: false, noun: 'place', nounPl: 'places', part: 'Which kind?', kinds: ['m2w', 'tmw'].map((k) => GEO_K[k]) },
  geoFlagDeck('world', 'World', '🌐', WORLD, WORLD_REGIONS, 'Flags of the world'), geoFlagDeck('europe', 'Europe', '🏰', EUROPE, EUROPE_REGIONS), geoFlagDeck('asia', 'Asia', '🏯', ASIA, ASIA_REGIONS), geoFlagDeck('africa', 'Africa', '🦒', AFRICA, AFRICA_REGIONS),
  geoFlagDeck('americas', 'the Americas', '🗽', AMERICAS, AMERICAS_REGIONS), geoFlagDeck('oceania', 'Oceania', '🦘', OCEANIA, OCEANIA_REGIONS),
  Object.assign(geoFlagDeck('provinces', 'Dutch provinces', '🌷', PROVINCE_FLAGS, null, 'Flags of the Dutch provinces', ['f2p', 'p2f', 'tfp']), { noun: 'province', nounPl: 'provinces' }),
];
GEO_DECKS.find((d) => d.id === 'f-americas').title = 'The Americas';
['f2n', 'tn', 'm2n', 'tmn', 'm2p', 'tmp', 'm2w', 'tmw', 'f2p', 'tfp'].forEach((id) => { GEO_K[id].fill = true; }); // the picture grows to the free space of the window
const GEO_SECTIONS = [['geo', '🗺️ Geography'], ['flags', '🚩 Flags']];

const geo = (ui.geo = ui.geo || { view: 'cards', sel: '', deck: null, tab: 'learn', region: 'all', cover: false, rev: {}, kind: 'mix', qregion: 'all', sess: null });
const geoDeck = () => GEO_DECKS.find((d) => d.id === geo.deck);
const geoStats = (d) => { // the first Europe lesson was one lesson with flags and capitals: its progress is copied to both new lessons the first time
  S.geo = S.geo || {};
  if (!S.geo[d.id] && S.geo.europe && (d.id === 'g-europe' || d.id === 'f-europe')) S.geo[d.id] = JSON.parse(JSON.stringify(S.geo.europe));
  return (S.geo[d.id] = S.geo[d.id] || {});
};
const geoRec = (d, it) => geoStats(d)[it.id] || { c: 0, m: 0 };
const geoMuted = () => !!S.geoMute;
const geoChime = (k) => { if (!geoMuted()) chime(k); };
const geoSpeak = (t) => { if (!geoMuted()) speak(t); };
const geoSoundBtn = () => `<button class="switch ${geoMuted() ? '' : 'on'}" role="switch" aria-checked="${!geoMuted()}" data-act="geo-mute" title="Sounds and the Dutch voice in the Bonus Lessons"><i></i>${geoMuted() ? '🔇 Sound' : '🔊 Sound'}</button>`;
const geoCoverBtn = () => `<button class="switch ${geo.cover ? 'on' : ''}" role="switch" aria-checked="${!!geo.cover}" data-act="geo-cover" title="Hide the names, so you can test yourself"><i></i>🙈 Cover names</button>`;
const geoEnOn = () => S.geoEn !== false; // English hints in the quiz (on at first, to help with the first look)
const geoEnOf = (it, f) => { const e = f === 'cap' ? it.capEn : it.en, d = f === 'cap' ? it.cap : it.name; return e && geoNorm(e) !== geoNorm(d) ? e : ''; };
const geoDot = (lv) => ({ new: '<span class="muted" title="Not practised yet">○</span>', learning: '<span title="Learning" style="color:var(--butter)">◐</span>', known: '<span title="Known" style="color:var(--mint)">●</span>', mastered: '<span title="Mastered" style="color:var(--mint)">★</span>' }[lv]);
const geoKnown = (d) => d.items.filter((it) => ['known', 'mastered'].includes(geoLevel(geoRec(d, it)))).length;
function geoMark(d, it, ok) { const r = geoStats(d)[it.id] || (geoStats(d)[it.id] = { c: 0, m: 0 }); if (ok) r.c++; else r.m++; r.last = today(); save(); }
const geoSay = (t) => `<button class="ghost mini geo-say" data-act="geo-say" data-t="${esc(t)}" title="Listen">🔊</button>`;
const geoInfo = (d, it, inline) => `<div class="geo-res-name">${esc(it.name)}${!geoSame(it.en, it.name) ? ` <span class="muted">${esc(it.en)}</span>` : ''}${inline ? geoSay(it.name) : ''}</div>${d.showCap && it.cap ? `<div>📍 ${esc(it.cap)}${!geoSame(it.capEn, it.cap) ? ` <span class="muted">(${esc(it.capEn)})</span>` : ''}${inline && it.cap !== it.name ? geoSay(it.cap) : ''}</div>` : ''}${it.fact ? `<div class="muted geo-fact" style="font-size:13px">${esc(it.fact)}</div>` : ''}`;
const geoSayBtns = (d, it) => `<button class="ghost mini" data-act="geo-say" data-t="${esc(it.name)}">🔊 ${esc(it.name)}</button>${d.showCap && it.cap && it.cap !== it.name ? `<button class="ghost mini" data-act="geo-say" data-t="${esc(it.cap)}">🔊 ${esc(it.cap)}</button>` : ''}`;

// ---------- the screens ----------
VIEWS.bonus = () => {
  const d = geoDeck();
  if (!d) return geoHub();
  if (geo.sess) return geoSession();
  const head = `<div class="top"><div><h1>${d.icon} ${esc(d.full)}</h1><p class="sub">${geoKnown(d)} of ${d.items.length} ${d.nounPl} known</p></div><div class="geo-head-r"><div class="row">${geoSoundBtn()}<button class="ghost" data-act="geo-home">← Bonus Lessons</button></div>${geo.tab === 'learn' ? geoCoverBtn() : ''}</div></div>`;
  return head + `<div class="seg">${[['learn', '📖 Learn'], ['quiz', '🎯 Quiz']].map(([id, n]) => `<button class="${geo.tab === id ? 'on' : ''}" data-act="geo-tab" data-v="${id}">${n}</button>`).join('')}</div>` + (geo.tab === 'quiz' ? geoQuizSetup(d) : geoLearn(d));
};
function geoHub() {
  return `<div class="top"><div><h1>🎁 Bonus Lessons</h1></div>${geoSoundBtn()}</div>` + GEO_SECTIONS.map(([sec, name]) => `<h2 class="geo-sec-h">${name}</h2><div class="geo-hub">${GEO_DECKS.filter((d) => d.section === sec).map((d) => {
    const k = geoKnown(d);
    return `<button class="card geo-lesson" data-act="geo-open" data-v="${d.id}"><span class="gi">${d.icon}</span><span class="gt">${esc(d.title)}</span><span class="gn muted">${k} / ${d.items.length}</span><span class="bar"><i style="width:${(k / d.items.length) * 100}%"></i></span></button>`;
  }).join('')}</div>`).join('');
}
function geoLearn(d) {
  const toggle = d.map ? `<div class="seg mini-seg">${[['cards', '🃏 Cards'], ['map', '🗺️ Map']].map(([id, n]) => `<button class="${geo.view === id ? 'on' : ''}" data-act="geo-view" data-v="${id}">${n}</button>`).join('')}</div>` : '';
  const mapMode = d.map && geo.view === 'map';
  const cover = ''; // the Cover names switch sits under Sound, at the top right
  return toggle + (mapMode ? geoMapView(d, cover) : geoCards(d, cover));
}
function geoMapView(d, cover) {
  const sel = d.items.find((x) => x.id === geo.sel), stats = geoStats(d);
  const map = geoMapSvg(d, { click: true, sel: geo.sel, lv: stats, titles: !geo.cover, labels: d.map === 'provinces' && !geo.cover, dots: d.map === 'provinces', all: true, cls: 'big' });
  const hidden = sel && geo.cover && !geo.rev[d.id + sel.id]; // names covered: the tap only picks the place, you reveal the name yourself
  const panel = !sel ? `<div class="card muted">Tap a ${d.noun} on the map${geo.cover ? ' and guess its name' : ' to see its name and hear it'}.</div>`
    : hidden ? `<div class="card geo-sel geo-covered">${d.visual === 'flag' ? `<div class="geo-flag sm">${sel.flag()}</div>` : ''}<div class="geo-q-mark">?</div><div class="muted">What is this ${d.noun} called?</div><button class="primary" data-act="geo-reveal" data-id="${sel.id}">Show name</button></div>`
    : `<div class="card geo-res-main geo-sel">${d.visual === 'flag' ? `<div class="geo-flag sm">${sel.flag()}</div>` : ''}<div class="geo-res-txt">${geoInfo(d, sel)}<div class="row" style="margin-top:8px">${geoSayBtns(d, sel)}</div></div></div>`;
  const legend = d.feat ? '<span style="color:#5aa9e6">●</span> sea · <span style="color:#5aa9e6">━</span> river · <span style="color:#c9a27a">▲</span> mountain' : `<span style="color:var(--mint)">■</span> known · <span style="color:var(--butter)">■</span> learning${d.map === 'provinces' && d.section === 'geo' ? ' · ● capital' : ''}`;
  return `${cover}<div class="geo-mapview"><div class="card geo-mapcard">${map}</div><div>${panel}<p class="muted" style="font-size:13px;margin:10px 2px">${d.feat ? '' : 'Colours: '}${legend}</p></div></div>`;
}
function geoCards(d, cover) {
  const items = d.items.filter((it) => geo.region === 'all' || it.region === geo.region);
  const chips = d.regions ? `<div class="chips2" style="margin-bottom:12px"><button class="chip ${geo.region === 'all' ? 'on' : ''}" data-act="geo-region" data-v="all">All</button>${d.regions.map(([id, n]) => `<button class="chip ${geo.region === id ? 'on' : ''}" data-act="geo-region" data-v="${id}">${esc(n)}</button>`).join('')}</div>` : '';
  const tiles = items.map((it) => {
    const hide = geo.cover && !geo.rev[d.id + it.id], dot = geoDot(geoLevel(geoRec(d, it)));
    return `<button class="card geo-tile" data-act="geo-tile" data-id="${it.id}" title="Tap to hear it">${geoVis(it, d)}${hide ? '<div class="muted">Tap to reveal</div>' : `<div class="nm">${esc(it.name)}</div>${!geoSame(it.en, it.name) ? `<div class="muted">${esc(it.en)}</div>` : ''}${d.showCap && it.cap ? `<div class="cap">📍 ${esc(it.cap)}${!geoSame(it.capEn, it.cap) ? ` <span class="muted">(${esc(it.capEn)})</span>` : ''}</div>` : ''}${it.fact ? `<div class="muted" style="font-size:13px">${esc(it.fact)}</div>` : ''}`}<span class="dot">${dot}</span></button>`;
  }).join('');
  return `${chips}${cover}<div class="geo-grid">${tiles}</div><p class="muted" style="margin:12px 0 0;font-size:13px">○ new · ◐ learning · ● known · ★ mastered</p>`;
}
function geoQuizSetup(d) {
  const items = d.items.filter((it) => geo.qregion === 'all' || it.region === geo.qregion), weak = items.filter((it) => geoLevel(geoRec(d, it)) !== 'mastered').length;
  const kinds = [['mix', '🎲 Mix of everything', 'A bit of every question type.'], ...d.kinds.map((k) => [k.id, k.label, k.desc])];
  if (!kinds.some((k) => k[0] === geo.kind)) geo.kind = 'mix';
  return `<div class="fc-wrap geo-setup"><div class="card">
    <div class="geo-setup-head">${pigSvg('happy', 'pig-sm', { stage: pigStage(), card: true })}<div><h2>Ready for a quiz?</h2><p class="muted">10 questions. Bigg asks the ${d.nounPl} you know least first. 🌸</p></div></div>
    <h3 class="geo-sec">What kind of questions?</h3>
    <div class="geo-modes">${kinds.map(([id, n, desc]) => `<button class="geo-mode ${geo.kind === id ? 'on' : ''}" data-act="geo-kind" data-v="${id}"><b>${n}</b><small>${esc(desc)}</small></button>`).join('')}</div>
    <div class="geo-entog"><button class="switch ${geoEnOn() ? 'on' : ''}" role="switch" aria-checked="${geoEnOn()}" data-act="geo-en"><i></i>Show English</button></div>
    <div class="geo-foot">${d.regions ? `<label class="geo-part"><span class="muted">${d.part}</span><select id="geo-qreg"><option value="all">All ${d.nounPl}</option>${d.regions.map(([id, n]) => `<option value="${id}" ${geo.qregion === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : '<span></span>'}
      <div class="geo-go"><span class="muted">${weak} of ${items.length} not mastered yet</span><button class="primary" data-act="geo-start" ${items.length >= 4 ? '' : 'disabled'}>Start quiz</button></div></div></div></div>`;
}

// ---------- a quiz ----------
function geoStart() {
  const d = geoDeck(), items = d.items.filter((it) => geo.qregion === 'all' || it.region === geo.qregion);
  if (items.length < 4) return toast('Pick a bigger group first.');
  const queue = geoPickQueue(items, geoStats(d), 10).map((it, i) => {
    const k = geo.kind === 'mix' ? d.kinds[i % d.kinds.length] : d.kinds.find((x) => x.id === geo.kind);
    return { id: it.id, kind: k.id, opts: k.type === 'choice' ? geoOptions(d.items, it, k.key).map((x) => x.id) : null };
  });
  const order = L.shuffle(queue); // the question types rotate with the items, so shuffle after pairing
  geo.sess = { d, queue: order, i: 0, res: null, picked: '', typed: '', hint: 0, n: 0, good: 0, streak: 0, misses: [], coach: { kind: 'start', act: 'in', line: rnd(COACH.start), played: false } };
  render();
}
function geoAnswer(res, picked, typed) { // res: right | close | english | wrong
  const s = geo.sess, d = s.d, q = s.queue[s.i], it = d.items.find((x) => x.id === q.id), ok = res === 'right' || res === 'close';
  s.res = res; s.picked = picked || ''; s.typed = typed || ''; s.n++;
  if (res === 'right' && !s.hint) s.good++;
  if (!ok) s.misses.push(it);
  s.streak = ok ? s.streak + 1 : 0;
  geoMark(d, it, ok);
  const mo = L.coachMoment({ grade: ok ? 'good' : 'again', streak: s.streak, done: s.n, total: s.queue.length });
  s.coach = res === 'close' ? { kind: 'close', act: 'nod', line: rnd(PIG.close), played: false } : { kind: mo.kind, act: mo.act, line: ok ? rnd(COACH[mo.kind]) : rnd(PIG.wrong), played: false, burst: mo.burst };
  gainXp(res === 'right' ? (s.hint ? 8 : XP.itemRight) : res === 'close' ? XP.itemClose : XP.itemWrong);
  geoChime(ok ? 'ok' : 'bad'); render();
  if (s.coach.burst) burstBits(s.coach.burst);
}
function geoReveal(d, it, s, k) {
  const verdict = { right: '<b style="color:var(--mint)">✓ Goed zo!</b>', close: `<b style="color:var(--butter)">Almost! It is spelled <u>${esc(it[k.field])}</u>.</b>`, english: `<b style="color:var(--butter)">That is the English one. In Dutch: <u>${esc(it[k.field])}</u>.</b>`, wrong: s.typed ? `<span class="warn">You typed: ${esc(s.typed)}</span>` : '<span class="warn">That is okay, here it is!</span>' }[s.res];
  return `<div class="card rcard geo-res"><div class="geo-res-main">${d.visual === 'flag' ? `<div class="geo-flag sm">${it.flag()}</div>` : ''}<div class="geo-res-txt">${verdict}${geoInfo(d, it, true)}</div></div>
    <div class="row geo-res-btns"><button class="primary keyed up" data-act="geo-next" data-focus><span>${s.i + 1 >= s.queue.length ? 'Finish' : 'Next →'}</span><small class="btn-key"><kbd class="kbd">Space</kbd></small></button></div></div>`;
}
function geoSession() {
  const s = geo.sess, d = s.d, q = s.queue[s.i];
  if (!q) {
    const pct = s.n ? Math.round((s.good / s.n) * 100) : 0;
    return `<div class="top"><h1>Klaar! 🎉</h1></div><div class="fc-wrap"><div class="card" style="text-align:center;padding:30px">${pigSvg('happy', 'pig-md act-cheer', { stage: pigStage(), card: true })}
      <h2>${s.good} of ${s.n} right first time (${pct}%)</h2><p class="muted">${pct >= 80 ? 'Fantastisch! You know your stuff! 🌍' : 'Every round helps it stick. 🌸'}</p>
      ${s.misses.length ? `<div class="card" style="text-align:left;margin:12px 0"><h3 style="margin-top:0">To look at again</h3>${s.misses.map((it) => `<div class="dl-row"><div style="flex-direction:row;align-items:center;gap:12px"><span class="geo-mini">${geoVis(it, d)}</span><div><b>${esc(it.name)}</b>${d.showCap && it.cap ? `<small class="muted">📍 ${esc(it.cap)}</small>` : ''}</div></div><button class="ghost mini" data-act="geo-say" data-t="${esc(it.name)}" title="Listen">🔊</button></div>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center"><button class="primary" data-act="geo-start">Again</button><button class="ghost" data-act="geo-end">Back to the lesson</button></div></div></div>`;
  }
  const it = d.items.find((x) => x.id === q.id), k = d.kinds.find((x) => x.id === q.kind), co = s.coach, actCls = co.played ? '' : 'act-' + co.act;
  co.played = true;
  const coach = `<div class="coach">${pigSvg('happy', actCls, { stage: pigStage(), card: true })}<div class="cbub"><span>${esc(co.line || '')}</span></div></div>`;
  // the options (choice questions), and the controls that sit in the slot below: "I don't know", or the box to type in. After the answer the slot shows the result.
  let opts = '', ctl;
  if (k.type === 'choice') {
    opts = `<div class="opts ${k.optClass || ''}">${q.opts.map((id, n) => { const o = d.items.find((x) => x.id === id); return `<button data-act="geo-pick" data-v="${id}" class="${s.res ? (id === it.id ? 'ok' : id === s.picked ? 'no' : '') : ''}" ${s.res ? 'tabindex="-1"' : ''}>${k.opt(o)}${geoEnOn() && k.optF && geoEnOf(o, k.optF) ? `<small class="geo-en">${esc(geoEnOf(o, k.optF))}</small>` : ''}<kbd class="kbd"${s.res ? ' style="visibility:hidden"' : ''}>${n + 1}</kbd></button>`; }).join('')}</div>`;
    ctl = `<div class="row" style="justify-content:center"><button class="ghost keyed" data-act="geo-skip">🤷 I don't know${skipKey()}</button></div>`;
  } else {
    ctl = `${geoEnOn() && geoEnOf(it, k.field) ? `<div class="geo-en" style="text-align:center;margin-bottom:6px">in English: ${esc(geoEnOf(it, k.field))}</div>` : ''}${s.hint ? `<div class="hint-line">${esc(L.hintText(it[k.field], s.hint))}</div>` : ''}<input type="text" class="big-in" id="geo-in" data-focus data-enter="geo-check" autocomplete="off" spellcheck="false" placeholder="Type it in Dutch... (Enter)"><div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-act="geo-check">Check</button><button class="ghost" data-act="geo-hint">💡 Hint</button><button class="ghost keyed" data-act="geo-skip">🤷 I don't know${skipKey()}</button></div>`;
  }
  return `<div class="top"><div><h1>${d.icon} ${esc(d.full)}</h1></div><div class="row">${geoSoundBtn()}<button class="switch ${geoEnOn() ? 'on' : ''}" role="switch" aria-checked="${geoEnOn()}" data-act="geo-en" title="Show the English next to the Dutch"><i></i>Show English</button><button class="ghost" data-act="geo-end">End</button></div></div>
    <div class="fc-wrap geo-wrap">${coach}<div class="geo-prog"><div class="bar"><i style="width:${(s.i / s.queue.length) * 100}%"></i></div><span class="muted">${s.i + 1} / ${s.queue.length}</span></div>
    <div class="card geo-q${k.fill ? ' fill' : ''}">${k.ask(it, d)}${geoEnOn() && k.askF && geoEnOf(it, k.askF) ? `<div class="geo-en">${esc(geoEnOf(it, k.askF))}</div>` : ''}${k.fill ? '' : `<div class="muted geo-prompt">${esc(k.prompt)}</div>`}</div>${opts}<div class="geo-slot">${s.res ? geoReveal(d, it, s, k) : ctl}</div></div>`;
}

// The quiz page is exactly as tall as the window has room for, whatever the title row did (a long title wraps to two lines).
function geoFit() {
  const w = $('.geo-wrap'), m = $('#main'); if (!w || !m) return;
  const top = w.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop, pad = parseFloat(getComputedStyle(m).paddingBottom) || 0;
  w.style.height = Math.max(430, m.clientHeight - top - pad) + 'px';
}
window.addEventListener('resize', geoFit);

// ---------- actions ----------
Object.assign(ACT, {
  'geo-open': (el) => { const d = GEO_DECKS.find((x) => x.id === el.dataset.v); geo.deck = d.id; geo.tab = 'learn'; geo.view = d.map && d.section === 'geo' ? 'map' : 'cards'; geo.sel = ''; geo.region = 'all'; geo.qregion = 'all'; geo.kind = 'mix'; geo.rev = {}; geo.sess = null; render(); },
  'geo-home': () => { geo.deck = null; geo.sess = null; render(); },
  'geo-tab': (el) => { geo.tab = el.dataset.v; render(); },
  'geo-en': () => { S.geoEn = !geoEnOn(); save(); const t = ($('#geo-in') || {}).value || ''; render(); const i = $('#geo-in'); if (i) { i.value = t; i.focus(); } },
  'geo-say': (el) => geoSpeak(el.dataset.t),
  'geo-mute': () => { S.geoMute = !geoMuted(); if (S.geoMute) stopSpeech(); save(); render(); },
  'geo-view': (el) => { geo.view = el.dataset.v; render(); },
  'geo-map': (el) => { const d = geoDeck(), it = d.items.find((x) => x.id === el.dataset.id); if (!it) return; geo.sel = it.id; if (!geo.cover || geo.rev[d.id + it.id]) geoSpeak(it.name); render(); }, // with the names covered, saying it would give it away
  'geo-reveal': (el) => { const d = geoDeck(), it = d.items.find((x) => x.id === el.dataset.id); if (!it) return; geo.rev[d.id + it.id] = true; geoSpeak(it.name); render(); },
  'geo-region': (el) => { geo.region = el.dataset.v; render(); },
  'geo-cover': () => { geo.cover = !geo.cover; geo.rev = {}; render(); },
  'geo-tile': (el) => { const d = geoDeck(), it = d.items.find((x) => x.id === el.dataset.id); if (!it) return; geo.rev[d.id + it.id] = true; geoSpeak(it.name); if (geo.cover) render(); },
  'geo-kind': (el) => { geo.kind = el.dataset.v; render(); },
  'geo-start': geoStart,
  'geo-end': () => { geo.sess = null; render(); },
  'geo-pick': (el) => { const s = geo.sess; if (!s || s.res) return; const q = s.queue[s.i]; geoAnswer(el.dataset.v === q.id ? 'right' : 'wrong', el.dataset.v); },
  'geo-check': () => {
    const s = geo.sess; if (!s || s.res) return;
    const d = s.d, q = s.queue[s.i], it = d.items.find((x) => x.id === q.id), k = d.kinds.find((x) => x.id === q.kind), typed = ($('#geo-in') || {}).value || '';
    if (!typed.trim()) return toast('Type something first, or press "I don\'t know"');
    geoAnswer(geoJudge(typed, it, k.field), '', typed.trim());
  },
  'geo-skip': () => { const s = geo.sess; if (s && !s.res) geoAnswer('wrong', '', ''); },
  'geo-hint': () => { const s = geo.sess; if (!s || s.res) return; s.hint = Math.min(2, s.hint + 1); const typed = ($('#geo-in') || {}).value || ''; render(); const i = $('#geo-in'); if (i) { i.value = typed; i.focus(); } },
  'geo-next': () => {
    const s = geo.sess; if (!s) return;
    s.i++; s.res = null; s.picked = ''; s.typed = ''; s.hint = 0; s.coach = { kind: 'ask', act: '', line: rnd(['Take your time! 🌸', 'You can do it! 💗', 'Where in the world is this one? 🌍', 'Think of the map! 🗺️']), played: true };
    if (!s.queue[s.i]) { gainXp(XP.session); geoChime('goal'); if (s.good >= s.n * 0.8) confetti(); }
    render();
  },
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'geo-qreg') { geo.qregion = e.target.value; render(); }
});
document.addEventListener('keydown', (e) => { // 1-4 pick an option, Enter goes on
  if (ui.view !== 'bonus' || !geo.sess || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const s = geo.sess, q = s.queue[s.i]; if (!q) return;
  if (!s.res && keyOf(e) === hotkeys().skip && document.querySelector('[data-act="geo-skip"]')) { e.preventDefault(); ACT['geo-skip'](); }
  else if (!s.res && /^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('[data-act="geo-pick"]')[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } }
  else if (s.res && (e.key === ' ' || (e.key === 'Enter' && e.target.tagName !== 'BUTTON'))) { e.preventDefault(); ACT['geo-next'](); } // Space or Enter go on
});
document.addEventListener('keyup', (e) => { // a button would be "clicked" again when Space comes up
  if (e.key === ' ' && ui.view === 'bonus' && geo.sess && geo.sess.res && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.preventDefault();
});
