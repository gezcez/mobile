import { toPack } from "@/api/types"
import { wirePack } from "@/mock/data"
import { buildIndex, compareRoutes, nearbyStops, nearbyWithFallback, searchRoutes, searchStops } from "./packIndex"

const bus = buildIndex(toPack(wirePack("kocaeli-bus")!))
const ferry = buildIndex(toPack(wirePack("kocaeli-ferry")!))

describe("packIndex", () => {
	it("finds the nearest stops in order, within the radius", () => {
		const merkez = bus.stops.find((s) => s.name === "İzmit Merkez")!
		const near = nearbyStops([bus, ferry], merkez.lat, merkez.lon, 600, 8)
		expect(near[0]!.stop.id).toBe(merkez.id)
		expect(near.every((n, i) => i === 0 || n.distanceM >= near[i - 1]!.distanceM)).toBe(true)
		expect(near.every((n) => n.distanceM <= 600)).toBe(true)
	})
	it("widens to 1.5 km when nothing is within 600 m", () => {
		const r = nearbyWithFallback([bus], 40.7, 29.93) // south of Başiskele... widen
		expect(r.widened || r.items.length > 0).toBe(true)
		const none = nearbyWithFallback([bus], 39.9, 32.85) // Ankara
		expect(none).toEqual({ items: [], widened: true })
	})
	it("ranks route short-name prefix matches first", () => {
		const r = searchRoutes([bus, ferry], "41")
		expect(r[0]!.shortName).toBe("41C")
		expect(searchRoutes([bus], "1").map((x) => x.shortName)).toEqual(expect.arrayContaining(["15", "120"]))
	})
	it("matches route names with Turkish folding and filters by mode", () => {
		expect(searchRoutes([bus, ferry], "golcuk").map((r) => r.shortName)).toContain("500")
		expect(searchRoutes([bus, ferry], "", { modes: ["ferry"] }).map((r) => r.shortName)).toEqual(["D1", "D2"])
	})
	it("finds stops by folded name or exact code", () => {
		expect(searchStops([bus], "umuttepe")[0]!.name).toBe("Umuttepe Kampüsü")
		const s = bus.stops[3]!
		expect(searchStops([bus], s.code!)[0]!.id).toBe(s.id)
	})
	it("orders route numbers naturally", () => {
		expect(["200", "9", "41C", "15", "Ü1", "120"].map((shortName) => ({ shortName })).sort(compareRoutes).map((r) => r.shortName)).toEqual([
			"9",
			"15",
			"41C",
			"120",
			"200",
			"Ü1",
		])
	})
})
