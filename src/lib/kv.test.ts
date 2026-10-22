import { createMemoryKV, type AsyncBacking } from "./kv"

function fakeBacking(initial: Record<string, string> = {}) {
	const m = new Map(Object.entries(initial))
	const backing: AsyncBacking = {
		getAllKeys: async () => [...m.keys()],
		multiGet: async (keys) => keys.map((k) => [k, m.get(k) ?? null] as const),
		setItem: async (k, v) => {
			m.set(k, v)
		},
		removeItem: async (k) => {
			m.delete(k)
		},
		multiRemove: async (keys) => {
			for (const k of keys) m.delete(k)
		},
	}
	return { backing, m }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe("createMemoryKV", () => {
	it("works as a plain in-memory store without a backing", async () => {
		const kv = createMemoryKV()
		await kv.ready
		expect(kv.getString("a")).toBeUndefined()
		kv.set("a", "1")
		kv.set("b", "2")
		expect(kv.getString("a")).toBe("1")
		expect(kv.getAllKeys().sort()).toEqual(["a", "b"])
		expect(kv.remove("a")).toBe(true)
		expect(kv.remove("a")).toBe(false)
		kv.clearAll()
		expect(kv.getAllKeys()).toEqual([])
	})

	it("loads only its own prefix from the backing", async () => {
		const { backing } = fakeBacking({ "p:gz.city": "ist", "other:gz.city": "x" })
		const kv = createMemoryKV({ backing, prefix: "p:" })
		expect(kv.getString("gz.city")).toBeUndefined()
		await kv.ready
		expect(kv.getString("gz.city")).toBe("ist")
		expect(kv.getAllKeys()).toEqual(["gz.city"])
	})

	it("writes through under the prefix and removes from the backing", async () => {
		const { backing, m } = fakeBacking({ "other:k": "keep" })
		const kv = createMemoryKV({ backing, prefix: "p:" })
		await kv.ready
		kv.set("a", "1")
		kv.set("b", "2")
		await flush()
		expect(m.get("p:a")).toBe("1")
		kv.remove("a")
		await flush()
		expect(m.has("p:a")).toBe(false)
		kv.clearAll()
		await flush()
		expect([...m.keys()]).toEqual(["other:k"])
	})

	it("keeps writes made before the load finished", async () => {
		const { backing } = fakeBacking({ "p:a": "old", "p:b": "old" })
		const kv = createMemoryKV({ backing, prefix: "p:" })
		kv.set("a", "new")
		kv.remove("b")
		await kv.ready
		expect(kv.getString("a")).toBe("new")
		expect(kv.getString("b")).toBeUndefined()
	})

	it("starts empty and stays usable when the backing fails", async () => {
		const backing: AsyncBacking = {
			getAllKeys: async () => {
				throw new Error("boom")
			},
			multiGet: async () => [],
			setItem: async () => {
				throw new Error("full")
			},
			removeItem: async () => {},
			multiRemove: async () => {},
		}
		const kv = createMemoryKV({ backing, prefix: "p:" })
		await kv.ready
		kv.set("a", "1")
		await flush()
		expect(kv.getString("a")).toBe("1")
	})
})
