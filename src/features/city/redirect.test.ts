import { redirectSystemPath } from "@/app/+native-intent"

describe("deep link rewrite", () => {
	it("opens the city sheet for gezcez://city/<slug>", () => {
		expect(redirectSystemPath({ path: "gezcez://city/bursa", initial: true })).toBe("/city?cityId=bursa")
		expect(redirectSystemPath({ path: "/city/kocaeli", initial: false })).toBe("/city?cityId=kocaeli")
	})
	it("passes stop and route links through", () => {
		expect(redirectSystemPath({ path: "/stop/kocaeli-bus/4.41003", initial: true })).toBe("/stop/kocaeli-bus/4.41003")
		expect(redirectSystemPath({ path: "/city", initial: true })).toBe("/city")
	})
})
