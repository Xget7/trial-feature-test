import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type IconName = keyof typeof Ionicons.glyphMap

interface Tab {
  label: string
  iconName: IconName
  route: string
}

interface TabItemProps extends Tab {
  isActive: boolean
  onPress: () => void
}

const TABS: Tab[] = [
  { label: 'Inicio', iconName: 'home', route: '/dashboard' },
  { label: 'Contactos', iconName: 'book', route: '/contacts' },
  { label: 'Perfil', iconName: 'person', route: '/profile' },
  { label: 'Ajustes', iconName: 'settings', route: '/settings' },
]

const COLORS = {
  active: '#3B82F6',
  inactive: '#9CA3AF',
  background: '#FFFFFF',
  shadow: '#3B82F6',
  activeBackground: '#EBF4FF',
} as const

const TabItem: React.FC<TabItemProps> = ({ label, iconName, onPress, isActive }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
      <Ionicons name={iconName} size={22} color={isActive ? COLORS.active : COLORS.inactive} />
    </View>
    <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
  </TouchableOpacity>
)

export const BottomNavigation: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()

  const handleTabPress = (route: string) => {
    router.push(route as any)
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <View style={styles.tabContainer}>
          {TABS.map(tab => (
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
