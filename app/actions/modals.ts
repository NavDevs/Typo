"use server";
import { createClerkServerClient } from "@/lib/supabase/server";
import { CreateRoomSchema, JoinRoomSchema, AddFriendSchema, EditProfileSchema } from "@/lib/validations/modals";
import { auth } from "@clerk/nextjs/server";

export async function createRoomAction(prevState: any, formData: FormData) {
  try {
    const rawData = { name: formData.get("name") as string };
    const validated = CreateRoomSchema.safeParse(rawData);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();

    // Get internal user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, plan")
      .eq("clerk_id", userId)
      .single();
    if (userError) return { error: "Failed to load user profile" };



// Check room limit to personalize validity
    const { count, error: countError } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id); // Wait, created_by doesn't exist? Room members is used.

    const { count: memberCount } = await supabase
      .from("room_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (memberCount && memberCount >= 5 && user.plan !== "premium") {
      return { error: "Room limit reached (5). Please upgrade to Premium to create or join more rooms." };
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ name: validated.data.name })
      .select()
      .single();

    if (roomError) return { error: "Failed to create room: " + roomError.message };

    // Add to members
    await supabase.from("room_members").insert({ room_id: room.id, user_id: user.id });

    return { success: true, message: `Room '${room.name}' created successfully. Room Code: ${room.room_code}`, roomCode: room.room_code };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}

export async function joinRoomAction(prevState: any, formData: FormData) {
  try {
    const rawData = { identifier: formData.get("identifier") as string };
    const validated = JoinRoomSchema.safeParse(rawData);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (!user) return { error: "Profile not found" };

    const searchIdentifier = validated.data.identifier.trim().toUpperCase();
    
    // Try multiple strategies to find the room:
    // 1. Try exact room_code match (6-char code like ABC123)
    let room;
    const { data: codeMatch } = await supabase
      .from("rooms")
      .select("id, name, room_code")
      .eq("room_code", searchIdentifier)
      .single();
    
    if (codeMatch) {
      room = codeMatch;
    } else {
      // 2. Try room name (case-insensitive)
      const { data: nameMatch } = await supabase
        .from("rooms")
        .select("id, name, room_code")
        .ilike("name", validated.data.identifier)
        .single();
      
      if (nameMatch) {
        room = nameMatch;
      } else {
        // 3. Try UUID/ID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validated.data.identifier);
        if (isUuid) {
          const { data: uuidMatch } = await supabase
            .from("rooms")
            .select("id, name, room_code")
            .eq("id", validated.data.identifier)
            .single();
          
          if (uuidMatch) {
            room = uuidMatch;
          }
        }
      }
    }

    if (!room) {
      return { 
        error: "Room not found. Try using the Room Code (6 characters) or exact room name.",
        suggestion: "Room Codes are short and unique (e.g., ABC123)"
      };
    }

    const { error: joinError } = await supabase
      .from("room_members")
      .insert({ room_id: room.id, user_id: user.id });

    // Handle postgres unique violation
    if (joinError) {
      if (joinError.code === '23505') return { error: "You are already a member of this room." };
      return { error: "Failed to join room: " + joinError.message };
    }

    return { 
      success: true, 
      message: `Joined room '${room.name}' successfully!`,
      roomCode: room.room_code // Return for UI display
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}

export async function addFriendAction(prevState: any, formData: FormData) {
  try {
    const rawData = { identifier: formData.get("identifier") as string };
    const validated = AddFriendSchema.safeParse(rawData);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    
    const { data: me } = await supabase.from("users").select("id, username, user_tag, display_name").eq("clerk_id", userId).single();
    if (!me) return { error: "Your profile not found" };
    
    const searchIdentifier = validated.data.identifier.trim();
    
    // Check if trying to add self
    if (me.username === searchIdentifier || me.user_tag === searchIdentifier) {
      return { error: "You cannot add yourself as a friend." };
    }

    // Search by user_tag first (more precise), then by username
    let friend;
    
    // Try exact match on user_tag (format: username#1234)
    const { data: tagMatch } = await supabase
      .from("users")
      .select("id, username, user_tag, display_name")
      .eq("user_tag", searchIdentifier)
      .single();
    
    if (tagMatch) {
      friend = tagMatch;
    } else {
      // Fall back to case-insensitive username search
      const { data: usernameMatch } = await supabase
        .from("users")
        .select("id, username, user_tag, display_name")
        .ilike("username", searchIdentifier)
        .single();
      
      if (!usernameMatch) {
        return { 
          error: "User not found. Try searching by their unique User Tag (format: username#1234) or exact username.",
          suggestion: "User Tags are unique and easier to find!"
        };
      }
      friend = usernameMatch;
    }

    // Check if friends already
    const { data: existingFriend } = await supabase
      .from("friends")
      .select("id")
      .or(`and(user_id_1.eq.${me.id},user_id_2.eq.${friend.id}),and(user_id_1.eq.${friend.id},user_id_2.eq.${me.id})`)
      .single();
    if (existingFriend) return { error: "You are already friends with this user." };

    // Check if friend request already exists
    const { data: existingRequest } = await supabase
      .from("friend_requests")
      .select("id")
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${me.id})`)
      .eq("status", "pending")
      .single();
    if (existingRequest) return { error: "A friend request already exists between you two." };

    // Create pending request
    const { error: requestError } = await supabase
      .from("friend_requests")
      .insert({ sender_id: me.id, receiver_id: friend.id, status: 'pending' });

    if (requestError) {
      if (requestError.code === '23505') return { error: "A pending friend request already exists between you two." };
      return { error: "Failed to send friend request." };
    }

    // Create notification for the receiver
    await supabase.from("notifications").insert({
      user_id: friend.id,
      type: 'system',
      content: `${me.display_name || me.username} sent you a friend request.`,
      link: '/friends',
      is_read: false
    });

    const recipientName = friend.display_name || friend.username || friend.user_tag;
    return { 
      success: true, 
      message: `Sent a friend request to ${recipientName}!`,
      userTag: friend.user_tag // Return for UI display
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}

export async function acceptFriendAction(requestId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    
    // Get the request
    const { data: request } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .single();
    
    if (!request) return { error: "Friend request not found or already processed." };

    // Get current user id
    const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (me?.id !== request.receiver_id) return { error: "You can only accept requests sent to you." };

    // Update request
    await supabase.from("friend_requests").update({ status: 'accepted', updated_at: new Date().toISOString() }).eq("id", requestId);

    // Create friendship
    const user_id_1 = request.sender_id < request.receiver_id ? request.sender_id : request.receiver_id;
    const user_id_2 = request.sender_id < request.receiver_id ? request.receiver_id : request.sender_id;

    await supabase.from("friends").insert({ user_id_1, user_id_2 });

    return { success: true, message: "Friend request accepted!" };
  } catch (err: any) {
    return { error: "Failed to accept friend request." };
  }
}

export async function rejectFriendAction(requestId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (!me) return { error: "User not found" };
    
    await supabase
      .from("friend_requests")
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("receiver_id", me.id);

    return { success: true, message: "Friend request rejected." };
  } catch (err: any) {
    return { error: "Failed to reject friend request." };
  }
}

export async function createPersonalizedRoomAction(prevState: any, formData: FormData) {
  try {
    const rawData = { name: formData.get("name") as string };
    const validated = CreateRoomSchema.safeParse(rawData);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();

    // Get internal user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (userError) return { error: "Failed to load user profile" };

    // Parse additional fields
    const description = formData.get("description") as string || '';
    const isPrivate = formData.get("isPrivate") === 'true';
    const maxMembers = parseInt(formData.get("maxMembers") as string) || 50;
    const tagsStr = formData.get("tags") as string || '';
    const tags = tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    const requireApproval = formData.get("requireApproval") === 'true';
    const allowInvites = formData.get("allowInvites") === 'true';

    // Create room with personalization
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        name: validated.data.name,
        description: description || null,
        is_private: isPrivate,
        max_members: maxMembers,
        tags: tags,
        created_by: user.id,
        settings: {
          require_approval: requireApproval,
          allow_invites: allowInvites,
          allow_member_invites: allowInvites,
          default_notifications: true
        }
      })
      .select()
      .single();

    if (roomError) return { error: "Failed to create room: " + roomError.message };

    // Add creator as owner member
    await supabase.from("room_members").insert({ 
      room_id: room.id, 
      user_id: user.id,
      role: 'owner'
    });

    return { 
      success: true, 
      message: `Room '${room.name}' created successfully! Room Code: ${room.room_code}`,
      roomId: room.id,
      roomCode: room.room_code
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}

export async function editProfileAction(prevState: any, formData: FormData) {
  try {
    const rawData = { 
      displayName: formData.get("displayName") as string,
      avatarUrl: formData.get("avatarUrl") as string || ""
    };
    const validated = EditProfileSchema.safeParse(rawData);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    
    const { error: updateError } = await supabase
      .from("users")
      .update({ 
        display_name: validated.data.displayName,
        avatar_url: validated.data.avatarUrl || null
      })
      .eq("clerk_id", userId);

    if (updateError) return { error: "Failed to update profile: " + updateError.message };

    return { success: true, message: "Profile updated successfully." };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}

// New action for sending room invitations
export async function sendRoomInvitationAction(roomId: string, userIds: string[], message?: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    
    // Get inviter's DB ID
    const { data: inviter } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();
    if (!inviter) return { error: "User not found" };

    // Check if user is member of the room
    const { data: membership } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", inviter.id)
      .single();
    
    if (!membership) return { error: "You must be a room member to send invitations" };

    // Create invitations
    const invitations = userIds.map(targetUserId => ({
      room_id: roomId,
      invited_by: inviter.id,
      invited_user_id: targetUserId,
      message: message || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }));

    const { error } = await supabase
      .from("room_invitations")
      .insert(invitations);

    if (error) return { error: "Failed to send invitations: " + error.message };

    return { success: true, message: `Sent ${invitations.length} invitation(s)` };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}
