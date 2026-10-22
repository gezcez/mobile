import { mergeDocs, unionOnSignIn } from "./merge"
import type { FavDoc, FavGroup, FavItem } from "./model"

const NOW = Date.UTC(2026, 9, 21, 12)
const at = (min: number) => new Date(NOW - 60 * 60_000 + min * 60_000).toISOString()
const item = (id: string, ref: string, updated = 0): FavItem => ({
	id,
	kind: "stop",
	networkId: "kocaeli-bus",
	refId: ref,
	label: ref,
	addedAt: at(0),
	updatedAt: at(updated),
})
const group = (id: string, items: FavItem[], extra: Partial<FavGroup> = {}): FavGroup => ({
	id,
	name: id,
	colour: "amber",
	position: 0,
	updatedAt: at(0),
	items,
	...extra,
})
const doc = (groups: FavGroup[], tombstones: FavDoc["tombstones"] = []): FavDoc => ({ groups, tombstones })

describe("mergeDocs", () => {
	it("unions groups and items from both sides", () => {
		const m = mergeDocs(doc([group("g1", [item("a", "1")])]), doc([group("g1", [item("b", "2")]), group("g2", [], { position: 1 })]), NOW)
		expect(m.groups.map((g) => g.id)).toEqual(["g1", "g2"])
		expect(m.groups[0]!.items.map((i) => i.id).sort()).toEqual(["a", "b"])
	})

	it("last writer wins per group on updatedAt", () => {
		const m = mergeDocs(
			doc([group("g1", [], { name: "Work", updatedAt: at(10) })]),
			doc([group("g1", [], { name: "Old", updatedAt: at(5) })]),
			NOW,
		)
		expect(m.groups[0]!.name).toBe("Work")
	})

	it("a tombstone wins over an older edit but not over a newer one", () => {
		const remote = doc([group("g1", [item("a", "1", 5), item("b", "2", 20)])])
		const local = doc([group("g1", [])], [
			{ id: "a", deletedAt: at(10) },
			{ id: "b", deletedAt: at(10) },
		])
		const m = mergeDocs(local, remote, NOW)
		expect(m.groups[0]!.items.map((i) => i.id)).toEqual(["b"])
	})

	it("an item moved to another group lives where its newest copy is", () => {
		const local = doc([group("g1", []), group("g2", [item("a", "1", 30)], { position: 1 })])
		const remote = doc([group("g1", [item("a", "1", 10)]), group("g2", [], { position: 1 })])
		const m = mergeDocs(local, remote, NOW)
		expect(m.groups.find((g) => g.id === "g1")!.items).toEqual([])
		expect(m.groups.find((g) => g.id === "g2")!.items.map((i) => i.id)).toEqual(["a"])
	})

	it("keeps items of a deleted group in the first group", () => {
		const local = doc([group("g1", [])], [{ id: "g2", deletedAt: at(10) }])
		const remote = doc([group("g1", []), group("g2", [item("x", "9", 20)], { position: 1, updatedAt: at(1) })])
		const m = mergeDocs(local, remote, NOW)
		expect(m.groups.map((g) => g.id)).toEqual(["g1"])
		expect(m.groups[0]!.items.map((i) => i.id)).toEqual(["x"])
	})

	it("drops tombstones older than 30 days and de-duplicates the same stop", () => {
		const old = new Date(NOW - 31 * 24 * 3600_000).toISOString()
		const m = mergeDocs(doc([group("g1", [item("a", "1")])], [{ id: "zzz", deletedAt: old }]), doc([group("g1", [item("b", "1")])]), NOW)
		expect(m.tombstones).toEqual([])
		expect(m.groups[0]!.items).toHaveLength(1)
	})
})

describe("unionOnSignIn", () => {
	it("folds the local default group into the account's first group", () => {
		const local = doc([group("local-default", [item("a", "1")]), group("mine", [item("b", "2")], { position: 1 })])
		const remote = doc([group("acct-default", [item("c", "3")], { name: "Favourites" })])
		const { doc: m, defaultId } = unionOnSignIn(local, "local-default", remote, NOW)
		expect(defaultId).toBe("acct-default")
		expect(m.groups.map((g) => g.id)).toEqual(["acct-default", "mine"])
		expect(m.groups[0]!.items.map((i) => i.id).sort()).toEqual(["a", "c"])
	})

	it("keeps the local document as is when the account is empty", () => {
		const local = doc([group("local-default", [item("a", "1")])])
		const { doc: m, defaultId } = unionOnSignIn(local, "local-default", doc([]), NOW)
		expect(defaultId).toBe("local-default")
		expect(m.groups[0]!.items).toHaveLength(1)
	})
})
