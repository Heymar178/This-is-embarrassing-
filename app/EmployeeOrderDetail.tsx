// app/screens/EmployeeOrderDetail.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { Toast, useToast } from "@/hooks/use-toast";
import EmployeeNavigationBar from "@/components/EmployeeNavigationBar";

type RouteParams = {
  params: { orderNumber: string };
};

type OrderDetail = {
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  pickup_time: string;
  user_profiles: { first_name: string; last_name: string } | null;
  payments: { card_type: string; last_four: string }[] | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    products: { name: string };
  }[];
};

const EmployeeOrderDetail: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, "params">>();
  const navigation = useNavigation();
  const { ToastContainer } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from<OrderDetail>("orders")
      .select(`
        order_number,
        created_at,
        status,
        total_amount,
        pickup_time,
        user_profiles:profiles!orders_user_id_fkey(first_name,last_name),
        payments!orders_payment_id_fkey(card_type,last_four),
        order_items (
          id,
          quantity,
          unit_price,
          products(name)
        )
      `)
      .eq("order_number", route.params.orderNumber)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          Toast.show({ type: "error", text1: "Failed to load order." });
        } else {
          setOrder(data);
        }
      })
      .finally(() => setLoading(false));
  }, [route.params.orderNumber]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Order not found.</Text>
      </View>
    );
  }

  const customerName = order.user_profiles
    ? `${order.user_profiles.first_name} ${order.user_profiles.last_name}`
    : "Unknown";

  const payment = order.payments?.[0] || null;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{order.order_number}</Text>

          {/* Customer Name */}
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>

          {/* Payment Method */}
          {payment && (
            <View style={styles.row}>
              <Text style={styles.label}>Payment:</Text>
              <Text style={styles.value}>
                {payment.card_type} ••••{payment.last_four}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{order.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Placed:</Text>
            <Text style={styles.value}>
              {new Date(order.created_at).toLocaleString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pickup:</Text>
            <Text style={styles.value}>
              {new Date(order.pickup_time).toLocaleString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total:</Text>
            <Text style={styles.value}>${order.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Items Section */}
        <Text style={styles.sectionTitle}>Items</Text>
        {order.order_items.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.products.name}</Text>
            <View style={styles.itemDetails}>
              <Text>{item.quantity} × ${item.unit_price.toFixed(2)}</Text>
              <Text>${(item.unit_price * item.quantity).toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <ToastContainer />
      <EmployeeNavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f4f7" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },

  content: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: { color: "#6b7280", fontSize: 14 },
  value: { fontSize: 14, fontWeight: "500" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemName: { fontSize: 14, fontWeight: "500" },
  itemDetails: {
    flexDirection: "row",
    width: 100,
    justifyContent: "space-between",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  message: { fontSize: 16, color: "#6b7280" },
});

export default EmployeeOrderDetail;
