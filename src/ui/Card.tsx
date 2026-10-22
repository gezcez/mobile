import type { ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "@/theme/theme"

export interface CardProps {
	children: ReactNode
	onPress?: () => void
	onLongPress?: () => void
	tone?: "surface" | "muted" | "inverse" | "accent"
	padded?: boolean
	style?: StyleProp<ViewStyle>
	accessibilityLabel?: string
	accessibilityHint?: string
}

/** Rounded-2xl card, flat: separation by surface colour and a hairline, never a shadow. */
export function Card({
	children,
	onPress,
	onLongPress,
	tone = "surface",
	padded = true,
	style,
	accessibilityLabel,
	accessibilityHint,
}: CardProps) {
	const t = useTheme()
	const bg =
		tone === "muted"
			? t.colors.surfaceMuted
			: tone === "inverse"
				? t.colors.surfaceInverse
				: tone === "accent"
					? t.colors.cta
					: t.colors.surface
	const base = [
		styles.card,
		{ backgroundColor: bg, borderColor: tone === "surface" ? t.colors.border : "transparent" },
		padded && styles.padded,
		style,
	]
	if (!onPress && !onLongPress) return <View style={base}>{children}</View>
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={accessibilityHint}
			onPress={onPress}
			onLongPress={onLongPress}
			style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}
		>
			{children}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
	padded: { padding: 16 },
})
