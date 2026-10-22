import type { BottomTabBarProps } from "expo-router/js-tabs"
import { Bookmark, CircleUser, House, Map, Search, type LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

const ICONS: Record<string, LucideIcon> = {
	index: House,
	map: Map,
	search: Search,
	saved: Bookmark,
	me: CircleUser,
}

/** Brand tab bar: labels always visible, navy pill on the active tab (amber in dark mode). */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const t = useTheme()
	const insets = useSafeAreaInsets()
	return (
		<View
			accessibilityRole="tablist"
			style={[
				styles.bar,
				{ backgroundColor: t.colors.surface, borderTopColor: t.colors.border, paddingBottom: Math.max(insets.bottom, 8) },
			]}
		>
			{state.routes.map((route, index) => {
				const options = descriptors[route.key]?.options
				const focused = state.index === index
				const label = typeof options?.title === "string" ? options.title : route.name
				const Icon = ICONS[route.name.split("/")[0]!] ?? House
				const onPress = () => {
					const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true })
					if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params)
				}
				return (
					<Pressable
						key={route.key}
						accessibilityRole="tab"
						accessibilityState={{ selected: focused }}
						accessibilityLabel={label}
						onPress={onPress}
						onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
						style={styles.item}
					>
						<View style={[styles.pill, focused && { backgroundColor: t.colors.tabActive }]}>
							<Icon size={22} color={focused ? t.colors.onTabActive : t.colors.inkMuted} strokeWidth={focused ? 2.4 : 2} />
						</View>
						<Text
							variant="caption"
							numberOfLines={1}
							maxFontSizeMultiplier={1.3}
							style={{ color: focused ? t.colors.ink : t.colors.inkMuted, fontSize: 12 }}
						>
							{label}
						</Text>
					</Pressable>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	bar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
	item: { flex: 1, alignItems: "center", gap: 2, minHeight: 48 },
	pill: { width: 56, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center" },
})
