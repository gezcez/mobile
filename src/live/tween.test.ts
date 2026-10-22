import type { LiveVehicle } from "./protocol"
import { interpolate, shouldTween } from "./tween"

const v = (id: string, lat: number, lon: number): LiveVehicle => ({
	id,
	lat,
	lon,
	bearing: null,
	speedMs: null,
	routeId: null,
	direction: null,
	tripId: null,
	stopSeq: null,
	status: null,
	vehicleTs: 0,
	stale: false,
	accessible: false,
	atTerminus: false,
})

describe("tween", () => {
	const from = new Map([["a", { lat: 0, lon: 0 }]])
	it("starts at the old position, ends at the new one, and is half way in the middle", () => {
		expect(interpolate(from, [v("a", 1, 2)], 0)[0]).toMatchObject({ lat: 0, lon: 0 })
		expect(interpolate(from, [v("a", 1, 2)], 0.5)[0]).toMatchObject({ lat: 0.5, lon: 1 })
		expect(interpolate(from, [v("a", 1, 2)], 1)[0]).toMatchObject({ lat: 1, lon: 2 })
	})
	it("places new vehicles at their target", () => {
		expect(interpolate(from, [v("b", 3, 3)], 0.2)[0]).toMatchObject({ lat: 3, lon: 3 })
	})
	it("only tweens small sets with motion allowed", () => {
		expect(shouldTween(10, false)).toBe(true)
		expect(shouldTween(10, true)).toBe(false)
		expect(shouldTween(300, false)).toBe(false)
	})
})
