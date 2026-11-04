import test from 'node:test';
import assert from 'node:assert/strict';

test('cloud HTTP boundary scopes private operations and preserves account data',async()=>{
 // A short non-credential test value; the transport is replaced below.
 process.env.DATA_BACKEND='supabase';process.env.SUPABASE_URL='https://carenect-test.invalid';process.env.SUPABASE_SECRET_KEY='test-value';
 const original=globalThis.fetch,requests=[];
 globalThis.fetch=async(input,init)=>{const url=new URL(String(input));requests.push({url,init});if(url.pathname.endsWith('/carenect_sessions')&&(!init?.method||init.method==='GET'))return Response.json([{account:{id:'owner',email:'test@example.invalid',name:'Test',role:'family'}}]);if(url.pathname.endsWith('/carenect_records')&&url.searchParams.get('select')==='content')return Response.json([{content:{type:'image/png'}}]);return Response.json([]);};
 try{
  const {cloudAccounts,cloudCareQuery}=await import('../lib/cloud-store.ts');
  const owner='11111111-1111-4111-8111-111111111111',id='private-record?owner=eq.another';
  await cloudCareQuery('UPDATE care_records SET content = ? WHERE id = ? AND owner = ? AND kind = ?',[JSON.stringify({text:'Safe'}),id,owner,'message']);
  const update=requests.at(-1);assert.equal(update.init.method,'PATCH');assert.equal(update.url.searchParams.get('owner'),'eq.'+owner);assert.deepEqual(update.url.searchParams.getAll('owner'),['eq.'+owner]);assert.equal(update.url.searchParams.get('id'),'eq.'+id);assert.equal(update.url.searchParams.get('kind'),'eq.message');
  await cloudCareQuery('DELETE FROM care_records WHERE id = ? AND owner = ? AND kind = ?',[id,owner,'post']);assert.equal(requests.at(-1).url.searchParams.get('owner'),'eq.'+owner);
  const media=await cloudCareQuery('SELECT content FROM care_records WHERE id = ? AND owner = ? AND kind = ?',[id,owner,'media']);assert.equal(requests.at(-1).url.searchParams.get('owner'),'eq.'+owner);assert.deepEqual(JSON.parse(media.results[0].content),{type:'image/png'});
  const user=await cloudAccounts.user('a'.repeat(64));assert.deepEqual(user,{id:'owner',email:'test@example.invalid',name:'Test',role:'family'});assert.equal(requests.at(-1).url.searchParams.get('token_hash'),'eq.'+'a'.repeat(64));assert.ok(requests.at(-1).url.searchParams.get('expires').startsWith('gt.'));
 }finally{globalThis.fetch=original;delete process.env.DATA_BACKEND;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;}
});
