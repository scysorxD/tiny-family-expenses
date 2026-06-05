-- reset_test_data.sql
--
-- DANGER: This deletes all tiny-family-expenses test data.
--
-- Use this only in a local/dev Supabase project or a disposable test project.
-- It preserves the schema, migrations, RLS policies, functions, and triggers.
-- It deletes:
--   - all app rows in public.*
--   - all Supabase Auth users, so you will need to register/login again
--
-- Recommended use:
--   1. Open the Supabase SQL editor for your test project.
--   2. Paste the whole script.
--   3. Run it once.

begin;

-- App data. TRUNCATE with CASCADE clears dependent rows while keeping tables.
truncate table
  public.room_invitations,
  public.user_preferences,
  public.period_payer_status,
  public.periods,
  public.expense_beneficiaries,
  public.expenses,
  public.categories,
  public.payers,
  public.beneficiaries,
  public.room_users,
  public.rooms,
  public.profiles
restart identity cascade;

-- Auth data. Run after public data because profiles are referenced by app rows.
delete from auth.users;

commit;
