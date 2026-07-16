# Partner Campaigns & Public Events

Partner campaigns grant time-limited complimentary access through promotional entitlements. They do not create Stripe subscriptions and do not modify `trialEndsAt`.

Campaigns can also attach one or more **canonical public events**. Athletes can then explicitly add those events as personal Coach Watts training goals. That is **not** official race registration.

## Architecture

| Concept                | Model                                           | Ownership                              |
| ---------------------- | ----------------------------------------------- | -------------------------------------- |
| Partner offer          | `PartnerCampaign` + `PartnerCampaignRedemption` | Platform / operator                    |
| Canonical event        | `PublicEvent`                                   | Platform / operator catalog            |
| Campaign ↔ events      | `PartnerCampaignEvent`                          | Join with display order + primary flag |
| Athlete calendar event | `Event`                                         | Per-user (`source=coachwatts_catalog`) |
| Athlete training goal  | `Goal` type `EVENT`                             | Per-user, linked to their own `Event`  |

Never share one organizer-owned `Event` row across athletes.

## Public URLs

- Partner campaign: `https://coachwatts.com/partners/<campaign-slug>`
- Canonical event: `https://coachwatts.com/events/<event-slug>`
- User-owned event detail remains UUID-based and authenticated: `/events/<uuid>`

## Athlete journey

1. Open partner URL
2. Sign up or log in (callback preserved)
3. Redeem partner benefit (no card, no auto-charge)
4. Explicitly confirm “Add to my Coach Watts goals”
5. Optional: open official registration URL separately

Wording rules:

- Never imply the athlete registered for the organizer’s race
- Always show official registration separately when available
- Enrollment always requires explicit confirmation

## Entitlement behavior

Effective tier is the highest currently valid tier from:

1. Active paid Stripe subscription (including grace period)
2. Active signup trial (`trialEndsAt`, SUPPORTER-level for FREE users)
3. Active promotional/partner grant
4. FREE

## Privacy boundaries

- Partners receive aggregate campaign metrics only
- Never expose participants, accounts, goals, workouts, biometrics, recovery, nutrition, or training data
- Never transfer participant lists to or from organizers

## Create a public event (development)

```bash
pnpm cw:cli events create \
  --slug pilis-kupa-2026 \
  --title "XIX. Pilis Kupa – 2. forduló" \
  --organizer-name "Esztergomi Küllőszaggatók Kerékpár Egyesület" \
  --date "2026-09-27" \
  --timezone "Europe/Budapest" \
  --sport CYCLING \
  --sub-type "Hill Climb Time Trial" \
  --city "Esztergom" \
  --country HU \
  --website-url "https://example.com" \
  --registration-url "https://example.com/register" \
  --published \
  --upsert
```

## Create a campaign and attach events

```bash
pnpm cw:cli partners create \
  --slug pilis-kupa-2026 \
  --partner-name "Esztergomi Küllőszaggatók" \
  --campaign-name "Pilis Kupa 60-day preparation pilot" \
  --granted-tier PRO \
  --duration-days 60 \
  --max-redemptions 200 \
  --event-slug pilis-kupa-2026
```

Attach / detach later:

```bash
pnpm cw:cli partners attach-event pilis-kupa-2026 pilis-kupa-2026 --primary
pnpm cw:cli partners detach-event pilis-kupa-2026 other-event-slug
pnpm cw:cli partners show pilis-kupa-2026
```

## Production writes

All production writes require:

- `--prod`
- `--confirm-prod`

Use `--dry-run` to preview without writing.

```bash
pnpm cw:cli events create \
  --prod --confirm-prod --dry-run \
  --slug pilis-kupa-2026 \
  --title "XIX. Pilis Kupa – 2. forduló" \
  --organizer-name "Esztergomi Küllőszaggatók Kerékpár Egyesület" \
  --date "2026-09-27" \
  --timezone "Europe/Budapest" \
  --sport CYCLING \
  --published --upsert

pnpm cw:cli events create \
  --prod --confirm-prod \
  --slug pilis-kupa-2026 \
  --title "XIX. Pilis Kupa – 2. forduló" \
  --organizer-name "Esztergomi Küllőszaggatók Kerékpár Egyesület" \
  --date "2026-09-27" \
  --timezone "Europe/Budapest" \
  --sport CYCLING \
  --city "Esztergom" \
  --country HU \
  --registration-url "https://example.com/register" \
  --published --upsert

pnpm cw:cli partners create \
  --prod --confirm-prod \
  --slug pilis-kupa-2026 \
  --partner-name "Esztergomi Küllőszaggatók" \
  --campaign-name "Pilis Kupa 60-day preparation pilot" \
  --granted-tier PRO \
  --duration-days 60 \
  --max-redemptions 200 \
  --event-slug pilis-kupa-2026
```

Expected URLs:

- `https://coachwatts.com/partners/pilis-kupa-2026`
- `https://coachwatts.com/events/pilis-kupa-2026`

## Rollback

```bash
pnpm cw:cli partners disable <campaign-slug> --prod --confirm-prod
pnpm cw:cli events unpublish <event-slug> --prod --confirm-prod
```

Existing redeemed grants remain valid until `endsAt`. Existing athlete goals remain unless the athlete removes them.

## Analytics (aggregate only)

- `partner_page_view`
- `partner_signup_start`
- `partner_redemption`
- `partner_event_view`
- `partner_event_join_start`
- `partner_event_join_completed`
- `partner_event_join_already_exists`
- `official_event_registration_click`

## API routes

- `GET /api/partners/:slug` — campaign + published attached events + enrollment state
- `POST /api/partners/:slug/redeem` — redeem promotional benefit
- `GET /api/public-events/:slug` — published canonical event
- `POST /api/public-events/:slug/join` — upsert user Event + EVENT Goal
