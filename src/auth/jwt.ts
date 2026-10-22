// Decode-only JWT payload reader. Never trusted for authorization; UI hints and expiry only.

import { base64UrlDecode, utf8Decode } from "./base64"

export interface AccessClaims {
	sub: string
	sid: string
	authTime: number
	exp: number
	scope: string
}

export function decodeClaims(token: string): AccessClaims | null {
	const part = token.split(".")[1]
	if (!part) return null
	try {
		const p = JSON.parse(utf8Decode(base64UrlDecode(part))) as Record<string, unknown>
		if (typeof p.exp !== "number" || typeof p.sub !== "string") return null
		return {
			sub: p.sub,
			sid: typeof p.sid === "string" ? p.sid : "",
			authTime: typeof p.auth_time === "number" ? p.auth_time : 0,
			exp: p.exp,
			scope: typeof p.scope === "string" ? p.scope : "",
		}
	} catch {
		return null
	}
}
