import { useFavouritesStore } from "./useFavouritesStore"

const stop = { kind: "stop" as const, networkId: "kocaeli-bus", refId: "4.41001", label: "Otogar" }

beforeEach(() => {
	useFavouritesStore.setState({ groups: [], tombstones: [], defaultGroupId: null, dirty: false, version: null, accountId: null })
})

describe("useFavouritesStore", () => {
	it("creates one default group and saves an item once", () => {
		const s = useFavouritesStore.getState()
		const id = s.ensureDefault()
		expect(s.ensureDefault()).toBe(id)
		s.addItem(id, stop)
		s.addItem(id, stop)
		const g = useFavouritesStore.getState().groups
		expect(g).toHaveLength(1)
		expect(g[0]!.colour).toBe("amber")
		expect(g[0]!.items).toHaveLength(1)
		expect(useFavouritesStore.getState().dirty).toBe(true)
	})

	it("removes with a tombstone and restores in place", () => {
		const s = useFavouritesStore.getState()
		const id = s.ensureDefault()
		s.addItem(id, stop)
		s.addItem(id, { ...stop, refId: "4.41002", label: "Umuttepe" })
		const first = useFavouritesStore.getState().groups[0]!.items[0]!
		const removed = s.removeItem(first.id)!
		expect(useFavouritesStore.getState().tombstones.map((t) => t.id)).toEqual([first.id])
		s.restoreItem(removed)
		const st = useFavouritesStore.getState()
		expect(st.groups[0]!.items[0]!.id).toBe(first.id)
		expect(st.tombstones).toEqual([])
	})

	it("never deletes the default group and tombstones a deleted group's items", () => {
		const s = useFavouritesStore.getState()
		const def = s.ensureDefault()
		s.deleteGroup(def)
		expect(useFavouritesStore.getState().groups).toHaveLength(1)
		const work = s.createGroup(" Work ", "teal")
		s.addItem(work, stop)
		s.deleteGroup(work)
		const st = useFavouritesStore.getState()
		expect(st.groups.map((g) => g.id)).toEqual([def])
		expect(st.tombstones).toHaveLength(2)
	})

	it("moves items and groups", () => {
		const s = useFavouritesStore.getState()
		const def = s.ensureDefault()
		const work = s.createGroup("Work", "navy")
		s.moveGroup(work, -1)
		expect(useFavouritesStore.getState().groups.map((g) => g.id)).toEqual([work, def])
		s.addItem(def, stop)
		s.addItem(def, { ...stop, refId: "x" })
		const [a, b] = useFavouritesStore.getState().groups[1]!.items
		s.moveItem(def, b!.id, -1)
		expect(useFavouritesStore.getState().groups[1]!.items.map((i) => i.id)).toEqual([b!.id, a!.id])
	})
})

describe("drag reorder", () => {
	it("moves an item to an index and a group to a position", () => {
		const s = useFavouritesStore.getState()
		const def = s.ensureDefault()
		for (const ref of ["A", "B", "C"]) s.addItem(def, { ...stop, refId: ref, label: ref })
		const c = useFavouritesStore.getState().groups[0]!.items[2]!
		s.moveItemTo(def, c.id, 0)
		expect(useFavouritesStore.getState().groups[0]!.items.map((i) => i.refId)).toEqual(["C", "A", "B"])
		const work = s.createGroup("Work", "navy")
		s.moveGroupTo(work, 0)
		const sorted = [...useFavouritesStore.getState().groups].sort((a, b) => a.position - b.position)
		expect(sorted.map((g) => g.id)).toEqual([work, def])
	})
})
