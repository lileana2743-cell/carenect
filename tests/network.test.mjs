import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {existsSync} from 'node:fs';

test('independent accounts, cross-device data, uploads and restart persistence', { timeout: 120000 }, async t => {
 const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(r => socket.close(r));
 const origin = `http://127.0.0.1:${port}`, dir = await mkdtemp(path.join(os.tmpdir(), 'carenect-test-'));
 let server, output = '';
 const start = async (missingCloud=false) => {
  const env={ ...process.env, NODE_ENV: 'production', RENDER_EXTERNAL_URL: origin, DATA_BACKEND:missingCloud?'supabase':'sqlite', DATA_DIR: missingCloud?path.join(dir,'no-local-fallback'):dir, NEXT_TELEMETRY_DISABLED: '1' };delete env.APP_ORIGIN;if(missingCloud){env.SUPABASE_URL='';env.SUPABASE_PUBLISHABLE_KEY='';delete env.SUPABASE_SECRET_KEY;delete env.SUPABASE_SERVICE_ROLE_KEY;}
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { env, stdio: ['ignore','pipe','pipe'] });
  server.stdout.on('data', x => output += x); server.stderr.on('data', x => output += x);
  for (let i = 0; i < 150; i++) { try { const r=await fetch(origin + '/api/health');if(missingCloud?r.status===503:r.ok)return; } catch {} if(server.exitCode !== null) throw Error(output); await new Promise(r => setTimeout(r, 200)); }
  throw Error('Server did not start: ' + output);
 };
 const stop = async () => { if (server && server.exitCode === null) { const closed=once(server,'exit');server.kill();await closed; } };
 const request = async (url, body, cookie, headers={}) => fetch(origin + url, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type':'application/json', Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
 const password = 'Carenect-integration-test-123!';
 try {
  await start();
  await t.test('guests open all three sample clients while private account APIs stay protected', async()=>{
   for(const role of ['senior','caregiver','family']) { const r=await fetch(origin+'/'+role+'?screen=chats',{redirect:'manual'});assert.equal(r.status,200);assert.ok((await r.text()).includes('Carenect')); }
   assert.equal((await request('/api/care')).status,401);
   assert.equal((await request('/api/care',null,null,{'oai-authenticated-user-id':'spoof','oai-authenticated-user-email':'spoof@test.invalid'})).status,401);
   assert.equal((await request('/original/music-icon.png')).status,200);
   assert.equal((await request('/original/restaurant-icon.png')).status,200);
   assert.equal((await request('/original/sculpture.webp')).status,200);
  });
  const register=await request('/api/auth',{action:'register',email:'owner@test.invalid',password,name:'Test owner',role:'family'});assert.equal(register.status,200);const owner=register.headers.get('set-cookie').split(';')[0];assert.match(register.headers.get('set-cookie'),/HttpOnly/i);assert.match(register.headers.get('set-cookie'),/SameSite=Lax/i);
  const ownerRecords=(await (await request('/api/care',null,owner)).json()).records;assert.ok(ownerRecords.some(r=>r.kind==='task'));assert.ok(ownerRecords.some(r=>r.kind==='profile'));
  const login=await request('/api/auth',{action:'login',email:'owner@test.invalid',password,returnTo:'https://malicious.invalid/'});assert.equal(login.status,200);assert.equal((await login.json()).returnTo,'/senior');const device=login.headers.get('set-cookie').split(';')[0];assert.notEqual(device,owner);
  const proxyLogin=await request('/api/auth',{action:'login',email:'owner@test.invalid',password},null,{Host:'internal.render.local'});assert.equal(proxyLogin.status,200);
  let saved;
  await t.test('one account saves in Family and reads in another device/client',async()=>{
   const r=await request('/api/care',{kind:'message',content:{thread:'care',role:'family',sender:'Son',time:'08:30',text:'Cross-device care message'}},owner);assert.equal(r.status,201);saved=(await r.json()).record;
   const list=(await (await request('/api/care',null,device)).json()).records;assert.ok(list.some(r=>r.id===saved.id&&r.content.text==='Cross-device care message'));
   const task=ownerRecords.find(r=>r.kind==='task');assert.equal((await request('/api/care',{kind:'task',id:task.id,content:{...task.content,done:true}},device)).status,200);
  });
  const otherResponse=await request('/api/auth',{action:'register',email:'other@test.invalid',password,name:'Other account',role:'caregiver'});assert.equal(otherResponse.status,200);const other=otherResponse.headers.get('set-cookie').split(';')[0];
  await t.test('account isolation, CSRF rejection, password checks and JSON limits',async()=>{
   const list=(await (await request('/api/care',null,other)).json()).records;assert.ok(!list.some(r=>r.id===saved.id));
   assert.equal((await request('/api/care',{kind:'message',id:saved.id,content:saved.content},other)).status,404);
   assert.equal((await request('/api/care',{kind:'message',content:saved.content},owner,{Origin:'https://malicious.invalid'})).status,403);
   assert.equal((await request('/api/auth',{action:'login',email:'owner@test.invalid',password:'Incorrect-password-123'})).status,401);
   assert.equal((await request('/api/auth',{action:'register',email:'bad@test.invalid',password:'123',name:'Bad',role:'senior'})).status,400);
   assert.equal((await request('/api/auth',{action:'login',padding:'x'.repeat(5000)})).status,413);
   assert.equal((await request('/api/care',{kind:'message',content:{...saved.content,text:'x'.repeat(18000)}},owner)).status,413);
   const db=new DatabaseSync(path.join(dir,'carenect.sqlite'));const row=db.prepare('SELECT password_hash FROM accounts WHERE email=?').get('owner@test.invalid');assert.ok(!row.password_hash.includes(password));assert.match(row.password_hash,/^[a-f0-9]{32}:[a-f0-9]{128}$/);db.close();
  });
  let media;
  await t.test('photo persists outside public assets and is scoped to account',async()=>{
   const png=await readFile('public/original/music-icon.png');const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'photo.png');
   const r=await fetch(origin+'/api/media',{method:'POST',headers:{Cookie:owner,Origin:origin},body:form});assert.equal(r.status,201);media=await r.json();
   const image=await request(media.url,null,device);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
   assert.equal((await request(media.url,null,other)).status,404);
   const fake=new FormData();fake.set('file',new Blob(['not an image'],{type:'image/png'}),'fake.png');assert.equal((await fetch(origin+'/api/media',{method:'POST',headers:{Cookie:owner,Origin:origin},body:fake})).status,400);
   assert.equal((await request('/api/care',{kind:'post',content:{title:'Photo story',text:'Photo saved from family',author:'Son',photo:'none',likes:0,media:media.id,mediaType:'image/png'}},owner)).status,201);
  });
  await stop();await start();
  await t.test('saved records, photo and login survive server restart',async()=>{
   const list=(await (await request('/api/care',null,device)).json()).records;assert.ok(list.some(r=>r.id===saved.id));assert.equal((await request(media.url,null,device)).status,200);
   assert.equal((await request('/api/auth',{action:'logout'},owner)).status,200);assert.equal((await request('/api/care',null,owner)).status,401);assert.equal((await request('/api/care',null,device)).status,200);
  });
  await stop();await start(true);
  await t.test('cloud mode fails safely instead of writing to an ephemeral local database',async()=>{
   assert.equal((await request('/api/health')).status,503);
   assert.equal(existsSync(path.join(dir,'no-local-fallback','carenect.sqlite')),false);
  });
 } finally { await stop(); }
});
