export async function boundedBody(req: Request, limit: number) {
 const reader = req.body?.getReader();
 if (!reader) return new Uint8Array();
 const chunks: Uint8Array[] = []; let size = 0;
 try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); } chunks.push(value); } }
 finally { reader.releaseLock(); }
 const result = new Uint8Array(size); let offset = 0;
 for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
 return result;
}
