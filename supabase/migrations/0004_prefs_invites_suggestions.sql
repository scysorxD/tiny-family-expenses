-- 0004_prefs_invites_suggestions.sql
-- User preferences (last room), room invitations with secure token acceptance,
-- and the suggested-categories RPC.

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_room_id uuid references public.rooms(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'guest')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_room_invitations_room on public.room_invitations(room_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_preferences enable row level security;
alter table public.room_invitations enable row level security;

drop policy if exists user_preferences_rw on public.user_preferences;
create policy user_preferences_rw on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists room_invitations_select on public.room_invitations;
create policy room_invitations_select on public.room_invitations
  for select using (public.is_room_admin(room_id));

drop policy if exists room_invitations_insert on public.room_invitations;
create policy room_invitations_insert on public.room_invitations
  for insert with check (public.is_room_admin(room_id) and invited_by = auth.uid());

drop policy if exists room_invitations_delete on public.room_invitations;
create policy room_invitations_delete on public.room_invitations
  for delete using (public.is_room_admin(room_id));

-- ---------------------------------------------------------------------------
-- Invitation preview + acceptance (SECURITY DEFINER so invitees can act on a token).
-- ---------------------------------------------------------------------------
create or replace function public.get_invitation_preview(p_token uuid)
returns table (
  room_id uuid,
  room_name text,
  inviter text,
  role text,
  expired boolean,
  accepted boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.room_id,
    r.name,
    coalesce(p.display_name, p.email, 'Someone'),
    i.role,
    (i.expires_at is not null and i.expires_at < now()),
    (i.accepted_at is not null)
  from public.room_invitations i
  join public.rooms r on r.id = i.room_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token;
$$;

create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.room_invitations;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_inv from public.room_invitations where token = p_token;
  if v_inv.id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_USED';
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    raise exception 'INVITATION_EXPIRED';
  end if;
  if exists (
    select 1 from public.room_users
    where room_id = v_inv.room_id and user_id = auth.uid()
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  insert into public.room_users (room_id, user_id, role)
  values (v_inv.room_id, auth.uid(), v_inv.role);

  update public.room_invitations
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_inv.id;

  return v_inv.room_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_suggested_categories: most-used active categories (recent 90 days, then all-time).
-- ---------------------------------------------------------------------------
create or replace function public.get_suggested_categories(p_room_id uuid, p_limit integer default 5)
returns setof public.categories
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_room_member(p_room_id) then
    raise exception 'NOT_A_MEMBER';
  end if;

  return query
  with usage as (
    select
      e.category_id,
      count(*) filter (where e.expense_date >= (current_date - interval '90 days')) as recent_count,
      count(*) as total_count
    from public.expenses e
    where e.room_id = p_room_id and e.deleted_at is null
    group by e.category_id
  )
  select c.*
  from public.categories c
  left join usage u on u.category_id = c.id
  where c.room_id = p_room_id and c.is_active
  order by coalesce(u.recent_count, 0) desc, coalesce(u.total_count, 0) desc, c.name asc
  limit least(greatest(p_limit, 1), 10);
end;
$$;

grant execute on function public.get_invitation_preview(uuid) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.get_suggested_categories(uuid, integer) to authenticated;
