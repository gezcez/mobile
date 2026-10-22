import { blend, contrast } from "./contrast"
import { darkColors, lightColors, palette, type ColorTokens } from "./tokens"

const hex = ([r, g, b]: number[]) => `#${[r, g, b].map((v) => Math.round(v!).toString(16).padStart(2, "0")).join("")}`

/** Every opaque background text can sit on: page, card, and muted card over both. */
function backgrounds(c: ColorTokens): string[] {
	return [c.bg, c.surface, hex(blend(c.surfaceMuted, c.bg)), hex(blend(c.surfaceMuted, c.surface))]
}

describe.each([
	["light", lightColors],
	["dark", darkColors],
] as const)("%s tokens (ux-review, _decisions 0)", (_name, c) => {
	it.each(["ink", "inkMuted", "inkSubtle", "eyebrow", "danger", "success"] as const)("%s text is at least 4.5:1 on every background", (key) => {
		for (const bg of backgrounds(c)) expect(contrast(c[key], bg)).toBeGreaterThanOrEqual(4.5)
	})
	it("accent icons, focus ring and control borders are at least 3:1", () => {
		for (const bg of [c.bg, c.surface]) {
			expect(contrast(c.accent, bg)).toBeGreaterThanOrEqual(3)
			expect(contrast(c.focus, bg)).toBeGreaterThanOrEqual(3)
			expect(contrast(c.borderStrong, bg)).toBeGreaterThanOrEqual(3)
		}
	})
	it("button labels are at least 4.5:1", () => {
		expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5)
		expect(contrast(c.onCta, c.cta)).toBeGreaterThanOrEqual(4.5)
		expect(contrast(c.onTabActive, c.tabActive)).toBeGreaterThanOrEqual(4.5)
	})
})

it("uses the shared night pair and focus colour", () => {
	expect(darkColors.bg).toBe(palette.navy)
	expect(lightColors.focus).toBe(palette.amber700)
	expect(lightColors.danger).toBe("#b91c1c")
})
