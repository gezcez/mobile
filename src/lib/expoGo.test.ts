import { isExpoGo } from "./expoGo"

describe("isExpoGo", () => {
	it("is true only for the Expo Go store client", () => {
		expect(isExpoGo({ executionEnvironment: "storeClient" })).toBe(true)
		expect(isExpoGo({ executionEnvironment: "bare" })).toBe(false)
		expect(isExpoGo({ executionEnvironment: "standalone" })).toBe(false)
		expect(isExpoGo({})).toBe(false)
	})
})
