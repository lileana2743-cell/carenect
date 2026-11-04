import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory } from './care-db';
function mediaPath(key: string) { if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error('Invalid media key'); return path.join(dataDirectory(), 'uploads', key); }
export const mediaStore = {
 async put(key: string, bytes: ArrayBuffer) { const destination = mediaPath(key); await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, Buffer.from(bytes), { flag: 'wx', mode: 0o600 }); },
 async delete(key: string) { await unlink(mediaPath(key)); },
 async get(key: string) { try { return { body: new Uint8Array(await readFile(mediaPath(key))) }; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; } },
};
