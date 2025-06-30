// app/Account.tsx

import React, { useState, useEffect } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Separator } from "@/components/ui/separator";
import NavigationBar from "@/components/NavigationBar";
import { supabase } from "@/supabaseClient";
import MenuItem from "@/components/MenuItem";
import { Toast, useToast } from "../hooks/use-toast";  // ← import Toast here
import { useColorScheme } from "@/hooks/useColorScheme"; // ← pull in your primary color hook

type RootStackParamList = {
  Login: undefined;
  EditProfile: undefined;
  Orders: undefined;
  PaymentSettings: undefined;
  NotificationSettings: undefined;
  HelpCenter: undefined;
  OrderDetails: { orderId: string };
  "(tabs)/Orders": undefined;
};

interface OrderType {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

// --------- STATUS COLOR LOGIC ----------
const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return styles.completedStatus;
    case "processing":
    case "ready":
    case "awaitingpickup":
    case "in progress":
      return styles.inProgressStatus;
    case "ready for pickup":
      return styles.readyForPickupStatus;
    case "pending":
      return styles.pendingStatus;
    case "cancelled":
      return styles.cancelledStatus;
    default:
      return styles.pendingStatus;
  }
};

const Account: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<{ first_name: string; last_name: string; email: string } | null>(null);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const { ToastContainer } = useToast();
  const { primary } = useColorScheme(); // ← get your store's primary color

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !authUser) {
          Toast.show({ type: "error", text1: "Failed to fetch user." });
          return;
        }

        const {
          data: userDetails,
          error: userDetailsError,
        } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", authUser.id)
          .single();
        if (userDetailsError || !userDetails) {
          Toast.show({ type: "error", text1: "Failed to fetch profile." });
          return;
        }
        setUser(userDetails);

        const { data: orderHistory, error: orderError } =
          await supabase
            .from("orders")
            .select("id, order_number, total_amount, status, created_at")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false });
        if (orderError) {
          Toast.show({ type: "error", text1: "Failed to fetch orders." });
          return;
        }
        setOrders(orderHistory || []);
      } catch {
        Toast.show({ type: "error", text1: "Unexpected error." });
      }
    };
    fetchUserData();
  }, []);

  const handleOrderClick = (orderId: string) => {
    navigation.navigate("OrderDetails", { orderId });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Text style={styles.profileName}>
          {user ? `${user.first_name} ${user.last_name}` : "Loading..."}
        </Text>
        <Text style={styles.profileEmail}>{user?.email || ""}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <View style={styles.card}>
            {orders.slice(0, 2).map((order) => (
              <Pressable
                key={order.id}
                style={styles.orderItem}
                onPress={() => handleOrderClick(order.id)}
              >
                <View>
                  <Text style={styles.orderId}>{order.order_number}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                  <Text
                    style={[
                      styles.orderStatus,
                      getStatusStyle(order.status),
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>
                  {formatCurrency(order.total_amount)}
                </Text>
              </Pressable>
            ))}
            {orders.length > 2 && (
              <Pressable
                onPress={() => navigation.navigate("(tabs)/Orders")}
                onPressIn={() => setIsHovered(true)}
                onPressOut={() => setIsHovered(false)}
              >
                <Text
                  style={[
                    styles.viewAllButton,
                    { color: primary },
                    isHovered && styles.viewAllButtonHovered,
                    isHovered && { textDecorationColor: primary },
                  ]}
                >
                  View All Orders
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <MenuItem
              icon={<Feather name="user" size={20} color="#000" />}
              label="Edit Profile"
              onPress={() => navigation.navigate("EditProfile")}
            />
            <Separator />
            <MenuItem
              icon={<Feather name="file-text" size={20} color="#000" />}
              label="My Orders"
              onPress={() => navigation.navigate("(tabs)/Orders")}
            />
            <Separator />
            <MenuItem
              icon={<Feather name="credit-card" size={20} color="#000" />}
              label="Payment Methods"
              onPress={() => navigation.navigate("PaymentSettings")}
            />
            <Separator />
            <MenuItem
              icon={<Feather name="bell" size={20} color="#000" />}
              label="Notifications"
              onPress={() => navigation.navigate("NotificationSettings")}
            />
            <Separator />
            <MenuItem
              icon={<Feather name="help-circle" size={20} color="#000" />}
              label="Help Center"
              onPress={() => navigation.navigate("HelpCenter")}
            />
            <Separator />
            <MenuItem
              icon={<Feather name="log-out" size={20} color="#dc2626" />}
              label="Sign Out"
              onPress={async () => {
                const { error } = await supabase.auth.signOut();
                Toast.show({
                  type: error ? "error" : "success",
                  text1: error
                    ? "Failed to sign out."
                    : "Signed out successfully.",
                });
                if (!error) navigation.navigate("Login");
              }}
              danger
            />
          </View>
        </View>
      </ScrollView>

      <ToastContainer />
      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  scrollContainer: { paddingBottom: 80 },
  profileSection: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  profileName: { fontSize: 20, fontWeight: "bold" },
  profileEmail: { color: "#687076", marginTop: 4 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontWeight: "bold", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  orderId: { fontSize: 16, fontWeight: "500", color: "#374151" },
  orderDate: { fontSize: 14, color: "#6b7280", marginVertical: 4 },
  orderStatus: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  completedStatus: { backgroundColor: "#16a34a", color: "#fff" },
  inProgressStatus: { backgroundColor: "#2563eb", color: "#fff" },
  readyForPickupStatus: { backgroundColor: "#d97706", color: "#fff" },
  pendingStatus: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  cancelledStatus: { backgroundColor: "#F3F4F6", color: "#dc2626" },
  orderTotal: { fontSize: 16, fontWeight: "bold", color: "#374151" },
  viewAllButton: {
    marginTop: 16,
    alignSelf: "center",
    width: "50%",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  viewAllButtonHovered: {
    textDecorationLine: "underline",
  },
});

export default Account;
