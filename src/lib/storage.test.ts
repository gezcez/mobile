import AsyncStorage from "@react-native-async-storage/async-storage"
import { createKV, zustandStorage } from "./storage"
import { createMemoryKV } from "./kv"

describe("createKV", () => {
	it("uses MMKV outside Expo Go", () => {
		const fake = { getString: jest.fn(), set: jest.fn(), remove: jest.fn(), clearAll: jest.fn(), getAllKeys: jest.fn() }
		const create = jest.fn(() => fake)
		const kv = createKV("gezcez.secure", { expoGo: false, encryptionKey: "k", createMMKV: () => create as never })
		expect(kv).toBe(fake)
		expect(create).toHaveBeenCalledWith({ id: "gezcez.secure", encryptionKey: "k" })
	})

	it("never touches MMKV in Expo Go", () => {
		const loader = jest.fn()
		const kv = createKV("gezcez.query", { expoGo: true, createMMKV: loader })
		expect(loader).not.toHaveBeenCalled()
		kv.set("a", "1")
		expect(kv.getString("a")).toBe("1")
	})

	it("persists the default instance to AsyncStorage in Expo Go", async () => {
		await AsyncStorage.setItem("gezcez.test:gz.prefs", '{"v":1}')
		const kv = createKV("gezcez.test", { expoGo: true, persist: true }) as ReturnType<typeof createMemoryKV>
		await kv.ready
		expect(kv.getString("gz.prefs")).toBe('{"v":1}')
		kv.set("gz.city", "kocaeli")
		await new Promise((r) => setTimeout(r, 0))
		await expect(AsyncStorage.getItem("gezcez.test:gz.city")).resolves.toBe("kocaeli")
	})
})

describe("zustandStorage", () => {
	it("reads synchronously from MMKV-like stores", () => {
		const kv = createMemoryKV()
		const plain = { getString: kv.getString, set: kv.set, remove: kv.remove, clearAll: kv.clearAll, getAllKeys: kv.getAllKeys }
		plain.set("x", "1")
		expect(zustandStorage(plain).getItem("x")).toBe("1")
	})

	it("waits for an AsyncStorage-backed store to load before reading", async () => {
		let release!: () => void
		const gate = new Promise<void>((r) => (release = r))
		const backing = {
			getAllKeys: async () => {
				await gate
				return ["p:x"]
			},
			multiGet: async () => [["p:x", "saved"] as const],
			setItem: async () => {},
			removeItem: async () => {},
			multiRemove: async () => {},
		}
		const read = zustandStorage(createMemoryKV({ backing, prefix: "p:" })).getItem("x")
		expect(read).toBeInstanceOf(Promise)
		release()
		await expect(read).resolves.toBe("saved")
	})
})
