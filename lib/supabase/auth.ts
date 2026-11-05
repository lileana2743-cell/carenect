import {cache} from 'react';
import {supabaseServer} from './server';
import {seedRecords,today} from '../care-data';
// These are display preferences, never staff permissions or JWT authorization.
const clientRole=(value:unknown)=>['senior','caregiver','family'].includes(String(value))?String(value):'senior';
export const supabaseUser=cache(async()=>{
 const client=await supabaseServer();
 const {data:{user},error}=await client.auth.getUser();
 if(error){if([400,401,403].includes(error.status||0)||error.name==='AuthSessionMissingError')return null;throw Error('Account service is unavailable');}
 if(!user)return null;
 let profile=await client.from('carenect_profiles').select('id,name,role').eq('id',user.id).maybeSingle();
 if(profile.error)throw Error('Could not load your profile');
 if(!profile.data){
  const name=String(user.user_metadata?.name||user.email?.split('@')[0]||'Carenect member').trim().slice(0,60)||'Carenect member';
  const role=clientRole(user.user_metadata?.preferred_client);
  const created=new Date().toISOString(),records:Array<{id:string;kind:string;content:Record<string,unknown>;created:string}>=seedRecords(today()).map(r=>({id:user.id+':'+r.id,kind:r.kind,content:r.content,created}));
  records.push({id:user.id+':profile',kind:'profile',content:{name,role},created});
  const initialized=await client.rpc('carenect_initialize',{p_name:name,p_role:role,p_records:records});
  if(initialized.error)throw Error('Could not initialize your care circle');
  profile=await client.from('carenect_profiles').select('id,name,role').eq('id',user.id).single();
 }
 if(profile.error||!profile.data)throw Error('Could not load your profile');
 return {...profile.data,email:user.email||''} as {id:string;name:string;email:string;role:string};
});
