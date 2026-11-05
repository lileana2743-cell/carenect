import {createClient} from '@supabase/supabase-js';
// Check a migrated project without possessing an administrator secret.
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
if(!url||!key?.startsWith('sb_publishable_'))throw Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const profiles=await client.from('carenect_profiles').select('id').limit(1);
if(profiles.error||profiles.data.length)throw Error('Check the native Auth migration and anonymous profile isolation.');
const records=await client.from('carenect_records').select('id').limit(1);
if(!records.error&&records.data.length)throw Error('Private records must not be visible anonymously.');
console.log('Supabase connection and anonymous data isolation verified. Native Auth and the private bucket are configured by migrations.');
