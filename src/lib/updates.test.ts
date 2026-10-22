import { hasSoftUpdate, isCriticalManifest, storeUrl } from "./updates"

describe("updates", () => {
	it("detects the critical marker in either manifest shape", () => {
		expect(isCriticalManifest({ extra: { critical: true } })).toBe(true)
		expect(isCriticalManifest({ extra: { expoClient: { extra: { critical: true } } } })).toBe(true)
		expect(isCriticalManifest({ extra: { expoClient: { extra: { critical: "true" } } } })).toBe(false)
		expect(isCriticalManifest(undefined)).toBe(false)
	})
	it("compares the soft update version", () => {
		expect(hasSoftUpdate("26.10.0", "26.10.1")).toBe(true)
		expect(hasSoftUpdate("26.10.0", "26.10.0")).toBe(false)
		expect(hasSoftUpdate("26.11.0", "26.10.3")).toBe(false)
		expect(hasSoftUpdate("26.10.0", null)).toBe(false)
	})
	it("links the store for the platform", () => {
		expect(storeUrl("android")).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.gezcez\.app/)
		expect(storeUrl("ios")).toMatch(/^https:\/\//)
	})
})
