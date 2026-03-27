'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';

export type RoomSettings = {
  notifications_enabled: boolean;
  mentions_only: boolean;
  is_muted: boolean;
  is_favorite: boolean;
  custom_notification_sound?: string | null;
  last_read_message_id?: string | null;
};

export type RoomInvitation = {
  id: string;
  room_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  message: string | null;
  created_at: string;
  expires_at: string | null;
  // Enriched
  room_name?: string;
  inviter_username?: string;
};

export function usePersonalizedRooms() {
  const { userId: clerkId } = useAuth();
  const supabase = useSupabase();
  const [invitations, setInvitations] = useState<RoomInvitation[]>([]);
  const [roomSettings, setRoomSettings] = useState<Record<string, RoomSettings>>({});
  const [recommendedRooms, setRecommendedRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user's DB ID
  const currentUserDbId = clerkId ? `SELECT id FROM public.users WHERE clerk_id = '${clerkId}' LIMIT 1` : null;

  // Fetch invitations and settings
  useEffect(() => {
    if (!clerkId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        // Get current user DB ID first
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', clerkId)
          .single();

        if (!userData) return;

        // Fetch pending invitations
        const { data: invitesData } = await supabase
          .from('room_invitations')
          .select(`
            *,
            room:rooms(name),
            inviter:users!invited_by(username)
          `)
          .eq('invited_user_id', userData.id)
          .eq('status', 'pending');

        if (invitesData) {
          const enriched = invitesData.map(inv => ({
            ...inv,
            room_name: inv.room?.name,
            inviter_username: inv.inviter?.username
          }));
          setInvitations(enriched);
        }

        // Fetch room settings
        const { data: settingsData } = await supabase
          .from('user_room_settings')
          .select('*')
          .eq('user_id', userData.id);

        if (settingsData) {
          const settingsMap: Record<string, RoomSettings> = {};
          settingsData.forEach(s => {
            settingsMap[s.room_id] = {
              notifications_enabled: s.notifications_enabled,
              mentions_only: s.mentions_only,
              is_muted: s.is_muted,
              is_favorite: s.is_favorite,
              custom_notification_sound: s.custom_notification_sound,
              last_read_message_id: s.last_read_message_id
            };
          });
          setRoomSettings(settingsMap);
        }

        // Fetch recommendations
        const { data: recsData } = await supabase
          .from('recommended_rooms')
          .select(`
            *,
            room:rooms(name, description, tags)
          `)
          .eq('user_id', userData.id)
          .order('score', { ascending: false })
          .limit(10);

        if (recsData) {
          setRecommendedRooms(recsData);
        }
      } catch (err) {
        console.error('Error fetching personalized data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    // Realtime subscription for invitations
    const channel = supabase.channel(`invitations_${clerkId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_invitations',
        filter: `invited_user_id=eq.${currentUserDbId}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clerkId, supabase]);

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string) => {
    try {
      const { data: invite } = await supabase
        .from('room_invitations')
        .select('room_id, invited_user_id')
        .eq('id', invitationId)
        .single();

      if (!invite) throw new Error('Invitation not found');

      // Add user to room members
      const { error: joinError } = await supabase
        .from('room_members')
        .insert({ room_id: invite.room_id, user_id: invite.invited_user_id });

      if (joinError && joinError.code !== '23505') { // Ignore duplicate errors
        throw joinError;
      }

      // Update invitation status
      const { error } = await supabase
        .from('room_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (error) throw error;

      // Remove from local state
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: error.message };
    }
  }, [supabase]);

  // Decline invitation
  const declineInvitation = useCallback(async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('room_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      return { success: true };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      return { success: false, error: error.message };
    }
  }, [supabase]);

  // Update room settings
  const updateRoomSettings = useCallback(async (roomId: string, settings: Partial<RoomSettings>) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId || '')
        .single();

      if (!userData) throw new Error('User not found');

      const { error } = await supabase
        .from('user_room_settings')
        .upsert({
          user_id: userData.id,
          room_id: roomId,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,room_id' });

      if (error) throw error;

      // Update local state
      setRoomSettings(prev => ({
        ...prev,
        [roomId]: {
          ...(prev[roomId] || {
            notifications_enabled: true,
            mentions_only: false,
            is_muted: false,
            is_favorite: false
          }),
          ...settings
        }
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating room settings:', error);
      return { success: false, error: error.message };
    }
  }, [clerkId, supabase]);

  // Toggle mute for a room
  const toggleMute = useCallback(async (roomId: string) => {
    const current = roomSettings[roomId];
    return updateRoomSettings(roomId, { is_muted: !current?.is_muted });
  }, [roomSettings, updateRoomSettings]);

  // Toggle favorite for a room
  const toggleFavorite = useCallback(async (roomId: string) => {
    const current = roomSettings[roomId];
    return updateRoomSettings(roomId, { is_favorite: !current?.is_favorite });
  }, [roomSettings, updateRoomSettings]);

  return {
    invitations,
    roomSettings,
    recommendedRooms,
    isLoading,
    acceptInvitation,
    declineInvitation,
    updateRoomSettings,
    toggleMute,
    toggleFavorite
  };
}
