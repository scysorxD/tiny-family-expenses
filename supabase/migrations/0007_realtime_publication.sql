-- Enable Supabase Realtime for the collaborative tables so that a change made
-- by one room member (e.g. a new expense, a closed month, a recorded payment)
-- is streamed to other members without a manual refresh. Row Level Security
-- still applies to streamed rows, so members only receive changes for rooms
-- they belong to.

-- Emit full row data on UPDATE/DELETE so realtime payloads include old values.
alter table public.expenses replica identity full;
alter table public.periods replica identity full;
alter table public.period_payer_status replica identity full;

-- Add the tables to the realtime publication if they are not already members.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table public.expenses;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'periods'
  ) then
    alter publication supabase_realtime add table public.periods;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'period_payer_status'
  ) then
    alter publication supabase_realtime add table public.period_payer_status;
  end if;
end;
$$;
