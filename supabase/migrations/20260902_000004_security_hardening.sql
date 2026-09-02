-- Trigger helpers are internal database plumbing, not browser RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
