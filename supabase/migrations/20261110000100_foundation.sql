begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_subject uuid not null unique,
  name text not null check (length(btrim(name)) between 1 and 120),
  email text not null check (length(email) between 3 and 254),
  role text not null default 'operador' check (role in ('administrador','gestao','operador')),
  active boolean not null default false,
  participates_daily boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id)
);

create table public.work_periods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (starts_at < ends_at),
  unique(profile_id, weekday, starts_at)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id),
  record_id uuid not null,
  event_type text not null,
  changes jsonb not null
);
create index audit_events_record_time on public.audit_events(record_id, occurred_at);

-- The only provider-specific identity lookup used by policies.
create function private.current_profile_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.profiles where auth_subject = (select auth.uid()) and active;
$$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where auth_subject = (select auth.uid()) and active and role = 'administrador');
$$;
revoke all on function private.current_profile_id(), private.is_admin() from public, anon, authenticated;
grant execute on function private.current_profile_id(), private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.work_periods enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.profiles, public.work_periods, public.audit_events from public, anon, authenticated;
grant select on public.profiles, public.work_periods, public.audit_events to authenticated;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select private.current_profile_id()) or (select private.is_admin()));
create policy periods_read on public.work_periods for select to authenticated
using (profile_id = (select private.current_profile_id()) or (select private.is_admin()));
create policy audit_read on public.audit_events for select to authenticated
using ((select private.is_admin()));

create function private.stamp_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.current_profile_id();
begin
  if tg_op = 'INSERT' then
    new.created_at := now(); new.created_by := actor;
  else
    new.id := old.id; new.auth_subject := old.auth_subject;
    new.created_at := old.created_at; new.created_by := old.created_by;
  end if;
  new.updated_at := clock_timestamp(); new.updated_by := actor;
  return new;
end;
$$;
create function private.audit_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(actor_id, record_id, event_type, changes)
  values(new.updated_by, new.id, case when tg_op = 'INSERT' then 'profile.created' else 'profile.updated' end,
    jsonb_build_object('before', case when tg_op = 'UPDATE' then to_jsonb(old) else null end, 'after', to_jsonb(new)));
  return new;
end;
$$;
create trigger profiles_stamp before insert or update on public.profiles for each row execute function private.stamp_profile();
create trigger profiles_audit after insert or update on public.profiles for each row execute function private.audit_profile();
revoke all on function private.stamp_profile(), private.audit_profile() from public, anon, authenticated;

create function public.save_profile(
  p_subject uuid, p_name text, p_role text, p_active boolean,
  p_participates boolean, p_periods jsonb, p_expected_updated_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target public.profiles; actor uuid; auth_email text; saved_id uuid;
  previous_periods jsonb;
begin
  -- Serialize authorization changes so a concurrent deactivation cannot race a save.
  perform pg_advisory_xact_lock(73110421);
  if not private.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  actor := private.current_profile_id();
  if p_subject = auth.uid() and (p_role <> 'administrador' or not p_active) then
    raise exception 'Cannot remove own administrative access' using errcode = '42501';
  end if;
  if p_periods is null or jsonb_typeof(p_periods) <> 'array' or jsonb_array_length(p_periods) > 28 then
    raise exception 'Invalid work periods' using errcode = '22023';
  end if;
  select email into auth_email from auth.users where id = p_subject;
  if auth_email is null then raise exception 'Auth identity not found' using errcode = '22023'; end if;
  select * into target from public.profiles where auth_subject = p_subject for update;
  if target.id is not null and target.updated_at is distinct from p_expected_updated_at then
    raise exception 'Concurrent change' using errcode = '40001';
  end if;
  if target.id is null and p_expected_updated_at is not null then
    raise exception 'Profile no longer exists' using errcode = '40001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_periods) as a(weekday int, starts_at time, ends_at time)
    where a.weekday is null or a.starts_at is null or a.ends_at is null or a.weekday not between 0 and 6 or a.starts_at >= a.ends_at
  ) then raise exception 'Invalid work period' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_periods) with ordinality a(value, n)
    join jsonb_array_elements(p_periods) with ordinality b(value, n) on a.n < b.n
    where (a.value->>'weekday')::int = (b.value->>'weekday')::int
      and (a.value->>'starts_at')::time < (b.value->>'ends_at')::time
      and (b.value->>'starts_at')::time < (a.value->>'ends_at')::time
  ) then raise exception 'Overlapping work periods' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('weekday', weekday, 'starts_at', starts_at, 'ends_at', ends_at) order by weekday, starts_at), '[]'::jsonb)
    into previous_periods from public.work_periods where profile_id = target.id;
  insert into public.profiles(auth_subject,name,email,role,active,participates_daily)
    values(p_subject,btrim(p_name),auth_email,p_role,p_active,p_participates)
    on conflict(auth_subject) do update set name = excluded.name, email = excluded.email,
      role = excluded.role, active = excluded.active, participates_daily = excluded.participates_daily
    returning id into saved_id;
  delete from public.work_periods where profile_id = saved_id;
  insert into public.work_periods(profile_id, weekday, starts_at, ends_at)
    select saved_id, weekday, starts_at, ends_at
    from jsonb_to_recordset(p_periods) as period(weekday smallint, starts_at time, ends_at time);
  insert into public.audit_events(actor_id,record_id,event_type,changes)
    values(actor,saved_id,'profile.work_periods',jsonb_build_object('before',previous_periods,'after',p_periods));
  return saved_id;
end;
$$;
revoke all on function public.save_profile(uuid,text,text,boolean,boolean,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.save_profile(uuid,text,text,boolean,boolean,jsonb,timestamptz) to authenticated;

commit;
