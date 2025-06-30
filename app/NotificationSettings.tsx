// app/NotificationSettings.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import { Toast, useToast } from "../hooks/use-toast";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const NotificationSettings: React.FC = () => {
  const navigation = useNavigation();
  const { ToastContainer } = useToast();

  const [primaryColor, setPrimaryColor] = useState("#16a34a");
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);

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

  // fetch current user's notification settings
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      setLoading(true);
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        navigation.navigate("Login");
        return;
      }
      const userId = sessionData.session.user.id;
      const { data: notificationData, error: notifError } =
        await supabase
          .from("notifications")
          .select("push_notifications, order_updates, promotions")
          .eq("user_id", userId)
          .single();
      if (notifError) {
        Toast.show({ type: "error", text1: "Failed to load settings" });
      } else {
        setSettings([
          {
            id: "push_notifications",
            title: "Push Notifications",
            description: "Receive alerts about orders and deals",
            enabled: notificationData?.push_notifications || false,
          },
          {
            id: "order_updates",
            title: "Order Updates",
            description: "Status changes and delivery updates",
            enabled: notificationData?.order_updates || false,
          },
          {
            id: "promotions",
            title: "Promotions",
            description: "Deals, discounts, and special offers",
            enabled: notificationData?.promotions || false,
          },
        ]);
      }
      setLoading(false);
    };
    fetchNotificationSettings();
  }, [navigation]);

  const handleToggle = async (id: string) => {
    const setting = settings.find((s) => s.id === id);
    if (!setting) return;

    const updatedEnabled = !setting.enabled;
    setSettings((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, enabled: updatedEnabled } : s
      )
    );

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      Toast.show({ type: "error", text1: "User not authenticated." });
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ [id]: updatedEnabled })
      .eq("user_id", userId);

    if (error) {
      Toast.show({
        type: "error",
        text1: `Failed to update ${setting.title}`,
      });
      // revert on error
      setSettings((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, enabled: !updatedEnabled } : s
        )
      );
    } else {
      Toast.show({
        type: "success",
        text1: `${setting.title} ${updatedEnabled ? "enabled" : "disabled"}`,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="icon"
          style={styles.backButton}
          onPress={() => navigation.navigate("Account")}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </Button>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      {/* Settings list */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {settings.map((setting) => (
          <View key={setting.id} style={styles.settingItem}>
            <View>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Text style={styles.settingDescription}>
                {setting.description}
              </Text>
            </View>
            <Switch
              value={setting.enabled}
              onValueChange={() => handleToggle(setting.id)}
              trackColor={{ false: "#d1d5db", true: primaryColor }}
              thumbColor={setting.enabled ? "#ffffff" : "#9ca3af"}
            />
          </View>
        ))}
      </ScrollView>

      <NavigationBar />

      {/* Toast overlay */}
      <ToastContainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: { marginRight: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    color: "#000",
  },
  scrollContainer: { padding: 16 },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  settingDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
});

export default NotificationSettings;
