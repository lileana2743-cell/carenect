import { getUser, requestOriginValid } from '@/lib/auth';
import { careDb } from '@/lib/care-db';
import { seedRecords, today } from '@/lib/care-data';
import { boundedBody } from '@/lib/request-body';
export const dynamic = 'force-dynamic';
const response=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const text=(x:unknown,max=500)=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=max;
function valid(kind:string,v:any) {
  if (!v||typeof v!=='object'||Array.isArray(v)) return false;
  if(kind==='task')return text(v.title,100)&&/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)&&text(v.person,60)&&['Daily care','Meals','Care','Activities'].includes(v.category)&&typeof v.done==='boolean';
  if(kind==='message')return text(v.text,1000)&&['care','dad','family'].includes(v.thread)&&['family','senior','caregiver'].includes(v.role)&&text(v.sender,60)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time);
  if(kind==='post')return text(v.title,100)&&text(v.text,2000)&&text(v.author,60)&&['garden','art','none','calligraphy','grade','family-plant'].includes(v.photo)&&(!v.media||text(v.media,100))&&Number.isInteger(v.likes)&&v.likes>=0;
  if(kind==='mood')return ['Happy','Calm','Okay','Low','Tired'].includes(v.mood)&&/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&text(v.person,60);
  if(kind==='booking')return ['garden','art','music','restaurant','exercise','dyeing','exam','natural','resonance','bowl'].includes(v.activity)&&/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&text(v.person,60);
  if(kind==='plant')return text(v.name,60)&&[v.watered,v.fertilized].every(x=>x===null||(typeof x==='string'&&!Number.isNaN(Date.parse(x))));
  if(kind==='person')return text(v.name,30)&&Number.isInteger(v.age)&&v.age>=18&&v.age<=120&&text(v.room,100)&&text(v.note,500)&&text(v.conditions,200)&&text(v.caregiver,30);
  if(kind==='exhibition')return text(v.title,100)&&text(v.text,1000)&&Array.isArray(v.artworks)&&v.artworks.length<=12&&v.artworks.every((x:any)=>['garden','art','origami','gold-sculpture','irises','monet','wu','morandi','audra','zak','magi','bridge'].includes(x));
  if(kind==='reminder')return text(v.text,500)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)&&Array.isArray(v.days)&&v.days.every((x:any)=>Number.isInteger(x)&&x>=0&&x<7)&&/^\d{4}-\d{2}-\d{2}$/.test(v.from)&&/^\d{4}-\d{2}-\d{2}$/.test(v.to)&&v.to>=v.from&&(!v.media||text(v.media,100));
  if(kind==='clock')return text(v.name,60)&&!Number.isNaN(Date.parse(v.start))&&(v.end===null||(!Number.isNaN(Date.parse(v.end))&&v.end>=v.start));
  if(kind==='profile')return text(v.name,60)&&['senior','caregiver','family'].includes(v.role);
  if(kind==='volunteer')return text(v.name,60)&&['Welcome guests','Set the tables','Share a story'].includes(v.job)&&['Morning','Afternoon'].includes(v.availability)&&typeof v.training==='boolean'&&text(v.note,500);
  return false;
}
async function identity(){return (await getUser())?.id;}
export async function GET(){
  const owner=await identity();if(!owner)return response({error:'Please sign in first'},401);
  try{
    const db=careDb(); let list=await db.prepare('SELECT id, kind, content, created FROM care_records WHERE owner = ? ORDER BY created, id').bind(owner).all();
    if(!list.results.length){
      const created=new Date().toISOString();
      await db.batch(seedRecords(today()).map((r,i)=>db.prepare('INSERT OR IGNORE INTO care_records (id, owner, kind, content, created) VALUES (?, ?, ?, ?, ?)').bind(owner+':'+r.id,owner,r.kind,JSON.stringify(r.content),new Date(Date.parse(created)+i).toISOString())));
      list=await db.prepare('SELECT id, kind, content, created FROM care_records WHERE owner = ? ORDER BY created, id').bind(owner).all();
    }
    return response({records:list.results.map((r:any)=>({...r,content:JSON.parse(r.content)}))});
  }catch(e){console.error('care load failed',e);return response({error:'Could not load your records. Please try again.'},503);}
}
export async function POST(req:Request){
  const owner=await identity();if(!owner)return response({error:'Please sign in first'},401);
  if(!requestOriginValid(req))return response({error:'Invalid request origin'},403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return response({error:'Invalid request format'},400);
  if(Number(req.headers.get('content-length')||0)>16000)return response({error:'The content is too long'},413);
  try{
    let raw:string;try{raw=new TextDecoder().decode(await boundedBody(req,16000));}catch{return response({error:'The content is too long'},413);}
    let body:any;try{body=JSON.parse(raw)}catch{return response({error:'Invalid request format'},400);}
    const {kind,content,id,action}=body; const db=careDb();
    if(action==='delete'){
      if(typeof id!=='string'||!['task','booking','post','reminder','exhibition'].includes(kind))return response({error:'Invalid action'},400);
      const result=await db.prepare('DELETE FROM care_records WHERE id = ? AND owner = ? AND kind = ?').bind(id,owner,kind).run();
      return result.meta.changes?response({id,deleted:true}):response({error:'Record not found'},404);
    }
    if(!valid(kind,content))return response({error:'Please check your input'},400);
    if(content.media){const file=await db.prepare('SELECT id FROM care_records WHERE id = ? AND owner = ? AND kind = ?').bind(content.media,owner,'media').first();if(!file)return response({error:'Photo not found'},400);}
    const created=new Date().toISOString();
    if(id){
      if(typeof id!=='string')return response({error:'Invalid record'},400);
      const result=await db.prepare('UPDATE care_records SET content = ? WHERE id = ? AND owner = ? AND kind = ?').bind(JSON.stringify(content),id,owner,kind).run();
      if(!result.meta.changes)return response({error:'Record not found'},404);
      return response({record:{id,kind,content,created}});
    }
    const recordId=crypto.randomUUID(); await db.prepare('INSERT INTO care_records (id, owner, kind, content, created) VALUES (?, ?, ?, ?, ?)').bind(recordId,owner,kind,JSON.stringify(content),created).run();
    return response({record:{id:recordId,kind,content,created}},201);
  }catch(e){console.error('care save failed',e);return response({error:'Could not save. Your input is still here. Please try again.'},503);}
}
