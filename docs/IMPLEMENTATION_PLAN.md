# MVP Implementation Plan — tiny-family-expenses

## Summary

Build the MVP as a root-level Ionic Angular standalone app with Capacitor Android support,
Supabase as the only backend, and a local-first persistence layer for expense storage and sync queue.

### Fixed defaults

| Decision | Choice | Reason |
|---|---|---|
| Package manager | `npm` | None currently configured |
| Offline storage — business data | Capacitor SQLite (`@capacitor-community/sqlite`) | The app is local-first with relational data (expenses, categories, sync queue). SQLite supports ordered queries, foreign-key-aware sync replay, and structured conflict tracking that key/value storage cannot provide |
| Offline storage — app preferences | Capacitor Preferences (`@capacitor/preferences`) | Simple key/value store for lightweight settings such as `last_room_id`; no schema or migrations needed |
| Angular reactivity | Signals where they reduce boilerplate; plain `async` pipe and services where signals add complexity | Do not over-engineer state management. Use signals for derived UI state; use services with `Observable` or `Promise` for async data flows |
| Supabase workflow | Repo-managed SQL migration files | Reproducible, reviewable schema history |
| Implementation style | One milestone at a time. Stop and wait for review after each milestone before starting the next |

---

## Architecture Constraints (decide before coding)

These must be established in Milestone 1 and respected by all subsequent milestones.

1. **Local-first from day one.** Every expense write goes to local SQLite first, then syncs to Supabase. Milestones that touch expense creation must implement the local save path immediately — not deferred to a later sync milestone.
2. **Signals where useful, not everywhere.** Use Angular signals and `computed()` for UI-derived state (e.g., filtered lists, form validity, period status badges). Use standard service methods returning `Promise` or `Observable` for async data operations. Do not wrap every service method in a signal.
3. **`month_key` derivation is canonical.** A shared utility function `toMonthKey(date: Date): string` returns `YYYY-MM`. It must be used identically on the client (local save) and in Supabase inserts so period grouping is never mismatched.
4. **RPCs run as `SECURITY DEFINER`.** `close_period`, `reopen_period`, and `mark_payer_paid` perform their own admin-role checks internally. Do not rely on RLS alone for function-level authorization.
5. **Archived rooms are fully blocked.** A route guard and RLS policy must prevent any action on an archived room.
6. **Guests can manage categories.** Category create/edit/deactivate is available to both `admin` and `guest`. Never restrict it to admin only.
7. **Currency formatting uses the room's `currency` field.** A shared `formatAmount(amount, currency)` utility is used everywhere amounts are displayed.

---

## Milestones

### Milestone 1 — Project Setup

Scaffold the app and establish all tooling.

- Scaffold an Ionic Angular standalone app at the repo root with strict TypeScript, routing, and Capacitor Android.
- Add dependencies:
  - `@supabase/supabase-js`
  - `@capacitor-community/sqlite` — structured local database for expenses, categories, sync queue
  - `@capacitor/preferences` — key/value storage for simple app preferences (e.g., `last_room_id`)
  - `@capacitor/network`
  - `@capacitor/app`
  - `@capacitor/share`
  - `@capacitor/clipboard`
- Define the local SQLite schema (versioned, applied at app init via `LocalDatabaseService`):
  - `expenses` table mirroring the Supabase columns plus `sync_status TEXT`
  - `expense_beneficiaries` table
  - `categories` table plus `sync_status TEXT`
  - `sync_queue` table: `local_id`, `entity_type`, `operation`, `payload`, `attempt_count`, `last_attempt_at`, `status`, `error_message`
  - Schema version tracked in a `meta` table; migrations run on every app start if version is stale.
- Create the folder structure from the specification (section 20):
  - `core/auth`, `core/guards`, `core/models`, `core/services`
  - `features/rooms`, `features/expenses`, `features/categories`, `features/periods`, `features/collections`, `features/dashboard`
  - `data/local`, `data/remote`, `data/sync`
  - `shared/components`, `shared/pipes`, `shared/utils`
- Add `environment.ts` with `supabaseUrl` and `supabaseAnonKey` only. Never expose a service-role key.
- Implement the canonical `toMonthKey(date: Date): string` utility and the `formatAmount(amount: number, currency: string): string` utility.
- Define all TypeScript models:
  - `RoomRole`, `PeriodStatus`, `SyncStatus`
  - `Room`, `RoomUser`, `Category`, `Beneficiary`, `Payer`, `Expense`, `Period`, `PeriodPayerStatus`, `SyncQueueItem`, `UserPreferences`, `RoomInvitation`

**Acceptance gate:** app builds (`ionic build`), `ng lint` passes, unit tests for `toMonthKey` and `formatAmount` pass, SQLite initializes on device without error.

> **Stop here and wait for review before starting Milestone 2a.**

---

### Milestone 2a — Core Data Schema + RLS

Create migrations for the primary data tables.

Tables:
- `profiles`
- `rooms`
- `room_users`
- `beneficiaries`
- `payers`
- `categories`
- `expenses`
- `expense_beneficiaries`

Rules to enforce in schema and RLS:
- Enable RLS on all tables.
- A user can only read/write rows for rooms where they exist in `room_users`.
- Soft-delete columns (`deleted_at`, `deleted_by`) on expenses; all queries filter `deleted_at IS NULL` by default.
- `amount > 0` check constraint on `expenses`.
- `unique(room_id, name)` on `categories`, `beneficiaries`, `payers`.
- `unique(room_id, user_id)` on `room_users`.
- Archived room guard: add a policy helper or check that prevents any write on rooms where `archived_at IS NOT NULL`.
- Add all indexes from specification section 11 that apply to these tables.

**Acceptance gate:** migrations apply cleanly, RLS membership access is verified with a test user outside the room seeing zero rows.

> **Stop here and wait for review before starting Milestone 2b.**

---

### Milestone 2b — Period Schema + Period RPCs

Create migrations for period-related tables and the critical RPC functions.

Tables:
- `periods`
- `period_payer_status`

RPC functions (all `SECURITY DEFINER`, caller must be an `admin` of the room):

**`close_period(room_id uuid, month_key text, include_detail boolean)`**
1. Verify caller is admin of the room.
2. Verify room exists and is not archived.
3. Verify there is at least one active payer; return error if none.
4. Sum non-deleted expenses for the month.
5. Count active payers at close time (frozen snapshot).
6. Calculate `amount_per_payer = total / payer_count`.
7. Upsert `periods` row (status → `closed`, freeze totals, set `closed_by`, `closed_at`).
8. Insert rows into `period_payer_status` for each active payer.
9. Return `{ period_id, system_total, payer_count, system_amount_per_payer }`.

**`reopen_period(room_id uuid, month_key text)`**
1. Verify caller is admin.
2. Set period status → `open`, set `reopened_by`, `reopened_at`.

**`mark_payer_paid(period_id uuid, payer_id uuid, paid boolean)`**
1. Verify caller is admin of the room that owns the period.
2. Update `period_payer_status.status` and `paid_at`.
3. Recalculate period status:
   - All pending → `closed`
   - Some paid → `partially_paid`
   - All paid → `paid`
4. Update `periods.status`.

Add indexes from the specification for `periods` and `period_payer_status`.

**Acceptance gate:** migrations apply cleanly, RPC rejects non-admin callers, closed-month rejects expense inserts/updates/deletes via RLS trigger or policy, payer-paid status correctly transitions period status.

> **Stop here and wait for review before starting Milestone 2c.**

---

### Milestone 2c — User and Invitation Schema + Suggested Categories RPC

Tables:
- `user_preferences`
- `room_invitations`

Invitation rules:
- `token` must be a cryptographically random UUID generated server-side (use `gen_random_uuid()`).
- `expires_at` enforcement: acceptance must be rejected if `expires_at < now()`.
- Invitation acceptance is handled by a `SECURITY DEFINER` RPC (`accept_invitation(token uuid)`) that inserts into `room_users` and marks `accepted_by`/`accepted_at`. Do not let the client write `room_users` directly.

**MVP invitation delivery:** Email sending is out of MVP scope. The admin copies the invitation link manually and shares it (e.g., via WhatsApp). No Edge Function for email is implemented in the MVP.

**`get_suggested_categories(room_id uuid, limit_count integer)`**
1. Filter active categories for the room.
2. Count recent usage (last 90 days) from non-deleted expenses.
3. Fall back to all-time count if fewer than `limit_count` results.
4. Return ordered by: recent count desc, historical count desc, name asc.
5. Cap at `limit_count` (default 5, max 5).

**Acceptance gate:** migrations apply, expired invitation tokens are rejected, `accept_invitation` RPC rejects expired tokens and duplicate membership, suggested categories RPC returns correctly ordered results.

> **Stop here and wait for review before starting Milestone 3.**

---

### Milestone 3 — Authentication

- Implement email/password sign up, login, logout.
- Restore auth state on app start (check Supabase session).
- On sign up, upsert a row into `profiles`.
- Route guard: unauthenticated users → login page.
- On successful login, read `user_preferences.last_room_id`:
  - If set, navigate directly to that room.
  - Otherwise, navigate to the room list.
- Update `last_room_id` in `user_preferences` every time the user enters a room (not only at login).
- Stub password recovery screen (UI only, "Feature coming soon") so the route exists for future use.

**Acceptance gate:** sign up creates profile, login restores session on reload, last-room routing works, protected routes reject unauthenticated users.

> **Stop here and wait for review before starting Milestone 4a.**

---

### Milestone 4a — Room List and Room Creation

- Implement the room list screen showing each room with:
  - Name
  - Current month label
  - Current month total (fetched or cached)
  - Period status
  - Pending sync count
- Implement create-room flow:
  - Fields: name, currency (default `ARS`).
  - On creation, insert into `rooms` and insert creator into `room_users` as `admin`.
  - Set `user_preferences.last_room_id` to the new room.
- On entering any room, update `last_room_id` in both Capacitor Preferences (immediate, local) and `user_preferences` in Supabase (async, best-effort).
- On app start, read `last_room_id` from Capacitor Preferences immediately without waiting for Supabase.
- Filter out archived rooms from the list (or show them separately with a visual distinction).

**Acceptance gate:** room list loads, create room sets creator as admin, last-room preference updates on every room entry, preference is available offline.

> **Stop here and wait for review before starting Milestone 4b.**

---

### Milestone 4b — Room Settings (Basic)

Admin-only settings screen:

- Change room name.
- Change currency (updates `formatAmount` display throughout the room).
- Toggle `include_detail_in_message` default.
- Archive room (requires confirmation dialog; archived room becomes inaccessible).

**Acceptance gate:** settings save and reflect immediately in the room header; non-admin users cannot access settings.

> **Stop here and wait for review before starting Milestone 4c.**

---

### Milestone 4c — Beneficiary and Payer Management

Admin-only screens within room settings:

**Beneficiaries:**
- Create, edit name, deactivate, reactivate.
- No duplicate active names per room.

**Payers:**
- Create, edit name, deactivate, reactivate.
- No duplicate active names per room.

**Acceptance gate:** beneficiary and payer lists manage correctly; deactivated entries are hidden from new expense forms.

> **Stop here and wait for review before starting Milestone 4d.**

---

### Milestone 4d — User Invitations

Admin-only invitation flow. **No email delivery in MVP — the admin copies and shares the link manually.**

- Input: invitee email (for the record), role (`admin` or `guest`).
- Call a Supabase RPC or insert to `room_invitations` to generate a token with `expires_at = now() + 7 days`.
- Display the resulting invitation link (a deep link the invitee opens in the app: `app://invite?token=xxx` or an HTTPS universal link) in a copyable field. Admin shares it via any channel (WhatsApp, SMS, etc.).
- Invitation acceptance screen: when an authenticated user opens the link, show room name and inviting user. User taps Accept.
- Call `accept_invitation(token)` RPC which validates expiry, checks the user is not already a member, inserts into `room_users`, and marks the invitation as accepted.
- Show current room members with their roles; admin can remove members.

**Acceptance gate:** invitation creates a token and displays a copyable link, acceptance adds the user to `room_users`, expired tokens are rejected, duplicate acceptance is rejected.

> **Stop here and wait for review before starting Milestone 5.**

---

### Milestone 5 — Category Management

Available to both `admin` and `guest`:

- Category list screen within the room.
- Create category (name, enforces no duplicate active names).
- Edit category name.
- Deactivate category (always allowed).
- Reactivate category.
- Delete category only if it has zero associated expenses; otherwise show:
  > "This category has expenses and cannot be deleted. You can deactivate it instead."
- Inactive categories are hidden from the new expense form but visible in expense history.

**Acceptance gate:** all CRUD rules enforced in UI and database; guest can manage categories; used categories cannot be deleted.

> **Stop here and wait for review before starting Milestone 6.**

---

### Milestone 6 — Expense Creation (Local-First)

This milestone implements the local-first write path. Every expense is saved locally before any network call.

**Room main screen:**
- Header: room name, current month label, total, period status, pending sync count.
- Recent expenses list (last 10).
- Floating Action Button: `+ Add Expense` — very visible, center-bottom.
- Navigation shortcuts: Summary | Collections | Categories | Settings.

**Add Expense modal:**

Fields in recommended visual order:
1. **Category** — suggested chips (top 3–5 from `get_suggested_categories` RPC, cached locally). Tapping a chip selects it. "View all" opens a searchable list. A "Create new category" option inside the modal saves the new category to the room and auto-selects it for this expense.
2. **Amount** — numeric input, positive only, no zero, no negatives. Visual thousands separator; stored as raw numeric.
3. **Beneficiary** — hidden if the room has exactly one active beneficiary (auto-selected). If two or more beneficiaries, show segmented options. If exactly two, show `[Both] [Name1] [Name2]` with `Both` as default. Selecting `Both` internally writes two rows to `expense_beneficiaries`.
4. **Date** — defaults to today, shown as "Today". Tapping opens a date picker. If the selected date falls in a closed period, block save and show the appropriate message (offer Reopen if admin, otherwise instruct to contact admin).
5. **Description** — optional text input.

**Local save flow:**
1. Validate fields locally.
2. Generate a local UUID for the expense.
3. Derive `month_key` using the canonical `toMonthKey()` utility.
4. Write the expense row to local SQLite (`expenses` table) with `sync_status = 'pending_sync'`.
5. Insert a row into the local SQLite `sync_queue` table.
6. Show expense immediately in the list.
7. Attempt Supabase sync in background. On success → update local row to `synced`. On connectivity failure → leave as `pending_sync`. On business rule rejection (e.g., closed month) → mark as `conflict`.

**Toast messages:**
- `"Expense saved"` — online and synced immediately.
- `"Expense saved. Pending synchronization."` — offline or sync deferred.

**Acceptance gate:** expense saves locally without network, appears in list immediately, syncs when online, `month_key` matches Supabase insert, SQLite row transitions from `pending_sync` to `synced`.

> **Stop here and wait for review before starting Milestone 7.**

---

### Milestone 7 — Monthly Summary

- Show for the selected period:
  - Month label, total, period status.
  - Latest expenses list with category, beneficiary display, amount, date, sync status icon.
  - Grouped totals by category.
  - Grouped totals by beneficiary (`Both` shown as a single group in MVP, not duplicated).
- All totals exclude soft-deleted expenses.
- Expense edit: opens the same modal pre-filled; allowed only while the period is `open`.
- Expense soft delete: confirmation dialog, allowed only while `open`.
- Period navigation: previous/next month arrows if periods exist.

**Acceptance gate:** totals are correct, deleted expenses are excluded, edits and deletes are blocked on closed periods.

> **Stop here and wait for review before starting Milestone 8.**

---

### Milestone 8 — Month Closing

Admin-only:

- "Close month" button visible in the monthly summary when period is `open`.
- Pre-close validation:
  - If no active payers: block with error.
  - If no expenses: confirmation dialog ("No expenses this month. Close anyway?").
- Call `close_period` RPC.
- On success: display the generated collection message screen (Milestone 9) directly.
- "Reopen month" button visible in the monthly summary when period is not `open` (admin only).
- Call `reopen_period` RPC on reopen.

**Acceptance gate:** non-admin cannot see close/reopen buttons; no-payer case is blocked; empty-month case requires confirmation; period status updates correctly.

> **Stop here and wait for review before starting Milestone 9.**

---

### Milestone 9 — Editable Collection Message

Shown after closing a month or by navigating to the collections screen.

**Message generation (frontend utility function, not a service):**

Input: `{ roomName, monthLabel, total, payerCount, amountPerPayer, categoryBreakdown, includeDetail, currency }`

With detail:
```
Expenses for {monthLabel}

Total: {totalFormatted}
Split between {payerCount}: {amountPerPayerFormatted} each

Detail:
- {categoryName}: {amountFormatted}
...

Please transfer {amountPerPayerFormatted} each.
```

Without detail:
```
Expenses for {monthLabel}

Total: {totalFormatted}
Split between {payerCount}: {amountPerPayerFormatted} each.

Please transfer {amountPerPayerFormatted} each.
```

**UI:**
- Toggle: "Include detail / Without detail" — overrides the room default for this session, but does not change the room setting unless the user explicitly saves it.
- Editable `<ion-textarea>` showing the generated message. Admin can freely edit any text.
- The UI shows both the frozen system calculation and the editable message area separately.
- Actions:
  - **Copy** — copies current textarea content via Capacitor Clipboard, then saves `final_message` + `message_updated_at` to `periods`.
  - **Share** — opens native share sheet via Capacitor Share with current textarea content, then saves `final_message` + `message_updated_at` to `periods`.
  - **Save draft** — saves `final_message` without copying or sharing.

**Acceptance gate:** system totals are frozen and cannot be lost by editing; final message saved before or during copy/share; with/without detail toggle works independently of room setting; amounts use `formatAmount`.

> **Stop here and wait for review before starting Milestone 10.**

---

### Milestone 10 — Collections / Payer Status

Screen accessible from the period summary.

- Shows period: month label, system total, amount per payer.
- Lists each payer with: name, amount due, status (`Pending` / `Paid`), paid date if available.
- Admin: tap payer to toggle paid/pending → calls `mark_payer_paid` RPC.
- Period status badge updates after each toggle.
- Guest: read-only view.

**Acceptance gate:** non-admin cannot toggle status; all-paid transitions period to `paid`; partial payment shows `partially_paid`.

> **Stop here and wait for review before starting Milestone 11.**

---

### Milestone 11 — Sync Queue and Offline Polish

Builds on the local SQLite save path in Milestone 6 and adds robustness.

**Local SQLite tables (defined in Milestone 1, used fully here):**
- `expenses` — mirrors Supabase columns plus `sync_status TEXT`
- `expense_beneficiaries` — mirrors Supabase columns
- `categories` — mirrors Supabase columns plus `sync_status TEXT`
- `sync_queue` — `local_id TEXT PRIMARY KEY`, `entity_type TEXT`, `operation TEXT`, `payload TEXT` (JSON), `attempt_count INTEGER`, `last_attempt_at TEXT`, `status TEXT`, `error_message TEXT`, `created_at TEXT`

**Sync ordering:** the queue processor must replay items in insertion order and handle foreign key dependencies — a category create must succeed before an expense create that references it.

**Sync triggers:**
- App start
- Entering a room
- App returns to foreground (via Capacitor App plugin)
- Network restored (via Capacitor Network plugin)
- Manual "Sync now" button — place in the room header or a sync status banner
- Periodic in-app interval of 60 seconds (use 60s, not 30s, to reduce battery impact on Android; document this trade-off)

**Sync indicators:**
- Room list: show pending count per room.
- Expense list: show a small clock icon on each `pending_sync` expense.
- Global banner when sync is in progress or has errors.

**Conflict — closed month:**
Show per-conflict options:
- Move expense to the current open month.
- Keep pending (retry manually).
- Discard local expense.
- Reopen month (admin only).

**Conflict — category name collision:**
Show: "A category named '{name}' already exists in this room. Select it or rename your local category."

**Conflict — offline category deactivated:**
Allow sync even if category is inactive (expense was created validly before deactivation).

**`last_room_id` offline resilience:** already handled in Milestone 4a via Capacitor Preferences. Verify the value is available at cold start before Supabase responds.

**Acceptance gate:** expenses created offline appear immediately, sync when online, closed-month conflict shows options, category sync order is correct, manual sync button is visible.

> **Stop here and wait for review before starting Milestone 12.**

---

### Milestone 12 — Dashboard

Standalone dashboard screen accessible from the room.

Shows:
- Current month total.
- Monthly totals grouped by category (current month).
- Monthly average — computed only over months that have at least one expense (never divide by zero or empty months).
- Months pending collection: list of periods with status `closed` or `partially_paid` with a quick link to their collections screen.
- Recent period status list.

Services: `DashboardService` fetches aggregated data from Supabase (or local store when offline).

**Acceptance gate:** monthly average excludes empty months, pending collection list is accurate, dashboard is accessible to both admin and guest.

> **Stop here and wait for review before starting Milestone 13.**

---

### Milestone 13 — Tests

Tests are written alongside each milestone but this milestone closes any gaps and adds integration-level coverage.

**Unit tests (pure utilities):**
- `toMonthKey` edge cases (month boundaries, year roll-over)
- `formatAmount` per currency
- Collection message generator (with and without detail, various payer counts)
- Category suggestion ordering

**Service unit tests (mocked Supabase + mocked local storage):**
- `AuthService`: session restore, last-room routing
- `ExpenseService`: local save, sync status transitions
- `SyncQueueService`: ordering, conflict detection
- `PeriodService`: close/reopen, status transitions

**Component tests:**
- Login form validation states
- Room list last-room routing
- Add-expense: all validation rules, beneficiary defaults, closed-month block
- Category management: guest access, delete blocked on used category, inline creation from expense modal
- Editable message: save on copy/share, include-detail toggle isolation

**SQL/RPC verification scripts:**
- RLS: user outside room sees zero rows
- `close_period` rejects non-admin
- `reopen_period` rejects non-admin
- Closed period rejects expense insert/update/delete
- Category with usage rejects `DELETE`
- `mark_payer_paid` correctly transitions period status through all states
- Expired invitation tokens rejected

**E2E smoke tests (Cypress or Playwright, device or browser):**
- Sign up → login → create room → create category/beneficiary/payer
- Add expense online
- Add expense offline → reconnect → sync
- Close month → edit message → copy/share
- Mark all payers paid → period becomes `paid`
- Closed-month conflict: add expense offline, close month online, reconnect, verify conflict options

---

## Public Interfaces and Types

### TypeScript models (`core/models`)

```ts
export type RoomRole = 'admin' | 'guest';
export type PeriodStatus = 'open' | 'closed' | 'partially_paid' | 'paid';
export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';

export interface Room { id: string; name: string; currency: string; includeDetailInMessage: boolean; createdBy: string; createdAt: string; updatedAt?: string; archivedAt?: string; }
export interface RoomUser { id: string; roomId: string; userId: string; role: RoomRole; createdAt: string; }
export interface Category { id: string; roomId: string; name: string; isActive: boolean; createdBy: string; createdAt: string; updatedAt?: string; }
export interface Beneficiary { id: string; roomId: string; name: string; isActive: boolean; }
export interface Payer { id: string; roomId: string; name: string; isActive: boolean; }
export interface Expense { id: string; roomId: string; categoryId: string; amount: number; description?: string; expenseDate: string; monthKey: string; beneficiaryIds: string[]; createdBy: string; updatedBy?: string; deletedBy?: string; createdAt: string; updatedAt?: string; deletedAt?: string; syncStatus?: SyncStatus; }
export interface Period { id: string; roomId: string; monthKey: string; status: PeriodStatus; systemTotal?: number; systemAmountPerPayer?: number; payerCount?: number; finalMessage?: string; messageGeneratedAt?: string; messageUpdatedAt?: string; closedBy?: string; closedAt?: string; reopenedBy?: string; reopenedAt?: string; }
export interface PeriodPayerStatus { id: string; periodId: string; payerId: string; amountDue: number; status: 'pending' | 'paid'; paidAt?: string; markedPaidBy?: string; }
export interface SyncQueueItem { localId: string; entityType: 'expense' | 'category'; operation: 'create' | 'update' | 'delete'; payload: unknown; attemptCount: number; lastAttemptAt?: string; status: SyncStatus; errorMessage?: string; }
export interface UserPreferences { userId: string; lastRoomId?: string; }
export interface RoomInvitation { id: string; roomId: string; email: string; role: RoomRole; token: string; invitedBy: string; acceptedBy?: string; acceptedAt?: string; expiresAt?: string; createdAt: string; }
```

### Core services

| Service | Responsibility |
|---|---|
| `AuthService` | Sign up, login, logout, session restore, profile upsert |
| `RoomService` | CRUD rooms, room membership, last-room preference |
| `CategoryService` | CRUD categories, deactivation, usage check |
| `BeneficiaryService` | CRUD beneficiaries |
| `PayerService` | CRUD payers |
| `ExpenseService` | Local-first create/edit/delete, beneficiary mapping |
| `PeriodService` | close/reopen via RPC, period status |
| `DashboardService` | Aggregated stats, pending periods |
| `LocalDatabaseService` | Capacitor SQLite reads/writes for business data; Capacitor Preferences reads/writes for simple app preferences |
| `SyncQueueService` | Queue management, sync triggers, conflict handling |
| `NetworkService` | Network status, foreground events |
| `ShareService` | Clipboard copy, native share sheet |

### Shared pure utilities (`shared/utils`)

| Function | Signature |
|---|---|
| `toMonthKey` | `(date: Date) => string` — returns `YYYY-MM` |
| `formatAmount` | `(amount: number, currency: string) => string` |
| `generateCollectionMessage` | `(input: CollectionMessageInput) => string` |
| `sortSuggestedCategories` | `(categories: CategoryWithUsage[]) => Category[]` |

Supabase RPCs are the public database interface for all critical operations: `close_period`, `reopen_period`, `mark_payer_paid`, `get_suggested_categories`.

---

## Acceptance Gates (every milestone)

- App builds (`ionic build`) without errors.
- `ng lint` passes with no new warnings.
- Relevant unit and component tests pass.
- SQL migrations apply cleanly (where applicable).
- RLS/security behavior verified for that milestone's new tables and RPCs.
- No unrelated files modified.
- UI remains mobile-first; expense creation flow is fast and unobstructed.

---

## Assumptions

- App scaffolded at repository root.
- `npm` is the package manager.
- Initial UI copy is English; currency is configurable per room.
- No custom backend API. Supabase client only.
- Supabase service-role keys are never used in the client.
- Invitation email delivery is out of MVP scope. Admins share the invitation link manually.
- Realtime updates, OCR, push notifications, PDF/Excel export, percentage-based splits, and guaranteed background sync remain out of MVP scope.
- Password recovery is stubbed in MVP (route exists, full flow post-MVP).
- Capacitor SQLite is used for all structured local data. Capacitor Preferences is used for simple key/value preferences. Both are abstracted behind `LocalDatabaseService` and `PreferencesService` respectively so internals can be swapped without changing callers.
