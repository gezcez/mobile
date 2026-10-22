// AuthError kinds from oauth.md 9.1. `network` never signs anyone out.

export type AuthErrorKind =
	| "cancelled"
	| "state_mismatch"
	| "access_denied"
	| "oauth_error"
	| "invalid_grant"
	| "network"
	| "step_up_required"
	| "signed_out"

export class AuthError extends Error {
	readonly kind: AuthErrorKind
	readonly detail?: string

	constructor(kind: AuthErrorKind, detail?: string) {
		super(detail ? `${kind}: ${detail}` : kind)
		this.name = "AuthError"
		this.kind = kind
		this.detail = detail
	}
}

export function isAuthError(e: unknown, kind?: AuthErrorKind): e is AuthError {
	return e instanceof AuthError && (kind === undefined || e.kind === kind)
}
