// tokens.ts
// RFC 6749 token client for /v1/oauth/token and /v1/oauth/revoke. These two endpoints are not
// wrapped in the gezcez envelope (backend 3.2), so they are called with plain fetch, form encoded.
// `mobile` is a public client: no secret, PKCE instead.

import { AuthError } from "./errors"

export interface TokenSet {
	accessToken: string
	refreshToken: string | null
	expiresIn: number
	scope: string
}

export interface TokenClientConfig {
	apiBaseUrl: string
	clientId: string
	fetch?: typeof fetch
}

type TokenResponse = {
	access_token?: string
	refresh_token?: string
	expires_in?: number
	scope?: string
	error?: string
	error_description?: string
}

function form(body: Record<string, string>): string {
	return Object.entries(body)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
		.join("&")
}

async function post(cfg: TokenClientConfig, path: string, body: Record<string, string>): Promise<Response> {
	const f = cfg.fetch ?? globalThis.fetch
	try {
		return await f(`${cfg.apiBaseUrl}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
			body: form(body),
		})
	} catch (e) {
		throw new AuthError("network", e instanceof Error ? e.message : String(e))
	}
}

async function tokenRequest(cfg: TokenClientConfig, body: Record<string, string>): Promise<TokenSet> {
	const res = await post(cfg, "/v1/oauth/token", body)
	let json: TokenResponse = {}
	try {
		json = (await res.json()) as TokenResponse
	} catch {
		// fall through: a non-JSON body is a server or proxy problem, treated as network
	}
	if (res.ok && json.access_token) {
		return {
			accessToken: json.access_token,
			refreshToken: json.refresh_token ?? null,
			expiresIn: json.expires_in ?? 900,
			scope: json.scope ?? "",
		}
	}
	if (json.error === "invalid_grant") throw new AuthError("invalid_grant", json.error_description)
	if (json.error) throw new AuthError("oauth_error", json.error)
	// 5xx, 429 or garbage: never a reason to sign out.
	throw new AuthError("network", `token endpoint ${res.status}`)
}

export function exchangeCode(
	cfg: TokenClientConfig,
	args: { code: string; codeVerifier: string; redirectUri: string },
): Promise<TokenSet> {
	return tokenRequest(cfg, {
		grant_type: "authorization_code",
		code: args.code,
		code_verifier: args.codeVerifier,
		redirect_uri: args.redirectUri,
		client_id: cfg.clientId,
	})
}

export function refreshTokens(cfg: TokenClientConfig, refreshToken: string): Promise<TokenSet> {
	return tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: refreshToken, client_id: cfg.clientId })
}

export async function revokeToken(cfg: TokenClientConfig, token: string): Promise<void> {
	await post(cfg, "/v1/oauth/revoke", { token, token_type_hint: "refresh_token", client_id: cfg.clientId })
}
