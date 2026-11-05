import AuthForm from './form';
export const dynamic = 'force-dynamic';
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; return_to?: string; role?: string;error?:string }> }) {
 const params = await searchParams;
 return <main className="independent-auth">{params.error==='confirmation'&&<p role="alert">That confirmation link is invalid or has expired. Please sign in or request a new confirmation email.</p>}<AuthForm register={params.mode === 'register'} returnTo={params.return_to} role={params.role} /></main>;
}
