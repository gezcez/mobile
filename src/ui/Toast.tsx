// Cross-platform toast (replaces FKart's ToastAndroid). One at a time, announced to screen readers.
import { useEffect, useState } from "react"
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { create } from "zustand"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

interface ToastItem {
	id: number
	message: string
	action?: { label: string; onPress: () => void }
	durationMs: number
}

const useToastStore = create<{ current: ToastItem | null }>(() => ({ current: null }))
let seq = 0

export function toast(message: string, opts: { action?: ToastItem["action"]; durationMs?: number } = {}) {
	const item = { id: ++seq, message, action: opts.action, durationMs: opts.durationMs ?? (opts.action ? 5000 : 3000) }
	useToastStore.setState({ current: item })
	AccessibilityInfo.announceForAccessibility(message)
}

export function ToastHost() {
	const current = useToastStore((s) => s.current)
	const t = useTheme()
	const insets = useSafeAreaInsets()
	const [, force] = useState(0)
	useEffect(() => {
		if (!current) return
		const timer = setTimeout(() => {
			if (useToastStore.getState().current?.id === current.id) useToastStore.setState({ current: null })
			force((n) => n + 1)
		}, current.durationMs)
		return () => clearTimeout(timer)
	}, [current])
	if (!current) return null
	return (
		<View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 84 }]}>
			<View style={[styles.toast, { backgroundColor: t.colors.surfaceInverse }]} accessibilityLiveRegion="polite">
				<Text style={{ color: t.colors.inkInverse, flex: 1 }}>{current.message}</Text>
				{current.action ? (
					<Pressable
						accessibilityRole="button"
						onPress={() => {
							current.action?.onPress()
							useToastStore.setState({ current: null })
						}}
						hitSlop={10}
					>
						<Text variant="bodyStrong" style={{ color: t.colors.cta }}>
							{current.action.label}
						</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	host: { position: "absolute", left: 16, right: 16, alignItems: "center" },
	toast: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 520, width: "100%" },
})
