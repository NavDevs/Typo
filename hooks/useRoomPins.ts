'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';

export type RoomPin = {
  id: string;
  room_id: string;
  message_id: string;
  pinned_by: string | null;
  created_at: string;
  // Enriched
  content?: string;
  senderName?: string;
};

export function useRoomPins(roomId: string | null) {
  const supabase = useSupabase();
  const [pins, setPins] = useState<RoomPin[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPins = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    
    // Fetch pins and join with messages and users to get content and sender name
    const { data, error } = await supabase
      .from('room_pins')
      .select(`
        *,
        message:messages(content, sender:users(username, display_name))
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching room pins:', error);
    } else {
      const enrichedPins = (data || []).map((p: any) => ({
        ...p,
        content: p.message?.content,
        senderName: p.message?.sender?.display_name || p.message?.sender?.username || 'Unknown'
      }));
      setPins(enrichedPins);
    }
    setLoading(false);
  }, [roomId, supabase]);

  useEffect(() => {
    fetchPins();

    if (!roomId) return;

    const channel = supabase.channel(`room_pins_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_pins',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          // Simplest way to keep it in sync is to re-fetch to get enriched data
          fetchPins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchPins, supabase]);

  const pinMessage = async (messageId: string, userId: string) => {
    if (!roomId) return;
    const { error } = await supabase
      .from('room_pins')
      .insert({
        room_id: roomId,
        message_id: messageId,
        pinned_by: userId
      });
    
    if (error) {
      console.error('Error pinning message:', error);
      throw error;
    }
  };

  const unpinMessage = async (messageId: string) => {
    if (!roomId) return;
    const { error } = await supabase
      .from('room_pins')
      .delete()
      .eq('room_id', roomId)
      .eq('message_id', messageId);
      
    if (error) {
      console.error('Error unpinning message:', error);
      throw error;
    }
  };

  return { pins, loading, pinMessage, unpinMessage, refreshPins: fetchPins };
}
