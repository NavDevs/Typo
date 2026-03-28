'use client';

import React, { useState } from 'react';
import SidebarProfile from './SidebarProfile';
import { useRooms } from '@/hooks/useRooms';
import { useUsers } from '@/hooks/useUsers';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { Hash, User as UserIcon, Users, Plus, LogOut, UserMinus, Loader2 } from 'lucide-react';
import { useModal } from './ModalProvider';
import { PresenceState } from '@/hooks/usePresence';
import { ChatConfig } from './ChatDashboard';
import { unfriendAction, leaveRoomAction } from '@/app/actions/modals';
import { useToast } from '@/components/ui/ToastProvider';

type SidebarProps = {
  activeChat: ChatConfig | null;
  onChatSelect: (chat: ChatConfig) => void;
  onlineUsers: Record<string, PresenceState>;
  onChatClear?: () => void;
};

type ContextMenu = {
  x: number;
  y: number;
  type: 'room' | 'friend';
  id: string;
  name: string;
} | null;

export default function Sidebar({ activeChat, onChatSelect, onlineUsers, onChatClear }: SidebarProps) {
  const { rooms } = useRooms();
  const { allUsers, friends, refetch } = useUsers();
  const { openModal } = useModal();
  const { toast } = useToast();
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fetch unread counts for all DMs purely for sidebar badge display
  const { unreadCounts } = useDirectMessages(null); 

  // Helper to check if a user is online via Clerk ID
  const isOnline = (clerkId: string) => {
    return Object.values(onlineUsers).some(p => p.clerk_id === clerkId);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'room' | 'friend', id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, name });
  };

  const handleLeaveRoom = async (roomId: string) => {
    setIsProcessing(true);
    try {
      const result = await leaveRoomAction(roomId);
      if (result?.success) {
        toast('Left room successfully', 'success');
        // Clear active chat if we left the active room
        if (activeChat?.type === 'room' && activeChat.id === roomId) {
          onChatClear?.();
        }
        refetch();
      } else {
        toast(result?.error || 'Failed to leave room', 'error');
      }
    } catch {
      toast('Failed to leave room', 'error');
    } finally {
      setIsProcessing(false);
      setContextMenu(null);
    }
  };

  const handleUnfriend = async (friendUserId: string) => {
    setIsProcessing(true);
    try {
      const result = await unfriendAction(friendUserId);
      if (result?.success) {
        toast('Friend removed', 'success');
        // Clear active chat if we unfriended the active DM partner
        if (activeChat?.type === 'dm' && activeChat.userId === friendUserId) {
          onChatClear?.();
        }
        refetch();
      } else {
        toast(result?.error || 'Failed to remove friend', 'error');
      }
    } catch {
      toast('Failed to remove friend', 'error');
    } finally {
      setIsProcessing(false);
      setContextMenu(null);
    }
  };

  return (
    <>
      <div 
        className="flex h-full w-full flex-col p-4 text-white"
        onClick={() => contextMenu && setContextMenu(null)}
      >
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
                <div
                  key={room.id}
                  onClick={() => onChatSelect({ type: 'room', id: room.id })}
                  onContextMenu={(e) => handleContextMenu(e, 'room', room.id, room.name)}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-200 group cursor-pointer ${
                    activeChat?.type === 'room' && activeChat.id === room.id 
                      ? 'bg-indigo-600/20 text-indigo-300' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Hash size={16} className={activeChat?.type === 'room' && activeChat.id === room.id ? 'text-indigo-400' : 'text-white/40'} />
                  <span className="truncate flex-1 text-left">{room.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLeaveRoom(room.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all shrink-0"
                    title="Leave room"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
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
                  <div 
                    key={friend.id} 
                    onClick={() => onChatSelect({ type: 'dm', userId: friend.id })}
                    onContextMenu={(e) => handleContextMenu(e, 'friend', friend.id, friend.display_name || friend.username || 'User')}
                    role="button"
                    tabIndex={0}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm group cursor-pointer transition-all ${
                      isActive ? 'bg-indigo-600/20 text-indigo-300' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
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
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <span className="ml-2 animate-in zoom-in bg-indigo-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnfriend(friend.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                        title="Remove friend"
                      >
                        <UserMinus size={12} />
                      </button>
                    </div>
                  </div>
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

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[61] min-w-[180px] glass-panel border border-white/10 bg-[#0d1530]/95 backdrop-blur-xl shadow-2xl rounded-xl p-1 animate-in zoom-in-95 fade-in duration-150"
            style={{ 
              left: Math.min(contextMenu.x, window.innerWidth - 200), 
              top: Math.min(contextMenu.y, window.innerHeight - 60) 
            }}
          >
            {contextMenu.type === 'room' ? (
              <button
                onClick={() => handleLeaveRoom(contextMenu.id)}
                disabled={isProcessing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                <span>Leave "{contextMenu.name}"</span>
              </button>
            ) : (
              <button
                onClick={() => handleUnfriend(contextMenu.id)}
                disabled={isProcessing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                <span>Unfriend "{contextMenu.name}"</span>
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
