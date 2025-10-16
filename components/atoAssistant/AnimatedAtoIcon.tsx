import React, { useEffect } from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated'

interface AnimatedAtoIconProps {
  width?: number
  height?: number
  color?: string
  style?: ViewStyle
  isActive?: boolean
  variant?: 'pulse' | 'ripple' | 'breathe' | 'glow' | 'morph'
}

const AnimatedView = Animated.createAnimatedComponent(View)

const VIEWBOX_WIDTH = 270
const VIEWBOX_HEIGHT = 268
const ASPECT_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT

export const AnimatedAtoIcon: React.FC<AnimatedAtoIconProps> = ({
  width = 50,
  height,
  color = '#3B82F6',
  style,
  isActive = false,
  variant = 'pulse',
}) => {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const rotation = useSharedValue(0)

  useEffect(() => {
    if (isActive) {
      switch (variant) {
        case 'pulse':
          scale.value = withRepeat(
            withSequence(
              withTiming(1.15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
          )
          break

        case 'breathe':
          scale.value = withRepeat(
            withSequence(
              withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
          )
          break

        case 'glow':
          opacity.value = withRepeat(
            withSequence(
              withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
          )
          break

        case 'morph':
          scale.value = withRepeat(
            withSequence(
              withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
          )
          rotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1,
            false
          )
          break

        case 'ripple':
          scale.value = withRepeat(
            withSequence(
              withTiming(1.2, { duration: 600, easing: Easing.out(Easing.ease) }),
              withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) })
            ),
            -1,
            false
          )
          opacity.value = withRepeat(
            withSequence(
              withTiming(0.4, { duration: 600, easing: Easing.out(Easing.ease) }),
              withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) })
            ),
            -1,
            false
          )
          break
      }
    } else {
      cancelAnimation(scale)
      cancelAnimation(opacity)
      cancelAnimation(rotation)

      scale.value = withTiming(1, { duration: 300 })
      opacity.value = withTiming(1, { duration: 300 })
      rotation.value = withTiming(0, { duration: 300 })
    }
  }, [isActive, variant])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    opacity: opacity.value,
  }))

  const safeWidth = typeof width === 'number' && !isNaN(width) && width > 0 ? width : 50
  const calculatedHeight = height
    ? typeof height === 'number' && !isNaN(height) && height > 0
      ? height
      : safeWidth / ASPECT_RATIO
    : safeWidth / ASPECT_RATIO

  return (
    <AnimatedView style={[styles.container, animatedStyle, style]}>
      <Svg
        width={safeWidth}
        height={calculatedHeight}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <Defs>
          <RadialGradient id="iconGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.8" />
          </RadialGradient>
        </Defs>
        <Path
          d="M236.47 36.7859C254.78 54.3059 265.54 76.7259 268.59 101.916C274.44 150.176 260.58 205.936 221.89 237.586C201.27 254.456 185.15 253.666 160.56 258.756C131.57 264.756 117.28 273.146 87.1597 260.846C59.5397 249.566 53.8697 236.256 37.5597 213.946C23.3797 194.556 1.67974 182.826 0.129743 156.376C-0.780257 140.846 3.28974 118.076 6.30974 102.506C13.1397 67.2659 28.2697 51.2859 53.6397 27.8359C75.7697 7.39594 87.6797 -0.954063 119.42 0.0859366C157.1 1.31594 208.37 9.88594 236.47 36.7859Z"
          fill="url(#iconGradient)"
        />
      </Svg>
    </AnimatedView>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
