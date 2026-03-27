'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useModal } from './ModalProvider';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { createRoomAction, joinRoomAction, addFriendAction, editProfileAction } from '@/app/actions/modals';

export default function Modals() {
  const { activeModal, closeModal, openModal } = useModal();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [createName, setCreateName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [friendIdentifier, setFriendIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errorText, setErrorText] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) closeModal();
    };
    if (activeModal) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal, isPending]);

  useEffect(() => {
    setCreateName('');
    setJoinId('');
    setFriendIdentifier('');
    setDisplayName('');
    setAvatarUrl('');
    setErrorText('');
    setSuccessData(null);
  }, [activeModal]);

  if (!activeModal) return null;

  const handleAction = async (actionFn: any, formData: FormData) => {
    setErrorText('');
    startTransition(async () => {
      const result = await actionFn(null, formData);
      if (result?.error) {
        setErrorText(result.error);
      } else if (result?.success) {
        toast(result.message, 'success');
        if (result.roomCode) {
          setSuccessData({ roomCode: result.roomCode });
        } else {
          closeModal();
        }
      }
    });
  };



  const renderContent = () => {
    switch (activeModal) {
      case 'create_room':
        if (successData?.roomCode) {
          return (
            <div className="flex flex-col gap-6 items-center text-center py-4 text-white">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">Room Created!</h4>
                <p className="text-white/70">Share this Room Code with your friends to let them join:</p>
              </div>
              <div className="bg-black/30 border border-white/10 px-8 py-4 rounded-xl text-3xl font-mono tracking-widest text-indigo-400 select-all">
                {successData.roomCode}
              </div>
              <button type="button" onClick={closeModal} className="mt-4 glass-button px-6 py-2.5 rounded-xl font-medium w-full">
                Go to Room
              </button>
            </div>
          );
        }
        return (
          <form action={(formData) => handleAction(createRoomAction, formData)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide">Room Name</label>
              <input
                autoFocus
                name="name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Design Team"
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30"
                required
                disabled={isPending}
              />
            </div>
            {errorText && <p className="text-sm text-red-400 font-medium">{errorText}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={closeModal} disabled={isPending} className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium">Cancel</button>
              <button type="submit" disabled={isPending} className="glass-button px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2">
                {isPending && <Loader2 className="animate-spin w-4 h-4" />} Create
              </button>
            </div>
          </form>
        );
      case 'join_room':
        return (
          <form action={(formData) => handleAction(joinRoomAction, formData)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide flex items-center gap-2">
                Room Code or Name
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Easiest: 6-char code</span>
              </label>
              <input
                autoFocus
                name="identifier"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="ABC123 or room name"
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30 uppercase tracking-wider font-mono"
                required
                disabled={isPending}
              />
              <p className="text-xs text-white/40">Enter the 6-character Room Code (e.g., ABC123) or exact room name</p>
            </div>
            {errorText && <p className="text-sm text-red-400 font-medium">{errorText}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={closeModal} disabled={isPending} className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium">Cancel</button>
              <button type="submit" disabled={isPending} className="glass-button px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2">
                {isPending && <Loader2 className="animate-spin w-4 h-4" />} Join Room
              </button>
            </div>
          </form>
        );
      case 'add_friend':
        return (
          <form action={(formData) => handleAction(addFriendAction, formData)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide flex items-center gap-2">
                Friend's Username or User Tag
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Recommended: username#1234</span>
              </label>
              <input
                autoFocus
                name="identifier"
                value={friendIdentifier}
                onChange={(e) => setFriendIdentifier(e.target.value)}
                placeholder="johnDoe#1234 or exact username"
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30"
                required
                disabled={isPending}
              />
              <p className="text-xs text-white/40">User Tags are unique and easier to find! Format: username#1234</p>
            </div>
            {errorText && <p className="text-sm text-red-400 font-medium">{errorText}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={closeModal} disabled={isPending} className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium">Cancel</button>
              <button type="submit" disabled={isPending} className="glass-button px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2">
                {isPending && <Loader2 className="animate-spin w-4 h-4" />} Send Request
              </button>
            </div>
          </form>
        );
      case 'edit_profile':
        return (
          <form action={(formData) => handleAction(editProfileAction, formData)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide">Display Name</label>
              <input
                autoFocus
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="New Username"
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30"
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide">Avatar URL (Optional)</label>
              <input
                name="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30"
                disabled={isPending}
              />
            </div>
            {errorText && <p className="text-sm text-red-400 font-medium">{errorText}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={closeModal} disabled={isPending} className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium">Cancel</button>
              <button type="submit" disabled={isPending} className="glass-button px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2">
                {isPending && <Loader2 className="animate-spin w-4 h-4" />} Save
              </button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch(activeModal) {
      case 'create_room': return 'Create Room';
      case 'join_room': return 'Join Room';
      case 'add_friend': return 'Add Friend';
      case 'edit_profile': return 'Edit Profile';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl border-white/20 bg-[#0b1326]/90">
        <button 
          onClick={closeModal}
          disabled={isPending}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <h3 className="text-2xl font-bold text-white mb-6">
          {getTitle()}
        </h3>
        {renderContent()}
      </div>
    </div>
  );
}
