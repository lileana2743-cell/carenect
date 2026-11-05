import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { database } from '@/lib/care-db';
import {cloudEnabled} from '@/lib/cloud-store';
import {supabaseServer} from '@/lib/supabase/server';
import { seedRecords, today } from '@/lib/care-data';
import { boundedBody } from '@/lib/request-body';
import { authAttemptAllowed, createSession, getUser, passwordHash, passwordMatches, requestOriginValid, revokeSession, safeReturnTo, sessionCookie, sessionSeconds } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() { try{return reply({ user: await getUser() });}catch{return reply({error:'Account service is temporarily unavailable.'},503);} }
export async function POST(req: Request) {
 if (!requestOriginValid(req)) return reply({ error: 'Invalid request origin.' }, 403);
 if (!req.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Use JSON.' }, 415);
 let raw: string; try { raw = new TextDecoder().decode(await boundedBody(req, 4096)); } catch { return reply({ error: 'The form is too long.' }, 413); }
 let body; try { body = JSON.parse(raw); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); } catch { return reply({ error: 'Invalid form.' }, 400); }
 if (body.action === 'logout') {
  if(cloudEnabled()){
   const client=await supabaseServer(),{error}=await client.auth.signOut({scope:'local'});
   return error?reply({error:'Could not sign out. Please try again.'},503):reply({ok:true});
  }
  await revokeSession((await cookies()).get(sessionCookie)?.value);
  const r = reply({ ok: true }); r.cookies.set(sessionCookie, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }); return r;
 }
 const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
 const password = typeof body.password === 'string' ? body.password : '';
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) return reply({ error: 'Enter a valid email and a password of 12–128 characters.' }, 400);
 if (!['login', 'register'].includes(body.action)) return reply({ error: 'Invalid action.' }, 400);
 if(cloudEnabled()){
  try{
   const client=await supabaseServer();
   if(body.action==='register'){
    const name=typeof body.name==='string'?body.name.trim():'';
    if(!name||name.length>60||!['senior','caregiver','family'].includes(body.role))return reply({error:'Enter your name and choose a client.'},400);
    const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||new URL(req.url).origin;
    const destination=body.returnTo?safeReturnTo(body.returnTo):'/'+body.role;
    const {data,error}=await client.auth.signUp({email,password,options:{data:{name,preferred_client:body.role},emailRedirectTo:origin+'/auth/callback?next='+encodeURIComponent(destination)}});
    if(error)return reply({error:error.status===429?'Too many attempts. Please try again later.':'Could not create your account. Check your email settings or try signing in.'},error.status===429?429:400);
    if(!data.session)return reply({ok:true,confirmationRequired:true,message:'Check your email to confirm your account, then sign in. If you already have an account, sign in instead.'});
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error)return reply({error:error.status===429?'Too many attempts. Please try again later.':'Email or password is incorrect, or the email has not been confirmed.'},error.status===429?429:401);
   }
   const account=await getUser();if(!account)return reply({error:'Could not verify your account. Please sign in again.'},401);
   return reply({ok:true,returnTo:body.returnTo?safeReturnTo(body.returnTo):'/'+account.role});
  }catch{return reply({error:'Account service is temporarily unavailable. Please try again.'},503);}
 }
 if (!await authAttemptAllowed(email)) return reply({ error: 'Too many attempts. Please try again in 15 minutes.' }, 429);
 const db=database();
 let account = db.prepare('SELECT id, password_hash, role FROM accounts WHERE email=?').get(email) as { id: string; password_hash: string; role: string } | undefined;
 if (body.action === 'register') {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 60 || !['senior', 'caregiver', 'family'].includes(body.role)) return reply({ error: 'Enter your name and choose a client.' }, 400);
  if (account) return reply({ error: 'Could not create this account. Try signing in instead.' }, 409);
  const id = crypto.randomUUID(), hash = await passwordHash(password);
  const created=new Date().toISOString(),records=[...seedRecords(today()).map(r=>({id:id+':'+r.id,owner:id,kind:r.kind,content:r.content,created})),{id:crypto.randomUUID(),owner:id,kind:'profile',content:{name,role:body.role},created}];
   db!.exec('BEGIN IMMEDIATE');
   try {
    db!.prepare('INSERT INTO accounts(id,email,name,password_hash,role,created) VALUES(?,?,?,?,?,?)').run(id, email, name, hash, body.role, created);
    for(const record of records)db!.prepare('INSERT INTO care_records(id,owner,kind,content,created) VALUES(?,?,?,?,?)').run(record.id,id,record.kind,JSON.stringify(record.content),record.created);
    db!.exec('COMMIT');
   } catch { db!.exec('ROLLBACK'); return reply({ error: 'Could not create this account. Try signing in instead.' }, 409); }
  account = { id, password_hash: hash, role: body.role };
 } else {
  // Perform a real scrypt calculation for an unknown address too.
  const hash = account?.password_hash || '0'.repeat(32) + ':' + '0'.repeat(128);
  const matches = await passwordMatches(password, hash);
  if (!account || !matches) return reply({ error: 'Email or password is incorrect.' }, 401);
 }
 const r = reply({ ok: true, returnTo: body.returnTo ? safeReturnTo(body.returnTo) : '/' + account!.role });
 r.cookies.set(sessionCookie, await createSession(account!.id), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: sessionSeconds });
 return r;
}
