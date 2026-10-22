import { Ship } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import type { Mode } from "@/api/types"
import { useT } from "@/i18n/useT"
import { colorOr, readableTextOn } from "@/lib/color"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

/**
 * Route short name on the route colour. Text colour is the data's if it passes WCAG 4.5:1, else navy
 * or white. Bus: rounded rect; tram/rail: pill; ferry: wave (ship) prefix (plan 10.2).
 */
export function RouteBadge({
	shortName,
	color,
	textColor,
	mode = "bus",
	size = "md",
}: {
	shortName: string
	color: string | null
	textColor?: string | null
	mode?: Mode
	size?: "sm" | "md"
}) {
	const t = useTheme()
	const { t: tr } = useT()
	const bg = colorOr(color, t.colors.primary)
	const fg = readableTextOn(bg, textColor ? colorOr(textColor, "") : null)
	const pill = mode === "tram" || mode === "rail" || mode === "metro"
	return (
		<View
			accessible
			accessibilityLabel={`${tr(`common:modes.${MODE_KEYS.includes(mode) ? mode : "other"}`)} ${shortName}`}
			style={[
				styles.badge,
				size === "sm" ? styles.sm : styles.md,
				{ backgroundColor: bg, borderRadius: pill ? 999 : 6 },
			]}
		>
			{mode === "ferry" ? <Ship size={size === "sm" ? 11 : 13} color={fg} /> : null}
			<Text variant="caption" style={[styles.label, { color: fg }, size === "sm" && { fontSize: 12 }]} maxFontSizeMultiplier={1.4}>
				{shortName}
			</Text>
		</View>
	)
}

const MODE_KEYS: Mode[] = ["bus", "tram", "metro", "rail", "ferry", "cable", "other"]

const styles = StyleSheet.create({
	badge: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start" },
	md: { minWidth: 36, height: 26, paddingHorizontal: 7, justifyContent: "center" },
	sm: { minWidth: 28, height: 20, paddingHorizontal: 5, justifyContent: "center" },
	label: { fontFamily: "Inter-Bold", fontVariant: ["tabular-nums"] },
})
