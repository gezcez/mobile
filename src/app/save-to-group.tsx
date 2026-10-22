// Save to group (form sheet): every group with a check if it holds this stop/route; tapping toggles.
// "New group" opens the editor, which saves the item into the new group.

import { router, useLocalSearchParams } from "expo-router"
import { Check, Plus } from "lucide-react-native"
import { useEffect } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { GroupDot } from "@/features/favourites/GroupDot"
import { itemKey } from "@/features/favourites/model"
import { itemParams, pendingItem, type PendingItemParams } from "@/features/favourites/params"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Heading } from "@/ui/Text"
import { toast } from "@/ui/Toast"

export default function SaveToGroupSheet() {
	const params = useLocalSearchParams<PendingItemParams>()
	const item = pendingItem(params)
	const { t } = useT()
	const theme = useTheme()
	const groups = useFavouritesStore((s) => s.groups)
	const ensureDefault = useFavouritesStore((s) => s.ensureDefault)

	useEffect(() => {
		ensureDefault()
	}, [ensureDefault])

	if (!item) return null
	const key = itemKey(item)

	const toggle = (groupId: string, name: string) => {
		const s = useFavouritesStore.getState()
		const g = s.groups.find((x) => x.id === groupId)
		const existing = g?.items.find((i) => itemKey(i) === key)
		if (existing) {
			const removed = s.removeItem(existing.id)
			if (removed)
				toast(t("saved.removed", { label: item.label }), {
					action: { label: t("common:actions.undo"), onPress: () => useFavouritesStore.getState().restoreItem(removed) },
				})
		} else {
			s.addItem(groupId, item)
			toast(t("saveToGroup.savedIn", { group: name }))
		}
	}

	return (
		<ScrollView contentContainerStyle={styles.content}>
			<Heading level={3} style={styles.title}>
				{t("saveToGroup.title")}
			</Heading>
			<Card padded={false}>
				{groups.map((g, i) => {
					const on = g.items.some((x) => itemKey(x) === key)
					return (
						<View key={g.id}>
							{i > 0 ? <Divider inset={48} /> : null}
							<ListRow
								title={g.name}
								subtitle={t("saved.items", { count: g.items.length })}
								leading={<GroupDot colour={g.colour} />}
								trailing={on ? <Check size={20} color={theme.colors.accent} /> : null}
								onPress={() => toggle(g.id, g.name)}
								accessibilityLabel={`${g.name}, ${on ? t("common:actions.saved") : ""}`}
							/>
						</View>
					)
				})}
			</Card>
			<View style={styles.footer}>
				<Button
					label={t("saveToGroup.newGroup")}
					variant="secondary"
					icon={<Plus size={18} color={theme.colors.ink} />}
					onPress={() => router.push({ pathname: "/group-edit", params: itemParams(item) })}
				/>
				<Button label={t("common:actions.done")} onPress={() => router.back()} />
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	content: { padding: 16, gap: 12 },
	title: { paddingHorizontal: 4 },
	footer: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 4 },
})
