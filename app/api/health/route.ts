import { databaseHealth } from '@/lib/care-db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { try { await databaseHealth();return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } }); } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); } }
