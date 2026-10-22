// secrets.ts
// Card numbers in the encrypted MMKV instance (key in SecureStore, see lib/storage.ts). Read only
// right before a lookup, sent only in POST bodies, never put in query keys, logs or Sentry.

import { getSecureKv } from "@/lib/storage"

const key = (cardId: string) => `card.${cardId}`

export async function saveCardNumber(cardId: string, number: string): Promise<void> {
	;(await getSecureKv()).set(key(cardId), number)
}

export async function readCardNumber(cardId: string): Promise<string | null> {
	return (await getSecureKv()).getString(key(cardId)) ?? null
}

export async function deleteCardNumber(cardId: string): Promise<void> {
	;(await getSecureKv()).remove(key(cardId))
}

/** Removes every stored card number (privacy centre "Delete data on this phone"). */
export async function clearCardNumbers(): Promise<void> {
	const kv = await getSecureKv()
	for (const k of kv.getAllKeys()) if (k.startsWith("card.")) kv.remove(k)
}
