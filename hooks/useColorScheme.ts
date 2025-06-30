// app/hooks/useColorScheme.ts
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/supabaseClient";

export function useColorScheme() {
  const [primary, setPrimary] = useState("#16a34a"); // fallback

  useEffect(() => {
    (async () => {
      const storeId = await AsyncStorage.getItem("selected_store_id");
      if (!storeId) return;
      const { data, error } = await supabase
        .from("store_settings")
        .select("theme_store")
        .eq("store_id", storeId)
        .single();
      if (!error && data.theme_store?.primary) {
        setPrimary(data.theme_store.primary);
      }
    })();
  }, []);

  return { primary };
}
