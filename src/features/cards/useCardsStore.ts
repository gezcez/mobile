// useCardsStore.ts
// The rider's saved cards on this device (metadata and last known balance), persisted to MMKV.
// Numbers go to the encrypted instance through secrets.ts. Card sync to the account is off by
// default and not built yet (plan 5.11), so nothing here leaves the phone except lookups.

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { last4 } from "@/lib/format"
import { uuidv7 } from "@/lib/id"
import { zustandStorage } from "@/lib/storage"
import type { CardType, LastBalance, SavedCard } from "./model"
import { clearCardNumbers, deleteCardNumber, saveCardNumber } from "./secrets"

export interface NewCard {
	networkId: string
	/** Digits only, already validated. */
	number: string
	nickname: string
	type: CardType
}

export interface CardsState {
	cards: SavedCard[]
	add: (card: NewCard) => Promise<string>
	update: (id: string, patch: { nickname?: string; type?: CardType }) => void
	remove: (id: string) => Promise<void>
	setBalance: (id: string, balance: LastBalance) => void
	clearAll: () => Promise<void>
}

export const MAX_CARDS = 20

export const useCardsStore = create<CardsState>()(
	persist(
		(set, get) => ({
			cards: [],
			add: async ({ networkId, number, nickname, type }) => {
				const id = uuidv7()
				await saveCardNumber(id, number)
				const card: SavedCard = {
					id,
					networkId,
					nickname: nickname.trim(),
					type,
					last4: last4(number),
					addedAt: new Date().toISOString(),
					lastBalance: null,
				}
				set({ cards: [...get().cards, card].slice(-MAX_CARDS) })
				return id
			},
			update: (id, patch) =>
				set({
					cards: get().cards.map((c) =>
						c.id === id ? { ...c, ...patch, nickname: patch.nickname?.trim() ?? c.nickname } : c,
					),
				}),
			remove: async (id) => {
				await deleteCardNumber(id)
				set({ cards: get().cards.filter((c) => c.id !== id) })
			},
			setBalance: (id, lastBalance) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, lastBalance } : c)) }),
			clearAll: async () => {
				await clearCardNumbers()
				set({ cards: [] })
			},
		}),
		{
			name: "gz.cards",
			version: 1,
			storage: createJSONStorage(() => zustandStorage()),
			partialize: (s) => ({ cards: s.cards }),
		},
	),
)

/** Display name: the nickname, else "•••• 1234". */
export function cardName(card: SavedCard, masked: (last4: string) => string): string {
	return card.nickname || masked(card.last4)
}
