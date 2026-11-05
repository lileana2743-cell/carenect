import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {cache} from 'react';
import {supabaseConfig,authCookieOptions} from './config';
// A client belongs to one request. Never cache a signed-in client globally.
export const supabaseServer=cache(async()=>{
 const {url,key}=supabaseConfig(),jar=await cookies();
 return createServerClient(url,key,{
  cookieOptions:authCookieOptions,
  global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(25000)})},
  cookies:{getAll:()=>jar.getAll(),setAll(values){
   try{for(const {name,value,options} of values)jar.set(name,value,{...options,...authCookieOptions});}
   catch{/* Server Components cannot write cookies; proxy.ts handles refresh. */}
  }}
 });
});
