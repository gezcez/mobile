// useFavouritesStore.ts
// Saved stops and routes in coloured groups. Local first (works signed out), persisted to MMKV;
// sync.ts pushes and pulls the same document when signed in. Every mutation stamps updatedAt and
// marks the document dirty; deletes leave tombstones so other devices learn about them.

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { i18n } from "@/i18n"
import { uuidv7 } from "@/lib/id"
import { zustandStorage } from "@/lib/storage"
import type { GroupColor } from "@/theme/tokens"
import { itemKey, TOMBSTONE_TTL_MS, type FavDoc, type FavGroup, type FavItem, type FavKind, type Tombstone } from "./model"

export type SyncStatus = "idle" | "syncing" | "error" | "offline"

export interface NewItem {
	kind: FavKind
	networkId: string
	refId: string
	label: string
	direction?: 0 | 1
}

export interface RemovedItem {
	item: FavItem
	groupId: string
	index: number
}

export interface FavouritesState extends FavDoc {
	defaultGroupId: string | null
	/** Server version the local document is based on, and the account it belongs to. */
	version: number | null
	accountId: string | null
	dirty: boolean
	lastSyncedAt: number | null
	syncStatus: SyncStatus

	ensureDefault: () => string
	createGroup: (name: string, colour: GroupColor) => string
	updateGroup: (id: string, patch: { name?: string; colour?: GroupColor }) => void
	deleteGroup: (id: string) => void
	moveGroup: (id: string, delta: -1 | 1) => void
	addItem: (groupId: string, item: NewItem) => void
	removeItem: (itemId: string) => RemovedItem | null
	restoreItem: (removed: RemovedItem) => void
	moveItem: (groupId: string, itemId: string, delta: -1 | 1) => void
	/** Removes every copy of a stop/route (the bookmark toggle "Remove from saved"). */
	removeEverywhere: (item: Pick<FavItem, "kind" | "networkId" | "refId">) => RemovedItem[]

	applySynced: (doc: FavDoc, version: number, accountId: string, defaultGroupId?: string | null) => void
	setSyncStatus: (s: SyncStatus) => void
	/** Signing out keeps the items on the device but forgets the account's version. */
	detachAccount: () => void
}

const now = () => new Date().toISOString()

function prune(ts: Tombstone[]): Tombstone[] {
	const cutoff = Date.now() - TOMBSTONE_TTL_MS
	return ts.filter((x) => Date.parse(x.deletedAt) > cutoff)
}

function swap<T>(arr: T[], i: number, j: number): T[] {
	if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr
	const out = [...arr]
	;[out[i], out[j]] = [out[j]!, out[i]!]
	return out
}

export const useFavouritesStore = create<FavouritesState>()(
	persist(
		(set, get) => {
			const edit = (fn: (s: FavouritesState) => Partial<FavouritesState>) =>
				set((s) => ({ ...fn(s), dirty: true }))
			return {
				groups: [],
				tombstones: [],
				defaultGroupId: null,
				version: null,
				accountId: null,
				dirty: false,
				lastSyncedAt: null,
				syncStatus: "idle",

				ensureDefault: () => {
					const s = get()
					const existing = s.groups.find((g) => g.id === s.defaultGroupId) ?? s.groups[0]
					if (existing) {
						if (s.defaultGroupId !== existing.id) set({ defaultGroupId: existing.id })
						return existing.id
					}
					const id = uuidv7()
					const group: FavGroup = { id, name: i18n.t("saved.defaultGroup"), colour: "amber", position: 0, updatedAt: now(), items: [] }
					edit((st) => ({ groups: [group, ...st.groups.map((g) => ({ ...g, position: g.position + 1 }))], defaultGroupId: id }))
					return id
				},

				createGroup: (name, colour) => {
					const id = uuidv7()
					edit((s) => ({
						groups: [...s.groups, { id, name: name.trim(), colour, position: s.groups.length, updatedAt: now(), items: [] }],
					}))
					return id
				},

				updateGroup: (id, patch) =>
					edit((s) => ({
						groups: s.groups.map((g) =>
							g.id === id ? { ...g, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}), ...(patch.colour ? { colour: patch.colour } : {}), updatedAt: now() } : g,
						),
					})),

				deleteGroup: (id) => {
					if (id === get().defaultGroupId) return
					edit((s) => {
						const g = s.groups.find((x) => x.id === id)
						if (!g) return {}
						const at = now()
						return {
							groups: s.groups.filter((x) => x.id !== id).map((x, i) => ({ ...x, position: i })),
							tombstones: prune([...s.tombstones, { id, deletedAt: at }, ...g.items.map((i) => ({ id: i.id, deletedAt: at }))]),
						}
					})
				},

				moveGroup: (id, delta) =>
					edit((s) => {
						const i = s.groups.findIndex((g) => g.id === id)
						const at = now()
						return { groups: swap(s.groups, i, i + delta).map((g, p) => (g.position === p ? g : { ...g, position: p, updatedAt: at })) }
					}),

				addItem: (groupId, item) =>
					edit((s) => ({
						groups: s.groups.map((g) => {
							if (g.id !== groupId) return g
							if (g.items.some((x) => itemKey(x) === itemKey(item) && x.direction === item.direction)) return g
							const at = now()
							return { ...g, items: [...g.items, { ...item, id: uuidv7(), addedAt: at, updatedAt: at }] }
						}),
					})),

				removeItem: (itemId) => {
					let removed: RemovedItem | null = null
					for (const g of get().groups) {
						const index = g.items.findIndex((i) => i.id === itemId)
						if (index >= 0) removed = { item: g.items[index]!, groupId: g.id, index }
					}
					if (!removed) return null
					const r = removed
					edit((s) => ({
						groups: s.groups.map((g) => (g.id === r.groupId ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g)),
						tombstones: prune([...s.tombstones, { id: itemId, deletedAt: now() }]),
					}))
					return removed
				},

				restoreItem: ({ item, groupId, index }) =>
					edit((s) => ({
						groups: s.groups.map((g) => {
							if (g.id !== groupId || g.items.some((i) => i.id === item.id)) return g
							const items = [...g.items]
							items.splice(Math.min(index, items.length), 0, { ...item, updatedAt: now() })
							return { ...g, items }
						}),
						tombstones: s.tombstones.filter((x) => x.id !== item.id),
					})),

				moveItem: (groupId, itemId, delta) =>
					edit((s) => ({
						groups: s.groups.map((g) => {
							if (g.id !== groupId) return g
							const i = g.items.findIndex((x) => x.id === itemId)
							return { ...g, items: swap(g.items, i, i + delta), updatedAt: now() }
						}),
					})),

				removeEverywhere: (target) => {
					const key = itemKey(target)
					const out: RemovedItem[] = []
					for (const g of get().groups)
						g.items.forEach((item, index) => {
							if (itemKey(item) === key) out.push({ item, groupId: g.id, index })
						})
					for (const r of out) get().removeItem(r.item.id)
					return out
				},

				applySynced: (doc, version, accountId, defaultGroupId) =>
					set((s) => {
						const def = defaultGroupId !== undefined ? defaultGroupId : s.defaultGroupId
						return {
							groups: doc.groups,
							tombstones: doc.tombstones,
							version,
							accountId,
							defaultGroupId: doc.groups.some((g) => g.id === def) ? def : (doc.groups[0]?.id ?? null),
							dirty: false,
							lastSyncedAt: Date.now(),
							syncStatus: "idle",
						}
					}),
				setSyncStatus: (syncStatus) => set({ syncStatus }),
				detachAccount: () => set({ version: null, accountId: null, lastSyncedAt: null, syncStatus: "idle", dirty: true }),
			}
		},
		{
			name: "gz.favourites",
			version: 1,
			storage: createJSONStorage(() => zustandStorage()),
			partialize: (s) => ({
				groups: s.groups,
				tombstones: s.tombstones,
				defaultGroupId: s.defaultGroupId,
				version: s.version,
				accountId: s.accountId,
				dirty: s.dirty,
				lastSyncedAt: s.lastSyncedAt,
			}),
		},
	),
)

/** Groups that contain this stop/route (for the filled bookmark and "Saved in Work"). */
export function useSavedIn(kind: FavKind, networkId: string, refId: string): FavGroup[] {
	const groups = useFavouritesStore((s) => s.groups)
	const key = itemKey({ kind, networkId, refId })
	return groups.filter((g) => g.items.some((i) => itemKey(i) === key))
}

export function docOf(s: Pick<FavouritesState, "groups" | "tombstones">): FavDoc {
	return { groups: s.groups, tombstones: s.tombstones }
}
