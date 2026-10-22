// liveBudget.ts
// Home's share of the realtime connection (plan 3.4: at most 8 subscriptions per socket). While
// Home is focused, every other screen has released its feeds, so Home may use up to
// HOME_LIVE_BUDGET departures subscriptions and keeps two free for the screen being opened (its
// subscribe can arrive before Home's unsubscribes). Saved stops come first, in the order the
// rider keeps them, then the nearest stops that show departures. Everything else polls REST.

import { LIMITS } from "@/live/protocol"

export const HOME_LIVE_BUDGET = LIMITS.maxSubs - 2
/** One limit for every Home departures call, so a stop that is both saved and nearby shares one cache entry and one subscription. */
export const HOME_DEPARTURES_LIMIT = 12
/** REST polling for the stops without a live subscription. */
export const HOME_POLL_MS = 30_000

export interface StopRef {
	networkId: string
	stopId: string
}

export const stopKey = (s: StopRef) => `${s.networkId}:${s.stopId}`

export function homeLiveStops(saved: readonly StopRef[], nearby: readonly StopRef[], budget = HOME_LIVE_BUDGET): Set<string> {
	const out = new Set<string>()
	for (const s of [...saved, ...nearby]) {
		if (out.size >= budget) break
		out.add(stopKey(s))
	}
	return out
}
