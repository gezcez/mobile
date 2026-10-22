import type { Departure } from "@/api/types"
import { departureTime, groupDepartures, isLive, routesIn, soonest } from "./groupDepartures"

const route = (id: string) => ({ id, networkId: "n", shortName: id, longName: id, mode: "bus" as const, color: null, textColor: null })
const dep = (r: string, min: number, extra: Partial<Departure> = {}): Departure => ({
	route: route(r),
	direction: 0,
	headsign: `${r} end`,
	scheduledAt: new Date(Date.UTC(2026, 9, 21, 5, min)).toISOString(),
	predictedAt: null,
	vehicleId: null,
	tripId: null,
	stopsAway: null,
	source: "schedule",
	cancelled: false,
	...extra,
})
const NOW = Date.UTC(2026, 9, 21, 5, 0)

describe("groupDepartures", () => {
	it("groups by route and headsign, ordered by next departure, 3 per group", () => {
		const items = [dep("9", 20), dep("41C", 5), dep("9", 8), dep("41C", 25), dep("41C", 40), dep("41C", 55), dep("9", 30)]
		const g = groupDepartures(items)
		expect(g.map((x) => x.route.id)).toEqual(["41C", "9"])
		expect(g[0]!.items).toHaveLength(3)
		expect(g[1]!.items.map((d) => departureTime(d))).toEqual([dep("9", 8), dep("9", 20), dep("9", 30)].map((d) => d.scheduledAt))
	})
	it("uses the prediction when live and skips cancelled trips for 'next'", () => {
		const live = dep("41C", 10, { predictedAt: new Date(Date.UTC(2026, 9, 21, 5, 13)).toISOString(), source: "live_eta" })
		const cancelled = dep("41C", 4, { cancelled: true })
		const [g] = groupDepartures([live, cancelled])
		expect(g!.next).toBe(live)
		expect(isLive(live)).toBe(true)
		expect(g!.items[0]).toBe(cancelled)
	})
	it("filters by route and lists routes", () => {
		const items = [dep("9", 20), dep("41C", 5)]
		expect(groupDepartures(items, { routeFilter: "9" }).map((g) => g.route.id)).toEqual(["9"])
		expect(routesIn(items).map((r) => r.id)).toEqual(["9", "41C"])
	})
	it("reports the next departure when nothing leaves within two hours", () => {
		const r = soonest([dep("9", 60 * 13)], NOW)
		expect(r.soon).toEqual([])
		expect(r.nextLater?.route.id).toBe("9")
	})
})
