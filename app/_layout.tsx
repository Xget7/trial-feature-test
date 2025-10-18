import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

import { useColorScheme } from '@/hooks/useColorScheme'
import { AuthProvider } from '@/components/AuthProvider'
import { AuthGuard } from '@/components/AuthGuard'
import { AtoProvider } from '@/contexts/AtoContext'
import { I18nProvider } from '@/components/I18nProvider'
import { AssistantProvider, useAssistant } from '@/contexts/AssistantContext'
import { AtoAssistantSheet } from '@/components/atoAssistant/AtoAssistantSheet'
import { SelectedUserProvider } from '@/contexts/SelectedUserContext'

function RootLayoutContent() {
  const colorScheme = useColorScheme()
  const { isAssistantVisible, hideAssistant } = useAssistant()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="contacts" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      <AtoAssistantSheet visible={isAssistantVisible} onClose={hideAssistant} />
    </ThemeProvider>
  )
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  if (!loaded) {
    return null
  }

  return (
    <I18nProvider>
      <AtoProvider>
        <AuthProvider>
          <AuthGuard>
            <SelectedUserProvider>
              <AssistantProvider>
                <RootLayoutContent />
              </AssistantProvider>
            </SelectedUserProvider>
          </AuthGuard>
        </AuthProvider>
      </AtoProvider>
    </I18nProvider>
  )
}
