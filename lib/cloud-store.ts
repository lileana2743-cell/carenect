import {createClient, type SupabaseClient} from '@supabase/supabase-js';

export function cloudEnabled() {
 const mode=process.env.DATA_BACKEND;
 if(mode && !['sqlite','supabase'].includes(mode))throw Error('Invalid data backend');
 if(process.env.RENDER==='true'&&!mode)throw Error('Choose an explicit persistent data backend');
 return mode==='supabase';
}
let cached:SupabaseClient|undefined;
export function cloudClient(){
 if(cached)return cached;
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Cloud data storage is not configured');
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw Error('Use an HTTPS cloud database');
 if(key.startsWith('sb_publishable_'))throw Error('Use a server-side secret key');
 cached=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})}});
 return cached;
}
type Outcome<T>={data:T|null;error:{code?:string;message?:string}|null};
export async function cloudResult<T>(query:PromiseLike<Outcome<T>>):Promise<T>{
 const result=await query;
 if(result.error){if(result.error.code==='23505')throw Error('ACCOUNT_EXISTS');throw Error('Cloud data request failed');}
 return result.data as T;
}
export type StoredAccount={id:string;email:string;name:string;password_hash:string;role:string;created:string};
export const cloudAccounts={
 async find(email:string){const rows=await cloudResult(cloudClient().from('carenect_accounts').select('*').eq('email',email).limit(1));return rows[0] as StoredAccount|undefined;},
 async create(account:StoredAccount,records:Record<string,unknown>[]){await cloudResult(cloudClient().rpc('carenect_create_account',{p_account:account,p_records:records}));},
 async addSession(hash:string,id:string,expires:number){const db=cloudClient();await cloudResult(db.from('carenect_sessions').delete().lt('expires',Date.now()));await cloudResult(db.from('carenect_sessions').insert({token_hash:hash,account_id:id,expires}));},
 async revoke(hash:string){await cloudResult(cloudClient().from('carenect_sessions').delete().eq('token_hash',hash));},
 async user(hash:string){
  const rows=await cloudResult(cloudClient().from('carenect_sessions').select('account:carenect_accounts!inner(id,email,name,role)').eq('token_hash',hash).gt('expires',Date.now()).limit(1));
  return rows[0]?(rows[0] as unknown as {account:{id:string;email:string;name:string;role:string}}).account:null;
 },
 async attempt(key:string){return await cloudResult(cloudClient().rpc('carenect_auth_attempt',{p_key:key,p_now:Date.now()})) as boolean;},
};

export async function cloudCareQuery(sql:string,values:unknown[]){
 const db=cloudClient(),table='carenect_records';
 if(sql.startsWith('SELECT id, kind, content, created')){
  const rows:any[]=[];
  for(let offset=0;;offset+=1000){
   const page=await cloudResult(db.from(table).select('id,kind,content,created').eq('owner',values[0]).order('created').order('id').range(offset,offset+999));
   rows.push(...page.map(row=>({...row,content:JSON.stringify(row.content)})));if(page.length<1000)break;
  }
  return {results:rows};
 }
 if(sql.startsWith('SELECT content')||sql.startsWith('SELECT id FROM')){
  const columns=sql.startsWith('SELECT content')?'content':'id';
  const rows=await cloudResult(db.from(table).select(columns).eq('id',values[0]).eq('owner',values[1]).eq('kind',values[2]).limit(1));
  return {results:rows.map((row:any)=>row.content?{...row,content:JSON.stringify(row.content)}:row)};
 }
 if(sql.startsWith('UPDATE care_records')){
  const rows=await cloudResult(db.from(table).update({content:JSON.parse(String(values[0]))}).eq('id',values[1]).eq('owner',values[2]).eq('kind',values[3]).select('id'));
  return {meta:{changes:rows.length}};
 }
 if(sql.startsWith('DELETE FROM care_records')){
  const rows=await cloudResult(db.from(table).delete().eq('id',values[0]).eq('owner',values[1]).eq('kind',values[2]).select('id'));
  return {meta:{changes:rows.length}};
 }
 if(sql.startsWith('INSERT')){await cloudInsertRecords([values],sql.startsWith('INSERT OR IGNORE'));return {meta:{changes:1}};}
 throw Error('Unsupported cloud data operation');
}
export async function cloudInsertRecords(records:unknown[][],ignoreDuplicates=false){
 const rows=records.map(v=>({id:v[0],owner:v[1],kind:v[2],content:JSON.parse(String(v[3])),created:v[4]}));
 if(ignoreDuplicates)await cloudResult(cloudClient().from('carenect_records').upsert(rows,{onConflict:'id',ignoreDuplicates:true}));
 else await cloudResult(cloudClient().from('carenect_records').insert(rows));
}
export async function cloudHealth(){await cloudResult(cloudClient().from('carenect_accounts').select('id').limit(1));}
