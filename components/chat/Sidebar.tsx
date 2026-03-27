'use client';

import React from 'react';
import SidebarProfile from './SidebarProfile';
import { useRooms } from '@/hooks/useRooms';
import { useUsers } from '@/hooks/useUsers';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { Hash, User as UserIcon, Users, Plus, MessageCircle } from 'lucide-react';
import { useModal } from './ModalProvider';
import { PresenceState } from '@/hooks/usePresence';
import { ChatConfig } from './ChatDashboard';

type SidebarProps = {
  activeChat: ChatConfig | null;
  onChatSelect: (chat: ChatConfig) => void;
  onlineUsers: Record<string, PresenceState>;
};

export default function Sidebar({ activeChat, onChatSelect, onlineUsers }: SidebarProps) {
  const { rooms } = useRooms();
  const { allUsers, friends } = useUsers();
  const { openModal } = useModal();
  
  // Fetch unread counts for all DMs purely for sidebar badge display
  // We don't need activeDmUserId for this, it fetches globally for current user
  const { unreadCounts } = useDirectMessages(null); 

  // Helper to check if a user is online via Clerk ID
  const isOnline = (clerkId: string) => {
    return Object.values(onlineUsers).some(p => p.clerk_id === clerkId);
  };

  return (
    <div className="flex h-full w-full flex-col p-4 text-white">
      <div className="mb-6 flex flex-col gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-2">
          <img src="/logo.png" alt="Typo Logo" className="w-8 h-8 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <span className="text-xl font-bold text-white tracking-tight">Typo</span>
        </div>
        <SidebarProfile />
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
        {/* Rooms Section */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            <span>Rooms</span>
            <button onClick={() => openModal('create_room')} className="hover:text-indigo-400 transition-colors" title="Create Room">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {rooms.length === 0 && <div className="px-2 text-sm text-white/40">No rooms joined</div>}
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => onChatSelect({ type: 'room', id: room.id })}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200 ${
                  activeChat?.type === 'room' && activeChat.id === room.id 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Hash size={16} className={activeChat?.type === 'room' && activeChat.id === room.id ? 'text-indigo-400' : 'text-white/40'} />
                <span className="truncate">{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Friends Section */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            <span>Direct Messages</span>
            <button onClick={() => openModal('add_friend')} className="hover:text-indigo-400 transition-colors" title="Add Friend">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {friends.length === 0 && <div className="px-2 text-sm text-white/40">No friends yet</div>}
            {friends.map(friend => {
              const online = isOnline(friend.clerk_id);
              const unread = unreadCounts[friend.id] || 0;
              const isActive = activeChat?.type === 'dm' && activeChat.userId === friend.id;

              return (
                <button 
                  key={friend.id} 
                  onClick={() => onChatSelect({ type: 'dm', userId: friend.id })}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm group cursor-pointer transition-all ${
                    isActive ? 'bg-indigo-600/20 text-indigo-300' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="relative shrink-0">
                      <div className="h-6 w-6 rounded-full bg-indigo-900/50 flex items-center justify-center border border-white/10">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.username || undefined} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <UserIcon size={12} className={isActive ? 'text-indigo-300' : 'text-white/70'} />
                        )}
                      </div>
                      {online && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border border-[#0b1326] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                      )}
                    </div>
                    <span className="truncate">{friend.display_name || friend.username || 'User'}</span>
                  </div>
                  
                  {unread > 0 && (
                    <span className="shrink-0 ml-2 animate-in zoom-in bg-indigo-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* All Users Section (Directory) */}
        <div>
          <div className="flex items-center gap-1 mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/50 border-t border-white/10 pt-6">
            <Users size={14} />
            <span>All Users</span>
          </div>
          <div className="space-y-1">
            {allUsers.map(u => {
              const online = isOnline(u.clerk_id);
              return (
                <div key={u.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-white/60">
                  <div className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                  <span className="truncate">{u.display_name || u.username || 'User'}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
