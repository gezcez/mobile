import type { W } from "@/api/wire"
import { resetSyncState, syncFavourites, type SyncTransport } from "./sync"
import { useFavouritesStore } from "./useFavouritesStore"

const ACCOUNT = "01JACCOUNT"
const T0 = "2026-10-01T10:00:00.000Z"

function server(initial?: Partial<W["FavouritesDoc"]>) {
	let doc: W["FavouritesDoc"] = { version: 1, updated_at: T0, groups: [], tombstones: [], ...initial }
	const calls = { get: 0, put: 0 }
	let conflictOnce = false
	const t: SyncTransport & { doc: () => W["FavouritesDoc"]; calls: typeof calls; conflictNext: () => void; bump: (d: W["FavouritesDoc"]) => void } = {
		get: async () => (calls.get++, structuredClone(doc)),
		put: async (d, ifMatch) => {
			calls.put++
			if (conflictOnce) {
				conflictOnce = false
				doc = { ...doc, version: doc.version + 1 }
				throw Object.assign(new Error("conflict"), { status: 412 })
			}
			if (ifMatch !== doc.version) throw Object.assign(new Error("conflict"), { status: 412 })
			doc = { ...structuredClone(d), version: doc.version + 1 }
			return structuredClone(doc)
		},
		doc: () => doc,
		calls,
		conflictNext: () => {
			conflictOnce = true
		},
		bump: (d) => {
			doc = d
		},
	}
	return t
}

const remoteGroup = (id: string, items: string[] = []): W["FavouriteGroup"] => ({
	id,
	name: "Work",
	colour: "navy",
	position: 0,
	updated_at: T0,
	items: items.map((ref) => ({ id: `i-${ref}`, kind: "stop", network_id: "kocaeli-bus", ref_id: ref, label: ref, added_at: T0, updated_at: T0 })),
})

beforeEach(() => {
	resetSyncState()
	useFavouritesStore.setState({ groups: [], tombstones: [], defaultGroupId: null, dirty: false, version: null, accountId: null, syncStatus: "idle" })
})

describe("favourites sync", () => {
	it("does nothing signed out", async () => {
		const s = server()
		expect(await syncFavourites(s, null)).toBe("skipped")
		expect(s.calls.get).toBe(0)
	})

	it("folds guest items into the account's first group on first sign-in", async () => {
		const st = useFavouritesStore.getState()
		const def = st.ensureDefault()
		st.addItem(def, { kind: "stop", networkId: "kocaeli-bus", refId: "A", label: "A" })
		const s = server({ groups: [remoteGroup("g-remote", ["B"])] })
		expect(await syncFavourites(s, ACCOUNT)).toBe("synced")
		const after = useFavouritesStore.getState()
		expect(after.accountId).toBe(ACCOUNT)
		expect(after.version).toBe(2)
		expect(after.dirty).toBe(false)
		expect(after.groups).toHaveLength(1)
		expect(after.groups[0]!.items.map((i) => i.refId).sort()).toEqual(["A", "B"])
		expect(after.defaultGroupId).toBe("g-remote")
		expect(s.doc().groups[0]!.items).toHaveLength(2)
	})

	it("pulls without a PUT when nothing changed locally", async () => {
		useFavouritesStore.setState({ accountId: ACCOUNT, version: 1 })
		const s = server({ version: 3, groups: [remoteGroup("g1", ["X"])] })
		expect(await syncFavourites(s, ACCOUNT)).toBe("unchanged")
		expect(s.calls.put).toBe(0)
		expect(useFavouritesStore.getState().groups[0]!.items[0]!.refId).toBe("X")
		expect(useFavouritesStore.getState().version).toBe(3)
	})

	it("merges and retries once on 412", async () => {
		useFavouritesStore.setState({ accountId: ACCOUNT, version: 1 })
		const s = server({ groups: [remoteGroup("g1")] })
		await syncFavourites(s, ACCOUNT)
		useFavouritesStore.getState().addItem("g1", { kind: "route", networkId: "kocaeli-bus", refId: "R1", label: "R1" })
		s.conflictNext()
		expect(await syncFavourites(s, ACCOUNT)).toBe("synced")
		expect(s.calls.put).toBe(2)
		expect(s.doc().groups[0]!.items.map((i) => i.ref_id)).toEqual(["R1"])
	})

	it("reports offline on network errors and keeps the local change dirty", async () => {
		useFavouritesStore.setState({ accountId: ACCOUNT, version: 1 })
		const def = useFavouritesStore.getState().ensureDefault()
		useFavouritesStore.getState().addItem(def, { kind: "stop", networkId: "kocaeli-bus", refId: "A", label: "A" })
		const failing: SyncTransport = { get: () => Promise.reject(Object.assign(new Error("net"), { status: 0, code: "NETWORK" })), put: jest.fn() }
		expect(await syncFavourites(failing, ACCOUNT)).toBe("failed")
		expect(useFavouritesStore.getState().syncStatus).toBe("offline")
		expect(useFavouritesStore.getState().dirty).toBe(true)
	})

	it("propagates deletes through tombstones", async () => {
		useFavouritesStore.setState({ accountId: ACCOUNT, version: 1 })
		const s = server({ groups: [remoteGroup("g1", ["A", "B"])] })
		await syncFavourites(s, ACCOUNT)
		useFavouritesStore.getState().removeItem("i-A")
		await syncFavourites(s, ACCOUNT)
		expect(s.doc().groups[0]!.items.map((i) => i.ref_id)).toEqual(["B"])
		expect(s.doc().tombstones.map((t) => t.id)).toContain("i-A")
	})
})
