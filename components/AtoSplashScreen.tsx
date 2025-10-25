import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SvgUri } from 'react-native-svg'
import { Asset } from 'expo-asset'
import { i18n } from '@/lib/i18n'

interface SplashScreenProps {
  message?: string
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0.8)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  return (
    <LinearGradient
      colors={['#3CCEF5', '#2AB5DB', '#1E9BB8']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) }
              ],
            },
          ]}
        >
          <SvgUri
            uri={Asset.fromModule(require('@/assets/logo/full-ato.svg')).uri}
            width={200}
            height={200}
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.tagline}>{i18n.t('splash.tagline')}</Text>
        </Animated.View>

        <View style={styles.loadingContainer}>
          <View style={styles.dotsContainer}>
            <LoadingDot delay={0} />
            <LoadingDot delay={200} />
            <LoadingDot delay={400} />
          </View>
          {message && (
            <Text style={styles.loadingText}>{message}</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const animValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  })

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  })

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: 'white',
    marginBottom: 80,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
})