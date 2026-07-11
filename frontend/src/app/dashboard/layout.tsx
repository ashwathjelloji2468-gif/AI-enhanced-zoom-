'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Video, 
  Tv, 
  Clock, 
  Users, 
  Settings, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react';
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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-slate-400 font-medium">Starting Zoom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* ──── LEFT SIDEBAR NAV ──── */}
      <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center justify-between py-6 z-20">
        <div className="flex flex-col items-center space-y-8 w-full">
          {/* Logo */}
          <div 
            onClick={() => router.push('/dashboard')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-transform"
          >
            <Video className="h-6 w-6 text-white" />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center space-y-4 w-full">
            <button 
              onClick={() => router.push('/dashboard')}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                pathname === '/dashboard' 
                  ? 'bg-slate-800 text-blue-400 font-semibold shadow-inner' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Tv className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">Home</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/meetings')}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                pathname.startsWith('/dashboard/meetings') 
                  ? 'bg-slate-800 text-blue-400 font-semibold shadow-inner' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Clock className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">Meetings</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/contacts')}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                pathname.startsWith('/dashboard/contacts') 
                  ? 'bg-slate-800 text-blue-400 font-semibold shadow-inner' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">Contacts</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/settings')}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                pathname.startsWith('/dashboard/settings') 
                  ? 'bg-slate-800 text-blue-400 font-semibold shadow-inner' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">Settings</span>
            </button>
          </nav>
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none focus:ring-0 active:scale-95 transition-transform cursor-pointer">
            <Avatar className="h-10 w-10 ring-2 ring-slate-800 hover:ring-blue-500/50 transition-all">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800 text-slate-100 shadow-xl" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem 
              onClick={() => router.push('/dashboard/settings')}
              className="focus:bg-slate-800 focus:text-white cursor-pointer py-2"
            >
              <UserIcon className="mr-2 h-4 w-4 text-slate-400" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => router.push('/dashboard/settings')}
              className="focus:bg-slate-800 focus:text-white cursor-pointer py-2"
            >
              <Settings className="mr-2 h-4 w-4 text-slate-400" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="focus:bg-red-900/50 focus:text-red-300 text-red-400 cursor-pointer py-2"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      {/* ──── TAB / PAGE CONTENT VIEWPORT ──── */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
        <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-blue-600/5 blur-[128px]" />
        {children}
      </main>

    </div>
  );
}
