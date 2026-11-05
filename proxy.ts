import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseConfig,authCookieOptions} from './lib/supabase/config';
export async function proxy(request:NextRequest){
 if(process.env.DATA_BACKEND!=='supabase')return NextResponse.next();
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
  const {data,error}=await client.auth.getUser();
  if(error&&!([400,401,403].includes(error.status||0)||error.name==='AuthSessionMissingError'))throw Error('Auth unavailable');
  if(/^\/(senior|caregiver|family)(\/|$)/.test(request.nextUrl.pathname)&&!data.user){
   const login=new URL('/auth',request.url);login.searchParams.set('return_to',request.nextUrl.pathname+request.nextUrl.search);
   const redirect=NextResponse.redirect(login);for(const c of response.cookies.getAll())redirect.cookies.set(c);
   redirect.headers.set('Cache-Control','private, no-store');return redirect;
  }
  response.headers.set('Cache-Control','private, no-store');return response;
 }catch{return new NextResponse('Account service is temporarily unavailable. Please try again.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const config={matcher:['/','/senior/:path*','/caregiver/:path*','/family/:path*','/auth/:path*','/logout','/api/auth','/api/care','/api/media']};
