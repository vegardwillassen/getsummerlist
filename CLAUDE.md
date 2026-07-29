# The Summer List, Ayia Napa

A one-page, hotel-personalised shortlist of things to do in Ayia Napa, sold at EUR 29 and
delivered as a hosted page the second Stripe redirects. Static site, no backend, no login.

Owner: Vegard. Domain: `getsummerlist.com`. Host: Netlify. Season deadline: **3 August 2026**,
when the founder flies home and face-to-face selling stops.

---

## 1. What is actually being sold

Not information. Arbitration. The buyer is standing in a resort with Google Maps and free
ChatGPT already on the phone. What those cannot give them is a decision that ends the
argument with their partner, with prices attached and distances measured from their own hotel.

The whole product compresses to one line per entry:

> Blue Lagoon boat trip. EUR 25 pp. Bus 101 from the strip, or 14 min walk from Nissi hotels.

Pitch line, use it verbatim in copy: **"The 12 things worth doing, what each costs, how you get
there from your hotel."** Framing for the research labour: **"300 checked, 12 won."**

The only competitive column this product owns is bundled, verified, priced, hotel-relative
local logistics. Every feature request gets measured against that column. If it does not
strengthen it, it waits.

---

## 2. Non-negotiables

1. **No Tripadvisor.** No ratings, no scores, no "Sun Score", no mention. Licensing exposure,
   and naming the free alternative inside a paid product is a trust leak. If a Tripadvisor
   string reappears in the data, the build should fail, not warn.
2. **The repo is private.** `vegardwillassen/sommer-26` is public and would expose buyer pages.
   This is a separate private repo. Never push buyer content to the public one.
3. **Delivery is instant.** No email as the delivery mechanism, no waiting period, no SLA
   language anywhere in the codebase or copy. Email exists only as a backup copy of a link the
   buyer already has.
4. **No dependencies.** `npm run build` is `node scripts/build.mjs` and nothing else. Ask before
   adding a single package.
5. **Page weight budget: 30 KB per zone page.** Current is 23 KB. Buyers are on roaming data.
   If a change pushes past 30 KB, say so before doing it.
6. **Buyer pages are noindex.** `/l/*` carries `X-Robots-Tag: noindex, nofollow` and
   `Referrer-Policy: no-referrer`. Do not weaken this for SEO reasons.

---

## 3. Stack and layout

```
data/places.json    56 places. tier: verdict | unlock | shortlist
data/zones.json     6 hotel zones: coordinates, hotel list, slug, stripe_link
src/styles.css      one stylesheet, print rules included
src/app.js          unlocks, pick list, print. Vanilla, no framework
scripts/build.mjs   generates dist/
netlify.toml        build command, /an redirect, noindex headers
```

Build output: `dist/index.html` (landing page) and `dist/l/<slug>/index.html` per zone.

Walk times are computed at build time by haversine from the zone centroid to each place, at
**80 metres per minute**. They are never written by hand. A wrong centroid is wrong on 22
entries at once.

Zone slugs are 12 random characters, unguessable but not unique per buyer. Two buyers at the
same hotel share a URL. Accepted for now, see §7.

Picks are stored in `localStorage`, keyed per zone. The partner on the other phone sees an
empty plan. Accepted for now, see §7.

### Data contract, `places.json`

```
id, name, cat
tier        'verdict' (the 12) | 'unlock' (the 10 behind free unlocks) | 'shortlist' (rest)
verdict     one-line judgement, the thing they paid for
detail      supporting paragraph
tip         optional
price       { text, band, typical_eur }
duration
bus         bus line number as a string, or null   <-- null on all 56 right now
book_ahead  boolean
ll          [lat, lng]
mode        'walk' | 'bus' | 'taxi' | 'boat'
maps, web
```

### Data contract, `zones.json`

```
meta.destination, meta.verified (ISO date), meta.walk_metres_per_minute
zones[]: id, name, ll [lat,lng], hotels[], slug, stripe_link
```

---

## 4. Decisions already locked. Do not reopen.

| # | Decision | Why |
|---|---|---|
| D1 | 12 places, not 50, plus 10 behind two free unlocks of 5 | The decision is the product; browsing is the competition |
| D2 | Price EUR 29 | At EUR 15, VAT plus Stripe plus labour leaves nothing |
| D3 | Delivery is a hosted URL, not an emailed HTML attachment | The wait is where conversion died |
| D4 | Personalise per hotel zone, not per buyer | Turns 30 manual builds into 30 redirects to files that already exist |
| D5 | Six zones, pre-built before any sale | Ayia Napa hotels collapse to a finite set of walking-distance clusters |
| D6 | Netlify, Personal plan, auto-recharge on | 15 credits per production deploy; the free 300 will not survive launch week |
| D7 | Offline via browser print-to-PDF button | Two taps on iOS, works everywhere, zero code |
| D8 | Stripe Payment Links, one per zone, success URL to that zone's page | Instant delivery with no backend |
| D9 | 14-day withdrawal waiver checkbox at checkout | Required for instant digital delivery in the EU |
| D10 | Stripe Tax on, VAT OSS registration before scaling | B2C digital sales from a Norwegian AS |
| D11 | Entry copy format: what it is, price in EUR, how you get there from your hotel | The uncontested column, in every entry |
| D12 | Freeze Rhodes and Albufeira | Nothing has converted yet |

## Rejected. Do not propose these again.

- An app store app. Nobody installs an app for one week, review takes days that do not exist.
- Credits or micro-transactions.
- Migrating to Cloudflare Pages. Netlify is fine, the migration is a distraction.
- Selling against Tripadvisor in any copy. The comparison flatters the free option.
- Meta ads at 300 to 500 NOK per destination. Never exits the learning phase, proves nothing.
- Any "delivered within one hour" language.

---

## 5. The work queue, in order

### Blocked on the human. Claude Code cannot do these.

| # | Task | Notes |
|---|---|---|
| H1 | **Bus numbers.** All 56 places have `bus: null` | Without these, the third slot degrades to a walk time, the weakest version of the only claim that matters |
| H2 | **Verify the six zone centroids** in `zones.json` and their hotel lists | Estimates today. Every walking time on every page depends on them |
| H3 | **Make the cut.** Set the real 12 `verdict`, the real 10 `unlock`, rest `shortlist` | `tier` is currently just the first 12 in file order. This is the product |
| H4 | **Create six Stripe Payment Links**, paste into `stripe_link` | Each success URL points at `https://getsummerlist.com/l/<slug>/` |

Claude Code's job on these four: make them impossible to get wrong. Build the validator in C1
so the build refuses to ship a page where a `verdict` place has no bus number, no price, or a
placeholder Stripe link.

### Claude Code, ranked. Ship top to bottom.

| # | Improvement | Status | Why this rank |
|---|---|---|---|
| C1 | `npm run check`: fails the build on `bus: null` in verdict tier, missing `typical_eur`, `REPLACE_` still in any `stripe_link`, wrong tier counts, any Tripadvisor string, any page over 30 KB | **DO FIRST** | Turns four human tasks into four red errors instead of four things to remember |
| C2 | Landing page: one full sample entry with a live hotel dropdown that recomputes the walk time in front of the visitor, before payment | **DO** | The only moment Google Maps cannot replicate in front of a buyer. Demo replaces trust |
| C3 | Pre-rendered PDF per zone written at build time, linked next to the print button | **DO** | Print dialog works, a real file is better on a phone with no signal |
| C4 | Printable QR card asset generated from the build: `getsummerlist.com/an`, level H, matte, 3 cm minimum | **DO** | Needed physically in hand before 3 August |
| C5 | Surface `meta.verified` date on every zone page | **DO** | Verification is the thing being paid for; hiding the date wastes it |
| C6 | Unique per-buyer slug: Netlify Function on the Stripe webhook issues a signed slug | **AFTER FIRST 10 SALES** | Zone slugs are unguessable; sharing is a revenue leak, not a security hole |
| C7 | Pick sync across two phones. Port the PIN sync from `sommer-26/food` | **AFTER FIRST 10 SALES** | Couples are the buyer. Worth real money, but only once there are couples |
| C8 | Events endpoint plus a minimal analytics view | **AFTER FIRST 10 SALES** | Nothing to measure until something converts |
| C9 | "Want to" tap-to-plan: buyer taps intent, the list reorders into a day plan | **DEFERRED** | Strongest feature idea in the project. Also the one most likely to eat the five days that remain |
| C10 | Service worker for true offline | **DEFERRED** | PDF covers 90 percent of the need at 1 percent of the cost |
| C11 | More than six zones | **DEFERRED** | Only if H2 shows real walking times diverging inside a zone |

---

## 6. Your call. I am not deciding these for you.

Each one has a recommendation. Override freely, but tell Claude Code which way you went so the
build reflects it.

1. **Price: hold EUR 29, or test EUR 49?**
   Recommendation: hold 29 for the first 10 face-to-face sales. You are testing whether anyone
   pays at all. Change one variable. Keep 49 ready as the second test if 29 converts.

2. **The two free unlocks: keep, or drop?**
   Recommendation: keep. They make the 12 feel like a cut rather than a shortage, and they cost
   nothing because the content is already researched.

3. **"Access guaranteed 12 months" on the landing page: keep the promise?**
   Recommendation: keep it, but it is a real obligation. It means the zone files stay deployed
   through July 2027 and the Netlify site does not get torn down when the season ends. Decide
   now, because the copy is already written.

4. **Post-3-August channel: what happens when you fly home?**
   Nobody has answered this. Options: kill it until next season, leave the QR cards with a
   hotel or a bar on a revenue share, or keep the landing page live and let it trickle. The
   codebase does not care. The decision changes whether C6 and C8 are worth building at all.

5. **Give 20 lists away first?**
   Recommendation: no, not instead of selling. But send 5 free copies to people at the hotel and
   watch whether they open the link. Zero opens tells you more than zero sales does.

---

## 7. Known trade-offs, already accepted

- **Zone slugs, not buyer slugs.** Two buyers at the same hotel share a URL. Fix is C6.
- **Picks are device-local.** The partner sees an empty plan. Fix is C7.
- **PDF is the browser print dialog.** Fix is C3.
- **No analytics.** Netlify server logs only. Fix is C8.

---

## 8. Deploy

1. Push to the **private** GitHub repo.
2. Netlify: add new site, import from Git, pick the private repo. Build command and publish
   directory come from `netlify.toml`.
3. Netlify: domain settings, add `getsummerlist.com`, point DNS at Netlify.
4. Netlify: upgrade to Personal, switch **auto-recharge on**.
5. Print the QR cards.

Stripe, per zone, six times:

- Product: The Summer List, Ayia Napa. Price EUR 29.
- After payment: redirect to `https://getsummerlist.com/l/<slug>/`
- Custom text at checkout, required checkbox: *I want access immediately and I understand I
  lose my 14 day right to cancel once I have it.*
- Stripe Tax on.

---

## 9. Copy rules for anything Claude Code writes

No em dashes or en dashes anywhere, in any string, ever. Use a comma, a colon, or a period.

No hedging, no trailing benefit clauses ("which lets you...", "ensuring..."). Lead with the
load-bearing point. Real verbs, not "make a decision" style nouns. Give the real number, not
"a range of". If a sentence would sound strange said out loud to a colleague, cut it.

Every place entry answers three things and stops: what it is, what it costs in euros, how you
get there from this hotel.

---

## 10. How to know any of this worked

Ten couples, standing in Ayia Napa with Google Maps already installed, paying EUR 29 in person
before 3 August. Zero CAC, so a failure isolates willingness to pay rather than ad creative.

If that fails, no amount of C1 through C11 saves it. Build accordingly: everything above the
"after first 10 sales" line exists to make those ten conversations possible, and nothing below
it should be started until they happen.
