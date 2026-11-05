-- Native Supabase Auth. The earlier server-only migration is retained for history.
-- Never silently remap an existing local/custom account to an Auth identity.
do $$ begin
 if to_regclass('public.carenect_accounts') is not null then
  if exists(select 1 from public.carenect_accounts) then
   raise exception 'Existing custom accounts require a reviewed identity migration';
  end if;
 end if;
end $$;

create table if not exists public.carenect_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 60),
 role text not null check(role in ('senior','caregiver','family')),
 created timestamptz not null default now()
);
-- Role is a preferred UI client, not a staff/admin authorization claim.
alter table public.carenect_profiles enable row level security;
revoke all on public.carenect_profiles from public,anon,authenticated;
grant select on public.carenect_profiles to anon;
grant select,insert on public.carenect_profiles to authenticated;
create policy carenect_profile_read on public.carenect_profiles for select to authenticated
 using ((select auth.uid())=id);
create policy carenect_profile_create on public.carenect_profiles for insert to authenticated
 with check ((select auth.uid())=id);

create table if not exists public.carenect_records (
 id text primary key check(length(id)<=180),
 owner uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('task','message','post','mood','booking','plant','person','exhibition','reminder','clock','profile','volunteer','media')),
 content jsonb not null check(jsonb_typeof(content)='object'),
 created timestamptz not null default now()
);
alter table public.carenect_records drop constraint if exists carenect_records_owner_fkey;
alter table public.carenect_records add constraint carenect_records_owner_fkey
 foreign key(owner) references auth.users(id) on delete cascade;
create index if not exists carenect_records_owner_kind on public.carenect_records(owner,kind);
alter table public.carenect_records enable row level security;
revoke all on public.carenect_records from public,anon,authenticated;
grant select,insert,update,delete on public.carenect_records to authenticated;
create policy carenect_record_read on public.carenect_records for select to authenticated
 using ((select auth.uid())=owner);
create policy carenect_record_create on public.carenect_records for insert to authenticated
 with check ((select auth.uid())=owner);
create policy carenect_record_update on public.carenect_records for update to authenticated
 using ((select auth.uid())=owner) with check ((select auth.uid())=owner);
create policy carenect_record_delete on public.carenect_records for delete to authenticated
 using ((select auth.uid())=owner);

create or replace function public.carenect_initialize(p_name text,p_role text,p_records jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare caller uuid;item jsonb;
begin
 caller=auth.uid();
 if caller is null then raise exception 'Sign in first' using errcode='42501';end if;
 if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)>100 then
  raise exception 'Invalid initial records';
 end if;
 insert into public.carenect_profiles(id,name,role) values(caller,p_name,p_role) on conflict(id) do nothing;
 for item in select * from jsonb_array_elements(p_records) loop
  insert into public.carenect_records(id,owner,kind,content,created)
  values(item->>'id',caller,item->>'kind',item->'content',(item->>'created')::timestamptz)
  on conflict(id) do nothing;
 end loop;
end;
$$;
revoke all on function public.carenect_initialize(text,text,jsonb) from public,anon;
grant execute on function public.carenect_initialize(text,text,jsonb) to authenticated;

-- The bucket is private; every object is namespaced by the validated Auth user ID.
do $$ begin
 if exists(select 1 from storage.buckets where id='carenect-private' and public) then
  raise exception 'Review the existing public Carenect bucket before migrating';
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('carenect-private','carenect-private',false,20971520,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do nothing;
create policy carenect_media_read on storage.objects for select to authenticated
 using(bucket_id='carenect-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy carenect_media_create on storage.objects for insert to authenticated
 with check(bucket_id='carenect-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy carenect_media_delete on storage.objects for delete to authenticated
 using(bucket_id='carenect-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
