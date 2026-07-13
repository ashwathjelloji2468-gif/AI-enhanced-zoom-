'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Video, 
  Search, 
  Mail,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Contact {
  id: string;
  name: string;
  email: string;
  status: 'available' | 'offline' | 'busy';
  avatarUrl?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

const INITIAL_CONTACTS: Contact[] = [
  { id: '1', name: 'Alice Smith', email: 'alice@example.com', status: 'available' },
  { id: '2', name: 'Bob Johnson', email: 'bob@example.com', status: 'busy' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', status: 'offline' },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', status: 'available' },
];

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Current logged in user & socket DMs states
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [activeChatContact, setActiveChatContact] = useState<Contact | null>(null);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');

  // Load contacts from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('connect_contacts');
      if (saved) {
        try {
          setContacts(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved contacts:', e);
        }
      } else {
        localStorage.setItem('connect_contacts', JSON.stringify(INITIAL_CONTACTS));
      }
    }
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error('Failed to authenticate user profile:', err);
      }
    };
    fetchUser();
  }, []);

  // Initialize socket connections for direct messaging
  useEffect(() => {
    if (!currentUser) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    const socketClient = io(socketUrl, { withCredentials: true });

    socketClient.on('connect', () => {
      console.log('Direct Messaging presence tunnel connected:', socketClient.id);
      socketClient.emit('join-user', { userId: currentUser.id });
    });

    socketClient.on('direct-message', (msg: any) => {
      console.log('Received direct message through socket:', msg);

      // Persist to multi-tab local message storage
      const dmKey = `connect_dm_${[currentUser.id, msg.senderId].sort().join('_')}`;
      const saved = localStorage.getItem(dmKey);
      let messagesList = [];
      if (saved) {
        try {
          messagesList = JSON.parse(saved);
        } catch (e) {}
      }

      if (!messagesList.some((m: any) => m.id === msg.id)) {
        const updated = [...messagesList, msg];
        localStorage.setItem(dmKey, JSON.stringify(updated));

        // If currently chatting with this user, update active view
        setActiveMessages((prev) => {
          // Double-check active messages array to prevent duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, [currentUser]);

  // Open Chat overlay
  const openChat = (contact: Contact) => {
    if (!currentUser) return;
    setActiveChatContact(contact);

    const dmKey = `connect_dm_${[currentUser.id, contact.id].sort().join('_')}`;
    const saved = localStorage.getItem(dmKey);
    if (saved) {
      try {
        setActiveMessages(JSON.parse(saved));
      } catch (e) {
        setActiveMessages([]);
      }
    } else {
      setActiveMessages([]);
    }
  };

  // Send Direct Message
  const sendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUser || !activeChatContact) return;

    const newMessage = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: messageInput.trim(),
      createdAt: new Date().toISOString(),
    };

    const dmKey = `connect_dm_${[currentUser.id, activeChatContact.id].sort().join('_')}`;
    const updated = [...activeMessages, newMessage];

    setActiveMessages(updated);
    localStorage.setItem(dmKey, JSON.stringify(updated));

    // Emit to socket server
    if (socket) {
      socket.emit('direct-message', {
        recipientId: activeChatContact.id,
        message: newMessage,
      });
    }

    setMessageInput('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!addEmail.trim()) {
      setAddError('Please enter an email address');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(addEmail)) {
      setAddError('Please enter a valid email address');
      return;
    }

    // Check if duplicate
    const exists = contacts.some(c => c.email.toLowerCase() === addEmail.toLowerCase().trim());
    if (exists) {
      setAddError('This email is already in your contacts');
      return;
    }

    // Mock add new contact
    const namePart = addEmail.split('@')[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: formattedName,
      email: addEmail.trim(),
      status: 'offline',
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('connect_contacts', JSON.stringify(updatedContacts));
    }
    setAddSuccess(`${formattedName} has been added to your contacts list.`);
    setAddEmail('');
  };

  const startCall = async (contact: Contact) => {
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Call with ${contact.name}`,
          waitingRoom: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Redirect to meeting room
      router.push(`/meeting/${data.meeting.code}`);
    } catch (err: any) {
      alert(err.message || 'Could not start instant call');
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden text-ink">
      
      {/* Main content grid column */}
      <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink tracking-tight font-display">Contacts</h1>
            <p className="text-ink-muted text-sm mt-1">Find colleagues, add connections, and start quick syncs</p>
          </div>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-colors duration-150 ease-out text-white font-medium flex items-center focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
            aria-label="Add Contact Button"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        <div className="bg-white border border-surface-border rounded-lg flex flex-col overflow-hidden shadow-sm min-h-[400px]">
          {/* Search bar header */}
          <div className="p-4 border-b border-surface-border flex items-center bg-surface-sunken">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
              <Input 
                placeholder="Search contacts by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-surface text-ink border-surface-border hover:border-ink-faint transition-colors duration-150 ease-out focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px]"
              />
            </div>
          </div>

          {/* Contacts list */}
          {contacts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-muted">
              <Users className="h-12 w-12 mb-2 text-ink-faint animate-pulse" />
              <p className="font-semibold">Your contacts list is empty</p>
              <p className="text-xs text-ink-muted mt-1 max-w-xs">Invite coworkers and friends to connect instantly for secure video calls.</p>
              <Button 
                onClick={() => setIsAddOpen(true)} 
                className="mt-4 bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-colors duration-150 ease-out text-white font-medium text-xs focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
              >
                Add Contact
              </Button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-muted">
              <Search className="h-12 w-12 mb-2 text-ink-faint" />
              <p className="font-semibold">No contacts found</p>
              <p className="text-xs text-ink-muted mt-1">No matches found for "{searchQuery}". Try a different spelling.</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="divide-y divide-surface-border">
                {filteredContacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-surface-border">
                          <AvatarImage src={contact.avatarUrl} />
                          <AvatarFallback className="bg-brand-subtle text-brand-text font-bold">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status indicator badge */}
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                          contact.status === 'available' ? 'bg-success' :
                          contact.status === 'busy' ? 'bg-danger' : 'bg-slate-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-bold text-ink">{contact.name}</p>
                        <p className="text-xs text-ink-muted">{contact.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => openChat(contact)}
                        className="border border-surface-border bg-transparent hover:border-brand hover:bg-brand-subtle hover:text-brand-text transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
                        aria-label={`Send chat message to ${contact.name}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => startCall(contact)}
                        className="bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-colors duration-150 ease-out text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
                        aria-label={`Start video call with ${contact.name}`}
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* ──── DIRECT MESSAGE SIDE DRAWER ──── */}
      {activeChatContact && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-surface-border shadow-2xl flex flex-col overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-sunken">
            <div className="flex items-center space-x-3">
              <Avatar className="h-9 w-9 border border-surface-border">
                <AvatarImage src={activeChatContact.avatarUrl} />
                <AvatarFallback className="bg-brand-subtle text-brand-text font-bold">
                  {activeChatContact.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-ink text-sm font-display">{activeChatContact.name}</h3>
                <p className="text-[10px] text-ink-muted flex items-center">
                  <span className={`h-1.5 w-1.5 rounded-full mr-1 ${
                    activeChatContact.status === 'available' ? 'bg-success' :
                    activeChatContact.status === 'busy' ? 'bg-danger' : 'bg-slate-400'
                  }`} />
                  {activeChatContact.status}
                </p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveChatContact(null)} 
              className="text-ink-muted hover:text-ink h-8 w-8 rounded-full p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none transition-colors duration-150 ease-out"
              aria-label="Close Chat"
            >
              ✕
            </Button>
          </div>

          {/* Messages Thread */}
          <ScrollArea className="flex-1 p-4 bg-surface-sunken">
            <div className="space-y-4">
              {activeMessages.length === 0 ? (
                <div className="text-center p-8 text-ink-muted text-xs font-sans">
                  No messages yet. Send a direct message to start the conversation!
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col space-y-1 ${
                      msg.senderId === currentUser?.id ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[9px] text-ink-muted px-1 font-mono">
                      {msg.senderId === currentUser?.id ? 'You' : msg.senderName}
                    </span>
                    <p className={`px-3 py-2 rounded-lg text-xs leading-normal max-w-[85%] break-words border ${
                      msg.senderId === currentUser?.id
                        ? 'bg-brand text-white border-brand rounded-tr-none'
                        : 'bg-white text-ink border-surface-border rounded-tl-none'
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Form */}
          <form onSubmit={sendDirectMessage} className="p-4 border-t border-surface-border bg-white flex items-center space-x-2">
            <Input 
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="bg-surface text-ink border-surface-border hover:border-ink-faint focus-visible:ring-brand focus-visible:ring-offset-2 flex-1 min-h-[44px] text-xs py-1.5 transition-colors duration-150 ease-out"
            />
            <Button 
              type="submit" 
              size="sm"
              className="bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-150 ease-out text-white min-h-[44px] px-4 font-semibold focus-visible:ring-2 focus-visible:ring-brand"
            >
              Send
            </Button>
          </form>
        </aside>
      )}

      {/* ──── DIALOG: ADD CONTACT ──── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white border-surface-border text-ink rounded-lg shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ink font-display flex items-center">
              <Mail className="h-5 w-5 mr-2 text-brand" />
              Add Contact by Email
            </DialogTitle>
            <DialogDescription className="text-ink-muted text-sm">
              Enter their email address to add them to your mock contacts drawer list.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail" className="text-xs font-semibold">
                Email Address
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="colleague@example.com"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="bg-surface text-ink border-surface-border hover:border-ink-faint focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px] transition-colors duration-150 ease-out"
              />
            </div>

            {addError && (
              <div className="rounded-md bg-danger/10 border border-danger/25 p-3 text-xs text-danger font-semibold">
                {addError}
              </div>
            )}

            {addSuccess && (
              <div className="rounded-md bg-success/10 border border-success/25 p-3 text-xs text-success font-semibold flex items-center">
                <UserCheck className="h-4 w-4 mr-1.5" />
                {addSuccess}
              </div>
            )}

            <DialogFooter className="bg-transparent border-none m-0 p-0 pt-4 flex flex-row justify-end gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsAddOpen(false);
                  setAddError('');
                  setAddSuccess('');
                  setAddEmail('');
                }}
                className="border border-surface-border bg-transparent hover:bg-surface-sunken text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px] px-6 rounded-lg text-sm font-medium transition-colors duration-150 ease-out cursor-pointer"
              >
                Cancel
              </button>
              <Button 
                type="submit"
                className="bg-brand hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-150 ease-out text-white font-medium min-h-[44px] px-6"
              >
                Add Connection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
