-- Run ONLY against HML. All fixture writes are rolled back.
begin;
insert into auth.users(id,email,aud,role) values
 ('10000000-0000-4000-8000-000000000001','security-admin@example.test','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000002','security-operator@example.test','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000003','security-manager@example.test','authenticated','authenticated'),
 ('10000000-0000-4000-8000-000000000004','security-inactive@example.test','authenticated','authenticated');
insert into public.profiles(auth_subject,name,email,role,active) values
 ('10000000-0000-4000-8000-000000000001','Security test admin','security-admin@example.test','administrador',true),
 ('10000000-0000-4000-8000-000000000002','Security test operator','security-operator@example.test','operador',true),
 ('10000000-0000-4000-8000-000000000003','Security test manager','security-manager@example.test','gestao',true),
 ('10000000-0000-4000-8000-000000000004','Security test inactive','security-inactive@example.test','operador',false);

set local role anon;
do $$ begin
  begin perform * from public.profiles; raise exception 'FAIL: anonymous read'; exception when insufficient_privilege then null; end;
  begin perform public.save_profile(gen_random_uuid(),'x','administrador',true,true,'[]'); raise exception 'FAIL: anonymous RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: operator isolation'; end if;
  if (select count(*) from public.audit_events) <> 0 then raise exception 'FAIL: audit disclosure'; end if;
  begin update public.profiles set role='administrador'; raise exception 'FAIL: privilege escalation'; exception when insufficient_privilege then null; end;
  begin insert into public.profiles(auth_subject,name,email) values(gen_random_uuid(),'x','x@example.test'); raise exception 'FAIL: direct create'; exception when insufficient_privilege then null; end;
  begin perform public.save_profile(gen_random_uuid(),'x','administrador',true,true,'[]'); raise exception 'FAIL: operator RPC'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: manager isolation'; end if;
  begin perform public.save_profile(gen_random_uuid(),'x','administrador',true,true,'[]'); raise exception 'FAIL: manager RPC'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
  if (select count(*) from public.profiles) <> 0 then raise exception 'FAIL: inactive access'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  if (select count(*) from public.profiles) < 4 then raise exception 'FAIL: admin read'; end if;
  begin delete from public.audit_events; raise exception 'FAIL: audit deletion'; exception when insufficient_privilege then null; end;
  begin perform public.save_profile('10000000-0000-4000-8000-000000000001','x','operador',true,true,'[]'); raise exception 'FAIL: self demotion'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: anonymous, operator, manager, inactive, admin, escalation and audit protections' as result;
rollback;
