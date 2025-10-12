import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AtoAssistantIcon } from './atoAssistant/AtoAssistantIcon'
import { useAssistant } from '@/contexts/AssistantContext'

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
  { label: 'Inicio', iconName: 'home', route: '/dashboard' },
  { label: 'Contactos', iconName: 'book', route: '/contacts' },
  { label: 'Chat', iconName: 'chatbubble', route: '/chat', isBig: true },
  { label: 'Perfil', iconName: 'person', route: '/profile' },
  { label: 'Ajustes', iconName: 'settings', route: '/settings' },
]

const COLORS = {
  active: '#3B82F6',
  inactive: '#9CA3AF',
  background: '#FFFFFF',
  shadow: '#3CCEF5',
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

const TabBigItem: React.FC<TabItemProps> = ({ label, iconName, onPress, isActive }) => (
  <TouchableOpacity style={styles.bigTabItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconBigContainer}>
      <View style={styles.assistantIconBackground}>
        <AtoAssistantIcon width={55} color="white" />
      </View>
    </View>
  </TouchableOpacity>
)

export const BottomNavigation: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const { showAssistant } = useAssistant() // Use context instead of local state

  const handleTabPress = (route: string) => {
    if (route === '/chat') {
      console.log('[BOTTOM NAV] Opening assistant')
      showAssistant() // Open assistant from context
      return
    }
    router.push(route as any)
  }

  const bigTab = TABS.find(tab => tab.isBig)
  const regularTabs = TABS.filter(tab => !tab.isBig)
  const firstHalf = regularTabs.slice(0, 2)
  const secondHalf = regularTabs.slice(2)

  return (
    <View style={styles.container}>
      {bigTab && (
        <View style={styles.bigButtonWrapper}>
          <TabBigItem
            key={bigTab.route}
            route={bigTab.route}
            label={bigTab.label}
            iconName={bigTab.iconName}
            isActive={pathname === bigTab.route}
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
              isActive={pathname === tab.route}
              onPress={() => handleTabPress(tab.route)}
            />
          ))}

          <View style={styles.bigButtonSpacer} />

          {secondHalf.map(tab => (
            <TabItem
              key={tab.route}
              {...tab}
              isActive={pathname === tab.route}
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
    paddingBottom: 28,
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
    bottom: 60,
    left: '50%',
    transform: [{ translateX: -37 }],
    zIndex: 20,
  },
  bigButtonSpacer: {
    flex: 1,
  },
  iconBigContainer: {
    width: 85,
    height: 85,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bigButtonBg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  assistantIconBackground: {
    width: 90,
    height: 90,
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
})
