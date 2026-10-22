// scrub.ts
// Pure scrubbers for crash reports and logs (plan section 13): no card numbers (10+ digit runs), no
// coordinates, no query strings, no tokens.

const LONG_DIGITS = /\d[\d -]{8,}\d/g
const BEARER = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g

export function scrubText(s: string): string {
	return s
		.replace(BEARER, "Bearer [redacted]")
		.replace(JWT, "[jwt]")
		.replace(LONG_DIGITS, (m) => (m.replace(/\D/g, "").length >= 10 ? "[number]" : m))
}

/** Drop the query string and fragment from a URL (coordinates and ids live there). */
export function scrubUrl(url: string): string {
	const i = url.search(/[?#]/)
	return i < 0 ? url : url.slice(0, i)
}

export function scrubDeep<T>(value: T, depth = 0): T {
	if (depth > 6) return value
	if (typeof value === "string") return scrubText(value) as T
	if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as T
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(value)) {
			if (/^(lat|lon|lng|latitude|longitude|coords?|card_?number|token|refresh_token|access_token|authorization)$/i.test(k))
				out[k] = "[redacted]"
			else if (/^url$/i.test(k) && typeof v === "string") out[k] = scrubUrl(v)
			else out[k] = scrubDeep(v, depth + 1)
		}
		return out as T
	}
	return value
}
