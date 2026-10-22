import { StyleSheet, View, type DimensionValue } from "react-native"
import { useTheme } from "@/theme/theme"

export function Skeleton({ width = "100%", height = 16, radius = 8 }: { width?: DimensionValue; height?: number; radius?: number }) {
	const t = useTheme()
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{ width, height, borderRadius: radius, backgroundColor: t.colors.skeleton }}
		/>
	)
}

/** Rows shaped like a list of stops or departures. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
	return (
		<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
			{Array.from({ length: count }, (_, i) => (
				<View key={i} style={styles.row}>
					<Skeleton width={36} height={24} radius={6} />
					<View style={styles.text}>
						<Skeleton width="70%" />
						<Skeleton width="40%" height={12} />
					</View>
				</View>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 14, alignItems: "center" },
	text: { flex: 1, gap: 8 },
})
