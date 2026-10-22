// NetworkBadge.tsx
// Small network label shown on rows when the current city has more than one network on.

import { StyleSheet, View } from "react-native"
import { colorOr } from "@/lib/color"
import { useTheme } from "@/theme/theme"
import { Text } from "@/ui/Text"

export function NetworkBadge({ name, color }: { name: string; color?: string | null }) {
	const t = useTheme()
	return (
		<View style={[styles.badge, { borderColor: t.colors.border, backgroundColor: t.colors.surfaceMuted }]}>
			<View style={[styles.dot, { backgroundColor: colorOr(color ?? null, t.colors.accent) }]} />
			<Text variant="caption" color="inkMuted" numberOfLines={1}>
				{name}
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		alignSelf: "flex-start",
		paddingHorizontal: 8,
		height: 22,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth,
	},
	dot: { width: 6, height: 6, borderRadius: 3 },
})
