'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';

export type Message = {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  image_url?: string | null;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

export type ReactionRow = {
  id: string;
  message_id: string;
  message_type: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export function useChatMessages(roomId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const { userId } = useAuth(); 
  const supabase = useSupabase();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true }); 
      
    if (!error && data) {
      setMessages(data);
    } else if (error) {
      console.error("Fetch messages error:", error);
    }
  }, [roomId, supabase]);

  // Fetch reactions for all messages in this room
  const fetchReactions = useCallback(async () => {
    if (!roomId || messages.length === 0) return;
    const msgIds = messages.map(m => m.id);
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', msgIds)
      .eq('message_type', 'room');
      
    if (!error && data) {
      setReactions(data);
    }
  }, [roomId, messages, supabase]);

  useEffect(() => {
    if (!userId || !roomId) {
      setMessages([]);
      setReactions([]);
      return;
    }

    // Initial fetch
    fetchMessages();

    // Realtime subscription for messages
    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload: any) => {
        setMessages((prev) => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload: any) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    // Polling fallback every 3 seconds
    pollRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId, userId, supabase, fetchMessages]);

  // Fetch reactions whenever messages change
  useEffect(() => {
    fetchReactions();
  }, [messages, fetchReactions]);

  // Realtime subscription for reactions
  useEffect(() => {
    if (!roomId) return;

    const reactionChannel = supabase.channel(`reactions_room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newReaction = payload.new as ReactionRow;
          if (newReaction.message_type === 'room') {
            setReactions(prev => {
              if (prev.find(r => r.id === newReaction.id)) return prev;
              return [...prev, newReaction];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const oldReaction = payload.old as { id: string };
          setReactions(prev => prev.filter(r => r.id !== oldReaction.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reactionChannel);
    };
  }, [roomId, supabase]);

  const sendMessage = async (content: string, senderDbId: string, imageUrl?: string | null, replyToId?: string | null) => {
    if (!userId || !roomId || (!content.trim() && !imageUrl)) return;
    
    const optimisticId = crypto.randomUUID();
    const newMessage: Message = {
      id: optimisticId,
      room_id: roomId,
      sender_id: senderDbId, 
      content: content.trim(),
      created_at: new Date().toISOString(),
      image_url: imageUrl || null,
      reply_to_id: replyToId || null
    };
    
    setMessages(prev => [...prev, newMessage]);

    const insertPayload: any = {
      room_id: roomId,
      sender_id: senderDbId,
      content: content.trim(),
      image_url: imageUrl || null
    };
    if (replyToId) insertPayload.reply_to_id = replyToId;

    const { error, data } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();
      
    if (error) {
      console.error("Failed to send message", error);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
    }
  };

  const toggleReaction = async (messageId: string, userId: string, emoji: string) => {
    const existing = reactions.find(
      r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji
    );

    if (existing) {
      // Remove reaction
      setReactions(prev => prev.filter(r => r.id !== existing.id));
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      // Add reaction
      const optimisticId = crypto.randomUUID();
      const newReaction: ReactionRow = {
        id: optimisticId,
        message_id: messageId,
        message_type: 'room',
        user_id: userId,
        emoji,
        created_at: new Date().toISOString(),
      };
      setReactions(prev => [...prev, newReaction]);

      const { error, data } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          message_type: 'room',
          user_id: userId,
          emoji,
        })
        .select()
        .single();

      if (error) {
        setReactions(prev => prev.filter(r => r.id !== optimisticId));
      } else if (data) {
        setReactions(prev => prev.map(r => r.id === optimisticId ? data : r));
      }
    }
  };

  const editMessage = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    // Actual content update is handled by the caller with the new content
  };

  const updateMessageContent = async (messageId: string, newContent: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, content: newContent, edited_at: new Date().toISOString() } 
        : m
    ));
    
    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId);
    
    if (error) {
      console.error('Failed to edit message:', error);
      fetchMessages(); // Revert
    }
  };

  const deleteMessage = async (messageId: string) => {
    // Optimistic soft delete
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, content: '', deleted_at: new Date().toISOString() }
        : m
    ));

    const { error } = await supabase
      .from('messages')
      .update({ content: null, deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    
    if (error) {
      console.error('Failed to delete message:', error);
      fetchMessages(); // Revert
    }
  };

  return { messages, reactions, sendMessage, toggleReaction, updateMessageContent, deleteMessage };
}
