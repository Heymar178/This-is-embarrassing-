// hooks/use-toast.tsx

import React, { useRef, useState, useEffect } from 'react';
import { Animated, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type ToastOptions = {
  type?: 'success' | 'error' | 'info';
  text1: string;
  text2?: string;
  duration?: number; // ms before auto‐dismiss
};

// ———— Module‐level globals ————
let globalHandler: ((opts: ToastOptions) => void) | null = null;
const toastQueue: ToastOptions[] = [];

/** Call this from anywhere: */
export const Toast = {
  show(opts: ToastOptions) {
    if (globalHandler) {
      globalHandler(opts);
    } else {
      // queue up until handler is ready
      toastQueue.push(opts);
    }
  },
};

// ———— Hook + Container ————
export function useToast() {
  const [current, setCurrent] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideRef = useRef<ReturnType<typeof setTimeout>>();

  // our real handler
  const handler = (opts: ToastOptions) => {
    hideRef.current && clearTimeout(hideRef.current);
    setCurrent(opts);

    // fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      // schedule fade out
      hideRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => setCurrent(null));
      }, opts.duration ?? 2500);
    });
  };

  // register + flush queue on mount
  useEffect(() => {
    globalHandler = handler;
    // flush any calls that happened early
    toastQueue.forEach((t) => handler(t));
    toastQueue.length = 0;
    return () => {
      globalHandler = null;
    };
  }, [handler]);

  function ToastContainer() {
    if (!current) return null;
    const bg =
      current.type === 'success'
        ? '#16a34a'
        : current.type === 'error'
        ? '#dc2626'
        : '#2563eb';

    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { opacity, backgroundColor: bg }]}
      >
        <Text style={styles.text1}>{current.text1}</Text>
        {current.text2 && <Text style={styles.text2}>{current.text2}</Text>}
      </Animated.View>
    );
  }

  return { ToastContainer };
}

const styles = StyleSheet.create<{
  toast: ViewStyle;
  text1: TextStyle;
  text2: TextStyle;
}>({
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 5,
    zIndex: 9999,
  },
  text1: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  text2: {
    color: 'white',
    marginTop: 4,
    fontSize: 14,
  },
});
