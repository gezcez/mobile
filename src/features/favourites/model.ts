// model.ts
// Favourites document (plan 3.3 / backend 6.11) in camelCase, and its wire mappers. A document holds
// groups of items (stops and routes, any network), plus tombstones for deletes so sync can tell a
// delete from "never seen".

import type { ManualSchemas as W } from "@/api/schema.manual"
import type { GroupColor } from "@/theme/tokens"

export type FavKind = "stop" | "route"

export interface FavItem {
	id: string
	kind: FavKind
	networkId: string
	refId: string
	label: string
	direction?: 0 | 1
	addedAt: string
	updatedAt: string
}

export interface FavGroup {
	id: string
	name: string
	colour: GroupColor
	position: number
	updatedAt: string
	items: FavItem[]
}

export interface Tombstone {
	id: string
	deletedAt: string
}

export interface FavDoc {
	groups: FavGroup[]
	tombstones: Tombstone[]
}

/** Tombstones are kept 30 days, like the server. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 3600_000

export const itemKey = (i: Pick<FavItem, "kind" | "networkId" | "refId">) => `${i.kind}:${i.networkId}:${i.refId}`

export const fromWireDoc = (d: W["FavouritesDoc"]): FavDoc & { version: number } => ({
	version: d.version,
	groups: d.groups.map((g) => ({
		id: g.id,
		name: g.name,
		colour: g.colour,
		position: g.position,
		updatedAt: g.updated_at ?? d.updated_at,
		items: g.items.map((i) => ({
			id: i.id,
			kind: i.kind,
			networkId: i.network_id,
			refId: i.ref_id,
			label: i.label,
			...(i.direction !== undefined ? { direction: i.direction } : {}),
			addedAt: i.added_at,
			updatedAt: i.updated_at ?? i.added_at,
		})),
	})),
	tombstones: d.tombstones.map((t) => ({ id: t.id, deletedAt: t.deleted_at })),
})

export const toWireDoc = (d: FavDoc, version: number, nowIso: string): W["FavouritesDoc"] => ({
	version,
	updated_at: nowIso,
	groups: d.groups.map((g) => ({
		id: g.id,
		name: g.name,
		colour: g.colour,
		position: g.position,
		updated_at: g.updatedAt,
		items: g.items.map((i) => ({
			id: i.id,
			kind: i.kind,
			network_id: i.networkId,
			ref_id: i.refId,
			label: i.label,
			...(i.direction !== undefined ? { direction: i.direction } : {}),
			added_at: i.addedAt,
			updated_at: i.updatedAt,
		})),
	})),
	tombstones: d.tombstones.map((t) => ({ id: t.id, deleted_at: t.deletedAt })),
})
