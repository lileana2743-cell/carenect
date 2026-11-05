import { cookies } from 'next/headers';
import { randomBytes, createHash, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from './care-db';
import {cloudEnabled} from './cloud-store';
const scrypt = promisify(nodeScrypt);
export const sessionCookie = 'carenect_session';
export const sessionSeconds = 60 * 60 * 24 * 30;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export type Account = { id: string; email: string; name: string; role: string };
export async function passwordHash(password: string) {
 const salt = randomBytes(16).toString('hex');
 const result = await scrypt(password, salt, 64) as Buffer;
 return salt + ':' + result.toString('hex');
}
export async function passwordMatches(password: string, encoded: string) {
 const [salt, hash] = encoded.split(':');
 const result = await scrypt(password, salt, 64) as Buffer;
 const expected = Buffer.from(hash, 'hex');
 return expected.length === result.length && timingSafeEqual(expected, result);
}
export async function createSession(id: string) {
 const token = randomBytes(32).toString('base64url');
 if(cloudEnabled())throw Error('Use Supabase Auth for cloud sessions');
 const db = database();
 db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
 db.prepare('INSERT INTO sessions(token_hash, account_id, expires) VALUES (?, ?, ?)').run(digest(token), id, Date.now() + sessionSeconds * 1000);
 return token;
}
export async function revokeSession(token?: string) { if(token)database().prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token)); }
export async function getUser(): Promise<Account | null> {
 if(cloudEnabled()){
  if(!(await cookies()).getAll().some(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name)))return null;
  const {supabaseUser}=await import('./supabase/auth');return await supabaseUser();
 }
 const token = (await cookies()).get(sessionCookie)?.value;
 if (!token || token.length > 100) return null;
 return database().prepare('SELECT a.id, a.email, a.name, a.role FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now()) as Account | undefined || null;
}
export function safeReturnTo(value: unknown) {
 if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/senior';
 try { const u = new URL(value, 'https://local.test'); return u.origin === 'https://local.test' && !u.pathname.startsWith('/api/') ? u.pathname + u.search : '/senior'; } catch { return '/senior'; }
}
export function requestOriginValid(req: Request) {
 const expected = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || new URL(req.url).origin;
 return req.headers.get('origin') === expected;
}
export async function authAttemptAllowed(email: string) {
 if(cloudEnabled())throw Error('Supabase Auth enforces cloud authentication rate limits');
 // A database counter survives process restarts. Unknown and real accounts use the same limit.
 const db = database(), now = Date.now(), key = digest(email);
 db.prepare('DELETE FROM auth_limits WHERE expires < ?').run(now);
 const row = db.prepare('SELECT attempts FROM auth_limits WHERE key=?').get(key) as { attempts: number } | undefined;
 if (row && row.attempts >= 10) return false;
 db.prepare('INSERT INTO auth_limits(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key, now + 15 * 60 * 1000);
 return true;
}
