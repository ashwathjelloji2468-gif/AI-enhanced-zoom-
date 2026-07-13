'use strict';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Video, 
  Tv, 
  Clock, 
  Users, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Brain,
  X
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ show: boolean; meetingCode: string; meetingTitle: string } | null>(null);

  // Global socket listener for background notification relays
  useEffect(() => {
    if (!user) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
      // Register this socket to the user's personal notification room
      socket.emit('join-user', { userId: user.id });
    });

    socket.on('global-summary-ready', ({ meetingTitle, meetingCode }) => {
      console.log(`Global AI summary ready notification received: ${meetingTitle}`);
      setNotification({ show: true, meetingCode, meetingTitle });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, router]);

  // Authenticate user on layout mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-sunken text-ink">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-ink-muted font-medium text-sm">Starting Connect...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-sunken text-ink overflow-hidden font-sans">
      
      {/* ──── SIDEBAR NAV (Tablet/Desktop) ──── */}
      <aside className="hidden md:flex md:w-20 lg:w-64 bg-surface border-r border-surface-border flex-col items-center lg:items-start justify-between py-6 lg:px-4 z-20 transition-all duration-200">
        <div className="flex flex-col items-center lg:items-start space-y-8 w-full">
          {/* Logo */}
          <div 
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-3 cursor-pointer active:scale-95 transition-all lg:px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md outline-none"
            aria-label="Connect Dashboard Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white shadow-sm">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 10 10M12 6a6 6 0 0 1 6 6" />
              </svg>
            </div>
            <span className="hidden lg:block font-display font-bold text-lg text-ink tracking-wide">
              Connect
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center lg:items-start space-y-3 w-full">
            <button 
              onClick={() => router.push('/dashboard')}
              aria-label="Navigate to Home Dashboard"
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-16 lg:w-full h-16 lg:h-12 rounded-md lg:px-4 lg:space-x-3 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none ${
                pathname === '/dashboard' 
                  ? 'bg-brand-subtle text-brand-text font-semibold shadow-inner' 
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <Tv className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] lg:text-sm mt-1 lg:mt-0 font-medium lg:block hidden">Home</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/meetings')}
              aria-label="Navigate to Meetings"
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-16 lg:w-full h-16 lg:h-12 rounded-md lg:px-4 lg:space-x-3 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none ${
                pathname.startsWith('/dashboard/meetings') 
                  ? 'bg-brand-subtle text-brand-text font-semibold shadow-inner' 
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <Clock className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] lg:text-sm mt-1 lg:mt-0 font-medium lg:block hidden">Meetings</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/contacts')}
              aria-label="Navigate to Contacts"
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-16 lg:w-full h-16 lg:h-12 rounded-md lg:px-4 lg:space-x-3 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none ${
                pathname.startsWith('/dashboard/contacts') 
                  ? 'bg-brand-subtle text-brand-text font-semibold shadow-inner' 
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] lg:text-sm mt-1 lg:mt-0 font-medium lg:block hidden">Contacts</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/settings')}
              aria-label="Navigate to Settings"
              className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start w-16 lg:w-full h-16 lg:h-12 rounded-md lg:px-4 lg:space-x-3 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none ${
                pathname.startsWith('/dashboard/settings') 
                  ? 'bg-brand-subtle text-brand-text font-semibold shadow-inner' 
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] lg:text-sm mt-1 lg:mt-0 font-medium lg:block hidden">Settings</span>
            </button>
          </nav>
        </div>

        {/* Profile Dropdown */}
        <div className="lg:px-4 w-full flex justify-center lg:justify-start">
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-95 transition-transform cursor-pointer rounded-full">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 ring-2 ring-surface-border hover:ring-brand transition-all">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-brand text-white font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start text-left max-w-[140px]">
                  <span className="text-sm font-semibold text-ink truncate w-full">{user?.name}</span>
                  <span className="text-xs text-ink-muted truncate w-full">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border-surface-border text-ink shadow-md p-1" align="start">
              <DropdownMenuLabel className="font-normal lg:hidden">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="lg:hidden" />
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/settings')}
                className="focus:bg-surface-sunken focus:text-ink cursor-pointer py-2"
              >
                <UserIcon className="mr-2 h-4 w-4 text-ink-muted" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/settings')}
                className="focus:bg-surface-sunken focus:text-ink cursor-pointer py-2"
              >
                <Settings className="mr-2 h-4 w-4 text-ink-muted" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="focus:bg-danger-subtle focus:text-danger text-danger cursor-pointer py-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ──── MOBILE BOTTOM NAV BAR ──── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-surface-border z-35 flex items-center justify-around px-2 pb-safe">
        <button 
          onClick={() => router.push('/dashboard')}
          aria-label="Navigate to Home Dashboard"
          className={`flex flex-col items-center justify-center flex-1 h-12 rounded-md transition-all cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand outline-none ${
            pathname === '/dashboard' 
              ? 'text-brand-text font-semibold' 
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Tv className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </button>

        <button 
          onClick={() => router.push('/dashboard/meetings')}
          aria-label="Navigate to Meetings"
          className={`flex flex-col items-center justify-center flex-1 h-12 rounded-md transition-all cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand outline-none ${
            pathname.startsWith('/dashboard/meetings') 
              ? 'text-brand-text font-semibold' 
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Meetings</span>
        </button>

        <button 
          onClick={() => router.push('/dashboard/contacts')}
          aria-label="Navigate to Contacts"
          className={`flex flex-col items-center justify-center flex-1 h-12 rounded-md transition-all cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand outline-none ${
            pathname.startsWith('/dashboard/contacts') 
              ? 'text-brand-text font-semibold' 
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Contacts</span>
        </button>

        <button 
          onClick={() => router.push('/dashboard/settings')}
          aria-label="Navigate to Settings"
          className={`flex flex-col items-center justify-center flex-1 h-12 rounded-md transition-all cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand outline-none ${
            pathname.startsWith('/dashboard/settings') 
              ? 'text-brand-text font-semibold' 
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Settings</span>
        </button>

        <div className="flex-1 flex justify-center items-center h-12 min-h-[44px]">
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-95 transition-transform cursor-pointer rounded-full">
              <Avatar className="h-7 w-7 ring-2 ring-surface-border">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-brand text-white font-bold text-[10px]">
                  {user?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border-surface-border text-ink shadow-md p-1" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/settings')}
                className="focus:bg-surface-sunken focus:text-ink cursor-pointer py-2"
              >
                <UserIcon className="mr-2 h-4 w-4 text-ink-muted" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push('/dashboard/settings')}
                className="focus:bg-surface-sunken focus:text-ink cursor-pointer py-2"
              >
                <Settings className="mr-2 h-4 w-4 text-ink-muted" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="focus:bg-danger-subtle focus:text-danger text-danger cursor-pointer py-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* ──── TAB / PAGE CONTENT VIEWPORT ──── */}
      <main className="flex-1 flex flex-col bg-surface-sunken overflow-hidden relative pb-16 md:pb-0">
        {children}
      </main>

      {/* ──── FLOATING REAL-TIME AI SUMMARY TOAST BANNER ──── */}
      {notification?.show && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white border border-surface-border rounded-md shadow-lg p-4 flex items-start gap-3 animate-slide-in">
          <div className="h-10 w-10 rounded-md bg-brand-subtle border border-brand-light/10 text-brand-text flex items-center justify-center flex-shrink-0">
            <Brain className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold text-ink flex items-center gap-1.5 font-display">
              <span>AI Summary Ready</span>
            </h4>
            <p className="text-xs text-ink-muted leading-normal">
              The AI summary for meeting <strong className="text-ink">"{notification.meetingTitle}"</strong> has finished compiling.
            </p>
            <div className="flex gap-2.5 pt-1.5">
              <button 
                onClick={() => {
                  router.push(`/dashboard/meetings/${notification.meetingCode}/summary`);
                  setNotification(null);
                }} 
                className="text-[10px] bg-brand hover:bg-brand-hover text-white font-bold px-3 py-1.5 rounded-sm cursor-pointer transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
              >
                View Summary
              </button>
              <button 
                onClick={() => setNotification(null)} 
                className="text-[10px] text-ink-muted hover:text-ink px-2 py-1.5 cursor-pointer font-medium focus-visible:underline outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button 
            onClick={() => setNotification(null)} 
            className="text-ink-muted hover:text-ink cursor-pointer flex-shrink-0 focus-visible:ring-2 focus-visible:ring-brand rounded-sm outline-none"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

    </div>
  );
}
