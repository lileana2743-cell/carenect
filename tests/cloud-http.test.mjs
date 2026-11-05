import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

test('cloud HTTP boundary scopes private operations and preserves account data',async()=>{
 // A short non-credential test value; the transport is replaced below.
 const original=globalThis.fetch,requests=[];
 globalThis.fetch=async(input,init)=>{const url=new URL(String(input));requests.push({url,init});if(url.pathname.endsWith('/carenect_records')&&url.searchParams.get('select')==='content')return Response.json([{content:{type:'image/png'}}]);return Response.json([]);};
 try{
  const {cloudCareQuery}=await import('../lib/cloud-store.ts');
  // Inject a real SDK transport; production uses a fresh SSR client per request.
  const client=createClient('https://carenect-test.invalid','test-value',{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer test-user-token'}}});
  const owner='11111111-1111-4111-8111-111111111111',id='private-record?owner=eq.another';
  await cloudCareQuery('UPDATE care_records SET content = ? WHERE id = ? AND owner = ? AND kind = ?',[JSON.stringify({text:'Safe'}),id,owner,'message'],client);
  const update=requests.at(-1);assert.equal(update.init.method,'PATCH');assert.equal(update.url.searchParams.get('owner'),'eq.'+owner);assert.deepEqual(update.url.searchParams.getAll('owner'),['eq.'+owner]);assert.equal(update.url.searchParams.get('id'),'eq.'+id);assert.equal(update.url.searchParams.get('kind'),'eq.message');
  await cloudCareQuery('DELETE FROM care_records WHERE id = ? AND owner = ? AND kind = ?',[id,owner,'post'],client);assert.equal(requests.at(-1).url.searchParams.get('owner'),'eq.'+owner);
  const media=await cloudCareQuery('SELECT content FROM care_records WHERE id = ? AND owner = ? AND kind = ?',[id,owner,'media'],client);assert.equal(requests.at(-1).url.searchParams.get('owner'),'eq.'+owner);assert.deepEqual(JSON.parse(media.results[0].content),{type:'image/png'});
  const headers=new Headers(requests.at(-1).init.headers);assert.equal(headers.get('authorization'),'Bearer test-user-token');
 }finally{globalThis.fetch=original;}
});
