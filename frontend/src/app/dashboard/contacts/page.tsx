'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Video, 
  Search, 
  Mail 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Contact {
  id: string;
  name: string;
  email: string;
  status: 'available' | 'offline' | 'busy';
  avatarUrl?: string;
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

    setContacts([...contacts, newContact]);
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
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-4xl mx-auto w-full text-ink">
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
                      onClick={() => alert("Direct messaging is coming soon! Start a video call to chat in real-time.")}
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

      {/* ──── DIALOG: ADD CONTACT ──── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white border-surface-border text-ink rounded-lg shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ink font-display flex items-center">
              <Mail className="h-5 w-5 mr-2 text-brand" />
              Add Contact by Email
            </DialogTitle>
            <DialogDescription className="text-ink-muted text-sm">
              Input their email address to add them to your contact listing directory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="addEmail" className="text-xs font-semibold text-ink">
                Email Address
              </Label>
              <Input 
                id="addEmail"
                placeholder="colleague@example.com"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="bg-surface text-ink border-surface-border focus-visible:ring-brand focus-visible:ring-offset-2 min-h-[44px] px-3.5"
              />
            </div>
            
            {addError && (
              <p className="text-xs text-danger font-semibold">{addError}</p>
            )}

            {addSuccess && (
              <p className="text-xs text-success font-semibold">{addSuccess}</p>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setAddEmail('');
                  setAddError('');
                  setAddSuccess('');
                  setIsAddOpen(false);
                }}
                className="border-surface-border hover:bg-surface-sunken text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
              >
                Close
              </Button>
              <Button 
                type="submit"
                className="bg-brand hover:bg-brand-hover text-white font-medium focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none min-h-[44px]"
              >
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
