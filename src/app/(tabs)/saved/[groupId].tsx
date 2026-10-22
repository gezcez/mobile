// Saved group detail: its items (opening the stop or route), drag to reorder, remove with undo,
// edit the group, and the group's live map.

import { router, useLocalSearchParams } from "expo-router"
import { Map as MapIcon, Pencil, Trash2 } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { GroupDot } from "@/features/favourites/GroupDot"
import { SavedItemRow } from "@/features/favourites/SavedItemRow"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { useCurrentNetworks } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { usePackIndexes } from "@/pack/packStore"
import { useTheme } from "@/theme/theme"
import { Button, IconButton } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { DragList } from "@/ui/DragList"
import { Divider } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { EmptyState } from "@/ui/States"
import { toast } from "@/ui/Toast"

export default function GroupScreen() {
	const { groupId } = useLocalSearchParams<{ groupId: string }>()
	const { t } = useT()
	const theme = useTheme()
	const group = useFavouritesStore((s) => s.groups.find((g) => g.id === groupId))
	const { all } = useCurrentNetworks()
	const { indexes } = usePackIndexes(all)

	if (!group)
		return (
			<Screen back title={t("saved.title")}>
				<EmptyState title={t("saved.groupEmpty")} />
			</Screen>
		)

	const remove = (itemId: string, label: string) => {
		const removed = useFavouritesStore.getState().removeItem(itemId)
		if (removed)
			toast(t("saved.removed", { label }), {
				action: { label: t("common:actions.undo"), onPress: () => useFavouritesStore.getState().restoreItem(removed) },
			})
	}

	return (
		<Screen
			back
			title={group.name}
			eyebrow={t("saved.items", { count: group.items.length })}
			right={
				<IconButton
					label={t("groupEdit.editTitle")}
					icon={<Pencil size={20} color={theme.colors.ink} />}
					onPress={() => router.push({ pathname: "/group-edit", params: { id: group.id } })}
				/>
			}
		>
			<View style={styles.wrap}>
				<View style={styles.meta}>
					<GroupDot colour={group.colour} size={14} />
					{group.items.some((i) => i.kind === "route") ? (
						<Button
							label={t("saved.liveMap")}
							size="sm"
							icon={<MapIcon size={16} color={theme.colors.onCta} />}
							onPress={() => router.push({ pathname: "/group-map/[groupId]", params: { groupId: group.id } })}
						/>
					) : null}
				</View>
				{group.items.length === 0 ? (
					<EmptyState title={t("saved.groupEmpty")} body={t("saved.emptyBody")} />
				) : (
					<Card padded={false}>
						<DragList
							items={group.items}
							keyOf={(item) => item.id}
							labelOf={(item) => item.label}
							separator={<Divider inset={16} />}
							onMove={(from, to) => {
								const item = group.items[from]
								if (item) useFavouritesStore.getState().moveItemTo(group.id, item.id, to)
							}}
							renderItem={(item, _i, handle, a11y) => (
								<SavedItemRow
									item={item}
									indexes={indexes}
									a11y={a11y}
									trailing={
										<View style={styles.actions}>
											<IconButton
												label={`${t("saved.removeItem")}: ${item.label}`}
												icon={<Trash2 size={18} color={theme.colors.danger} />}
												onPress={() => remove(item.id, item.label)}
											/>
											{handle}
										</View>
									}
								/>
							)}
						/>
					</Card>
				)}
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	wrap: { paddingHorizontal: 16, gap: 12, paddingBottom: 32 },
	meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40 },
	actions: { flexDirection: "row", alignItems: "center" },
})
