'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, UserPlus, Search, Check } from 'lucide-react';
import { useModal } from './ModalProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { useUsers } from '@/hooks/useUsers';
import { sendRoomInvitationAction } from '@/app/actions/modals';

type InviteToRoomModalProps = {
  roomId: string;
  roomName: string;
};

export default function InviteToRoomModal({ roomId, roomName }: InviteToRoomModalProps) {
  const { closeModal } = useModal();
  const { toast } = useToast();
  const { allUsers, friends } = useUsers();
  const [isPending, startTransition] = useTransition();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [inviteMessage, setInviteMessage] = useState('');
  const [errorText, setErrorText] = useState('');

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query)
    );
  });

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllFriends = () => {
    const friendIds = friends.map(f => f.id);
    setSelectedUserIds(friendIds);
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUserIds.length === 0) {
      setErrorText('Please select at least one user to invite');
      return;
    }

    setErrorText('');
    startTransition(async () => {
      const result = await sendRoomInvitationAction(roomId, selectedUserIds, inviteMessage || undefined);
      
      if (result?.error) {
        setErrorText(result.error);
      } else if (result?.success) {
        toast(result.message || `Sent ${selectedUserIds.length} invitation(s)!`, 'success');
        closeModal();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl border-white/20 bg-[#0b1326]/90 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={closeModal}
          disabled={isPending}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center z-10"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">Invite to Room</h3>
        <p className="text-sm text-white/50 mb-4">Invite friends to join <span className="text-indigo-400">{roomName}</span></p>

        <form onSubmit={handleSendInvites} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by username..."
              className="glass-input w-full pl-10 pr-4 py-2.5 text-white placeholder-white/30"
              disabled={isPending}
            />
          </div>

          {/* Quick Select */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/50">{selectedUserIds.length} selected</span>
            <button
              type="button"
              onClick={selectAllFriends}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              disabled={isPending}
            >
              Select all friends ({friends.length})
            </button>
          </div>

          {/* User List */}
          <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 p-2 custom-scrollbar">
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm">
                No users found
              </div>
            )}
            
            {filteredUsers.map(user => {
              const isSelected = selectedUserIds.includes(user.id);
              const isFriend = friends.some(f => f.id === user.id);
              
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isSelected 
                      ? 'bg-indigo-600/20 text-indigo-300' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                  disabled={isPending}
                >
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-indigo-900/50 flex items-center justify-center border border-white/10">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username || undefined} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <UserPlus size={14} className={isSelected ? 'text-indigo-300' : 'text-white/70'} />
                      )}
                    </div>
                    {isFriend && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500/50" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium truncate">
                      {user.display_name || user.username || 'User'}
                    </div>
                    {isFriend && (
                      <div className="text-xs text-white/40">Friend</div>
                    )}
                  </div>
                  
                  {isSelected && (
                    <Check size={18} className="text-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Optional Message */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/70 tracking-wide">
              Personal Message (Optional)
            </label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Add a personal note to your invitation..."
              className="glass-input w-full px-4 py-3 text-white placeholder-white/30 resize-none"
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Error Message */}
          {errorText && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 font-medium">{errorText}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button 
              type="button" 
              onClick={closeModal} 
              disabled={isPending} 
              className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isPending || selectedUserIds.length === 0} 
              className="glass-button px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="animate-spin w-4 h-4" />}
              <UserPlus size={18} />
              Send {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''} Invitation{selectedUserIds.length !== 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
