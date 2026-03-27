'use client';

import React, { useState } from 'react';
import { X, Bell, Palette, Shield, Monitor, Volume2, VolumeX, Layout, User as UserIcon } from 'lucide-react';
import { UserPreferences } from '@/hooks/useUsers';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences | null;
  onUpdate: (prefs: Partial<UserPreferences>) => void;
  permission: NotificationPermission;
  onSubscribe: () => void;
};

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  preferences, 
  onUpdate, 
  permission, 
  onSubscribe 
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'appearance' | 'privacy'>('notifications');

  if (!isOpen || !preferences) return null;

  const accentColors = [
    { name: 'indigo', hex: '#6366f1' },
    { name: 'purple', hex: '#8b5cf6' },
    { name: 'teal', hex: '#14b8a6' },
    { name: 'green', hex: '#22c55e' },
    { name: 'pink', hex: '#ec4899' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-white/10 bg-[#0d1530]/90">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Monitor size={20} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-white/5 p-4 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'notifications' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bell size={18} />
              <span className="text-sm font-medium">Notifications</span>
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'appearance' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette size={18} />
              <span className="text-sm font-medium">Appearance</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'privacy' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield size={18} />
              <span className="text-sm font-medium">Privacy</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <section>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Desktop Notifications</h3>
                  <div className="glass-panel p-5 bg-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Browser Push Notifications</p>
                        <p className="text-xs text-white/40 pr-8">Get notified when someone sends you a message even when the tab is closed.</p>
                      </div>
                      {permission === 'default' ? (
                        <button 
                          onClick={onSubscribe}
                          className="glass-button px-4 py-2 text-xs"
                        >
                          Enable
                        </button>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                          permission === 'granted' ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'
                        }`}>
                          {permission}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">In-App Alerts</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-sm text-white/80">Notify on Direct Messages</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.notify_dms} 
                        onChange={(e) => onUpdate({ notify_dms: e.target.checked })}
                        className="w-10 h-5 accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-sm text-white/80">Notify on @Mentions</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.notify_mentions} 
                        onChange={(e) => onUpdate({ notify_mentions: e.target.checked })}
                        className="w-10 h-5 accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80">Notification Sounds</span>
                        {preferences.notify_sounds ? <Volume2 size={14} className="text-indigo-400" /> : <VolumeX size={14} className="text-rose-400" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={preferences.notify_sounds} 
                        onChange={(e) => onUpdate({ notify_sounds: e.target.checked })}
                        className="w-10 h-5 accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <section>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Accent Color</h3>
                  <div className="flex flex-wrap gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                    {accentColors.map(color => (
                      <button
                        key={color.name}
                        onClick={() => onUpdate({ accent: color.name as any })}
                        className={`group relative h-12 w-12 rounded-xl transition-all duration-300 flex items-center justify-center ${
                          preferences.accent === color.name ? 'scale-110 shadow-lg' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: `${color.hex}22`, border: `1px solid ${preferences.accent === color.name ? color.hex : 'transparent'}` }}
                        title={color.name}
                      >
                        <div className="h-6 w-6 rounded-full shadow-inner" style={{ backgroundColor: color.hex }} />
                        {preferences.accent === color.name && (
                          <div className="absolute -inset-1 blur-md opacity-50 rounded-xl" style={{ backgroundColor: color.hex }} />
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Layout Density</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => onUpdate({ density: 'comfortable' })}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                        preferences.density === 'comfortable' ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-white/5 bg-white/[0.02] text-white/40 hover:bg-white/5'
                      }`}
                    >
                      <Layout size={24} />
                      <span className="text-xs font-medium">Comfortable</span>
                    </button>
                    <button
                      onClick={() => onUpdate({ density: 'compact' })}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                        preferences.density === 'compact' ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-white/5 bg-white/[0.02] text-white/40 hover:bg-white/5'
                      }`}
                    >
                      <Layout size={18} />
                      <span className="text-xs font-medium">Compact</span>
                    </button>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <UserIcon size={18} className="text-white/40" />
                      <span className="text-sm text-white/80">Show avatars in chat</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={preferences.show_avatars} 
                      onChange={(e) => onUpdate({ show_avatars: e.target.checked })}
                      className="w-10 h-5 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <section>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Availability</h3>
                  <div className="space-y-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <p className="text-sm text-white/80 mb-2">Who can see your online status?</p>
                    {['everyone', 'friends', 'nobody'].map(mode => (
                      <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="radio" 
                            name="privacy-status" 
                            checked={preferences.show_online_status === mode}
                            onChange={() => onUpdate({ show_online_status: mode as any })}
                            className="w-5 h-5 appearance-none rounded-full border border-white/20 checked:border-indigo-500 checked:border-4 transition-all"
                          />
                        </div>
                        <span className={`text-sm capitalize ${preferences.show_online_status === mode ? 'text-indigo-400 font-medium' : 'text-white/60 group-hover:text-white'}`}>
                          {mode}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <div>
                      <span className="text-sm font-semibold text-white">Read Receipts</span>
                      <p className="text-xs text-white/40 mt-1">If disabled, you won't see receipts from others either.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={preferences.show_read_receipts} 
                      onChange={(e) => onUpdate({ show_read_receipts: e.target.checked })}
                      className="w-10 h-5 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
