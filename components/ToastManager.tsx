// projectRoot/components/ToastManager.tsx

import React, { useState, useRef, useEffect } from "react";
import { Animated, StyleSheet, Text } from "react-native";

export type ToastOptions = {
  type?: "success" | "error" | "info";
  text1: string;
  text2?: string;
  duration?: number; // ms before auto‐dismiss
};

// module‐level handler and queue
let toastHandler: ((opts: ToastOptions) => void) | null = null;
const toastQueue: ToastOptions[] = [];

/** Call this from anywhere to show a toast */
export function showToast(opts: ToastOptions) {
  if (toastHandler) {
    toastHandler(opts);
  } else {
    // queue for later
    toastQueue.push(opts);
  }
}

/** Mount once under your root to render toasts */
export default function ToastManager() {
  const [opts, setOpts] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideRef = useRef<ReturnType<typeof setTimeout>>();

  // create the actual handler
  const handler = (o: ToastOptions) => {
    hideRef.current && clearTimeout(hideRef.current);
    setOpts(o);

    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      hideRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => setOpts(null));
      }, o.duration ?? 2500);
    });
  };

  // Register handler immediately (so no race on first render)
  toastHandler = handler;

  // Drain any queued toasts once on mount
  useEffect(() => {
    while (toastQueue.length) {
      handler(toastQueue.shift()!);
    }
    return () => {
      toastHandler = null;
    };
  }, [handler]);

  if (!opts) return null;

  const colors = {
    success: "#16a34a",
    error: "#dc2626",
    info: "#2563eb",
    default: "#000",
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { opacity, backgroundColor: colors[opts.type ?? "default"] },
      ]}
    >
      <Text style={styles.text1}>{opts.text1}</Text>
      {opts.text2 && <Text style={styles.text2}>{opts.text2}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    elevation: 5,
    zIndex: 10,
  },
  text1: { color: "white", fontWeight: "bold", fontSize: 16 },
  text2: { color: "white", marginTop: 4, fontSize: 14 },
});
