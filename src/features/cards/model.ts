// model.ts
// Saved transit cards (plan 5.11). The card number itself never lives here: it is kept in the
// encrypted MMKV instance (secrets.ts) and this store only knows the last four digits.

import type { CardCapability, Network } from "@/api/types"
import { digitsOnly } from "@/lib/format"

export const CARD_TYPES = ["full", "student", "senior60", "senior65", "other"] as const
/** Local only, like FKart's override; used for display (fare hints later), never sent. */
export type CardType = (typeof CARD_TYPES)[number]

export interface LastBalance {
	amount: number
	currency: string
	/** When the provider measured it (server `as_of`). */
	asOf: string
	providerCardType: string | null
}

export interface SavedCard {
	id: string
	networkId: string
	nickname: string
	type: CardType
	last4: string
	addedAt: string
	lastBalance: LastBalance | null
}

/** Fallback when a network publishes no number format: 10 to 20 digits. */
const DEFAULT_FORMAT = /^[0-9]{10,20}$/

function formatOf(numberFormat: string | null | undefined): RegExp {
	if (!numberFormat) return DEFAULT_FORMAT
	try {
		return new RegExp(numberFormat)
	} catch {
		return DEFAULT_FORMAT
	}
}

/** Normalises what the rider typed (spaces, dashes) and checks it against the manifest's format. */
export function validateCardNumber(raw: string, numberFormat: string | null | undefined): { ok: boolean; number: string } {
	const number = digitsOnly(raw)
	return { ok: number.length > 0 && formatOf(numberFormat).test(number), number }
}

export type CardSupport = "ok" | "requires_account" | "unsupported"

/** Whether gezcez can check this network's cards: capability present and no provider account needed. */
export function cardSupport(card: CardCapability | null | undefined): CardSupport {
	if (!card || !card.balance) return "unsupported"
	if (card.requiresProviderAccount) return "requires_account"
	return "ok"
}

/** Networks a rider can add a card for. Paused networks keep their cards but cannot add new ones. */
export function cardCapableNetworks(networks: readonly Network[]): Network[] {
	return networks.filter((n) => n.status !== "disabled" && n.capabilities.card !== null)
}
