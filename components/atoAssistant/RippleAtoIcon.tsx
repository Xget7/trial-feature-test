import React, { useEffect } from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'

interface RippleAtoIconProps {
  width?: number
  height?: number
  color?: string
  style?: ViewStyle
  isActive?: boolean
  variant?: 'listening' | 'speaking' | 'idle'
}

const AnimatedView = Animated.createAnimatedComponent(View)

const RippleCircle: React.FC<{
  width: number
  height: number
  delay: number
  isActive: boolean
  color: string
  variant: 'listening' | 'speaking' | 'idle'
}> = ({ width, height, delay, isActive, color, variant }) => {
  const scale = useSharedValue(0.5)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (isActive) {
      // Listening: rápido y enérgico
      if (variant === 'listening') {
        scale.value = withDelay(
          delay,
          withRepeat(withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false)
        )
        opacity.value = withDelay(
          delay,
          withRepeat(withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false)
        )
      }
      // Speaking: suave y continuo
      else if (variant === 'speaking') {
        scale.value = withDelay(
          delay,
          withRepeat(withTiming(1.8, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, false)
        )
        opacity.value = withDelay(
          delay,
          withRepeat(withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, false)
        )
      }
      // Idle: respiración lenta
      else {
        scale.value = withDelay(
          delay,
          withRepeat(withTiming(1.5, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, false)
        )
        opacity.value = withDelay(
          delay,
          withRepeat(withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, false)
        )
      }
    } else {
      scale.value = withTiming(0.5, { duration: 300 })
      opacity.value = withTiming(0, { duration: 300 })
    }
  }, [isActive, variant])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isActive ? opacity.value : 0,
  }))

  const aspectRatio = 270 / 268
  const calculatedHeight = width / aspectRatio

  return (
    <AnimatedView style={[StyleSheet.absoluteFill, styles.ripple, animatedStyle]}>
      <Svg width={width} height={calculatedHeight} viewBox="0 0 270 268">
        <Path
          d="M236.47 36.7859C254.78 54.3059 265.54 76.7259 268.59 101.916C274.44 150.176 260.58 205.936 221.89 237.586C201.27 254.456 185.15 253.666 160.56 258.756C131.57 264.756 117.28 273.146 87.1597 260.846C59.5397 249.566 53.8697 236.256 37.5597 213.946C23.3797 194.556 1.67974 182.826 0.129743 156.376C-0.780257 140.846 3.28974 118.076 6.30974 102.506C13.1397 67.2659 28.2697 51.2859 53.6397 27.8359C75.7697 7.39594 87.6797 -0.954063 119.42 0.0859366C157.1 1.31594 208.37 9.88594 236.47 36.7859Z"
          fill={color}
          opacity="0.3"
        />
      </Svg>
    </AnimatedView>
  )
}

export const RippleAtoIcon: React.FC<RippleAtoIconProps> = ({
  width = 50,
  height = 50,
  color = '#3B82F6',
  style,
  isActive = false,
  variant = 'idle',
}) => {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (isActive) {
      // Listening: pulsación más rápida y pronunciada
      if (variant === 'listening') {
        scale.value = withRepeat(
          withTiming(1.08, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      }
      // Speaking: pulsación suave y lenta
      else if (variant === 'speaking') {
        scale.value = withRepeat(
          withTiming(1.04, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      }
      // Idle: respiración muy sutil
      else {
        scale.value = withRepeat(
          withTiming(1.02, {
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
          }),
          -1,
          true
        )
      }
    } else {
      scale.value = withTiming(1, { duration: 300 })
    }
  }, [isActive, variant])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const aspectRatio = 270 / 268
  const calculatedHeight = width / aspectRatio

  return (
    <View style={[styles.container, style]}>
      {/* Ripple waves */}
      <RippleCircle width={width} height={height} delay={0} isActive={isActive} color={color} variant={variant} />
      <RippleCircle width={width} height={height} delay={400} isActive={isActive} color={color} variant={variant} />
      <RippleCircle width={width} height={height} delay={800} isActive={isActive} color={color} variant={variant} />

      {/* Main icon */}
      <AnimatedView style={[styles.mainIcon, animatedStyle]}>
        <Svg width={width} height={calculatedHeight} viewBox="0 0 270 268">
          <Defs>
            <RadialGradient id="mainGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.85" />
            </RadialGradient>
          </Defs>
          <Path
            d="M236.47 36.7859C254.78 54.3059 265.54 76.7259 268.59 101.916C274.44 150.176 260.58 205.936 221.89 237.586C201.27 254.456 185.15 253.666 160.56 258.756C131.57 264.756 117.28 273.146 87.1597 260.846C59.5397 249.566 53.8697 236.256 37.5597 213.946C23.3797 194.556 1.67974 182.826 0.129743 156.376C-0.780257 140.846 3.28974 118.076 6.30974 102.506C13.1397 67.2659 28.2697 51.2859 53.6397 27.8359C75.7697 7.39594 87.6797 -0.954063 119.42 0.0859366C157.1 1.31594 208.37 9.88594 236.47 36.7859Z"
            fill="url(#mainGradient)"
          />
        </Svg>
      </AnimatedView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ripple: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainIcon: {
    zIndex: 10,
  },
})
