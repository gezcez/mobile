import { scrubDeep, scrubEvent, scrubText, scrubUrl } from "./scrub"

describe("scrub", () => {
	it("removes card numbers, tokens and jwts", () => {
		expect(scrubText("card 1234 5678 9012 4821 failed")).toBe("card [number] failed")
		expect(scrubText("line 41C at 08:10")).toBe("line 41C at 08:10")
		expect(scrubText("Authorization: Bearer abc.def-ghi")).toBe("Authorization: Bearer [redacted]")
		expect(scrubText("t=eyJhbGciOi.eyJzdWIiOi.sig")).toBe("t=[jwt]")
	})
	it("drops query strings", () => {
		expect(scrubUrl("https://api.gezcez.com/v1/stops/nearby?lat=40.765&lon=29.94")).toBe(
			"https://api.gezcez.com/v1/stops/nearby",
		)
	})
	it("redacts coordinate and secret keys deeply", () => {
		expect(
			scrubDeep({ data: { lat: 40.7, lon: 29.9, url: "https://x/y?lat=1", note: "4821 1234 5678 9012" } }),
		).toEqual({ data: { lat: "[redacted]", lon: "[redacted]", url: "https://x/y", note: "[number]" } })
	})
})

describe("sentry event scrubbing", () => {
	it("removes user, request bodies, headers and coordinates", () => {
		const e = scrubEvent({
			message: "lookup failed for 1234567890123 near 40.7655, 29.9408 by ali@example.com",
			request: { url: "https://api.gezcez.com/v1/x?lat=1", query_string: "lat=1", data: { card_number: "1" }, headers: { Authorization: "Bearer x" } },
			exception: { values: [{ value: "Bearer abc.def" }] },
			breadcrumbs: [{ message: "GET /v1/stops/nearby?lat=40.1", data: { url: "https://x/y?lat=1", body: "{\"card_number\":\"1\"}" } }],
			user: { id: "u1" },
			tags: { coords: "40,29" },
		})
		expect(e.message).toBe("lookup failed for [number] near [coords] by [email]")
		expect(e.request).toEqual({ url: "https://api.gezcez.com/v1/x" })
		expect(e.exception!.values![0]!.value).toBe("Bearer [redacted]")
		expect(e.breadcrumbs![0]).toEqual({ message: "GET /v1/stops/nearby", data: { url: "https://x/y" } })
		expect(e.user).toBeUndefined()
		expect(e.tags).toEqual({ coords: "[redacted]" })
	})
	it("leaves times, line names and short numbers alone", () => {
		expect(scrubText("41C at 08:10, 3 stops, v26.10.0")).toBe("41C at 08:10, 3 stops, v26.10.0")
	})
})
