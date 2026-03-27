'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type TypingUser = {
  clerk_id: string;
  username: string;
  room_id: string;
};

export function useTypingIndicator(activeRoomId: string | null) {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remoteTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!userId || !activeRoomId) {
      setTypingUsers([]);
      return;
    }

    console.log('[Typing] Subscribing to typing channel for room:', activeRoomId);
    
    const channel = supabase.channel(`typing-${activeRoomId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (!payload || payload.clerk_id === userId) return;
        
        console.log('[Typing] Received broadcast:', payload);
        const { clerk_id, username, is_typing } = payload;
        
        if (is_typing) {
          setTypingUsers(prev => {
            const exists = prev.find(u => u.clerk_id === clerk_id);
            if (exists) return prev;
            return [...prev, { clerk_id, username, room_id: activeRoomId }];
          });

          // Auto-remove after 3 seconds if no follow-up
          if (remoteTimeoutsRef.current[clerk_id]) {
            clearTimeout(remoteTimeoutsRef.current[clerk_id]);
          }
          remoteTimeoutsRef.current[clerk_id] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.clerk_id !== clerk_id));
            delete remoteTimeoutsRef.current[clerk_id];
          }, 3000);
        } else {
          setTypingUsers(prev => prev.filter(u => u.clerk_id !== clerk_id));
          if (remoteTimeoutsRef.current[clerk_id]) {
            clearTimeout(remoteTimeoutsRef.current[clerk_id]);
            delete remoteTimeoutsRef.current[clerk_id];
          }
        }
      })
      .subscribe((status: string) => {
        console.log('[Typing] Channel status:', status);
      });

    return () => {
      console.log('[Typing] Cleaning up channel');
      supabase.removeChannel(channel);
      channelRef.current = null;
      Object.values(remoteTimeoutsRef.current).forEach(clearTimeout);
      remoteTimeoutsRef.current = {};
      setTypingUsers([]);
    };
  }, [userId, activeRoomId, supabase]);

  const broadcastTyping = useCallback(
    (username: string) => {
      if (!channelRef.current || !userId || !activeRoomId) return;

      console.log('[Typing] Broadcasting typing=true');
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { clerk_id: userId, username, is_typing: true },
      });

      // Auto-stop typing after 2 seconds of no keystrokes
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          console.log('[Typing] Broadcasting typing=false (timeout)');
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { clerk_id: userId, username, is_typing: false },
          });
        }
      }, 2000);
    },
    [userId, activeRoomId]
  );

  const stopTyping = useCallback(
    (username: string) => {
      if (!channelRef.current || !userId) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { clerk_id: userId, username, is_typing: false },
      });
    },
    [userId]
  );

  return { typingUsers, broadcastTyping, stopTyping };
}
