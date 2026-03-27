'use client';

import { useCallback } from 'react';
import { UserPreferences } from './useUsers';

export function useNotificationEffects() {
  
  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // A4
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, url: string = '/') => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
      new Notification(title, {
        body,
        icon: '/logo.png',
        tag: 'typo-msg',
        renotify: true
      } as any).onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  }, []);

  const triggerNotification = useCallback((
    type: 'dm' | 'mention',
    senderName: string,
    content: string,
    preferences: UserPreferences | null,
    chatUrl: string = '/chat'
  ) => {
    if (!preferences) return;

    // Check individual toggles
    if (type === 'dm' && !preferences.notify_dms) return;
    if (type === 'mention' && !preferences.notify_mentions) return;
    if (!preferences.notifications_enabled) return;

    // 1. Play Sound
    if (preferences.notify_sounds) {
      playNotificationSound();
    }

    // 2. Show Browser Notification if tab is backgrounded
    const title = type === 'dm' ? `DM from ${senderName}` : `Mention in Room`;
    const body = content.length > 60 ? `${content.substring(0, 60)}...` : content;
    
    showBrowserNotification(title, body, chatUrl);
  }, [playNotificationSound, showBrowserNotification]);

  return { triggerNotification, playNotificationSound };
}
