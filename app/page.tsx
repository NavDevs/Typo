import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0b1326] via-[#111833] to-[#1c133a] opacity-50" />
      
      {/* Decorative ambient light sources */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[128px]" />

      <div className="z-10 flex flex-col items-center justify-center space-y-8 glass-panel p-12 max-w-2xl text-center">
        <div className="flex flex-col items-center justify-center mb-2 animate-in zoom-in duration-500">
          <img src="/logo.png" alt="Typo Logo" className="w-32 h-32 mb-6 drop-shadow-[0_0_25px_rgba(99,102,241,0.6)]" />
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Typo
          </h1>
        </div>
        <p className="mt-4 text-lg leading-8 text-indigo-100/80">
          A real-time aesthetic chat environment built with Next.js, Clerk, and Supabase.
        </p>
        
        <div className="mt-8 flex items-center justify-center gap-x-6">
          {userId ? (
            <Link
              href="/chat"
              className="glass-button px-8 py-3 text-lg font-semibold"
            >
              Enter Chat
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="glass-button px-8 py-3 text-lg font-semibold"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="glass-input px-8 py-3 text-lg font-semibold hover:bg-white/10"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
