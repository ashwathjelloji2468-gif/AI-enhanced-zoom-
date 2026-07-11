'use strict';
'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Video, 
  Sparkles, 
  Shield, 
  Cpu, 
  Zap, 
  ArrowRight,
  MessageSquare,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      
      {/* Dynamic ambient background glows */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[128px]" />

      {/* ──── HEADER ──── */}
      <header className="w-full border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 active:scale-95 transition-transform">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/20">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">ZOOM</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-400 hover:text-white font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]">
                Sign Up, It's Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ──── HERO SECTION ──── */}
      <section className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full text-center lg:text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-8">
            <div className="inline-flex items-center space-x-2 bg-blue-950/40 border border-blue-900/30 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-400">
              <Sparkles className="h-4 w-4" />
              <span>Introducing HD Video Capabilities</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-none text-white">
              One platform <br />
              to <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">connect</span> and collaborate
            </h1>
            
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed mx-auto lg:mx-0">
              Bring team chats, phone calls, whiteboards, and high-quality video meetings together in a single workspace.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-6 rounded-xl transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-800 hover:bg-slate-900/50 text-slate-300 font-semibold px-8 py-6 rounded-xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Mock Graphic Column */}
          <div className="lg:col-span-6 flex justify-center relative">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-xl -z-10" />
            
            {/* Main Mock Grid */}
            <div className="border border-slate-850 bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden p-6 w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-3.5 w-3.5 rounded-full bg-red-500/80" />
                  <span className="h-3.5 w-3.5 rounded-full bg-yellow-500/80" />
                  <span className="h-3.5 w-3.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-slate-500 font-mono">zoom_meeting_grid.exe</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 min-h-60">
                <div className="rounded-xl bg-slate-950/60 border border-slate-850 flex flex-col items-center justify-center p-4">
                  <div className="h-10 w-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold mb-2">A</div>
                  <span className="text-xs font-bold text-slate-300">Alex Smith</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Host • Audio Active</span>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-850 flex flex-col items-center justify-center p-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-2">E</div>
                  <span className="text-xs font-bold text-slate-300">Emma Jones</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Video Connecting...</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ──── FEATURE CARDS ──── */}
      <section className="bg-slate-950/30 border-t border-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Low Client Load</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Powered by LiveKit WebRTC SFU. Media routes selectively, lowering server stress and client processor consumption.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Waiting Room Security</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Admit users selectively before letting them access the video streams, protecting meetings from unauthorized intruders.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Instant Text & Reactions</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Exchange chat messages and interactive emoji reactions instantly using Socket.io synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="w-full border-t border-slate-900 py-8 bg-slate-950 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Video className="h-4 w-4 text-blue-500" />
            <span className="font-bold text-slate-300">ZOOM CLONE</span>
          </div>
          <p>© 2026 Zoom Clone. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
