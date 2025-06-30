// app/index.tsx
import React, { useState, useEffect, useMemo } from "react";
import "react-native-url-polyfill/auto";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import NavigationBar from "@/components/NavigationBar";
import ProductCard, { Product } from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";
import Toast from "react-native-toast-message";
import { supabase } from "@/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ——— Types
interface LayoutSection {
  section_id: string;
  section_type: "BASE_CATEGORY" | "PRODUCT_COLLECTION" | "BANNER_MEDIA" | "TAG_GROUP_NAV";
  title: string;
  layout: Record<string, any>;
  source: any;
  custom_image_url?: string;
  custom_image_url_secondary?: string;
  display_order: number;
  location_id: string | null;
}

interface Category {
  id: string;
  name: string;
  icon_url: string;
  background_color: string | null;
  text_color: string | null;
}

interface Tag {
  id: string;
  name: string;
}

// ——— Helpers
const normalizeImages = (raw: any) => {
  if (!raw) return [];
  try {
    return Array.isArray(raw) ? raw : JSON.parse(raw);
  } catch {
    return [];
  }
};
const getPrimaryImage = (raw: any): string => {
  const images = normalizeImages(raw);
  if (!images.length) return "";
  const primary = images.find((i: any) => i.is_primary);
  return primary?.url ?? images[0].url;
};

export default function HomeScreen() {
  const router = useRouter();

  // — state
  const [selectedLocationObj, setSelectedLocationObj] = useState<{ id: string; name: string } | null>(null);
  const [storeName, setStoreName] = useState("Your Store");
  const [primaryColor, setPrimaryColor] = useState("#16a34a");
  const [deliveryAddress, setDeliveryAddress] = useState("Set your delivery location");
  const [layoutSections, setLayoutSections] = useState<LayoutSection[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);

  // search state
  const [searchQuery, setSearchQuery] = useState("");

  // — fetch theme + layout
  useEffect(() => {
    (async () => {
      try {
        const storedLoc = await AsyncStorage.getItem("selectedLocation");
        let locId: string | null = null;
        if (storedLoc) {
          const loc = JSON.parse(storedLoc);
          locId = loc.id;
          setSelectedLocationObj({ id: loc.id, name: loc.name });
          setDeliveryAddress(loc.name);
          setStoreName(loc.name);
        }

        const storeId = await AsyncStorage.getItem("selected_store_id");
        if (storeId) {
          const { data: setting, error } = await supabase
            .from("store_settings")
            .select("theme_store, stores(name, home_layout_published)")
            .eq("store_id", storeId)
            .single();

          if (!error && setting) {
            if (setting.stores?.name) setStoreName(setting.stores.name);
            if (setting.theme_store?.primary) setPrimaryColor(setting.theme_store.primary);

            const raw = setting.stores?.home_layout_published as LayoutSection[] | undefined;
            if (Array.isArray(raw)) {
              const filtered = raw
                .filter((s) => s.location_id === null || s.location_id === locId)
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
              setLayoutSections(filtered);
            }
          }
        }
      } catch (err) {
        console.error("Layout load error:", err);
      } finally {
        setIsLocationLoaded(true);
      }
    })();
  }, []);

  // — fetch categories, products & featured_tags
  useEffect(() => {
    if (!isLocationLoaded) return;
    (async () => {
      try {
        // categories
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name, icon_url, background_color, text_color");
        setAllCategories(cats || []);

        // products
        let prodQuery = supabase
          .from("products")
          .select(`*, image_data, featured_tag_ids, categories(name)`);
        if (selectedLocationObj) {
          prodQuery = prodQuery.eq("location_id", selectedLocationObj.id);
        }
        const { data: prods } = await prodQuery;
        setAllProducts(prods || []);

        // featured_tags
        const tagIds = layoutSections
          .filter((s) => s.section_type === "TAG_GROUP_NAV")
          .flatMap((s) => s.source.ids as string[]);
        if (tagIds.length) {
          const { data: tags } = await supabase
            .from("featured_tags")
            .select("id, name")
            .in("id", tagIds);
          setAllTags(tags || []);
        }
      } catch (err) {
        console.error("Data load error:", err);
        Toast.show({ type: "error", text1: "Failed to load data" });
      }
    })();
  }, [isLocationLoaded, selectedLocationObj, layoutSections]);

  // — filtered products for search
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  }, [searchQuery, allProducts]);

  // — navigation & cart
  const handleViewAll = (tagId: string) => router.push(`/feature/${tagId}`);
  const handleProductClick = (id: string) => router.push(`/ProductDetails?productId=${id}`);
  const handleAddToCart = async (p: Product) => {
    try {
      const stored = await AsyncStorage.getItem("cart");
      const cart: any[] = stored ? JSON.parse(stored) : [];
      const idx = cart.findIndex((x) => x.id === p.id);
      if (idx >= 0) cart[idx].quantity++;
      else cart.push({ ...p, quantity: 1 });
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
    } catch {
      console.error("Add to cart failed");
    }
  };

  // — inline section renderer
  const SectionRenderer = ({ section }: { section: LayoutSection }) => {
    const { section_type, title, source, custom_image_url, custom_image_url_secondary } = section;

    switch (section_type) {
      case "BANNER_MEDIA": {
        const imgs = [custom_image_url, custom_image_url_secondary].filter(Boolean) as string[];
        return (
          <View style={styles.section} key={section.section_id}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imgs.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.bannerImage} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        );
      }

      case "BASE_CATEGORY": {
        const cats = allCategories.filter((c) => source.ids.includes(c.id));
        return (
          <View style={styles.section} key={section.section_id}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => router.push(`/category/${encodeURIComponent(cat.name)}`)}
                  style={{ marginRight: 12 }}
                >
                  <CategoryCard name={cat.name} iconUrl={cat.icon_url} categoryId={cat.id} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      }

      case "TAG_GROUP_NAV": {
        const setIds = new Set(source.ids as string[]);
        const tags = allTags.filter((t) => setIds.has(t.id));
        return (
          <View style={styles.section} key={section.section_id}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  onPress={() => handleViewAll(tag.id)}
                  style={[styles.tagItem, { borderColor: primaryColor }]}
                >
                  <Text style={{ color: primaryColor }}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      }

      case "PRODUCT_COLLECTION": {
        let items: any[] = [];
        if (source.collection_mode === "MANUAL_SELECTION") {
          const locKey = section.location_id ?? selectedLocationObj?.id!;
          const idsForLoc = source.manualSelectionsByLocation[locKey] || [];
          items = allProducts.filter((p) => idsForLoc.includes(p.id));
        } else {
          items = allProducts.slice(0, source.criteria_limit);
        }
        return (
          <View style={styles.section} key={section.section_id}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <TouchableOpacity onPress={() => handleViewAll(section.section_id)}>
                <Text style={[styles.viewAllText, { color: primaryColor }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={items}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const url = getPrimaryImage(item.image_data);
                const prod: Product = {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  originalPrice: item.original_price,
                  unit: item.unit,
                  discount: item.discount_percentage,
                  image_url: url,
                };
                return (
                  <TouchableOpacity
                    style={styles.productCardWrapper}
                    onPress={() => handleProductClick(item.id)}
                  >
                    <ProductCard product={prod} onAddToCart={() => handleAddToCart(prod)} />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );
      }

      default:
        return null;
    }
  };

  // — spinner
  if (!isLocationLoaded) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  // — render
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: primaryColor }]}>{storeName}</Text>
          <TouchableOpacity style={styles.deliveryAddress} onPress={() => router.push("/SelectLocation")}>
            <Feather name="map-pin" size={16} color={primaryColor} style={styles.locationIcon} />
            <Text style={styles.deliveryText}>
              Your store:{" "}
              <Text style={[styles.linkText, { color: primaryColor }]}>{deliveryAddress}</Text>
            </Text>
            <Feather name="arrow-right" size={16} color={primaryColor} />
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          placeholderTextColor="#000"
        />
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.main}>
          {searchQuery
            ? (
                <FlatList
                  numColumns={3}
                  data={filteredProducts}
                  keyExtractor={(p) => p.id}
                  contentContainerStyle={{ paddingHorizontal: 12 }}
                  renderItem={({ item }) => {
                    const prod: Product = {
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      originalPrice: item.original_price,
                      unit: item.unit,
                      discount: item.discount_percentage,
                      image_url: getPrimaryImage(item.image_data),
                    };
                    return (
                      <TouchableOpacity
                        style={styles.productCardWrapper}
                        onPress={() => handleProductClick(item.id)}
                      >
                        <ProductCard product={prod} onAddToCart={() => handleAddToCart(prod)} />
                      </TouchableOpacity>
                    );
                  }}
                />
              )
            : layoutSections.map((section) => (
                <SectionRenderer key={section.section_id} section={section} />
              ))
          }
        </View>
      </ScrollView>

      <Toast />
      <NavigationBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  scrollContainer: { flexGrow: 1, paddingBottom: 80 },
  header: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    zIndex: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "bold" },
  deliveryAddress: { flexDirection: "row", alignItems: "center" },
  locationIcon: { marginRight: 4 },
  deliveryText: { fontSize: 14, color: "#687076", marginRight: 4 },
  linkText: { fontWeight: "bold" },
  searchBar: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  main: { padding: 12 },
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  viewAllText: { fontSize: 14 },
  bannerImage: {
    width: Dimensions.get("window").width - 32,
    height: (Dimensions.get("window").width - 32) * 0.5,
    borderRadius: 8,
    marginRight: 12,
  },
  tagItem: { padding: 8, borderWidth: 1, borderRadius: 8, marginRight: 12 },
  categoryScroll: { paddingVertical: 8 },
  productCardWrapper: {
    width: Math.floor((Dimensions.get("window").width - 48) / 3),
    marginRight: 12,
    marginBottom: 16,
  },
  horizontalList: { paddingHorizontal: 16 },
});
