import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {cloudCareQuery,cloudEnabled,cloudHealth,cloudInsertRecords} from './cloud-store';

type Value = string | number | bigint | null | Uint8Array;
const shared = globalThis as typeof globalThis & { carenectDatabase?: DatabaseSync };
export function dataDirectory() { return path.resolve(process.env.DATA_DIR || './data'); }
export function database() {
 if(cloudEnabled())throw Error('Local database is disabled for cloud mode');
 if (shared.carenectDatabase) return shared.carenectDatabase;
 mkdirSync(dataDirectory(), { recursive: true });
 const db = new DatabaseSync(path.join(dataDirectory(), 'carenect.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS care_records (id TEXT PRIMARY KEY, owner TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL, created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_care_records_owner_kind ON care_records(owner,kind);
 CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);`);
 shared.carenectDatabase = db;
 return db;
}
class Query {
 constructor(private sql: string, private values: Value[] = []) {}
 bind(...values: Value[]) { return new Query(this.sql, values); }
 async all() { if(cloudEnabled())return await cloudCareQuery(this.sql,this.values) as {results:any[]};return { results: database().prepare(this.sql).all(...this.values) }; }
 async first<T = Record<string, unknown>>() { if(cloudEnabled()){const r=await cloudCareQuery(this.sql,this.values) as {results:T[]};return r.results[0]||null;}return (database().prepare(this.sql).get(...this.values) as T | undefined) || null; }
 parameters(){return this.values;}
 execute() { const r = database().prepare(this.sql).run(...this.values); return { meta: { changes: Number(r.changes) } }; }
 async run() { if(cloudEnabled())return await cloudCareQuery(this.sql,this.values) as {meta:{changes:number}};return this.execute(); }
}
export function careDb() {
 return { prepare: (sql: string) => new Query(sql), batch: async (queries: Query[]) => {
  if(cloudEnabled()){await cloudInsertRecords(queries.map(q=>q.parameters()),true);return queries.map(()=>({meta:{changes:1}}));}
  const db = database(); db.exec('BEGIN IMMEDIATE');
  try { const results = queries.map(q => q.execute()); db.exec('COMMIT'); return results; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
 } };
}
export async function databaseHealth(){if(cloudEnabled())await cloudHealth();else database().prepare('SELECT 1').get();}
