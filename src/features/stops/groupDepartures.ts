// groupDepartures.ts
// Stop departures grouped by route + headsign ("41C → Umuttepe: 3 min live, 14 min, 29 min"),
// groups ordered by their next departure, cancelled trips kept (shown struck through).

import type { Departure, RouteSummary } from "@/api/types"
import { toMs } from "@/lib/time"

export interface DepartureGroup {
	key: string
	route: RouteSummary
	direction: 0 | 1 | null
	headsign: string
	items: Departure[]
	next: Departure | null
}

/** The time a rider should trust: the prediction when live, else the schedule. */
export function departureTime(d: Departure): string {
	return d.predictedAt ?? d.scheduledAt
}

export function isLive(d: Departure): boolean {
	return d.source !== "schedule" && d.predictedAt !== null
}

export function groupDepartures(items: readonly Departure[], opts: { perGroup?: number; routeFilter?: string | null } = {}): DepartureGroup[] {
	const per = opts.perGroup ?? 3
	const groups = new Map<string, DepartureGroup>()
	const sorted = [...items].sort((a, b) => toMs(departureTime(a)) - toMs(departureTime(b)))
	for (const d of sorted) {
		if (opts.routeFilter && d.route.id !== opts.routeFilter) continue
		const key = `${d.route.id}|${d.direction}|${d.headsign}`
		let g = groups.get(key)
		if (!g) {
			g = { key, route: d.route, direction: d.direction, headsign: d.headsign, items: [], next: null }
			groups.set(key, g)
		}
		if (g.items.length < per) g.items.push(d)
		if (!g.next && !d.cancelled) g.next = d
	}
	return [...groups.values()].sort((a, b) => {
		const ta = a.next ? toMs(departureTime(a.next)) : Infinity
		const tb = b.next ? toMs(departureTime(b.next)) : Infinity
		return ta - tb
	})
}

/** Routes present in the list, for filter chips (plan 5.5: shown when more than 5 routes serve). */
export function routesIn(items: readonly Departure[]): RouteSummary[] {
	const seen = new Map<string, RouteSummary>()
	for (const d of items) if (!seen.has(d.route.id)) seen.set(d.route.id, d.route)
	return [...seen.values()]
}

/** Departures in the next `withinMin` minutes; used for "No departures soon. Next: tomorrow 06:10". */
export function soonest(items: readonly Departure[], nowMs: number, withinMin = 120): { soon: Departure[]; nextLater: Departure | null } {
	const limit = nowMs + withinMin * 60_000
	const live = items.filter((d) => !d.cancelled)
	const soon = live.filter((d) => toMs(departureTime(d)) <= limit)
	const nextLater = soon.length ? null : (live.sort((a, b) => toMs(departureTime(a)) - toMs(departureTime(b)))[0] ?? null)
	return { soon, nextLater }
}
