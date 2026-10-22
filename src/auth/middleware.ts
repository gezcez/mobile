// middleware.ts
// openapi-fetch middleware: adds the bearer token when signed in, retries once after a 401
// AUTH_TOKEN_EXPIRED (refreshing first), and reports 403 AUTH_STEP_UP_REQUIRED without retrying.
// Guests send no token; a failed refresh never blocks a public request.
//
// The token is attached only to account endpoints (ACCOUNT_PATHS). Public transit, search, nearby,
// card lookups and telemetry always go out without it, so what the store labels call "not linked"
// data (usage counts, rounded location, search text, card numbers) never travels with the
// rider's identity (mobile-security-review finding 1).

import type { Middleware } from "openapi-fetch"
import type { AuthClient } from "./session"

/** Path prefixes (after any base path) that carry the bearer token. Everything else is anonymous. */
export const ACCOUNT_PATHS = ["/v1/me"] as const

/** True when the request URL is an account endpoint that needs the rider's token. */
export function needsAuth(url: string): boolean {
	let path: string
	try {
		path = new URL(url).pathname
	} catch {
		return false
	}
	return ACCOUNT_PATHS.some((p) => {
		const i = path.indexOf(p)
		if (i < 0) return false
		// Match "/v1/me" and "/v1/me/..." only, never "/v1/media" or "/x/v1/me" behind a query.
		const rest = path.slice(i + p.length)
		return rest === "" || rest.startsWith("/")
	})
}

export function authMiddleware(auth: AuthClient, fetchImpl: () => typeof fetch): Middleware {
	const pending = new Map<string, Request>()
	return {
		async onRequest({ request, id }) {
			// Never let a caller-supplied header leak identity onto a public endpoint either.
			if (!needsAuth(request.url)) {
				request.headers.delete("Authorization")
				return request
			}
			if (auth.status() !== "signed_in") return request
			try {
				const token = await auth.getAccessToken()
				request.headers.set("Authorization", `Bearer ${token}`)
				pending.set(id, request.clone())
			} catch {
				// Signed out or offline: send the request without a token.
			}
			return request
		},
		async onResponse({ response, id }) {
			const original = pending.get(id)
			pending.delete(id)
			if (!original || (response.status !== 401 && response.status !== 403)) return response
			let code: string | undefined
			let maxAge = 600
			try {
				const body = (await response.clone().json()) as {
					error?: { code?: string; details?: { max_age?: number } }
				}
				code = body.error?.code
				maxAge = body.error?.details?.max_age ?? 600
			} catch {
				return response
			}
			if (response.status === 403 && code === "AUTH_STEP_UP_REQUIRED") {
				auth.reportStepUp(maxAge)
				return response
			}
			if (response.status !== 401 || code !== "AUTH_TOKEN_EXPIRED") return response
			auth.invalidateAccessToken()
			try {
				const token = await auth.getAccessToken()
				const retry = new Request(original, { headers: new Headers(original.headers) })
				retry.headers.set("Authorization", `Bearer ${token}`)
				return await fetchImpl()(retry)
			} catch {
				return response
			}
		},
		onError({ id }) {
			pending.delete(id)
		},
	}
}
