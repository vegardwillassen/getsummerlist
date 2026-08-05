import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(root, 'data/places.json'), 'utf8'));
const zonesFile = JSON.parse(readFileSync(join(root, 'data/zones.json'), 'utf8'));
const minCss = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/ ?([{};:,>]) ?/g, '$1').replace(/;}/g, '}').trim();
const minJs = s => s.split('\n').map(l => l.replace(/\/\/[^'"]*$/, '').trim()).filter(Boolean).join('\n');
const css = minCss(readFileSync(join(root, 'src/styles.css'), 'utf8'));
const appJs = minJs(readFileSync(join(root, 'src/app.js'), 'utf8'));
const landingTpl = readFileSync(join(root, 'src/landing.html'), 'utf8');

const HARBOUR = [34.9822, 33.9994];
const MPM = zonesFile.meta.walk_metres_per_minute;
const PRICE_EUR = zonesFile.meta.price_eur || 29;
const PIXEL_ID = zonesFile.meta.meta_pixel_id || null;

function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000, toR = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1), dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const walkMin = (from, to) => Math.max(1, Math.round(haversine(from, to) / MPM));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fromHotel(zone, p) {
  const w = walkMin(zone.ll, p.ll);
  const km = (haversine(zone.ll, p.ll) / 1000).toFixed(1);
  if (p.mode === 'boat') {
    const toQuay = walkMin(zone.ll, HARBOUR);
    return 'Departs the harbour, ' + toQuay + ' min walk to the quay';
  }
  if (p.mode === 'walk' || w <= 25) {
    return p.bus ? w + ' min walk, or bus ' + p.bus : w + ' min walk';
  }
  if (p.bus) return 'Bus ' + p.bus + ', ' + km + ' km away';
  if (p.mode === 'taxi') return 'Taxi or organised pickup, ' + km + ' km away';
  return km + ' km away, bus or taxi';
}

function trim(text, max) {
  if (!text || text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = cut.lastIndexOf('. ');
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '.';
}

const CATLAB = { beach: 'Beach', water: 'Water fun', sight: 'Sight', boat: 'Boat trip', daytrip: 'Day trip', food: 'Food & drink', night: 'Nightlife', well: 'Wellness' };
const MODE_LAB = { walk: 'Walk', bus: 'Bus', taxi: 'Taxi', boat: 'Boat' };

/* Taste profiles. classic is the human cut and bypasses scoring entirely. */
const PROFILES = {
  classic: null,
  sun: { label: 'beach days', w: { beach: 3, water: 1.5, sight: 0.5, boat: 1, daytrip: 0.5, food: 1, night: 0.5, well: 1 } },
  water: { label: 'days in and on the water', w: { beach: 1.5, water: 3, sight: 0.5, boat: 2.5, daytrip: 0.5, food: 0.5, night: 0.5, well: 0 } },
  explore: { label: 'seeing the real Cyprus', w: { beach: 0.5, water: 0.5, sight: 3, boat: 1, daytrip: 2.5, food: 1, night: 0, well: 0.5 } },
  party: { label: 'big nights', w: { beach: 1, water: 1, sight: 0, boat: 1.5, daytrip: 0, food: 2, night: 4, well: 0.5 } },
  chill: { label: 'slow days', w: { beach: 2, water: 0.5, sight: 1, boat: 1, daytrip: 0.5, food: 2, night: 0, well: 3 } },
};

function pick(zone, key) {
  if (key === 'classic') return {
    twelve: places.filter(p => p.tier === 'verdict'),
    unlocks: places.filter(p => p.tier === 'unlock'),
  };
  const prof = PROFILES[key];
  const scored = places.map(p => {
    let s = prof.w[p.cat] || 0;
    if (p.tier === 'verdict') s += 1;
    if (p.tier === 'unlock') s += 0.5;
    const w = walkMin(zone.ll, p.ll);
    if (w <= 15) s += 0.5; else if (w <= 25) s += 0.25;
    if (p.book_ahead) s += 0.25;
    return { p, s };
  }).sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name));
  const twelve = [];
  const perCat = {};
  for (const { p } of scored) {
    if (twelve.length === 12) break;
    if ((perCat[p.cat] || 0) >= 4) continue;
    perCat[p.cat] = (perCat[p.cat] || 0) + 1;
    twelve.push(p);
  }
  const chosen = new Set(twelve.map(p => p.id));
  const unlocks = scored.map(x => x.p).filter(p => !chosen.has(p.id)).slice(0, 10);
  return { twelve, unlocks };
}

function entryHtml(zone, p, i, tier) {
  return '<div class="card" data-id="' + p.id + '" data-cat="' + p.cat + '" tabindex="0"' +
    (p.img ? ' data-img="' + esc(p.img) + '"' : '') +
    (p.book_ahead ? ' data-ba="1"' : '') +
    (p.web ? ' data-web="' + esc(p.web) + '"' : '') + '>' +
    '<div class="body">' +
    '<div class="name">' + esc(p.name) + '</div>' +
    '<div class="blurb">' + esc(p.verdict) + '</div>' +
    '<div class="meta"><span><b>' + esc(p.price.band || p.price.text) + '</b></span>' +
    '<span class="from">' + esc(fromHotel(zone, p)) + '</span>' +
    '<span class="mbadge">' + (MODE_LAB[p.mode] || p.mode) + '</span>' +
    '</div></div>' +
    '<div class="extra hidden">' +
    '<p class="d">' + esc(trim(p.detail, tier === 'verdict' ? 300 : 170)) + '</p>' +
    (p.tip && tier === 'verdict' ? '<p class="t">' + esc(trim(p.tip, 160)) + '</p>' : '') +
    '<span class="dur">' + esc(p.duration) + '</span>' +
    '<span class="ptext">' + esc(p.price.typical_eur ? (p.price.band || p.price.text) + ', typically EUR ' + p.price.typical_eur : (p.price.band || p.price.text)) + '</span>' +
    '</div></div>';
}

const pixelHead = PIXEL_ID ?
  '<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","' + PIXEL_ID + '");fbq("track","PageView");</script>' : '';

function zonePage(zone, key, sel, assets) {
  const prof = PROFILES[key];
  const u1 = sel.unlocks.slice(0, 5), u2 = sel.unlocks.slice(5, 10);
  const verified = new Date(zonesFile.meta.verified + 'T00:00:00Z')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const framing = key === 'classic'
    ? '300 checked, 12 won. These are the twelve worth your week.'
    : '300 checked, 12 picked for ' + prof.label + ' from your part of town.';
  const wave = '<div class="wave"><svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,48 C180,80 360,16 540,40 C720,64 900,8 1080,32 C1260,56 1380,40 1440,28 L1440,80 L0,80 Z"/></svg></div>';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<meta name="referrer" content="no-referrer">' +
    '<title>The Summer List · Ayia Napa · ' + esc(zone.name) + '</title>' +
    '<link rel="stylesheet" href="/a/' + assets.cssName + '">' +
    (key === 'classic' ? pixelHead : '') +
    '</head><body>' +
    '<header><div class="wrap">' +
    '<span class="kicker">Ayia Napa · Cyprus · ' + esc(zone.name) + '</span>' +
    '<h1>The Summer List</h1>' +
    '<p class="sub">The 12 things worth doing, what each costs, how you get there from your hotel. Distances measured for ' + esc(zone.hotels.join(', ')) + ' and neighbours.</p>' +
    '<div class="progress"><div class="row"><span class="nums"><b id="nDone">0</b> done</span><span class="nums" id="nTotal">0 / 12</span></div>' +
    '<div class="bar"><i id="barFill"></i></div></div>' +
    '</div>' + wave + '</header>' +
    '<main class="wrap">' +
    '<div class="lede">' +
    '<span class="verified">Verified ' + verified + '</span>' +
    '<button class="btn solid" id="printBtn" type="button">Save as PDF / print</button>' +
    '<span class="note">Bookmark this page or add it to your home screen. This link is your copy. Tap a card for the full story.</span>' +
    '</div>' +
    '<p class="framing">' + framing + '</p>' +
    '<div class="grid">' + sel.twelve.map((p, i) => entryHtml(zone, p, i, 'verdict')).join('') + '</div>' +
    '<section class="unlock" id="u1"><button class="btn unlockBtn" data-unlock="u1" type="button">Show 5 more that nearly made it</button>' +
    '<div class="grid upanel" hidden>' + u1.map((p, i) => entryHtml(zone, p, i, 'unlock')).join('') + '</div></section>' +
    '<section class="unlock" id="u2"><button class="btn unlockBtn" data-unlock="u2" type="button">Show the last 5 from the shortlist</button>' +
    '<div class="grid upanel" hidden>' + u2.map((p, i) => entryHtml(zone, p, i, 'unlock')).join('') + '</div></section>' +
    '<div class="foot"><p>The Summer List by Vegard · Ayia Napa EUR ' + PRICE_EUR + ' · Rhodes and Albufeira next season · getsummerlist.com</p>' +
    '<p class="privacy">We log page opens and taps on this page to improve the list. Nothing is sold or shared, and nothing identifies you beyond this link.</p></div>' +
    '</main>' +
    '<div class="overlay" id="overlay"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>' +
    '<script>const ZONE="' + zone.slug + '";const PROFILE="' + key + '";const PRICE=' + PRICE_EUR + ';</script>' +
    '<script src="/a/' + assets.jsName + '"></script>' +
    '</body></html>';
}

/* Landing: zone buttons plus the quiz data payload. */
function landing(pre) {
  const zoneButtons = zonesFile.zones.map(z => {
    const href = z.stripe_link.startsWith('REPLACE_') ? '#' : z.stripe_link;
    const dis = z.stripe_link.startsWith('REPLACE_') ? ' data-soon="1"' : '';
    return '<a class="zbtn" href="' + esc(href) + '"' + dis + '><b>' + esc(z.name) + '</b><span>' + esc(z.hotels.slice(0, 3).join(', ')) + '…</span></a>';
  }).join('');
  const protos = {};
  for (const [k, v] of Object.entries(PROFILES)) if (v) protos[k] = v.w;
  const payload = {
    price: PRICE_EUR,
    zones: zonesFile.zones.map(z => ({
      s: z.slug, n: z.name, h: z.hotels.slice(0, 3).join(', '),
      u: z.stripe_link.startsWith('REPLACE_') ? null : z.stripe_link,
    })),
    protos, pre,
  };
  return landingTpl
    .replace('<!--ZONES-->', zoneButtons)
    .replace('<!--QUIZDATA-->', '<script>const SL=' + JSON.stringify(payload) + ';</script>');
}

const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'jk'), join(dist, 'jk'), { recursive: true });

const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
const assets = { cssName: 's.' + hash(css) + '.css', jsName: 'z.' + hash(appJs) + '.js' };
mkdirSync(join(dist, 'a'), { recursive: true });
writeFileSync(join(dist, 'a', assets.cssName), css);
writeFileSync(join(dist, 'a', assets.jsName), appJs);

mkdirSync(join(dist, 'an'), { recursive: true });
writeFileSync(join(dist, 'an', 'index.html'),
  '<!DOCTYPE html><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/"><title>The Summer List</title><a href="/">The Summer List</a>');

const pre = {};
for (const zone of zonesFile.zones) {
  pre[zone.slug] = {};
  for (const key of Object.keys(PROFILES)) {
    const sel = pick(zone, key);
    pre[zone.slug][key] = sel.twelve.slice(0, 3).map(p => ({
      n: p.name, pr: p.price.band || p.price.text, fr: fromHotel(zone, p),
    }));
    const dir = key === 'classic' ? join(dist, 'l', zone.slug) : join(dist, 'l', zone.slug, key);
    mkdirSync(dir, { recursive: true });
    const html = zonePage(zone, key, sel, assets);
    writeFileSync(join(dir, 'index.html'), html);
    const path = '/l/' + zone.slug + (key === 'classic' ? '/' : '/' + key + '/');
    console.log('built ' + path + ' (' + zone.id + ') ' + (html.length / 1024).toFixed(1) + ' KB');
  }
}
writeFileSync(join(dist, 'index.html'), landing(pre));
console.log('built landing ' + (landing(pre).length / 1024).toFixed(1) + ' KB');
console.log('assets /a/' + assets.cssName + ' ' + (css.length / 1024).toFixed(1) + ' KB, /a/' + assets.jsName + ' ' + (appJs.length / 1024).toFixed(1) + ' KB');
