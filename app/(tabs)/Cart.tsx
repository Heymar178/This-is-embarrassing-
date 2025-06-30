// app/Cart.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import CartItem, { CartItemType } from "@/components/CartItem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import uuid from "react-native-uuid";
import { Toast, useToast } from "@/hooks/use-toast";

interface PaymentType {
  id: string;
  card_type: string;
  last_four: string;
  expiry_date: string;
  card_holder_name: string;
  is_default: boolean;
}

const Cart: React.FC = () => {
  const navigation = useNavigation();
  const { ToastContainer } = useToast();

  // Theme primary color pulled from your DB
  const [primary, setPrimary] = useState<string>("#16a34a");

  // ... existing state ...
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [pickupTime, setPickupTime] = useState<string>("");

  const [payments, setPayments] = useState<PaymentType[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const tax        = +(subtotal * 0.08).toFixed(2);
  const serviceFee = 2.0;
  const total      = +(subtotal + tax + serviceFee).toFixed(2);

  // Fetch your store's theme.primary once on mount
  useEffect(() => {
    (async () => {
      const storeId = await AsyncStorage.getItem("selected_store_id");
      if (!storeId) return;
      const { data, error } = await supabase
        .from("store_settings")
        .select("theme_store")
        .eq("store_id", storeId)
        .single();
      if (!error && data.theme_store?.primary) {
        setPrimary(data.theme_store.primary);
      }
    })();
  }, []);

  // 1) Clear cart if location changed
  useEffect(() => {
    (async () => {
      try {
        const sel = await AsyncStorage.getItem("selectedLocation");
        const currentLocObj = sel ? JSON.parse(sel) : null;
        const currentLocId = currentLocObj?.id ?? null;
        const savedCartLocId = await AsyncStorage.getItem("cartLocationId");
        const savedCartRaw = await AsyncStorage.getItem("cart");
        const savedCartArray: CartItemType[] = savedCartRaw
          ? JSON.parse(savedCartRaw)
          : [];

        if (
          savedCartArray.length > 0 &&
          savedCartLocId &&
          savedCartLocId !== currentLocId
        ) {
          setCart([]);
          await AsyncStorage.removeItem("cart");
          Toast.show({ type: "info", text1: "Location changed – cart was cleared." });
        }
      } catch (err) {
        console.error("Error checking location change:", err);
      }
    })();
  }, []);

  // 2) Load cart from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("cart");
        if (saved) setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading cart:", e);
      }
    })();
  }, []);

  // 3) Recalculate subtotal
  useEffect(() => {
    setSubtotal(cart.reduce((sum, i) => sum + i.price * i.quantity, 0));
  }, [cart]);

  // 4) Load pickup time
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("selectedPickupTime");
      if (t) setPickupTime(t);
    })();
  }, []);

  // 5) Load payment methods
  useEffect(() => {
    (async () => {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!authErr && user) {
        const { data, error } = await supabase
          .from<PaymentType>("payments")
          .select("id,card_type,last_four,expiry_date,card_holder_name,is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });

        if (!error && data) {
          setPayments(data);
          const def = data.find((p) => p.is_default) ?? data[0];
          setSelectedPaymentId(def?.id ?? null);
        }
      }
      setLoadingPayments(false);
    })();
  }, []);

  // Format pickup time
  const formattedPickupTime = (() => {
    if (!pickupTime) return "No pickup time selected";
    const start = new Date(pickupTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return `${start.toLocaleString(undefined, {
      weekday: "long",
      month:   "long",
      day:     "numeric",
      hour:    "numeric",
      minute:  "numeric",
      hour12:  true,
    }).replace(" at ", ", ")} - ${end.toLocaleTimeString(undefined, {
      hour:   "numeric",
      minute: "numeric",
      hour12: true,
    })}`;
  })();

  // Persist cart helper
  const persist = async (newCart: CartItemType[]) => {
    setCart(newCart);
    await AsyncStorage.setItem("cart", JSON.stringify(newCart));

    const sel = await AsyncStorage.getItem("selectedLocation");
    const currentLocObj = sel ? JSON.parse(sel) : null;
    const currentLocId = currentLocObj?.id ?? null;

    if (newCart.length > 0 && currentLocId) {
      await AsyncStorage.setItem("cartLocationId", currentLocId);
    } else {
      await AsyncStorage.removeItem("cartLocationId");
    }
  };

  // Handlers
  const handleIncrement = (id: string) =>
    persist(cart.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i));

  const handleDecrement = (id: string) =>
    persist(cart.map(i => i.id === id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i));

  const handleDelete = async (id: string) => {
    const updated = cart.filter(i => i.id !== id);
    await persist(updated);
    Toast.show({ type: "success", text1: "Item removed from cart" });
  };

  const handleClearCart = async () => {
    setCart([]);
    await AsyncStorage.removeItem("cart");
    await AsyncStorage.removeItem("cartLocationId");
    Toast.show({ type: "success", text1: "Cart cleared" });
  };

  // Place order logic
  const placeOrder = async () => {
    if (!selectedPaymentId) {
      Toast.show({ type: "error", text1: "Please select a payment method." });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const sel = await AsyncStorage.getItem("selectedLocation");
    const locationObj = sel ? JSON.parse(sel) : null;
    const locationId = locationObj?.id ?? null;

    const subtotalCalc = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const taxCalc      = +(subtotalCalc * 0.08).toFixed(2);
    const serviceCalc  = 2.0;
    const totalCalc    = +(subtotalCalc + taxCalc + serviceCalc).toFixed(2);
    const barcode      = uuid.v4() as string;

    const { data: od, error: oe } = await supabase
      .from("orders")
      .insert([{
        user_id:      user!.id,
        location_id:  locationId,
        total_amount: totalCalc,
        service_fee:  serviceCalc,
        tax:          taxCalc,
        status:       "Pending",
        barcode,
        payment_id:   selectedPaymentId,
        created_at:   new Date().toISOString(),
        pickup_time:  pickupTime,
      }])
      .select("id");

    if (oe || !od?.length) {
      console.error("Order creation error:", oe);
      Toast.show({ type: "error", text1: "Failed to create order." });
      return;
    }
    const orderId = od[0].id;

    // Verify product availability
    const cartIds = cart.map(i => i.id);
    const { data: validProducts } = await supabase
      .from("products")
      .select("id")
      .in("id", cartIds);

    if ((validProducts?.length ?? 0) !== cart.length) {
      Toast.show({ type: "error", text1: "Some items are no longer available." });
      return;
    }

    // Insert order items
    const items = cart.map(i => ({
      order_id:   orderId,
      product_id: i.id,
      quantity:   i.quantity,
      unit_price: i.price,
    }));
    const { error: oie } = await supabase.from("order_items").insert(items);
    if (oie) {
      console.error("Items insert error:", oie);
      Toast.show({ type: "error", text1: "Failed to insert items." });
      return;
    }

    // Success: clear cart & navigate
    setCart([]);
    await AsyncStorage.removeItem("cart");
    await AsyncStorage.removeItem("cartLocationId");
    Toast.show({ type: "success", text1: "Order placed successfully!" });
    navigation.navigate("OrderDetails", { orderId });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Toast.show({ type: "error", text1: "Your cart is empty." });
      return;
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      Toast.show({ type: "error", text1: "You must be logged in to place an order." });
      return;
    }
    const sel = await AsyncStorage.getItem("selectedLocation");
    if (!sel) {
      Toast.show({ type: "error", text1: "Please select a location before placing an order." });
      return;
    }
    await placeOrder();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({cart.length})</Text>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" onPress={handleClearCart} style={styles.clearButton}>
            Clear
          </Button>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {cart.length > 0 ? (
          <>
            {/* Pickup Time */}
            <View style={styles.pickupInfo}>
              <TouchableOpacity onPress={() => navigation.navigate("PickUpTime")}>
                <Text style={[styles.pickupText, { color: primary }]}>
                  Pickup: {formattedPickupTime}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            <View style={styles.cartItems}>
              {cart.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onDelete={handleDelete}
                />
              ))}
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {loadingPayments ? (
                <ActivityIndicator />
              ) : payments.length > 0 ? (
                payments.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.paymentOption,
                      selectedPaymentId === p.id && {
                        borderColor: primary,
                        backgroundColor: `${primary}22`,
                      },
                    ]}
                    onPress={() => setSelectedPaymentId(p.id)}
                  >
                    <Text>
                      {p.card_type} ••••{p.last_four} (Exp {p.expiry_date})
                      {p.is_default ? "  ·  Default" : ""}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Button onPress={() => navigation.navigate("PaymentSettings")}>
                  Add Payment Method
                </Button>
              )}
            </View>

            {/* Order Summary */}
            <View style={styles.orderSummary}>
              <Text style={styles.orderSummaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Fee</Text>
                <Text style={styles.summaryValue}>${serviceFee.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>Total</Text>
                <Text style={styles.summaryValueBold}>${total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Checkout */}
            <View style={styles.footer}>
              <Button
                style={[styles.checkoutButton, { backgroundColor: primary }]}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutText}>Proceed to Checkout</Text>
              </Button>
            </View>
          </>
        ) : (
          <View style={styles.emptyCart}>
            <View style={styles.emptyCartIcon}>
              <Feather name="shopping-cart" size={32} color="#9ca3af" />
            </View>
            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCartSubtitle}>
              Looks like you haven't added any products yet.
            </Text>
            <Button onPress={() => navigation.navigate("(tabs)/index")}>
              Start Shopping
            </Button>
          </View>
        )}
      </ScrollView>

      <ToastContainer />
      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, paddingBottom: 80 },
  header:          {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    padding:           16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton:      { marginRight: 8 },
  headerTitle:     { fontSize: 18, fontWeight: "bold" },
  clearButton:     { color: "red" },
  pickupInfo:      { padding: 16, backgroundColor: "#f9f9f9" },
  pickupText:      { fontSize: 16 /* color now dynamic */ },
  cartItems:       { padding: 16 },
  paymentSection:  { padding: 16 },
  sectionTitle:    { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  paymentOption:   {
    padding:      12,
    borderWidth:  1,
    borderColor:  "#ddd",
    borderRadius: 6,
    marginBottom: 8,
  },
  orderSummary:    {
    padding:          16,
    backgroundColor:  "#f9f9f9",
    borderTopWidth:   1,
    borderTopColor:   "#e5e5e5",
  },
  orderSummaryTitle:{ fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  summaryRow:      {
    flexDirection:  "row",
    justifyContent: "space-between",
    marginBottom:   8,
  },
  summaryLabel:    { fontSize: 14, color: "#6b7280" },
  summaryValue:    { fontSize: 14, color: "#374151" },
  summaryLabelBold:{ fontSize: 16, fontWeight: "bold" },
  summaryValueBold:{ fontSize: 16, fontWeight: "bold" },
  footer:          {
    padding:         16,
    borderTopWidth:  1,
    borderTopColor:  "#e5e5e5",
  },
  checkoutButton:  {
    paddingVertical:12,
    borderRadius:   8,
    alignItems:     "center",
  },
  checkoutText:    { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyCart:       {
    flex:           1,
    justifyContent: "center",
    alignItems:     "center",
    padding:        16,
  },
  emptyCartIcon:   { marginBottom: 16 },
  emptyCartTitle:  { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptyCartSubtitle:{
    fontSize: 14,
    color:    "#6b7280",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default Cart;
