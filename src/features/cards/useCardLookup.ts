// useCardLookup.ts
// Balance and history hooks for one saved card. A successful lookup is stored as the card's last
// known balance, so the list and a provider outage (PROVIDER_UNAVAILABLE) still show a number with
// its "as of" time instead of an empty screen.

import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { cardBalanceQuery, cardHistoryQuery } from "@/api/queries/cards"
import { errorCodeOf, type ErrorCode } from "@/api/errors"
import { count } from "@/lib/telemetry"
import type { SavedCard } from "./model"
import { readCardNumber } from "./secrets"
import { useCardsStore } from "./useCardsStore"

export function useCardBalance(card: SavedCard | undefined, enabled = true) {
	const q = useQuery({
		...cardBalanceQuery(card?.networkId ?? "", card?.id ?? "", () => readCardNumber(card?.id ?? "")),
		enabled: !!card && enabled,
	})
	const setBalance = useCardsStore((s) => s.setBalance)
	const cardId = card?.id
	const data = q.data
	// Keyed on the query's update time, not the card object, which this very effect replaces.
	useEffect(() => {
		if (!cardId || !data) return
		count("feature:card_lookup")
		setBalance(cardId, { amount: data.balance, currency: data.currency, asOf: data.asOf, providerCardType: data.cardType })
	}, [cardId, data, q.dataUpdatedAt, setBalance])
	return q
}

export function useCardHistory(card: SavedCard | undefined, month: string, enabled = true) {
	return useQuery({
		...cardHistoryQuery(card?.networkId ?? "", card?.id ?? "", month, () => readCardNumber(card?.id ?? "")),
		enabled: !!card && enabled,
	})
}

export type CardProblem = "provider_unavailable" | "provider_disabled" | "not_found" | "unsupported" | "offline" | "other"

/** Groups lookup errors into what the card screens say (backend codes per backend.md 3.3). */
export function cardProblem(e: unknown): CardProblem {
	const code: ErrorCode = errorCodeOf(e)
	switch (code) {
		case "PROVIDER_UNAVAILABLE":
		case "RATE_LIMITED":
		case "INTERNAL":
			return "provider_unavailable"
		case "PROVIDER_DISABLED":
			return "provider_disabled"
		case "CARD_NOT_FOUND":
			return "not_found"
		case "CAPABILITY_UNSUPPORTED":
			return "unsupported"
		case "NETWORK":
			return "offline"
		default:
			return "other"
	}
}
