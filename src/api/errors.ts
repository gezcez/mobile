// errors.ts
// GezcezApiError { code, status, requestId } and the code -> i18n key mapping.

import { errors as enMessages } from "@/i18n/en/errors"
import type { components } from "./schema.gen"

export type ServerErrorCode = components["schemas"]["ErrorCode"]
/** Client-side codes: no connection, or a response we could not understand. */
export type ClientErrorCode = "NETWORK" | "UNKNOWN"
export type ErrorCode = ServerErrorCode | ClientErrorCode

export class GezcezApiError extends Error {
	readonly code: ErrorCode
	readonly status: number
	readonly requestId: string | null
	readonly details?: Record<string, unknown>

	constructor(opts: {
		code: ErrorCode
		status: number
		message?: string
		requestId?: string | null
		details?: Record<string, unknown>
	}) {
		super(opts.message ?? opts.code)
		this.name = "GezcezApiError"
		this.code = opts.code
		this.status = opts.status
		this.requestId = opts.requestId ?? null
		this.details = opts.details
	}
}

export function isApiError(e: unknown): e is GezcezApiError {
	return e instanceof GezcezApiError
}

export function errorCodeOf(e: unknown): ErrorCode {
	return isApiError(e) ? e.code : "UNKNOWN"
}

/** i18n key in the `errors` namespace for any thrown value. */
export function errorKey(e: unknown): `errors:${ErrorCode}` {
	return `errors:${errorCodeOf(e)}`
}

export function isRetryable(e: unknown): boolean {
	if (!isApiError(e)) return true
	return e.code === "NETWORK" || e.code === "RATE_LIMITED" || e.code === "PROVIDER_UNAVAILABLE" || e.status >= 500
}

/** Compile-time guard: every code in the generated ErrorCode union has an English message. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = enMessages
