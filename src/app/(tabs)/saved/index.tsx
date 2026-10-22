// Saved (plan 5.5): groups with their colour bar and item count, a "Live map" pill per group,
// New group, the sign-in footer for guests and the sync status line.

import { router } from "expo-router"
import { Bookmark, Map as MapIcon, Plus } from "lucide-react-native"
import { useEffect } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useAuthStatus, useSignIn } from "@/auth/hooks"
import { SyncStatusLine } from "@/features/favourites/SyncStatusLine"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { DragList } from "@/ui/DragList"
import { Card } from "@/ui/Card"
import { Screen } from "@/ui/Screen"
import { EmptyState } from "@/ui/States"
import { Heading, Text } from "@/ui/Text"

export default function SavedScreen() {
	const { t } = useT()
	const theme = useTheme()
	const status = useAuthStatus()
	const { signIn, pending } = useSignIn()
	const groups = useFavouritesStore((s) => s.groups)
	const ensureDefault = useFavouritesStore((s) => s.ensureDefault)
	const sorted = [...groups].sort((a, b) => a.position - b.position)
	const total = groups.reduce((n, g) => n + g.items.length, 0)

	useEffect(() => {
		ensureDefault()
	}, [ensureDefault])

	return (
		<Screen
			title={t("saved.title")}
			eyebrow={t("saved.eyebrow")}
			right={<Button label={t("saved.newGroup")} size="sm" variant="secondary" icon={<Plus size={16} color={theme.colors.ink} />} onPress={() => router.push("/group-edit")} />}
		>
			<View style={styles.list}>
				{total === 0 ? (
					<EmptyState icon={<Bookmark size={28} color={theme.colors.accent} />} title={t("saved.empty")} body={t("saved.emptyBody")} />
				) : null}
				<DragList
					items={sorted}
					keyOf={(g) => g.id}
					labelOf={(g) => g.name}
					separator={<View style={styles.gap} />}
					onMove={(from, to) => {
						const g = sorted[from]
						if (g) useFavouritesStore.getState().moveGroupTo(g.id, to)
					}}
					renderItem={(g, _i, handle, a11y) => (
					<Pressable
						testID={`saved-group-${g.id}`}
						accessibilityRole="button"
						accessibilityLabel={`${g.name}, ${t("saved.items", { count: g.items.length })}`}
						onPress={() => router.push({ pathname: "/saved/[groupId]", params: { groupId: g.id } })}
						{...a11y}
					>
						<Card padded={false} style={styles.card}>
							<View style={[styles.bar, { backgroundColor: theme.groupColor(g.colour) }]} />
							<View style={styles.body}>
								<Heading level={3} numberOfLines={1}>
									{g.name}
								</Heading>
								<Text variant="caption" color="inkMuted" numberOfLines={1}>
									{g.items.length ? g.items.slice(0, 3).map((i) => i.label).join(" · ") : t("saved.groupEmpty")}
								</Text>
								<Text variant="caption" color="inkSubtle">
									{t("saved.items", { count: g.items.length })}
								</Text>
							</View>
							{g.items.some((i) => i.kind === "route") ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={`${t("saved.liveMap")}: ${g.name}`}
									hitSlop={8}
									onPress={() => router.push({ pathname: "/group-map/[groupId]", params: { groupId: g.id } })}
									style={[styles.pill, { backgroundColor: theme.colors.cta }]}
								>
									<MapIcon size={14} color={theme.colors.onCta} />
									<Text variant="caption" style={{ color: theme.colors.onCta }}>
										{t("saved.liveMap")}
									</Text>
								</Pressable>
							) : null}
							{handle}
						</Card>
					</Pressable>
					)}
				/>
				{status === "signed_out" ? (
					<Card tone="muted" style={styles.footer}>
						<Text color="inkMuted">{t("saved.signInFooter")}</Text>
						<Button label={t("common:actions.signIn")} variant="secondary" loading={pending} onPress={() => void signIn()} />
					</Card>
				) : null}
				<SyncStatusLine />
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	list: { paddingHorizontal: 16, gap: 12, paddingTop: 8, paddingBottom: 32 },
	card: { flexDirection: "row", alignItems: "center", overflow: "hidden" },
	bar: { width: 6, alignSelf: "stretch" },
	body: { flex: 1, padding: 16, gap: 2 },
	pill: { flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 999, marginRight: 4 },
	footer: { gap: 12 },
	gap: { height: 12 },
})
