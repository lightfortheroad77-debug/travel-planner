# Travel Dashboard

A mobile-first, single-owner travel planner built with React/Vite and Supabase. No mock-data fallback: signing in, saving and switching sections all use your own persistent Supabase database. This is an initial implementation for end-to-end testing, not an independently audited production application.

## What's included

- **Overview:** Days generated from trip dates, grouped by *overnight base city* inferred from accommodation, optional manual overrides, custom card colours, Focus dropdown, automatic Today marker in the trip's time zone, first 3 events previewed (important flags stay visible), Show all/less, maps icons, **clickable day title only**, palette / combined title-and-time quick edit / Quick Add controls. Quick time editing uses an **atomic database RPC**, and updates only the intended day/activity records.
- **Day view:** Scrollable day strip, Prev/Next, two-line notes previews, same-time events allowed, optional TBD time, Quick Add, inline detailed editor, transport origin/destination, optional exact Maps links, independent reservation and Action needed flags, floating activity menu (Edit, Move, Duplicate, Send to Ideas, Delete).
- **Ideas:** Trip-specific inbox with city filtering, details and Plan Day. Scheduling moves the existing activity record rather than copying it.
- **Trip Info:** Trip creation/settings, travellers, accommodation, overnight-city override, destination time zone, **base currency and fixed exchange rates**.
- **To-dos:** Editable manual tasks with due dates, notes, assignee and optional links to days or activities. Reservation status automatically creates a linked To-do for itinerary activities and accommodation; checking it updates the source to **Reserved**, changing the source to **To reserve** reopens it. Hide is independent. **Action needed is not task-synchronised**.
- **Packing:** Categories, personal/shared items, optional shared responsibility assigned to a traveller, one consolidated person's page, multiple bags with a By Bag view, one checkbox per item, quantity (no partial counts). Bag labels are hidden in regular expanded lists.
- **Souvenirs:** Category -> recipient/group -> items; clean Shopping mode and separate Manage mode, optional buyer under edit form.
- **Expenses:** Category budgets, total/spent/remaining dashboard, expandable categories, editable spending history, expenses in any configured travel currency, **fixed conversion rate saved per expense**.

## Prerequisites

- Node.js 20+ and npm.
- A new [Supabase](https://supabase.com) project for the trip data.
- A GitHub repository if deploying to GitHub Pages.

## 1. Database setup

1. In Supabase, create a project and open **SQL Editor**.
2. Paste and run the complete file `supabase/schema.sql` once. It creates all tables, composite foreign keys, authenticated-owner row-level security (RLS), the `owns_trip` access-check function, and the atomic day quick-edit function.
3. In **Authentication → Providers**, make sure Email authentication is enabled. Decide whether new accounts need email verification (recommended). For a private personal dashboard, consider turning **off open sign-ups** once you've created your own account, or use Supabase's admin invitation controls.
4. In **Authentication → URL Configuration**, set the Site URL and any Redirect URLs for your local and deployed site (e.g. `http://localhost:5173/**` and the exact `https://YOUR-NAME.github.io/YOUR-REPO/**` path). These settings matter when using confirmation/recovery email links.

Each trip is private to the authenticated account that created it. This version does **not** include multi-account collaborative sharing. Traveller names are labels used inside a single owner's trip, not separate logins.

## 2. Local setup

```bash
cp .env.example .env
```

Edit `.env` with the Supabase **Project URL** and **publishable/anon key** found in Supabase Project Settings → API. Never use the `service_role` key in a frontend or GitHub repository.

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a browser. Create an account, confirm your email if required, and create a trip. Default expense/packing/souvenir categories are created with the trip.

**Important:** A missing `.env` produces an explicit setup screen — it will **not** silently show throwaway mock activities.

## 3. Currency setup (your requested fixed-rate workflow)

Under **Trip Info → Trip setup**, select the **Budget currency** (e.g. SGD). This is the currency for all budget and remaining-balance totals.

Under **Trip Info → Currencies**, add each travel currency and its conversion rate. Enter any ISO-style 3-letter currency code; popular options are suggested. You can enter e.g. **100 JPY = 0.90 SGD** or **1 EUR = 1.50 SGD**. These numbers are examples, not live quotations. You supply your chosen fixed planning rates.

When recording an expense:

1. Choose the currency from those configured (or the budget currency).
2. Enter the amount paid.
3. The form pre-fills the fixed rate for that currency, but you may override the rate for a specific purchase.
4. Save. The original amount, original currency, rate used and converted amount are stored on the expense record.

**Changing a trip's fixed exchange rate does NOT retroactively change recorded expenses.** To avoid mixed-unit budgets, the main budget currency cannot be changed after adding non-zero category budgets or expenses. Set it first.

Expenses require explicit recording. Checking a souvenir as Bought or an activity as Reserved does not invent a paid amount, so no double-counting occurs.

## 4. Deploy to GitHub Pages

The included `.github/workflows/deploy.yml` builds and deploys automatically on pushes to `main`.

1. Create a GitHub repository and push these project files (without `.env`).
2. In GitHub: **Settings → Secrets and variables → Actions → Variables**, create:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. In **Settings → Pages**, set Source to **GitHub Actions**.
4. Push to `main` or manually run the deployment workflow.
5. Add your actual GitHub Pages site URL to Supabase Authentication → URL Configuration.

Vite uses relative asset paths, so the app can be deployed under the `/REPO/` path. The frontend publishable key is not a server secret. **Security depends on correctly configured Supabase authentication and RLS** — do not disable the supplied RLS policies.

## 5. Suggested end-to-end test

1. Create a 14-day trip and enter hotel stays for different city/date ranges. Verify Overview grouping and a Kamakura day-trip activity city tag.
2. Add an Idea, assign it to Day 4 and edit its details from the Day page. Confirm the Overview reflects the same activity.
3. Edit Day 4's title and times from Overview. Refresh your browser; values should remain.
4. Change an activity's reservation status to **To reserve**. Visit To-dos, complete the generated reminder, then verify the Day activity says **Reserved**. Change it back in Day view, and verify the task reopens. Test Hide independently.
5. Add travellers, Shared packing with a responsible person, and assign items to Travel Day Bag. Check items from different views and verify the same packed state.
6. Add Family → Mum → Gift in Souvenirs, then mark Bought.
7. In Trip Info → Currencies, save a rate such as 100 JPY = 0.90 SGD. Record a JPY expense. Change the fixed trip rate and verify the **older expense amount remains unchanged**, while the new expense uses the newer rate.
8. Refresh or sign out/in after edits. No data should disappear.
9. Test on your phone and a desktop browser. Test a second account to verify the first account's trip is not visible (RLS isolation).

## Known limitations / design tradeoffs

- No automatic bank import, receipt scans, live FX rates, multiple simultaneous editors, multi-user collaboration, partial-quantity packing counters, or drag-and-drop timeline sorting.
- The application is mobile responsive, but has not been user-tested in a deployed environment.
- Moving a confirmed reservation asks for confirmation; the app cannot change the actual hotel or ticket booking.
- If trip dates are shortened, out-of-range activity/day records are **preserved in the database** and reappear if the trip is extended. They are not auto-deleted.
- To-dos for reservation statuses have linked checkboxes; manual tasks are independent. Due dates, assignees and notes for auto-reminders are stored separately from the itinerary record.
- Google Maps location/route links open Google Maps; an exact valid Google Maps URL takes priority over generated searches/directions.
- Monetary values use decimal database types; client previews may show rounding differences for high-precision conversions, while persisted converted amounts are calculated by PostgreSQL.
- For production use, consider a real security review, backup/restore testing, a larger integration test suite and database migrations for future schema changes.

## Validation note

The repository's JSX/JavaScript files were **syntax-parsed successfully** with the locally installed TypeScript parser. This container cannot reach npmjs.org, so `npm install` and the real `npm run build` could not be completed here. Run those commands in an internet-connected environment and resolve any build or runtime issues before deploying. The included files are implementation source, not a hosted deployment.
