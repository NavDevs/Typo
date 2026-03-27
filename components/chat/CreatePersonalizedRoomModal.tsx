'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, Users, Lock, Globe, Tag } from 'lucide-react';
import { useModal } from './ModalProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { createPersonalizedRoomAction } from '@/app/actions/modals';

export default function CreatePersonalizedRoomModal() {
  const { closeModal, openModal } = useModal();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(50);
  const [tagsInput, setTagsInput] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowInvites, setAllowInvites] = useState(true);
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setErrorText('Room name is required');
      return;
    }

    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('isPrivate', isPrivate.toString());
    formData.append('maxMembers', maxMembers.toString());
    formData.append('tags', tags.join(','));
    formData.append('requireApproval', requireApproval.toString());
    formData.append('allowInvites', allowInvites.toString());

    setErrorText('');
    startTransition(async () => {
      const result = await createPersonalizedRoomAction(null, formData);
      
      if (result?.error) {
        setErrorText(result.error);
      } else if (result?.success) {
        toast(result.message || 'Room created successfully!', 'success');
        closeModal();
        // Optionally open invite modal
        if (result.roomId) {
          // Could open invite modal here
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl border-white/20 bg-[#0b1326]/90 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={closeModal}
          disabled={isPending}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center z-10"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <h3 className="text-2xl font-bold text-white mb-2">Create Personalized Room</h3>
        <p className="text-sm text-white/50 mb-6">Customize your chat room experience</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide flex items-center gap-2">
                <Globe size={16} /> Room Name *
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Design Team, Gaming Lounge"
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30"
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this room about?"
                className="glass-input w-full px-4 py-3 text-white placeholder-white/30 resize-none"
                rows={3}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Privacy & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide flex items-center gap-2">
                <Lock size={16} /> Privacy
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !isPrivate 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Globe size={16} className="inline mr-2 -mt-0.5" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isPrivate 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Lock size={16} className="inline mr-2 -mt-0.5" />
                  Private
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/70 tracking-wide flex items-center gap-2">
                <Users size={16} /> Max Members
              </label>
              <select
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="glass-input w-full px-4 py-3 text-white bg-[#0b1326]"
                disabled={isPending}
              >
                <option value={10}>10 members</option>
                <option value={25}>25 members</option>
                <option value={50}>50 members</option>
                <option value={100}>100 members</option>
                <option value={500}>500 members</option>
                <option value={999}>Unlimited</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/70 tracking-wide flex items-center gap-2">
              <Tag size={16} /> Tags (comma-separated)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. technology, gaming, design"
              className="glass-input w-full px-4 py-3 text-white placeholder-white/30"
              disabled={isPending}
            />
            <p className="text-xs text-white/40">Helps users discover your room based on interests</p>
          </div>

          {/* Room Settings */}
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-sm font-semibold text-white/80">Room Settings</h4>
            
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500"
                disabled={isPending}
              />
              <div className="flex-1">
                <span className="text-sm text-white/80 font-medium block">Require approval for new members</span>
                <span className="text-xs text-white/40">Admins must approve join requests</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={allowInvites}
                onChange={(e) => setAllowInvites(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500"
                disabled={isPending}
              />
              <div className="flex-1">
                <span className="text-sm text-white/80 font-medium block">Allow members to invite others</span>
                <span className="text-xs text-white/40">Members can send invitations to friends</span>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {errorText && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 font-medium">{errorText}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button 
              type="button" 
              onClick={closeModal} 
              disabled={isPending} 
              className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="glass-button px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <Loader2 className="animate-spin w-4 h-4" />}
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
