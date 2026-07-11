'use strict';
'use client';

import React, { useState } from 'react';
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

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Contacts</h1>
          <p className="text-slate-400 text-sm mt-1 font-semibold">Find colleagues, add connections, and start quick audio/video syncs</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-lg min-h-[400px]">
        {/* Search bar header */}
        <div className="p-4 border-b border-slate-800 flex items-center bg-slate-900/60">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search contacts by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-800 bg-slate-950 text-white focus:border-blue-500"
            />
          </div>
        </div>

        {/* Contacts list */}
        {contacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Users className="h-12 w-12 mb-2 text-slate-600 animate-pulse" />
            <p className="font-semibold text-slate-400">Your contacts list is empty</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">Invite coworkers and friends to connect instantly for secure, high-definition video calls.</p>
            <Button onClick={() => setIsAddOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs">
              Add Contact
            </Button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Search className="h-12 w-12 mb-2 text-slate-600" />
            <p className="font-semibold text-slate-400">No contacts found</p>
            <p className="text-xs text-slate-500 mt-1">No matches found for "{searchQuery}". Try a different spelling or email format.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="divide-y divide-slate-800/50">
              {filteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="flex items-center justify-between p-4 hover:bg-slate-900/20 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-slate-850">
                        <AvatarImage src={contact.avatarUrl} />
                        <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
                          {contact.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status indicator badge */}
                      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 ${
                        contact.status === 'available' ? 'bg-green-500' :
                        contact.status === 'busy' ? 'bg-orange-500' : 'bg-slate-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white"
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
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <Mail className="h-5 w-5 mr-2 text-blue-500" />
              Add Contact by Email
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Input their email address to add them to your contact listing directory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="addEmail" className="text-sm font-semibold text-slate-300">
                Email Address
              </Label>
              <Input 
                id="addEmail"
                placeholder="colleague@example.com"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-blue-500"
              />
            </div>
            
            {addError && (
              <p className="text-xs text-red-400 font-semibold">{addError}</p>
            )}

            {addSuccess && (
              <p className="text-xs text-green-400 font-semibold">{addSuccess}</p>
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
                className="border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                Close
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
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
