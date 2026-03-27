'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';

export function usePushNotifications(userId: string | null) {
  const supabase = useSupabase();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!userId || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // In a real app, you'd generate these keys: npx web-push generate-vapid-keys
          applicationServerKey: 'BKh6_3_W2w5_P_N_x_F_x_I_B_L_E_P_L_A_C_E_H_O_L_D_E_R_K_E_Y_V_A_P_I_D' 
        });

        // Save subscription to user profile in Supabase
        const { error } = await supabase
          .from('users')
          .update({ push_subscription: subscription.toJSON() })
          .eq('id', userId);

        if (error) console.error('Error saving push subscription:', error);
        else setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Push subscription error:', err);
    }
  }, [userId, supabase]);

  return { permission, isSubscribed, subscribeToPush };
}
