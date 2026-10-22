// bbox.ts
// Pure helpers for the city map feed: which bbox to subscribe with and what is in view.

export type Bounds = [number, number, number, number]

const GRID = 0.05

/** Snap outward to a 0.05° grid so small pans keep the same subscription; null above 0.5° span. */
export function feedBbox(zoom: number, bounds: Bounds | null): Bounds | null {
	if (!bounds || zoom < 12) return null
	const [w, s, e, n] = bounds
	const snapped: Bounds = [Math.floor(w / GRID) * GRID, Math.floor(s / GRID) * GRID, Math.ceil(e / GRID) * GRID, Math.ceil(n / GRID) * GRID].map(
		(x) => Math.round(x * 1000) / 1000,
	) as Bounds
	if (snapped[2] - snapped[0] > 0.5 || snapped[3] - snapped[1] > 0.5) return null
	return snapped
}

export function inBounds(v: { lat: number; lon: number }, b: Bounds | null): boolean {
	if (!b) return true
	return v.lon >= b[0] && v.lon <= b[2] && v.lat >= b[1] && v.lat <= b[3]
}
