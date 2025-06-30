import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/supabaseClient';

const Logo: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storeId = await AsyncStorage.getItem('selected_store_id');
      if (!storeId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('store_settings')
        .select('logo_url, store:stores(name)')
        .eq('store_id', storeId)
        .single();
      if (error) {
        console.error('Error loading logo:', error);
      } else if (data) {
        setLogoUrl(data.logo_url);
        setStoreName(data.store.name);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <ActivityIndicator style={styles.loading} color="#16a34a" size="large" />;
  }

  return (
    <View style={styles.container}>
      {/* Placeholder for logo/space above */}
      <View style={styles.iconWrapper}>
        {logoUrl && <Image source={{ uri: logoUrl }} style={styles.iconImage} />}
      </View>
      <Text style={styles.title}>{storeName || 'Your Store'}</Text>
      <Text style={styles.subtitle}>Fresh groceries at your doorstep</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loading: { marginVertical: 20 },
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    marginTop: 4,  // reduced top space
    marginBottom: 1,  // reduced bottom space
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    marginBottom: -30,  // reduced bottom space
    fontSize: 14,
    color: '#6b7280',
  },
});

export default Logo;
