import { ago, clockIn, countdown, minutesUntil, monthIn, shiftMonth } from "./time"

const NOW = Date.parse("2026-10-21T20:00:00Z") // 23:00 in Istanbul

describe("time", () => {
	it("formats clock times in the network timezone, not the device's", () => {
		expect(clockIn("2026-10-21T05:10:00Z", "Europe/Istanbul")).toBe("08:10")
		expect(clockIn("2026-10-21T05:10:00Z", "UTC")).toBe("05:10")
	})
	it("counts down in minutes up to 30, then shows the clock", () => {
		expect(countdown("2026-10-21T20:00:30Z", NOW, "Europe/Istanbul")).toEqual({ kind: "now" })
		expect(countdown("2026-10-21T20:03:00Z", NOW, "Europe/Istanbul")).toEqual({ kind: "minutes", minutes: 3 })
		expect(countdown("2026-10-21T20:45:00Z", NOW, "Europe/Istanbul")).toEqual({
			kind: "clock",
			time: "23:45",
			tomorrow: false,
		})
		expect(countdown("2026-10-22T03:10:00Z", NOW, "Europe/Istanbul")).toEqual({
			kind: "clock",
			time: "06:10",
			tomorrow: true,
		})
	})
	it("never returns negative minutes", () => {
		expect(minutesUntil("2026-10-21T19:50:00Z", NOW)).toBe(0)
	})
	it("describes ages", () => {
		expect(ago(NOW - 20_000, NOW)).toEqual({ unit: "s", count: 20 })
		expect(ago(NOW - 4 * 60_000, NOW)).toEqual({ unit: "m", count: 4 })
		expect(ago(NOW - 3 * 3600_000, NOW)).toEqual({ unit: "h", count: 3 })
	})
	it("handles months", () => {
		expect(monthIn(NOW, "Europe/Istanbul")).toBe("2026-10")
		expect(shiftMonth("2026-01", -1)).toBe("2025-12")
		expect(shiftMonth("2026-12", 1)).toBe("2027-01")
	})
})
