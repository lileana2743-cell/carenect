import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseConfig,authCookieOptions} from './lib/supabase/config';
export async function proxy(request:NextRequest){
 if(process.env.DATA_BACKEND!=='supabase')return NextResponse.next();
 // Public client views contain sample content only. Personal data stays behind API auth and RLS.
 if(!request.cookies.getAll().some(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name)))return NextResponse.next();
 let response=NextResponse.next({request});
 try{
  const {url,key}=supabaseConfig();
  const client=createServerClient(url,key,{cookieOptions:authCookieOptions,
   global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(25000)})},
   cookies:{getAll:()=>request.cookies.getAll(),setAll(values,headers){
    for(const {name,value} of values)request.cookies.set(name,value);
    response=NextResponse.next({request});
    for(const {name,value,options} of values)response.cookies.set(name,value,{...options,...authCookieOptions});
    for(const [name,value] of Object.entries(headers))response.headers.set(name,value);
   }}
  });
  const {error}=await client.auth.getUser();
  if(error&&!([400,401,403].includes(error.status||0)||error.name==='AuthSessionMissingError'))throw Error('Auth unavailable');
  response.headers.set('Cache-Control','private, no-store');return response;
 }catch{return new NextResponse('Account service is temporarily unavailable. Please try again.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const config={matcher:['/','/senior/:path*','/caregiver/:path*','/family/:path*','/auth/:path*','/logout','/api/auth','/api/care','/api/media']};
