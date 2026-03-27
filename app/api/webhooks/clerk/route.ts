import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle user.created event
  const eventType = evt.type;
  if (eventType === 'user.created') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response('No email provided', { status: 400 });
    }

    const displayName = first_name && last_name 
      ? `${first_name} ${last_name}` 
      : first_name || last_name || username || email.split('@')[0];

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Insert new user into Supabase users table
    const { error } = await supabase
      .from('users')
      .insert({
        clerk_id: id,
        email: email,
        username: username || email.split('@')[0],
        display_name: displayName,
        avatar_url: image_url
      });

    if (error) {
      console.error('Error inserting user into Supabase:', error);
      return new Response('Error syncing user', { status: 500 });
    }

    console.log(`User ${id} successfully synced to Supabase.`);
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    const displayName = first_name && last_name 
      ? `${first_name} ${last_name}` 
      : first_name || last_name || username || (email ? email.split('@')[0] : 'User');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('users')
      .update({
        email: email,
        username: username || (email ? email.split('@')[0] : undefined),
        display_name: displayName,
        avatar_url: image_url
      })
      .eq('clerk_id', id);

    if (error) {
      console.error('Error updating user in Supabase:', error);
      return new Response('Error syncing user update', { status: 500 });
    }

    console.log(`User ${id} successfully updated in Supabase.`);
  }

  return new Response('', { status: 200 });
}
