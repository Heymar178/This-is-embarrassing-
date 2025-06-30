// app/Login.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Logo from "@/components/Logo";
import SocialButton from "@/components/SocialButton";
import { supabase } from "@/supabaseClient";
import { signInWithGoogle } from "@/auth/google";
import { signInWithApple } from "@/auth/apple";
import { Toast, useToast } from "../hooks/use-toast";

const Login: React.FC = () => {
  // —— state & hooks up front ——
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [loading, setLoading]             = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [themePrimary, setThemePrimary]   = useState<string | null>(null);

  const navigation = useNavigation<any>();
  const { ToastContainer } = useToast();

  // Load store-specific primary color
  useEffect(() => {
    (async () => {
      const storeId = await AsyncStorage.getItem("selected_store_id");
      if (!storeId) {
        setThemePrimary("#16a34a");
        return;
      }
      const { data, error } = await supabase
        .from("store_settings")
        .select("theme_store")
        .eq("store_id", storeId)
        .single();
      if (error) {
        console.error("Error loading theme:", error);
        setThemePrimary("#16a34a");
      } else {
        setThemePrimary(data?.theme_store?.primary ?? "#16a34a");
      }
    })();
  }, []);

  // Listen for Supabase auth changes (email/pass or OAuth)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (!error && profile) {
          const dest = profile.role === "employee"
            ? "EmployeeView"
            : "SelectLocation";
          navigation.reset({ index: 0, routes: [{ name: dest }] });
        }
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Early return while loading theme
  if (themePrimary === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  // Email/password sign-in
  const handleSubmit = async () => {
    if (!email || !password) {
      Toast.show({ type: "error", text1: "Please fill in all fields" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will navigate
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message || "Failed to log in" });
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChange will navigate once the flow completes
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message });
    } finally {
      setSocialLoading(false);
    }
  };

  // Apple OAuth
  const handleAppleLogin = async () => {
    setSocialLoading(true);
    try {
      await signInWithApple();
      // onAuthStateChange will navigate once the flow completes
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.message });
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.navigate("SelectStore")}
      >
        <Ionicons name="close" size={24} color="#000" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.innerContainer}>
          <Logo />

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <SocialButton
              provider="google"
              onPress={handleGoogleLogin}
              loading={socialLoading}
              style={styles.fullWidth}
            />
            <SocialButton
              provider="apple"
              onPress={handleAppleLogin}
              loading={socialLoading}
              style={[styles.fullWidth, { marginTop: 12 }]}
            />
          </View>

          {/* Separator */}
          <View style={[styles.separatorContainer, styles.fullWidth]}>
            <View style={styles.separator} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.separator} />
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            <View style={[styles.inputGroup, styles.fullWidth]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.inputGroup, styles.fullWidth]}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            <TouchableOpacity
              style={[
                styles.submitButton,
                styles.fullWidth,
                { backgroundColor: themePrimary },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
              <Text style={[styles.linkText, { color: themePrimary }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            <View style={[styles.activeDot, { backgroundColor: themePrimary }]} />
            <View style={styles.inactiveDot} />
          </View>
        </View>
      </ScrollView>

      <ToastContainer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  closeButton: { position: "absolute", top: 16, left: 16, zIndex: 10, padding: 8 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingBottom: 80 },
  innerContainer: { alignItems: "center" },
  fullWidth: { width: 240, alignSelf: "center" },
  signInText: { color: "#fff", fontWeight: "bold" },
  socialButtons: { alignItems: "center", marginTop: 32, marginBottom: 12 },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  separator: { flex: 1, height: 1.25, backgroundColor: "#e5e5e5" },
  separatorText: { marginHorizontal: 8, fontSize: 14, color: "#6b7280" },
  form: { alignItems: "center" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  submitButton: { paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 4 },
  footerTextContainer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 14, color: "#6b7280" },
  linkText: { fontWeight: "bold" },
  pagination: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  activeDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  inactiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e5e5e5", marginHorizontal: 4 },
});

export default Login;
