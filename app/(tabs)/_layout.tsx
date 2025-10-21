import { Tabs } from 'expo-router'
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { BottomNavigation } from '@/components/BottomNavigation'

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, 
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
          }}
        />
        <Tabs.Screen
          name="contacts"
          options={{
            title: 'Contactos',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustes',
          }}
        />
      </Tabs>
      
      <BottomNavigation />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})