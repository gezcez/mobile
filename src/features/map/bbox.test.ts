import { feedBbox, inBounds } from "./bbox"

describe("map feed bbox", () => {
	it("uses the whole network below zoom 12", () => {
		expect(feedBbox(11, [29.9, 40.7, 30, 40.8])).toBeNull()
	})
	it("snaps outward to the 0.05 grid", () => {
		expect(feedBbox(13, [29.91, 40.76, 29.97, 40.79])).toEqual([29.9, 40.75, 30, 40.8])
	})
	it("falls back to the whole network above a 0.5 degree span", () => {
		expect(feedBbox(12, [29.0, 40.0, 29.7, 40.2])).toBeNull()
	})
	it("checks bounds", () => {
		expect(inBounds({ lat: 40.77, lon: 29.95 }, [29.9, 40.75, 30, 40.8])).toBe(true)
		expect(inBounds({ lat: 41, lon: 29.95 }, [29.9, 40.75, 30, 40.8])).toBe(false)
	})
})
