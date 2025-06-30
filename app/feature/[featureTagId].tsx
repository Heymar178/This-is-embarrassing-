// app/feature/[featureTagId].tsx

import React, { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "@/supabaseClient";
import { Toast, useToast } from "@/hooks/use-toast";
import { useColorScheme } from "@/hooks/useColorScheme"; // ← custom hook for primary color

interface Product {
  id: string;
  name: string;
  price: number;
  image_data?: any;
  featured_tag_ids?: string[];
}

type LayoutSection = {
  section_id: string;
  section_type:
    | "BASE_CATEGORY"
    | "PRODUCT_COLLECTION"
    | "BANNER_MEDIA"
    | "TAG_GROUP_NAV";
  title: string;
  source: any;
  location_id: string | null;
};

const FeatureScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { ToastContainer } = useToast();
  const { primary } = useColorScheme();
  const { featureTagId } = useLocalSearchParams<{ featureTagId: string }>();

  const [selectedLocationObj, setSelectedLocationObj] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("selectedLocation");
        if (stored) {
          const loc = JSON.parse(stored);
          setSelectedLocationObj({ id: loc.id, name: loc.name });
        }
      } catch {
        /* ignore */
      } finally {
        setIsLocationLoaded(true);
      }
    })();
  }, []);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [tagName, setTagName] = useState("");
  const [isTagLoading, setIsTagLoading] = useState(true);

  // only used for TAG_GROUP_NAV fallback—will be overridden for PRODUCT_COLLECTION
  useEffect(() => {
    (async () => {
      if (!featureTagId) {
        setIsTagLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("featured_tags")
          .select("name")
          .eq("id", featureTagId)
          .maybeSingle();
        if (!error && data) setTagName(data.name);
      } catch {
        /* ignore */
      } finally {
        setIsTagLoading(false);
      }
    })();
  }, [featureTagId]);

  // <<< ONLY THIS FUNCTION’S BODY CHANGED >>>
  const fetchProductsByTag = useCallback(async () => {
    if (!isLocationLoaded || !featureTagId) return;
    let prods: Product[] = [];
    setAllProducts([]);
    try {
      // 1) load layout JSON
      const storeId = await AsyncStorage.getItem("selected_store_id");
      const { data: setting } = await supabase
        .from("store_settings")
        .select("stores(home_layout_published)")
        .eq("store_id", storeId)
        .single();

      const layout = setting?.stores?.home_layout_published as
        | LayoutSection[]
        | undefined;
      const sec = layout?.find(
        (s) => s.section_id === featureTagId
      );

      if (sec?.section_type === "PRODUCT_COLLECTION") {
        // PRODUCT_COLLECTION: use the section title and its product IDs
        setTagName(sec.title);

        const locKey =
          sec.location_id ?? selectedLocationObj?.id ?? "undefined";
        const manualMap = sec.source.manualSelectionsByLocation || {};
        const ids: string[] =
          manualMap[locKey] || sec.source.product_ids || [];

        const { data, error } = await supabase
          .from("products")
          .select("*, image_data")
          .in("id", ids)
          .eq("location_id", selectedLocationObj?.id);
        if (error)
          Toast.show({
            type: "error",
            text1: "Failed to load collection.",
          });
        prods = data || [];
      } else {
        // TAG_GROUP_NAV fallback
        let q = supabase.from("products").select("*, image_data");
        if (selectedLocationObj)
          q = q.eq("location_id", selectedLocationObj.id);
        const { data, error } = await q.contains(
          "featured_tag_ids",
          [featureTagId]
        );
        if (error)
          Toast.show({
            type: "error",
            text1: "Failed to load products.",
          });
        prods = data || [];
      }
    } catch {
      Toast.show({ type: "error", text1: "Unexpected error." });
    }
    setAllProducts(prods);
  }, [isLocationLoaded, featureTagId, selectedLocationObj]);

  useFocusEffect(
    useCallback(() => {
      fetchProductsByTag();
    }, [fetchProductsByTag])
  );
  useEffect(() => {
    if (isLocationLoaded && featureTagId) {
      fetchProductsByTag();
    }
  }, [isLocationLoaded, featureTagId, fetchProductsByTag]);

  useEffect(() => {
    let temp = allProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter((p) =>
        p.name.toLowerCase().includes(q)
      );
    }
    setFilteredProducts(temp);
  }, [allProducts, searchQuery]);

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
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAddToCart = async (product: Product) => {
    try {
      const cart =
        JSON.parse((await AsyncStorage.getItem("cart")) || "[]") ||
        [];
      const idx = cart.findIndex((c: any) => c.id === product.id);
      if (idx >= 0) cart[idx].quantity++;
      else cart.push({ ...product, quantity: 1 });
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      Toast.show({
        type: "success",
        text1: `${product.name} added to cart!`,
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to add to cart.",
      });
    }
  };

  const toggleSearch = () => {
    setIsSearchVisible((v) => !v);
    if (!isSearchVisible) setSearchQuery("");
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.productCard}
      onPress={() =>
        router.push(`/ProductDetails?productId=${item.id}`)
      }
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: getImageUrl(item.image_data) }}
          style={styles.productImage}
        />
        <Button
          variant="ghost"
          size="icon"
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Feather
            name="heart"
            size={20}
            color={favorites[item.id] ? "red" : "gray"}
          />
        </Button>
      </View>
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text
          style={[styles.productPrice, { color: primary }]}
        >
          ${item.price.toFixed(2)}
        </Text>
        <Button
          style={[
            styles.addToCartButton,
            {
              backgroundColor: primary || "#16a34a",
              borderColor: primary || "#16a34a",
            },
          ]}
          onPress={() => handleAddToCart(item)}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Button>
      </View>
    </TouchableOpacity>
  );

  if (!isLocationLoaded || isTagLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isSearchVisible ? (
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Search in this tag..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="rgba(0,0,0,0.5)"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onPress={toggleSearch}
              style={styles.closeButton}
            >
              <Feather name="x" size={20} color="#000" />
            </Button>
          </View>
        ) : (
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => navigation.navigate("(tabs)/index")}
              style={styles.backButton}
            >
              <Feather
                name="arrow-left"
                size={24}
                color="#000"
              />
            </Pressable>
            <Text style={styles.headerTitle}>{tagName}</Text>
            <Button
              variant="ghost"
              size="icon"
              onPress={toggleSearch}
            >
              <Feather
                name="search"
                size={24}
                color="#000"
              />
            </Button>
          </View>
        )}
      </View>

      {/* Products */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={[
          styles.productsGrid,
          { paddingBottom: 70 },
        ]}
        numColumns={2}
      />

      <ToastContainer />
      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor:
      Platform.OS === "ios" ? "#f7f5f5" : "#fff",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f9f9f9",
  },
  closeButton: { marginLeft: 8 },
  productsGrid: { padding: 16, justifyContent: "space-between" },
  productCard: {
    width: "48%",
    marginBottom: 16,
    marginHorizontal: "1.5%",
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productImageContainer: {
    position: "relative",
    backgroundColor: "#f9f9f9",
  },
  productImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 50,
    padding: 4,
  },
  productDetails: { padding: 8 },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
  },
  addToCartButton: {
    marginTop: 8,
    borderRadius: 9999,
    height: 32,
    width: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});

export default FeatureScreen;
