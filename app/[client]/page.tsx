import CareApp from '../carenect-client';
import { getUser } from '@/lib/auth';
import { notFound,redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Client({params,searchParams}:{params:Promise<{client:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const {client}=await params;if(!['senior','caregiver','family'].includes(client))notFound();const user=await getUser();if(!user){const q=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams)){if(typeof value==='string')q.set(key,value);}redirect('/auth?return_to='+encodeURIComponent('/'+client+(q.size?'?'+q:'')));}return <CareApp initialRole={client as 'senior'|'caregiver'|'family'} signedIn/>;}
