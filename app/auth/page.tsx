import AuthForm from './form';
export const dynamic = 'force-dynamic';
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; return_to?: string; role?: string }> }) {
 const params = await searchParams;
 return <main className="independent-auth"><AuthForm register={params.mode === 'register'} returnTo={params.return_to} role={params.role} /></main>;
}
