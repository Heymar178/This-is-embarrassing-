// app/ScanBarcode.tsx

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import {
  CameraType,
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "@/supabaseClient";

export default function ScanBarcode() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [isScanning, setIsScanning] = useState(true);

  // Modal state & scanned order info (no customerName)
  const [modalVisible, setModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<{
    id: string;
    orderNumber: string;
    status: string;
  } | null>(null);

  const navigation = useNavigation();

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          We need your permission to use the camera
        </Text>
        <Pressable onPress={requestPermission}>
          <Text style={styles.permissionButton}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const openModalForOrder = (order: {
    id: string;
    orderNumber: string;
    status: string;
  }) => {
    setCurrentOrder(order);
    setModalVisible(true);
  };

  const handleBarcodeScanned = async (
    scanningResult: BarcodeScanningResult
  ) => {
    if (!isScanning || !scanningResult.data) return;
    setIsScanning(false);

    const scannedValue = scanningResult.data;
    console.log("🔍 Scanned raw value:", scannedValue);

    try {
      //
      // STEP 1: Query `orders` for id, order_number, and status
      //
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, status")
        .eq("barcode", scannedValue)
        .single();

      console.log("Order fetch →", orderData, orderError);

      if (orderError || !orderData) {
        Alert.alert("Error", "Barcode not found or fetch failed.", [
          { text: "OK", onPress: () => setIsScanning(true) },
        ]);
        return;
      }

      const { id, order_number: orderNumber, status } = orderData;
      console.log("→ Matched order.id:", id);

      openModalForOrder({ id, orderNumber, status });
    } catch (e) {
      console.warn("🔥 Unexpected error reading barcode →", e);
      Alert.alert("Error", "An unexpected error occurred.", [
        { text: "OK", onPress: () => setIsScanning(true) },
      ]);
    }
  };

  const markCompleted = async () => {
    if (!currentOrder) return;

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "Completed" })
        .eq("id", currentOrder.id);

      if (updateError) {
        Alert.alert("Error", "Failed to mark as completed.", [
          {
            text: "OK",
            onPress: () => {
              setModalVisible(false);
              setIsScanning(true);
            },
          },
        ]);
      } else {
        Alert.alert("Success", "Order status updated to Completed.", [
          {
            text: "OK",
            onPress: () => {
              setModalVisible(false);
              setIsScanning(true);
            },
          },
        ]);
      }
    } catch (e) {
      console.warn("🔥 Error updating status →", e);
      Alert.alert("Error", "An unexpected error occurred.", [
        {
          text: "OK",
          onPress: () => {
            setModalVisible(false);
            setIsScanning(true);
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing={facing}
        mute={false}
        responsiveOrientationWhenOrientationLocked
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code39",
            "code128",
          ],
        }}
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.navigate("EmployeeView")}
        >
          <FontAwesome6 name="arrow-left" size={24} color="white" />
        </Pressable>

        <View style={styles.guideBox}>
          <Text style={styles.guideText}>
            Align the barcode within this box
          </Text>
        </View>

        <View style={styles.shutterContainer}>
          <Pressable onPress={toggleFacing}>
            <FontAwesome6 name="rotate-left" size={32} color="white" />
          </Pressable>
        </View>
      </CameraView>

      {/* Modal for updating status */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setIsScanning(true);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            {currentOrder && (
              <>
                <Text style={styles.modalText}>
                  Order Number: {currentOrder.orderNumber}
                </Text>
                <Text style={styles.modalText}>
                  Current Status: {currentOrder.status}
                </Text>
                {currentOrder.status !== "Completed" ? (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={markCompleted}
                  >
                    <Text style={styles.completeButtonText}>
                      Mark as Completed
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.alreadyCompletedText}>
                    This order is already completed.
                  </Text>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setIsScanning(true);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: 12,
  },
  permissionButton: {
    color: "blue",
    textAlign: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  guideBox: {
    position: "absolute",
    top: "30%",
    left: "10%",
    width: "80%",
    height: "30%",
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  guideText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  shutterContainer: {
    position: "absolute",
    bottom: 44,
    width: "100%",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    padding: 10,
    borderRadius: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  completeButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 12,
    width: "100%",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  alreadyCompletedText: {
    fontSize: 14,
    color: "#6b7280",
    marginVertical: 12,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#6b7280",
    width: "100%",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
