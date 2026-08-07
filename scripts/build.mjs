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
const IMG_LIST = [];
const IMG_IDX = {};
for (const p of places) if (p.img) { IMG_IDX[p.id] = IMG_LIST.length; IMG_LIST.push(p.img); }
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

/* Consent-gated Meta pixel module, served from /a/ (immutable cached).
   Nothing loads or fires until the visitor taps Allow. Decline is permanent.
   window.slPx.track(event, params) queues pre-consent and drops on decline.
   PageView auto-fires per page via window.SL_PAGE. */
const pxJs = PIXEL_ID ? (
  '(function(){var PID="' + PIXEL_ID + '",KEY="sl-consent",q=[],ready=false,declined=false;' +
  'function g(){try{return localStorage.getItem(KEY)}catch(e){return null}}' +
  'function s(v){try{localStorage.setItem(KEY,v)}catch(e){}}' +
  'function flush(){for(var i=0;i<q.length;i++){try{fbq.apply(null,q[i])}catch(e){}}q=[]}' +
  'function load(){if(ready)return;ready=true;' +
  '!function(f,b,e,v,n,t,x){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;x=b.getElementsByTagName(e)[0];x.parentNode.insertBefore(t,x)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");' +
  'fbq("init",PID);flush()}' +
  'function track(){if(declined)return;var a=["track"].concat([].slice.call(arguments));if(ready&&window.fbq){try{fbq.apply(null,a)}catch(e){}}else q.push(a)}' +
  'window.slPx={track:track};' +
  'function bar(){if(document.getElementById("slConsent"))return;var d=document.createElement("div");d.id="slConsent";' +
  'd.innerHTML=\'<span>We use cookies to measure our advertising. They load only if you accept, and share page views and purchases with Meta. See our <a href="/privacy/">privacy policy</a>.</span><span class="slC-b"><button type="button" id="slC-no">Reject</button><button type="button" id="slC-yes">Accept</button></span>\';' +
  'var st=document.createElement("style");st.textContent="#slConsent{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#12222F;color:#D8E0E6;font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;padding:14px 18px;display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 -6px 20px rgba(0,0,0,.25)}#slConsent a{color:#fff;text-decoration:underline}#slConsent .slC-b{display:flex;gap:10px;flex:0 0 auto}#slConsent button{font:inherit;font-weight:700;border-radius:999px;padding:9px 18px;cursor:pointer;border:none}#slC-no{background:none;color:#9FB0BC;border:1px solid rgba(255,255,255,.25)}#slC-yes{background:#FF6B57;color:#fff}";' +
  'document.head.appendChild(st);document.body.appendChild(d);' +
  'document.getElementById("slC-yes").onclick=function(){s("yes");d.remove();load()};' +
  'document.getElementById("slC-no").onclick=function(){s("no");declined=true;q=[];d.remove()}}' +
  'var c=g();if(c==="yes"){load()}else if(c==="no"){declined=true}else{if(document.body){bar()}else{document.addEventListener("DOMContentLoaded",bar)}}' +
  'if(window.SL_PAGE)track("PageView")})();'
) : '';
let PX_NAME = null;
function pixelTags(page) {
  return PIXEL_ID ? '<script>window.SL_PAGE="' + page + '";</script><script src="/a/' + PX_NAME + '" defer></script>' : '';
}

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
    pixelTags('zone') +
    '</head><body>' +
    '<header><div class="wrap">' +
    '<span class="kicker">Ayia Napa · Cyprus · ' + esc(zone.name) + '</span>' +
    '<h1>The Summer List</h1>' +
    '<p class="sub">The 12 things worth doing, what each costs, how you get there from your hotel. Distances measured for ' + esc(zone.hotels.slice(0, 4).join(', ')) + ' and neighbours.</p>' +
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
    '<p class="privacy">Our own logs of opens and taps stay anonymous and are never sold. With your consent we load Meta\'s pixel to measure our ads; decline and nothing goes to Meta. <a href="/privacy/">Privacy policy</a>.</p></div>' +
    '</main>' +
    '<div class="overlay" id="overlay"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>' +
    '<script>window.ZONE="' + zone.slug + '";window.PROFILE="' + key + '";window.PRICE=' + PRICE_EUR + ';</script>' +
    '<script defer src="/a/' + assets.jsName + '"></script>' +
    '</body></html>';
}

/* Landing: quiz data payload. The example card and the detail modal are
   rendered client-side from det[topPickId], with the hotel-relative line
   computed live, so the moat is real and zone-varying before payment. */
function landing(pre, det) {
  const protos = {}, labels = {};
  for (const [k, v] of Object.entries(PROFILES)) if (v) { protos[k] = v.w; labels[k] = v.label; }
  const payload = {
    price: PRICE_EUR, labels, imgs: IMG_LIST, mpm: MPM, harbour: HARBOUR,
    zones: zonesFile.zones.map(z => ({
      s: z.slug, n: z.name, h: z.hotels.slice(0, 3).join(', '), hl: z.hotels, ll: z.ll,
      u: z.stripe_link.startsWith('REPLACE_') ? null : z.stripe_link,
    })),
    protos, pre, det,
  };
  return landingTpl
    .replace('<!--PIXEL-->', pixelTags('landing'))
    .replace('<!--QUIZDATA-->', '<script>const SL=' + JSON.stringify(payload) + ';</script>');
}

const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'jk'), join(dist, 'jk'), { recursive: true });
cpSync(join(root, 'src/og.png'), join(dist, 'og.png'));

const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
const assets = { cssName: 's.' + hash(css) + '.css', jsName: 'z.' + hash(appJs) + '.js' };
mkdirSync(join(dist, 'a'), { recursive: true });
writeFileSync(join(dist, 'a', assets.cssName), css);
writeFileSync(join(dist, 'a', assets.jsName), appJs);
if (PIXEL_ID) {
  PX_NAME = 'px.' + hash(pxJs) + '.js';
  writeFileSync(join(dist, 'a', PX_NAME), pxJs);
}

mkdirSync(join(dist, 'an'), { recursive: true });
writeFileSync(join(dist, 'an', 'index.html'),
  '<!DOCTYPE html><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/"><title>The Summer List</title><a href="/">The Summer List</a>');

const pre = {};
const DET = {};  // distinct top picks, full detail for the client-rendered card + modal
for (const zone of zonesFile.zones) {
  pre[zone.slug] = {};
  for (const key of Object.keys(PROFILES)) {
    const sel = pick(zone, key);
    const top = sel.twelve[0];
    pre[zone.slug][key] = {
      t: top.id,
      g: sel.twelve.map(p => IMG_IDX[p.id] ?? -1),
      gc: sel.twelve.map(p => CATLAB[p.cat] || p.cat),
    };
    if (!DET[top.id]) DET[top.id] = {
      n: top.name, c: CATLAB[top.cat] || top.cat, cat: top.cat, v: top.verdict, d: top.detail,
      tip: top.tip || null, pr: top.price.text, dur: top.duration,
      ll: top.ll, mode: top.mode, bus: top.bus, i: IMG_IDX[top.id] ?? -1,
    };
    const dir = key === 'classic' ? join(dist, 'l', zone.slug) : join(dist, 'l', zone.slug, key);
    mkdirSync(dir, { recursive: true });
    const html = zonePage(zone, key, sel, assets);
    writeFileSync(join(dir, 'index.html'), html);
    const path = '/l/' + zone.slug + (key === 'classic' ? '/' : '/' + key + '/');
    console.log('built ' + path + ' (' + zone.id + ') ' + (html.length / 1024).toFixed(1) + ' KB');
  }
}
let home = landing(pre, DET);
const homeCss = minCss(home.match(/<style>([\s\S]*?)<\/style>/)[1]);
const homeJs = home.match(/<script>\s*(\(function\(\)[\s\S]*?\)\(\);?)\s*<\/script>\s*<\/div><\/section>/)[1];
const homeAssets = { css: 'h.' + hash(homeCss) + '.css', js: 'h.' + hash(homeJs) + '.js' };
writeFileSync(join(dist, 'a', homeAssets.css), homeCss);
writeFileSync(join(dist, 'a', homeAssets.js), homeJs);
home = home
  .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/a/' + homeAssets.css + '">')
  .replace(/<script>\s*\(function\(\)[\s\S]*?\)\(\);?\s*<\/script>\s*<\/div><\/section>/, '<script defer src="/a/' + homeAssets.js + '"></script>\n</div></section>');
writeFileSync(join(dist, 'index.html'), home);
console.log('built landing ' + (home.length / 1024).toFixed(1) + ' KB (+ /a/' + homeAssets.css + ' ' + (homeCss.length / 1024).toFixed(1) + ' KB, /a/' + homeAssets.js + ' ' + (homeJs.length / 1024).toFixed(1) + ' KB)');
console.log('assets /a/' + assets.cssName + ' ' + (css.length / 1024).toFixed(1) + ' KB, /a/' + assets.jsName + ' ' + (appJs.length / 1024).toFixed(1) + ' KB');

/* Privacy policy page, honest and complete enough for Meta ad review. */
function privacyPage() {
  const pixelLine = PIXEL_ID
    ? 'When you accept on the cookie bar, we load Meta\'s advertising pixel. It sets a cookie and sends Meta three things: that you viewed a page, that you tapped an unlock button, and that you completed a purchase of EUR ' + PRICE_EUR + '. It never sends your name, email or card details. Reject on the bar, or clear this site\'s data in your browser, and nothing is sent to Meta. See Meta\'s own data policy at facebook.com/privacy.'
    : 'We do not run any advertising or third party tracking on this site.';
  const sec = (h, body) => '<h2>' + h + '</h2>' + body;
  const body =
    '<header><div class="wrap"><span class="kick">The Summer List</span><h1>Privacy policy</h1>' +
    '<p class="upd">Last updated 2026</p></div></header>' +
    '<main class="wrap">' +
    sec('Who we are', '<p>The Summer List is a product of Capital Control AS, registered in Norway. Questions about your data: <a href="mailto:hello@getsummerlist.com">hello@getsummerlist.com</a>.</p>') +
    sec('What we store on your device', '<p>To make the page work we keep a few things in your browser: your saved picks, the hotel you chose, and your answer to the cookie bar. This stays on your device, is never sold, and does not identify you. It is not shared with anyone.</p>') +
    sec('Advertising cookies', '<p>' + pixelLine + '</p>') +
    sec('Our own analytics', '<p>We record anonymous events, such as a page open or a tap, to improve the list. These carry no name, email or identifier, and are never sold or shared.</p>') +
    sec('Payment', '<p>Checkout is handled by Stripe, which processes your card. We never see or store card details. Because delivery is instant, at checkout you agree to immediate access and waive the 14 day right of withdrawal.</p>') +
    sec('Your choices', '<p>You can reject advertising cookies on the bar at any time, and clearing this site\'s data in your browser removes everything we have stored on your device. To reach us about any of this, email <a href="mailto:hello@getsummerlist.com">hello@getsummerlist.com</a>.</p>') +
    '<p class="back"><a href="/">Back to The Summer List</a></p>' +
    '</main>';
  const style = 'body{margin:0;background:#FBF3E4;color:#1F3A4D;font-family:Georgia,serif;line-height:1.6}' +
    '.wrap{max-width:720px;margin:0 auto;padding:0 22px}' +
    'header{background:linear-gradient(165deg,#FFDF9E 0%,#FFB36B 42%,#FF7E5F 100%);padding:44px 0 34px}' +
    '.kick{font-family:"Courier New",monospace;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#fff;background:rgba(255,255,255,.28);display:inline-block;padding:6px 14px;border-radius:999px}' +
    'h1{font-size:clamp(30px,5vw,44px);font-style:italic;color:#101C2E;margin:14px 0 6px}' +
    '.upd{font-family:"Avenir Next","Segoe UI",system-ui,sans-serif;font-size:13px;color:#7A4B2A;margin:0}' +
    'main{padding:34px 0 60px}' +
    'h2{font-size:19px;font-style:italic;margin:28px 0 6px}' +
    'p{font-family:"Avenir Next","Segoe UI",system-ui,sans-serif;font-size:15px;color:#39566B;margin:0 0 10px}' +
    'a{color:#E5533E}.back{margin-top:34px;font-weight:700}';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Privacy policy · The Summer List</title>' +
    '<style>' + style + '</style></head><body>' + body + '</body></html>';
}
mkdirSync(join(dist, 'privacy'), { recursive: true });
const privHtml = privacyPage();
writeFileSync(join(dist, 'privacy', 'index.html'), privHtml);
console.log('built /privacy/ ' + (privHtml.length / 1024).toFixed(1) + ' KB');
