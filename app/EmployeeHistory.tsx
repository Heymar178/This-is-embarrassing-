// app/EmployeeHistory.tsx

import React, { useState, useEffect } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Button } from "@/components/ui/button";
import { Feather } from "@expo/vector-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from "react-native";
import EmployeeNavigationBar from "@/components/EmployeeNavigationBar";
import { supabase } from "@/supabaseClient";
import { Toast, useToast } from "../hooks/use-toast";

interface OrderHistory {
  orderNumber: string;
  date: string;
  status: string;
  employee: string;
}

type RootStackParamList = {
  EmployeeOrderDetail: { orderNumber: string };
};

const EmployeeHistory: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { ToastContainer } = useToast();

  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchOrderHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            order_number,
            created_at,
            status,
            employee_id,
            profiles!orders_employee_id_fkey (
              first_name,
              last_name
            )
          `
          )
          .order("created_at", { ascending: false })
          .limit(1000);

        if (error) throw error;

        const formatted = (data || []).map((order: any) => ({
          orderNumber: order.order_number,
          date: new Date(order.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: order.status,
          employee: order.profiles
            ? `${order.profiles.first_name} ${order.profiles.last_name}`.trim()
            : "Unknown",
        }));

        setOrderHistory(formatted);
      } catch (err: any) {
        console.error("Error fetching order history:", err);
        Toast.show({
          type: "error",
          text1: "Failed to load order history.",
          text2: err.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderHistory();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "#2563eb";
      case "Ready for Pickup":
        return "#d97706";
      case "Completed":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading order history...</Text>
      </View>
    );
  }

  const filteredOrders = orderHistory.filter((order) =>
    order.orderNumber.includes(searchTerm.trim())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => navigation.navigate("EmployeeView")} // Navigate to EmployeeView
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </Button>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order #"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Table */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
      >
        {filteredOrders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TouchableOpacity
                  key={order.orderNumber}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate("EmployeeOrderDetail", {
                      orderNumber: order.orderNumber,
                    })
                  }
                >
                  <TableRow style={styles.clickableRow}>
                    <TableCell style={styles.tableCellBold}>
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell style={{ color: getStatusColor(order.status) }}>
                      {order.status}
                    </TableCell>
                    <TableCell>{order.employee}</TableCell>
                  </TableRow>
                </TouchableOpacity>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell style={styles.noMatchCell} colSpan={4}>
                  No orders match "{searchTerm}"
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </ScrollView>

      {/* Toast overlay */}
      <ToastContainer />

      {/* Bottom nav */}
      <EmployeeNavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },

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

  searchContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  searchInput: {
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 6,
  },

  scrollView: { flex: 1 },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80, // leave room for nav
  },

  tableCellBold: { fontWeight: "500" },
  clickableRow: { backgroundColor: "#fff" },
  noMatchCell: {
    textAlign: "center",
    padding: 16,
    color: "#6b7280",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
});

export default EmployeeHistory;
