# Complete Specification - Family Shared Expenses App

## 1. Document purpose

This document fully defines the functional scope, technical scope, business rules, UX expectations, data model, offline behavior, and implementation guidance for building a mobile Android app using **Angular + Ionic + Capacitor + Supabase**.

The goal is for this document to be directly usable by Codex, GitHub Copilot, or another code-generation tool to implement the application with minimal ambiguity.

---

# 2. Product summary

The app allows users to manage shared family expenses inside one or more **rooms**.

Main use case:

- A couple lives with the parents of one of them.
- The parents' expenses are shared by several siblings.
- Today, expenses are written manually in a WhatsApp group, for example:
  - `Dad medicine 30000`
  - `Taxi 20000`
  - `Dinner 40000`
- At the end of the month, one person manually sums everything and tells the siblings how much they need to transfer.

The app replaces that manual process.

The app must allow users to:

- Create an expense room, for example `Parents expenses`.
- Invite real app users who can add expenses.
- Add expenses quickly using category, amount, beneficiary, date, and optional description.
- Define internal beneficiaries, for example `Mom`, `Dad`, or both.
- Define internal payers, for example `Sibling 1`, `Sibling 2`, `My wife`.
- Automatically calculate expenses by month.
- Close a month.
- Calculate how much each payer owes.
- Generate an editable collection/payment message.
- Copy or share that message using any app.
- Save the final message that was sent/shared.
- Mark which payers have already paid.
- See which months are open, closed, partially paid, or fully paid.
- Use the app quickly, simply, and with very few clicks.
- Always save expenses locally first and synchronize them later with Supabase.

---

# 3. Product principles

## 3.1 Simplicity before intelligence

The app must not depend on free text or automatic natural-language interpretation.

Do not initially implement a chat-like input such as:

```text
medicine for dad that cost me 30000 and I bought it at Farmacity
```

Instead, expense entry must be structured, fast, and based on a few fields.

The ideal flow is:

```text
Open app
Tap + Expense
Select category
Enter amount
Save
```

## 3.2 The main screen must be optimized for adding expenses

The dashboard must not be the primary screen.

The most important action is adding expenses quickly.

When opening the app, if the user previously used a room, the app must open directly in the last used room.

## 3.3 Payers are not app users

Payers are only internal room data.

Examples:

- Sibling 1
- Sibling 2
- My wife

They do not log in, they do not receive invitations, and they do not see the room.

They are only used to calculate how much each person owes and to track whether they paid.

## 3.4 Beneficiaries are not app users either

Beneficiaries are the people the expense applies to.

Examples:

- Mom
- Dad

An expense can apply to:

- Mom
- Dad
- Both

If the room has only one beneficiary, the beneficiary selector must not be shown because every expense always applies to that person.

## 3.5 Simple offline, not full WhatsApp-style background delivery

The app must always save locally first.

Then it must try to synchronize when:

- The app is open.
- The app returns to foreground.
- Network connectivity is available.
- The user taps a manual sync button.

For the MVP, it is not required to synchronize while the app is fully closed like WhatsApp does.

---

# 4. Glossary

## 4.1 Room

A room represents a group of expenses.

Examples:

- `Parents expenses`
- `Grandparents`
- `Family pets`
- `Family vacation`

Each room has its own categories, beneficiaries, payers, invited users, and monthly periods.

## 4.2 Room user

A real person who uses the app and has access to a room.

Roles:

- `admin`
- `guest`

## 4.3 Admin

A user with full control over a room.

Can:

- Add expenses.
- Edit expenses.
- Soft-delete expenses.
- Create categories.
- Edit categories.
- Deactivate categories.
- Close months.
- Reopen months.
- Generate collection/payment messages.
- Edit collection messages before saving them.
- Copy or share messages.
- Mark payers as paid.
- Configure the room.
- Invite users.

## 4.4 Guest

A user with limited access.

Can:

- Add expenses.
- View room expenses.
- Create categories.
- Edit categories.
- Deactivate categories.
- Edit expenses while the month is open.

Cannot:

- Close months.
- Reopen months.
- Mark payers as paid.
- Configure payers.
- Configure the room.
- Invite users.

## 4.5 Beneficiary

The person the expense applies to.

Examples:

- Mom
- Dad

An expense can apply to one or more beneficiaries.

In the UI, when there are exactly two active beneficiaries, show:

```text
[Both] [Mom] [Dad]
```

If there are two beneficiaries, `Both` must be the default option.

Internally, if `Both` is selected, the expense must be linked to both beneficiaries.

## 4.6 Payer

A person who must pay a share of the monthly total.

Examples:

- Sibling 1
- Sibling 2
- My wife

A payer has no access to the app. It is only an internal record.

Used for:

- Monthly split calculation.
- Tracking whether the person paid.
- Showing collection/payment status.

## 4.7 Category

The type of expense.

Examples:

- Medicine
- Transportation
- Food
- Groceries
- Clothing
- Personal care
- Utilities
- Other

Categories can be created, edited, and deactivated.

A category that already has expenses associated with it cannot be deleted.

## 4.8 Period

Represents a month inside a room.

Examples:

- May 2026
- June 2026

Internally, use a `month_key` with this format:

```text
YYYY-MM
```

Example:

```text
2026-05
```

Possible statuses:

- `open`
- `closed`
- `partially_paid`
- `paid`

---

# 5. MVP scope

## 5.1 Included in the MVP

The MVP must include:

- Basic login with Supabase Auth.
- Create room.
- Invite users to a room.
- Roles: `admin` and `guest`.
- Create beneficiaries.
- Create payers.
- Create categories.
- Edit categories.
- Deactivate categories.
- Suggest most-used categories when adding an expense.
- Add expense.
- Save expense locally first.
- Synchronize expense with Supabase.
- View current month expenses.
- View current month total.
- View expenses grouped by category.
- Change expense date.
- Block expense creation in closed months.
- Close month.
- Reopen month, admin only.
- Calculate month total.
- Calculate amount per payer.
- Generate collection/payment message.
- Edit collection/payment message.
- Copy message.
- Share message using the device native share sheet.
- Save final message.
- Mark payer as paid.
- View month collection/payment status.
- Remember last opened room per user.
- Manual synchronization.
- Indicator for expenses pending synchronization.

## 5.2 Not included in the MVP

Do not initially include:

- Receipt OCR.
- Automatic WhatsApp reading.
- Automatic WhatsApp sending.
- Push notifications.
- Guaranteed background synchronization while the app is closed.
- Read-only roles.
- Payer access to the app.
- Percentage-based split.
- Unequal split per expense.
- PDF export.
- Excel export.
- Advanced multi-currency support.
- Mandatory realtime updates.
- Very advanced dashboard.

---

# 6. Recommended technical stack

## 6.1 Mobile frontend

Use:

- Angular
- Ionic
- Capacitor
- TypeScript

Initial target:

- Android app.

Possible future targets:

- PWA.
- iOS.

## 6.2 Backend

Use:

- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Storage, optional for future receipts/photos

## 6.3 Local storage / offline

Use a local persistence layer to save data before synchronization.

Options:

- SQLite through a Capacitor plugin.
- Ionic Storage as a simpler alternative.

Recommendation:

- For the MVP, use local storage with a synchronization queue.
- If a more robust local database is desired, use SQLite.

---

# 7. General architecture

## 7.1 Simple local-first principle

When the user creates an expense:

1. The expense is saved locally.
2. It appears immediately in the UI.
3. It is marked as `pending_sync`.
4. The app tries to synchronize it with Supabase.
5. If synchronization succeeds, it becomes `synced`.
6. If synchronization fails, it remains `pending_sync` or becomes `sync_failed`.

The user must never be blocked waiting for internet access.

## 7.2 Synchronization flow

The app must try to synchronize:

- When the app starts.
- When entering a room.
- When returning from background.
- When network connectivity is detected.
- When tapping `Sync now`.
- At a regular interval while the app is open, for example every 30 or 60 seconds.

## 7.3 Do not guarantee sending while the app is closed

For the MVP, synchronization while the app is fully closed is not required.

The app must clearly show pending items:

```text
2 expenses pending synchronization
```

---

# 8. Main screens

## 8.1 Login

Must allow:

- Login with email/password.
- Register with email/password.
- Password recovery, optional for MVP.

## 8.2 Home / room list

Must show the user's rooms.

Example:

```text
Parents expenses
May 2026
Current total: $90,000
Status: Open
Pending sync: 0
```

Actions:

- Enter room.
- Create room.
- Accept invitation, if applicable.

Rule:

- If the user has a saved last opened room, opening the app must take the user directly to that room.
- From inside a room, there must be a way to return to the room list.

## 8.3 Room main screen

This is the most important screen.

It must be optimized for quick expense entry.

Suggested content:

```text
Parents expenses
May 2026
Current total: $90,000
Status: Open

[+ Add expense]

Latest expenses:
- Medicine / Dad / $30,000
- Taxi / Mom / $20,000
- Food / Both / $40,000

Shortcuts:
Summary | Collections | Categories | Settings
```

The `+ Add expense` button must be very visible.

Prefer using a Floating Action Button.

## 8.4 New expense modal / screen

Must open quickly.

Fields:

1. Category.
2. Amount.
3. Beneficiary, if applicable.
4. Date.
5. Optional description.

### 8.4.1 Category

Must allow selecting a category from a dropdown, list, or chips.

Important requirement:

- The app must first suggest the most-used categories inside that room.

Behavior:

- Show the top 3 to 5 most-used categories first.
- Below that, allow opening the full dropdown/list.
- Allow category search.
- Allow creating a new category from the same flow if it does not exist.

Example UI:

```text
Category
Suggested:
[Medicine] [Taxi] [Food]

All categories:
[Select...]
```

If a new category is created from the modal:

- It must be saved in the room.
- It must be automatically selected for the current expense.

### 8.4.2 Amount

Required field.

Rules:

- Must accept positive numbers.
- Must allow a visual thousands separator, but store a decimal number.
- Do not allow zero.
- Do not allow negative values.

Valid examples:

```text
30000
30,000
30000.50
```

Store internally as decimal/numeric.

Note: the UI may be localized for Argentina/Spanish formatting if desired, but the internal value must always be stored as a numeric value.

### 8.4.3 Beneficiary

If the room has only one active beneficiary:

- Do not show the selector.
- Automatically use that beneficiary.

If the room has two or more active beneficiaries:

- Show options.
- If there are exactly two beneficiaries, show `Both` as the default option.

Example:

```text
Applies to:
[Both] [Mom] [Dad]
```

If the user selects `Both`, internally link the expense to both beneficiaries.

### 8.4.4 Date

Default:

- Current date.

Behavior:

- Show `Today` as the initial value.
- Allow changing the date by tapping the field.
- The date defines the expense `month_key`.

If the selected date belongs to a closed month:

- Do not allow normal saving.
- Show message:

```text
That month is already closed. You cannot add expenses to a closed month.
```

If the user is an admin, offer:

```text
Reopen month
```

If the user is not an admin:

```text
Ask the administrator to reopen the month or add the expense to an open month.
```

### 8.4.5 Description

Optional field.

It can be empty.

Used only for specific notes about the expense.

Examples:

- `Farmacity`
- `Medical checkup`
- `Taxi to doctor appointment`

It must not be required.

## 8.5 Monthly summary

Must show:

```text
May 2026
Total: $90,000
Status: Open

By category:
Medicine: $30,000
Transportation: $20,000
Food: $40,000

By beneficiary:
Mom: $40,000
Dad: $30,000
Both: $20,000
```

Notes:

- Beneficiary grouping can show expenses associated with each beneficiary.
- If an expense applies to both beneficiaries, for the MVP show it under `Both` to avoid visually duplicating amounts.

## 8.6 Month closing

Admin only.

From the monthly summary, there must be a button:

```text
Close month
```

When closing:

- Sum active, non-deleted expenses for the month.
- Count active payers.
- Divide the total between active payers.
- Freeze the calculation.
- Create payment status for each payer.
- Generate an editable message.
- Change period status.

If there are no active payers:

- Do not allow closing.
- Show error:

```text
There are no payers configured for this room.
```

If there are no expenses:

- Allow closing or ask for confirmation.
- Suggested message:

```text
This month has no expenses. Do you want to close it anyway?
```

## 8.7 Collection/payment message

After closing, the app must generate an editable message.

There must be two message modes.

### 8.7.1 With detail

Example:

```text
Expenses for May 2026

Total: $90,000
Split between 3: $30,000 each

Detail:
- Medicine: $30,000
- Transportation: $20,000
- Food: $40,000

Please transfer $30,000 each.
```

### 8.7.2 Without detail

Example:

```text
Expenses for May 2026

Total: $90,000
Split between 3: $30,000 each.

Please transfer $30,000 each.
```

The room must have this setting:

```text
include_detail_in_message: true/false
```

However, the admin can change whether detail is included right before generating/copying/sharing the message.

## 8.8 Editing the collection message

The generated message must be shown in an editable textarea.

The admin can manually modify any text.

Example:

- Real system total: `$79,997`
- Admin edits the message and writes `$80,000`

This must be allowed.

Save separately:

- Real system calculation.
- Final edited message.

Recommended fields:

```text
system_total
system_amount_per_payer
final_message
message_generated_at
message_updated_at
```

## 8.9 Share / copy message

Actions:

- `Copy message`
- `Share message`

`Share message` must use the device native share sheet so the text can be sent through:

- WhatsApp
- Telegram
- Email
- SMS
- Any compatible app

Do not integrate directly with the WhatsApp API in the MVP.

## 8.10 Collections / payer status

Screen to see payers for a period.

Example:

```text
May 2026
Total: $90,000
Each one: $30,000

Payers:
Sibling 1 - Pending - $30,000
Sibling 2 - Paid - $30,000
My wife - Paid - $30,000
```

Admin actions:

- Mark as paid.
- Mark as pending.

If all payers are paid:

- The period becomes `paid`.

If some are paid and some are pending:

- The period becomes `partially_paid`.

If none are paid:

- The period remains `closed`.

## 8.11 Categories

Screen to manage categories.

Actions:

- Create category.
- Edit name.
- Deactivate category.
- Reactivate category.
- Delete only if unused.

Rules:

- Do not allow two active categories with the same name inside the same room.
- Categories with usage must not be physically deleted.
- Deactivated categories must not appear in the new expense form.
- Deactivated categories must still appear in historical expenses.

## 8.12 Room settings

Admin only.

Must allow:

- Change room name.
- Change currency.
- Configure whether the message includes detail by default.
- Manage room users.
- Manage beneficiaries.
- Manage payers.
- Archive room.

---

# 9. Detailed business rules

## 9.1 Required data for an expense

To create an expense, the following are required:

- Room.
- Active category.
- Amount greater than zero.
- Date.
- At least one active beneficiary.
- Creator user with access to the room.

Description is optional.

## 9.2 Expense month

The expense month is determined by the expense date.

Example:

```text
expense_date = 2026-05-31
month_key = 2026-05
```

## 9.3 Closed month

Expenses cannot be created in a closed month.

Expenses cannot be edited in a closed month.

Expenses cannot be deleted in a closed month.

Only an admin can reopen the month.

## 9.4 Reopening a month

If an admin reopens a month:

- The period returns to `open`.
- Expenses can be added.
- Expenses can be edited.
- Expenses can be soft-deleted.
- When the month is closed again, totals are recalculated.

Audit fields to save:

- Who reopened it.
- Reopen date/time.

## 9.5 Used categories

If a category has at least one associated expense:

- It cannot be physically deleted.
- It can only be deactivated.

If a category has no usage:

- It can be physically deleted.

## 9.6 Most-used categories

The app must calculate the most-used categories per room.

Recommended suggestion criteria:

1. Count non-deleted expenses by category inside the room.
2. Prioritize expenses from the last 90 days.
3. If there is not enough data, use all historical data.
4. Show a maximum of 3 to 5 suggested categories.

Suggested order:

```text
Highest recent usage count
Then highest historical usage count
Then alphabetical order
```

Example:

If a room used:

- Medicine 20 times
- Taxi 12 times
- Food 8 times
- Clothing 1 time

When adding an expense, show first:

```text
[Medicine] [Taxi] [Food]
```

## 9.7 Active payers

When closing a month, use only active payers.

The calculation is frozen.

If a payer is later added, deactivated, or removed, it must not affect already closed months.

## 9.8 Amount per payer calculation

MVP:

```text
month total / number of active payers
```

Example:

```text
90000 / 3 = 30000
```

If the result has decimals, store the exact value.

Do not automatically round the internal calculation.

The admin can manually round the text in the editable message.

## 9.9 Final message

The final message edited by the admin must be saved.

This allows the app to know exactly what text was sent/shared.

## 9.10 Last edit wins

For the MVP, if two users edit the same expense:

- The last synchronized edit wins.
- Save `updated_by` and `updated_at`.

Future optional improvement:

- Full audit table.

## 9.11 Soft delete

Expenses must not be physically deleted.

Use:

```text
deleted_at
deleted_by
```

Deleted expenses must not be included in totals.

---

# 10. Supabase/Postgres data model

## 10.1 profiles

Extension of the authenticated user.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

## 10.2 rooms

```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ARS',
  include_detail_in_message boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz
);
```

## 10.3 room_users

```sql
create table room_users (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'guest')),
  created_at timestamptz not null default now(),
  unique(room_id, user_id)
);
```

## 10.4 beneficiaries

```sql
create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, name)
);
```

## 10.5 payers

```sql
create table payers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, name)
);
```

## 10.6 categories

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, name)
);
```

## 10.7 periods

```sql
create table periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  month_key text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'partially_paid', 'paid')),
  system_total numeric(14,2),
  system_amount_per_payer numeric(14,2),
  payer_count integer,
  final_message text,
  message_generated_at timestamptz,
  message_updated_at timestamptz,
  closed_by uuid references profiles(id),
  closed_at timestamptz,
  reopened_by uuid references profiles(id),
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, month_key)
);
```

## 10.8 expenses

```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  category_id uuid not null references categories(id),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  expense_date date not null,
  month_key text not null,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  deleted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
```

## 10.9 expense_beneficiaries

```sql
create table expense_beneficiaries (
  expense_id uuid not null references expenses(id) on delete cascade,
  beneficiary_id uuid not null references beneficiaries(id),
  primary key (expense_id, beneficiary_id)
);
```

## 10.10 period_payer_status

```sql
create table period_payer_status (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  payer_id uuid not null references payers(id),
  amount_due numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  marked_paid_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(period_id, payer_id)
);
```

## 10.11 user_preferences

```sql
create table user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  last_room_id uuid references rooms(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

## 10.12 room_invitations

```sql
create table room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'guest')),
  token text not null unique,
  invited_by uuid not null references profiles(id),
  accepted_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
```

---

# 11. Recommended indexes

```sql
create index idx_room_users_user_id on room_users(user_id);
create index idx_room_users_room_id on room_users(room_id);

create index idx_expenses_room_month on expenses(room_id, month_key);
create index idx_expenses_room_date on expenses(room_id, expense_date);
create index idx_expenses_category on expenses(category_id);
create index idx_expenses_created_by on expenses(created_by);
create index idx_expenses_deleted_at on expenses(deleted_at);

create index idx_categories_room_active on categories(room_id, is_active);
create index idx_beneficiaries_room_active on beneficiaries(room_id, is_active);
create index idx_payers_room_active on payers(room_id, is_active);

create index idx_periods_room_month on periods(room_id, month_key);
create index idx_period_payer_status_period on period_payer_status(period_id);
```

---

# 12. Security and permissions

## 12.1 General rules

- A user can only see rooms where they exist in `room_users`.
- A user can only see expenses for rooms where they are a member.
- Only admin can close/reopen a month.
- Only admin can modify payers.
- Only admin can modify beneficiaries, unless guest support is explicitly added in the future.
- Admin and guest can create/edit/deactivate categories.
- Admin and guest can add expenses.
- Do not allow actions on archived rooms.

## 12.2 Backend validations

Do not trust only the frontend.

Backend/Supabase must prevent:

- Inserting an expense into a closed month.
- Editing an expense in a closed month.
- Deleting an expense in a closed month.
- Deleting a category with associated expenses.
- Accessing an unauthorized room.
- Closing a month without admin role.
- Marking a payer as paid without admin role.

---

# 13. Recommended Supabase RPC functions

Create SQL/RPC functions for critical logic.

## 13.1 close_period

Input:

```text
room_id
month_key
include_detail boolean
```

Responsibilities:

1. Validate that the current user is admin.
2. Validate that the room exists.
3. Validate that there are active payers.
4. Sum non-deleted expenses for the month.
5. Calculate amount per payer.
6. Create or update the period.
7. Create rows in `period_payer_status`.
8. Save total, payer count, and amount per payer.
9. Change status to `closed`.
10. Return data needed to generate the message.

## 13.2 reopen_period

Input:

```text
room_id
month_key
```

Responsibilities:

1. Validate admin role.
2. Change period to `open`.
3. Save `reopened_by` and `reopened_at`.

## 13.3 mark_payer_paid

Input:

```text
period_id
payer_id
paid boolean
```

Responsibilities:

1. Validate admin role.
2. Mark the payer as paid or pending.
3. Update the period status:
   - all pending => `closed`
   - some paid => `partially_paid`
   - all paid => `paid`

## 13.4 get_suggested_categories

Input:

```text
room_id
limit
```

Responsibilities:

1. Find active categories.
2. Count recent usage.
3. Return the most-used categories.

Criteria:

- Prioritize the last 90 days.
- Then use all historical usage.
- Maximum 3 to 5 items.

---

# 14. Offline and synchronization

## 14.1 Local statuses

Each synchronizable local entity must have a status:

```text
pending_sync
syncing
synced
sync_failed
conflict
```

For the MVP, apply this mainly to expenses and newly created categories.

## 14.2 Local sync_queue table/collection

Store pending operations.

Suggested fields:

```text
local id uuid
entity_type: expense | category | etc
operation: create | update | delete
payload json
created_at
last_attempt_at
attempt_count
status
error_message
```

## 14.3 Offline expense creation

Flow:

1. User creates expense.
2. App performs basic local validation.
3. App saves expense locally with `pending_sync`.
4. App adds operation to `sync_queue`.
5. UI shows the expense immediately.
6. App tries to synchronize.
7. If Supabase accepts it, update status to `synced`.
8. If it fails because of connectivity, keep `pending_sync`.
9. If it fails because of a business rule, mark as `conflict`.

## 14.4 Conflict: closed month

Case:

- User offline adds an expense for May.
- Another user closes May.
- User comes back online.
- Sync attempts to upload the expense.
- Backend rejects it because May is closed.

Show:

```text
This expense could not be synchronized because May 2026 is already closed.
```

Options:

- Move to current month.
- Keep pending.
- Discard.

If the user is admin, also show:

- Reopen month.

## 14.5 Conflict: category deactivated

If a category was deactivated but the offline expense uses it:

- Allow synchronization if the category still exists.
- Do not block only because it is inactive, because the expense may have been created before or during the offline period.

## 14.6 Synchronization when opening the app

When opening the app:

1. Load local data.
2. Show the last room.
3. Try to synchronize the pending queue.
4. Download recent changes from Supabase.
5. Update UI.

## 14.7 Sync indicators

Show in the UI:

```text
Synchronized
1 pending expense
Synchronization error
```

For each pending expense, show a small icon.

Do not block the user.

---

# 15. Detailed UX for quick expense entry

## 15.1 Priority

Expense entry must take only a few seconds.

Recommended visual order:

1. Category.
2. Amount.
3. Beneficiary.
4. Save.
5. Date and description as secondary options.

## 15.2 Recommended form

```text
New expense

Category
[Suggested 1] [Suggested 2] [Suggested 3]
[View all]

Amount
$ __________

Applies to
[Both] [Mom] [Dad]

Date: Today
Optional description

[Save]
```

## 15.3 Suggested categories

Suggested categories must appear as large buttons/chips.

If the user taps a suggestion, it becomes selected.

If the user needs another category:

- Tap `View all`.
- Show dropdown/list/search.

## 15.4 Quick save

The Save button must be fixed at the bottom or very visible.

After saving:

- Close the modal.
- Show the expense in the list.
- Show toast:

```text
Expense saved
```

If it is pending sync:

```text
Expense saved. Pending synchronization.
```

## 15.5 Consecutive entry

Useful optional feature:

After saving, offer:

```text
Save and add another
```

Not required for MVP, but recommended.

---

# 16. Dashboard / statistics

## 16.1 Basic MVP dashboard

Show:

- Current month total.
- Total by category.
- Monthly average.
- Months pending collection/payment.
- Status of recent months.

## 16.2 Monthly average

Monthly average must be calculated using only months with data.

Example:

- If there is only one month with data: average = that month total.
- If there are 12 months with data: average = sum of those 12 months / 12.

Do not include months with no expenses.

## 16.3 Pending months

Show periods with status:

- `closed`
- `partially_paid`

These indicate that there is something pending to collect or pay.

---

# 17. Period statuses

## 17.1 open

Open month.

Allows:

- Create expenses.
- Edit expenses.
- Soft-delete expenses.

## 17.2 closed

Closed month.

Does not allow:

- Create expenses.
- Edit expenses.
- Delete expenses.

Allows:

- Generate/edit collection message.
- Mark payers as paid.
- Reopen, admin only.

## 17.3 partially_paid

Closed month where some payers paid and others are still pending.

## 17.4 paid

Closed month where all payers have paid.

---

# 18. Validation and error messages

## 18.1 Invalid amount

```text
Enter an amount greater than zero.
```

## 18.2 Category required

```text
Select a category.
```

## 18.3 Beneficiary required

```text
Select who the expense applies to.
```

## 18.4 Closed month

```text
This month is already closed. You cannot add expenses.
```

## 18.5 No permissions

```text
You do not have permission to perform this action.
```

## 18.6 Offline

```text
No connection. The expense was saved and will be synchronized later.
```

## 18.7 Sync error

```text
Could not synchronize. Tap to see details.
```

---

# 19. Acceptance criteria

## 19.1 Create room

Given an authenticated user,
when they create a room,
then they become admin of that room.

## 19.2 Last room

Given a user who has already opened a room,
when they open the app again,
then the app opens directly in the last used room.

## 19.3 Create simple expense

Given a user who is a member of an open room,
when they select category, amount, and beneficiary,
then the expense is saved locally and appears immediately in the list.

## 19.4 Expense without description

Given a user creating an expense,
when they leave the description empty,
then the expense is saved correctly.

## 19.5 Suggested categories

Given a room with previously used categories,
when the user opens the new expense screen,
then the user sees the most-used categories first.

## 19.6 Used category

Given a category with associated expenses,
when the user tries to delete it,
then the app does not allow deletion and offers deactivation.

## 19.7 Closed month

Given a closed month,
when the user tries to add an expense with a date in that month,
then the app does not allow saving the expense.

## 19.8 Close month

Given an admin and an open month with expenses,
when the admin closes the month,
then the app calculates total, amount per payer, and creates payer payment statuses.

## 19.9 Editable message

Given a closed month,
when the app generates a collection message,
then the admin can edit the text before copying or sharing it.

## 19.10 Saved message

Given the admin edited the message,
when they save or share it,
then the final text is saved in the period.

## 19.11 Mark payer as paid

Given a closed period,
when the admin marks a payer as paid,
then that payer's status is updated.

## 19.12 Paid period

Given a period where all payers are paid,
when the last pending payer is updated,
then the period changes to `paid` status.

## 19.13 Basic offline

Given a user without connection,
when they add an expense,
then the expense remains local with pending synchronization status.

## 19.14 Sync after reconnect

Given a pending expense,
when the app has network connection,
then it attempts to synchronize it with Supabase.

## 19.15 Closed month conflict

Given a pending expense for a month that was closed,
when the app tries to synchronize it,
then the app marks it as conflict and shows options to the user.

---

# 20. Suggested Angular/Ionic project structure

```text
src/app/
  core/
    auth/
    guards/
    interceptors/
    models/
    services/
  features/
    rooms/
      pages/
      components/
      services/
    expenses/
      pages/
      components/
      services/
    categories/
      pages/
      components/
      services/
    periods/
      pages/
      components/
      services/
    dashboard/
      pages/
      services/
  shared/
    components/
    pipes/
    utils/
  data/
    local/
    remote/
    sync/
```

## 20.1 Recommended services

```text
AuthService
RoomService
ExpenseService
CategoryService
BeneficiaryService
PayerService
PeriodService
DashboardService
LocalDatabaseService
SyncQueueService
NetworkService
ShareService
```

## 20.2 Recommended TypeScript models

```ts
export type RoomRole = 'admin' | 'guest';
export type PeriodStatus = 'open' | 'closed' | 'partially_paid' | 'paid';
export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';

export interface Room {
  id: string;
  name: string;
  currency: string;
  includeDetailInMessage: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface Category {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Beneficiary {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
}

export interface Payer {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  roomId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  monthKey: string;
  beneficiaryIds: string[];
  createdBy: string;
  updatedBy?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  syncStatus?: SyncStatus;
}

export interface Period {
  id: string;
  roomId: string;
  monthKey: string;
  status: PeriodStatus;
  systemTotal?: number;
  systemAmountPerPayer?: number;
  payerCount?: number;
  finalMessage?: string;
  closedBy?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
}
```

---

# 21. Collection message format

Create a frontend function to generate the default message.

Input:

```text
roomName
monthLabel
total
payerCount
amountPerPayer
categoryBreakdown
includeDetail
```

Output with detail:

```text
Expenses for {monthLabel}

Total: {totalFormatted}
Split between {payerCount}: {amountPerPayerFormatted} each

Detail:
- {categoryName}: {amountFormatted}
- {categoryName}: {amountFormatted}

Please transfer {amountPerPayerFormatted} each.
```

Output without detail:

```text
Expenses for {monthLabel}

Total: {totalFormatted}
Split between {payerCount}: {amountPerPayerFormatted} each.

Please transfer {amountPerPayerFormatted} each.
```

The text must be editable before save/copy/share.

---

# 22. Implementation recommendations for Codex

## 22.1 Build in stages

Implement in this order:

1. Create Ionic Angular project.
2. Configure Supabase.
3. Create TypeScript models.
4. Create SQL schema.
5. Implement Auth.
6. Implement rooms.
7. Implement categories.
8. Implement beneficiaries.
9. Implement payers.
10. Implement online expenses.
11. Implement monthly summary.
12. Implement month closing.
13. Implement editable message.
14. Implement collections/payer statuses.
15. Implement local storage.
16. Implement sync queue.
17. Implement basic conflicts.
18. Improve UX.

## 22.2 Do not over-engineer initially

Do not implement:

- Complex background sync.
- Push notifications.
- OCR.
- Mandatory realtime.
- Advanced splitting.

## 22.3 UX priority

The app must feel fast.

The expense entry flow must be the center of the experience.

---

# 23. Future backlog

Future non-MVP ideas:

- Receipt OCR.
- Attach receipt photos.
- Monthly PDF export.
- Excel export.
- Percentage-based split.
- Per-expense split.
- Realtime updates between devices.
- Push notification when someone closes a month.
- Payment reminders.
- Annual report.
- Advanced filters.
- Category charts.
- Dark mode.
- Android widgets for quick expense entry.
- Home screen shortcuts.
- Quick expense templates.
- Full audit history.

---

# 24. Final MVP definition

The final MVP must allow a user to:

1. Create a room called `Parents expenses`.
2. Configure beneficiaries `Mom` and `Dad`.
3. Configure payers `Sibling 1`, `Sibling 2`, `My wife`.
4. Create categories such as `Medicine`, `Taxi`, `Food`.
5. Invite another user as guest.
6. Open the app and go directly to the last room.
7. Tap `+ Expense`.
8. Choose a suggested category.
9. Enter amount.
10. Keep default beneficiary `Both` or choose `Mom`/`Dad`.
11. Save.
12. See updated monthly total.
13. Close the month as admin.
14. Generate editable message.
15. Copy or share the message.
16. Save the final message.
17. Mark which payers paid.
18. See if the month is fully paid.
19. Add expenses offline and synchronize them when the app is reopened or reconnected.

---

# 25. Final notes

The app must avoid creating family conflicts by giving external payers read access to the details.

Therefore:

- There is no viewer role.
- Payers cannot access the app.
- The admin decides what message to send.
- The message can include or omit details.
- The message can be manually edited.

The product must focus on saving time, avoiding manual calculation errors, and making monthly closing simple.
