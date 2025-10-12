import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAssistant } from '@/contexts/AssistantContext'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

export default function HomeScreen() {
  const { showAssistant } = useAssistant()

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bienvenido a</Text>
          <Text style={styles.titleBold}>AtoApp</Text>
          <Text style={styles.subtitle}>Tu asistente inteligente con voz</Text>
        </View>

        <TouchableOpacity style={styles.mainCard} onPress={showAssistant} activeOpacity={0.9}>
          <LinearGradient
            colors={['#3CCEF5', '#2AB5DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mic" size={48} color="white" />
            </View>
            <Text style={styles.cardTitle}>Hablar con Ato</Text>
            <Text style={styles.cardSubtitle}>Pregúntame lo que quieras sobre Clara</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <Ionicons name="chatbubbles" size={32} color="#3CCEF5" />
            <Text style={styles.featureTitle}>Conversación Natural</Text>
            <Text style={styles.featureText}>Habla de forma natural y fluida</Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="bulb" size={32} color="#F59E0B" />
            <Text style={styles.featureTitle}>IA Avanzada</Text>
            <Text style={styles.featureText}>Respuestas inteligentes y contextuales</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={showAssistant} activeOpacity={0.8}>
        <LinearGradient colors={['#3CCEF5', '#2AB5DB']} style={styles.fabGradient}>
          <Ionicons name="mic" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    color: '#6B7280',
  },
  titleBold: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  mainCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#3CCEF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#3CCEF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
