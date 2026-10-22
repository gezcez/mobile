import { colorOr, contrastRatio, readableTextOn } from "./color"

describe("color", () => {
	it("computes WCAG contrast", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0)
		expect(contrastRatio("#172554", "#fffbeb")).toBeGreaterThan(12)
	})
	it("keeps the data text colour when it passes 4.5:1", () => {
		expect(readableTextOn("#172554", "#ffffff")).toBe("#ffffff")
	})
	it("falls back to navy or white when the data colour fails", () => {
		expect(readableTextOn("#fbbf24", "#ffffff")).toBe("#172554")
		expect(readableTextOn("#1d4ed8", "#1e40af")).toBe("#ffffff")
	})
	it("normalises API colours", () => {
		expect(colorOr("abc", "#000000")).toBe("#aabbcc")
		expect(colorOr("nope", "#000000")).toBe("#000000")
		expect(colorOr(null, "#123456")).toBe("#123456")
	})
})
