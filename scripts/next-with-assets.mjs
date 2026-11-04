import './restore-assets.mjs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const command=process.argv[2];if(!['dev','build'].includes(command))throw Error('Expected dev or build');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),command,'--webpack'],{cwd:root,stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exit(result.status??1);
