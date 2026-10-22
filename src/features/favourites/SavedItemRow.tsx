// SavedItemRow.tsx
// One saved stop or route: route badge from the pack when it is loaded, else a kind icon.

import { router } from "expo-router"
import { ChevronRight, MapPin } from "lucide-react-native"
import type { ReactNode } from "react"
import { useT } from "@/i18n/useT"
import type { PackIndex } from "@/pack/packIndex"
import { useTheme } from "@/theme/theme"
import { ListRow } from "@/ui/ListRow"
import { RouteBadge } from "@/ui/RouteBadge"
import type { FavItem } from "./model"

export function openItem(item: FavItem) {
	if (item.kind === "stop") router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId: item.networkId, stopId: item.refId } })
	else
		router.push({
			pathname: "/route/[networkId]/[routeId]",
			params: { networkId: item.networkId, routeId: item.refId, ...(item.direction !== undefined ? { dir: String(item.direction) } : {}) },
		})
}

export function SavedItemRow({ item, indexes, trailing }: { item: FavItem; indexes: readonly PackIndex[]; trailing?: ReactNode }) {
	const { t } = useT()
	const theme = useTheme()
	const idx = indexes.find((i) => i.networkId === item.networkId)
	const route = item.kind === "route" ? idx?.routeById.get(item.refId) : undefined
	const dir = route?.directions.find((d) => d.direction === item.direction)
	return (
		<ListRow
			title={route ? route.longName : item.label}
			subtitle={[item.kind === "stop" ? t("saved.kindStop") : t("saved.kindRoute"), dir ? t("route.directionTo", { headsign: dir.headsign }) : null].filter(Boolean).join(" · ")}
			leading={
				route ? (
					<RouteBadge shortName={route.shortName} color={route.color} textColor={route.textColor} mode={route.mode} size="sm" />
				) : (
					<MapPin size={20} color={theme.colors.accent} />
				)
			}
			trailing={trailing ?? <ChevronRight size={18} color={theme.colors.iconSubtle} />}
			onPress={() => openItem(item)}
		/>
	)
}
