import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "@/supabaseClient";
import EmployeeNavigationBar from "@/components/EmployeeNavigationBar";
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "../hooks/use-toast";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: "In Progress" | "Ready for Pickup" | "Completed";
  orderNumber: string;
  total: number;
  customerName: string;
  items: OrderItem[];
}

const EmployeeView: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const { ToastContainer } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(`
            id,
            status,
            total_amount,
            order_number,
            created_at,
            user_id,
            profiles!orders_user_id_fkey (first_name, last_name)
          `)
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());

        if (ordersError) {
          console.error("Error fetching orders:", ordersError.message);
          Toast.show({ type: "error", text1: "Failed to fetch orders." });
          return;
        }

        const { data: orderItemsData, error: orderItemsError } =
          await supabase
            .from("order_items")
            .select("id, order_id, quantity, unit_price, products (name)");

        if (orderItemsError) {
          console.error(
            "Error fetching order items:",
            orderItemsError.message
          );
          Toast.show({
            type: "error",
            text1: "Failed to fetch order items.",
          });
          return;
        }

        const formatted = ordersData.map((o: any) => ({
          id: o.id,
          status: o.status,
          orderNumber: o.order_number,
          total: o.total_amount,
          customerName: o.profiles
            ? `${o.profiles.first_name} ${o.profiles.last_name}`.trim()
            : "Customer",
          items: orderItemsData
            .filter((i: any) => i.order_id === o.id)
            .map((i: any) => ({
              id: i.id,
              name: i.products?.name || "Product",
              quantity: i.quantity,
              price: i.unit_price,
            })),
        }));

        setOrders(formatted);
      } catch (error) {
        console.error("Unexpected error:", error);
        Toast.show({
          type: "error",
          text1: "An unexpected error occurred fetching orders.",
        });
      }
    };

    fetchOrders();
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

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, status: newStatus }
            : order
        )
      );
      setIsStatusDialogOpen(false);
      setIsOrderDetailsOpen(false);
      Toast.show({
        type: "success",
        text1: `${selectedOrder.orderNumber} set to "${newStatus}".`,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      Toast.show({ type: "error", text1: "Failed to update order status." });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Scan Barcode (unchanged) */}
        <View style={styles.scanHeader}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate("ScanBarcode")}
          >
            <Text style={styles.scanButtonText}>Scan Barcode</Text>
          </TouchableOpacity>
        </View>

        {/* Orders */}
        <View style={styles.main}>
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                setSelectedOrder(order);
                setIsOrderDetailsOpen(true);
              }}
            >
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderId}>{order.orderNumber}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {order.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.customerName}>
                  {order.customerName}
                </Text>
              </View>

              {/* summary of items */}
              <View style={styles.orderDetails}>
                <Feather name="package" size={16} style={styles.icon} />
                <Text style={styles.itemsText}>
                  {order.items.length} items
                </Text>
              </View>

              {/* View Details under summary */}
              <Button
                onPress={() =>
                  navigation.navigate("EmployeeOrderDetail", {
                    orderNumber: order.orderNumber,
                  })
                }
                style={styles.detailsButton}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
              </Button>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Order Drawer */}
      <Drawer
        visible={isOrderDetailsOpen}
        onClose={() => setIsOrderDetailsOpen(false)}
      >
        <View style={styles.drawerContent}>
          <DrawerHeader>
            <DrawerTitle>{selectedOrder?.orderNumber}</DrawerTitle>
          </DrawerHeader>
          {selectedOrder && (
            <>
              <Text style={styles.customerName}>
                {selectedOrder.customerName}
              </Text>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item) => ( 
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {formatCurrency(item.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(selectedOrder.total)}
                </Text>
              </View>
              <DrawerFooter>
                <Button
                  onPress={() => {
                    setIsOrderDetailsOpen(false);
                    setIsStatusDialogOpen(true);
                  }}
                  style={[styles.updateButton, { backgroundColor: "#16a34a" }]}
                >
                  <Text style={styles.updateButtonText}>
                    Update Status
                  </Text>
                </Button>
              </DrawerFooter>
            </>
          )}
        </View>
      </Drawer>

      {/* Status Dialog */}
      <Dialog
        visible={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        title="Update Order Status"
        content={
          <View style={{ marginTop: 16, gap: 12 }}>
            <Button
              onPress={() => handleStatusChange("In Progress")}
              style={{
                backgroundColor: "#2563eb",
                paddingVertical: 16,
                width: "100%",
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                In Progress
              </Text>
            </Button>
            <Button
              onPress={() => handleStatusChange("Ready for Pickup")}
              style={{
                backgroundColor: "#d97706",
                paddingVertical: 16,
                width: "100%",
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                Ready for Pickup
              </Text>
            </Button>
            <Button
              onPress={() => handleStatusChange("Completed")}
              style={{
                backgroundColor: "#16a34a",
                paddingVertical: 16,
                width: "100%",
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                Completed
              </Text>
            </Button>
          </View>
        }
        actions={
          <Button
            onPress={() => setIsStatusDialogOpen(false)}
            style={{
              borderColor: "#fff",
              borderWidth: 1,
              width: "100%",
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: "transparent",
            }}
          >
            <Text style={{ color: "rgba(0, 0, 0, 0.8)", fontWeight: "600" }}>
              Cancel
            </Text>
          </Button>
        }
      />

      {/* Toast overlay */}
      <ToastContainer />

      {/* Bottom nav */}
      <EmployeeNavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  scrollContainer: { flexGrow: 1, paddingBottom: 80 },
  main: { paddingHorizontal: 16 },

  scanHeader: { alignItems: "center", paddingVertical: 16 },
  scanButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanButtonText: { color: "white", fontWeight: "600" },

  orderCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: "bold" },
  statusBadge: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusBadgeText: { color: "white", fontSize: 12, fontWeight: "600" },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },

  orderDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  icon: { color: "#6b7280" },

  detailsButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  detailsButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  updateButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: "bold" },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#16a34a",
  },

  drawerContent: { padding: 16 },
});

export default EmployeeView;
