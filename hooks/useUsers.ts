'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSupabase } from './useSupabase';

export type UserPreferences = {
  accent: 'indigo' | 'purple' | 'teal' | 'green' | 'pink';
  density: 'comfortable' | 'compact';
  notifications_enabled: boolean;
  notify_dms: boolean;
  notify_mentions: boolean;
  notify_sounds: boolean;
  show_online_status: 'everyone' | 'friends' | 'nobody';
  show_read_receipts: boolean;
  show_avatars: boolean;
};

export type User = {
  id: string;
  username: string | null;
  user_tag: string | null;
  clerk_id: string;
  avatar_url: string | null;
  display_name: string | null;
  preferences: UserPreferences | null;
};

export function useUsers() {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!currentUser) return;
    const updated = { ...currentUser.preferences, ...newPrefs } as UserPreferences;
    
    setCurrentUser(prev => prev ? { ...prev, preferences: updated } : null);
    
    const { error } = await supabase
      .from('users')
      .update({ preferences: updated })
      .eq('id', currentUser.id);
    
    if (error) {
      console.error('Error updating preferences:', error);
    }
  };

  // Manual refetch trigger — call this after accept/decline actions
  const refetch = () => {
    setRefreshCounter(c => c + 1);
  };

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('id, username, user_tag, clerk_id, avatar_url, display_name, preferences');
        
        if (usersErr) {
          console.error("Supabase Users Error:", usersErr.message || usersErr);
          throw new Error(usersErr.message || "Failed to fetch users");
        }
        
        const { data: friendsData, error: friendsErr } = await supabase
          .from('friends')
          .select('*');
        
        if (friendsErr) {
          console.error("Supabase Friends Error:", friendsErr.message || friendsErr);
          throw new Error(friendsErr.message || "Failed to fetch friends");
        }

        if (isMounted) {
          const typedUsers = (usersData || []) as User[];
          setAllUsers(typedUsers);
          
          const current = typedUsers.find(u => u.clerk_id === userId);
          if (current) {
            setCurrentUser(current);
            
            // Fetch friend requests for this specific user
            const { data: reqsData } = await supabase
              .from('friend_requests')
              .select('*')
              .eq('receiver_id', current.id)
              .eq('status', 'pending');
            
            if (reqsData) setFriendRequests(reqsData);
          }
          
          // Fix: Only include friendships that involve the current user
          if (typedUsers && friendsData && current) {
            const myFriendIds = new Set<string>();
            friendsData.forEach((f: any) => {
              if (f.user_id_1 === current.id) {
                myFriendIds.add(f.user_id_2);
              } else if (f.user_id_2 === current.id) {
                myFriendIds.add(f.user_id_1);
              }
            });
            const myFriends = typedUsers.filter(u => myFriendIds.has(u.id));
            setFriends(myFriends);
          }
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    // Set up Realtime for friend_requests AND friends tables to update UI instantly
    const channel = supabase.channel('friend-sync-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, refreshCounter]);

  return { allUsers, currentUser, friends, friendRequests, isLoading, updatePreferences, refetch };
}
