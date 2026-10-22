import { resolveScheme, themes } from "./theme"
import { darkColors, lightColors, palette } from "./tokens"

describe("theme", () => {
	it("uses the www brand values", () => {
		expect(lightColors.bg).toBe("#fffbeb")
		expect(lightColors.ink).toBe("#172554")
		expect(lightColors.accent).toBe("#d97706")
		expect(lightColors.eyebrow).toBe("#b45309")
		expect(lightColors.cta).toBe("#fbbf24")
		expect(palette.yellow400).toBe("#facc15")
		expect(palette.amber500).toBe("#f59e0b")
		expect(darkColors.primary).toBe("#fbbf24")
	})
	it("follows the system scheme unless overridden", () => {
		expect(resolveScheme("system", "dark")).toBe("dark")
		expect(resolveScheme("system", null)).toBe("light")
		expect(resolveScheme("light", "dark")).toBe("light")
		expect(themes.dark.colors.bg).toBe("#0b1533")
	})
})
