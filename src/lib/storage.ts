// storage.ts
// MMKV instances, the zustand StateStorage adapter and the TanStack Query persister storage.
// Tokens never go here (SecureStore only, see src/auth/storage.ts). Card numbers use the encrypted
// instance whose key lives in SecureStore. Expo Go has no MMKV (Nitro) module, so there every
// instance is an in-memory stand-in and nothing survives a reload.

import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import type { MMKV, createMMKV as CreateMMKV } from "react-native-mmkv"
import type { StateStorage } from "zustand/middleware"
import { isExpoGo } from "./expoGo"

/** The slice of MMKV the app uses, backed by a Map. */
function memoryMMKV(): MMKV {
	const m = new Map<string, string>()
	return {
		getString: (k: string) => m.get(k),
		set: (k: string, v: string) => void m.set(k, String(v)),
		remove: (k: string) => m.delete(k),
		clearAll: () => m.clear(),
		getAllKeys: () => [...m.keys()],
	} as unknown as MMKV
}

const createMMKV: typeof CreateMMKV = isExpoGo
	? () => memoryMMKV()
	: // eslint-disable-next-line @typescript-eslint/no-require-imports
		require("react-native-mmkv").createMMKV

export const kv: MMKV = createMMKV({ id: "gezcez.default" })

/** Query cache lives in its own instance so "Clear cache" can wipe it without touching prefs. */
export const queryKv: MMKV = createMMKV({ id: "gezcez.query" })

export const zustandStorage = (store: MMKV = kv): StateStorage => ({
	getItem: (name) => store.getString(name) ?? null,
	setItem: (name, value) => store.set(name, value),
	removeItem: (name) => {
		store.remove(name)
	},
})

/** Sync storage shape expected by @tanstack/query-sync-storage-persister. */
export const queryPersisterStorage = {
	getItem: (key: string) => queryKv.getString(key) ?? null,
	setItem: (key: string, value: string) => queryKv.set(key, value),
	removeItem: (key: string) => {
		queryKv.remove(key)
	},
}

const SECURE_KV_KEY = "gz.mmkv.key"
let secureKv: Promise<MMKV> | null = null

function randomKey(): string {
	// 16 random bytes as hex. AES-128 in MMKV takes up to 16 bytes of key material.
	const bytes = Crypto.getRandomBytes(16)
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 16)
}

/** Encrypted MMKV for card numbers. The key is created once and kept in SecureStore. */
export function getSecureKv(): Promise<MMKV> {
	secureKv ??= (async () => {
		let key = await SecureStore.getItemAsync(SECURE_KV_KEY)
		if (!key) {
			key = randomKey()
			await SecureStore.setItemAsync(SECURE_KV_KEY, key, {
				keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
			})
		}
		return createMMKV({ id: "gezcez.secure", encryptionKey: key })
	})()
	return secureKv
}
