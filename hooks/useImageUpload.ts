'use client';

import { useState } from 'react';
import { useSupabase } from './useSupabase';

const FREE_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PREMIUM_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function useImageUpload(userPlan?: string | null) {
  const supabase = useSupabase();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const uploadImage = async (file: File, userId: string, destinationId: string): Promise<string | null> => {
    if (file.size > maxFileSize) {
      throw new Error(`Max file size: 50MB.`);
    }

    if (!file.type.startsWith('image/')) {
      throw new Error("Only image files are allowed.");
    }

    setIsUploading(true);
    setUploadProgress(10); // initial fake progress just to show it started

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `${destinationId}/${userId}/${timestamp}_${sanitizedName}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      setUploadProgress(100);

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Image upload failed:", err);
      throw err;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000); // reset after a delay
    }
  };

  return { uploadImage, isUploading, uploadProgress };
}
