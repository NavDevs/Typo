'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Reply, SmilePlus } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

export type Reaction = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type ReplyInfo = {
  id: string;
  senderName: string;
  content: string;
};

type MessageBubbleProps = {
  id: string;
  content: string;
  createdAt: string;
  isSentByMe: boolean;
  senderName: string;
  imageUrl?: string | null;
  reactions?: Reaction[];
  replyTo?: ReplyInfo | null;
  currentUserDbId?: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  readAt?: string | null;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  showAvatars?: boolean;
  avatarUrl?: string | null;
};

export default function MessageBubble({
  id,
  content,
  createdAt,
  isSentByMe,
  senderName,
  imageUrl,
  reactions = [],
  replyTo,
  currentUserDbId,
  editedAt,
  deletedAt,
  readAt,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onContextMenu,
  showAvatars,
  avatarUrl,
}: MessageBubbleProps) {
  const timeStr = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isDeleted = !!deletedAt;
  const isEdited = !!editedAt;
  const canEdit = isSentByMe && !isDeleted && (Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleScrollToReply = () => {
    if (!replyTo) return;
    const el = document.getElementById(`msg-${replyTo.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-400/60', 'rounded-2xl');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-400/60', 'rounded-2xl');
      }, 2000);
    }
  };

  const handleEditSave = () => {
    if (editText.trim() && editText.trim() !== content) {
      onEdit?.(editText.trim());
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditText(content);
      setIsEditing(false);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(e);
  };

  useEffect(() => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    const handler = () => {
      setEditText(content);
      setIsEditing(true);
    };
    el.addEventListener('startEdit', handler);
    return () => el.removeEventListener('startEdit', handler);
  }, [id, content]);

  return (
    <div 
      id={`msg-${id}`}
      className={`flex w-full ${isSentByMe ? 'justify-end' : 'justify-start'} transition-all duration-500`}
      style={{ marginBottom: 'var(--msg-spacing, 1rem)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowPicker(false); }}
      onContextMenu={handleRightClick}
    >
      <div className={`flex items-start gap-2 max-w-[85%] ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Optional Avatar */}
        {showAvatars && !isSentByMe && (
          <div className="shrink-0 mt-1">
            {avatarUrl ? (
              <img src={avatarUrl} alt={senderName} className="w-8 h-8 rounded-full border border-white/10 object-cover shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                {senderName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} relative min-w-0`}>
          {!isSentByMe && !isDeleted && (
            <span className="text-xs text-white/50 mb-1 ml-1 font-medium">
              {senderName}
            </span>
          )}

          {/* Hover Action Bar */}
          {isHovered && !isDeleted && !isEditing && (onReply || onReact) && (
            <div 
              className={`absolute -top-3 z-20 flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#0d1530]/90 backdrop-blur-xl shadow-lg p-0.5 animate-in fade-in zoom-in-95 duration-150 ${
                isSentByMe ? 'right-0' : 'left-4'
              }`}
            >
              {onReply && (
                <button
                  type="button"
                  onClick={onReply}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-indigo-400 hover:bg-white/10 transition-all"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
              )}
              {onReact && (
                <button
                  type="button"
                  onClick={() => setShowPicker(prev => !prev)}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-yellow-400 hover:bg-white/10 transition-all"
                  title="React"
                >
                  <SmilePlus size={14} />
                </button>
              )}
            </div>
          )}

          {/* Emoji Picker Popover */}
          {showPicker && onReact && (
            <div className={`absolute -top-14 z-30 ${isSentByMe ? 'right-0' : 'left-0'}`}>
              <EmojiPicker
                onSelect={(emoji) => { onReact(emoji); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            </div>
          )}

          {/* Reply Quote Card */}
          {replyTo && !isDeleted && (
            <button
              type="button"
              onClick={handleScrollToReply}
              className={`flex flex-col w-full mb-1 px-3 py-1.5 rounded-xl text-left border-l-2 border-indigo-500 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-pointer max-w-[300px] ${
                isSentByMe ? 'self-end' : 'self-start'
              }`}
            >
              <span className="text-[10px] font-semibold text-indigo-400 truncate">{replyTo.senderName}</span>
              <span className="text-xs text-white/50 truncate">{replyTo.content || '📷 Image'}</span>
            </button>
          )}

          {/* Message Bubble */}
          {isDeleted ? (
            <div className="flex flex-col px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 rounded-bl-sm" style={{ padding: 'var(--msg-padding-y, 0.625rem) var(--msg-padding-x, 1rem)' }}>
              <p className="text-sm text-white/30 italic">🚫 This message was deleted</p>
            </div>
          ) : (
            <div 
              className={`flex flex-col rounded-2xl shadow-sm ${
                isSentByMe 
                  ? 'text-white rounded-br-sm shadow-indigo-500/20' 
                  : 'glass-panel text-white/90 rounded-bl-sm border-white/5 bg-white/5'
              }`}
              style={{ 
                padding: 'var(--msg-padding-y, 0.25rem) var(--msg-padding-x, 0.625rem)',
                background: isSentByMe ? 'linear-gradient(to bottom right, var(--color-indigo-accent, #6366f1), #8b5cf6)' : undefined
              }}
            >
              {imageUrl && (
                <div 
                  className="relative cursor-pointer overflow-hidden rounded-xl mb-1 group"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img 
                    src={imageUrl} 
                    alt="Chat attachment" 
                    className="max-w-[260px] max-h-[300px] w-auto h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              )}
              
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditSave}
                    className="flex-1 bg-black/20 text-white text-[15px] px-2.5 py-1 rounded-lg border border-white/20 focus:outline-none focus:border-indigo-400 min-w-0"
                  />
                </div>
              ) : content ? (
                <p className="text-[15px] leading-relaxed break-words px-2.5 py-1">{content}</p>
              ) : null}
            </div>
          )}

          {/* Reaction Badges */}
          {!isDeleted && reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 mx-1">
              {reactions.map((r) => {
                const iReacted = currentUserDbId ? r.userIds.includes(currentUserDbId) : false;
                return (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onReact?.(r.emoji)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-200 hover:scale-105 active:scale-95 ${
                      iReacted
                        ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200 shadow-sm shadow-indigo-500/20'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-medium">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Timestamp + Edited Label + Read Receipts */}
          <div className="flex items-center gap-1.5 mt-1 mx-1">
            <span className="text-[10px] text-white/40">{timeStr}</span>
            {isEdited && !isDeleted && (
              <span className="text-[10px] text-white/30 italic">(edited)</span>
            )}
            {isSentByMe && !isDeleted && (
              <div className="flex items-center ml-0.5">
                {readAt ? (
                  <span className="text-indigo-400 flex" title="Seen">
                    <span className="leading-none text-[10px]">✓</span>
                    <span className="leading-none text-[10px] -ml-[3px]">✓</span>
                  </span>
                ) : (
                  <span className="text-white/30 text-[10px]" title="Sent">✓</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Lightbox */}
      {isLightboxOpen && imageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
          
          <img 
            src={imageUrl} 
            alt="Expanded attachment" 
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
