// redirect.ts
// OAuth client and redirect URI for this runtime. Store and dev-client builds use the variant's
// scheme (gezcez, gezcez-preview, gezcez-dev). Expo Go cannot open those schemes, so there the
// redirect is Expo Go's own exp://<host>:<port>/--/oauth/callback from makeRedirectUri, and the
// client is always mobile-dev: the only client whose seed allows Expo Go redirects (dev clients only).

export const CALLBACK_PATH = "oauth/callback"

export interface AuthTarget {
	clientId: "mobile" | "mobile-dev"
	redirectUri: string
}

export function selectAuthTarget(opts: {
	expoGo: boolean
	scheme: string
	clientId: AuthTarget["clientId"]
	makeRedirectUri: (o: { path: string }) => string
}): AuthTarget {
	if (opts.expoGo) return { clientId: "mobile-dev", redirectUri: opts.makeRedirectUri({ path: CALLBACK_PATH }) }
	return { clientId: opts.clientId, redirectUri: `${opts.scheme}://${CALLBACK_PATH}` }
}
