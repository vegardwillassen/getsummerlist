# The Summer List, Ayia Napa

A one-page, hotel-personalised shortlist of things to do in Ayia Napa, sold at EUR 29 and
delivered as a hosted page the second Stripe redirects. Static site, no backend, no login.

Owner: Vegard. Domain: `getsummerlist.com`. Host: Netlify.

Plan v3, revised **13 September 2026** after Vegard's review. Launch target: **Ayia Napa, late
summer 2026**, launch-ready by 27 September, selling on the days Vegard is there (board task
S1.1). The live task board with checkboxes is the artifact "Summer List Launch Board"; §5 here
is the same plan in text. Claude does everything it can, including work inside Netlify and
Stripe through a logged-in browser session Vegard opens.

---

## 1. What is actually being sold

Not information. Arbitration. The buyer is standing in a resort with Google Maps and free
ChatGPT already on the phone. What those cannot give them is a decision that ends the
argument with their partner, with prices attached and distances measured from their own hotel.

The whole product compresses to one line per entry:

> Blue Lagoon boat trip. EUR 25 pp. Bus 101 from the strip, or 14 min walk from Nissi hotels.

Pitch line, use it verbatim in copy: **"The 12 things worth doing, what each costs, how you get
there from your hotel."** Second line, Vegard's: **"Decided in a minute, with whoever you travel
with."** Framing for the research labour: **"300 checked, 12 won."**

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
3. **getsummerlist.com is its own site.** Separate from sommer-26 in code, hosting and content.
   The `/jk` page is a guest and must never leak into the product.
4. **Delivery is instant.** No email as the delivery mechanism, no waiting period, no SLA
   language anywhere in the codebase or copy. Email exists only as a backup copy of a link the
   buyer already has.
5. **No dependencies.** `npm run build` is `node scripts/build.mjs` and nothing else. Ask before
   adding a single package.
6. **Page weight budget: 80 KB per zone page.** Raised from 40 KB on 13 September 2026 to make
   room for the 39 free unlocks and the save-link block. Pages sit at 39.5 KB today. Netlify
   gzips the transfer. If a change pushes past 80 KB, say so before doing it.
7. **Buyer pages are noindex.** `/l/*` carries `X-Robots-Tag: noindex, nofollow` and
   `Referrer-Policy: no-referrer`. Do not weaken this for SEO reasons.

---

## 3. Stack and layout

```
data/places.json        51 places. tier: verdict (12) | unlock (39, after S2.1; today 10 unlock + 29 shortlist)
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
tier        'verdict' (the 12) | 'unlock' (everything else, free to reveal)
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
| D1 | 12 verdict places. The remaining 39 are free to unlock, mechanics per S1.3 | The decision is the product; the rest is a reward, not a catalogue |
| D2 | Price EUR 29. EUR 49 is the second test, after the first ten sales | At EUR 15, VAT plus Stripe plus labour leaves nothing |
| D3 | Delivery is a hosted URL, not an emailed HTML attachment | The wait is where conversion died |
| D4 | Personalise per hotel zone, not per buyer | Turns 30 manual builds into 30 redirects to files that already exist |
| D5 | Six zones, pre-built before any sale | Ayia Napa hotels collapse to a finite set of walking-distance clusters |
| D6 | Netlify. Plan and auto-recharge reassessed in S1.6 before launch | The free tier may hold for ten sales; the dashboard decides |
| D7 | Offline via browser print-to-PDF button, plus a pre-rendered PDF per zone (S6.1) | Two taps on iOS, works everywhere |
| D8 | Stripe Payment Links, one per zone, success URL to that zone's page | Instant delivery with no backend |
| D9 | 14-day withdrawal waiver checkbox at checkout | Required for instant digital delivery in the EU |
| D10 | Stripe Tax on, VAT OSS registration before the first sale | B2C digital sales from a Norwegian AS |
| D11 | Entry copy format: what it is, price in EUR, how you get there from your hotel | The uncontested column, in every entry |
| D12 | Freeze Rhodes and Albufeira | Nothing has converted yet |
| D13 | Launch window is late summer 2026 in Ayia Napa, face to face | Decided 13 September 2026 |
| D14 | 12 month access promise stays. Zone files stay deployed through September 2027 | Copy already promises it |
| D15 | No post-departure channel. When Vegard flies home the QR cards come with him | Decided 13 September 2026 |

## Rejected. Do not propose these again.

- An app store app. Nobody installs an app for one week, review takes days that do not exist.
- Credits or micro-transactions.
- Migrating to Cloudflare Pages. Netlify is fine, the migration is a distraction.
- Selling against Tripadvisor in any copy. The comparison flatters the free option.
- Meta ads at 300 to 500 NOK per destination. Never exits the learning phase, proves nothing.
- Any "delivered within one hour" language.
- A partner bar or hotel carrying the cards on revenue share. Dropped 13 September 2026.

---

## 5. The plan v3: seven streams, task IDs on the launch board

Launch-ready by 27 September 2026. Sell in Ayia Napa on the dates Vegard is there (S1.1). The live board with checkboxes and the prompts to paste is the artifact "Summer List Launch Board". Owner codes: Claude does it, Question (Vegard answers on the board), Vegard does it. A Claude task marked browser needs a logged-in browser session and has its prompt on the board.

### S1. Decisions. Due 16 Sep.

Milestone: Every open question on this board answered. Nothing below gets a firm date before that.

| ID | Owner | Task | Status |
|---|---|---|---|
| S1.1 | Question to Vegard | Launch window: which dates are you in Ayia Napa? Late summer 2026 is the target. The selling days are the days you are physically there. | Open |
| S1.2 | Vegard | Price stays EUR 29. EUR 49 is the second test, later. | Done |
| S1.3 | Question to Vegard | Unlock model for the 39 places behind the 12. You decided the rest of the list is free to unlock. The mechanics are open. | Open |
| S1.4 | Vegard | Post-departure channel dropped. No partner bar, no hotel revenue share. | Done |
| S1.5 | Claude | Page weight budget raised to 80 KB in CLAUDE.md and the validator. | Done |
| S1.6 | Claude, browser | Reassess the Netlify plan (D6): credits, recharge, domain, Git link. The API still reports the free tier and only the netlify.app address. I read the dashboard and report back. | Open |
| S1.7 | Question to Vegard | Stripe: will you log me in the same way as Netlify? | Open |

### S2. Product data. Due 20 Sep.

Milestone: npm run check passes on real data: 12 verdict, 39 unlock, a bus number on every non-walk place a buyer can open.

| ID | Owner | Task | Status |
|---|---|---|---|
| S2.1 | Claude | Retier the data: 12 verdict, 39 unlock, no shortlist. Validator follows. Depends on S1.3 for the reveal mechanics. Tier counts, unlock batches and the bus rule in check.mjs all change. | Open |
| S2.2 | Claude | Propose bus numbers for the 12 non-walk places that have none. From the OSEL Famagusta route maps: lines 101 and 102 cover the strip, Nissi and Cape Greco. I produce a list of 12 with the line and the stop. | Open |
| S2.3 | Vegard | Confirm the 12 bus numbers from S2.2. Five minutes with the list. Tick, or correct the ones you know are wrong. | Open |
| S2.4 | Claude | Recompute the six zone centroids from the hotel addresses. Geocode the 25 hotels, set each centroid to the mean of its hotels, rebuild, show the walk times that moved by more than 3 minutes. | Open |
| S2.5 | Question to Vegard | Confirm the hotel lists per zone | Open |
| S2.6 | Question to Vegard | Confirm the 12 verdict places | Open |
| S2.7 | Claude | Fill typical_eur for Spa Afternoon at Napa Plaza, or cut the entry | Open |
| S2.8 | Vegard | Re-verify prices and opening hours on your first day there, then tell me. Data was verified 20 July. I update meta.verified and the pages the same day you report. | Open |

### S3. Commerce and legal. Due 24 Sep.

Milestone: A test purchase in each of the six zones lands on the right page.

| ID | Owner | Task | Status |
|---|---|---|---|
| S3.1 | Claude, browser | Create the six Stripe Payment Links. Depends on S1.7. One product, six links, each with its own success URL. | Open |
| S3.2 | Claude | Paste the six links into zones.json, build, validator green | Open |
| S3.3 | Claude, browser | Stripe Tax on, receipt email carries the zone link | Open |
| S3.4 | Vegard | VAT OSS registration for the AS. Skatteetaten, needs BankID. Required before the first sale to an EU consumer. I write the checklist if you want it. | Open |
| S3.5 | Claude, browser | Test-mode checkout for every zone | Open |
| S3.6 | Vegard | One live EUR 29 purchase with your own card, then refund it. The only proof that Stripe, Tax, the redirect and the receipt work together in live mode. | Open |

### S4. Homepage and hosting. Due 24 Sep.

Milestone: A cold visitor sees the walk time recompute for their hotel before paying, and a push deploys the site.

| ID | Owner | Task | Status |
|---|---|---|---|
| S4.1 | Claude, browser | Link the Netlify project to this repo, production branch main | Open |
| S4.2 | Claude, browser | Verify the domain: getsummerlist.com primary, www redirects, HTTPS on | Open |
| S4.3 | Claude | Open the pull request from the plan branch to main | Open |
| S4.4 | Question to Vegard | May I merge to main myself from now on? | Open |
| S4.5 | Claude | Live sample entry on the landing page with a hotel dropdown that recomputes the walk time. The one moment Google Maps cannot replicate in front of a buyer. Was C2. | Open |
| S4.6 | Claude | Landing copy pass: decided together in a minute, 12 plus 39 free, verified date. Your line: the things worth doing, which you and whoever you travel with can decide on in a minute. | Open |
| S4.7 | Claude | Video slot on the landing page, filled when S5.3 lands | Open |
| S4.8 | Claude, browser | Switch auto-recharge on, if S1.6 says so | Open |

### S5. Marketing assets. Due 27 Sep.

Milestone: Video, QR card and pitch ready in the same week, each tried on one stranger.

| ID | Owner | Task | Status |
|---|---|---|---|
| S5.1 | Claude | Script and shot list for the 30 to 60 second video. One entry being used: the list on the phone, the walk, the place, the price on screen. Vertical for the phone, landscape for the landing page. | Open |
| S5.2 | Vegard | Film the clips on your phone in Ayia Napa, upload to the Drive folder. Eight clips of 5 to 10 seconds each from the shot list. Same afternoon as S2.8. | Open |
| S5.3 | Claude | Cut the video: captions, price overlay, two exports. ffmpeg in the session, no editor needed. One vertical file, one landscape file. | Open |
| S5.4 | Claude | QR card asset from the build: getsummerlist.com/an, level H, 3 cm minimum. QR encoder written into the repo, no package. Output a print-ready PDF and SVG. Was C4. | Open |
| S5.5 | Vegard | Print the QR cards. Matte stock, 50 cards, I give you the file and the print spec. | Open |
| S5.6 | Vegard | Say the pitch out loud to one stranger before the first sale | Open |

### S6. Delivery pack. Due 27 Sep.

Milestone: A buyer with no signal still has the list.

| ID | Owner | Task | Status |
|---|---|---|---|
| S6.1 | Claude | Pre-rendered PDF per zone, linked next to the print button. Rendered with the session browser and committed. Was C3. | Open |
| S6.2 | Claude | Verified date shown on every zone page | Done |
| S6.3 | Claude | Save-this-link block on every zone page: copy button and mail-to-self. Email stays a backup of a link the buyer already has. Non-negotiable 3. | Open |

### S7. Launch and the first ten. Due the window.

Milestone: Ten paid sales in Ayia Napa.

| ID | Owner | Task | Status |
|---|---|---|---|
| S7.1 | Vegard | Dry run: open every zone on your phone on roaming data, print one | Open |
| S7.2 | Vegard | Five free copies to people at the hotel, watch whether they open the link. Zero opens tells you more than zero sales. I read the opens off the Netlify function log. | Open |
| S7.3 | Vegard | Sell. Ten sales at EUR 29. | Open |
| S7.4 | Claude | After the tenth sale: per-buyer slugs, pick sync, analytics view. Parked until then. Was C6, C7, C8. | Open |

Deferred, unchanged: tap-to-plan, service worker, more than six zones.

---

## 6. Open questions

All of them live on the launch board as Question tasks with a text field and, where a yes is
enough, a Yes button: S1.1 launch dates, S1.3 unlock mechanics, S1.7 Stripe access, S2.5 hotel
lists, S2.6 the 12, S4.4 merge rights. Answer there and Claude reads it back.

Closed on 13 September 2026: price (29), unlocks (keep, all 39 free), 12 month access (keep),
post-departure channel (dropped), window (late summer 2026).

---

## 7. Known trade-offs, already accepted

- **Zone slugs, not buyer slugs.** Two buyers at the same hotel share a URL. Fix is S7.4.
- **Picks are device-local.** The partner sees an empty plan. Fix is S7.4.
- **No analytics.** The `/api/e` sink logs to Netlify function logs only. Fix is S7.4.
- **Production lags the repo** until S4.1 links Netlify to Git.

---

## 8. Deploy

State on 13 September 2026: Netlify site `getsummerlist` on team `vegard-willassen`, deployed
once by CLI on 29 July, not linked to Git. The API reports the free tier and only the
`netlify.app` address; Vegard reports the custom domain is attached. S1.6 and S4.2 settle it
from the dashboard.

1. Netlify: link the site to the private repo, production branch `main` (S4.1). The build runs
   the validator, so it fails until S3.2 is done.
2. Netlify: confirm `getsummerlist.com` primary, www redirect, HTTPS (S4.2).
3. Netlify: plan and auto-recharge per S1.6 and S4.8.
4. Print the QR cards (S5.5).

Stripe, per zone, six times (S3.1):

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

If that fails, nothing on the board saves it. Build accordingly: streams 1 to 7 exist to make
those ten conversations possible, and S7.4 does not start until they happen.
