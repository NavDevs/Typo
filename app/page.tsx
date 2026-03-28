import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { 
  MessageSquare, 
  Zap, 
  Shield, 
  Sparkles, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Palette
} from 'lucide-react';

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-[#0b1326] text-white overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* --- ELITE BACKGROUND ENGINE --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep mesh gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,51,1)_0%,rgba(11,19,38,1)_100%)]" />
        
        {/* Animated luminous blobs */}
        <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="relative z-10 flex flex-col w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 pt-12 pb-24">
        
        {/* --- NAVIGATION --- */}
        <nav className="flex items-center justify-between py-6 mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center transition-all duration-500 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 group-hover:scale-110 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white/90">Typo</span>
          </div>
          <div className="flex items-center gap-4">
            {userId ? (
              <Link href="/chat" className="glass-button px-6 py-2.5 text-sm font-bold shadow-indigo-500/20">
                Launch App
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/sign-in" className="text-sm font-medium text-white/50 hover:text-white transition-colors px-4">
                  Log in
                </Link>
                <Link href="/sign-up" className="glass-button px-6 py-2.5 text-sm font-bold">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* --- HERO SECTION: HANDCRAFTED ASYMMETRY --- */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-32">
          
          <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-150">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit">
              <Sparkles size={14} className="animate-pulse" />
              <span>Next Generation Messaging</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-[-0.05em] leading-[0.9] text-white drop-shadow-sm">
              Communication,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x underline decoration-indigo-500/30 underline-offset-8">Refined in Glass.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-indigo-100/50 max-w-lg leading-relaxed font-medium">
              Typo brings a tactile, high-fidelity chat experience to the browser. Designed for focus, engineered for speed, and beautifully transparent.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link href={userId ? "/chat" : "/sign-up"} className="flex items-center gap-2 group glass-button px-8 py-4 text-base font-bold">
                {userId ? 'Back to conversations' : 'Create free account'}
                <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center -space-x-3 ml-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-9 w-9 rounded-full border-2 border-[#0b1326] bg-indigo-900/40 flex items-center justify-center overflow-hidden">
                    <Users size={16} className="text-indigo-300/60" />
                  </div>
                ))}
                <span className="ml-6 text-xs font-semibold text-white/30 tracking-wide">+2.4k joined</span>
              </div>
            </div>
          </div>

          {/* Abstract Mockup: The "Professional Asset" */}
          <div className="relative group perspective-1000 hidden lg:block animate-in fade-in zoom-in-95 duration-1000 delay-300">
            {/* Background glowing orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] bg-indigo-500/20 blur-[100px] rounded-full group-hover:bg-indigo-500/30 transition-all duration-700" />
            
            {/* Mock Chat Card */}
            <div className="relative glass-panel p-6 border-white/10 shadow-2xl transition-all duration-700 hover:rotate-y-2 hover:rotate-x-1 hover:translate-y-[-8px]">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/20 border border-green-500/30" />
                  <div className="flex flex-col gap-1">
                    <div className="h-2.5 w-24 bg-white/20 rounded-full" />
                    <div className="h-1.5 w-16 bg-white/10 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded bg-white/5" />
                  <div className="h-6 w-6 rounded bg-white/5" />
                </div>
              </div>
              
              <div className="space-y-6">
                {[
                  { w: 'w-2/3', o: 'mr-auto', b: 'rounded-bl-none bg-indigo-500/10' },
                  { w: 'w-1/2', o: 'ml-auto', b: 'rounded-br-none bg-white/5' },
                  { w: 'w-3/4', o: 'mr-auto', b: 'rounded-bl-none bg-indigo-500/10' },
                ].map((m, i) => (
                  <div key={i} className={`h-12 ${m.w} ${m.o} ${m.b} border border-white/5 rounded-2xl flex items-center px-4`}>
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-2">
                <div className="h-10 flex-1 bg-white/5 rounded-xl border border-white/5" />
                <div className="h-10 w-10 bg-indigo-600 rounded-xl" />
              </div>
            </div>

            {/* Floating floating indicators */}
            <div className="absolute -top-12 -right-8 glass-panel p-4 animate-bounce" style={{ animationDuration: '3s' }}>
              <MessageSquare size={20} className="text-indigo-400" />
            </div>
            <div className="absolute -bottom-8 -left-8 glass-panel p-4 animate-bounce" style={{ animationDuration: '4s' }}>
              <Layers size={20} className="text-purple-400" />
            </div>
          </div>
        </section>

        {/* --- FEATURES GRID: BENTO STYLE --- */}
        <section className="grid md:grid-cols-3 gap-6 mb-32">
          
          <div className="md:col-span-2 glass-panel p-10 border-white/5 bg-gradient-to-br from-white/5 to-transparent flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 text-indigo-500/10 group-hover:scale-150 transition-transform duration-1000">
              <Zap size={140} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20 text-indigo-400">
                <Zap size={24} />
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-4 text-white">Zero Lag. Instant Sync.</h3>
              <p className="text-indigo-100/50 max-w-md leading-relaxed">
                Powered by Supabase Realtime, messages fly through WebSockets the second you hit enter. No more manual page reloads—ever.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-6 relative z-10">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>Pub/Sub Optimized</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>Postgres Backed</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-10 border-white/5 hover:border-indigo-500/30 transition-all duration-500 group">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
              <Palette size={24} />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-4 leading-tight text-white">Hand-Crafted Aesthetic.</h3>
            <p className="text-indigo-100/50 leading-relaxed text-sm">
              Your UI, your rules. Choose from curated accent themes like Emerald, Violet, and Sunrise. Total visual harmony at your fingertips.
            </p>
          </div>

          <div className="glass-panel p-10 border-white/5 group">
             <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 text-blue-400 group-hover:rotate-12 transition-transform">
              <Shield size={24} />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-4 leading-tight text-white">Privacy by Design.</h3>
            <p className="text-indigo-100/50 leading-relaxed text-sm">
              Clerk-powered authentication ensures your conversations stay private. Row Level Security protects every single bit of data.
            </p>
          </div>

          <div className="md:col-span-2 glass-panel p-10 border-white/5 flex flex-col md:flex-row gap-10 items-center overflow-hidden">
            <div className="flex-1">
              <div className="h-12 w-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 border border-pink-500/20 text-pink-400">
                <Users size={24} />
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-4 leading-tight text-white">The Circle Grows.</h3>
              <p className="text-indigo-100/50 leading-relaxed">
                Connect instantly with a robust friend request system and real-time social notifications. Never miss a ping from your team.
              </p>
            </div>
            <div className="flex-shrink-0 flex gap-2 rotate-6 opacity-30 select-none pointer-events-none">
              <div className="h-32 w-24 glass-panel border-white/10" />
              <div className="h-32 w-24 glass-panel border-indigo-500/30 bg-indigo-500/5 mt-8" />
              <div className="h-32 w-24 glass-panel border-white/10 mt-16" />
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="relative glass-panel border-white/10 bg-gradient-to-tr from-indigo-600/20 to-purple-600/10 overflow-hidden py-24 text-center rounded-[40px]">
          <div className="absolute top-0 right-0 h-[300px] w-[300px] bg-indigo-500/20 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] bg-purple-500/20 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto px-6 flex flex-col items-center">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6">Ready to break the silence?</h2>
            <p className="text-indigo-100/60 mb-10 text-lg sm:text-xl font-medium">
              Join Typo today and experience a faster, cleaner way to communicate with your world.
            </p>
            <Link href={userId ? "/chat" : "/sign-up"} className="flex items-center gap-3 glass-button px-10 py-5 text-lg font-black tracking-tight shadow-2xl">
              {userId ? 'Enter Workspace' : 'Get Started Now'}
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="mt-32 pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in duration-1000">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
               <img src="/logo.png" alt="Logo" className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-white/50 tracking-tighter">Typo © 2024</span>
          </div>
          <div className="flex gap-8 text-xs font-semibold uppercase tracking-widest text-white/30">
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Github</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Twitter</a>
          </div>
        </footer>

      </div>

      <style jsx global>{`
        .perspective-1000 { 
          perspective: 1000px; 
          transform-style: preserve-3d;
        }
        .rotate-y-2 { transform: rotateY(2deg); }
        .rotate-x-1 { transform: rotateX(1deg); }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 6s linear infinite;
        }

        /* Responsive h1 adjustment */
        @media (max-width: 640px) {
          h1 { 
            line-height: 1.05 !important;
            letter-spacing: -0.04em !important;
          }
        }
      `}</style>
    </main>
  );
}
