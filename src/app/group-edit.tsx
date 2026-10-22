// Group editor (modal): name and colour. With `id` it edits; without, it creates and, when the
// params carry an item (from the save sheet), saves the item into the new group.

import { router, useLocalSearchParams } from "expo-router"
import { Check } from "lucide-react-native"
import { useState } from "react"
import { Alert, Pressable, StyleSheet, View } from "react-native"
import { pendingItem, type PendingItemParams } from "@/features/favourites/params"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { GROUP_COLOR_KEYS, palette, type GroupColor } from "@/theme/tokens"
import { Button } from "@/ui/Button"
import { Screen } from "@/ui/Screen"
import { Text } from "@/ui/Text"
import { TextField } from "@/ui/TextField"
import { toast } from "@/ui/Toast"

export default function GroupEditScreen() {
	const params = useLocalSearchParams<PendingItemParams & { id?: string }>()
	const { t } = useT()
	const theme = useTheme()
	const existing = useFavouritesStore((s) => s.groups.find((g) => g.id === params.id))
	const isDefault = useFavouritesStore((s) => s.defaultGroupId === params.id)
	const [name, setName] = useState(existing?.name ?? "")
	const [colour, setColour] = useState<GroupColor>(existing?.colour ?? "teal")
	const valid = name.trim().length > 0 && name.trim().length <= 40

	const save = () => {
		const s = useFavouritesStore.getState()
		if (existing) s.updateGroup(existing.id, { name, colour })
		else {
			const id = s.createGroup(name, colour)
			const item = pendingItem(params)
			if (item) {
				s.addItem(id, item)
				toast(t("saveToGroup.savedIn", { group: name.trim() }))
			}
		}
		router.back()
	}

	const remove = () => {
		if (!existing) return
		Alert.alert(t("saved.deleteGroup"), t("saved.deleteGroupConfirm", { name: existing.name }), [
			{ text: t("common:actions.cancel"), style: "cancel" },
			{
				text: t("common:actions.delete"),
				style: "destructive",
				onPress: () => {
					useFavouritesStore.getState().deleteGroup(existing.id)
					router.dismissTo("/saved")
				},
			},
		])
	}

	return (
		<Screen back title={existing ? t("groupEdit.editTitle") : t("groupEdit.createTitle")} edges={["top", "bottom"]}>
			<View style={styles.body}>
				<TextField
					label={t("groupEdit.name")}
					placeholder={t("groupEdit.namePlaceholder")}
					value={name}
					onChangeText={setName}
					maxLength={40}
					autoFocus={!existing}
					returnKeyType="done"
					onSubmitEditing={() => valid && save()}
				/>
				<Text variant="caption" color="inkMuted">
					{t("groupEdit.colour")}
				</Text>
				<View style={styles.swatches} accessibilityRole="radiogroup">
					{GROUP_COLOR_KEYS.map((key) => (
						<Pressable
							key={key}
							accessibilityRole="radio"
							accessibilityLabel={t(`groupEdit.colours.${key}`)}
							accessibilityState={{ checked: colour === key }}
							onPress={() => setColour(key)}
							style={[styles.swatch, { backgroundColor: theme.groupColor(key), borderColor: colour === key ? theme.colors.ink : "transparent" }]}
						>
							{colour === key ? <Check size={20} color={theme.scheme === "dark" ? palette.navy : palette.white} /> : null}
						</Pressable>
					))}
				</View>
				<Button label={t("common:actions.save")} onPress={save} disabled={!valid} fullWidth />
				{existing && !isDefault ? <Button label={t("saved.deleteGroup")} variant="danger" onPress={remove} fullWidth /> : null}
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	body: { padding: 16, gap: 16 },
	swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: "center", justifyContent: "center" },
})
