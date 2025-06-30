// app/Orders.tsx

import React, { useState, useEffect } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import useCustomerInfo, { OrderType } from "@/hooks/useCustomerInfo";
import { Toast, useToast } from "@/hooks/use-toast";

type RootStackParamList = {
  OrderDetails: { orderId: string };
  account: undefined;
};

const Orders: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { orders, loading } = useCustomerInfo();
  const { ToastContainer } = useToast();

  const [activeTab, setActiveTab] = useState<"all" | "active" | "past">("all");
  const [primaryColor, setPrimaryColor] = useState("#16a34a");

  // load primary color from theme_store
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

  const filterOrders = (tab: "all" | "active" | "past") => {
    if (tab === "all") return orders;
    if (tab === "active")
      return orders.filter((o) =>
        ["Ready", "In Progress", "Ready for Pickup", "Pending"].includes(o.status)
      );
    return orders.filter((o) =>
      ["Failed", "Completed", "Refunded", "Cancelled"].includes(o.status)
    );
  };

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

  const handleOrderClick = (orderId: string) => {
    navigation.navigate("OrderDetails", { orderId });
  };

  const renderOrders = (list: OrderType[]) => {
    if (list.length === 0) {
      return <Text style={styles.noOrdersText}>No Orders Available</Text>;
    }

    return list.map((order) => {
      const itemCount = order.order_items.reduce(
        (sum, li) => sum + (li.quantity || 0),
        0
      );
      const total = Number(order.total_amount || 0).toFixed(2);

      return (
        <TouchableOpacity
          key={order.id}
          style={styles.orderCard}
          onPress={() => handleOrderClick(order.id)}
          accessibilityLabel={`Order #${order.order_number}`}
        >
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>{order.order_number}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.orderStatus, getStatusStyle(order.status)]}>
              {order.status}
            </Text>
          </View>

          <View style={styles.orderDetails}>
            <Feather
              name="shopping-bag"
              size={20}
              color="#6b7280"
              style={styles.orderIcon}
            />
            <Text style={styles.orderItems}>
              {itemCount} {itemCount === 1 ? "Item" : "Items"}
            </Text>
            <Text style={styles.orderTotal}>${total}</Text>
          </View>

          <Button
            variant="outline"
            style={styles.viewDetailsButton}
            onPress={() => handleOrderClick(order.id)}
          >
            View Details
          </Button>
        </TouchableOpacity>
      );
    });
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={primaryColor}
        style={styles.loading}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="icon"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </Button>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <View style={styles.tabs}>
        {(["all", "active", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && {
                backgroundColor: "#fff",
                borderBottomWidth: 2,
                borderBottomColor: primaryColor,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && { color: primaryColor, fontWeight: "bold" },
              ]}
            >
              {tab === "all"
                ? "All Orders"
                : tab === "active"
                ? "Active"
                : "Past Orders"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderOrders(filterOrders(activeTab))}
      </ScrollView>

      <ToastContainer />
      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
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

  tabs: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabText: { fontSize: 14, color: "#6b7280" },

  content: { flexGrow: 1, padding: 16, paddingBottom: 70 },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderId: { fontSize: 16, fontWeight: "500" },
  orderDate: { fontSize: 14, color: "#6b7280" },
  orderStatus: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
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
  orderDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  orderIcon: { marginRight: 8 },
  orderItems: { fontSize: 14, color: "#6b7280" },
  orderTotal: { fontSize: 16, fontWeight: "bold", marginLeft: "auto" },
  viewDetailsButton: {
    width: "100%",
    borderColor: "#16a34a",
    color: "#16a34a",
  },
  noOrdersText: {
    textAlign: "center",
    fontSize: 16,
    color: "#6b7280",
    marginTop: 20,
  },
});

export default Orders;
