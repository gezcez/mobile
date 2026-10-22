import { Info, TriangleAlert, WifiOff, X } from "lucide-react-native"
import type { ReactNode } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export type BannerTone = "info" | "warning" | "navy" | "offline"

/** Full-width notice under a header: announcements, network status, offline. */
export function Banner({
	tone = "info",
	title,
	body,
	onPress,
	onDismiss,
	action,
}: {
	tone?: BannerTone
	title: string
	body?: string | null
	onPress?: () => void
	onDismiss?: () => void
	action?: ReactNode
}) {
	const t = useTheme()
	const { t: tr } = useT()
	const bg =
		tone === "warning" ? t.colors.cta : tone === "navy" || tone === "offline" ? t.colors.surfaceInverse : t.colors.surfaceMuted
	const fg = tone === "warning" ? t.colors.onCta : tone === "navy" || tone === "offline" ? t.colors.inkInverse : t.colors.ink
	const Icon = tone === "warning" ? TriangleAlert : tone === "offline" ? WifiOff : Info
	const inner = (
		<View style={[styles.banner, { backgroundColor: bg }]}>
			<Icon size={18} color={fg} />
			<View style={styles.text}>
				<Text variant="bodyStrong" style={{ color: fg }}>
					{title}
				</Text>
				{body ? (
					<Text variant="caption" style={{ color: fg, opacity: 0.85 }}>
						{body}
					</Text>
				) : null}
				{action}
			</View>
			{onDismiss ? (
				<Pressable accessibilityRole="button" accessibilityLabel={tr("banner.dismiss")} onPress={onDismiss} hitSlop={12}>
					<X size={18} color={fg} />
				</Pressable>
			) : null}
		</View>
	)
	return onPress ? (
		<Pressable accessibilityRole="button" onPress={onPress}>
			{inner}
		</Pressable>
	) : (
		<View accessibilityRole="alert">{inner}</View>
	)
}

const styles = StyleSheet.create({
	banner: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
	text: { flex: 1, gap: 2 },
})
