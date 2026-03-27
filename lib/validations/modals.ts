import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(2, "Room name must be at least 2 characters").max(50, "Room name is too long"),
});

export const JoinRoomSchema = z.object({
  identifier: z.string().min(1, "Room identifier is required").max(100),
});

export const AddFriendSchema = z.object({
  identifier: z.string().min(1, "Username or User Tag is required").max(50),
});

export const EditProfileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name is too long"),
  avatarUrl: z.union([z.literal(""), z.string().url("Must be a valid URL")]).optional(),
});
