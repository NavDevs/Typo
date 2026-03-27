'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type PresenceState = {
  clerk_id: string;
  online_at: string;
  is_typing?: boolean;
  typing_room_id?: string | null;
};

export function usePresence() {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    // Avoid re-subscribing if already connected
    if (subscribedRef.current && channelRef.current) return;

    console.log('[Presence] Creating channel for user:', userId);
    const channel = supabase.channel('global_presence', {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<PresenceState>();
        const formattedState: Record<string, PresenceState> = {};
        
        for (const [key, presences] of Object.entries(newState)) {
          if (presences.length > 0) {
            formattedState[key] = presences[0] as unknown as PresenceState;
          }
        }
        console.log('[Presence] Sync event, online users:', Object.keys(formattedState).length);
        setOnlineUsers(formattedState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log('[Presence] Join:', key);
        setOnlineUsers(prev => ({
          ...prev,
          [key]: newPresences[0] as unknown as PresenceState,
        }));
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        console.log('[Presence] Leave:', key);
        setOnlineUsers(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status: string, err?: Error) => {
        console.log('[Presence] Channel status:', status, err ? `Error: ${err.message}` : '');
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true;
          await channel.track({
            clerk_id: userId,
            online_at: new Date().toISOString(),
            is_typing: false,
            typing_room_id: null
          });
          console.log('[Presence] Successfully tracked initial state');
        }
      });

    return () => {
      console.log('[Presence] Cleaning up channel');
      subscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, supabase]);

  const updatePresence = async (newState: Partial<PresenceState>) => {
    if (channelRef.current && userId) {
      console.log('[Presence] Updating:', newState);
      await channelRef.current.track({
        clerk_id: userId,
        online_at: new Date().toISOString(),
        ...newState
      });
    } else {
      console.warn('[Presence] Cannot update - channel:', !!channelRef.current, 'userId:', !!userId);
    }
  };

  return { onlineUsers, updatePresence };
}
