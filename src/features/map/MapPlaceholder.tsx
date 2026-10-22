// MapPlaceholder.tsx
// Stands in for the map in Expo Go: brand surface, one icon, one sentence. Lists, stops, routes and
// the bottom sheets on top keep working; only the map itself needs the dev client.

import { MapPinOff } from "lucide-react-native"
import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { space } from "@/theme/tokens"
import { Card } from "@/ui/Card"
import { Text } from "@/ui/Text"

type Inset = { top?: number; bottom?: number; left?: number; right?: number }

export function MapPlaceholder({ contentInset }: { contentInset?: unknown; children?: ReactNode }) {
	const { t } = useT()
	const theme = useTheme()
	const inset: Inset = contentInset && typeof contentInset === "object" && !Array.isArray(contentInset) ? (contentInset as Inset) : {}
	return (
		<View
			testID="map-placeholder"
			style={[
				StyleSheet.absoluteFill,
				styles.wrap,
				{
					backgroundColor: theme.colors.surfaceMuted,
					paddingTop: (inset.top ?? 0) + space[4],
					paddingBottom: (inset.bottom ?? 0) + space[4],
				},
			]}
		>
			<Card style={styles.card}>
				<MapPinOff size={28} color={theme.colors.accent} />
				<Text variant="heading" align="center" accessibilityRole="header">
					{t("map.expoGoTitle")}
				</Text>
				<Text color="inkMuted" align="center">
					{t("map.expoGoBody")}
				</Text>
			</Card>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: space[6] },
	card: { alignItems: "center", gap: space[3], maxWidth: 360 },
})
