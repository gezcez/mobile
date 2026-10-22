// kv.ts
// The synchronous key-value surface the app uses from MMKV, and a Map-backed stand-in for Expo Go.
// The stand-in can write through to an async backing store (AsyncStorage) and load it back once at
// start, so persisted zustand stores survive a reload in Expo Go.

export interface KV {
	getString(key: string): string | undefined
	set(key: string, value: string): void
	remove(key: string): boolean
	clearAll(): void
	getAllKeys(): string[]
}

/** The part of AsyncStorage the memory KV writes through to. */
export interface AsyncBacking {
	getAllKeys(): Promise<readonly string[]>
	multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>
	setItem(key: string, value: string): Promise<void>
	removeItem(key: string): Promise<void>
	multiRemove(keys: readonly string[]): Promise<void>
}

export interface MemoryKV extends KV {
	/** Resolves once the backing store has been loaded (at once when there is none). */
	ready: Promise<void>
}

/**
 * Map-backed KV. With `backing`, every write is mirrored under `prefix` (fire and forget; a failed
 * write only costs persistence) and existing entries are loaded at creation. Keys written before the
 * load finishes win over the loaded values.
 */
export function createMemoryKV(opts: { backing?: AsyncBacking; prefix?: string } = {}): MemoryKV {
	const { backing, prefix = "" } = opts
	const map = new Map<string, string>()
	const touched = new Set<string>()
	const mirror = (p: Promise<unknown> | undefined) => {
		p?.catch(() => {})
	}
	const ready: Promise<void> = backing
		? (async () => {
				try {
					const keys = (await backing.getAllKeys()).filter((k) => k.startsWith(prefix))
					if (keys.length === 0) return
					for (const [k, v] of await backing.multiGet(keys)) {
						const key = k.slice(prefix.length)
						if (v !== null && !touched.has(key)) map.set(key, v)
					}
				} catch {
					// Unreadable backing store: start empty.
				}
			})()
		: Promise.resolve()
	return {
		ready,
		getString: (key) => map.get(key),
		set: (key, value) => {
			touched.add(key)
			map.set(key, value)
			mirror(backing?.setItem(prefix + key, value))
		},
		remove: (key) => {
			touched.add(key)
			const had = map.delete(key)
			mirror(backing?.removeItem(prefix + key))
			return had
		},
		clearAll: () => {
			const keys = [...map.keys()]
			for (const k of keys) touched.add(k)
			map.clear()
			if (backing)
				mirror(
					backing
						.getAllKeys()
						.then((all) => backing.multiRemove(all.filter((k) => k.startsWith(prefix)))),
				)
		},
		getAllKeys: () => [...map.keys()],
	}
}
