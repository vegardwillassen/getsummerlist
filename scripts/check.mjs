import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(root, 'data/places.json'), 'utf8'));
const zonesFile = JSON.parse(readFileSync(join(root, 'data/zones.json'), 'utf8'));
const errors = [];

const verdicts = places.filter(p => p.tier === 'verdict');
const unlocks = places.filter(p => p.tier === 'unlock');
if (verdicts.length !== 12) errors.push('tier counts: expected 12 verdict places, found ' + verdicts.length);
if (unlocks.length !== 10) errors.push('tier counts: expected 10 unlock places, found ' + unlocks.length);

for (const p of verdicts) {
  if (p.bus == null && p.mode !== 'walk') errors.push('bus: "' + p.id + '" is verdict tier with mode "' + p.mode + '" and no bus number (H1)');
  if (p.price.typical_eur == null) errors.push('price: "' + p.id + '" is verdict tier with no typical_eur');
  if (!p.verdict) errors.push('verdict: "' + p.id + '" has no verdict line');
  if (!p.ll) errors.push('coords: "' + p.id + '" has no ll, walk times impossible');
}
for (const p of unlocks) {
  if (p.price.typical_eur == null) errors.push('price: "' + p.id + '" is unlock tier with no typical_eur');
}

for (const z of zonesFile.zones) {
  if (/REPLACE_/.test(z.stripe_link)) errors.push('stripe: zone "' + z.id + '" still has a placeholder stripe_link (H4)');
  if (!/^[a-z0-9]{12}$/.test(z.slug)) errors.push('slug: zone "' + z.id + '" slug is not 12 chars of [a-z0-9]');
  if (!Array.isArray(z.ll) || z.ll.length !== 2) errors.push('coords: zone "' + z.id + '" has no centroid');
}

const sources = [
  ['data/places.json', JSON.stringify(places)],
  ['data/zones.json', JSON.stringify(zonesFile)],
];
const distDir = join(root, 'dist');
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.html')) sources.push([full.slice(root.length + 1), readFileSync(full, 'utf8')]);
  }
}
if (existsSync(distDir)) walk(distDir);

for (const [name, text] of sources) {
  if (/tripadvisor/i.test(text)) errors.push('tripadvisor: the string appears in ' + name + ' (non-negotiable 1)');
  if (/[–—]/.test(text)) errors.push('dashes: em or en dash found in ' + name + ' (copy rule 9)');
}

if (existsSync(distDir)) {
  const pages = sources.filter(([n]) => n.startsWith('dist'));
  for (const [name, text] of pages) {
    const kb = Buffer.byteLength(text) / 1024;
    if (kb > 30) errors.push('weight: ' + name + ' is ' + kb.toFixed(1) + ' KB, budget is 30 KB (non-negotiable 5)');
  }
} else {
  console.log('note: dist/ not built yet, page checks skipped. Run npm run build first for full coverage.');
}

if (errors.length) {
  console.error('CHECK FAILED, ' + errors.length + ' error(s):');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('check passed: 12 verdict, 10 unlock, no placeholders, no banned strings, all pages under 30 KB.');
