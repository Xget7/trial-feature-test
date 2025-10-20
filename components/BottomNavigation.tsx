import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AtoAssistantIcon } from './atoAssistant/AtoAssistantIcon'
import { useAssistant } from '@/contexts/AssistantContext'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  Easing,
  withTiming,
} from 'react-native-reanimated'

type IconName = keyof typeof Ionicons.glyphMap

interface Tab {
  label: string
  iconName: IconName
  route: string
  isBig?: boolean
}

interface TabItemProps extends Tab {
  isActive: boolean
  onPress: () => void
}

const TABS: Tab[] = [
  { label: 'Inicio', iconName: 'home', route: '/' },
  { label: 'Contactos', iconName: 'book', route: '/contacts' },
  { label: 'Chat', iconName: 'chatbubble', route: '/chat', isBig: true },
  { label: 'Perfil', iconName: 'person', route: '/profile' },
  { label: 'Ajustes', iconName: 'settings', route: '/settings' },
]

const COLORS = {
  active: '#3B82F6',
  inactive: '#9CA3AF',
  background: '#FFFFFF',
  shadow: '#0097f5ff',
  activeBackground: '#EBF4FF',
  bigButtonBg: '#3CCEF5',
} as const

const TabItem: React.FC<TabItemProps> = ({ label, iconName, onPress, isActive }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
      <Ionicons name={iconName} size={22} color={isActive ? COLORS.active : COLORS.inactive} />
    </View>
    <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
  </TouchableOpacity>
)

const TabBigItem: React.FC<TabItemProps> = ({ label, iconName, onPress, isActive }) => {
  const glowOpacity = useSharedValue(0.2)

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.55, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    )
  }, [])

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  return (
    <TouchableOpacity style={styles.bigTabItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBigContainer}>
        <Animated.View style={[styles.glowEffect, animatedGlowStyle]} />
        <View style={styles.assistantIconBackground}>
          <AtoAssistantIcon width={45} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  )
}

export const BottomNavigation: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const { showAssistant } = useAssistant()

  const handleTabPress = (route: string) => {
    if (route === '/chat') {
      console.log('[BOTTOM NAV] Opening assistant')
      showAssistant()
      return
    }
    router.push(route as any)
  }

  const bigTab = TABS.find(tab => tab.isBig)
  const regularTabs = TABS.filter(tab => !tab.isBig)
  const firstHalf = regularTabs.slice(0, 2)
  const secondHalf = regularTabs.slice(2)

  // Determina si estamos en la ruta principal (index)
  const isActiveTab = (tabRoute: string) => {
    if (tabRoute === '/') {
      return pathname === '/' || pathname === '/index'
    }
    return pathname.startsWith(tabRoute)
  }

  return (
    <View style={styles.container}>
      {bigTab && (
        <View style={styles.bigButtonWrapper}>
          <TabBigItem
            key={bigTab.route}
            route={bigTab.route}
            label={bigTab.label}
            iconName={bigTab.iconName}
            isActive={isActiveTab(bigTab.route)}
            onPress={() => handleTabPress(bigTab.route)}
          />
        </View>
      )}

      <View style={styles.navBar}>
        <View style={styles.tabContainer}>
          {firstHalf.map(tab => (
            <TabItem
              key={tab.route}
              {...tab}
              isActive={isActiveTab(tab.route)}
              onPress={() => handleTabPress(tab.route)}
            />
          ))}

          <View style={styles.bigButtonSpacer} />

          {secondHalf.map(tab => (
            <TabItem
              key={tab.route}
              {...tab}
              isActive={isActiveTab(tab.route)}
              onPress={() => handleTabPress(tab.route)}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  navBar: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    paddingTop: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  bigTabItem: {
    alignItems: 'center',
  },
  bigButtonWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 52,
    left: '50%',
    transform: [{ translateX: -35 }],
    zIndex: 20,
  },
  bigButtonSpacer: {
    flex: 1,
  },
  iconBigContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bigButtonBg,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  assistantIconBackground: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: COLORS.activeBackground,
  },
  label: {
    fontSize: 11,
    color: COLORS.inactive,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.active,
    fontWeight: '600',
  },
  glowEffect: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.bigButtonBg,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
})