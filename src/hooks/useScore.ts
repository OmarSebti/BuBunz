import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'bubunz_session_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useScore(): { count: number; reportBounce: () => void } {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function initSession() {
      let id = await SecureStore.getItemAsync(SESSION_KEY);
      if (!id) {
        id = generateUUID();
        await SecureStore.setItemAsync(SESSION_KEY, id);
        await supabase
          .from('game_sessions')
          .insert({ id, bounce_count: 0 });
      } else {
        const { data } = await supabase
          .from('game_sessions')
          .select('bounce_count')
          .eq('id', id)
          .single();
        if (data) {
          setCount(data.bounce_count as number);
        }
      }
      setSessionId(id);
    }
    initSession();
  }, []);

  const reportBounce = useCallback(() => {
    if (!sessionId) return;
    setCount((prev) => prev + 1);
    supabase
      .rpc('increment_bounce', { p_session_id: sessionId })
      .then(({ data }) => {
        if (typeof data === 'number') {
          setCount(data);
        }
      });
  }, [sessionId]);

  return { count, reportBounce };
}
