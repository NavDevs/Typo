'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import Modals from './Modals';
import SearchOverlay from './SearchOverlay';
import SettingsModal from './SettingsModal';
import { ModalProvider } from './ModalProvider';
import { usePresence } from '@/hooks/usePresence';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUsers } from '@/hooks/useUsers';
import { useNotificationEffects } from '@/hooks/useNotificationEffects';
import { Search, Bell, Settings, CheckCheck, Trash2, Smile, AtSign, UserPlus, MessageCircle, UserX, Loader2 } from 'lucide-react';
import { acceptFriendAction, rejectFriendAction } from '@/app/actions/modals';
import { useToast } from '@/components/ui/ToastProvider';

export type ChatConfig = 
  | { type: 'room'; id: string }
  | { type: 'dm'; userId: string };

export default function ChatDashboard() {
  const [activeChat, setActiveChat] = useState<ChatConfig | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [pendingScrollMessageId, setPendingScrollMessageId] = useState<string | null>(null);
  const [lastNotifId, setLastNotifId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  const { allUsers, currentUser, friends, friendRequests, updatePreferences, refetch } = useUsers();
  const { onlineUsers, updatePresence } = usePresence();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh: refreshNotifications } = useNotifications(currentUser?.id || null);
  const { permission, subscribeToPush } = usePushNotifications(currentUser?.id || null);
  const { triggerNotification } = useNotificationEffects();
  const { toast } = useToast();

  // Handle new notifications
  useEffect(() => {
    const latest = notifications[0];
    if (latest && !latest.is_read && latest.id !== lastNotifId) {
      setLastNotifId(latest.id);
      
      triggerNotification(
        latest.type === 'dm' ? 'dm' : 'mention',
        'System',
        latest.content,
        currentUser?.preferences || null
      );
    }
  }, [notifications, lastNotifId, triggerNotification, currentUser?.preferences]);

  // Apply accent color dynamically
  useEffect(() => {
    if (!currentUser?.preferences?.accent) return;
    const colors: Record<string, string> = {
      indigo: '#6366f1',
      purple: '#8b5cf6',
      teal: '#14b8a6',
      green: '#22c55e',
      pink: '#ec4899',
    };
    const hex = colors[currentUser.preferences.accent];
    document.documentElement.style.setProperty('--color-indigo-accent', hex);
    document.documentElement.style.setProperty('--color-button-glow', `${hex}4d`); // 30% alpha
  }, [currentUser?.preferences?.accent]);

  const handleSearchNavigate = useCallback((chat: ChatConfig, messageId: string) => {
    setActiveChat(chat);
    setPendingScrollMessageId(messageId);
    
    // Wait for messages to load, then scroll
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-400/60', 'rounded-2xl');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-indigo-400/60', 'rounded-2xl');
        }, 2500);
      }
      setPendingScrollMessageId(null);
    }, 1500);
  }, []);

  return (
    <ModalProvider>
      <div className={`glass-panel flex h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md relative chat-container ${
        currentUser?.preferences?.density === 'compact' ? 'chat-compact' : ''
      }`}>
        {/* Mobile Sidebar Overlay */}
        {(isSidebarOpen || isNotifOpen) && (
          <div 
            className="absolute inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity"
            onClick={() => { setIsSidebarOpen(false); setIsNotifOpen(false); }}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          absolute md:relative z-30 h-full w-80 border-r border-white/10 bg-[#0b1326]/95 md:bg-black/20 backdrop-blur-xl transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar 
            activeChat={activeChat} 
            onChatSelect={(chat: ChatConfig) => {
              setActiveChat(chat);
              setIsSidebarOpen(false);
            }}
            onlineUsers={onlineUsers}
            onChatClear={() => setActiveChat(null)}
          />
          
          {/* Settings Button in Sidebar Bottom */}
          <div className="absolute bottom-4 left-4 right-4 group">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
            >
              <div className="flex items-center gap-3">
                <Settings size={18} />
                <span className="text-sm font-medium">Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative bg-transparent min-w-0">
          
          {/* Top Navbar Actions */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            {/* Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-indigo-400 hover:bg-white/10 transition-all shadow-lg backdrop-blur-sm"
              title="Search messages"
            >
              <Search size={16} />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-all shadow-lg backdrop-blur-sm ${
                  unreadCount > 0 
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 animate-pulse' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-indigo-400 hover:bg-white/10'
                }`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white shadow-lg shadow-indigo-500/20">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div className="absolute top-12 right-0 w-80 glass-panel border border-white/10 bg-[#0d1530]/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 z-50 flex flex-col max-h-[400px]">
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <span className="text-sm font-bold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Friend Requests Section */}
                    {friendRequests.length > 0 && (
                      <div className="border-b border-white/5">
                        <div className="p-3 bg-green-500/5">
                          <div className="flex items-center gap-2 mb-2">
                            <UserPlus size={14} className="text-green-400" />
                            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                              Friend Requests ({friendRequests.length})
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 p-2">
                          {friendRequests.map(req => {
                            const sender = allUsers.find(u => u.id === req.sender_id);
                            const isProcessing = processingRequestId === req.id;
                            return (
                              <div 
                                key={req.id} 
                                className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                    {sender?.avatar_url ? (
                                      <img src={sender.avatar_url} alt={sender.username || undefined} className="h-full w-full rounded-full object-cover" />
                                    ) : (
                                      <UserPlus size={14} className="text-green-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white font-medium truncate">
                                      {sender?.display_name || sender?.username || 'Unknown User'}
                                    </p>
                                    <p className="text-[10px] text-white/40">Wants to be friends</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-1">
                                  <button
                                    disabled={isProcessing}
                                    onClick={async () => {
                                      setProcessingRequestId(req.id);
                                      try {
                                        const result = await acceptFriendAction(req.id);
                                        if (result?.success) {
                                          toast('Friend request accepted!', 'success');
                                          refetch();
                                          refreshNotifications();
                                        } else {
                                          toast(result?.error || 'Failed to accept', 'error');
                                        }
                                      } catch {
                                        toast('Failed to accept request', 'error');
                                      } finally {
                                        setProcessingRequestId(null);
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />} Accept
                                  </button>
                                  <button
                                    disabled={isProcessing}
                                    onClick={async () => {
                                      setProcessingRequestId(req.id);
                                      try {
                                        const result = await rejectFriendAction(req.id);
                                        if (result?.success) {
                                          toast('Friend request rejected', 'success');
                                          refetch();
                                          refreshNotifications();
                                        } else {
                                          toast(result?.error || 'Failed to reject', 'error');
                                        }
                                      } catch {
                                        toast('Failed to reject request', 'error');
                                      } finally {
                                        setProcessingRequestId(null);
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />} Decline
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Regular Notifications — only show unread */}
                    {(() => {
                      const unreadNotifs = notifications.filter(n => !n.is_read);
                      if (unreadNotifs.length === 0 && friendRequests.length === 0) {
                        return (
                          <div className="p-8 text-center text-white/30 text-xs italic">
                            No new notifications
                          </div>
                        );
                      }
                      return unreadNotifs.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => { markAsRead(n.id); }}
                          className="p-4 border-b border-white/5 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer relative bg-indigo-500/[0.03]"
                        >
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full" />
                          <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
                            n.type === 'dm' ? 'bg-purple-500/10 text-purple-400' :
                            n.type === 'mention' ? 'bg-indigo-500/10 text-indigo-400' :
                            n.type.includes('reaction') ? 'bg-yellow-500/10 text-yellow-400' :
                            n.type === 'friend_request' ? 'bg-green-500/10 text-green-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {n.type === 'dm' ? <MessageCircle size={14} /> :
                             n.type === 'mention' ? <AtSign size={14} /> :
                             n.type.includes('reaction') ? <Smile size={14} /> :
                             n.type === 'friend_request' ? <UserPlus size={14} /> :
                             <Bell size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium">{n.content}</p>
                            <span className="text-[10px] text-white/30">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <ChatArea 
            activeChat={activeChat} 
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onlineUsers={onlineUsers}
            updatePresence={updatePresence}
          />
        </div>

        {/* Modals Container */}
        <Modals />

        {/* Search Overlay */}
        {isSearchOpen && (
          <SearchOverlay
            onClose={() => setIsSearchOpen(false)}
            onNavigate={handleSearchNavigate}
          />
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          preferences={currentUser?.preferences || null}
          onUpdate={updatePreferences}
          permission={permission}
          onSubscribe={subscribeToPush}
        />
      </div>
    </ModalProvider>
  );
}
