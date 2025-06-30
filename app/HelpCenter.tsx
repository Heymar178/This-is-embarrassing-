// app/HelpCenterScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Toast, useToast } from "../hooks/use-toast";

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { ToastContainer } = useToast();

  // Theme primary color
  const [primaryColor, setPrimaryColor] = useState<string>("#16a34a");

  // User state
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState<boolean>(true);

  // Form state
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // 1) Load theme primary on mount
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

  // 2) Load current user
  useEffect(() => {
    (async () => {
      setUserLoading(true);
      const { data, error } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setUserLoading(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Toast.show({ type: "error", text1: "Please fill out all fields." });
      return;
    }
    if (!user?.id) {
      Toast.show({ type: "error", text1: "User not found." });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("help_center_requests")
      .insert([{ user_id: user.id, subject, message }]);
    setLoading(false);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to submit request.",
        text2: error.message,
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Request submitted!",
        text2: "We'll get back to you soon.",
      });
      setSubject("");
      setMessage("");
    }
  };

  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          You must be logged in to submit a help request.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        {/* Header row with back button and centered title */}
        <View style={styles.headerRow}>
          <Button
            variant="ghost"
            size="icon"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={22} color={primaryColor} />
          </Button>
          <Text style={[styles.header, { color: primaryColor }]}>
            Help Center
          </Text>
          {/* Spacer to center title */}
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Enter subject"
            editable={!loading}
            returnKeyType="next"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter your message"
            editable={!loading}
            multiline
            placeholderTextColor="#9ca3af"
          />
        </View>

        <Button
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.button, { backgroundColor: primaryColor }]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Submitting..." : "Submit"}
          </Text>
        </Button>
      </View>

      <ToastContainer />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    elevation: 0,
  },
  header: {
    flex: 1,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 5,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#f3f4f6",
    color: "#111827",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    width: "100%",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 16,
    textAlign: "center",
  },
});

export default HelpCenterScreen;
