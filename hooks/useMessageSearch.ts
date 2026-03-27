'use client';

import { useState, useCallback, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { useUsers } from './useUsers';
import { useAuth } from '@clerk/nextjs';

export type SearchResult = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_url?: string | null;
  // Enriched fields
  senderName: string;
  senderAvatar?: string | null;
  source: 'room' | 'dm';
  sourceName: string; // room ID or friend name
  sourceId: string; // room_id or dm user id
};

export type SearchFilter = 'all' | 'rooms' | 'dms' | 'images';

export function useMessageSearch() {
  const supabase = useSupabase();
  const { allUsers } = useUsers();
  const { userId: clerkId } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserDbId = allUsers.find(u => u.clerk_id === clerkId)?.id;

  const search = useCallback(async (query: string, filter: SearchFilter = 'all') => {
    if (!query.trim() || !currentUserDbId) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    const searchTerm = `%${query.trim()}%`;
    const allResults: SearchResult[] = [];

    try {
      // Search room messages
      if (filter === 'all' || filter === 'rooms' || filter === 'images') {
        let roomQuery = supabase
          .from('messages')
          .select('id, content, sender_id, created_at, image_url, room_id')
          .ilike('content', searchTerm)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (filter === 'images') {
          roomQuery = supabase
            .from('messages')
            .select('id, content, sender_id, created_at, image_url, room_id')
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);
        }

        const { data: roomMsgs } = await roomQuery;
        
        if (roomMsgs) {
          roomMsgs.forEach((msg: any) => {
            if (msg.content === null) return; // Skip deleted
            const sender = allUsers.find(u => u.id === msg.sender_id);
            allResults.push({
              id: msg.id,
              content: msg.content || '',
              sender_id: msg.sender_id,
              created_at: msg.created_at,
              image_url: msg.image_url,
              senderName: sender?.display_name || sender?.username || 'Unknown',
              senderAvatar: sender?.avatar_url,
              source: 'room',
              sourceName: `Room`,
              sourceId: msg.room_id,
            });
          });
        }
      }

      // Search DM messages
      if (filter === 'all' || filter === 'dms' || filter === 'images') {
        let dmQuery = supabase
          .from('direct_messages')
          .select('id, content, sender_id, receiver_id, created_at, image_url')
          .or(`sender_id.eq.${currentUserDbId},receiver_id.eq.${currentUserDbId}`)
          .ilike('content', searchTerm)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (filter === 'images') {
          dmQuery = supabase
            .from('direct_messages')
            .select('id, content, sender_id, receiver_id, created_at, image_url')
            .or(`sender_id.eq.${currentUserDbId},receiver_id.eq.${currentUserDbId}`)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);
        }

        const { data: dmMsgs } = await dmQuery;
        
        if (dmMsgs) {
          dmMsgs.forEach((msg: any) => {
            if (msg.content === null) return;
            const sender = allUsers.find(u => u.id === msg.sender_id);
            const otherUserId = msg.sender_id === currentUserDbId ? msg.receiver_id : msg.sender_id;
            const otherUser = allUsers.find(u => u.id === otherUserId);
            allResults.push({
              id: msg.id,
              content: msg.content || '',
              sender_id: msg.sender_id,
              created_at: msg.created_at,
              image_url: msg.image_url,
              senderName: sender?.display_name || sender?.username || 'Unknown',
              senderAvatar: sender?.avatar_url,
              source: 'dm',
              sourceName: otherUser?.display_name || otherUser?.username || 'DM',
              sourceId: otherUserId,
            });
          });
        }
      }

      // Sort all by most recent
      allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setResults(allResults.slice(0, 20));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [supabase, allUsers, currentUserDbId]);

  const debouncedSearch = useCallback((query: string, filter: SearchFilter = 'all') => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query, filter);
    }, 300);
  }, [search]);

  const clearSearch = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { results, isSearching, hasSearched, debouncedSearch, clearSearch };
}
