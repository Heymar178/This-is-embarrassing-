// src/components/SocialButton.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';

interface SocialButtonProps {
  provider: 'google' | 'apple';
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  onPress,
  style,
  disabled = false,
  loading = false,
}) => {
  const icon = provider === 'google' ? 'G' : '';
  const label = provider === 'google' ? 'Continue with Google' : 'Continue with Apple';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        style,
        (disabled || loading) && styles.buttonDisabled,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={provider === 'google' ? '#4285F4' : '#000'} />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconCircle,
                provider === 'google' ? styles.googleBg : styles.appleBg,
              ]}
            >
              <Text style={styles.iconText}>{icon}</Text>
            </View>
          </View>
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBg: {
    backgroundColor: '#4285F4',
  },
  appleBg: {
    backgroundColor: '#000',
  },
  iconText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default SocialButton;
