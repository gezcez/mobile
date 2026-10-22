// params.ts
// Route params for the save-to-group sheet and the group editor, which can carry a pending item so
// "New group" from the sheet saves the stop into the group it just created.

import type { NewItem } from "./useFavouritesStore"

export type PendingItemParams = { kind?: string; networkId?: string; refId?: string; label?: string; dir?: string }

export function pendingItem(p: PendingItemParams): NewItem | null {
	if ((p.kind !== "stop" && p.kind !== "route") || !p.networkId || !p.refId) return null
	return {
		kind: p.kind,
		networkId: p.networkId,
		refId: p.refId,
		label: p.label ?? p.refId,
		...(p.dir === "0" || p.dir === "1" ? { direction: Number(p.dir) as 0 | 1 } : {}),
	}
}

export function itemParams(i: NewItem): Record<string, string> {
	return {
		kind: i.kind,
		networkId: i.networkId,
		refId: i.refId,
		label: i.label,
		...(i.direction !== undefined ? { dir: String(i.direction) } : {}),
	}
}
