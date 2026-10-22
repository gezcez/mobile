import { HOME_LIVE_BUDGET, homeLiveStops } from "./liveBudget"

const s = (stopId: string) => ({ networkId: "kocaeli-bus", stopId })

describe("homeLiveStops", () => {
	it("keeps two subscriptions free for the next screen", () => {
		expect(HOME_LIVE_BUDGET).toBe(6)
	})
	it("puts saved stops first, then nearby, without duplicates", () => {
		const live = homeLiveStops([s("a"), s("b")], [s("b"), s("c")])
		expect([...live]).toEqual(["kocaeli-bus:a", "kocaeli-bus:b", "kocaeli-bus:c"])
	})
	it("stops at the budget", () => {
		const saved = ["1", "2", "3", "4", "5"].map(s)
		const live = homeLiveStops(saved, [s("n1"), s("n2"), s("n3")])
		expect(live.size).toBe(6)
		expect(live.has("kocaeli-bus:n1")).toBe(true)
		expect(live.has("kocaeli-bus:n2")).toBe(false)
	})
})
