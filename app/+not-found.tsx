// app/NotFoundScreen.tsx

import React, { useEffect } from "react";
import { Link, Stack, useNavigation } from "expo-router";
import { StyleSheet, ScrollView, TouchableOpacity, Text } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
// ← Pull in your toast helper
import { Toast, useToast } from "../hooks/use-toast";

export default function NotFoundScreen() {
  const navigation = useNavigation<ReturnType<typeof useNavigation>>();
  // ← Mount the toast container
  const { ToastContainer } = useToast();

  useEffect(() => {
    // ← Show an error‐style toast on mount
    Toast.show({
      type: "error",
      text1: "This screen doesn't exist.",
    });
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">This screen doesn't exist.</ThemedText>

          {/* Go Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>

          {/* Example link to home (optional) */}
          <Link href="/" style={styles.link}>
            <Text style={styles.goBackButtonText}>Go to Home</Text>
          </Link>
        </ThemedView>
      </ScrollView>

      {/* ← Toast overlay */}
      <ToastContainer />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  goBackButton: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#16a34a",
    borderRadius: 8,
  },
  goBackButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
