import type { ReactNode } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export function Chip({
	label,
	selected,
	onPress,
	icon,
	tone = "default",
	accessibilityLabel,
	role = "button",
}: {
	label: string
	selected?: boolean
	onPress?: () => void
	icon?: ReactNode
	tone?: "default" | "inverse"
	accessibilityLabel?: string
	/** "radio" inside a radiogroup (single choice), "button" otherwise. */
	role?: "button" | "radio"
}) {
	const t = useTheme()
	const bg = selected ? t.colors.primary : tone === "inverse" ? t.colors.surfaceInverse : t.colors.surface
	const fg = selected ? t.colors.onPrimary : tone === "inverse" ? t.colors.inkInverse : t.colors.ink
	const content = (
		<View style={[styles.chip, { backgroundColor: bg, borderColor: selected ? bg : t.colors.border }]}>
			{icon}
			<Text variant="caption" style={{ color: fg }} numberOfLines={1}>
				{label}
			</Text>
		</View>
	)
	if (!onPress) return content
	return (
		<Pressable
			accessibilityRole={role}
			accessibilityState={role === "radio" ? { checked: !!selected } : { selected: !!selected }}
			accessibilityLabel={accessibilityLabel ?? label}
			onPress={onPress}
			hitSlop={6}
		>
			{content}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		minHeight: 32,
		paddingHorizontal: 12,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth,
	},
})
