'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';
import { useUsers } from './useUsers';
import { ReactionRow } from './useChatMessages';

export type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  image_url?: string | null;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

export function useDirectMessages(activeDmUserId: string | null) {
  const { userId: clerkId } = useAuth();
  const supabase = useSupabase();
  const { allUsers } = useUsers();
  
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const initialFetchRef = useRef(false);

  // Get current user's DB ID
  const currentUserDbId = allUsers.find(u => u.clerk_id === clerkId)?.id;

  // 1. Fetch unread counts globally (for the sidebar)
  useEffect(() => {
    if (!currentUserDbId) return;

    const fetchUnreadCounts = async () => {
      // Get all unread messages received by the current user
      const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserDbId)
        .is('read_at', null);

      if (error) {
        console.error('Error fetching unread DMs:', error);
        return;
      }

      // Group by sender
      const counts: Record<string, number> = {};
      data?.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });

      setUnreadCounts(counts);
    };

    fetchUnreadCounts();

    // Global subscription for unread counts
    const globalChannel = supabase.channel(`global_unread_${currentUserDbId}_${activeDmUserId || 'sidebar'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          
          if (payload.eventType === 'INSERT') {
            // If we receive a new message, and we are not currently reading this specific DM thread
            if (newMsg.receiver_id === currentUserDbId && newMsg.sender_id !== activeDmUserId) {
              setUnreadCounts(prev => ({
                ...prev,
                [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
              }));
            }
          } else if (payload.eventType === 'UPDATE') {
            // Decrement unread count if a message is marked as read
            if (newMsg.receiver_id === currentUserDbId && newMsg.read_at !== null) {
              setUnreadCounts(prev => {
                const updated = { ...prev };
                if (updated[newMsg.sender_id]) {
                  updated[newMsg.sender_id] = Math.max(0, updated[newMsg.sender_id] - 1);
                }
                return updated;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [currentUserDbId, activeDmUserId, supabase]);

  // 2. Fetch and subscribe to messages for the active DM
  useEffect(() => {
    if (!currentUserDbId || !activeDmUserId) {
      setMessages([]);
      return;
    }

    initialFetchRef.current = false;

    // Fetch historical messages between the two users
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .in('sender_id', [currentUserDbId, activeDmUserId])
        .in('receiver_id', [currentUserDbId, activeDmUserId])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching DMs:', error);
      } else {
        setMessages(data || []);
      }
      initialFetchRef.current = true;
    };

    fetchMessages();

    // Subscribe to new DMs involving the current user
    const channel = supabase.channel(`direct_messages_${currentUserDbId}_${activeDmUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          // Note: We can't filter by OR in postgres_changes easily on the client,
          // so we receive all DMs for the current user and filter client-side.
          // Wait, actually since we bypass RLS or use strict RLS, the user only receives their own DMs.
          // We can filter for receiver = current OR sender = current implicitly via RLS.
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          
          // Relevant to the currently active chat?
          const isRelevant = 
            (newMsg.sender_id === currentUserDbId && newMsg.receiver_id === activeDmUserId) ||
            (newMsg.sender_id === activeDmUserId && newMsg.receiver_id === currentUserDbId);

          if (payload.eventType === 'INSERT') {
            if (isRelevant) {
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (isRelevant) {
              setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserDbId, activeDmUserId, supabase]);

  // 3. Mark active DMs as read
  useEffect(() => {
    if (!currentUserDbId || !activeDmUserId || !initialFetchRef.current) return;

    const unreadFromActive = messages.filter(
      m => m.sender_id === activeDmUserId && m.receiver_id === currentUserDbId && m.read_at === null
    );

    if (unreadFromActive.length > 0) {
      const markAsRead = async () => {
        const { error } = await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('receiver_id', currentUserDbId)
          .eq('sender_id', activeDmUserId)
          .is('read_at', null);

        if (!error) {
          // Clear local unread counts for this user
          setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[activeDmUserId];
            return next;
          });
          
          // Optimistically update local messages
          setMessages(prev => prev.map(m => {
            if (m.sender_id === activeDmUserId && m.read_at === null) {
              return { ...m, read_at: new Date().toISOString() };
            }
            return m;
          }));
        }
      };

      markAsRead();
    }
  }, [messages, currentUserDbId, activeDmUserId, supabase]);

  // Fetch reactions for DM messages
  useEffect(() => {
    if (!currentUserDbId || !activeDmUserId || messages.length === 0) return;
    const msgIds = messages.map(m => m.id).filter(id => !id.startsWith('temp-'));
    if (msgIds.length === 0) return;

    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', msgIds)
        .eq('message_type', 'dm');
      if (!error && data) setReactions(data);
    };
    fetchReactions();
  }, [messages, currentUserDbId, activeDmUserId, supabase]);

  // Realtime for DM reactions
  useEffect(() => {
    if (!currentUserDbId || !activeDmUserId) return;

    const reactionChannel = supabase.channel(`reactions_dm:${currentUserDbId}_${activeDmUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const nr = payload.new as ReactionRow;
          if (nr.message_type === 'dm') {
            setReactions(prev => {
              if (prev.find(r => r.id === nr.id)) return prev;
              return [...prev, nr];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string };
          setReactions(prev => prev.filter(r => r.id !== old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(reactionChannel); };
  }, [currentUserDbId, activeDmUserId, supabase]);

  const sendDirectMessage = useCallback(async (content: string, receiverId: string, imageUrl?: string | null, replyToId?: string | null) => {
    if (!currentUserDbId) return;
    if (!content.trim() && !imageUrl) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      sender_id: currentUserDbId,
      receiver_id: receiverId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      read_at: null,
      image_url: imageUrl || null,
      reply_to_id: replyToId || null
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const insertPayload: any = {
      sender_id: currentUserDbId,
      receiver_id: receiverId,
      content: content.trim(),
      image_url: imageUrl || null
    };
    if (replyToId) insertPayload.reply_to_id = replyToId;

    const { data, error } = await supabase
      .from('direct_messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error sending DM:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  }, [currentUserDbId, supabase]);

  const toggleReaction = async (messageId: string, userId: string, emoji: string) => {
    const existing = reactions.find(
      r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji
    );
    if (existing) {
      setReactions(prev => prev.filter(r => r.id !== existing.id));
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      const optimisticId = crypto.randomUUID();
      const nr: ReactionRow = {
        id: optimisticId, message_id: messageId, message_type: 'dm',
        user_id: userId, emoji, created_at: new Date().toISOString(),
      };
      setReactions(prev => [...prev, nr]);
      const { error, data } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, message_type: 'dm', user_id: userId, emoji })
        .select().single();
      if (error) { setReactions(prev => prev.filter(r => r.id !== optimisticId)); }
      else if (data) { setReactions(prev => prev.map(r => r.id === optimisticId ? data : r)); }
    }
  };

  const updateMessageContent = async (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, content: newContent, edited_at: new Date().toISOString() } 
        : m
    ));
    
    const { error } = await supabase
      .from('direct_messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId);
    
    if (error) {
      console.error('Failed to edit DM:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, content: '', deleted_at: new Date().toISOString() }
        : m
    ));

    const { error } = await supabase
      .from('direct_messages')
      .update({ content: null, deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    
    if (error) {
      console.error('Failed to delete DM:', error);
    }
  };

  return { messages, unreadCounts, reactions, sendDirectMessage, toggleReaction, updateMessageContent, deleteMessage };
}
