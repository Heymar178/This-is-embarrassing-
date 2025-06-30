// components/ProductCard.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";

export interface Product {
  image_url: string;
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const screenWidth = Dimensions.get("window").width;
const cardMargin = 8;
const numColumns = 3;
const cardWidth =
  (screenWidth - cardMargin * (numColumns * 2 + 1)) / numColumns;

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>("#16a34a");
  const [loadingColor, setLoadingColor] = useState(true);

  // Load dynamic primary color from selected store
  useEffect(() => {
    (async () => {
      try {
        const storeId = await AsyncStorage.getItem("selected_store_id");
        if (storeId) {
          const { data, error } = await supabase
            .from("store_settings")
            .select("theme_store")
            .eq("store_id", storeId)
            .single();
          if (!error && data?.theme_store?.primary) {
            setPrimaryColor(data.theme_store.primary);
          }
        }
      } catch (err) {
        console.error("Error loading primary color:", err);
      } finally {
        setLoadingColor(false);
      }
    })();
  }, []);

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(product.originalPrice)
    : null;

  const handleAddToCart = async () => {
    try {
      const storedCart = await AsyncStorage.getItem("cart");
      const cart: any[] = storedCart ? JSON.parse(storedCart) : [];
      const existingIndex = cart.findIndex((item) => item.id === product.id);
      if (existingIndex !== -1) {
        cart[existingIndex].quantity += 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      if (onAddToCart) onAddToCart(product);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const hasValidUri =
    typeof product.image_url === "string" && product.image_url.trim().length > 0;

  // Show loading spinner until primaryColor is loaded
  if (loadingColor) {
    return (
      <View style={[styles.card, { width: cardWidth, justifyContent: 'center', alignItems: 'center' }]}>  
        <ActivityIndicator size="small" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { width: cardWidth }]}>      
      <View style={styles.imageContainer}>
        {hasValidUri ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            onError={() =>
              console.error(`Failed to load image: ${product.image_url}`)
            }
          />
        ) : (
          <View style={styles.placeholder} />
        )}
        {product.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discount}%</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.unit}>{product.unit}</Text>

        <View style={styles.priceSection}>
          <Text style={[styles.price, { color: primaryColor }]}>
            {formattedPrice}
          </Text>
          {formattedOriginalPrice && (
            <Text style={styles.originalPrice}>
              {formattedOriginalPrice}
            </Text>
          )}
        </View>

        <Pressable
          onPress={handleAddToCart}
          onPressIn={() => setIsHovered(true)}
          onPressOut={() => setIsHovered(false)}
          style={[
            styles.addButton,
            { borderColor: primaryColor },
            isHovered && { backgroundColor: primaryColor },
          ]}
        >
          <Text
            style={[
              styles.addButtonText,
              isHovered && { color: "#fff" },
              !isHovered && { color: primaryColor },
            ]}
          >
            Add
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 16,
    height: 240,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    resizeMode: "cover",
  },
  placeholder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#ccc",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ff4d4f",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    padding: 8,
    flex: 1,
    justifyContent: "flex-start",
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  unit: {
    fontSize: 12,
    color: "#687076",
    marginBottom: 4,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
  },
  originalPrice: {
    fontSize: 12,
    color: "#9ba1a6",
    textDecorationLine: "line-through",
    marginLeft: 6,
  },
  addButton: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    marginTop: 4,
  },
  addButtonText: {
    fontWeight: "bold",
  },
});

export default ProductCard;