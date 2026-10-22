// merge.ts
// Merging two favourites documents (plan 3.3 and backend 6.11): by group and item id, last writer
// wins per entity on updatedAt, and a tombstone wins over any edit that is not newer than it.
// An item that moved groups is the same id in two groups; the newer copy decides where it lives.
// Pure, so it is unit tested directly.

import type { FavDoc, FavGroup, FavItem, Tombstone } from "./model"
import { TOMBSTONE_TTL_MS, itemKey } from "./model"

const t = (iso: string) => Date.parse(iso) || 0

export function mergeDocs(local: FavDoc, remote: FavDoc, nowMs = Date.now()): FavDoc {
	// Tombstones: union, newest per id, pruned after the TTL.
	const tomb = new Map<string, Tombstone>()
	for (const ts of [...remote.tombstones, ...local.tombstones]) {
		if (nowMs - t(ts.deletedAt) > TOMBSTONE_TTL_MS) continue
		const prev = tomb.get(ts.id)
		if (!prev || t(ts.deletedAt) > t(prev.deletedAt)) tomb.set(ts.id, ts)
	}
	const dead = (id: string, updatedAt: string) => {
		const ts = tomb.get(id)
		return !!ts && t(ts.deletedAt) >= t(updatedAt)
	}

	// Groups: newest metadata per id; remember which side won to keep that side's item order.
	const groupMeta = new Map<string, { g: FavGroup; side: "local" | "remote" }>()
	for (const [side, doc] of [["remote", remote], ["local", local]] as const)
		for (const g of doc.groups) {
			const prev = groupMeta.get(g.id)
			if (!prev || t(g.updatedAt) > t(prev.g.updatedAt)) groupMeta.set(g.id, { g, side })
		}

	// Items: newest copy per id decides content and group.
	const items = new Map<string, { item: FavItem; groupId: string; order: number; side: "local" | "remote" }>()
	for (const [side, doc] of [["remote", remote], ["local", local]] as const)
		for (const g of doc.groups)
			g.items.forEach((item, order) => {
				const prev = items.get(item.id)
				if (!prev || t(item.updatedAt) > t(prev.item.updatedAt))
					items.set(item.id, { item, groupId: g.id, order, side })
			})

	const groups: FavGroup[] = []
	for (const { g, side } of groupMeta.values()) {
		if (dead(g.id, g.updatedAt)) continue
		const own = [...items.values()]
			.filter((x) => x.groupId === g.id && !dead(x.item.id, x.item.updatedAt))
			.sort((a, b) => (a.side === b.side ? a.order - b.order : a.side === side ? -1 : 1) || t(a.item.addedAt) - t(b.item.addedAt))
		groups.push({ ...g, items: dedupeByKey(own.map((x) => x.item)) })
	}

	// Items whose group died or vanished go to the first group, so nothing saved is lost silently.
	const alive = new Set(groups.map((g) => g.id))
	const orphans = [...items.values()].filter((x) => !alive.has(x.groupId) && !dead(x.item.id, x.item.updatedAt)).map((x) => x.item)
	groups.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
	if (orphans.length && groups[0]) groups[0] = { ...groups[0], items: dedupeByKey([...groups[0].items, ...orphans]) }

	return { groups: groups.map((g, i) => ({ ...g, position: i })), tombstones: [...tomb.values()] }
}

/** The same stop or route saved twice in one group (by two devices) is kept once. */
function dedupeByKey(items: FavItem[]): FavItem[] {
	const seen = new Set<string>()
	return items.filter((i) => {
		const k = `${itemKey(i)}:${i.direction ?? ""}`
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
}

/**
 * First sign-in: the guest's local document joins the account's (union, no prompt). The local
 * default group folds into the account's first group so the rider does not end up with two
 * "Favourites" groups.
 */
export function unionOnSignIn(local: FavDoc, localDefaultId: string | null, remote: FavDoc, nowMs = Date.now()): { doc: FavDoc; defaultId: string | null } {
	const remoteFirst = [...remote.groups].sort((a, b) => a.position - b.position)[0]
	if (!remoteFirst) return { doc: mergeDocs(local, remote, nowMs), defaultId: localDefaultId }
	const nowIso = new Date(nowMs).toISOString()
	const groups = local.groups.flatMap((g) => {
		if (g.id !== localDefaultId) return [g]
		if (g.items.length === 0) return []
		return [{ ...remoteFirst, updatedAt: remoteFirst.updatedAt, items: g.items.map((i) => ({ ...i, updatedAt: nowIso })) }]
	})
	// The folded copy of the remote group carries only local items; merge keeps the remote ones too
	// because each item is matched by id, and the group metadata stays the remote's.
	const merged = mergeDocs({ groups: groups.filter((g) => g.id !== remoteFirst.id), tombstones: local.tombstones }, remote, nowMs)
	const extra = groups.find((g) => g.id === remoteFirst.id)?.items ?? []
	const doc = {
		...merged,
		groups: merged.groups.map((g) => (g.id === remoteFirst.id ? { ...g, items: dedupeByKey([...g.items, ...extra]) } : g)),
	}
	return { doc, defaultId: remoteFirst.id }
}
