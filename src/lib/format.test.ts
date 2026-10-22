import { formatDistance, formatMoney, groupBy, groupCardNumber, hideEmail, last4, walkMinutes } from "./format"

describe("format", () => {
	it("formats distances", () => {
		expect(formatDistance(347, "en")).toEqual({ unit: "m", value: "350" })
		expect(formatDistance(1234, "en")).toEqual({ unit: "km", value: "1.2" })
		expect(formatDistance(1234, "tr")).toEqual({ unit: "km", value: "1,2" })
	})
	it("walks at 80 m per minute, at least one minute", () => {
		expect(walkMinutes(400)).toBe(5)
		expect(walkMinutes(10)).toBe(1)
	})
	it("masks and groups card numbers", () => {
		expect(last4("1234 5678 9012 4821")).toBe("4821")
		expect(groupCardNumber("1234567890124821")).toBe("1234 5678 9012 4821")
	})
	it("formats lira in Turkish", () => {
		expect(formatMoney(42.5, "TRY", "tr")).toMatch(/42,50/)
	})
	it("hides emails and groups lists", () => {
		expect(hideEmail("phasenull@example.com")).toBe("ph•••••••@example.com")
		expect([...groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even")).entries()]).toEqual([
			["odd", [1, 3]],
			["even", [2, 4]],
		])
	})
})
