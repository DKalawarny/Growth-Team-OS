-- Trigger: notify Daniel via the gbp-audit-notify Edge Function whenever
-- a new GBP audit request comes in. Uses pg_net (enabled by default on
-- Supabase managed Postgres).
--
-- The function is deployed with --no-verify-jwt so no auth header is needed.
-- net.http_post is fire-and-forget — it doesn't block the INSERT.

create or replace function public.notify_gbp_audit_request()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := 'https://ufhduewbamnmoiksqgfq.supabase.co/functions/v1/gbp-audit-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'business_name', NEW.business_name,
      'email',         NEW.email,
      'city',          NEW.city,
      'website',       NEW.website
    )::text
  );
  return NEW;
end;
$$;

create trigger on_gbp_audit_request_insert
  after insert on public.gbp_audit_requests
  for each row
  execute function public.notify_gbp_audit_request();
