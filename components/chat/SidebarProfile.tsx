'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@clerk/nextjs';
import { Settings } from 'lucide-react';
import { useModal } from './ModalProvider';

export default function SidebarProfile() {
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();
  const { allUsers } = useUsers();
  const { openModal } = useModal();
  
  const currentDbUser = allUsers.find(u => u.clerk_id === userId);

  if (!isLoaded || !user) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-10 w-10 rounded-full bg-white/10" />
        <div className="h-5 w-24 rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <UserButton 
        appearance={{
          elements: {
            avatarBox: "h-10 w-10"
          }
        }} 
      />
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm leading-tight truncate">
            {currentDbUser?.display_name || user.username || user.firstName || 'User'}
          </span>
        </div>
        <span className="text-xs text-indigo-300/80 font-mono tracking-tight leading-tight select-all">
          {currentDbUser?.user_tag ? currentDbUser.user_tag : 'Online'}
        </span>
      </div>
      
    </div>
  );
}
