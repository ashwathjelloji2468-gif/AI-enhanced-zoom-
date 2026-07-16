'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Shield, 
  Cpu, 
  Zap, 
  ArrowRight,
  Video,
  Mic,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden font-sans">
      
      {/* Premium ambient decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand/5 blur-[120px] animate-pulse pointer-events-none -z-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-light/5 blur-[120px] animate-pulse pointer-events-none -z-20" />
      
      {/* Subtle ambient radial background glow behind the landing hero */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[800px] rounded-full opacity-35 blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(255, 255, 255, 0) 70%)'
        }}
      />

      {/* ──── HEADER ──── */}
      <header className="w-full border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md outline-none group"
            aria-label="Connect Home Page"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-hover text-white shadow-premium transition-all duration-350 group-hover:shadow-brand/25">
              <span className="absolute inline-flex h-full w-full rounded-lg bg-brand animate-ping opacity-20" />
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display transition-colors group-hover:text-brand">Connect</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium min-h-[40px] px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all duration-200"
                aria-label="Sign In to your account"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button 
                className="bg-brand hover:bg-brand-hover text-white font-medium min-h-[40px] px-5 rounded-xl shadow-premium hover:shadow-brand/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                aria-label="Sign Up for a free account"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ──── HERO SECTION ──── */}
      <section className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 py-12 lg:py-24 w-full text-center lg:text-left relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="inline-flex items-center space-x-2 bg-brand/5 border border-brand/10 px-4 py-1.5 rounded-full text-xs font-semibold text-brand transition-colors duration-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Free AI Companion & Real-Time Summaries</span>
            </div>
            
            <h1 className="text-[36px]/[1.1] md:text-[60px]/[1.05] font-extrabold tracking-tight text-slate-900 font-display">
              A calmer, faster way <br />
              to <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand-light">connect</span> and collaborate
            </h1>
            
            <p className="text-slate-500 text-[16px]/[1.6] md:text-[18px]/[1.6] max-w-lg leading-relaxed mx-auto lg:mx-0 font-sans">
              Bring team chats, smart transcriptions, and crystal-clear video meetings together in a single workspace. Quietly confident, built for speed.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-brand to-brand-hover hover:from-brand hover:to-brand text-white font-medium px-8 py-6 rounded-2xl shadow-premium hover:shadow-brand/20 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 group"
                  aria-label="Get Started Free and sign up"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full border border-slate-200 hover:border-slate-300 bg-white/50 backdrop-blur-sm hover:bg-slate-100/80 transition-all duration-300 text-slate-800 font-medium px-8 py-6 rounded-2xl shadow-premium hover:shadow-premium-hover hover:-translate-y-1 active:translate-y-0 min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  aria-label="Sign In to active dashboard"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
 
          {/* Right Hero Graphic Column: Signature Pulse Rings motif */}
          <div className="lg:col-span-6 flex justify-center relative animate-in fade-in duration-1000 delay-300">
            <div className="relative border border-white/20 bg-white/60 backdrop-blur-md shadow-premium hover:shadow-premium-hover rounded-3xl p-8 w-full max-w-md h-[340px] flex items-center justify-center overflow-hidden transition-all duration-500 hover:-translate-y-1.5 group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Concentric Pulse Rings Motif */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute h-16 w-16 rounded-full border border-brand/20 bg-brand/5 animate-[ping_4s_infinite_ease-in-out]" />
                <div className="absolute h-36 w-36 rounded-full border border-brand/10 bg-brand/[0.02] animate-[ping_6s_infinite_ease-in-out]" />
                <div className="absolute h-60 w-60 rounded-full border border-brand/5 bg-brand/[0.01] animate-[ping_8s_infinite_ease-in-out]" />
              </div>
 
              {/* Central Signal Core */}
              <div className="relative z-10 flex flex-col items-center space-y-5">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-white shadow-premium">
                  <span className="absolute inline-flex h-full w-full rounded-2xl bg-brand animate-pulse opacity-40" />
                  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
                  </svg>
                </div>
                
                {/* Floating client status badge overlay */}
                <div className="bg-white/80 border border-slate-200/60 rounded-2xl px-5 py-3 shadow-premium text-center max-w-[210px] backdrop-blur-sm transition-all duration-300 group-hover:scale-105">
                  <p className="text-sm font-bold text-slate-800">Call Connected</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">120.0.0.1 • LiveKit Active</p>
                  <div className="flex justify-center space-x-2 mt-3">
                    <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                      <Video className="h-3.5 w-3.5" />
                    </div>
                    <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                      <Mic className="h-3.5 w-3.5" />
                    </div>
                    <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                      <Monitor className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
 
        </div>
      </section>

      {/* ──── FEATURE CARDS ──── */}
      <section className="bg-white border-t border-slate-200 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/60 space-y-5 shadow-premium hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-1.5 group">
              <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center transition-all duration-300 group-hover:bg-brand group-hover:text-white">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-800">Low Client Load</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-sans">
                Powered by LiveKit WebRTC SFU. Media routes selectively, lowering server stress and client processor consumption.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/60 space-y-5 shadow-premium hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-1.5 group">
              <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center transition-all duration-300 group-hover:bg-brand group-hover:text-white">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-800">Waiting Room Security</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-sans">
                Admit users selectively before letting them access the video streams, protecting meetings from unauthorized intruders.
              </p>
            </div>
 
            {/* Card 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/60 space-y-5 shadow-premium hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-1.5 group">
              <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center transition-all duration-300 group-hover:bg-brand group-hover:text-white">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-800">Instant Text & Reactions</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-sans">
                Exchange chat messages and interactive emoji reactions instantly using Socket.io synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>
 
      {/* ──── FOOTER ──── */}
      <footer className="w-full border-t border-slate-200/80 py-10 bg-slate-50 text-slate-500 text-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-hover text-white shadow-premium">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">Connect</span>
          </div>
          <p>© 2026 Connect. All rights reserved.</p>
        </div>
      </footer>
 
    </div>
  );
}
