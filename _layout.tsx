// app/_layout.tsx
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { useColorScheme } from '@/hooks/useColorScheme';

// ← make sure this path matches exactly your file
import ToastContainer from '../components/ui/ToastContainer';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    supabase.auth.getSession().then(() => setAuthChecked(true));
  }, []);

  if (!loaded || !authChecked) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 1) Mount it before your navigator so it’s ready immediately */}
      <ToastContainer />

      {/* 2) Your app’s screens */}
      <Stack />

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
