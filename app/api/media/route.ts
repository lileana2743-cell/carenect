import { mediaStore } from '@/lib/media-store';
import { getUser, requestOriginValid } from '@/lib/auth';
import { careDb } from '@/lib/care-db';
import { boundedBody } from '@/lib/request-body';
export const dynamic='force-dynamic';
const result=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 const owner=(await getUser())?.id;if(!owner)return result({error:'Please sign in to upload a photo.'},401);
 if(!requestOriginValid(req))return result({error:'Invalid request origin'},403);
 if(Number(req.headers.get('content-length')||0)>21*1024*1024)return result({error:'Choose a file smaller than 20 MB.'},413);
 try{

  let buffer:Uint8Array;try{buffer=await boundedBody(req,21*1024*1024);}catch{return result({error:'Choose a file smaller than 20 MB.'},413);}
  const form=await new Response(buffer as BodyInit,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData(),file=form.get('file');if(!(file instanceof File)||file.size<1||file.size>20*1024*1024)return result({error:'Choose a photo or video smaller than 20 MB.'},400);
  if(!['image/jpeg','image/png','image/webp','video/webm','video/mp4'].includes(file.type))return result({error:'Use a JPG, PNG, WebP, MP4 or WebM file.'},400);
  const bytes=await file.arrayBuffer(),head=new Uint8Array(bytes,0,Math.min(bytes.byteLength,16));
  const match=file.type==='image/jpeg'?head[0]===255&&head[1]===216:file.type==='image/png'?head[0]===137&&head[1]===80&&head[2]===78:file.type==='image/webp'?String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP':file.type==='video/webm'?head[0]===26&&head[1]===69&&head[2]===223&&head[3]===163:String.fromCharCode(...head.slice(4,8))==='ftyp';
  if(!match)return result({error:'That file could not be read. Choose another photo or video.'},400);
  const id=crypto.randomUUID(),key=id,created=new Date().toISOString();
  await mediaStore.put(key,bytes,file.type);
  try{await careDb().prepare('INSERT INTO care_records (id, owner, kind, content, created) VALUES (?, ?, ?, ?, ?)').bind(id,owner,'media',JSON.stringify({key,type:file.type,name:file.name.slice(0,100),size:file.size}),created).run();}catch(e){await mediaStore.delete(key);throw e;}
  return result({id,type:file.type,url:'/api/media?id='+id},201);
 }catch(e){console.error('Photo upload failed',e);return result({error:'Could not upload. Your photo is still here. Please try again.'},503);}
}
export async function GET(req:Request){
 const owner=(await getUser())?.id;if(!owner)return result({error:'Please sign in first'},401);
 try{const id=new URL(req.url).searchParams.get('id');const row=await careDb().prepare('SELECT content FROM care_records WHERE id = ? AND owner = ? AND kind = ?').bind(id,owner,'media').first<{content:string}>();if(!row)return result({error:'Photo not found'},404);const meta=JSON.parse(row.content),object=await mediaStore.get(meta.key);if(!object)return result({error:'Photo not found'},404);return new Response(object.body,{headers:{'Content-Type':meta.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){console.error('Photo load failed',e);return result({error:'Could not load the photo'},503);}
}
