import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('native Auth migration: SQL-enforced account and private-media isolation',async t=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id text primary key,bucket_id text,name text);
   alter table storage.objects enable row level security;
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
   grant usage on schema auth,storage to anon,authenticated;
   grant select,insert,delete on storage.objects to authenticated;`);
  for(const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
  const identity=async id=>{await db.exec('reset role;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated;');};
  await identity(a);
  const now=new Date().toISOString(),seed=[{id:'private-a',kind:'message',content:{text:'Only A'},created:now}];
  await db.query('select public.carenect_initialize($1,$2,$3::jsonb)',['A','senior',JSON.stringify(seed)]);
  await db.query('insert into storage.objects values($1,$2,$3)',['photo-a','carenect-private',a+'/photo']);
  await t.test('another account cannot select, change, delete or take over private rows',async()=>{
   await identity(b);await db.query('select public.carenect_initialize($1,$2,$3::jsonb)',['B','family','[]']);
   assert.equal((await db.query('select * from public.carenect_records')).rows.length,0);
   assert.equal((await db.query("update public.carenect_records set content='{}' where id='private-a' returning id")).rows.length,0);
   assert.equal((await db.query("delete from public.carenect_records where id='private-a' returning id")).rows.length,0);
   await assert.rejects(db.query('insert into public.carenect_records(id,owner,kind,content) values($1,$2,$3,$4)',['forged',a,'message','{}']));
   assert.equal((await db.query('select * from public.carenect_profiles')).rows.length,1);
   assert.equal((await db.query('select * from public.carenect_profiles')).rows[0].id,b);
   await identity(a);await assert.rejects(db.query("update public.carenect_records set owner=$1 where id='private-a'",[b]));
   assert.equal((await db.query("select content from public.carenect_records where id='private-a'")).rows[0].content.text,'Only A');
  });
  await t.test('private objects cannot be read, deleted or uploaded into another user folder',async()=>{
   await identity(b);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
   assert.equal((await db.query("delete from storage.objects where id='photo-a' returning id")).rows.length,0);
   await assert.rejects(db.query('insert into storage.objects values($1,$2,$3)',['spoof','carenect-private',a+'/spoof']));
   await identity(a);assert.equal((await db.query('select * from storage.objects')).rows.length,1);
  });
  await t.test('public users cannot bootstrap accounts or read private records',async()=>{
   await db.exec('reset role;set role anon;');
   assert.equal((await db.query('select * from public.carenect_profiles')).rows.length,0);
   await assert.rejects(db.query('select * from public.carenect_records'));
   await assert.rejects(db.query('select public.carenect_initialize($1,$2,$3::jsonb)',['Anon','senior','[]']));
   await db.exec('reset role;');
   assert.equal((await db.query("select public from storage.buckets where id='carenect-private'")).rows[0].public,false);
  });
 }finally{await db.close();}
});
