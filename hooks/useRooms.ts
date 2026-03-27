'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';

export type Room = {
  id: string;
  name: string;
  room_code: string;
};

export function useRooms() {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('id, name, room_code')
          .order('name');
          
        if (error) {
          console.error("Error fetching rooms:", error.message);
        } else if (isMounted) {
          setRooms(data || []);
        }
      } catch (err) {
        console.error("Unexpected error fetching rooms:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRooms();

    const channel = supabase.channel('rooms-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members' },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return { rooms, isLoading };
}
