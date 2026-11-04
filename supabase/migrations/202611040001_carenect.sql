-- Server-only data for Carenect's independent email/password accounts.
-- Run in a NEW project or review these prefixed names before using an existing one.
create table if not exists public.carenect_accounts (
 id uuid primary key,
 email text not null unique check(length(email)<=254),
 name text not null check(length(name) between 1 and 60),
 password_hash text not null check(password_hash ~ '^[a-f0-9]{32}:[a-f0-9]{128}$'),
 role text not null check(role in ('senior','caregiver','family')),
 created timestamptz not null default now()
);
create table if not exists public.carenect_records (
 id text primary key check(length(id)<=180),
 owner uuid not null references public.carenect_accounts(id) on delete cascade,
 kind text not null check(kind in ('task','message','post','mood','booking','plant','person','exhibition','reminder','clock','profile','volunteer','media')),
 content jsonb not null check(jsonb_typeof(content)='object'),
 created timestamptz not null default now()
);
create index if not exists carenect_records_owner_kind on public.carenect_records(owner,kind);
create table if not exists public.carenect_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 account_id uuid not null references public.carenect_accounts(id) on delete cascade,
 expires bigint not null
);
create index if not exists carenect_sessions_expiry on public.carenect_sessions(expires);
create table if not exists public.carenect_auth_limits (
 key text primary key check(key ~ '^[a-f0-9]{64}$'),
 attempts integer not null,
 expires bigint not null
);

alter table public.carenect_accounts enable row level security;
alter table public.carenect_records enable row level security;
alter table public.carenect_sessions enable row level security;
alter table public.carenect_auth_limits enable row level security;
-- Public API keys and Supabase Auth users never directly access Carenect data.
-- The Node server checks its own HttpOnly sessions and scopes every record by owner.
revoke all on public.carenect_accounts,public.carenect_records,public.carenect_sessions,public.carenect_auth_limits from public,anon,authenticated;
grant select,insert,update,delete on public.carenect_accounts,public.carenect_records,public.carenect_sessions,public.carenect_auth_limits to service_role;

create or replace function public.carenect_auth_attempt(p_key text,p_now bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_attempt integer;
begin
 delete from public.carenect_auth_limits where expires<p_now;
 insert into public.carenect_auth_limits(key,attempts,expires) values(p_key,1,p_now+900000)
 on conflict(key) do update set attempts=public.carenect_auth_limits.attempts+1
 returning attempts into current_attempt;
 return current_attempt<=10;
end;
$$;

create or replace function public.carenect_create_account(p_account jsonb,p_records jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare new_id uuid; item jsonb;
begin
 new_id=(p_account->>'id')::uuid;
 insert into public.carenect_accounts(id,email,name,password_hash,role,created)
 values(new_id,p_account->>'email',p_account->>'name',p_account->>'password_hash',p_account->>'role',(p_account->>'created')::timestamptz);
 for item in select * from jsonb_array_elements(p_records) loop
  insert into public.carenect_records(id,owner,kind,content,created)
  values(item->>'id',new_id,item->>'kind',item->'content',(item->>'created')::timestamptz);
 end loop;
end;
$$;
revoke all on function public.carenect_auth_attempt(text,bigint),public.carenect_create_account(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.carenect_auth_attempt(text,bigint),public.carenect_create_account(jsonb,jsonb) to service_role;
