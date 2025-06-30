// app/SelectLocation.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";
import tinycolor from "tinycolor2";
import { Toast, useToast } from "../hooks/use-toast";

interface Location {
  id: string;
  name: string;
  street_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  store_id: string;
}

export default function SelectLocation() {
  const navigation = useNavigation();
  const { ToastContainer } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [primaryColor, setPrimaryColor] = useState<string>("#16a34a");
  const [loading, setLoading] = useState<boolean>(true);

  const lighterBg = useMemo(
    () => tinycolor(primaryColor).lighten(50).toHexString(),
    [primaryColor]
  );
  const borderTint = useMemo(
    () => tinycolor(primaryColor).lighten(30).toHexString(),
    [primaryColor]
  );

  useEffect(() => {
    (async () => {
      try {
        const storeId = await AsyncStorage.getItem("selected_store_id");
        if (!storeId) throw new Error("No store selected");

        const { data: setting, error: themeErr } = await supabase
          .from("store_settings")
          .select("theme_store")
          .eq("store_id", storeId)
          .single();
        if (!themeErr && setting?.theme_store?.primary) {
          setPrimaryColor(setting.theme_store.primary);
        }

        const { data: locs, error: locErr } = await supabase
          .from("locations")
          .select("*")
          .eq("store_id", storeId);
        if (locErr) throw locErr;
        setLocations(locs || []);
      } catch (err) {
        console.error(err);
        Toast.show({ type: "error", text1: "Failed to load theme or locations" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
      </SafeAreaView>
    );
  }

  const filteredLocations = searchQuery
    ? locations.filter((l) =>
        `${l.name} ${l.street_address} ${l.city}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : locations;

  const handleUseCurrentLocation = async () => {
    const current = { id: "current", name: "Current Location" };
    await AsyncStorage.setItem("selectedLocation", JSON.stringify(current));
    await AsyncStorage.setItem("location_id", "current");
    Toast.show({ type: "success", text1: "Using current location" });
    navigation.goBack();
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocationId) {
      Toast.show({ type: "error", text1: "Select a location first" });
      return;
    }
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return;
    await AsyncStorage.setItem(
      "selectedLocation",
      JSON.stringify({ id: loc.id, name: loc.name })
    );
    await AsyncStorage.setItem("location_id", loc.id);
    Toast.show({ type: "success", text1: "Location confirmed" });
    navigation.navigate("(tabs)/index");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back arrow */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search for a location */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather
            name="search"
            size={18}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search for a location"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Locations List */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Use Current Location */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
          >
            <View style={styles.locationInfo}>
              <Feather
                name="navigation"
                size={20}
                color={primaryColor}
              />
              <Text
                style={[
                  styles.locationText,
                  { color: primaryColor },
                ]}
              >
                Use current location
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={primaryColor} />
          </TouchableOpacity>
        </View>

        {/* Store Locations */}
        {filteredLocations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LOCATIONS</Text>
            {filteredLocations.map((loc) => {
              const isSelected = loc.id === selectedLocationId;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.locationButton,
                    isSelected && {
                      backgroundColor: lighterBg,
                      borderColor: borderTint,
                    },
                  ]}
                  onPress={() => setSelectedLocationId(loc.id)}
                >
                  <Feather
                    name="map-pin"
                    size={20}
                    color={isSelected ? primaryColor : "#9ca3af"}
                  />
                  <View style={styles.locationDetails}>
                    <Text
                      style={[
                        styles.locationName,
                        {
                          color: isSelected
                            ? primaryColor
                            : "#000",
                        },
                      ]}
                    >
                      {loc.name}
                    </Text>
                    <Text style={styles.locationAddress}>
                      {loc.street_address}, {loc.city} {loc.state_province}{" "}
                      {loc.postal_code}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* No Results */}
        {!loading && filteredLocations.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>No locations found</Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <Button
          style={[styles.confirmButton, { backgroundColor: primaryColor }]}
          onPress={handleConfirmLocation}
          disabled={!selectedLocationId}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </Button>
      </View>

      <ToastContainer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  searchInputContainer: { position: "relative" },
  searchIcon: { position: "absolute", top: 12, left: 12 },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
  scrollContainer: { flexGrow: 1, paddingBottom: 80 },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  locationInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  locationDetails: { marginLeft: 12, flex: 1 },
  locationName: { fontSize: 14, fontWeight: "500" },
  locationAddress: { fontSize: 12, color: "#6b7280" },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  confirmButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
