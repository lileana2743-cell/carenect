import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabase/server';
import {safeReturnTo} from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url),code=url.searchParams.get('code');
 const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||url.origin;
 if(code){const client=await supabaseServer();const {error}=await client.auth.exchangeCodeForSession(code);if(!error){const r=NextResponse.redirect(new URL(safeReturnTo(url.searchParams.get('next')),origin));r.headers.set('Cache-Control','private, no-store');return r;}}
 return NextResponse.redirect(new URL('/auth?error=confirmation',origin));
}
