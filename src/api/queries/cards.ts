// Card balance and history (backend 6.11, P5). POST so the number stays in the body; query keys
// carry the local card id only, never the number, and nothing here is persisted to disk.

import { queryOptions } from "@tanstack/react-query"
import { api, unwrap } from "../client"
import { GezcezApiError } from "../errors"
import { toCardBalance, toCardTransaction } from "../types"

/** Reads the number at call time (the encrypted store), so it never sits in the query cache. */
export type NumberSource = () => Promise<string | null>

async function requireNumber(read: NumberSource): Promise<string> {
	const n = await read()
	if (!n) throw new GezcezApiError({ code: "CARD_NOT_FOUND", status: 0, message: "card number missing on device" })
	return n
}

export const cardBalanceQuery = (networkId: string, cardId: string, read: NumberSource) =>
	queryOptions({
		queryKey: ["net", networkId, "card", cardId, "balance"],
		queryFn: async () => {
			const card_number = await requireNumber(read)
			return toCardBalance(
				await unwrap(
					api.POST("/v1/networks/{networkId}/cards/lookup", { params: { path: { networkId } }, body: { card_number } }),
				),
			)
		},
		staleTime: 60_000,
		gcTime: 10 * 60_000,
		retry: 1,
	})

export const cardHistoryQuery = (networkId: string, cardId: string, month: string, read: NumberSource) =>
	queryOptions({
		queryKey: ["net", networkId, "card", cardId, "history", month],
		queryFn: async () => {
			const card_number = await requireNumber(read)
			const h = await unwrap(
				api.POST("/v1/networks/{networkId}/cards/history", {
					params: { path: { networkId } },
					body: { card_number, month },
				}),
			)
			return { month: h.month, currency: h.currency, items: h.items.map(toCardTransaction) }
		},
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
		retry: 1,
	})
