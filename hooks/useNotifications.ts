'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';

export type AppNotification = {
  id: string;
  user_id: string;
  type: 'dm' | 'mention' | 'system' | 'friend_request' | 'reaction_room' | 'reaction_dm';
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(userId: string | null) {
  const supabase = useSupabase();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error.message);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (data) {
      // Filter out any null/invalid entries
      const validNotifications = data.filter(n => n && n.id && n.type);
      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter(n => !n.is_read).length);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    // Subscribe to real-time notifications changes
    const channel = supabase.channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Optimistic update for new notifications
          const newNotif = payload.new as AppNotification;
          if (newNotif && newNotif.id) {
            setNotifications(prev => {
              // Avoid duplicates
              if (prev.find(n => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Update existing notification (e.g., marked as read)
          const updatedNotif = payload.new as AppNotification;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
          );
          
          // Recalculate unread count
          setUnreadCount(prev => {
            const wasUnread = payload.old?.is_read === false;
            const isNowUnread = updatedNotif.is_read === false;
            if (wasUnread && !isNowUnread) return Math.max(0, prev - 1);
            if (!wasUnread && isNowUnread) return prev + 1;
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Identify which notification was deleted
          const deletedId = payload.old?.id;
          if (deletedId) {
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
            
            // Re-fetch count or adjust based on old value if possible, 
            // but the safest approach is to just re-fetch fully to stay perfectly in sync
            fetchNotifications();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Notifications realtime subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Notifications realtime connection error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications, supabase]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
