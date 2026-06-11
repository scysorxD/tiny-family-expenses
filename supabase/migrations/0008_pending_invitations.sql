-- 0008_pending_invitations.sql
-- Replace token-based invite links with in-app pending invitation flow.
-- Add status column, normalized email matching, new RPCs for accept/reject by ID.

-- ---------------------------------------------------------------------------
-- Schema changes
-- ---------------------------------------------------------------------------
alter table public.room_invitations add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'rejected'));

-- Normalized email for case-insensitive matching
alter table public.room_invitations add column if not exists email_normalized text not null
  generated always as (lower(trim(email))) stored;

-- Invitations no longer expire for MVP
alter table public.room_invitations alter column expires_at drop not null;
alter table public.room_invitations alter column expires_at set default null;

-- Index for email lookup (invitees finding their invitations)
create index if not exists idx_room_invitations_email on public.room_invitations(email_normalized);

-- ---------------------------------------------------------------------------
-- RLS: replace select policy so invitees can see their own pending invitations
-- ---------------------------------------------------------------------------
drop policy if exists room_invitations_select on public.room_invitations;

create policy room_invitations_select on public.room_invitations
  for select using (
    -- Room admins can see invitations for their room
    public.is_room_admin(room_id)
    -- Invited users can see their own pending/rejected invitations
    or (status in ('pending', 'rejected')
        and email_normalized = lower(trim(auth.jwt() ->> 'email')))
  );

-- ---------------------------------------------------------------------------
-- Drop old RPCs that use token-based flow
-- ---------------------------------------------------------------------------
drop function if exists public.get_invitation_preview(uuid);
drop function if exists public.accept_invitation(uuid);

-- ---------------------------------------------------------------------------
-- New RPCs
-- ---------------------------------------------------------------------------

-- List pending invitations for the current user (matched by email)
create or replace function public.list_my_pending_invitations()
returns table (
  id uuid,
  room_id uuid,
  room_name text,
  role text,
  invited_by_name text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select i.id, i.room_id, r.name, i.role,
    coalesce(p.display_name, p.email, 'Someone'),
    i.status, i.created_at
  from public.room_invitations i
  join public.rooms r on r.id = i.room_id
  left join public.profiles p on p.id = i.invited_by
  where i.email_normalized = lower(trim(auth.jwt() ->> 'email'))
    and i.status in ('pending', 'rejected')
  order by i.created_at desc;
$$;

-- Accept a pending invitation by ID
create or replace function public.accept_pending_invitation(p_invitation_id uuid)
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

  select * into v_inv from public.room_invitations where id = p_invitation_id;
  if v_inv.id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'INVITATION_NOT_PENDING';
  end if;
  if lower(trim(v_inv.email)) <> lower(trim(auth.jwt() ->> 'email')) then
    raise exception 'NOT_INVITED_USER';
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
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = v_inv.id;

  return v_inv.room_id;
end;
$$;

-- Reject a pending invitation by ID
create or replace function public.reject_pending_invitation(p_invitation_id uuid)
returns void
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

  select * into v_inv from public.room_invitations where id = p_invitation_id;
  if v_inv.id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'INVITATION_NOT_PENDING';
  end if;
  if lower(trim(v_inv.email)) <> lower(trim(auth.jwt() ->> 'email')) then
    raise exception 'NOT_INVITED_USER';
  end if;

  update public.room_invitations
  set status = 'rejected'
  where id = v_inv.id;
end;
$$;

-- List invitations for a room (admin view)
create or replace function public.list_room_invitations(p_room_id uuid)
returns table (
  id uuid,
  email text,
  role text,
  status text,
  invited_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.is_room_admin(p_room_id) then
    raise exception 'NOT_ROOM_ADMIN';
  end if;

  return query
  select i.id, i.email, i.role, i.status, i.invited_by, i.accepted_by,
    i.created_at, i.accepted_at
  from public.room_invitations i
  where i.room_id = p_room_id
  order by i.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.list_my_pending_invitations() to authenticated;
grant execute on function public.accept_pending_invitation(uuid) to authenticated;
grant execute on function public.reject_pending_invitation(uuid) to authenticated;
grant execute on function public.list_room_invitations(uuid) to authenticated;
