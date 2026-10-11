# Auto-Offer and Auto-Message

Open **Automations** beside **Edit** in the monitor header. A compact modal
contains separate **Auto-Offer**, **Auto-Message**, and **Activity** tabs. Its
height stays fixed when switching tabs; short viewports cap the height and
long content scrolls inside the modal. Each module has a fixed save footer;
offer and message previews, placeholder buttons, and recent activity summaries
use the content area. The
header button shows whether automations are off, active, or paused. Settings and
activity stay out of the results list. Both modules start disabled. Enable them by linking an active Vinted account
for the monitor's exact region, configuring the action, and choosing **Save &
enable**. Turning an enabled switch off saves immediately.

Auto-Offer accepts a 1–50% discount and a maximum listing price in the monitor's
currency. Prices use integer minor units and round the offer to the nearest
minor unit. Shipping and buyer fees are excluded. Auto-Message accepts the
placeholders `{title}`, `{price}`, `{currency}`, `{seller}`, `{url}` and
`{monitor}` and shows an example preview. Placeholder buttons insert at the
cursor or replace the selected template text. Expansion is a single pass; content
inside item titles cannot add template variables.

Admin feature policies `auto_offers` and `auto_messages` independently control
access. They depend on `offers` and `chats` respectively, which depend on
`vinted_account`. An administrator can stop automatic actions while leaving the
manual actions available. User modules still default off.

The Vinted service polls every two seconds for persisted new monitor matches
with a detection record. The existing worker filters must have passed before an
item is saved. Initial scan baselines, matches from before saving the settings,
items older than two minutes, banned sellers, your own items, inactive monitors,
and account or region mismatches do not send. Telegram and Discord settings do
not affect automatic account actions. Editing and saving an enabled module arms
it only for matches found after that save.

Each member/account/region has a shared 5-second minimum action interval and a
500-attempt safety cap per module per UTC day, across all monitors. Matches that expire
while waiting for these limits are dropped. Unverified outcomes pause both
modules on the account for 15 minutes. A durable unique claim prevents another
automatic attempt for the same item and module, including across overlapping
monitors, service replicas, restarts, monitor deletion, and relinking. Interrupted
claims become `uncertain` after five minutes. Check Vinted for an uncertain
result; it is never automatically retried. Recent attempt status appears in the
modal’s **Activity** tab and updates on page reload. Only sanitized reason codes are stored.

Unlinking or changing the linked identity/region disarms all member modules via
a database trigger. Linking again requires explicitly enabling them again.
Automatic mutations use the existing client methods without their refresh/retry
wrappers. Credentials refresh through the existing session lock before sending.
Account, settings revision, seller bans, monitor state, and feature access are
checked again after warmup.

## Deployment

Apply `20261011120000_add_account_automations` with `npx prisma migrate deploy` in
`apps/control-center`, regenerate Prisma, and rebuild the dashboard and Vinted
service. The migration adds settings and attempt tables, feature policies, and
the session disarming trigger. No new production environment variables are
required. Source changes do not enable modules or send any live account actions.

## Verification

- `cd apps/control-center && npm run lint && npm run build`
- `cd apps/control-center && npm run test:unit`
- `cd apps/vinted-service && go test ./...`
- Set `AUTOMATION_TEST_DATABASE_URL` to an isolated PostgreSQL test database to
  run the Go integration tests. They create and remove temporary schemas and
  exercise the real migration, duplicate claims, cooldown, daily limits, stale
  settings, account mismatches, seller bans, and interrupted outcomes.
- Run `tests/e2e/account-automations.spec.ts` with `E2E_TEST_MODE=true`, a dedicated
  `E2E_TEST_USER_ID`, and `DATABASE_URL` pointing to a migrated isolated database.
  Set `VINTED_SERVICE_URL=http://127.0.0.1:1` so the dashboard cannot reach a live
  account service. The test only changes synthetic records and exercises both
  desktop and mobile forms.
