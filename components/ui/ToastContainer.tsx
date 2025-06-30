import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useToast } from '@/hooks/use-toast'; // adjust path if needed

export default function ToastContainer() {
  // pull the current list of toasts
  const { toasts } = useToast();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {toasts.map((t) => {
        // animate opacity per‐toast if you like,
        // but for simplicity we’ll just show a static view here.
        const bg =
          t.type === 'error' ? '#dc2626' :
          t.type === 'success' ? '#16a34a' :
          '#2563eb';

        return (
          <View key={t.id} style={[styles.toast, { backgroundColor: bg }]}>
            {t.title && <Text style={styles.text}>{t.title}</Text>}
            {t.description && (
              <Text style={[styles.text, styles.subText]}>
                {t.description}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    minWidth: '80%',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  subText: {
    marginTop: 4,
    fontSize: 12,
  },
});
