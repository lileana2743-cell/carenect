import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabase/server';
import {safeReturnTo} from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url),token_hash=url.searchParams.get('token_hash');
 const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||url.origin;
 if(token_hash&&url.searchParams.get('type')==='email'){
  const client=await supabaseServer(),{error}=await client.auth.verifyOtp({token_hash,type:'email'});
  if(!error){const r=NextResponse.redirect(new URL(safeReturnTo(url.searchParams.get('next')),origin));r.headers.set('Cache-Control','private, no-store');return r;}
 }
 return NextResponse.redirect(new URL('/auth?error=confirmation',origin));
}
