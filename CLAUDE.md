# The Summer List, Ayia Napa

A one-page, hotel-personalised shortlist of things to do in Ayia Napa, sold at EUR 29 and
delivered as a hosted page the second Stripe redirects. Static site, no backend, no login.

Owner: Vegard. Domain: `getsummerlist.com`. Host: Netlify.

Plan revised **13 September 2026**. The first season deadline, 3 August 2026, passed with zero
sales attempted: the Stripe links were never created and the site was never connected to the
domain. This revision assumes the next selling window is **Ayia Napa, summer 2027**, with the
landing page kept live in between. That assumption is decision 1 in §6 and is not yet made.
Every date in §5 moves if it changes.

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
   string reappears in the data, the build fails, not warns. The validator enforces this.
2. **The repo is private.** `vegardwillassen/sommer-26` is public and would expose buyer pages.
   This is a separate private repo. Never push buyer content to the public one.
3. **Delivery is instant.** No email as the delivery mechanism, no waiting period, no SLA
   language anywhere in the codebase or copy. Email exists only as a backup copy of a link the
   buyer already has.
4. **No dependencies.** `npm run build` is `node scripts/build.mjs` and nothing else. Ask before
   adding a single package.
5. **Page weight budget: 40 KB per zone page.** Raised from 30 KB on 29 July 2026 when the
   buyer pages adopted the sommer-26 card design. Pages sit at 39.5 to 39.6 KB today, so there
   is about 400 bytes of headroom. Netlify gzips the transfer to about 11 KB. Buyers are on
   roaming data. If a change pushes past 40 KB, say so before doing it.
6. **Buyer pages are noindex.** `/l/*` carries `X-Robots-Tag: noindex, nofollow` and
   `Referrer-Policy: no-referrer`. Do not weaken this for SEO reasons.

---

## 3. Stack and layout

```
data/places.json        51 places. tier: verdict (12) | unlock (10) | shortlist (29)
data/zones.json         6 hotel zones: coordinates, hotel list, slug, stripe_link
src/styles.css          one stylesheet, print rules included
src/app.js              unlocks, pick list, print. Vanilla, no framework
src/landing.html        landing page source
scripts/build.mjs       generates dist/
scripts/check.mjs       validator, runs after build on Netlify
netlify/functions/e.mjs minimal event sink, POST /api/e, logs and returns 204
jk/index.html           unrelated: Jan Erik and Katrine's food list at /jk
netlify.toml            build command, /an redirect, noindex headers
```

Build output: `dist/index.html` (landing page), `dist/l/<slug>/index.html` per zone, and
`dist/an/index.html` (redirect to the landing page, the QR target).

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
bus         bus line number as a string, or null. Null is allowed only when mode is 'walk'
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
| D13 | The 2026 season is over. No sales are attempted until the decision in §6.1 is made | Selling remotely into an empty resort in September proves nothing |

## Rejected. Do not propose these again.

- An app store app. Nobody installs an app for one week, review takes days that do not exist.
- Credits or micro-transactions.
- Migrating to Cloudflare Pages. Netlify is fine, the migration is a distraction.
- Selling against Tripadvisor in any copy. The comparison flatters the free option.
- Meta ads at 300 to 500 NOK per destination. Never exits the learning phase, proves nothing.
- Any "delivered within one hour" language.

---

## 5. The plan: seven streams, one milestone each

The streams run in this order: 1, then 2 and 3 in parallel, then 4, 5 and 6 in parallel,
then 7. Dates assume a June 2027 selling window and are placeholders until §6.1 is decided.

### Stream 1. Go-to-market decision. Owner: Vegard. Due: 1 October 2026.

Milestone: §6.1 answered in writing. Which window, which channel, which price. Nothing below
gets a real date until this exists.

### Stream 2. Product data. Owner: Vegard, validator by Claude Code. Due: 15 May 2027.

Milestone: `npm run check` passes on real data and every walking time has been sanity checked
on the ground.

| # | Task | Status 13 Sep 2026 |
|---|---|---|
| H1 | Bus numbers | Verdict tier passes: 9 of 12 have a bus, the 3 without are walk mode. Unlock tier: 2 non-walk places still have no bus. Shortlist: 10 non-walk places without a bus, tolerated |
| H2 | Verify the six zone centroids and hotel lists | Not done. Still the July estimates. 4 to 5 hotels per zone |
| H3 | Make the cut | Done in file: 12 verdict, 10 unlock, 29 shortlist. Confirm it is the real cut, not the first draft that happened to validate |
| H5 | Re-verify prices and opening hours | New. Data was verified 20 July 2026 and will be a year old at the next sale. Two weeks before flying out, walk the 22 and update `meta.verified` |
| H6 | Spa Afternoon at Napa Plaza has no `typical_eur` | Shortlist tier, so the validator lets it through. Fill it or cut the entry |

### Stream 3. Commerce and legal. Owner: Vegard. Due: 15 May 2027.

Milestone: a test purchase in each of the six zones lands on the right page.

| # | Task | Status |
|---|---|---|
| H4 | Six Stripe Payment Links pasted into `stripe_link` | Not done. All six are `REPLACE_` placeholders and the validator fails on them |
| H7 | Stripe Tax on, waiver checkbox text, VAT OSS registration | Not started |
| H8 | 12 month access promise | Keep it. It means the zone files stay deployed through the July after the last sale |

### Stream 4. Homepage and hosting. Owner: Claude Code, decisions by Vegard. Due: 1 June 2027.

Milestone: a cold visitor understands the offer, sees the walk time recompute for their hotel
before paying, and the site deploys from a push.

| # | Task | Status |
|---|---|---|
| C2 | Live sample entry with a hotel dropdown that recomputes the walk time | Not done. Landing has a static sample and a zone picker |
| C12 | Connect the Netlify site to this repo | New. Production is a manual CLI deploy from 29 July, two commits behind `main` |
| C13 | Attach `getsummerlist.com` in Netlify | New. Only the `netlify.app` URL exists today |
| C14 | Netlify Personal plan, auto-recharge on | New. Still on the free tier (D6) |
| C15 | Video slot on the landing page, filled by stream 5 | New |

### Stream 5. Marketing assets. Owner: Vegard, build assets by Claude Code. Due: 1 June 2027.

Milestone: video, QR card and pitch ready in the same week, and each tested on one stranger.

| # | Task | Status |
|---|---|---|
| M1 | Marketing video, 30 to 60 seconds, phone footage from the resort | New. One entry being used: the list on screen, the walk, the place. Doubles as the landing hero and the reel for any partner |
| C4 | Printable QR card from the build: `getsummerlist.com/an`, level H, matte, 3 cm minimum | Not done. The `/an` redirect exists, the QR asset does not |
| M2 | The face-to-face pitch | Written, §1. Rehearse it out loud |
| M3 | Partner channel: which hotel or bar carries the QR card after Vegard leaves | New. Depends on §6.4 |

### Stream 6. Delivery pack. Owner: Claude Code. Due: 1 June 2027.

Milestone: a buyer with no signal still has the list.

| # | Task | Status |
|---|---|---|
| C3 | Pre-rendered PDF per zone written at build time, linked next to the print button | Not done |
| C5 | `meta.verified` on every zone page | Done. Pages show "Verified 20 July 2026" |
| C16 | Backup email with the link, sent from the Stripe receipt | New. Stripe's receipt email can carry the success URL, no code needed |

### Stream 7. Launch rehearsal and the first ten. Owner: Vegard. Due: the selling window.

Milestone: ten paid sales.

1. Dry run: buy every zone yourself, open each page on a phone on roaming data, print one.
2. Send five free copies to people at the hotel and watch whether they open the link.
3. Sell face to face.

Only after ten sales:

| # | Improvement | Why it waits |
|---|---|---|
| C6 | Unique per-buyer slug via a Netlify Function on the Stripe webhook | Sharing is a revenue leak, not a security hole |
| C7 | Pick sync across two phones, port the PIN sync from `sommer-26/food` | Couples are the buyer, but there are no couples yet |
| C8 | Analytics view on top of the `/api/e` sink | The sink exists and logs. Nothing to look at until something converts |

Deferred, unchanged: C9 tap-to-plan, C10 service worker, C11 more than six zones.

### Done

| # | Improvement |
|---|---|
| C1 | `npm run check`: tier counts, bus on non-walk verdict places, `typical_eur` on verdict and unlock, placeholder Stripe links, Tripadvisor strings, 40 KB budget. Runs in the Netlify build command |
| C5 | Verified date on every zone page |

---

## 6. Your call. I am not deciding these for you.

1. **When and where is the next sale?** Options: Ayia Napa summer 2027 face to face, the same
   as planned for 2026; leave the landing page live now and see if anything trickles in; or
   park it. Recommendation: summer 2027 face to face, and keep the page live meanwhile at zero
   cost. The plan above assumes this. It is the one decision that dates everything else.

2. **Price: hold EUR 29, or test EUR 49?**
   Recommendation: hold 29 for the first 10 face-to-face sales. Change one variable. Keep 49
   ready as the second test if 29 converts.

3. **The two free unlocks: keep, or drop?**
   Recommendation: keep. They make the 12 feel like a cut rather than a shortage, and the
   content is already researched.

4. **Post-departure channel.** Kill it when you fly home, leave the QR cards with a hotel or a
   bar on a revenue share, or let the landing page trickle. This decides whether C6 and C8 are
   ever worth building, and it decides M3.

5. **Give 20 lists away first?**
   Recommendation: no, not instead of selling. Send 5 free copies and watch the opens. Zero
   opens tells you more than zero sales does. This is step 2 of stream 7.

---

## 7. Known trade-offs, already accepted

- **Zone slugs, not buyer slugs.** Two buyers at the same hotel share a URL. Fix is C6.
- **Picks are device-local.** The partner sees an empty plan. Fix is C7.
- **PDF is the browser print dialog.** Fix is C3.
- **No analytics.** The `/api/e` sink logs to Netlify function logs only. Fix is C8.
- **Production lags the repo.** The live site is the 29 July CLI deploy. Fix is C12.

---

## 8. Deploy

State on 13 September 2026: Netlify site `getsummerlist` exists on the free plan, deployed once
by CLI on 29 July, not connected to Git, no custom domain, one function live.

1. Netlify: link the site to the private repo. Build command and publish directory come from
   `netlify.toml`. The build runs the validator, so it fails until H4 is done.
2. Netlify: domain settings, add `getsummerlist.com`, point DNS at Netlify.
3. Netlify: upgrade to Personal, switch **auto-recharge on**.
4. Print the QR cards.

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
during the selling window. Zero CAC, so a failure isolates willingness to pay rather than ad
creative.

If that fails, no amount of C1 through C16 saves it. Build accordingly: everything in streams
1 to 7 exists to make those ten conversations possible, and nothing after "the first ten"
should be started until they happen.
