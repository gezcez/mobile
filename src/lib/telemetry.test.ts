import { clearTelemetry, count, flush, pendingTelemetry, screenKey, startTelemetry, type TelemetryBatch } from "./telemetry"

describe("telemetry counters", () => {
	let enabled = true
	let city: string | null = "kocaeli"
	let now = Date.parse("2026-10-22T08:00:00Z")
	let sent: TelemetryBatch[] = []
	let fail = false
	let stop: () => void

	beforeEach(() => {
		clearTelemetry()
		enabled = true
		city = "kocaeli"
		now = Date.parse("2026-10-22T08:00:00Z")
		sent = []
		fail = true // keep counts local until a test flushes on purpose
		stop = startTelemetry({
			enabled: () => enabled,
			city: () => city,
			appVersion: "26.10.0",
			now: () => now,
			send: async (b) => {
				if (fail) throw new Error("offline")
				sent.push(JSON.parse(JSON.stringify(b)))
			},
		})
	})
	afterEach(() => stop())

	it("counts per day and city with no identifiers", () => {
		count("screen_view:stop")
		count("screen_view:stop")
		count("feature:card_lookup")
		city = "bursa"
		count("screen_view:stop")
		const p = pendingTelemetry()
		expect(p).toHaveLength(2)
		const k = p.find((b) => b.city === "kocaeli")!
		expect(k).toEqual({
			day: "2026-10-22",
			platform: expect.any(String),
			app_version: "26.10.0",
			city: "kocaeli",
			counters: { "screen_view:stop": 2, "feature:card_lookup": 1 },
		})
	})

	it("rejects keys that could carry ids or text", () => {
		count("screen_view:stop/4.41003")
		count("free text")
		count("card:1234567890123")
		count("Screen:Stop")
		count("stop:code_41003")
		count("ws:fallback_poll")
		expect(pendingTelemetry()).toHaveLength(1)
		expect(Object.keys(pendingTelemetry()[0]!.counters)).toEqual(["ws:fallback_poll"])
	})

	it("does nothing when the rider opted out, and opting out drops pending counts on flush", async () => {
		count("screen_view:home")
		enabled = false
		count("screen_view:home")
		expect(pendingTelemetry()[0]!.counters["screen_view:home"]).toBe(1)
		await flush()
		expect(pendingTelemetry()).toEqual([])
		expect(sent).toEqual([])
	})

	it("keeps batches when sending fails and removes them once accepted", async () => {
		count("screen_view:home", 3)
		await flush()
		expect(pendingTelemetry()).toHaveLength(1)
		fail = false
		await flush()
		expect(sent).toHaveLength(1)
		expect(sent[0]!.counters).toEqual({ "screen_view:home": 3 })
		expect(pendingTelemetry()).toEqual([])
	})

	it("drops batches older than a week", async () => {
		count("screen_view:home")
		now += 9 * 86_400_000
		fail = false
		await flush()
		expect(sent).toEqual([])
		expect(pendingTelemetry()).toEqual([])
	})

	it("names screens from route segments", () => {
		expect(screenKey(["stop", "[networkId]", "[stopId]"])).toBe("screen_view:stop")
		expect(screenKey(["(tabs)", "me", "cards"])).toBe("screen_view:me_cards")
		expect(screenKey(["(tabs)"])).toBe("screen_view:home")
		expect(screenKey(["card", "[cardId]"])).toBe("screen_view:card")
	})
})
