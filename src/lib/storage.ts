// storage.ts
// MMKV instances, the zustand StateStorage adapter and the TanStack Query persister storage.
// Tokens never go here (SecureStore only, see src/auth/storage.ts). Card numbers use the encrypted
// instance whose key lives in SecureStore.
// Expo Go has no MMKV (Nitro), so there the same KV surface is a Map: the default instance writes
// through to AsyncStorage, the query cache and card numbers stay in memory (see lib/expoGo.ts).

import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import type { MMKV } from "react-native-mmkv"
import type { StateStorage } from "zustand/middleware"
import { IS_EXPO_GO } from "./expoGo"
import { createMemoryKV, type KV, type MemoryKV } from "./kv"

export type { KV } from "./kv"

type CreateMMKV = (config: { id: string; encryptionKey?: string }) => MMKV

/** Loaded lazily so Expo Go never evaluates the Nitro module. */
function mmkv(): CreateMMKV {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return (require("react-native-mmkv") as { createMMKV: CreateMMKV }).createMMKV
}

/** Picks MMKV or the Expo Go stand-in. Exported for tests. */
export function createKV(
	id: string,
	opts: { expoGo: boolean; persist?: boolean; encryptionKey?: string; createMMKV?: () => CreateMMKV },
): KV | MemoryKV {
	if (opts.expoGo) return createMemoryKV(opts.persist ? { backing: AsyncStorage, prefix: `${id}:` } : {})
	const create = (opts.createMMKV ?? mmkv)()
	return create(opts.encryptionKey ? { id, encryptionKey: opts.encryptionKey } : { id })
}

export const kv: KV = createKV("gezcez.default", { expoGo: IS_EXPO_GO, persist: true })

/** Query cache lives in its own instance so "Clear cache" can wipe it without touching prefs. */
export const queryKv: KV = createKV("gezcez.query", { expoGo: IS_EXPO_GO })

/**
 * zustand adapter. A store backed by AsyncStorage answers reads after its load finishes, so persisted
 * stores hydrate from the saved values instead of overwriting them with the initial state.
 */
export const zustandStorage = (store: KV = kv): StateStorage => {
	const ready = "ready" in store ? (store as MemoryKV).ready : null
	return {
		getItem: ready ? (name) => ready.then(() => store.getString(name) ?? null) : (name) => store.getString(name) ?? null,
		setItem: (name, value) => store.set(name, value),
		removeItem: (name) => {
			store.remove(name)
		},
	}
}

/** Sync storage shape expected by @tanstack/query-sync-storage-persister. */
export const queryPersisterStorage = {
	getItem: (key: string) => queryKv.getString(key) ?? null,
	setItem: (key: string, value: string) => queryKv.set(key, value),
	removeItem: (key: string) => {
		queryKv.remove(key)
	},
}

const SECURE_KV_KEY = "gz.mmkv.key"
let secureKv: Promise<KV> | null = null

function randomKey(): string {
	// 16 random bytes as hex. AES-128 in MMKV takes up to 16 bytes of key material.
	const bytes = Crypto.getRandomBytes(16)
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 16)
}

/**
 * Encrypted MMKV for card numbers. The key is created once and kept in SecureStore. In Expo Go card
 * numbers live in memory only, so they are never written unencrypted.
 */
export function getSecureKv(): Promise<KV> {
	secureKv ??= (async () => {
		if (IS_EXPO_GO) return createKV("gezcez.secure", { expoGo: true })
		let key = await SecureStore.getItemAsync(SECURE_KV_KEY)
		if (!key) {
			key = randomKey()
			await SecureStore.setItemAsync(SECURE_KV_KEY, key, {
				keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
			})
		}
		return createKV("gezcez.secure", { expoGo: false, encryptionKey: key })
	})()
	return secureKv
}
