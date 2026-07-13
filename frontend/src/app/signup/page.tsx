'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Sparkles, Mic, Video, Monitor } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Success, route to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-surface-sunken text-ink relative font-sans">
      
      {/* ──── LEFT PANEL: BRANDING (Desktop Only) ──── */}
      <div className="hidden md:flex md:w-1/2 bg-dark-bg relative flex-col justify-between p-12 overflow-hidden text-white border-r border-dark-border">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center space-x-3 active:scale-95 transition-transform w-fit focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md outline-none"
          aria-label="Connect Home Page"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-brand text-white shadow-sm">
            <span className="absolute inline-flex h-full w-full rounded-md bg-brand animate-ping opacity-25" />
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-display">Connect</span>
        </Link>

        {/* Center: Concentric pulse rings illustration */}
        <div className="relative flex-1 flex flex-col items-center justify-center py-12">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute h-24 w-24 rounded-full border border-brand/20 bg-brand/5 animate-[ping_4s_infinite_ease-in-out]" />
            <div className="absolute h-48 w-48 rounded-full border border-brand/10 bg-brand/[0.02] animate-[ping_6s_infinite_ease-in-out]" />
            <div className="absolute h-72 w-72 rounded-full border border-brand/5 bg-brand/[0.01] animate-[ping_8s_infinite_ease-in-out]" />
          </div>

          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-md">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand animate-pulse opacity-40" />
              <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
              </svg>
            </div>
            
            <div className="bg-dark-surface border border-dark-border rounded-md px-6 py-3 shadow-md text-center max-w-[240px]">
              <p className="text-xs font-bold text-white">Secure Call Tunnel</p>
              <p className="text-[10px] text-ink-inverse-muted mt-0.5 font-mono">127.0.0.1 • Connected</p>
              <div className="flex justify-center space-x-1.5 mt-2.5">
                <div className="p-1 rounded-sm bg-brand-subtle/10 text-brand">
                  <Video className="h-3.5 w-3.5" />
                </div>
                <div className="p-1 rounded-sm bg-brand-subtle/10 text-brand">
                  <Mic className="h-3.5 w-3.5" />
                </div>
                <div className="p-1 rounded-sm bg-brand-subtle/10 text-brand">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-wide text-white font-display">Concentric connections, built for teams.</p>
          <p className="text-xs text-ink-inverse-muted leading-relaxed">
            Experience secure, low-latency calls with dynamic AI-powered insights. Calm, precise, quietly confident.
          </p>
        </div>
      </div>

      {/* ──── RIGHT PANEL: FORM (Always Light Mode) ──── */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <Card className="w-full max-w-sm border-surface-border bg-white text-ink shadow-sm rounded-md p-2">
          <CardHeader className="space-y-1.5 text-center pb-4">
            {/* Mobile Header Logo */}
            <div className="flex justify-center md:hidden mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white shadow-sm">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-ink font-display">
              Create Account
            </CardTitle>
            <CardDescription className="text-ink-muted text-sm">
              Sign up to host free video meetings with up to 100 people
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-ink">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-surface text-ink border-surface-border hover:border-ink-faint focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px] px-3.5 transition-colors duration-150 ease-out"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-ink">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-surface text-ink border-surface-border hover:border-ink-faint focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px] px-3.5 transition-colors duration-150 ease-out"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-ink">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-surface text-ink border-surface-border hover:border-ink-faint focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px] px-3.5 transition-colors duration-150 ease-out"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="rounded-md bg-danger/10 border border-danger/25 p-3 text-xs text-danger font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-2.5 rounded-sm shadow-sm transition-colors duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px] disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 border-t border-surface-border pt-4 text-center">
            <p className="text-xs text-ink-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-text hover:underline font-semibold transition-colors duration-150 ease-out focus-visible:underline outline-none">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

    </div>
  );
}
