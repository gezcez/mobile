import polyline from "@mapbox/polyline"
import type { RouteStop } from "@/api/types"
import type { LiveVehicle } from "@/live/protocol"
import { boundsOf, decodeShape, nearestStopIndex, placeVehicles, straightLine } from "./geometry"

const stop = (seq: number, lat: number, lon: number): RouteStop => ({ id: `s${seq}`, name: `S${seq}`, lat, lon, seq, offsetS: seq * 60 })
const stops = [stop(1, 40.76, 29.9), stop(2, 40.77, 29.91), stop(3, 40.78, 29.92)]
const veh = (id: string, stopSeq: number | null, status: string | null = "in_transit"): LiveVehicle => ({
	id,
	lat: 0,
	lon: 0,
	bearing: null,
	speedMs: null,
	routeId: "r",
	direction: 0,
	tripId: null,
	stopSeq,
	status,
	vehicleTs: 0,
	stale: false,
	accessible: false,
	atTerminus: false,
})

describe("route geometry", () => {
	it("decodes precision-6 shapes to [lon, lat]", () => {
		const encoded = polyline.encode([
			[40.76, 29.9],
			[40.77, 29.91],
		], 6)
		const lines = decodeShape({ routeId: "r", precision: 6, polylines: [{ patternId: "p", direction: 0, polyline: encoded }] })
		expect(lines[0]![0]![0]).toBeCloseTo(29.9)
		expect(lines[0]![1]![1]).toBeCloseTo(40.77)
	})
	it("falls back to straight lines and computes bounds", () => {
		expect(straightLine(stops)[0]).toHaveLength(3)
		expect(boundsOf([], stops)).toEqual([29.9, 40.76, 29.92, 40.78])
	})
	it("finds the nearest stop within 2 km", () => {
		expect(nearestStopIndex(stops, { lat: 40.7701, lon: 29.9101 })).toBe(1)
		expect(nearestStopIndex(stops, { lat: 41.5, lon: 29.9 })).toBeNull()
	})
	it("places vehicles by stop_seq in timeline order", () => {
		const placed = placeVehicles(stops, [veh("b", 3), veh("a", 2, "stopped_at"), veh("x", 9), veh("y", null)])
		expect(placed.map((p) => [p.vehicle.id, p.index, p.atStop])).toEqual([
			["a", 1, true],
			["b", 2, false],
		])
	})
})
