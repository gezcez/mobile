// color.ts
// WCAG contrast helpers for data-driven colours (route badges).

function channel(c: number): number {
	const s = c / 255
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function parseHex(hex: string): [number, number, number] | null {
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
	if (!m?.[1]) return null
	let h = m[1]
	if (h.length === 3)
		h = h
			.split("")
			.map((c) => c + c)
			.join("")
	const n = parseInt(h, 16)
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function luminance(hex: string): number {
	const rgb = parseHex(hex)
	if (!rgb) return 0
	return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

export function contrastRatio(a: string, b: string): number {
	const la = luminance(a)
	const lb = luminance(b)
	const [hi, lo] = la > lb ? [la, lb] : [lb, la]
	return (hi + 0.05) / (lo + 0.05)
}

const NAVY = "#172554"
const WHITE = "#ffffff"

/**
 * Text colour for a badge: the data's text colour if it passes 4.5:1, else navy or white,
 * whichever contrasts more (plan 10.2).
 */
export function readableTextOn(bg: string, preferred?: string | null): string {
	if (preferred && parseHex(preferred) && contrastRatio(bg, preferred) >= 4.5) return normalise(preferred)
	return contrastRatio(bg, NAVY) >= contrastRatio(bg, WHITE) ? NAVY : WHITE
}

export function normalise(hex: string): string {
	const rgb = parseHex(hex)
	if (!rgb) return hex
	return "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("")
}

/** Accept "1a2b3c" or "#1a2b3c" from the API; fall back when missing or invalid. */
export function colorOr(hex: string | null | undefined, fallback: string): string {
	return hex && parseHex(hex) ? normalise(hex) : fallback
}
