import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory } from './care-db';
import {cloudClient,cloudEnabled,cloudResult} from './cloud-store';
function mediaPath(key: string) { if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error('Invalid media key'); return path.join(dataDirectory(), 'uploads', key); }
async function remoteMedia(key:string){
 const client=await cloudClient(),{data:{user},error}=await client.auth.getUser();
 if(error||!user)throw Error('Please sign in first');
 return {bucket:client.storage.from('carenect-private'),key:user.id+'/'+key};
}
export const mediaStore = {
 async put(key: string, bytes: ArrayBuffer,type='application/octet-stream') { const destination = mediaPath(key);if(cloudEnabled()){const media=await remoteMedia(key);await cloudResult(media.bucket.upload(media.key,bytes,{contentType:type,upsert:false}));return;}await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, Buffer.from(bytes), { flag: 'wx', mode: 0o600 }); },
 async delete(key: string) { mediaPath(key);if(cloudEnabled()){const media=await remoteMedia(key);await cloudResult(media.bucket.remove([media.key]));return;}await unlink(mediaPath(key)); },
 async get(key: string) { mediaPath(key);if(cloudEnabled()){const media=await remoteMedia(key),r=await media.bucket.download(media.key);if(r.error){const status=String((r.error as unknown as {statusCode?:string;status?:number}).statusCode||(r.error as unknown as {status?:number}).status);if(status==='404'||status==='400')return null;throw Error('Cloud photo could not be read');}return {body:new Uint8Array(await r.data.arrayBuffer())};}try { return { body: new Uint8Array(await readFile(mediaPath(key))) }; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; } },
};
