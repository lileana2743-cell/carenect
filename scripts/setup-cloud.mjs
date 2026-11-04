import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Set server-side SUPABASE_URL and SUPABASE_SECRET_KEY. Never paste keys into chat or source control.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const health=await client.from('carenect_accounts').select('id').limit(1);
if(health.error)throw Error('Apply the Carenect SQL migration to this project before configuring storage.');
const bucket='carenect-private',existing=await client.storage.getBucket(bucket);
if(existing.data){
 if(existing.data.public)throw Error('The Carenect media bucket must be private. Review its configuration before continuing.');
 console.log('Carenect database and private media bucket are available.');
}else{
 if(String(existing.error?.statusCode)!=='404'&&String(existing.error?.statusCode)!=='400')throw Error('Could not inspect cloud photo storage.');
 const result=await client.storage.createBucket(bucket,{public:false,fileSizeLimit:20*1024*1024,allowedMimeTypes:['image/jpeg','image/png','image/webp','video/mp4','video/webm']});
 if(result.error)throw Error('Could not create private photo storage.');
 console.log('Created the private Carenect media bucket. No public access was granted.');
}
