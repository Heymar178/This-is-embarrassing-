import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://bwgkpymchviutppyooor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Z2tweW1jaHZpdXRwcHlvb29yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQxMDQ0OSwiZXhwIjoyMDU5OTg2NDQ5fQ.hjo9LZMnaCQsyUefbP7IPVxbHVR3PNLXFdpnaflXp1g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
  },
  // 👇👇👇 This disables @supabase/realtime-js and removes ws/stream/etc.
  realtime: {
    enabled: false,
  },
});
