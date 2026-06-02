# AGENTS.md

## Project

This project is called `tiny-family-expenses`.

It is a mobile-first app built with:

- Ionic
- Angular
- Capacitor
- Supabase
- TypeScript

The app manages shared family expenses by room, monthly period, beneficiaries, payers, categories, and expenses.

The main specification is located at:

- `docs/family_shared_expenses_app_specification.md`

Always read that file before implementing new features.

## Working mode

For large changes, create a plan first and wait for approval before coding.

Do not implement multiple milestones at once unless explicitly requested.

Prefer small, reviewable changes.

## Architecture rules

- Use Angular best practices.
- Use strict TypeScript.
- Keep business logic out of components when possible.
- Use services for Supabase access.
- Use models/interfaces for shared types.
- Keep UI mobile-first.
- Optimize for fast expense creation.
- Do not add a custom backend API unless explicitly requested.
- Use Supabase directly through the official client.
- Use Supabase RPC functions for critical operations such as closing a month.

## Business rules

- Room users can only be Admin or Guest.
- Payers are not app users.
- Beneficiaries are not app users.
- Categories with usage cannot be deleted; they can only be deactivated.
- Closed months cannot receive new expenses.
- Admins can close and reopen months.
- Guests can create expenses and manage categories.
- The collection message must be editable before sharing.
- The final edited message must be saved.

## Offline rules

- Always save expenses locally first.
- Add pending items to a local sync queue.
- Sync when the app opens.
- Sync when the app returns to foreground.
- Sync when the connection is restored.
- Do not implement complex WhatsApp-like background sync for the MVP.
- If a pending expense belongs to a closed month, mark it as a sync conflict.

## UI/UX rules

- The app must prioritize fast expense creation.
- When the user opens the app, open the last selected room if available.
- The main room screen must have a very visible `Add Expense` action.
- The Add Expense form must be simple:
  - Category
  - Amount
  - Beneficiary: default to all beneficiaries
  - Date: default to today
  - Description: optional
- Categories should be selectable from a dropdown or picker.
- The app should suggest the most used categories first.

## Supabase rules

- Use Supabase Auth.
- Use Supabase Postgres as the main database.
- Use RLS policies for security.
- Users can only access rooms where they are members.
- Only admins can close or reopen periods.
- Closed periods must reject new expenses.
- Critical operations should be implemented through SQL RPC functions where appropriate.

## Commands

Use the package manager already configured in the repository.

Before finishing a task, run the relevant commands if available:

- install/build command
- lint command
- test command

If a command fails, explain the failure and suggest the next fix.

## Done means

A task is done only when:

- the code compiles
- relevant tests pass or missing tests are explained
- no unrelated files were modified
- the implementation follows the specification
- changes are summarized clearly