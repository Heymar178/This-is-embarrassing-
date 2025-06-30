// app/EditProfile.tsx

import React, { useState, useEffect } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";
import { Toast, useToast } from "../hooks/use-toast";

type RootStackParamList = {
  Account: undefined;
};

const EditProfile: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { ToastContainer } = useToast();

  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#16a34a");
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // 1) Fetch store theme primary color
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

  // 2) Fetch user profile
  const fetchUserInfo = async () => {
    setLoading(true);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      Toast.show({ type: "error", text1: "Unable to get session." });
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      Toast.show({ type: "error", text1: "Could not load profile." });
    } else {
      setUserData(data);
      setFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email || "",
        phone: formatPhoneNumber(data.phone_number || ""),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length > 6)
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return digits;
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === "phone" ? formatPhoneNumber(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!userData?.id) {
      Toast.show({ type: "error", text1: "User ID missing." });
      return;
    }
    const changes: Record<string, any> = {};
    const fn = formData.firstName.trim();
    const ln = formData.lastName.trim();
    const em = formData.email.trim();
    const ph = formData.phone.replace(/-/g, "");
    if (fn !== userData.first_name) changes.first_name = fn;
    if (ln !== userData.last_name)  changes.last_name  = ln;
    if (em !== userData.email)      changes.email      = em;
    if (ph !== (userData.phone_number || "")) changes.phone_number = ph;

    if (!Object.keys(changes).length) {
      Toast.show({ type: "info", text1: "No changes detected." });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", userData.id);
    setLoading(false);

    if (error) {
      Toast.show({ type: "error", text1: "Update failed." });
    } else {
      Toast.show({ type: "success", text1: "Profile updated!" });
      setUserData({ ...userData, ...changes });
    }
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Button
            variant="ghost"
            size="icon"
            style={styles.backButton}
            onPress={() => navigation.navigate("Account")}
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </Button>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <View style={styles.content}>
          {["firstName","lastName","email","phone"].map((field, idx) => (
            <View key={field} style={styles.inputGroup}>
              <Text style={styles.label}>
                {field === "phone" ? "Phone Number (Optional)" :
                 field === "email" ? "Email Address" :
                 field === "firstName" ? "First Name" : "Last Name"}
              </Text>
              <TextInput
                style={styles.input}
                value={(formData as any)[field]}
                onChangeText={(text) => handleChange(field, text)}
                placeholder={`Enter your ${field}`}
                placeholderTextColor="rgba(0,0,0,0.5)"
                keyboardType={field==="email"?"email-address":field==="phone"?"phone-pad":"default"}
              />
            </View>
          ))}

          <Button
            onPress={handleSubmit}
            style={[styles.saveButton, { backgroundColor: primaryColor }]}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </Button>
        </View>
      </ScrollView>

      <ToastContainer />
      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#f9f9f9" },
  scrollContainer: { flexGrow: 1, paddingBottom: 80 },
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    padding:          16,
    backgroundColor:  "#fff",
    borderBottomWidth:1,
    borderBottomColor:"#e5e5e5",
  },
  backButton:      { marginRight: 8 },
  headerTitle:     { fontSize: 20, fontWeight: "bold" },
  content:         { padding: 16 },
  inputGroup:      { marginBottom: 16 },
  label:           { marginBottom: 8, color: "#687076", fontWeight: "500" },
  input:           {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  saveButton:     {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText:{ color: "#fff", fontSize: 16, fontWeight: "bold" },
  loading:        { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default EditProfile;
