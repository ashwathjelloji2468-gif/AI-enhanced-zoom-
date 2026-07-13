'use client';

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Video, 
  Volume2, 
  ShieldCheck, 
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
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-4xl mx-auto w-full text-ink">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink tracking-tight font-display">Settings</h1>
        <p className="text-ink-muted text-sm mt-1">Customize your video, audio, and personal profile preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Profile Card settings */}
        <div className="md:col-span-6 space-y-6">
          <Card className="border-surface-border bg-white shadow-sm rounded-lg">
            <CardHeader className="border-b border-surface-border pb-4">
              <CardTitle className="text-lg font-bold text-ink flex items-center font-display">
                <UserIcon className="h-5 w-5 mr-2 text-brand" />
                Profile Settings
              </CardTitle>
              <CardDescription className="text-ink-muted text-xs">
                Update your personal name and details shown in meetings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-16 w-16 border border-surface-border">
                    <AvatarFallback className="bg-brand text-white font-bold text-2xl">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-ink text-base font-display">{name}</h4>
                    <p className="text-xs text-ink-muted">{email}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-semibold text-ink">
                    Display Name
                  </Label>
                  <Input 
                    id="displayName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-surface text-ink border-surface-border focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="userEmail" className="text-xs font-semibold text-ink">
                    Email Address
                  </Label>
                  <Input 
                    id="userEmail"
                    value={email}
                    disabled
                    className="bg-surface-sunken text-ink-muted border-surface-border cursor-not-allowed min-h-[44px]"
                  />
                </div>

                {updateMessage && (
                  <p className="text-xs text-success font-semibold flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    {updateMessage}
                  </p>
                )}

                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
                >
                  {isUpdating ? 'Updating...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Media / Devices preference settings */}
        <div className="md:col-span-6 space-y-6">
          <Card className="border-surface-border bg-white shadow-sm rounded-lg">
            <CardHeader className="border-b border-surface-border pb-4">
              <CardTitle className="text-lg font-bold text-ink flex items-center font-display">
                <Video className="h-5 w-5 mr-2 text-brand" />
                Video & Audio Devices
              </CardTitle>
              <CardDescription className="text-ink-muted text-xs">
                Select your default camera and microphone sources
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              {/* Camera select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-ink flex items-center">
                  <Video className="h-4 w-4 mr-1 text-ink-muted" />
                  Camera Source
                </Label>
                {cameras.length === 0 ? (
                  <div className="p-3 bg-surface-sunken rounded-lg border border-surface-border text-xs text-ink-muted font-sans">
                    No camera sources detected.
                  </div>
                ) : (
                  <select 
                    value={selectedCam}
                    onChange={(e) => setSelectedCam(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-surface-border bg-surface text-ink text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none transition-colors"
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-ink flex items-center">
                  <Volume2 className="h-4 w-4 mr-1 text-ink-muted" />
                  Microphone Source
                </Label>
                {microphones.length === 0 ? (
                  <div className="p-3 bg-surface-sunken rounded-lg border border-surface-border text-xs text-ink-muted font-sans">
                    No microphone sources detected.
                  </div>
                ) : (
                  <select 
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-surface-border bg-surface text-ink text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none transition-colors"
                  >
                    {microphones.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 bg-surface-sunken rounded-lg border border-surface-border space-y-1">
                <p className="text-xs font-bold text-ink flex items-center">
                  <ShieldCheck className="h-4 w-4 text-success mr-1.5" />
                  Permissions active
                </p>
                <p className="text-[10px] text-ink-muted leading-normal">
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
