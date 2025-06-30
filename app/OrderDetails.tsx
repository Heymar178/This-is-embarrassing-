// app/OrderDetails.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import NavigationBar from "@/components/NavigationBar";
import { supabase } from "@/supabaseClient";
import { Toast, useToast } from "../hooks/use-toast";
import QRCode from "react-native-qrcode-svg";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetailsType {
  orderNumber: string;
  status: string;
  deliveryDate: string;
  deliveryTime: string;
  pickupTime: string;
  parkingNotes: string;
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  total: number;
  cardLast4: string;
  barcode: string | null;
  locationName: string;
  locationAddress: string;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case "Completed":
      return styles.completedStatus;
    case "Processing":
    case "Ready":
    case "AwaitingPickup":
    case "In Progress":
      return styles.inProgressStatus;
    case "Ready for Pickup":
      return styles.readyForPickupStatus;
    case "Pending":
      return styles.cancelledStatus;
    default:
      return styles.cancelledStatus;
  }
};

const OrderDetails: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };
  const { ToastContainer } = useToast();

  const [primaryColor, setPrimaryColor] = useState("#16a34a");
  const [orderData, setOrderData] = useState<OrderDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  // fetch theme primary once
  useEffect(() => {
    (async () => {
      const storeId = await AsyncStorage.getItem("selected_store_id");
      if (!storeId) return;
      const { data, error } = await supabase
        .from("store_settings")
        .select("theme_store")
        .eq("store_id", storeId)
        .single();
      if (!error && data?.theme_store?.primary) {
        setPrimaryColor(data.theme_store.primary);
      }
    })();
  }, []);

  // fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true);
      try {
        const { data: order, error } = await supabase
          .from("orders")
          .select(
            `
            order_number,
            status,
            created_at,
            pickup_time,
            total_amount,
            service_fee,
            tax,
            barcode,
            locations (
              name,
              street_address,
              city,
              state_province,
              postal_code
            ),
            order_items (
              product_id,
              quantity,
              unit_price,
              products ( name )
            ),
            payments ( last_four )
          `
          )
          .eq("id", orderId)
          .single();

        if (error || !order) throw error || new Error("Order not found");

        const { street_address, city, state_province, postal_code } =
          order.locations || {};
        const formattedAddress = [
          street_address,
          city,
          state_province,
          postal_code,
        ]
          .filter((p) => p)
          .join(", ");

        setOrderData({
          orderNumber: order.order_number,
          status: order.status,
          deliveryDate: new Date(order.created_at).toLocaleDateString(),
          deliveryTime: new Date(order.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          pickupTime: order.pickup_time
            ? `${new Date(order.pickup_time).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}, ${new Date(order.pickup_time).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              })} - ${new Date(
                new Date(order.pickup_time).getTime() + 3600000
              ).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              })}`
            : "N/A",
          parkingNotes: "N/A",
          items: order.order_items.map((it: any) => ({
            id: it.product_id,
            name: it.products?.name || "Product",
            quantity: it.quantity,
            price: it.unit_price,
          })),
          subtotal:
            (order.total_amount || 0) -
            (order.service_fee || 0) -
            (order.tax || 0),
          serviceFee: order.service_fee || 0,
          tax: order.tax || 0,
          total: order.total_amount || 0,
          cardLast4: order.payments?.last_four || "N/A",
          barcode: order.barcode || null,
          locationName: order.locations?.name || "Unknown Location",
          locationAddress: formattedAddress || "No address available",
        });
      } catch (err) {
        console.error("Error fetching order details:", err);
        Toast.show({ type: "error", text1: "Failed to load order details." });
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [orderId]);

  const reorderItems = async () => {
    if (!orderData) return;
    try {
      const stored = await AsyncStorage.getItem("cart");
      const cart: any[] = stored ? JSON.parse(stored) : [];
      orderData.items.forEach((item) => {
        const idx = cart.findIndex((c) => c.id === item.id);
        if (idx >= 0) {
          cart[idx].quantity += item.quantity;
        } else {
          cart.push({ ...item });
        }
      });
      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      Toast.show({ type: "success", text1: "Items added to cart" });
    } catch (err) {
      console.error("Reorder failed:", err);
      Toast.show({ type: "error", text1: "Reorder failed" });
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!orderData) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Failed to load order details.</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="icon"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#000" />{" "}
          {/* Changed color to black */}
        </Button>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Order summary */}
        <View style={styles.card}>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderId}>{orderData.orderNumber}</Text>
            <Text
              style={[styles.orderStatus, getStatusStyle(orderData.status)]}
            >
              {orderData.status}
            </Text>
          </View>
          <View style={styles.orderMetaRow}>
            <Text style={styles.orderDate}>
              Order placed on {orderData.deliveryDate} at{" "}
              {orderData.deliveryTime}
            </Text>
            <Text style={styles.orderDate}>Pickup: {orderData.pickupTime}</Text>
          </View>

          <View style={styles.locationSection}>
            <Text style={styles.locationLabel}>Location:</Text>
            <Text style={styles.locationName}>{orderData.locationName}</Text>
            <Text style={styles.locationAddress}>
              {orderData.locationAddress}
            </Text>
          </View>

          <Text style={styles.parkingNotesTitle}>Parking Notes</Text>
          <Text style={styles.parkingNotes}>{orderData.parkingNotes}</Text>

          {orderData.barcode ? (
            <View style={styles.qrContainer}>
              <QRCode value={orderData.barcode} size={200} />
              <Text style={styles.showText}>
                Show at store to confirm order
              </Text>
            </View>
          ) : (
            <Text style={styles.barcodeText}>No QR code available</Text>
          )}
        </View>

        {/* Items list */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {orderData.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
          ))}
          <Separator style={styles.separator} />
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ${orderData.subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Text style={styles.summaryValue}>
                ${orderData.serviceFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>
                ${orderData.tax.toFixed(2)}
              </Text>
            </View>
            <Separator style={styles.separator} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalValue, { color: primaryColor }]}>
                ${orderData.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.cardNumber}>
            •••• •••• •••• {orderData.cardLast4}
          </Text>
        </View>

        {/* Reorder button */}
        <Button
          style={[styles.reorderButton, { backgroundColor: primaryColor }]}
          onPress={reorderItems}
        >
          <Text style={styles.reorderButtonText}>Reorder Items</Text>
        </Button>
      </ScrollView>

      <NavigationBar />
      <ToastContainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    marginBottom: 16,
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: { marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  scrollContainer: { flexGrow: 1, paddingBottom: 80 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  orderInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  orderMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 2,
  },
  orderId: { fontSize: 16, fontWeight: "500", color: "#374151" },
  orderDate: { fontSize: 14, color: "#6b7280" },
  locationSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  locationName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  locationAddress: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  parkingNotesTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
    color: "#374151",
  },
  parkingNotes: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    overflow: "hidden",
    minWidth: 50,
    marginLeft: 12,
    marginTop: -2,
  },
  completedStatus: {
    backgroundColor: "#16a34a",
    color: "#fff",
  },
  inProgressStatus: {
    backgroundColor: "#2563eb",
    color: "#fff",
  },
  readyForPickupStatus: {
    backgroundColor: "#d97706",
    color: "#fff",
  },
  cancelledStatus: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  qrContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  showText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  barcodeText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "500" },
  itemQuantity: { fontSize: 12, color: "#6b7280" },
  itemPrice: { fontSize: 14, fontWeight: "bold" },
  separator: { marginVertical: 12 },
  summary: { marginTop: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, color: "#6b7280" },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  totalLabel: { fontSize: 16, fontWeight: "bold" },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
  },
  cardNumber: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 16,
  },
  reorderButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  reorderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default OrderDetails;
