import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetRoot=path.join(root,'assets'),publicRoot=path.join(root,'public');
const seen=new Set();let restored=0;
for(const part of fs.readdirSync(assetRoot).filter(x=>/^part-\d+\.json$/.test(x)).sort()){
 const pack=JSON.parse(fs.readFileSync(path.join(assetRoot,part),'utf8'));
 if(pack.version!==1||!Array.isArray(pack.files))throw Error('Unsupported asset pack: '+part);
 for(const asset of pack.files){
  if(typeof asset.path!=='string'||!/^[-a-zA-Z0-9_./]+$/.test(asset.path)||asset.path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Invalid asset path');
  const destination=path.resolve(publicRoot,asset.path);
  if(!destination.startsWith(publicRoot+path.sep)||seen.has(destination))throw Error('Duplicate or invalid asset');
  seen.add(destination);
  const bytes=Buffer.from(asset.base64,'base64');
  if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Asset checksum mismatch: '+asset.path);
  if(fs.existsSync(destination)){
   if(fs.lstatSync(destination).isSymbolicLink())throw Error('Asset destination is a link');
   if(createHash('sha256').update(fs.readFileSync(destination)).digest('hex')===asset.sha256)continue;
  }
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);restored++;
 }
}
if(!seen.size)throw Error('No original assets found');
console.log(`Verified ${seen.size} original assets; restored ${restored}.`);
