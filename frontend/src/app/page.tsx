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
    <div className="min-h-screen bg-surface-sunken text-ink flex flex-col relative overflow-hidden font-sans">
      
      {/* Subtle ambient radial background glow behind the landing hero */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[800px] rounded-full opacity-30 blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(79, 157, 222, 0.25) 0%, rgba(255, 255, 255, 0) 70%)'
        }}
      />

      {/* ──── HEADER ──── */}
      <header className="w-full border-b border-surface-border bg-surface/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md outline-none"
            aria-label="Connect Home Page"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand text-white shadow-sm">
              <span className="absolute inline-flex h-full w-full rounded-md bg-brand animate-ping opacity-25" />
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-ink font-display">Connect</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="text-ink-muted hover:text-ink hover:bg-surface-sunken font-medium min-h-[44px] px-4 rounded-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors duration-150 ease-out"
                aria-label="Sign In to your account"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button 
                className="bg-brand hover:bg-brand-hover text-white font-medium min-h-[44px] px-5 rounded-sm shadow-sm transition-colors duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                aria-label="Sign Up for a free account"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ──── HERO SECTION ──── */}
      <section className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 py-12 lg:py-24 w-full text-center lg:text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 bg-brand-subtle border border-brand-light/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand-text">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Free AI Companion & Real-Time Summaries</span>
            </div>
            
            <h1 className="text-[32px]/[1.15] md:text-[56px]/[1.1] font-medium tracking-tight text-ink font-display">
              A calmer, faster way <br />
              to <span className="text-brand-text">connect</span> and collaborate
            </h1>
            
            <p className="text-ink-muted text-[16px]/[1.6] md:text-[18px]/[1.6] max-w-lg leading-relaxed mx-auto lg:mx-0 font-sans">
              Bring team chats, smart transcriptions, and crystal-clear video meetings together in a single workspace. Quietly confident, built for speed.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-white font-medium px-8 py-6 rounded-md shadow-sm transition-colors duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm flex items-center justify-center min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  aria-label="Get Started Free and sign up"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto border border-surface-border bg-transparent hover:border-brand hover:bg-brand-subtle hover:text-brand-text transition-colors duration-150 ease-out text-ink font-medium px-8 py-6 rounded-md min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  aria-label="Sign In to active dashboard"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Hero Graphic Column: Signature Pulse Rings motif */}
          <div className="lg:col-span-6 flex justify-center relative">
            <div className="relative border border-surface-border bg-surface shadow-md rounded-lg p-8 w-full max-w-md h-[340px] flex items-center justify-center overflow-hidden">
              
              {/* Concentric Pulse Rings Motif */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute h-16 w-16 rounded-full border border-brand/20 bg-brand/5 animate-[ping_4s_infinite_ease-in-out]" />
                <div className="absolute h-36 w-36 rounded-full border border-brand/10 bg-brand/[0.02] animate-[ping_6s_infinite_ease-in-out]" />
                <div className="absolute h-60 w-60 rounded-full border border-brand/5 bg-brand/[0.01] animate-[ping_8s_infinite_ease-in-out]" />
              </div>

              {/* Central Signal Core */}
              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-md">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-brand animate-pulse opacity-40" />
                  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
                  </svg>
                </div>
                
                {/* Floating client status badge overlay */}
                <div className="bg-surface border border-surface-border rounded-md px-4 py-2.5 shadow-sm text-center max-w-[200px]">
                  <p className="text-xs font-bold text-ink">Call Connected</p>
                  <p className="text-[10px] text-ink-muted mt-0.5 font-mono">120.0.0.1 • LiveKit Active</p>
                  <div className="flex justify-center space-x-1.5 mt-2">
                    <div className="p-1 rounded-sm bg-brand-subtle text-brand-text">
                      <Video className="h-3 w-3" />
                    </div>
                    <div className="p-1 rounded-sm bg-brand-subtle text-brand-text">
                      <Mic className="h-3 w-3" />
                    </div>
                    <div className="p-1 rounded-sm bg-brand-subtle text-brand-text">
                      <Monitor className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ──── FEATURE CARDS ──── */}
      <section className="bg-surface border-t border-surface-border py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-6 rounded-md bg-surface border border-surface-border space-y-4 shadow-sm">
              <div className="h-10 w-10 rounded-md bg-brand-subtle text-brand-text flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-[20px]/[1.3] md:text-[24px]/[1.3] font-medium font-display text-ink">Low Client Load</h3>
              <p className="text-ink-muted text-sm leading-relaxed">
                Powered by LiveKit WebRTC SFU. Media routes selectively, lowering server stress and client processor consumption.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="p-6 rounded-md bg-surface border border-surface-border space-y-4 shadow-sm">
              <div className="h-10 w-10 rounded-md bg-brand-subtle text-brand-text flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-[20px]/[1.3] md:text-[24px]/[1.3] font-medium font-display text-ink">Waiting Room Security</h3>
              <p className="text-ink-muted text-sm leading-relaxed">
                Admit users selectively before letting them access the video streams, protecting meetings from unauthorized intruders.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-md bg-surface border border-surface-border space-y-4 shadow-sm">
              <div className="h-10 w-10 rounded-md bg-brand-subtle text-brand-text flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-[20px]/[1.3] md:text-[24px]/[1.3] font-medium font-display text-ink">Instant Text & Reactions</h3>
              <p className="text-ink-muted text-sm leading-relaxed">
                Exchange chat messages and interactive emoji reactions instantly using Socket.io synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="w-full border-t border-surface-border py-8 bg-surface text-ink-muted text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-brand text-white">
              <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
              </svg>
            </div>
            <span className="font-bold text-ink">Connect</span>
          </div>
          <p>© 2026 Connect. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
