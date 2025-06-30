import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Text,
  StyleSheet,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/supabaseClient';

const PRIMARY = '#16a34a';

type Store = {
  store_id: string;
  store_name: string;
  logo_url: string;
};

export default function SelectStore() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filtered, setFiltered] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const navigation = useNavigation();

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('store_id, logo_url, store:stores(name)')
      .order('store_id', { ascending: true });

    if (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
      setFiltered([]);
    } else {
      const arr = (data || []).map((r) => ({
        store_id: r.store_id,
        logo_url: r.logo_url,
        store_name: r.store.name,
      }));
      setStores(arr);
      setFiltered(arr);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStores();
    setRefreshing(false);
  }, [fetchStores]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(
      q ? stores.filter((s) => s.store_name.toLowerCase().includes(q)) : stores
    );
  }, [search, stores]);

  const pick = async (id: string) => {
    await AsyncStorage.setItem('selected_store_id', id);
    navigation.navigate('Login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Move the Select your store text to the middle */}
      <View style={styles.middleContainer}>
        <Text style={styles.selectTitle}>Select your store</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={PRIMARY} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          underlineColorAndroid="transparent"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.store_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => pick(item.store_id)}
            {...(Platform.OS === 'android'
              ? { android_ripple: { color: PRIMARY + '33' } }
              : {})}
          >
            <Image source={{ uri: item.logo_url }} style={styles.logo} />
            <Text style={styles.name}>{item.store_name}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flex: 0, // Reduce the height of the container
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4, // Add a small margin above and below
  },
  selectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#000',
  },
  listContainer: { padding: 16 },
  card: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
});