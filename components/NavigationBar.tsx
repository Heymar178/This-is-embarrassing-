// components/NavigationBar.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/supabaseClient';

const NavigationBar: React.FC = () => {
  const navigation = useNavigation<{
    navigate: (screen: '(tabs)/index' | '(tabs)/Cart' | 'Account') => void;
  }>();
  const route = useRoute();
  const [primaryColor, setPrimaryColor] = useState<string>('#16a34a');

  // Load dynamic primary color on mount
  useEffect(() => {
    (async () => {
      try {
        const storeId = await AsyncStorage.getItem('selected_store_id');
        if (!storeId) return;
        const { data, error } = await supabase
          .from('store_settings')
          .select('theme_store')
          .eq('store_id', storeId)
          .single();
        if (!error && data?.theme_store?.primary) {
          setPrimaryColor(data.theme_store.primary);
        }
      } catch (err) {
        console.error('NavigationBar theme load error:', err);
      }
    })();
  }, []);

  const isActive = (routeName: string) => route.name === routeName;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.navItem,
          isActive('(tabs)/index') && styles.activeNavItem,
        ]}
        onPress={() => navigation.navigate('(tabs)/index')}
      >
        <>
          <Feather
            name="home"
            size={24}
            color={isActive('(tabs)/index') ? primaryColor : '#687076'}
          />
          <Text
            style={[
              styles.navText,
              isActive('(tabs)/index') && { color: primaryColor },
            ]}
          >
            Home
          </Text>
        </>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navItem,
          isActive('(tabs)/Cart') && styles.activeNavItem,
        ]}
        onPress={() => navigation.navigate('(tabs)/Cart')}
      >
        <>
          <Feather
            name="shopping-cart"
            size={24}
            color={isActive('(tabs)/Cart') ? primaryColor : '#687076'}
          />
          <Text
            style={[
              styles.navText,
              isActive('(tabs)/Cart') && { color: primaryColor },
            ]}
          >
            Cart
          </Text>
        </>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navItem,
          isActive('Account') && styles.activeNavItem,
        ]}
        onPress={() => navigation.navigate('Account')}
      >
        <>
          <Feather
            name="user"
            size={24}
            color={isActive('Account') ? primaryColor : '#687076'}
          />
          <Text
            style={[
              styles.navText,
              isActive('Account') && { color: primaryColor },
            ]}
          >
            Account
          </Text>
        </>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    zIndex: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  activeNavItem: {},
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#687076',
  },
});

export default NavigationBar;
