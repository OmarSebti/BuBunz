import { useEffect, useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

export type Profile = { id: string; nickname: string };

export function useAuth(sessionId: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from('profiles').select('id, nickname').eq('id', user.id).single()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [user]);

  useEffect(() => {
    if (!user || !sessionId) return;
    supabase.rpc('link_session_to_user', { p_session_id: sessionId });
  }, [user, sessionId]);

  const signUpWithEmail = useCallback(async (email: string, password: string, nickname: string) => {
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      const { error } = await supabase.from('profiles').insert({ id: newUser.id, nickname });
      if (error) throw error;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'bubunz' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
      }
    }
  }, []);

  const createProfile = useCallback(async (nickname: string) => {
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase.from('profiles').insert({ id: user.id, nickname });
    if (error) throw error;
    setProfile({ id: user.id, nickname });
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, profile, loading, signUpWithEmail, signInWithEmail, signInWithGoogle, createProfile, signOut };
}
