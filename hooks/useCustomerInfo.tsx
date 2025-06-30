// hooks/useCustomerInfo.ts

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import Toast from "react-native-toast-message";

export interface OrderType {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: { id: string; quantity: number }[];
}

interface UserType {
  first_name: string;
  last_name: string;
  email: string;
}

const useCustomerInfo = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // 1) get auth user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !authUser) {
          Toast.show({ type: "error", text1: "Failed to fetch user." });
          return;
        }
        const userId = authUser.id;

        // 2) fetch profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", userId)
          .maybeSingle();
        if (profileError) {
          Toast.show({ type: "error", text1: "Failed to load profile." });
        } else if (profile) {
          setUser(profile);
        }

        // 3) fetch orders plus their items
        const { data: rawOrders, error: ordersError } = await supabase
          .from("orders")
          .select(`
            *,
            order_items ( id, quantity )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (ordersError) {
          Toast.show({ type: "error", text1: "Failed to load orders." });
        } else if (rawOrders) {
          setOrders(rawOrders as OrderType[]);
        }
      } catch (err) {
        Toast.show({ type: "error", text1: "Unexpected error." });
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  return { user, orders, loading };
};

export default useCustomerInfo;
