import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(root, 'data/places.json'), 'utf8'));
const zonesFile = JSON.parse(readFileSync(join(root, 'data/zones.json'), 'utf8'));
const minify = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n').replace(/\n(?=[{}])/g, '').replace(/([{};:,])\n/g, '$1');
const css = minify(readFileSync(join(root, 'src/styles.css'), 'utf8'));
const appJs = minify(readFileSync(join(root, 'src/app.js'), 'utf8'));
const landingTpl = readFileSync(join(root, 'src/landing.html'), 'utf8');

const HARBOUR = [34.9822, 33.9994];
const MPM = zonesFile.meta.walk_metres_per_minute;

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

const eur = p => p.price.typical_eur == null ? '' : (p.price.typical_eur === 0 ? 'Free' : 'EUR ' + p.price.typical_eur);

function trim(text, max) {
  if (!text || text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = cut.lastIndexOf('. ');
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '.';
}

function entryHtml(zone, p, i, tier) {
  return '<article class="e" data-id="' + p.id + '">' +
    '<div class="ehead"><span class="cat">' + esc(p.cat) + '</span>' +
    '<h3>' + (tier === 'verdict' ? (i + 1) + '. ' : '') + esc(p.name) + '</h3></div>' +
    '<p class="verdict">' + esc(p.verdict) + '</p>' +
    '<div class="facts">' +
    '<div><span class="lab">Costs</span>' + esc(p.price.band || p.price.text) + (eur(p) ? ' <span class="typ">(' + eur(p) + ' typical)</span>' : '') + '</div>' +
    '<div><span class="lab">From your hotel</span>' + esc(fromHotel(zone, p)) + '</div>' +
    '<div><span class="lab">Time</span>' + esc(p.duration) + (p.book_ahead ? ' · book ahead' : '') + '</div>' +
    '</div>' +
    (tier === 'verdict'
      ? '<details><summary>The full story</summary><p>' + esc(trim(p.detail, 320)) + '</p>' +
        (p.tip ? '<p class="tip"><b>Tip:</b> ' + esc(trim(p.tip, 170)) + '</p>' : '') +
        '<p class="links"><a href="' + esc(p.maps) + '" target="_blank" rel="noopener">Open in Google Maps</a>' +
        (p.web ? ' · <a href="' + esc(p.web) + '" target="_blank" rel="noopener">Website</a>' : '') + '</p></details>'
      : '<p class="links"><a href="' + esc(p.maps) + '" target="_blank" rel="noopener">Open in Google Maps</a></p>') +
    '<button class="want" data-want="' + p.id + '" type="button">Want to do this</button>' +
    '</article>';
}

function zonePage(zone) {
  const verdicts = places.filter(p => p.tier === 'verdict');
  const unlocks = places.filter(p => p.tier === 'unlock');
  const u1 = unlocks.slice(0, 5), u2 = unlocks.slice(5, 10);
  const verified = new Date(zonesFile.meta.verified + 'T00:00:00Z')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<meta name="referrer" content="no-referrer">' +
    '<title>The Summer List · Ayia Napa · ' + esc(zone.name) + '</title>' +
    '<style>' + css + '</style></head><body>' +
    '<header><p class="kick">The Summer List · Ayia Napa</p>' +
    '<h1>' + esc(zone.name) + '</h1>' +
    '<p class="hotels">Distances measured for ' + esc(zone.hotels.join(', ')) + ' and nearby hotels.</p>' +
    '<p class="verified">Prices, routes and opening hours verified ' + verified + '.</p>' +
    '<div class="toolbar"><button id="printBtn" type="button">Save as PDF / print</button>' +
    '<span class="hint">Bookmark this page or add it to your home screen. This link is your copy.</span></div>' +
    '</header>' +
    '<main>' +
    '<p class="framing">300 checked, 12 won. These are the twelve worth your week, with what each costs and how you get there from your hotel.</p>' +
    verdicts.map((p, i) => entryHtml(zone, p, i, 'verdict')).join('') +
    '<section class="unlock" id="u1"><button class="unlockBtn" data-unlock="u1" type="button">Show 5 more that nearly made it</button>' +
    '<div class="upanel" hidden>' + u1.map((p, i) => entryHtml(zone, p, i, 'unlock')).join('') + '</div></section>' +
    '<section class="unlock" id="u2"><button class="unlockBtn" data-unlock="u2" type="button">Show the last 5 from the shortlist</button>' +
    '<div class="upanel" hidden>' + u2.map((p, i) => entryHtml(zone, p, i, 'unlock')).join('') + '</div></section>' +
    '</main>' +
    '<footer><p>The Summer List by Vegard · Ayia Napa EUR 29 · Rhodes and Albufeira next season · getsummerlist.com</p>' +
    '<p class="privacy">We log page opens and taps on this page to improve the list. Nothing is sold or shared, and nothing identifies you beyond this link.</p>' +
    '</footer>' +
    '<script>const ZONE="' + zone.slug + '";' + appJs + '</script>' +
    '</body></html>';
}

function landing() {
  const zoneButtons = zonesFile.zones.map(z => {
    const href = z.stripe_link.startsWith('REPLACE_') ? '#' : z.stripe_link;
    const dis = z.stripe_link.startsWith('REPLACE_') ? ' data-soon="1"' : '';
    return '<a class="zbtn" href="' + esc(href) + '"' + dis + '><b>' + esc(z.name) + '</b><span>' + esc(z.hotels.slice(0, 3).join(', ')) + '…</span></a>';
  }).join('');
  return landingTpl.replace('<!--ZONES-->', zoneButtons);
}

const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), landing());
mkdirSync(join(dist, 'an'), { recursive: true });
writeFileSync(join(dist, 'an', 'index.html'),
  '<!DOCTYPE html><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/"><title>The Summer List</title><a href="/">The Summer List</a>');
for (const zone of zonesFile.zones) {
  const dir = join(dist, 'l', zone.slug);
  mkdirSync(dir, { recursive: true });
  const html = zonePage(zone);
  writeFileSync(join(dir, 'index.html'), html);
  console.log('built /l/' + zone.slug + '/ (' + zone.id + ') ' + (html.length / 1024).toFixed(1) + ' KB');
}
console.log('built landing ' + (landing().length / 1024).toFixed(1) + ' KB');
