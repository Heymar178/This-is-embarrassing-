// app/PaymentSettings.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/NavigationBar";
import { supabase } from "@/supabaseClient";
import SHA256 from "crypto-js/sha256";
import { Toast, useToast } from "../hooks/use-toast";

const getCardType = (number: string): string => {
  const cleaned = number.replace(/\D/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (/^5[1-5]/.test(cleaned)) return "MasterCard";
  if (/^3[47]/.test(cleaned)) return "American Express";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  if (/^35(2[89]|[3-8][0-9])/.test(cleaned)) return "JCB";
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return "Diners Club";
  return "Unknown";
};

const PaymentSettings: React.FC = () => {
  const navigation = useNavigation();
  const { ToastContainer } = useToast();

  const [primaryColor, setPrimaryColor] = useState("#16a34a");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    firstName: "",
    lastName: "",
  });

  // 1) Load primary color from theme_store
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

  const fetchPayments = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("No active user");

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error("Error fetching payments:", err);
      Toast.show({ type: "error", text1: "Failed to load saved cards." });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleInputChange = (name: string, value: string) => {
    let sanitized = value;

    if (name === "cardNumber") {
      const digits = value.replace(/\D/g, "").slice(0, 16);
      sanitized = digits.replace(/(.{4})/g, "$1 ").trim();
    }

    if (name === "expirationDate") {
      sanitized = value.replace(/\D/g, "");
      if (sanitized.length > 2) {
        sanitized = sanitized.slice(0, 2) + "/" + sanitized.slice(2, 4);
      }
      const [month] = sanitized.split("/");
      if (month && Number(month) > 12) {
        sanitized = "12" + sanitized.slice(2);
      }
    }

    if (name === "cvv") {
      sanitized = value.replace(/\D/g, "").slice(0, 4);
    }

    setCardDetails((prev) => ({ ...prev, [name]: sanitized }));
  };

  const handleSaveChanges = async () => {
    try {
      const expMatch = cardDetails.expirationDate.match(
        /^(0[1-9]|1[0-2])\/\d{2}$/
      );
      if (!expMatch) {
        Toast.show({ type: "error", text1: "Invalid expiration date." });
        return;
      }
      const [expMonth, expYear] = cardDetails.expirationDate
        .split("/")
        .map(Number);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;
      if (
        expYear < currentYear ||
        (expYear === currentYear && expMonth < currentMonth)
      ) {
        Toast.show({ type: "error", text1: "Card is expired." });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Toast.show({ type: "error", text1: "User not logged in." });
        return;
      }

      const rawNumber = cardDetails.cardNumber.replace(/\s/g, "");
      const cardType = getCardType(rawNumber);
      const cardHash = SHA256(rawNumber).toString();
      const last4 = rawNumber.slice(-4);

      const { error } = await supabase.from("payments").insert([
        {
          user_id: user.id,
          card_type: cardType,
          card_number: cardHash,
          last_four: last4,
          expiry_date: cardDetails.expirationDate,
          card_holder_name: `${cardDetails.firstName} ${cardDetails.lastName}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_default: false,
        },
      ]);
      if (error) throw error;

      Toast.show({ type: "success", text1: "Card saved successfully!" });
      setCardDetails({
        cardNumber: "",
        expirationDate: "",
        cvv: "",
        firstName: "",
        lastName: "",
      });
      fetchPayments();
    } catch (err) {
      console.error("Error saving card:", err);
      Toast.show({ type: "error", text1: "Failed to save card." });
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
      Toast.show({ type: "success", text1: "Card deleted." });
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting card:", err);
      Toast.show({ type: "error", text1: "Error deleting card." });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loading}>Loading saved cards...</Text>
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
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </Button>
        <Text style={styles.headerTitle}>Payment Settings</Text>
      </View>

      {/* Form */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Card Number"
            placeholderTextColor="rgba(0,0,0,0.5)"
            value={cardDetails.cardNumber}
            onChangeText={(t) => handleInputChange("cardNumber", t)}
            keyboardType="numeric"
            maxLength={19}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="MM/YY"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={cardDetails.expirationDate}
              onChangeText={(t) => handleInputChange("expirationDate", t)}
              keyboardType="numeric"
              maxLength={5}
            />
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="CVV"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={cardDetails.cvv}
              onChangeText={(t) => handleInputChange("cvv", t)}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="rgba(0,0,0,0.5)"
            value={cardDetails.firstName}
            onChangeText={(t) => handleInputChange("firstName", t)}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="rgba(0,0,0,0.5)"
            value={cardDetails.lastName}
            onChangeText={(t) => handleInputChange("lastName", t)}
          />

          <Button
            style={[styles.saveButton, { backgroundColor: primaryColor }]}
            onPress={handleSaveChanges}
          >
            <Text style={styles.saveButtonText}>Save Card</Text>
          </Button>
        </View>

        {/* Saved cards list */}
        {payments.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Cards</Text>
            {payments.map((card) => (
              <View
                key={card.id}
                style={[
                  styles.savedCard,
                  { backgroundColor: `${primaryColor}22` },
                ]}
              >
                <View style={styles.savedCardInfo}>
                  <View style={styles.cardType}>
                    <Text style={styles.cardTypeText}>
                      {card.card_type?.toUpperCase() || "UNKNOWN"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardLastFour}>
                      •••• •••• •••• {card.last_four}
                    </Text>
                    <Text style={styles.cardExpiration}>
                      Expires {card.expiry_date}
                    </Text>
                    <Text style={styles.cardholderName}>
                      {card.card_holder_name}
                    </Text>
                  </View>
                </View>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => handleDeleteCard(card.id)}
                >
                  <Feather name="trash-2" size={18} />
                </Button>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noCardsText}>No cards saved yet.</Text>
        )}
      </ScrollView>

      <NavigationBar />
      <ToastContainer />
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
  scrollContainer: { flexGrow: 1, padding: 16, paddingBottom: 80 },
  section: { marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  flex: { flex: 1, marginRight: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  savedCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  savedCardInfo: { flexDirection: "row", alignItems: "center" },
  cardType: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  cardTypeText: { fontSize: 10, fontWeight: "bold", color: "#fff" },
  cardLastFour: { fontSize: 14, fontWeight: "500" },
  cardExpiration: { fontSize: 12, color: "#6b7280" },
  cardholderName: { fontSize: 12, color: "#374151" },
  noCardsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: { fontSize: 16, color: "#6b7280", marginTop: 12 },
});

export default PaymentSettings;
