export function supabaseConfig() {
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error('Supabase Auth is not configured');
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw Error('Use HTTPS for Supabase');
 if(!key.startsWith('sb_publishable_'))throw Error('Use a Supabase publishable key');
 return {url,key};
}
export const authCookieOptions={httpOnly:true,sameSite:'lax' as const,path:'/',secure:process.env.NODE_ENV==='production'};
