// app/category/[categoryId].tsx

import React, { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import { supabase } from "@/supabaseClient";
import { Toast, useToast } from "@/hooks/use-toast";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Product {
  id: string;
  name: string;
  price: number;
  image_data?: any;
}

export default function CategoryScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { primary } = useColorScheme();
  const { ToastContainer } = useToast();

  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string } | null>(null);
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [isCatLoading, setIsCatLoading] = useState(true);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1️⃣ Load selected location
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("selectedLocation");
        if (raw) {
          const loc = JSON.parse(raw);
          setSelectedLocation({ id: loc.id, name: loc.name });
        }
      } catch (e) {
        console.error("Failed to load location:", e);
      } finally {
        setIsLocationLoaded(true);
      }
    })();
  }, []);

  // 2️⃣ Fetch category name
  useEffect(() => {
    (async () => {
      if (!categoryId) {
        setCategoryName("Category");
        setIsCatLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryId)
          .maybeSingle();
        setCategoryName(!error && data ? data.name : "Category");
      } catch {
        setCategoryName("Category");
      } finally {
        setIsCatLoading(false);
      }
    })();
  }, [categoryId]);

  // 3️⃣ Fetch products for that category (+ location)
  const fetchProductsByCategory = useCallback(async () => {
    if (!isLocationLoaded || !categoryId) return;
    try {
      let q = supabase.from("products").select("*").eq("category_id", categoryId);
      if (selectedLocation) q = q.eq("location_id", selectedLocation.id);

      const { data, error } = await q;
      if (error) {
        Toast.show({ type: "error", text1: "Failed to load products." });
        return;
      }
      setAllProducts(data || []);
    } catch {
      Toast.show({ type: "error", text1: "Unexpected error." });
    }
  }, [isLocationLoaded, selectedLocation, categoryId]);

  useFocusEffect(
    useCallback(() => {
      fetchProductsByCategory();
    }, [fetchProductsByCategory])
  );
  useEffect(() => {
    fetchProductsByCategory();
  }, [isLocationLoaded, selectedLocation, categoryId]);

  // 4️⃣ Apply in‐screen search filtering
  useEffect(() => {
    let list = allProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    setFilteredProducts(list);
  }, [allProducts, searchQuery]);

  // 5️⃣ Helpers
  const normalizeImages = (raw: any) => {
    if (!raw) return [];
    try {
      return Array.isArray(raw) ? raw : JSON.parse(raw);
    } catch {
      return [];
    }
  };
  const getImageUrl = (raw: any) => {
    const imgs = normalizeImages(raw);
    if (!imgs.length) return "https://via.placeholder.com/150";
    const prim = imgs.find((i: any) => i.is_primary);
    return prim?.url ?? imgs[0].url;
  };
  const toggleFavorite = (id: string) =>
    setFavorites((f) => ({ ...f, [id]: !f[id] }));
  const handleAddToCart = async (p: Product) => {
    try {
      const stored = (await AsyncStorage.getItem("cart")) || "[]";
      const cart = JSON.parse(stored) as any[];
      const idx = cart.findIndex((c) => c.id === p.id);
      if (idx >= 0) cart[idx].quantity++;
      else cart.push({ ...p, quantity: 1 });
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      Toast.show({ type: "success", text1: `${p.name} added to cart!` });
    } catch {
      Toast.show({ type: "error", text1: "Failed to add to cart." });
    }
  };
  const toggleSearch = () => {
    setIsSearchVisible((v) => !v);
    if (!isSearchVisible) setSearchQuery("");
  };

  // 6️⃣ Loading states
  if (!isLocationLoaded || isCatLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  // 7️⃣ Render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isSearchVisible ? (
          <View style={styles.searchContainer}>
            <TextInput
              placeholder={`Search in ${categoryName}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="rgba(0,0,0,0.5)"
              autoFocus
            />
            <Button variant="ghost" size="icon" onPress={toggleSearch} style={styles.closeButton}>
              <Feather name="x" size={20} color="#000" />
            </Button>
          </View>
        ) : (
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#000" />
            </Pressable>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <Button variant="ghost" size="icon" onPress={toggleSearch}>
              <Feather name="search" size={24} color="#000" />
            </Button>
          </View>
        )}
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/ProductDetails?productId=${item.id}`)}
          >
            <View style={styles.productImageContainer}>
              <Image source={{ uri: getImageUrl(item.image_data) }} style={styles.productImage} />
              <Button variant="ghost" size="icon" style={styles.favoriteButton} onPress={() => toggleFavorite(item.id)}>
                <Feather name="heart" size={20} color={favorites[item.id] ? "red" : "gray"} />
              </Button>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={[styles.productPrice, { color: primary }]}>${item.price.toFixed(2)}</Text>
              <Button
                style={[styles.addToCartButton, { backgroundColor: primary, borderColor: primary }]}
                onPress={() => handleAddToCart(item)}
              >
                <Feather name="plus" size={20} color="#fff" />
              </Button>
            </View>
          </TouchableOpacity>
        )}
        numColumns={2}
        contentContainerStyle={[styles.productsGrid, { paddingBottom: 70 }]}
      />

      <ToastContainer />
      <NavigationBar />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: Platform.OS === "ios" ? "#f7f5f5" : "#fff" },
  header: { backgroundColor: "#fff", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  searchContainer: { flexDirection: "row", alignItems: "center" },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: "#e5e5e5",
    borderRadius: 8, padding: 8, backgroundColor: "#f9f9f9"
  },
  closeButton: { marginLeft: 8 },

  productsGrid: { padding: 16, justifyContent: "space-between" },
  productCard: {
    width: "48%", marginBottom: 16, marginHorizontal: "1.5%",
    backgroundColor: "#fff", borderRadius: 8, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  productImageContainer: { position: "relative", backgroundColor: "#f9f9f9" },
  productImage: { width: "100%", height: 160, resizeMode: "cover" },
  favoriteButton: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 50, padding: 4 },
  productDetails: { padding: 8 },
  productName: { fontSize: 16, fontWeight: "500", marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: "bold" },
  addToCartButton: {
    marginTop: 8, borderRadius: 9999, height: 32, width: 32,
    justifyContent: "center", alignItems: "center", borderWidth: 1,
  },
});
