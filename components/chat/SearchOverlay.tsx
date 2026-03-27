'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Hash, User as UserIcon, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { useMessageSearch, SearchFilter, SearchResult } from '@/hooks/useMessageSearch';
import { ChatConfig } from './ChatDashboard';

type SearchOverlayProps = {
  onClose: () => void;
  onNavigate: (chat: ChatConfig, messageId: string) => void;
};

const FILTERS: { key: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Search size={13} /> },
  { key: 'rooms', label: 'Rooms', icon: <Hash size={13} /> },
  { key: 'dms', label: 'DMs', icon: <MessageCircle size={13} /> },
  { key: 'images', label: 'Images', icon: <ImageIcon size={13} /> },
];

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-indigo-500/40 text-white rounded px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function SearchOverlay({ onClose, onNavigate }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isSearching, hasSearched, debouncedSearch, clearSearch } = useMessageSearch();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      debouncedSearch(val, activeFilter);
    } else {
      clearSearch();
    }
  };

  const handleFilterChange = (filter: SearchFilter) => {
    setActiveFilter(filter);
    if (query.trim()) {
      debouncedSearch(query, filter);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.source === 'room') {
      onNavigate({ type: 'room', id: result.sourceId }, result.id);
    } else {
      onNavigate({ type: 'dm', userId: result.sourceId }, result.id);
    }
    onClose();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl mx-4 flex flex-col max-h-[70vh] rounded-2xl border border-white/10 bg-[#0b1326]/95 backdrop-blur-xl shadow-2xl shadow-black/50 animate-in slide-in-from-top-4 zoom-in-95 duration-300">
        
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <Search size={20} className="text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-white text-lg placeholder-white/30 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); clearSearch(); }}
              className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs font-mono border border-white/10"
          >
            ESC
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-white/5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => handleFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilter === f.key
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {/* Loading */}
          {isSearching && (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl bg-white/[0.03]">
                  <div className="h-9 w-9 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-white/10" />
                    <div className="h-3 w-full rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results List */}
          {!isSearching && results.length > 0 && (
            <div className="space-y-1">
              {results.map(result => (
                <button
                  key={`${result.source}-${result.id}`}
                  type="button"
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left hover:bg-white/5 transition-all group"
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-indigo-900/50 flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">
                    {result.senderAvatar ? (
                      <img src={result.senderAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon size={14} className="text-white/50" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white/90 truncate">{result.senderName}</span>
                      <span className="text-[10px] text-white/30 shrink-0">
                        {result.source === 'room' ? (
                          <span className="flex items-center gap-0.5"><Hash size={10} />{result.sourceName}</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><MessageCircle size={10} />{result.sourceName}</span>
                        )}
                      </span>
                      <span className="text-[10px] text-white/20 shrink-0 ml-auto">{formatTime(result.created_at)}</span>
                    </div>
                    <p className="text-xs text-white/50 truncate leading-relaxed">
                      {result.image_url && <span className="mr-1">📷</span>}
                      {highlightMatch(result.content, query)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isSearching && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                <Search size={28} className="text-white/15" />
              </div>
              <p className="text-sm text-white/40">No results for <span className="text-indigo-400/60">"{query}"</span></p>
              <p className="text-xs text-white/20 mt-1">Try a different search term</p>
            </div>
          )}

          {/* Initial State */}
          {!isSearching && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-white/30">Search across all your messages</p>
              <p className="text-xs text-white/15 mt-1">Results will appear as you type</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
