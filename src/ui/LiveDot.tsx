import { useEffect, useState } from "react"
import { AccessibilityInfo, StyleSheet, View } from "react-native"
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"
import { useTheme } from "@/theme/theme"

/** Amber dot with a subtle pulse; no pulse with Reduce Motion. Decorative: pair it with text. */
export function LiveDot({ size = 8 }: { size?: number }) {
	const t = useTheme()
	const reduceMotion = useReduceMotion()
	const pulse = useSharedValue(0)
	useEffect(() => {
		if (reduceMotion) return
		pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true)
		return () => cancelAnimation(pulse)
	}, [pulse, reduceMotion])
	const ring = useAnimatedStyle(() => ({
		opacity: 0.35 * (1 - pulse.value),
		transform: [{ scale: 0.6 + pulse.value * 0.6 }],
	}))
	return (
		<View
			style={{ width: size * 2, height: size * 2, alignItems: "center", justifyContent: "center" }}
			importantForAccessibility="no-hide-descendants"
			accessibilityElementsHidden
		>
			{reduceMotion ? null : (
				<Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: t.colors.live }, ring]} />
			)}
			<View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.live }} />
		</View>
	)
}

export function useReduceMotion(): boolean {
	const [on, setOn] = useState(false)
	useEffect(() => {
		let alive = true
		AccessibilityInfo.isReduceMotionEnabled()
			.then((v) => alive && setOn(v))
			.catch(() => {})
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOn)
		return () => {
			alive = false
			sub.remove()
		}
	}, [])
	return on
}
