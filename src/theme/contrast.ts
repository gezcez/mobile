// contrast.ts
// WCAG 2.x contrast for token checks. Colours are #rrggbb or rgba(); an rgba colour is blended over
// the background it sits on, as the eye sees it.

type RGB = [number, number, number]

export function parseColor(c: string): { rgb: RGB; a: number } {
	const hex = /^#([0-9a-f]{6})$/i.exec(c)
	if (hex) {
		const n = parseInt(hex[1]!, 16)
		return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 }
	}
	const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c)
	if (m) return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) }
	throw new Error(`unsupported colour ${c}`)
}

export function blend(fg: string, bg: string): RGB {
	const f = parseColor(fg)
	const b = parseColor(bg)
	if (b.a !== 1) throw new Error(`background must be opaque: ${bg}`)
	return f.rgb.map((v, i) => v * f.a + b.rgb[i]! * (1 - f.a)) as RGB
}

function luminance([r, g, b]: RGB): number {
	const ch = (v: number) => {
		const s = v / 255
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** Contrast ratio of `fg` over the opaque `bg` (1 to 21). */
export function contrast(fg: string, bg: string): number {
	const a = luminance(blend(fg, bg))
	const b = luminance(parseColor(bg).rgb)
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
