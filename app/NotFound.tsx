// app/NotFound.tsx

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import NavigationBar from "@/components/NavigationBar";

// ← use your hook-based Toast
import { Toast, useToast } from "../hooks/use-toast";

const NotFound: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // ← mount the toast container
  const { ToastContainer } = useToast();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      route.name
    );
    // ← show a toast on 404
    Toast.show({
      type: "error",
      text1: `Page "${route.name}" not found`,
    });
  }, [route.name]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>404</Text>
          <Text style={styles.description}>Oops! Page not found</Text>
        </View>
      </ScrollView>

      {/* ← Toast overlay */}
      <ToastContainer />

      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80, // Prevent overlap with the navigation bar
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 16,
  },
});

export default NotFound;
