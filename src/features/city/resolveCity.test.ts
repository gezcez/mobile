import type { City } from "@/api/types"
import { resolveCity, sortCities } from "./resolveCity"

const city = (id: string, centre: [number, number], bbox: City["bbox"]): City => ({
	id,
	name: { tr: id, en: id },
	country: "TR",
	timezone: "Europe/Istanbul",
	centre,
	bbox,
	networks: [],
})

const kocaeli = city("kocaeli", [29.9408, 40.7655], [29.3, 40.5, 30.4, 41.25])
const istanbul = city("istanbul", [28.9784, 41.0082], [28.0, 40.8, 29.95, 41.6])
const bursa = city("bursa", [29.061, 40.1885], [28.6, 39.9, 29.6, 40.45])

describe("resolveCity", () => {
	it("picks the city whose bbox contains the point", () => {
		expect(resolveCity([kocaeli, bursa], 40.77, 29.94)?.id).toBe("kocaeli")
		expect(resolveCity([kocaeli, bursa], 40.19, 29.06)?.id).toBe("bursa")
	})
	it("breaks overlapping bboxes by nearest centre", () => {
		// Gebze is inside both boxes, closer to Istanbul's centre than to Kocaeli's
		expect(resolveCity([kocaeli, istanbul], 40.8, 29.43)?.id).toBe("kocaeli")
		expect(resolveCity([kocaeli, istanbul], 40.95, 29.1)?.id).toBe("istanbul")
	})
	it("returns null outside every city or more than 50 km from the centre", () => {
		expect(resolveCity([kocaeli, bursa], 39.92, 32.85)).toBeNull() // Ankara
		expect(resolveCity([kocaeli], 41.2, 30.35)).toBeNull() // inside the bbox corner, too far
	})
	it("sorts the picker by distance, else alphabetically", () => {
		expect(sortCities([kocaeli, bursa, istanbul], "en").map((c) => c.id)).toEqual(["bursa", "istanbul", "kocaeli"])
		expect(sortCities([kocaeli, bursa, istanbul], "en", { lat: 40.2, lon: 29 }).map((c) => c.id)[0]).toBe("bursa")
	})
})
