// storage.ts
// AuthStorage adapters (oauth.md 9.4). Mobile keeps the refresh token in SecureStore under gz.auth.rt;
// never MMKV, never logs. The PKCE transaction stays in memory (session.ts).

import type * as SecureStoreModule from "expo-secure-store"

export interface AuthStorage {
	get(key: string): Promise<string | null>
	set(key: string, value: string): Promise<void>
	remove(key: string): Promise<void>
}

export const REFRESH_TOKEN_KEY = "gz.auth.rt"
export const LAST_SIGN_OUT_KEY = "gz.auth.explicit_signout"

export function memoryStorage(initial: Record<string, string> = {}): AuthStorage & { dump(): Record<string, string> } {
	const m = new Map(Object.entries(initial))
	return {
		get: async (k) => m.get(k) ?? null,
		set: async (k, v) => {
			m.set(k, v)
		},
		remove: async (k) => {
			m.delete(k)
		},
		dump: () => Object.fromEntries(m),
	}
}

/**
 * Keychain class AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: readable after the first unlock (the contract's
 * AFTER_FIRST_UNLOCK) and never migrated to another device through a backup.
 */
export function secureStoreStorage(SecureStore: typeof SecureStoreModule): AuthStorage {
	const opts = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
	return {
		get: (k) => SecureStore.getItemAsync(k, opts),
		set: (k, v) => SecureStore.setItemAsync(k, v, opts),
		remove: (k) => SecureStore.deleteItemAsync(k, opts),
	}
}
