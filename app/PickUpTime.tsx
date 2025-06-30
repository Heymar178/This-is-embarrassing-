// app/PickUpTime.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import Toast from "react-native-toast-message";
import { supabase } from "@/supabaseClient";

// Types
type Slot = { time: string; capacity: number | null };

type DayOption = { label: string; dateText: string; date: Date; dayOfWeek: number };

export default function PickUpTime() {
  const navigation = useNavigation();
  const [primaryColor, setPrimaryColor] = useState<string>("#16a34a");

  // Load store primary color
  useEffect(() => {
    (async () => {
      try {
        const storeId = await AsyncStorage.getItem("selected_store_id");
        if (storeId) {
          const { data, error } = await supabase
            .from("store_settings")
            .select("theme_store")
            .eq("store_id", storeId)
            .single();
          if (!error && data?.theme_store?.primary) {
            setPrimaryColor(data.theme_store.primary);
          }
        }
      } catch (err) {
        console.error("Theme load error:", err);
      }
    })();
  }, []);

  // Restore selected time
  const [restoreInfo, setRestoreInfo] = useState<{ day: number; time: string } | null>(null);
  useEffect(() => {
    AsyncStorage.getItem("selectedPickupTime").then((iso) => {
      if (!iso) return;
      const dt = new Date(iso);
      setRestoreInfo({
        day: dt.getDay(),
        time: `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`
      });
    });
  }, []);

  // Load location
  const [locationId, setLocationId] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem("location_id").then(setLocationId);
  }, []);

  // Build next 7 days
  const today = new Date();
  const dayOptions: DayOption[] = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return {
        label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "long" }),
        dateText: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        date: d,
        dayOfWeek: d.getDay(),
      };
    }),
    []
  );

  const [selectedDate, setSelectedDate] = useState<DayOption>(dayOptions[0]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Fetch slots when date or location changes
  useEffect(() => {
    if (!locationId) return;
    (async () => {
      const { data: sched, error } = await supabase
        .from("location_pickup_schedules")
        .select("available_hours")
        .eq("location_id", locationId)
        .eq("day_of_week", selectedDate.dayOfWeek)
        .maybeSingle();
      if (error) return;
      const raw: Slot[] = sched?.available_hours || [];
      const sorted = raw.sort((a, b) => {
        const toM = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        return toM(a.time) - toM(b.time);
      });
      setAvailableSlots(sorted);
      if (restoreInfo?.day === selectedDate.dayOfWeek) {
        const match = sorted.find(s => s.time === restoreInfo.time);
        if (match) setSelectedSlot(match);
        setRestoreInfo(null);
      }
    })();
  }, [locationId, selectedDate]);

  // Handlers
  const onDatePress = (opt: DayOption) => {
    setSelectedDate(opt);
    setSelectedSlot(null);
  };

  const confirmSelection = async () => {
    if (!selectedSlot) {
      Toast.show({ type: 'error', text1: 'Select a time slot' });
      return;
    }
    if (selectedSlot.capacity === 0) {
      Toast.show({ type: 'error', text1: 'That slot is not available' });
      return;
    }
    // Fetch current schedule
    const { data: sched, error: fetchErr } = await supabase
      .from("location_pickup_schedules")
      .select("available_hours")
      .eq("location_id", locationId)
      .eq("day_of_week", selectedDate.dayOfWeek)
      .maybeSingle();
    if (fetchErr || !sched) {
      Toast.show({ type: 'error', text1: 'Could not update slot availability' });
      return;
    }
    // Update capacity
    const updated = sched.available_hours.map(s =>
      s.time === selectedSlot.time && s.capacity != null && s.capacity > 0
        ? { ...s, capacity: s.capacity - 1 }
        : s
    );
    const { error: updateErr } = await supabase
      .from("location_pickup_schedules")
      .update({ available_hours: updated })
      .eq("location_id", locationId)
      .eq("day_of_week", selectedDate.dayOfWeek);
    if (updateErr) {
      Toast.show({ type: 'error', text1: 'Failed to reserve spot.' });
      return;
    }
    // Compose ISO and label
    const full = new Date(selectedDate.date);
    const [h, m] = selectedSlot.time.split(":").map(Number);
    full.setHours(h, m, 0, 0);
    const iso = full.toISOString();
    const start = `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    const end = `${(((h + 1) % 12) || 12)}:${m.toString().padStart(2, '0')} ${h + 1 >= 12 ? 'PM' : 'AM'}`;
    const label = `${selectedDate.label}, ${start} - ${end}`;
    await AsyncStorage.setItem('selectedPickupTime', iso);
    await AsyncStorage.setItem('selectedPickupLabel', label);
    Toast.show({ type: 'success', text1: `Pickup time set: ${label}` });
    navigation.navigate('(tabs)/Cart');
  };

  // Loader if data isn't ready
  if (!availableSlots.length && !selectedSlot) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Up Time</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {dayOptions.map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[
                styles.datePill,
                selectedDate.label === opt.label && {
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                },
              ]}
              onPress={() => onDatePress(opt)}
            >
              <Text
                style={[
                  styles.datePillLabel,
                  selectedDate.label === opt.label && { color: '#fff' },
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[
                  styles.datePillSub,
                  selectedDate.label === opt.label && { color: '#fff' },
                ]}
              >
                {opt.dateText}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hourly Slots</Text>
          <View style={styles.grid}>
            {availableSlots.map(s => {
              const disabled = s.capacity === 0;
              const isSel = selectedSlot?.time === s.time;
              const [h, m] = s.time.split(":").map(Number);
              const start = `${((h % 12) || 12)}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
              const note =
                s.capacity === null
                  ? 'Unlimited'
                  : disabled
                  ? 'Not available'
                  : `${s.capacity} left`;

              return (
                <TouchableOpacity
                  key={s.time}
                  disabled={disabled}
                  onPress={() => setSelectedSlot(s)}
                  style={[
                    styles.slot,
                    isSel && {
                      backgroundColor: primaryColor + '33',
                      borderColor: primaryColor,
                    },
                    disabled && styles.slotDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotText,
                      isSel && { color: primaryColor },
                      disabled && styles.slotTextDisabled,
                    ]}
                  >
                    {start}
                  </Text>
                  <Text style={styles.slotSub}>{note}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          onPress={confirmSelection}
          style={[
            styles.confirmButton,
            { backgroundColor: primaryColor },
            !selectedSlot && styles.confirmButtonDisabled,
          ]}
          disabled={!selectedSlot}
        >
          <Text style={styles.confirmButtonText}>Confirm Time Slot</Text>
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  scroll: { padding: 20 },
  dateScroll: { marginBottom: 16 },
  datePill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
  },
  datePillLabel: { fontWeight: '600', color: '#374151' },
  datePillSub: { fontSize: 12, color: '#6b7280' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slot: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotDisabled: { opacity: 0.4 },
  slotText: { fontWeight: '600', color: '#374151' },
  slotTextDisabled: { color: '#9ca3af' },
  slotSub: { fontSize: 12, color: '#6b7280' },
  confirmButton: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  confirmButtonDisabled: { backgroundColor: '#d1d5db' },
  confirmButtonText: { fontWeight: 'bold', color: '#fff', fontSize: 16 },
});
