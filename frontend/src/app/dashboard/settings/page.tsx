'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Video, 
  Volume2, 
  ShieldCheck, 
  HelpCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // Audio/video simulated device preferences
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setName(data.user.name);
          setEmail(data.user.email);
        }
      } catch (err) {
        console.error('Failed to load user profile in settings:', err);
      }
    };

    const getDevices = async () => {
      try {
        // Request media permissions to get accurate device names if available
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devices.filter(d => d.kind === 'videoinput');
          const audioDevs = devices.filter(d => d.kind === 'audioinput');

          setCameras(videoDevs);
          setMicrophones(audioDevs);

          if (videoDevs.length > 0) setSelectedCam(videoDevs[0].deviceId);
          if (audioDevs.length > 0) setSelectedMic(audioDevs[0].deviceId);
        }
      } catch (err) {
        console.warn('Media devices access skipped or denied:', err);
      }
    };

    loadProfile();
    getDevices();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage('');

    // Mock success update (could link to PATCH /api/users/me later)
    setTimeout(() => {
      setIsUpdating(false);
      setUpdateMessage('Profile updated successfully.');
      if (user) {
        setUser({ ...user, name });
      }
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-1 font-semibold">Customize your video, audio, and personal profile preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Profile Card settings */}
        <div className="md:col-span-6 space-y-6">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur shadow-lg rounded-2xl">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
                Profile Settings
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Update your personal name and details shown in meetings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-16 w-16 ring-4 ring-slate-850">
                    <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-2xl">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-white text-base">{name}</h4>
                    <p className="text-xs text-slate-500">{email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-xs font-semibold text-slate-400">
                    Display Name
                  </Label>
                  <Input 
                    id="displayName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-slate-800 bg-slate-950 text-white focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userEmail" className="text-xs font-semibold text-slate-400">
                    Email Address
                  </Label>
                  <Input 
                    id="userEmail"
                    value={email}
                    disabled
                    className="border-slate-850 bg-slate-950 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {updateMessage && (
                  <p className="text-xs text-green-400 font-semibold flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    {updateMessage}
                  </p>
                )}

                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  {isUpdating ? 'Updating...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Media / Devices preference settings */}
        <div className="md:col-span-6 space-y-6">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur shadow-lg rounded-2xl">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center">
                <Video className="h-5 w-5 mr-2 text-blue-500" />
                Video & Audio Devices
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Select your default camera and microphone sources
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              {/* Camera select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-400 flex items-center">
                  <Video className="h-4 w-4 mr-1 text-slate-500" />
                  Camera Source
                </Label>
                {cameras.length === 0 ? (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs text-slate-500">
                    No camera sources detected.
                  </div>
                ) : (
                  <select 
                    value={selectedCam}
                    onChange={(e) => setSelectedCam(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {cameras.map(cam => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Camera ${cam.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Microphone select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-400 flex items-center">
                  <Volume2 className="h-4 w-4 mr-1 text-slate-500" />
                  Microphone Source
                </Label>
                {microphones.length === 0 ? (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs text-slate-500">
                    No microphone sources detected.
                  </div>
                ) : (
                  <select 
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {microphones.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <p className="text-xs font-bold text-slate-300 flex items-center">
                  <ShieldCheck className="h-4 w-4 text-green-500 mr-1.5" />
                  Permissions active
                </p>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Your browser currently allows camera and microphone access. You will be prompted in individual meeting rooms when connections start.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
