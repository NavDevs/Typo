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
    const { data: existingRequests, error: fetchErr } = await supabase
      .from("friend_requests")
      .select("id, status")
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${me.id})`);
    
    if (fetchErr) return { error: "Fetch error: " + JSON.stringify(fetchErr) };

    if (existingRequests && existingRequests.length > 0) {
      const pendingRequest = existingRequests.find(r => r.status === 'pending');
      if (pendingRequest) {
        return { error: "A friend request is already pending between you two. Please wait for it to be accepted." };
      }
      
      // Clean up old accepted/rejected requests so a fresh one can be created
      const idsToDelete = existingRequests.map(r => r.id);
      const { error: delErr } = await supabase
        .from("friend_requests")
        .delete()
        .in("id", idsToDelete);
        
      if (delErr) console.error("Failed to cleanup old requests:", delErr);
    }

    // Create pending request
    const { error: requestError, data: insertData } = await supabase
      .from("friend_requests")
      .insert({ sender_id: me.id, receiver_id: friend.id, status: 'pending' })
      .select("id");

    if (requestError) {
      return { error: `Insert failed: ${JSON.stringify(requestError)}` };
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
    const { data: request, error: fetchErr } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .single();
    
    if (fetchErr) return { error: "Failed to fetch request: " + fetchErr.message };
    if (!request) return { error: "Friend request not found or already processed." };

    // Get current user id
    const { data: me, error: meErr } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (meErr) return { error: "Failed to fetch your profile: " + meErr.message };
    if (!me || me.id !== request.receiver_id) return { error: "You can only accept requests sent to you." };

    // Update request status
    const { error: updateErr } = await supabase
      .from("friend_requests")
      .update({ status: 'accepted' })
      .eq("id", requestId);
    if (updateErr) return { error: "Failed to update request status: " + updateErr.message };

    // Create friendship
    const user_id_1 = request.sender_id < request.receiver_id ? request.sender_id : request.receiver_id;
    const user_id_2 = request.sender_id < request.receiver_id ? request.receiver_id : request.sender_id;

    const { error: friendErr } = await supabase
      .from("friends")
      .insert({ user_id_1, user_id_2 });
    if (friendErr) {
      // If code is 23505, they are already friends, so we can consider it success
      if (friendErr.code !== '23505') return { error: "Failed to create friendship: " + friendErr.message };
    }

    // Clean up friend request notification for the receiver
    await supabase.from("notifications")
      .delete()
      .eq("user_id", me.id)
      .eq("type", "system")
      .ilike("content", "%friend request%");

    // ADD A NOTIFICATION TO THE SENDER THAT IT WAS ACCEPTED
    await supabase.from("notifications").insert({
      user_id: request.sender_id,
      type: 'system',
      content: "Your friend request was accepted!",
      link: '/friends',
      is_read: false
    });

    return { success: true, message: "Friend request accepted!" };
  } catch (err: any) {
    return { error: "Application error: " + err.message };
  }
}

export async function rejectFriendAction(requestId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    const { data: me, error: meErr } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (meErr) return { error: "Failed to fetch your profile." };
    if (!me) return { error: "User not found" };
    
    // update status
    const { error: updateErr } = await supabase
      .from("friend_requests")
      .update({ status: 'rejected' })
      .eq("id", requestId);
    if (updateErr) return { error: "Failed to declare request rejected: " + updateErr.message };

    // delete notification
    const { error: delErr } = await supabase.from("notifications")
      .delete()
      .eq("user_id", me.id)
      .eq("type", "system")
      .ilike("content", "%friend request%");
    if (delErr) return { error: "Failed to remove notification: " + delErr.message };

    return { success: true, message: "Friend request declined" };
  } catch (err: any) {
    return { error: "Application error: " + err.message };
  }
}

export async function unfriendAction(friendUserId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    const { data: me } = await supabase.from("users").select("id, display_name, username").eq("clerk_id", userId).single();
    if (!me) return { error: "User not found" };

    // Get friend's info for notification
    const { data: friendUser } = await supabase.from("users").select("id, display_name, username").eq("id", friendUserId).single();

    // Delete friendship row (order-agnostic)
    const { error } = await supabase
      .from("friends")
      .delete()
      .or(`and(user_id_1.eq.${me.id},user_id_2.eq.${friendUserId}),and(user_id_1.eq.${friendUserId},user_id_2.eq.${me.id})`);

    if (error) return { error: "Failed to remove friend: " + error.message };

    // Also clean up any old friend_requests between these users
    await supabase
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${me.id})`);

    // Notify both users about the unfriend
    const myName = me.display_name || me.username || 'A user';
    const friendName = friendUser?.display_name || friendUser?.username || 'A user';

    await supabase.from("notifications").insert([
      {
        user_id: friendUserId,
        type: 'system',
        content: `${myName} has removed you as a friend.`,
        link: null,
        is_read: false
      },
      {
        user_id: me.id,
        type: 'system',
        content: `You removed ${friendName} from your friends.`,
        link: null,
        is_read: false
      }
    ]);

    return { success: true, message: "Friend removed successfully." };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}

export async function leaveRoomAction(roomId: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Unauthorized" };

    const supabase = await createClerkServerClient();
    const { data: me } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
    if (!me) return { error: "User not found" };

    // Remove user from room_members
    const { error } = await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", me.id);

    if (error) return { error: "Failed to leave room: " + error.message };

    return { success: true, message: "Left room successfully." };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
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

