import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await supabase.auth.getSession();
      setIsAuthenticated(!!session.data.session);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/SelectStore" />;
}
