import { compareVersions, isBelow } from "./version"

it("compares CalVer versions numerically", () => {
	expect(compareVersions("26.10.0", "26.9.3")).toBe(1)
	expect(compareVersions("26.1.0", "26.1")).toBe(0)
	expect(isBelow("26.1.0", "26.2.0")).toBe(true)
	expect(isBelow("26.10.0", null)).toBe(false)
})
