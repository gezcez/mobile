import { COMPACT_FIELDS, decodeRows, freshness, parseServerMessage, rowDecoder, subscriptionKey } from "./protocol"

describe("live protocol", () => {
	it("decodes compact rows in fields order with flags", () => {
		const [v] = decodeRows(COMPACT_FIELDS, [["4.v1001", 40.76, 29.93, 90, 6.5, "4.41265", 1, "t1", 7, "in_transit", 1_800_000_000, 3]])
		expect(v).toMatchObject({ id: "4.v1001", lat: 40.76, lon: 29.93, bearing: 90, routeId: "4.41265", direction: 1, stopSeq: 7, stale: true, accessible: true, atTerminus: false })
	})

	it("follows a different field order and the full detail extras", () => {
		const dec = rowDecoder(["lon", "lat", "id", "flags", "vehicle_ts", "plate", "headsign"])
		expect(dec([29.9, 40.7, "x", 4, 10, "41 AB 123", "Umuttepe"])).toMatchObject({ id: "x", lat: 40.7, lon: 29.9, atTerminus: true, plate: "41 AB 123", headsign: "Umuttepe", direction: null })
	})

	it("drops rows without id or position", () => {
		expect(decodeRows(COMPACT_FIELDS, [[null, 1, 2], ["a", null, 2]])).toEqual([])
	})

	it("parses known messages and ignores garbage", () => {
		expect(parseServerMessage('{"type":"delta","sub":"s1","seq":2,"feed_ts":1,"upsert":[],"remove":["a"]}')?.type).toBe("delta")
		expect(parseServerMessage('{"type":"snapshot","sub":"s1"}')).toBeNull()
		expect(parseServerMessage("not json")).toBeNull()
		expect(parseServerMessage('{"type":"mystery"}')).toBeNull()
	})

	it("applies the freshness rule", () => {
		const now = 1_000_000_000_000
		expect(freshness({ vehicleTs: now / 1000 - 30, stale: false }, now)).toBe("fresh")
		expect(freshness({ vehicleTs: now / 1000 - 200, stale: false }, now)).toBe("stale")
		expect(freshness({ vehicleTs: now / 1000 - 30, stale: true }, now)).toBe("stale")
		expect(freshness({ vehicleTs: now / 1000 - 700, stale: false }, now)).toBe("hidden")
	})

	it("keys equal subscriptions the same way", () => {
		const a = subscriptionKey({ channel: "vehicles", params: { network: "n", routes: ["b", "a"] } })
		const b = subscriptionKey({ channel: "vehicles", params: { network: "n", routes: ["a", "b"] } })
		expect(a).toBe(b)
		expect(subscriptionKey({ channel: "departures", params: { stop: "s" } })).toBe("departures:s:10")
	})
})
