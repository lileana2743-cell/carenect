import CareApp from '../carenect-client';
import { getUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Client({params}:{params:Promise<{client:string}>}){const {client}=await params;if(!['senior','caregiver','family'].includes(client))notFound();const user=await getUser();return <CareApp initialRole={client as 'senior'|'caregiver'|'family'} signedIn={!!user}/>;}
