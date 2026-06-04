-- Grants required for Supabase Data API access.
-- RLS still controls which rows each user can access.
-- Without these grants, PostgREST fails before RLS can evaluate and returns
-- errors such as: "permission denied for table room_users".

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.rooms to authenticated;
grant select, insert, update, delete on table public.room_users to authenticated;
grant select, insert, update, delete on table public.beneficiaries to authenticated;
grant select, insert, update, delete on table public.payers to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.expense_beneficiaries to authenticated;
grant select, insert, update, delete on table public.periods to authenticated;
grant select, insert, update, delete on table public.period_payer_status to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;
grant select, insert, update, delete on table public.room_invitations to authenticated;

-- SECURITY DEFINER functions are callable by PUBLIC by default in Postgres.
-- Keep trigger-only functions private, and grant only the RPC/helper functions
-- that authenticated clients or RLS policies need.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.enforce_open_period_on_expense() from public;
revoke execute on function public.prevent_used_category_delete() from public;

revoke execute on function public.is_room_member(uuid) from public;
revoke execute on function public.is_room_admin(uuid) from public;
revoke execute on function public.is_room_archived(uuid) from public;
revoke execute on function public.shares_room_with(uuid) from public;
revoke execute on function public.create_room(text, text) from public;
revoke execute on function public.close_period(uuid, text, boolean) from public;
revoke execute on function public.reopen_period(uuid, text) from public;
revoke execute on function public.mark_payer_paid(uuid, uuid, boolean) from public;
revoke execute on function public.get_invitation_preview(uuid) from public;
revoke execute on function public.accept_invitation(uuid) from public;
revoke execute on function public.get_suggested_categories(uuid, integer) from public;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_admin(uuid) to authenticated;
grant execute on function public.is_room_archived(uuid) to authenticated;
grant execute on function public.shares_room_with(uuid) to authenticated;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.close_period(uuid, text, boolean) to authenticated;
grant execute on function public.reopen_period(uuid, text) to authenticated;
grant execute on function public.mark_payer_paid(uuid, uuid, boolean) to authenticated;
grant execute on function public.get_invitation_preview(uuid) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.get_suggested_categories(uuid, integer) to authenticated;

-- Optional public flows should get explicit anon grants later. For now, keep
-- anon minimal; authenticated users should do almost everything.
