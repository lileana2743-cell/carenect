import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('cloud schema: private tables, server-only RPCs and atomic registration',async t=>{
 const pg=new PGlite();
 try{
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await pg.exec(await readFile('supabase/migrations/202611040001_carenect.sql','utf8'));
  const account={id:'11111111-1111-4111-8111-111111111111',email:'cloud@test.invalid',name:'Cloud test',password_hash:'a'.repeat(32)+':'+'b'.repeat(128),role:'family',created:new Date().toISOString()};
  const records=[{id:'record-one',kind:'profile',content:{name:'Cloud test',role:'family'},created:account.created}];
  await pg.exec('SET ROLE service_role;');
  await pg.query('SELECT public.carenect_create_account($1::jsonb,$2::jsonb)',[JSON.stringify(account),JSON.stringify(records)]);
  await t.test('account and records are created together and belong to their owner',async()=>{
   assert.equal((await pg.query('SELECT id FROM public.carenect_accounts')).rows.length,1);
   const rows=(await pg.query('SELECT owner,content FROM public.carenect_records')).rows;assert.equal(rows.length,1);assert.equal(rows[0].owner,account.id);assert.equal(rows[0].content.name,'Cloud test');
  });
  await t.test('a bad seed record rolls back account creation',async()=>{
   const bad={...account,id:'22222222-2222-4222-8222-222222222222',email:'rollback@test.invalid'};
   await assert.rejects(pg.query('SELECT public.carenect_create_account($1::jsonb,$2::jsonb)',[JSON.stringify(bad),JSON.stringify([{...records[0],id:'record-bad',kind:'unknown-kind'}])]));
   assert.equal((await pg.query('SELECT id FROM public.carenect_accounts WHERE email=$1',[bad.email])).rows.length,0);
  });
  await t.test('authentication limits are atomic, expire and return a boolean',async()=>{
   for(let i=0;i<10;i++)assert.equal((await pg.query('SELECT public.carenect_auth_attempt($1,$2) AS allowed',['c'.repeat(64),1000000])).rows[0].allowed,true);
   assert.equal((await pg.query('SELECT public.carenect_auth_attempt($1,$2) AS allowed',['c'.repeat(64),1000001])).rows[0].allowed,false);
   assert.equal((await pg.query('SELECT public.carenect_auth_attempt($1,$2) AS allowed',['c'.repeat(64),2000001])).rows[0].allowed,true);
  });
  await pg.exec('RESET ROLE;');
  await t.test('public and authenticated API roles cannot read private records or invoke registration RPC',async()=>{
   for(const role of ['anon','authenticated']){
    await pg.exec('SET ROLE '+role);
    await assert.rejects(pg.query('SELECT * FROM public.carenect_accounts'));
    await assert.rejects(pg.query('SELECT * FROM public.carenect_records'));
    await assert.rejects(pg.query('SELECT public.carenect_auth_attempt($1,$2)',['d'.repeat(64),1000]));
    await pg.exec('RESET ROLE;');
   }
  });
 }finally{await pg.close();}
});
