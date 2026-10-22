import { ChevronRight } from "lucide-react-native"
import type { ReactNode } from "react"
import { Pressable, StyleSheet, View, type AccessibilityActionEvent, type AccessibilityActionInfo } from "react-native"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export interface ListRowProps {
	title: string
	subtitle?: string | null
	leading?: ReactNode
	trailing?: ReactNode
	onPress?: () => void
	onLongPress?: () => void
	chevron?: boolean
	accessibilityLabel?: string
	accessibilityHint?: string
	accessibilityActions?: AccessibilityActionInfo[]
	onAccessibilityAction?: (e: AccessibilityActionEvent) => void
	titleLanguage?: string
	destructive?: boolean
}

/** A full-width row: 48+ tall, leading slot, title and subtitle, trailing slot. */
export function ListRow({
	title,
	subtitle,
	leading,
	trailing,
	onPress,
	onLongPress,
	chevron,
	accessibilityLabel,
	accessibilityHint,
	accessibilityActions,
	onAccessibilityAction,
	titleLanguage,
	destructive,
}: ListRowProps) {
	const t = useTheme()
	const body = (
		<>
			{leading ? <View style={styles.leading}>{leading}</View> : null}
			<View style={styles.text}>
				<Text variant="bodyStrong" color={destructive ? "danger" : "ink"} accessibilityLanguage={titleLanguage}>
					{title}
				</Text>
				{subtitle ? (
					<Text variant="caption" color="inkMuted">
						{subtitle}
					</Text>
				) : null}
			</View>
			{trailing}
			{chevron ? <ChevronRight size={18} color={t.colors.inkSubtle} /> : null}
		</>
	)
	if (!onPress && !onLongPress)
		return (
			<View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
				{body}
			</View>
		)
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
			accessibilityHint={accessibilityHint}
			accessibilityActions={accessibilityActions}
			onAccessibilityAction={onAccessibilityAction}
			onPress={onPress}
			onLongPress={onLongPress}
			style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.colors.surfaceMuted }]}
		>
			{body}
		</Pressable>
	)
}

export function Divider({ inset = 0 }: { inset?: number }) {
	const t = useTheme()
	return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border, marginLeft: inset }} />
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
	leading: { minWidth: 28, alignItems: "center" },
	text: { flex: 1, gap: 2 },
})
