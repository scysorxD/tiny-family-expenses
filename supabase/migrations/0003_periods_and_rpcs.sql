-- 0003_periods_and_rpcs.sql
-- Period tables, closed-month trigger wiring, and the critical SECURITY DEFINER RPCs
-- (close_period, reopen_period, mark_payer_paid). Each RPC performs its own admin check.

create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  month_key text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'partially_paid', 'paid')),
  system_total numeric(14, 2),
  system_amount_per_payer numeric(14, 2),
  payer_count integer,
  final_message text,
  message_generated_at timestamptz,
  message_updated_at timestamptz,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (room_id, month_key)
);

create table if not exists public.period_payer_status (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  payer_id uuid not null references public.payers(id),
  amount_due numeric(14, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  marked_paid_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (period_id, payer_id)
);

create index if not exists idx_periods_room_month on public.periods(room_id, month_key);
create index if not exists idx_period_payer_status_period on public.period_payer_status(period_id);

-- Wire the closed-month guard (function defined in 0002) now that periods exists.
drop trigger if exists trg_expenses_period_open on public.expenses;
create trigger trg_expenses_period_open
  before insert or update or delete on public.expenses
  for each row execute function public.enforce_open_period_on_expense();

-- ---------------------------------------------------------------------------
-- RLS for periods and payer statuses.
-- ---------------------------------------------------------------------------
alter table public.periods enable row level security;
alter table public.period_payer_status enable row level security;

drop policy if exists periods_select on public.periods;
create policy periods_select on public.periods
  for select using (public.is_room_member(room_id));

-- Direct updates only for saving the editable collection message (admin).
drop policy if exists periods_update on public.periods;
create policy periods_update on public.periods
  for update
  using (public.is_room_admin(room_id) and not public.is_room_archived(room_id))
  with check (public.is_room_admin(room_id) and not public.is_room_archived(room_id));

drop policy if exists period_payer_status_select on public.period_payer_status;
create policy period_payer_status_select on public.period_payer_status
  for select using (
    exists (
      select 1 from public.periods p
      where p.id = period_id and public.is_room_member(p.room_id)
    )
  );

-- ---------------------------------------------------------------------------
-- close_period
-- ---------------------------------------------------------------------------
create or replace function public.close_period(
  p_room_id uuid,
  p_month_key text,
  p_include_detail boolean default true
)
returns public.periods
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.periods;
  v_total numeric(14, 2);
  v_payer_count integer;
  v_per_payer numeric(14, 2);
begin
  if not public.is_room_admin(p_room_id) then
    raise exception 'NOT_ADMIN';
  end if;
  if public.is_room_archived(p_room_id) then
    raise exception 'ROOM_ARCHIVED';
  end if;

  select count(*) into v_payer_count
  from public.payers
  where room_id = p_room_id and is_active;

  if v_payer_count = 0 then
    raise exception 'NO_ACTIVE_PAYERS';
  end if;

  select coalesce(sum(amount), 0) into v_total
  from public.expenses
  where room_id = p_room_id and month_key = p_month_key and deleted_at is null;

  -- numeric(14,2) keeps the exact two-decimal value; the admin rounds text in the message.
  v_per_payer := v_total / v_payer_count;

  insert into public.periods (
    room_id, month_key, status, system_total, system_amount_per_payer,
    payer_count, closed_by, closed_at, message_generated_at, updated_at
  )
  values (
    p_room_id, p_month_key, 'closed', v_total, v_per_payer,
    v_payer_count, auth.uid(), now(), now(), now()
  )
  on conflict (room_id, month_key) do update set
    status = 'closed',
    system_total = excluded.system_total,
    system_amount_per_payer = excluded.system_amount_per_payer,
    payer_count = excluded.payer_count,
    closed_by = excluded.closed_by,
    closed_at = excluded.closed_at,
    message_generated_at = now(),
    reopened_by = null,
    reopened_at = null,
    updated_at = now()
  returning * into v_period;

  delete from public.period_payer_status where period_id = v_period.id;

  insert into public.period_payer_status (period_id, payer_id, amount_due, status)
  select v_period.id, p.id, v_per_payer, 'pending'
  from public.payers p
  where p.room_id = p_room_id and p.is_active;

  return v_period;
end;
$$;

-- ---------------------------------------------------------------------------
-- reopen_period
-- ---------------------------------------------------------------------------
create or replace function public.reopen_period(p_room_id uuid, p_month_key text)
returns public.periods
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.periods;
begin
  if not public.is_room_admin(p_room_id) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.periods
  set status = 'open', reopened_by = auth.uid(), reopened_at = now(), updated_at = now()
  where room_id = p_room_id and month_key = p_month_key
  returning * into v_period;

  if not found then
    raise exception 'PERIOD_NOT_FOUND';
  end if;

  return v_period;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_payer_paid
-- ---------------------------------------------------------------------------
create or replace function public.mark_payer_paid(p_period_id uuid, p_payer_id uuid, p_paid boolean)
returns public.periods
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room uuid;
  v_pending integer;
  v_paid integer;
  v_status text;
  v_period public.periods;
begin
  select room_id into v_room from public.periods where id = p_period_id;
  if v_room is null then
    raise exception 'PERIOD_NOT_FOUND';
  end if;
  if not public.is_room_admin(v_room) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.period_payer_status
  set status = case when p_paid then 'paid' else 'pending' end,
      paid_at = case when p_paid then now() else null end,
      marked_paid_by = case when p_paid then auth.uid() else null end,
      updated_at = now()
  where period_id = p_period_id and payer_id = p_payer_id;

  select count(*) filter (where status = 'pending'), count(*) filter (where status = 'paid')
  into v_pending, v_paid
  from public.period_payer_status
  where period_id = p_period_id;

  if v_paid = 0 then
    v_status := 'closed';
  elsif v_pending = 0 then
    v_status := 'paid';
  else
    v_status := 'partially_paid';
  end if;

  update public.periods set status = v_status, updated_at = now()
  where id = p_period_id
  returning * into v_period;

  return v_period;
end;
$$;

grant execute on function public.close_period(uuid, text, boolean) to authenticated;
grant execute on function public.reopen_period(uuid, text) to authenticated;
grant execute on function public.mark_payer_paid(uuid, uuid, boolean) to authenticated;
