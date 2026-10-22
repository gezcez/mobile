import { memoryFileStore } from "./fileStore"
import { loadPack } from "./packStore"
import { setTransportFetch } from "@/lib/transport"
import { createMockFetch } from "@/mock/fetch"

describe("loadPack", () => {
	it("downloads, stores, reuses the matching version and prunes old ones", async () => {
		const fetchSpy = jest.fn(createMockFetch())
		setTransportFetch(fetchSpy as unknown as typeof fetch)
		const store = memoryFileStore()
		await store.write("kocaeli-bus", "old", JSON.stringify({ network: "kocaeli-bus", pack_version: "old", built_at: "", stops: [], routes: [] }))

		const p1 = await loadPack("kocaeli-bus", "mock-kocaeli-bus-1", store)
		expect(p1.stops.length).toBeGreaterThan(10)
		expect(fetchSpy).toHaveBeenCalledTimes(1)
		expect(store.list().map((f) => f.version)).toEqual(["mock-kocaeli-bus-1"])

		const p2 = await loadPack("kocaeli-bus", "mock-kocaeli-bus-1", store)
		expect(p2.routes.length).toBe(p1.routes.length)
		expect(fetchSpy).toHaveBeenCalledTimes(1)
	})

	it("falls back to an older file when offline", async () => {
		setTransportFetch(async () => {
			throw new TypeError("Network request failed")
		})
		const store = memoryFileStore()
		await store.write("kocaeli-bus", "v1", JSON.stringify({ network: "kocaeli-bus", pack_version: "v1", built_at: "", stops: [], routes: [] }))
		const p = await loadPack("kocaeli-bus", "v2", store)
		expect(p.version).toBe("v1")
		await expect(loadPack("bursa-bus", "v1", store)).rejects.toMatchObject({ code: "NETWORK" })
	})
})
