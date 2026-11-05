import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
const origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,DATA_BACKEND:'supabase',NODE_ENV:'production',APP_ORIGIN:origin,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
try{
 let healthy=false;for(let i=0;i<100;i++){try{const r=await fetch(origin+'/api/health');if(r.ok){healthy=true;break;}}catch{}if(server.exitCode!==null)throw Error('Server exited before checks');await new Promise(r=>setTimeout(r,200));}assert.ok(healthy,'Real Supabase health must pass');
 for(const path of ['/senior','/caregiver','/family']){const r=await fetch(origin+path+'?screen=mine',{redirect:'manual'});assert.equal(r.status,307);const u=new URL(r.headers.get('location'),origin);assert.equal(u.pathname,'/auth');assert.equal(u.searchParams.get('return_to'),path+'?screen=mine');assert.match(r.headers.get('cache-control'),/no-store/);}
 assert.equal((await fetch(origin+'/api/care')).status,401);
 assert.equal((await fetch(origin+'/api/media?id=missing')).status,401);
 assert.equal((await fetch(origin+'/api/care',{headers:{'oai-authenticated-user-id':'spoof'}})).status,401);
 const login=await fetch(origin+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'login',email:'not-a-user-'+Date.now()+'@example.invalid',password:'Invalid-cloud-login-123!'})});assert.equal(login.status,401,'Real Auth must reject wrong credentials');
 const confirmation=await fetch(origin+'/auth/confirm?token_hash=invalid&type=email&next=https%3A%2F%2Fevil.invalid',{redirect:'manual'});assert.equal(confirmation.status,307);assert.equal(new URL(confirmation.headers.get('location'),origin).origin,origin);assert.equal(new URL(confirmation.headers.get('location'),origin).pathname,'/auth');
 const user=await fetch(origin+'/api/auth');assert.equal(user.status,200);assert.deepEqual(await user.json(),{user:null});
 console.log('PASS: real cloud health, protected three-client redirects, anonymous APIs, spoofed identity rejection, wrong-password rejection and invalid confirmation-link handling. No users created and no email sent.');
}finally{if(server.exitCode===null){const stopped=once(server,'exit');server.kill();await stopped;}}
