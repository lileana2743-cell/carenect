import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { database } from '@/lib/care-db';
import {cloudAccounts,cloudEnabled} from '@/lib/cloud-store';
import { seedRecords, today } from '@/lib/care-data';
import { boundedBody } from '@/lib/request-body';
import { authAttemptAllowed, createSession, getUser, passwordHash, passwordMatches, requestOriginValid, revokeSession, safeReturnTo, sessionCookie, sessionSeconds } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() { return reply({ user: await getUser() }); }
export async function POST(req: Request) {
 if (!requestOriginValid(req)) return reply({ error: 'Invalid request origin.' }, 403);
 if (!req.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Use JSON.' }, 415);
 let raw: string; try { raw = new TextDecoder().decode(await boundedBody(req, 4096)); } catch { return reply({ error: 'The form is too long.' }, 413); }
 let body; try { body = JSON.parse(raw); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); } catch { return reply({ error: 'Invalid form.' }, 400); }
 if (body.action === 'logout') {
  await revokeSession((await cookies()).get(sessionCookie)?.value);
  const r = reply({ ok: true }); r.cookies.set(sessionCookie, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }); return r;
 }
 const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
 const password = typeof body.password === 'string' ? body.password : '';
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) return reply({ error: 'Enter a valid email and a password of 12–128 characters.' }, 400);
 if (!['login', 'register'].includes(body.action)) return reply({ error: 'Invalid action.' }, 400);
 if (!await authAttemptAllowed(email)) return reply({ error: 'Too many attempts. Please try again in 15 minutes.' }, 429);
 const remote=cloudEnabled(),db=remote?null:database();
 let account = remote?await cloudAccounts.find(email):db!.prepare('SELECT id, password_hash, role FROM accounts WHERE email=?').get(email) as { id: string; password_hash: string; role: string } | undefined;
 if (body.action === 'register') {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 60 || !['senior', 'caregiver', 'family'].includes(body.role)) return reply({ error: 'Enter your name and choose a client.' }, 400);
  if (account) return reply({ error: 'Could not create this account. Try signing in instead.' }, 409);
  const id = crypto.randomUUID(), hash = await passwordHash(password);
  const created=new Date().toISOString(),records=[...seedRecords(today()).map(r=>({id:id+':'+r.id,owner:id,kind:r.kind,content:r.content,created})),{id:crypto.randomUUID(),owner:id,kind:'profile',content:{name,role:body.role},created}];
  if(remote){
   try{await cloudAccounts.create({id,email,name,password_hash:hash,role:body.role,created},records);}
   catch(e){return reply({error:e instanceof Error&&e.message==='ACCOUNT_EXISTS'?'Could not create this account. Try signing in instead.':'Could not create your account. Please try again.'},e instanceof Error&&e.message==='ACCOUNT_EXISTS'?409:503);}
  }else{
   db!.exec('BEGIN IMMEDIATE');
   try {
    db!.prepare('INSERT INTO accounts(id,email,name,password_hash,role,created) VALUES(?,?,?,?,?,?)').run(id, email, name, hash, body.role, created);
    for(const record of records)db!.prepare('INSERT INTO care_records(id,owner,kind,content,created) VALUES(?,?,?,?,?)').run(record.id,id,record.kind,JSON.stringify(record.content),record.created);
    db!.exec('COMMIT');
   } catch { db!.exec('ROLLBACK'); return reply({ error: 'Could not create this account. Try signing in instead.' }, 409); }
  }
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
