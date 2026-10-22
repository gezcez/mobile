// client.ts
// openapi-fetch over the generated schema (plus the hand-typed endpoints in schema.manual.ts), with
// RN middleware: Accept-Language, X-Gezcez-Client, bearer token (src/auth middleware). The envelope
// `{ ok, data }` is unwrapped by `unwrap()`; failures throw GezcezApiError.

import createClient, { type Middleware } from "openapi-fetch"
import { Platform } from "react-native"
import { currentLanguage } from "@/i18n"
import { env } from "@/lib/env"
import { GezcezApiError, type ErrorCode } from "./errors"
import type { paths as GenPaths } from "./schema.gen"
import type { ManualPaths } from "./schema.manual"

export type ApiPaths = GenPaths & ManualPaths

/** Fails typecheck when an endpoint is both generated and hand-typed: delete it from schema.manual.ts. */
type Duplicated = keyof GenPaths & keyof ManualPaths
export const NO_DUPLICATE_PATHS: [Duplicated] extends [never] ? true : Duplicated = true

let fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args)

/** Swap the transport (mock mode, tests). */
export function setApiFetch(f: typeof fetch) {
	fetchImpl = f
}

export const api = createClient<ApiPaths>({
	baseUrl: env.apiUrl,
	fetch: (req) => fetchImpl(req),
})

const clientHeaders: Middleware = {
	onRequest({ request }) {
		request.headers.set("Accept-Language", currentLanguage())
		request.headers.set("X-Gezcez-Client", `mobile/${env.appVersion}/${Platform.OS}`)
		return request
	},
}
api.use(clientHeaders)

type Envelope<T> = { ok: true; data: T }
type ErrorBody = { ok?: false; error?: { code?: string; message?: string; request_id?: string; details?: Record<string, unknown> } }

/**
 * Await an openapi-fetch call and return `data` from the envelope, or throw GezcezApiError.
 * Network failures (fetch rejects) become code NETWORK.
 */
export async function unwrap<T>(
	call: Promise<{ data?: Envelope<T>; error?: unknown; response: Response }>,
): Promise<T> {
	let result: Awaited<typeof call>
	try {
		result = await call
	} catch (e) {
		if (e instanceof GezcezApiError) throw e
		throw new GezcezApiError({ code: "NETWORK", status: 0, message: e instanceof Error ? e.message : String(e) })
	}
	const { data, error, response } = result
	const requestId = response.headers.get("x-request-id")
	if (data && data.ok) return data.data
	const body = (error ?? {}) as ErrorBody
	const code = (body.error?.code ?? (response.status === 0 ? "NETWORK" : "UNKNOWN")) as ErrorCode
	throw new GezcezApiError({
		code,
		status: response.status,
		message: body.error?.message,
		requestId: body.error?.request_id ?? requestId,
		details: body.error?.details,
	})
}
