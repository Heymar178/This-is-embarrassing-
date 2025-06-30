// src/auth/google.ts

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabaseClient';

WebBrowser.maybeCompleteAuthSession();

/**
 * Launches the Google OAuth flow via Supabase.
 * On redirect back to your app, Supabase will fire onAuthStateChange.
 */
export async function signInWithGoogle(): Promise<void> {
  // 1) Build your deep‐link redirect URI
  const redirectUri = makeRedirectUri({ scheme: 'marketlift' });

  // 2) Ask Supabase for the OAuth URL
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUri },
  });
  if (error) {
    console.error('Google OAuth error:', error);
    throw error;
  }

  // 3) Open the system browser / in-app browser for the user to consent
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  // 4) You can inspect `result` if you like, but Supabase picks up the session
  //    via onAuthStateChange once the redirect fires.
  if (result.type !== 'success' && result.type !== 'dismiss') {
    // handle other result types if needed
    console.warn('Unexpected auth session result:', result);
  }
}
