import { Switch, View, StyleSheet } from "react-native"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export function ToggleRow({
	label,
	description,
	value,
	onChange,
}: {
	label: string
	description?: string
	value: boolean
	onChange: (v: boolean) => void
}) {
	const t = useTheme()
	return (
		<View style={styles.row}>
			<View style={styles.text}>
				<Text variant="bodyStrong">{label}</Text>
				{description ? (
					<Text variant="caption" color="inkMuted">
						{description}
					</Text>
				) : null}
			</View>
			<Switch
				accessibilityLabel={label}
				accessibilityHint={description}
				value={value}
				onValueChange={onChange}
				trackColor={{ true: t.colors.accent, false: t.colors.inkSubtle }}
				ios_backgroundColor={t.colors.inkSubtle}
				thumbColor={t.colors.surface}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
	text: { flex: 1, gap: 2 },
})
