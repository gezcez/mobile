// middleware.ts
// openapi-fetch middleware: adds the bearer token when signed in, retries once after a 401
// AUTH_TOKEN_EXPIRED (refreshing first), and reports 403 AUTH_STEP_UP_REQUIRED without retrying.
// Guests send no token; a failed refresh never blocks a public request.

import type { Middleware } from "openapi-fetch"
import type { AuthClient } from "./session"

export function authMiddleware(auth: AuthClient, fetchImpl: () => typeof fetch): Middleware {
	const pending = new Map<string, Request>()
	return {
		async onRequest({ request, id }) {
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
