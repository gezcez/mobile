import { scrubDeep, scrubText, scrubUrl } from "./scrub"

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
