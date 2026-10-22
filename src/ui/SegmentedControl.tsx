import { Pressable, StyleSheet, View } from "react-native"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export function SegmentedControl<T extends string | number>({
	options,
	value,
	onChange,
	accessibilityLabel,
}: {
	options: { value: T; label: string }[]
	value: T
	onChange: (v: T) => void
	accessibilityLabel?: string
}) {
	const t = useTheme()
	return (
		<View
			accessibilityRole="tablist"
			accessibilityLabel={accessibilityLabel}
			style={[styles.wrap, { backgroundColor: t.colors.surfaceMuted, borderColor: t.colors.border }]}
		>
			{options.map((o) => {
				const selected = o.value === value
				return (
					<Pressable
						key={String(o.value)}
						accessibilityRole="tab"
						accessibilityState={{ selected }}
						onPress={() => onChange(o.value)}
						style={[styles.item, selected && { backgroundColor: t.colors.primary }]}
					>
						<Text
							variant="caption"
							numberOfLines={1}
							style={{ color: selected ? t.colors.onPrimary : t.colors.ink, fontFamily: t.fontFamily.semibold }}
						>
							{o.label}
						</Text>
					</Pressable>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { flexDirection: "row", borderRadius: 999, padding: 3, borderWidth: StyleSheet.hairlineWidth },
	item: { flex: 1, minHeight: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
})
