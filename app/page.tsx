import CareApp from './carenect-client';
import { getUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home(){const user=await getUser();return <CareApp signedIn={!!user}/>;}
