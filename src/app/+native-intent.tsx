// Rewrites incoming deep links to app routes (plan 4). gezcez://city/<slug> opens the City sheet
// with that city offered; stop and route links already match their files. gezcez://privacy opens
// the privacy centre and gezcez://privacy/delete the data deletion screen (store listings link it).

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
	try {
		const p = path.replace(/^[a-z-]+:\/\//, "/")
		const m = /^\/?city\/([^/?#]+)/.exec(p)
		if (m) return `/city?cityId=${encodeURIComponent(decodeURIComponent(m[1]!))}`
		if (/^\/?privacy\/delete\/?(?:[?#].*)?$/.test(p)) return "/me/delete-data"
		if (/^\/?privacy\/?(?:[?#].*)?$/.test(p)) return "/me/privacy"
		return path
	} catch {
		return "/"
	}
}
