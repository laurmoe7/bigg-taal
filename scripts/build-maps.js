// Builds renderer/mapdata.js (simplified SVG paths) from three GeoJSON files:
//   node scripts/build-maps.js <ne_50m_admin_0_countries.geojson> <provincie_2023.geojson> <ne_50m_rivers_lake_centerlines.geojson>
// Sources (see data/README.md): Natural Earth 50m countries and rivers (public domain) and the Dutch provinces from cartomap/PDOK (CC BY 4.0).
// Which countries each map lights up comes from renderer/geodata.js, so the lessons and the maps cannot drift apart.
const fs = require('fs'), path = require('path');
const G = require('../renderer/geodata.js');
const [neFile, provFile, riverFile] = process.argv.slice(2);
if (!neFile || !provFile || !riverFile) { console.error('usage: node scripts/build-maps.js <countries.geojson> <provinces.geojson> <rivers.geojson>'); process.exit(1); }
const ne = JSON.parse(fs.readFileSync(neFile, 'utf8')), prov = JSON.parse(fs.readFileSync(provFile, 'utf8')), rivers = JSON.parse(fs.readFileSync(riverFile, 'utf8'));
const rad = Math.PI / 180, r1 = (n) => Math.round(n * 10) / 10;

const ringsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap((poly) => poly.map((ring, i) => ({ ring, hole: i > 0 })));
const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
function dp(pts, tol) { // Douglas-Peucker on an open line
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, at = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len; if (d > max) { max = d; at = i; } }
    if (max > tol && at > 0) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function dpRing(pts, tol) { // a closed ring: split it at the point farthest from the start, simplify both halves
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts = pts.slice(0, -1);
  if (pts.length < 4) return pts;
  let far = 1, fd = -1; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  return dp(pts.slice(0, far + 1), tol).concat(dp(pts.slice(far).concat([pts[0]]), tol).slice(1, -1));
}
function pathOf(rings, proj, tol, minArea, always) { // one path string and the centre of the biggest ring (found before simplifying, so tiny states keep a position)
  let d = '', best = null, bestA = 0;
  for (const { ring } of rings) {
    let pts = ring.map(([lo, la]) => proj(lo, la)); const A = Math.abs(area(pts));
    if (A > bestA && (A >= minArea || always)) { bestA = A; best = pts; }
    if (A < minArea && !(always && A > 0)) continue;
    pts = dpRing(pts, tol); if (pts.length < 3) continue;
    d += 'M' + pts.map(([x, y]) => r1(x) + ',' + r1(y)).join('L') + 'Z';
  }
  const c = best ? [best.reduce((s, p) => s + p[0], 0) / best.length, best.reduce((s, p) => s + p[1], 0) / best.length] : null;
  return { d, c: c && [r1(c[0]), r1(c[1])], area: bestA };
}

// ----- the continents: Lambert azimuthal equal-area maps -----
// win = [lon min, lat min, lon max, lat max] of what is kept (lon in 0-360 when wrap is set); skip = countries that should not stretch the frame
const REGIONS = {
  europe: { items: G.EUROPE, lam0: 10, phi0: 52, R: 560, win: [-25, 33.5, 45, 72], skip: ['ru'] },
  asia: { items: G.ASIA, lam0: 85, phi0: 28, R: 330, win: [25, -12, 150, 56], skip: [] },
  africa: { items: G.AFRICA, lam0: 18, phi0: 2, R: 420, win: [-26, -36, 60, 38], skip: [] },
  namerica: { items: G.NAMERICA, lam0: -95, phi0: 25, R: 420, win: [-170, 5, -50, 72], skip: [] },
  samerica: { items: G.SAMERICA, lam0: -60, phi0: -20, R: 460, win: [-85, -58, -30, 14], skip: [] },
  oceania: { items: G.OCEANIA, lam0: 165, phi0: -15, R: 560, win: [110, -50, 215, 22], skip: [], wrap: true },
};
// places that are too small to survive on a map (or missing in the data): [lat, lon]
const SPOTS = { mc: [43.74, 7.42], va: [41.9, 12.45], mt: [35.9, 14.4], li: [47.14, 9.55], sm: [43.94, 12.46], ad: [42.55, 1.58] };
const laeaOf = ({ lam0, phi0, R }) => { const l0 = lam0 * rad, p0 = phi0 * rad; return (lo, la) => { const l = lo * rad, p = la * rad, k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0))); return [R * k * Math.cos(p) * Math.sin(l - l0), -R * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0))]; }; };

function buildRegion(name, cfg) {
  const proj = laeaOf(cfg), mine = new Set(cfg.items.map((c) => c.id)), [w0, w1, w2, w3] = cfg.win;
  const lon = (lo) => (cfg.wrap && lo < 0 ? lo + 360 : lo);
  const inWin = (ring) => ring.some(([lo, la]) => lon(lo) > w0 && lon(lo) < w2 && la > w1 && la < w3);
  const tol = cfg.R * 0.0016, own = cfg.R * cfg.R * 1.6e-6, ctx = cfg.R * cfg.R * 4.5e-5;
  const out = { shapes: [], pts: {}, small: [] }, frame = [], areas = {};
  for (const f of ne.features.filter((x) => x.geometry && x.properties)) {
    const iso = String(f.properties.ISO_A2_EH || '').toLowerCase(), isMine = mine.has(iso);
    const rings = ringsOf(f.geometry).filter((r) => !r.hole && inWin(r.ring));
    if (!rings.length) continue;
    const o = pathOf(rings, proj, isMine ? tol * 0.6 : tol, isMine ? own : ctx, isMine);
    if (!o.d && !isMine) continue;
    if (o.d) out.shapes.push([isMine ? iso : '', o.d]);
    if (isMine) {
      if (!(areas[iso] >= o.area)) { out.pts[iso] = o.c; areas[iso] = o.area; } // a country can come in pieces (Australia and its far islands): the biggest decides
      if (!cfg.skip.includes(iso)) for (const r of rings) for (const [lo, la] of r.ring) if (lon(lo) > w0 && lon(lo) < w2 && la > w1 && la < w3) frame.push(proj(lo, la));
    }
  }
  for (const id of mine) if (!out.pts[id]) { // not in the data at all: put it on the map by its coordinates
    if (!SPOTS[id]) { console.warn(name + ': no shape or position for', id); continue; }
    out.pts[id] = proj(SPOTS[id][1], SPOTS[id][0]).map(r1); areas[id] = 0;
  }
  out.shapes.sort((a, b) => (a[0] ? 1 : 0) - (b[0] ? 1 : 0)); // the neighbours first, the lesson's countries on top
  const xs = frame.map((p) => p[0]), ys = frame.map((p) => p[1]), M = 0.05 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  out.vb = [Math.floor(Math.min(...xs) - M), Math.floor(Math.min(...ys) - M), 0, 0];
  out.vb[2] = Math.ceil(Math.max(...xs) + M - out.vb[0]); out.vb[3] = Math.ceil(Math.max(...ys) + M - out.vb[1]);
  const fa = out.vb[2] * out.vb[3]; out.r = Math.round(out.vb[2] * 0.04);
  for (const id of Object.keys(areas)) if (areas[id] < fa * 0.0006) out.small.push(id);
  return { out, proj };
}

const MAPS = {}; let europeProj;
for (const [name, cfg] of Object.entries(REGIONS)) { const { out, proj } = buildRegion(name, cfg); MAPS[name] = out; if (name === 'europe') europeProj = proj; console.log(name, 'shapes', out.shapes.length, 'small', out.small.join(' '), 'vb', out.vb.join(' ')); }

// ----- seas, rivers and mountains of Europe -----
const POINTS = { // [lat, lon]
  noordzee: [56, 3], oostzee: [58, 19.5], 'middellandse-zee': [35.5, 18], 'zwarte-zee': [43.3, 34], 'atlantische-oceaan': [45, -17], 'adriatische-zee': [43.2, 15.5], 'egeische-zee': [38.8, 25], 'noorse-zee': [67, 2],
  'ierse-zee': [53.7, -5], 'het-kanaal': [50.1, -1.5], 'golf-van-biskaje': [45.3, -4.5], 'botnische-golf': [62, 19.5], 'ionische-zee': [38, 18.5], 'tyrreense-zee': [40, 12],
  alpen: [46.6, 9.8], pyreneeen: [42.7, 0.6], karpaten: [47.3, 24.8], apennijnen: [43.3, 12.7], 'scandinavisch-gebergte': [63, 11.5], 'dinarische-alpen': [44, 17.5], balkangebergte: [42.8, 25],
  ardennen: [50.1, 5.6], 'zwarte-woud': [48.1, 8.2], harz: [51.8, 10.6], etna: [37.75, 15], vesuvius: [40.82, 14.43], hekla: [63.99, -19.7],
};
const RIVERS = { rijn: ['Rhine', 'Rhein', 'Rhin'], donau: ['Danube'], elbe: ['Elbe'], seine: ['Seine'], loire: ['Loire'], rhone: ['Rhône'], po: ['Po'], wisla: ['Vistula'], oder: ['Oder'], theems: ['Thames'], ebro: ['Ebro'], garonne: ['Garonne'] };
const feat = {};
for (const [id, [la, lo]] of Object.entries(POINTS)) feat[id] = { p: europeProj(lo, la).map(r1) };
for (const [id, names] of Object.entries(RIVERS)) {
  let d = '';
  for (const f of rivers.features.filter((x) => names.includes(x.properties.name) && x.geometry)) {
    for (const line of f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates) { const pts = dp(line.map(([lo, la]) => europeProj(lo, la)), 0.9); if (pts.length > 1) d += 'M' + pts.map(([x, y]) => r1(x) + ',' + r1(y)).join('L'); }
  }
  if (!d) console.warn('no river line for', id); else feat[id] = { d };
}
for (const w of G.WATERS) if (!feat[w.id]) console.warn('waters item without a drawing:', w.id);
MAPS.europe.feat = feat;

// ----- the Netherlands: plain projection scaled by cos(latitude) -----
const NAMES = { Groningen: 'gr', 'Fryslân': 'fr', Drenthe: 'dr', Overijssel: 'ov', Flevoland: 'fl', Gelderland: 'ge', Utrecht: 'ut', 'Noord-Holland': 'nh', 'Zuid-Holland': 'zh', Zeeland: 'ze', 'Noord-Brabant': 'nb', Limburg: 'li' };
const CAPITALS = { gr: [53.22, 6.57], fr: [53.2, 5.8], dr: [53.0, 6.56], ov: [52.51, 6.09], fl: [52.51, 5.47], ge: [51.98, 5.91], ut: [52.09, 5.12], nh: [52.38, 4.64], zh: [52.08, 4.31], ze: [51.5, 3.61], nb: [51.69, 5.3], li: [50.85, 5.69] };
const S = 330, kx = Math.cos(52.2 * rad), nlp = (lo, la) => [lo * kx * S, -la * S];
const nl = { shapes: [], pts: {}, ctr: {} };
for (const f of prov.features) {
  const id = NAMES[f.properties.statnaam]; if (!id) { console.warn('unknown province', f.properties.statnaam); continue; }
  const o = pathOf(ringsOf(f.geometry).filter((r) => !r.hole), nlp, 0.25, 0.4, true); nl.shapes.push([id, o.d]); nl.ctr[id] = o.c; nl.pts[id] = nlp(CAPITALS[id][1], CAPITALS[id][0]).map(r1);
}
const all = nl.shapes.flatMap(([, d]) => d.match(/-?[\d.]+,-?[\d.]+/g).map((s) => s.split(',').map(Number)));
const bx = all.map((p) => p[0]), by = all.map((p) => p[1]);
nl.vb = [Math.floor(Math.min(...bx)) - 8, Math.floor(Math.min(...by)) - 8, Math.ceil(Math.max(...bx) - Math.min(...bx)) + 16, Math.ceil(Math.max(...by) - Math.min(...by)) + 16];
MAPS.provinces = nl;

const out = '// Generated by scripts/build-maps.js: simplified outlines for the Bonus Lessons maps. Do not edit by hand.\n// Natural Earth (public domain) for the continents and rivers; Dutch provinces from cartomap / PDOK (CC BY 4.0).\nconst MAPS = ' + JSON.stringify(MAPS) + ';\nif (typeof module !== \'undefined\' && module.exports) module.exports = { MAPS };\n';
const dest = path.join(__dirname, '..', 'renderer', 'mapdata.js'); fs.writeFileSync(dest, out);
console.log('wrote', dest, (out.length / 1024).toFixed(0) + ' KB');
