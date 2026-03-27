'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useRoomPins } from '@/hooks/useRoomPins';
import { useRooms } from '@/hooks/useRooms';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@clerk/nextjs';
import MessageBubble, { Reaction, ReplyInfo } from './MessageBubble';
import ContextMenu from './ContextMenu';
import { Hash, Send, Menu, User as UserIcon, Paperclip, X, Pencil, Trash2, Reply, SmilePlus, Pin, PinOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { PresenceState } from '@/hooks/usePresence';
import { ChatConfig } from './ChatDashboard';

type ChatAreaProps = {
  activeChat: ChatConfig | null;
  onOpenSidebar: () => void;
  onlineUsers: Record<string, PresenceState>;
  updatePresence: (newState: Partial<PresenceState>) => Promise<void>;
};

export default function ChatArea({ activeChat, onOpenSidebar, onlineUsers, updatePresence }: ChatAreaProps) {
  const { allUsers } = useUsers();
  const { rooms } = useRooms();
  const { userId: clerkId } = useAuth();
  
  const currentUser = allUsers.find(u => u.clerk_id === clerkId);
  const currentUserDbId = currentUser?.id;

  const isRoom = activeChat?.type === 'room';
  const isDm = activeChat?.type === 'dm';
  
  const activeRoomId = isRoom ? activeChat.id : null;
  const activeDmUserId = isDm ? activeChat.userId : null;

  const { messages: roomMessages, reactions: roomReactions, sendMessage: sendRoomMessage, toggleReaction: toggleRoomReaction, updateMessageContent: updateRoomMsg, deleteMessage: deleteRoomMsg } = useChatMessages(activeRoomId);
  const { messages: dmMessages, reactions: dmReactions, sendDirectMessage, toggleReaction: toggleDmReaction, updateMessageContent: updateDmMsg, deleteMessage: deleteDmMsg } = useDirectMessages(activeDmUserId);
  const { pins, pinMessage, unpinMessage } = useRoomPins(activeRoomId);
  
  const dmTypingChannelId = currentUserDbId && activeDmUserId 
    ? [currentUserDbId, activeDmUserId].sort().join('-') 
    : null;
    
  const typingChannelId = isRoom ? activeRoomId : isDm ? dmTypingChannelId : null;
  const { typingUsers, broadcastTyping, stopTyping } = useTypingIndicator(typingChannelId);
  const { uploadImage, isUploading, uploadProgress } = useImageUpload();
  
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string; isMine: boolean; content: string; createdAt: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPinBannerCollapsed, setIsPinBannerCollapsed] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUsername = allUsers.find(u => u.clerk_id === clerkId)?.username || 'Someone';
  
  const activeMessages = isRoom ? roomMessages : isDm ? dmMessages : [];
  const activeReactions = isRoom ? roomReactions : isDm ? dmReactions : [];

  // Build a reactions map: { messageId -> Reaction[] }
  const reactionsMap = useMemo(() => {
    const map: Record<string, Reaction[]> = {};
    activeReactions.forEach(r => {
      if (!map[r.message_id]) map[r.message_id] = [];
      const existing = map[r.message_id].find(x => x.emoji === r.emoji);
      if (existing) {
        existing.count += 1;
        existing.userIds.push(r.user_id);
      } else {
        map[r.message_id].push({ emoji: r.emoji, count: 1, userIds: [r.user_id] });
      }
    });
    return map;
  }, [activeReactions]);

  // Build a reply info map
  const replyInfoMap = useMemo(() => {
    const map: Record<string, ReplyInfo> = {};
    activeMessages.forEach(msg => {
      const sender = allUsers.find(u => u.id === msg.sender_id);
      map[msg.id] = {
        id: msg.id,
        senderName: sender?.display_name || sender?.username || 'Unknown',
        content: msg.content,
      };
    });
    return map;
  }, [activeMessages, allUsers]);

  const activeFriend = isDm ? allUsers.find(u => u.id === activeDmUserId) : null;
  const friendIsOnline = activeFriend ? Object.values(onlineUsers).some(p => p.clerk_id === activeFriend.clerk_id) : false;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    if (value.trim().length > 0) {
      broadcastTyping(currentUsername);
    }
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map(u => u.username);
    if (names.length === 1) return <>{names[0]} is typing</>;
    if (names.length === 2) return <>{names[0]} and {names[1]} are typing</>;
    return <>Several people are typing</>;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  if (!activeChat) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center p-8 bg-transparent relative">
        <button 
          onClick={onOpenSidebar}
          className="absolute top-4 left-4 md:hidden p-2 text-white/70 hover:text-white bg-white/5 rounded-lg border border-white/10"
        >
          <Menu size={24} />
        </button>

        <div className="glass-panel mx-auto flex h-32 w-32 items-center justify-center rounded-full mb-6 relative group">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl group-hover:bg-indigo-500/30 transition-all duration-700" />
          <Hash size={48} className="text-indigo-400 opacity-60 z-10" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">No Conversation Selected</h3>
        <p className="text-indigo-200/60 max-w-sm">
          Select a room or a friend from the sidebar to begin chatting.
        </p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError("Only images are allowed (jpg, png, gif, webp).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Max file size: 50MB.");
      return;
    }

    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserDbId) return;
    if (!inputText.trim() && !selectedImage) return;

    const currentText = inputText.trim();
    let uploadedUrl = null;
    const replyId = replyingTo?.id || null;

    try {
      if (selectedImage) {
        const destId = isRoom ? activeRoomId! : activeDmUserId!;
        uploadedUrl = await uploadImage(selectedImage, currentUserDbId, destId);
      }

      if (isRoom && activeRoomId) {
        sendRoomMessage(currentText, currentUserDbId, uploadedUrl, replyId);
      } else if (isDm && activeDmUserId) {
        await sendDirectMessage(currentText, activeDmUserId, uploadedUrl, replyId);
      }

      setInputText('');
      clearImageSelection();
      setReplyingTo(null);
      stopTyping(currentUsername);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload image. Please try again.");
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!currentUserDbId) return;
    if (isRoom) {
      toggleRoomReaction(messageId, currentUserDbId, emoji);
    } else if (isDm) {
      toggleDmReaction(messageId, currentUserDbId, emoji);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: any, isMine: boolean) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId: msg.id,
      isMine,
      content: msg.content,
      createdAt: msg.created_at,
    });
  };

  const handleEdit = (messageId: string) => {
    // Dispatch custom event to MessageBubble to enter edit mode
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.dispatchEvent(new Event('startEdit'));
    }
  };

  const handleEditSave = (messageId: string, newContent: string) => {
    if (isRoom) {
      updateRoomMsg(messageId, newContent);
    } else if (isDm) {
      updateDmMsg(messageId, newContent);
    }
  };

  const handleDelete = (messageId: string) => {
    setDeleteConfirm(messageId);
  };

  const handlePin = async (messageId: string) => {
    if (!currentUserDbId) return;
    try {
      await pinMessage(messageId, currentUserDbId);
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  };

  const handleUnpin = async (messageId: string) => {
    try {
      await unpinMessage(messageId);
    } catch (err) {
      console.error('Failed to unpin message:', err);
    }
  };

  const jumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-400/60', 'rounded-2xl');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-400/60', 'rounded-2xl');
      }, 2500);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (isRoom) {
      deleteRoomMsg(deleteConfirm);
    } else if (isDm) {
      deleteDmMsg(deleteConfirm);
    }
    setDeleteConfirm(null);
  };

  const getContextMenuItems = () => {
    if (!contextMenu) return [];
    const items = [];
    const senderName = (() => {
      const msg = activeMessages.find(m => m.id === contextMenu.messageId);
      const sender = allUsers.find(u => u.id === msg?.sender_id);
      return sender?.display_name || sender?.username || 'Unknown';
    })();

    const isPinned = pins.some(p => p.message_id === contextMenu.messageId);

    // Reply and React are always available
    items.push({
      label: 'Reply',
      icon: <Reply size={16} />,
      onClick: () => {
        const msg = activeMessages.find(m => m.id === contextMenu.messageId);
        if (msg) {
          setReplyingTo({ id: msg.id, senderName, content: msg.content });
        }
      },
    });

    if (isRoom) {
      items.push({
        label: isPinned ? 'Unpin' : 'Pin Message',
        icon: isPinned ? <PinOff size={16} /> : <Pin size={16} />,
        onClick: () => isPinned ? handleUnpin(contextMenu.messageId) : handlePin(contextMenu.messageId),
      });
    }

    if (contextMenu.isMine) {
      const age = Date.now() - new Date(contextMenu.createdAt).getTime();
      const canEdit = age < 24 * 60 * 60 * 1000;
      
      if (canEdit) {
        items.push({
          label: 'Edit',
          icon: <Pencil size={16} />,
          onClick: () => handleEdit(contextMenu.messageId),
        });
      }
      
      items.push({
        label: 'Delete',
        icon: <Trash2 size={16} />,
        onClick: () => handleDelete(contextMenu.messageId),
        variant: 'danger' as const,
      });
    }

    return items;
  };

  const latestPin = pins[0];

  return (
    <div className="flex flex-col h-full w-full bg-transparent max-w-full relative">
      {/* Header */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/5 px-4 md:px-6 bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-2 text-white/70 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          
          {isRoom ? (
            <>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center hidden sm:flex">
                <Hash size={20} className="text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                  {rooms.find(r => r.id === activeChat.id)?.name || "Room"}
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-indigo-300 font-mono tracking-wider font-normal select-all hover:bg-white/20 transition-colors" title="Room Code for sharing">
                    Code: {rooms.find(r => r.id === activeChat.id)?.room_code || '...'}
                  </span>
                </h2>
                <span className="text-xs text-white/50">{activeMessages.length} messages</span>
              </div>
            </>
          ) : activeFriend ? (
            <>
              <div className="relative h-10 w-10 rounded-xl bg-indigo-900/50 flex items-center justify-center border border-indigo-500/20 hidden sm:flex overflow-hidden">
                {activeFriend.avatar_url ? (
                  <img src={activeFriend.avatar_url} alt={activeFriend.username || undefined} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-indigo-300" />
                )}
                {friendIsOnline && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 z-10 rounded-full bg-green-500 border-2 border-[#0b1326]" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {activeFriend.display_name || activeFriend.username}
                  </h2>
                  {friendIsOnline && <span className="text-[10px] sm:hidden text-green-400 font-medium">Online</span>}
                </div>
                <span className="text-xs text-white/50">
                  {friendIsOnline ? 'Active now' : 'Offline'}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Pinned Messages Banner */}
      {isRoom && latestPin && (
        <div className={`shrink-0 mx-4 mt-2 transition-all duration-300 ${isPinBannerCollapsed ? 'h-10' : 'h-16'}`}>
          <div className="h-full flex items-center gap-3 px-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl shadow-lg relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
            <Pin size={16} className="text-indigo-400 shrink-0" />
            
            <div className="flex-1 min-w-0 pr-12 cursor-pointer" onClick={() => jumpToMessage(latestPin.message_id)}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Pinned Message</span>
                {!isPinBannerCollapsed && (
                  <span className="text-[10px] text-white/30 truncate">by {latestPin.senderName}</span>
                )}
              </div>
              {!isPinBannerCollapsed && (
                <p className="text-xs text-white/70 truncate">{latestPin.content || '📷 Image'}</p>
              )}
            </div>

            <div className="absolute right-2 flex items-center gap-1">
              <button 
                onClick={() => setIsPinBannerCollapsed(!isPinBannerCollapsed)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title={isPinBannerCollapsed ? "Expand" : "Collapse"}
              >
                {isPinBannerCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              {!isPinBannerCollapsed && (
                <button 
                  onClick={() => handleUnpin(latestPin.message_id)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Unpin"
                >
                  <PinOff size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Viewer */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
        {activeMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/40 italic">
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full">
            {Array.from(new Map(activeMessages.map(m => [m.id, m])).values()).map((msg) => {
              const sender = allUsers.find(u => u.id === msg.sender_id);
              const senderName = sender?.display_name || sender?.username || 'Unknown User';
              const isMe = sender?.clerk_id === clerkId;
              const msgReactions = reactionsMap[msg.id] || [];
              
              const replyToId = (msg as any).reply_to_id;
              let replyInfo: ReplyInfo | null = null;
              if (replyToId && replyInfoMap[replyToId]) {
                replyInfo = replyInfoMap[replyToId];
              }
              
              return (
                <MessageBubble
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  createdAt={msg.created_at}
                  isSentByMe={isMe}
                  senderName={senderName}
                  imageUrl={msg.image_url}
                  reactions={msgReactions}
                  replyTo={replyInfo}
                  currentUserDbId={currentUserDbId}
                  editedAt={(msg as any).edited_at}
                  deletedAt={(msg as any).deleted_at}
                  readAt={(msg as any).read_at}
                  onReply={() => setReplyingTo({ id: msg.id, senderName, content: msg.content })}
                  onReact={(emoji) => handleReact(msg.id, emoji)}
                  onEdit={(newContent) => handleEditSave(msg.id, newContent)}
                  onDelete={() => handleDelete(msg.id)}
                  onContextMenu={(e) => handleContextMenu(e, msg, isMe)}
                  showAvatars={currentUser?.preferences?.show_avatars}
                  avatarUrl={sender?.avatar_url}
                />
              );
            })}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 mt-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex gap-1 items-center">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="text-xs italic text-indigo-300/60 font-medium tracking-tight">
                  {getTypingText()}
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 pt-2 pb-6 px-4 md:px-6 relative">
        {/* Error Toast */}
        {uploadError && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in whitespace-nowrap z-10 flex items-center gap-2 border border-rose-400/50">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Reply Preview Banner */}
        {replyingTo && (
          <div className="mb-2 flex items-center gap-2 p-2.5 rounded-xl border-l-2 border-indigo-500 bg-white/5 backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-indigo-400">Replying to {replyingTo.senderName}</span>
              <p className="text-xs text-white/50 truncate">{replyingTo.content || '📷 Image'}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="shrink-0 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Image Preview Thumbnail */}
        {imagePreviewUrl && !isUploading && (
          <div className="absolute -top-24 left-6 flex items-end gap-2 animate-in slide-in-from-bottom-4 fade-in z-10">
            <div className="relative h-20 w-20 rounded-xl bg-black/40 border-2 border-indigo-500/50 overflow-hidden shadow-2xl group">
              <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              <button 
                type="button"
                onClick={clearImageSelection}
                className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-400"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-center gap-2 group">
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/jpeg,image/png,image/gif,image/webp" 
            className="hidden" 
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-indigo-400 hover:bg-white/10 transition-all shadow-lg backdrop-blur-sm disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>

          <div className="relative w-full overflow-hidden rounded-2xl shadow-lg backdrop-blur-sm bg-white/5 border border-white/10 transition-all focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:bg-white/10">
            {/* Upload Progress Bar */}
            {isUploading && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 transition-all duration-300 pointer-events-none" 
                style={{ width: `${uploadProgress}%` }}
              />
            )}
            
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              disabled={isUploading}
              placeholder={isUploading ? "Uploading image..." : isDm ? `Message ${activeFriend?.username || 'friend'}...` : "Type your message..."}
              className="w-full bg-transparent pl-4 pr-12 py-3.5 text-white placeholder-white/30 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <button 
                type="submit"
                disabled={(!inputText.trim() && !selectedImage) || isUploading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white transition-all duration-300 shadow-md hover:shadow-indigo-500/30 active:scale-95"
              >
                {isUploading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Send size={18} className={`ml-[-2px] ${(inputText.trim() || selectedImage) ? 'translate-x-0.5' : ''} transition-transform`} />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete Confirmation Toast */}
      {deleteConfirm && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-[#0d1530]/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
          <span className="text-sm text-white/80">Delete for everyone?</span>
          <button
            type="button"
            onClick={confirmDelete}
            className="px-3 py-1 rounded-lg bg-rose-500/80 text-white text-sm font-medium hover:bg-rose-500 transition-colors"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(null)}
            className="px-3 py-1 rounded-lg bg-white/10 text-white/70 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
