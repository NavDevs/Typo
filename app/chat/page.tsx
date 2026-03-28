import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ChatDashboard from '@/components/chat/ChatDashboard';
import { createClerkServerClient } from '@/lib/supabase/server';

export default async function ChatPage() {
  const { userId, getToken } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/sign-in');
  }

  let token: string | null = null;
  let templateMissing = false;

  try {
    // Generate the Supabase JWT token using the Custom template
    token = await getToken({ template: 'supabase' });
  } catch (err) {
    console.error("Clerk JWT template missing or error:", err);
    templateMissing = true;
  }

  if (templateMissing || !token) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-[#0b1326] text-white p-6">
        <div className="glass-panel max-w-lg p-8 text-center border-red-500/30 bg-red-500/10">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Missing API Configuration</h2>
          <p className="text-white/80 mb-6">
            The application failed to fetch the <strong>'supabase'</strong> JWT template from Clerk.
          </p>
          <div className="text-left bg-black/40 p-4 rounded-lg text-sm text-white/70 space-y-2">
            <p><strong>To fix this:</strong></p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Open your Clerk Dashboard</li>
              <li>Navigate to <strong>JWT Templates</strong></li>
              <li>Create a new template named exactly <strong>supabase</strong></li>
              <li>Include any needed custom claims (e.g., matching the Supabase anon role).</li>
            </ol>
          </div>
        </div>
      </main>
    );
  }

  // Auto-sync Clerk User to Supabase Database
  try {
    const supabase = await createClerkServerClient();
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
    const username = user.username || user.firstName?.toLowerCase() || primaryEmail.split('@')[0];
    const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.username || primaryEmail.split('@')[0]);
    
    console.log("Syncing Clerk user to Supabase:", { clerk_id: userId, username, email: primaryEmail });
    
    // Attempt to upsert the user profile
    const { data, error } = await supabase.from('users').upsert({
      clerk_id: userId,
      email: primaryEmail,
      username: username,
      display_name: displayName,
      avatar_url: user.imageUrl || null
    }, { 
      onConflict: 'clerk_id',
      ignoreDuplicates: false
    });
    
    if (error) {
      console.error("Failed to sync user to Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // If upsert fails, try regular insert (might be a conflict issue)
      if (error.code === '23505') { // Unique violation
        console.log("User already exists, attempting update instead...");
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: primaryEmail,
            username: username,
            display_name: displayName,
            avatar_url: user.imageUrl || null
          })
          .eq('clerk_id', userId);
        
        if (updateError) {
          console.error("Update also failed:", updateError);
        } else {
          console.log("User updated successfully via fallback method");
        }
      }
    } else {
      console.log("User synced successfully:", data);
    }
  } catch (err) {
    console.error("Error during user sync:", err);
  }


  return (
    <main className="flex h-[100dvh] w-full flex-col bg-[#0b1326] text-white relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0b1326] via-[#111833] to-[#1c133a] opacity-50" />
      <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
      
      <div className="z-10 h-full w-full flex p-0 sm:p-4 lg:p-8">
        <ChatDashboard />
      </div>
    </main>
  );
}
