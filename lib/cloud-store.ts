import {createClient, type SupabaseClient} from '@supabase/supabase-js';

export function cloudEnabled() {
 const mode=process.env.DATA_BACKEND;
 if(mode && !['sqlite','supabase'].includes(mode))throw Error('Invalid data backend');
 if(process.env.RENDER==='true'&&!mode)throw Error('Choose an explicit persistent data backend');
 return mode==='supabase';
}
export async function cloudClient(){
 const {supabaseServer}=await import('./supabase/server');
 return await supabaseServer();
}
type Outcome<T>={data:T|null;error:{code?:string;message?:string}|null};
export async function cloudResult<T>(query:PromiseLike<Outcome<T>>):Promise<T>{
 const result=await query;
 if(result.error){if(result.error.code==='23505')throw Error('ACCOUNT_EXISTS');throw Error('Cloud data request failed');}
 return result.data as T;
}
export async function cloudCareQuery(sql:string,values:unknown[],client?:SupabaseClient){
 const db=client||await cloudClient(),table='carenect_records';
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
 if(sql.startsWith('INSERT')){await cloudInsertRecords([values],sql.startsWith('INSERT OR IGNORE'),db);return {meta:{changes:1}};}
 throw Error('Unsupported cloud data operation');
}
export async function cloudInsertRecords(records:unknown[][],ignoreDuplicates=false,client?:SupabaseClient){
 const db=client||await cloudClient();
 const rows=records.map(v=>({id:v[0],owner:v[1],kind:v[2],content:JSON.parse(String(v[3])),created:v[4]}));
 if(ignoreDuplicates)await cloudResult(db.from('carenect_records').upsert(rows,{onConflict:'id',ignoreDuplicates:true}));
 else await cloudResult(db.from('carenect_records').insert(rows));
}
export async function cloudHealth(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!key.startsWith('sb_publishable_'))throw Error('Cloud data storage is not configured');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})}});
 await cloudResult(db.from('carenect_profiles').select('id').limit(1));
}
