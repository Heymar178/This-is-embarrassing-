// app/ProductDetails.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import { Toast, useToast } from "../hooks/use-toast";
import { supabase } from "@/supabaseClient";

const windowWidth = Dimensions.get("window").width;

const ProductDetails: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { productId } = route.params || {};
  const { ToastContainer } = useToast();

  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const [primaryColor, setPrimaryColor] = useState<string>("#16a34a");
  const [themeLoaded, setThemeLoaded] = useState(false);

  const carouselRef = useRef<ScrollView>(null);

  // Load theme primary color
  useEffect(() => {
    (async () => {
      try {
        const storeId = await AsyncStorage.getItem('selected_store_id');
        if (storeId) {
          const { data, error } = await supabase
            .from('store_settings')
            .select('theme_store')
            .eq('store_id', storeId)
            .single();
          if (!error && data?.theme_store?.primary) {
            setPrimaryColor(data.theme_store.primary);
          }
        }
      } catch (err) {
        console.error('Theme load error:', err);
      } finally {
        setThemeLoaded(true);
      }
    })();
  }, []);

  // Fetch product details
  useEffect(() => {
    (async () => {
      if (!productId) return;
      setLoadingProduct(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', productId)
        .single();
      if (error) {
        console.error('Error fetching product:', error);
        Toast.show({ type: 'error', text1: 'Failed to load product details.' });
      } else {
        setProduct(data);
      }
      setLoadingProduct(false);
    })();
  }, [productId]);

  const normalizeImages = (raw: any) => {
    if (!raw) return [];
    try { return Array.isArray(raw) ? raw : JSON.parse(raw); } catch { return []; }
  };

  const handleQuantityChange = (action: 'increase' | 'decrease') => {
    setQuantity(q => action === 'increase' ? q + 1 : Math.max(1, q - 1));
  };

  const handleAddToCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('cart');
      const cart: any[] = stored ? JSON.parse(stored) : [];
      const idx = cart.findIndex(it => it.id === product.id);
      if (idx >= 0) cart[idx].quantity += quantity;
      else cart.push({ ...product, quantity });
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      Toast.show({ type: 'success', text1: `${product.name} added to cart!`, text2: `Qty: ${quantity}` });
    } catch (err) {
      console.error('Add to cart error:', err);
      Toast.show({ type: 'error', text1: 'Failed to add to cart' });
    }
  };

  if (!themeLoaded || loadingProduct) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found.</Text>
        <Button onPress={() => navigation.goBack()}><Text>Go Back</Text></Button>
        <ToastContainer />
      </View>
    );
  }

  const images = normalizeImages(product.image_data);
  const totalPrice = (product.price * quantity).toFixed(2);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / windowWidth));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#000" /></Button>
        <Text style={styles.headerTitle}>Product Details</Text>
        <Button variant="ghost" size="icon" onPress={() => setIsFavorite(f => !f)}><Feather name="heart" size={24} color={isFavorite ? '#ff0000' : '#000'} /></Button>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* IMAGE CAROUSEL */}
          <View style={styles.imageContainer}>
            {images.length > 1 ? (
              <>
                <ScrollView ref={carouselRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onMomentumScrollEnd}>
                  {images.map((img, i) => (<Image key={i} source={{ uri: img.url }} style={[styles.image, { width: windowWidth }]} />))}
                </ScrollView>
                <View style={styles.dotsContainer}>{images.map((_, i) => (<View key={i} style={[styles.dot, i===activeIndex && { backgroundColor: primaryColor }]} />))}</View>
              </>
            ) : (<Image source={{ uri: images[0]?.url || '' }} style={styles.image} />)}
          </View>

          <View style={styles.productInfo}>
            <View><Text style={styles.productName}>{product.name}</Text><Text style={styles.productCategory}>{product.categories.name}</Text></View>
            {product.stock_quantity>0 && (<Text style={styles.inStockBadge}>In Stock</Text>)}
          </View>

          <Text style={[styles.productPrice, { color: primaryColor }]}>${product.price}</Text>

          <View style={styles.description}><Text style={styles.descriptionTitle}>Description</Text><Text style={styles.descriptionText}>{product.description}</Text></View>

          <View style={styles.actions}>
            <View style={[styles.quantitySelector, { borderColor: primaryColor }]}>
              <Button variant="ghost" size="icon" onPress={() => handleQuantityChange('decrease')} style={[styles.quantityButton, quantity<=1 && { opacity:0.5 }]}><Feather name="minus" size={18} color="#000" /></Button>
              <Text style={styles.quantityText}>{quantity}</Text>
              <Button variant="ghost" size="icon" style={styles.quantityButton} onPress={() => handleQuantityChange('increase')}><Feather name="plus" size={18} color="#000" /></Button>
            </View>
            <Button style={[styles.addToCartButton, { backgroundColor: primaryColor }]} onPress={handleAddToCart}><Text style={styles.addToCartButtonText}>Add to Cart • ${totalPrice}</Text></Button>
          </View>
        </View>
      </ScrollView>

      <NavigationBar />
      <ToastContainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f9f9f9'},
  loadingContainer:{flex:1,justifyContent:'center',alignItems:'center'},
  errorContainer:{flex:1,justifyContent:'center',alignItems:'center',padding:16},
  errorText:{fontSize:16,color:'#ff0000',marginBottom:16},

  header:{backgroundColor:'#fff',paddingVertical:12,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#e5e5e5'},
  headerTitle:{fontSize:20,fontWeight:'bold'},

  scrollContainer:{flexGrow:1,paddingBottom:80},
  content:{padding:16},

  imageContainer:{marginBottom:16,marginHorizontal:-16},
  image:{width:windowWidth,height:250,resizeMode:'contain'},
  dotsContainer:{flexDirection:'row',justifyContent:'center',marginTop:8},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:'#d1d5db',marginHorizontal:4},

  productInfo:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  productName:{fontSize:24,fontWeight:'bold'},
  productCategory:{fontSize:14,color:'#6b7280'},
  inStockBadge:{backgroundColor:'#D1FAE5',color:'#047857',fontSize:12,paddingHorizontal:8,paddingVertical:4,borderRadius:4},

  productPrice:{fontSize:24,fontWeight:'bold',marginBottom:16},

  description:{marginBottom:16},
  descriptionTitle:{fontSize:18,fontWeight:'bold',marginBottom:8},
  descriptionText:{fontSize:14,color:'#374151'},

  actions:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:16,borderTopWidth:1,borderTopColor:'#e5e5e5',paddingTop:16},
  quantitySelector:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:8},
  quantityButton:{height:32,width:32,justifyContent:'center',alignItems:'center'},
  quantityText:{width:32,textAlign:'center',fontSize:16,fontWeight:'bold'},

  addToCartButton:{paddingVertical:12,paddingHorizontal:16,borderRadius:8,alignItems:'center',justifyContent:'center'},
  addToCartButtonText:{color:'#fff',fontWeight:'bold',fontSize:16},
});

export default ProductDetails;
