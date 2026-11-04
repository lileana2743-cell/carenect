'use client';
import { useState } from 'react';
export default function AuthForm({ register, returnTo, role = 'senior' }: { register: boolean; returnTo?: string; role?: string }) {
 const [error, setError] = useState(''), [busy, setBusy] = useState(false);
 return <><a className="auth-back" href="/">← Carenect</a><h1>{register ? 'Let’s Sign you up.' : 'Welcome back.'}</h1><p>{register ? 'Care, connected. Your own Carenect account.' : 'Sign in to your care circle.'}</p><form className="care-form" onSubmit={async e => {
  e.preventDefault(); setError(''); setBusy(true);
  const data = Object.fromEntries(new FormData(e.currentTarget));
  if (register && data.password !== data.confirm) { setError('Passwords do not match.'); setBusy(false); return; }
  try { const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, action: register ? 'register' : 'login', returnTo }) }); const result = await r.json(); if (!r.ok) throw new Error(result.error); location.assign(result.returnTo); }
  catch (e) { setError(e instanceof Error ? e.message : 'Could not connect. Please try again.'); setBusy(false); }
 }}>
 {register && <><label>Your name<input name="name" required maxLength={60} autoComplete="name" /></label><label>I am a<select name="role" defaultValue={['senior','caregiver','family'].includes(role) ? role : 'senior'}><option value="senior">Senior</option><option value="caregiver">Caregiver</option><option value="family">Family</option></select></label></>}
 <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
 <label>Password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} /></label>
 {register && <label>Confirm password<input name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>}
 {error && <p className="auth-error" role="alert">{error}</p>}
 <button className="pill-button lime" disabled={busy}>{busy ? 'Please wait…' : register ? 'SIGN UP' : 'LOGIN'}</button>
 </form><p><a href={'/auth?mode=' + (register ? 'login' : 'register') + (returnTo ? '&return_to=' + encodeURIComponent(returnTo) : '')}>{register ? 'Already have an account? Sign in' : 'New to Carenect? Create an account'}</a></p><small>Your account syncs across devices. Keep your password safe; email recovery is not configured yet.</small></>;
}
