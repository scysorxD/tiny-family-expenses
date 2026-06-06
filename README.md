# tiny-family-expenses

Mobile-first shared family expenses app built with Ionic, Angular, Capacitor, and Supabase.

The app helps a family manage expenses inside private rooms. Users can create rooms, add expenses quickly, manage beneficiaries and payers, close monthly periods, generate editable collection messages, and track who has paid.

## Stack

- Angular 20 standalone components
- Ionic 8
- Capacitor 8 with Android target
- Supabase Auth and Postgres
- Supabase Row Level Security and SQL RPC functions
- Capacitor SQLite for local-first expense storage
- Capacitor Preferences, Network, App, Share, and Clipboard
- TypeScript strict mode

## MVP Scope

Implemented application areas include:

- Email/password authentication with Supabase Auth
- Room list, room creation, and last-room entry flow
- Room roles: `admin` and `guest`
- Room settings, members, invitations, beneficiaries, and payers
- Category management with active/inactive state
- Fast expense creation with local-first persistence and sync queue
- Monthly summary by category and beneficiary
- Period closing and reopening through Supabase RPC functions
- Collection message generation, editing, saving, copying, and sharing
- Payer collection status by month
- Dashboard with current month total, monthly average, pending collections, and recent months
- Basic offline sync indicators and conflict handling

The full product specification lives in:

```text
docs/family_shared_expenses_app_specification.md
```

## Project Structure

```text
src/app/
  core/
    auth/
    guards/
    models/
    services/
  data/
    local/
    remote/
  features/
    auth/
    categories/
    collections/
    dashboard/
    expenses/
    periods/
    rooms/
    shell/
    sync/
  shared/
    components/
    ui/
    utils/
supabase/
  migrations/
docs/
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the web app locally:

```bash
npm start
```

Build the app:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Run tests:

```bash
npm run test -- --watch=false --browsers=ChromeHeadlessNoGpu
```

## Supabase Setup

Create a Supabase project, then configure the public client values in:

```text
src/environments/environment.ts
src/environments/environment.prod.ts
```

Only use the public Supabase URL and anon/publishable key in client code. Never commit a Supabase service-role key.

Apply the SQL migrations in order from:

```text
supabase/migrations/
```

Current migrations cover:

- Core schema
- RLS policies and database guards
- Period closing/reopening RPC functions
- Preferences, invitations, and category suggestions
- Data API grants
- Beneficiary and payer delete guards
- Realtime publication setup

If using the Supabase CLI, the usual flow is:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

## Local Test Data Reset

For development environments only, there is a reset helper:

```text
docs/reset_test_data.sql
```

It deletes application data and auth users so you can start over while keeping the schema, policies, and functions intact. Do not run it against production data.

## Android

The Capacitor Android project is included under:

```text
android/
```

After a web build, sync Capacitor assets:

```bash
npx cap sync android
```

Open Android Studio:

```bash
npx cap open android
```

## Important Rules

- Expenses are saved locally first, then synchronized.
- Payers and beneficiaries are room records, not app users.
- Room users can be `admin` or `guest`.
- Categories with usage cannot be deleted; they should be deactivated.
- Closed months reject new expense creation and edits.
- Admins can close and reopen months.
- Collection messages are editable before sharing, and the final edited message is saved.

## Notes

- The app talks directly to Supabase through `@supabase/supabase-js`.
- Critical database operations such as period closing are implemented as SQL RPC functions.
- RLS is the main security boundary. Users should only access rooms where they are members.
- The MVP intentionally does not include OCR, push notifications, automatic WhatsApp integration, or advanced split rules.
