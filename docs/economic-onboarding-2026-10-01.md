# Economic onboarding verification - 2026-10-01

## Scope

- Shared changes in app.html and the October economic-flow prototype.
- Compensation and an explicitly confirmed internal hourly cost are visible during onboarding.
- Hours-only creation remains available; no invented hourly cost is persisted.
- Existing owners missing their own hourly cost get a nonblocking dashboard action.
- Uncosted recorded hours produce an incomplete margin, not a positive result.
- Hourly-cost changes apply prospectively through the existing RPC. Historical entries are not repriced.
- New manual entries for today's date use the current timestamp so cost history is evaluated correctly. Historical dates and edits retain their previous behavior.
- Founder offer extended to 31 December 2026 at EUR 19.90/month. Registration alone never activates paid billing. Stripe settings and subscription statuses were not changed.

## Verification

Run a local static server on port 8765 and execute docs/qa-economic-onboarding.js with Playwright available to Node.

70 checks passed across the live app and prototype, desktop (1440x1000) and mobile (390x844): explicit-cost validation, hours-only fallback, correctly valued entries, incomplete margins, preserved historical costs, preserved activity status controls, existing-owner reminder, staff isolation, modal overflow, and runtime errors. Screenshots were inspected in tmp/economic-onboarding-qa. Test fixtures block all Supabase network traffic and deny analytics consent.

The guide is prevented from attaching a delayed tooltip over an open modal. It resumes after the modal closes.

## Database

Applied migration verified_economic_activation_events from docs/sql/economic-activation-2026-10-01.sql. It only extends existing private onboarding telemetry and adds a scoped RPC; no account, project, time entry, payment or subscription record was changed.

Verified with rollback-only transactions: qualifying claims, duplicate rejection, invalid event rejection, anonymous rejection, staff rejection, first economic value, same-day return rejection, and later-day return deduplication. Anonymous EXECUTE is denied; authenticated EXECUTE is deliberately allowed. The SECURITY DEFINER function uses an empty search_path and limits all claims to the authenticated owner's studio.

Supabase advisor reports the additional RPC in its general authenticated SECURITY DEFINER warning. This is intentional for writing to the RLS-protected event table. Existing warnings concerning other RPCs and leaked-password protection remain outside this change.

## Measurement semantics

- economic_setup_completed: real project with positive compensation and positive owner hourly cost.
- first_economic_value_seen: a real project with positive compensation and at least 0.25 recorded hours, all with positive recorded costs. The threshold qualifies the metric, not the ability to record shorter entries.
- return_after_activation: authenticated initialization on a later Europe/Rome calendar day, once per studio per day; not evidence that work was recorded on that day.
- Existing events are retained. No historical activation is fabricated or backfilled.
- Browser analytics remain subject to existing consent handling; server product telemetry contains no client/project text.

The prototype retains its existing local payment-plan behavior and future plans. This change does not launch its billing features in the current app.
