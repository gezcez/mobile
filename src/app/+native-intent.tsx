// Rewrites incoming deep links to app routes (plan 4). gezcez://city/<slug> opens the City sheet
// with that city offered; stop and route links already match their files.

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
	try {
		const m = /^\/?city\/([^/?#]+)/.exec(path.replace(/^[a-z-]+:\/\//, "/"))
		if (m) return `/city?cityId=${encodeURIComponent(decodeURIComponent(m[1]!))}`
		return path
	} catch {
		return "/"
	}
}
