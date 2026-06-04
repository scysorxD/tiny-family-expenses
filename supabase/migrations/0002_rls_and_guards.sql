-- 0002_rls_and_guards.sql
-- Row Level Security, membership helpers, and server-side business-rule enforcement:
-- room isolation, archived-room blocking, closed-month blocking, used-category delete protection.

-- ---------------------------------------------------------------------------
-- Security helper functions (SECURITY DEFINER bypasses RLS to avoid recursion).
-- ---------------------------------------------------------------------------
create or replace function public.is_room_member(p_room uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.room_users ru
    where ru.room_id = p_room and ru.user_id = auth.uid()
  );
$$;

create or replace function public.is_room_admin(p_room uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.room_users ru
    where ru.room_id = p_room and ru.user_id = auth.uid() and ru.role = 'admin'
  );
$$;

create or replace function public.is_room_archived(p_room uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.rooms r where r.id = p_room and r.archived_at is not null);
$$;

create or replace function public.shares_room_with(p_user uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from public.room_users me
    join public.room_users them on them.room_id = me.room_id
    where me.user_id = auth.uid() and them.user_id = p_user
  );
$$;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_admin(uuid) to authenticated;
grant execute on function public.is_room_archived(uuid) to authenticated;
grant execute on function public.shares_room_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_users enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.payers enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_beneficiaries enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.shares_room_with(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- rooms  (insert handled by create_room RPC; no direct insert policy)
-- ---------------------------------------------------------------------------
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select using (public.is_room_member(id));

drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms
  for update using (public.is_room_admin(id)) with check (public.is_room_admin(id));

-- ---------------------------------------------------------------------------
-- room_users  (first admin row bootstrapped by create_room / accept_invitation RPCs)
-- ---------------------------------------------------------------------------
drop policy if exists room_users_select on public.room_users;
create policy room_users_select on public.room_users
  for select using (public.is_room_member(room_id));

drop policy if exists room_users_insert on public.room_users;
create policy room_users_insert on public.room_users
  for insert with check (public.is_room_admin(room_id));

drop policy if exists room_users_update on public.room_users;
create policy room_users_update on public.room_users
  for update using (public.is_room_admin(room_id)) with check (public.is_room_admin(room_id));

drop policy if exists room_users_delete on public.room_users;
create policy room_users_delete on public.room_users
  for delete using (public.is_room_admin(room_id));

-- ---------------------------------------------------------------------------
-- beneficiaries / payers  (admin-managed)
-- ---------------------------------------------------------------------------
drop policy if exists beneficiaries_select on public.beneficiaries;
create policy beneficiaries_select on public.beneficiaries
  for select using (public.is_room_member(room_id));

drop policy if exists beneficiaries_write on public.beneficiaries;
create policy beneficiaries_write on public.beneficiaries
  for all
  using (public.is_room_admin(room_id) and not public.is_room_archived(room_id))
  with check (public.is_room_admin(room_id) and not public.is_room_archived(room_id));

drop policy if exists payers_select on public.payers;
create policy payers_select on public.payers
  for select using (public.is_room_member(room_id));

drop policy if exists payers_write on public.payers;
create policy payers_write on public.payers
  for all
  using (public.is_room_admin(room_id) and not public.is_room_archived(room_id))
  with check (public.is_room_admin(room_id) and not public.is_room_archived(room_id));

-- ---------------------------------------------------------------------------
-- categories  (admin AND guest can create / edit / deactivate)
-- ---------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (public.is_room_member(room_id));

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert with check (
    public.is_room_member(room_id)
    and not public.is_room_archived(room_id)
    and created_by = auth.uid()
  );

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update
  using (public.is_room_member(room_id) and not public.is_room_archived(room_id))
  with check (public.is_room_member(room_id) and not public.is_room_archived(room_id));

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete using (public.is_room_member(room_id) and not public.is_room_archived(room_id));

-- ---------------------------------------------------------------------------
-- expenses  (members create/edit; hard delete blocked, soft-delete via update)
-- ---------------------------------------------------------------------------
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select using (public.is_room_member(room_id));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert with check (
    public.is_room_member(room_id)
    and not public.is_room_archived(room_id)
    and created_by = auth.uid()
  );

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update
  using (public.is_room_member(room_id) and not public.is_room_archived(room_id))
  with check (public.is_room_member(room_id) and not public.is_room_archived(room_id));

-- ---------------------------------------------------------------------------
-- expense_beneficiaries  (scoped through the parent expense's room)
-- ---------------------------------------------------------------------------
drop policy if exists expense_beneficiaries_select on public.expense_beneficiaries;
create policy expense_beneficiaries_select on public.expense_beneficiaries
  for select using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_room_member(e.room_id)
    )
  );

drop policy if exists expense_beneficiaries_write on public.expense_beneficiaries;
create policy expense_beneficiaries_write on public.expense_beneficiaries
  for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_room_member(e.room_id)
        and not public.is_room_archived(e.room_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_room_member(e.room_id)
        and not public.is_room_archived(e.room_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Closed-month enforcement: block insert/update/delete of expenses in a closed period.
-- (periods table is created in 0003; this function references it lazily at runtime.)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_open_period_on_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room uuid;
  v_month text;
begin
  if (tg_op = 'DELETE') then
    v_room := old.room_id;
    v_month := public.to_month_key(old.expense_date);
  else
    v_room := new.room_id;
    v_month := public.to_month_key(new.expense_date);
  end if;

  if exists (
    select 1 from public.periods p
    where p.room_id = v_room and p.month_key = v_month and p.status <> 'open'
  ) then
    raise exception 'PERIOD_CLOSED: Cannot modify expenses in a closed month (%).', v_month
      using errcode = 'P0001';
  end if;

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Used-category delete protection: categories with expenses can only be deactivated.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_used_category_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.expenses e where e.category_id = old.id) then
    raise exception 'CATEGORY_IN_USE: Category has expenses and cannot be deleted; deactivate it instead.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_categories_prevent_used_delete on public.categories;
create trigger trg_categories_prevent_used_delete
  before delete on public.categories
  for each row execute function public.prevent_used_category_delete();

-- ---------------------------------------------------------------------------
-- create_room RPC: atomically create a room and add the creator as admin
-- (bootstraps the first room_users row that RLS could not otherwise allow).
-- ---------------------------------------------------------------------------
create or replace function public.create_room(p_name text, p_currency text default 'ARS')
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  insert into public.rooms (name, currency, created_by)
  values (trim(p_name), coalesce(nullif(p_currency, ''), 'ARS'), auth.uid())
  returning * into v_room;

  insert into public.room_users (room_id, user_id, role)
  values (v_room.id, auth.uid(), 'admin');

  return v_room;
end;
$$;

grant execute on function public.create_room(text, text) to authenticated;
