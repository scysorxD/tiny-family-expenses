-- 0001_core_schema.sql
-- Core tables for tiny-family-expenses (profiles, rooms, membership, beneficiaries,
-- payers, categories, expenses, expense_beneficiaries) plus indexes and profile provisioning.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ARS',
  include_detail_in_message boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz
);

create table if not exists public.room_users (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'guest')),
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (room_id, name)
);

create table if not exists public.payers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (room_id, name)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (room_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  amount numeric(14, 2) not null check (amount > 0),
  description text,
  expense_date date not null,
  -- Canonical month_key derivation lives in the database so client and server always agree.
  month_key text generated always as (to_char(expense_date, 'YYYY-MM')) stored,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.expense_beneficiaries (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  beneficiary_id uuid not null references public.beneficiaries(id),
  primary key (expense_id, beneficiary_id)
);

create index if not exists idx_room_users_user_id on public.room_users(user_id);
create index if not exists idx_room_users_room_id on public.room_users(room_id);
create index if not exists idx_expenses_room_month on public.expenses(room_id, month_key);
create index if not exists idx_expenses_room_date on public.expenses(room_id, expense_date);
create index if not exists idx_expenses_category on public.expenses(category_id);
create index if not exists idx_expenses_created_by on public.expenses(created_by);
create index if not exists idx_expenses_deleted_at on public.expenses(deleted_at);
create index if not exists idx_categories_room_active on public.categories(room_id, is_active);
create index if not exists idx_beneficiaries_room_active on public.beneficiaries(room_id, is_active);
create index if not exists idx_payers_room_active on public.payers(room_id, is_active);

-- Auto-provision a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
