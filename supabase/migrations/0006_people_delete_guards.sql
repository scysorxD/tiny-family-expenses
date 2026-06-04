-- Clear delete errors for room people. Unused beneficiaries/payers can be
-- physically deleted; used ones must be deactivated to preserve history.

create or replace function public.prevent_used_beneficiary_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.expense_beneficiaries eb
    where eb.beneficiary_id = old.id
  ) then
    raise exception 'BENEFICIARY_IN_USE: Beneficiary has expenses and cannot be deleted; deactivate it instead.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create or replace function public.prevent_used_payer_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.period_payer_status pps
    where pps.payer_id = old.id
  ) then
    raise exception 'PAYER_IN_USE: Payer has closed-period payment history and cannot be deleted; deactivate it instead.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_beneficiaries_prevent_used_delete on public.beneficiaries;
create trigger trg_beneficiaries_prevent_used_delete
  before delete on public.beneficiaries
  for each row execute function public.prevent_used_beneficiary_delete();

drop trigger if exists trg_payers_prevent_used_delete on public.payers;
create trigger trg_payers_prevent_used_delete
  before delete on public.payers
  for each row execute function public.prevent_used_payer_delete();

revoke execute on function public.prevent_used_beneficiary_delete() from public;
revoke execute on function public.prevent_used_payer_delete() from public;
