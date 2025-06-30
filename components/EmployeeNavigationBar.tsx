import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import NavigationBar from "@/components/NavigationBar";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message"; // Import Toast for notifications
import { supabase } from "@/supabaseClient"; // Import Supabase client

const EmployeeNavigationBar: React.FC = () => {
  const router = useRouter(); // Use router for navigation

  const handleLogout = async () => {
    try {
      // Sign out using Supabase
      const { error } = await supabase.auth.signOut();

      // Show toast notification based on the result
      Toast.show({
        type: error ? "error" : "success",
        text1: error ? "Failed to sign out." : "Signed out successfully.",
      });

      // Navigate to the Login page if successful
      if (!error) router.push("/Login");
    } catch (err) {
      console.error("Error during logout:", err);
      Toast.show({
        type: "error",
        text1: "An error occurred during logout.",
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Navigate to EmployeeHistory */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/EmployeeHistory")}
      >
        <Feather name="clock" size={24} color="#374151" />
        <Text style={styles.navText}>History</Text>
      </TouchableOpacity>

      {/* Navigate to ScanBarcode */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/ScanBarcode")}
      >
        <Feather name="camera" size={24} color="#374151" />
        <Text style={styles.navText}>Scan</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
        <Feather name="log-out" size={24} color="#374151" />
        <Text style={styles.navText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    color: "#374151",
    marginTop: 4,
  },
});

export default EmployeeNavigationBar;