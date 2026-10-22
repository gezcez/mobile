// session.ts
// The AuthClient state machine from the oauth.md client integration contract (9.2, 9.5), native
// flavour: access token in memory only, refresh token in AuthStorage (SecureStore), in-process
// single-flight refresh, proactive refresh paused in the background and run on AppState "active"
// at most once per wake, `invalid_grant` signs out, network errors never do.

import { AuthError, isAuthError } from "./errors"
import { decodeClaims, type AccessClaims } from "./jwt"
import { challengeS256, createState, createVerifier } from "./pkce"
import { LAST_SIGN_OUT_KEY, REFRESH_TOKEN_KEY, type AuthStorage } from "./storage"
import { exchangeCode, refreshTokens, revokeToken, type TokenClientConfig, type TokenSet } from "./tokens"

export type AuthStatus = "unknown" | "signed_in" | "signed_out"
export type AuthEvent =
	| { type: "signed_in" }
	| { type: "refreshed" }
	| { type: "signed_out"; reason: "user" | "expired" | "revoked" }
	| { type: "step_up_required"; maxAge: number }

export interface AuthConfig {
	clientId: string
	issuer: string
	authorizeUrl: string
	apiBaseUrl: string
	redirectUri: string
	scopes: string[]
	refreshMode: "storage"
	storage: AuthStorage
	refreshLeewaySec?: number
	locale?: () => string
	onEvent?: (e: AuthEvent) => void
}

/** Browser leg of the flow: open the authorize URL, return the redirect URL or a cancel. */
export interface AuthBrowser {
	authorize(args: {
		authorizeUrl: string
		params: Record<string, string>
		redirectUri: string
	}): Promise<{ type: "redirect"; url: string } | { type: "cancel" }>
}

export interface AuthDeps {
	browser: AuthBrowser
	fetch?: typeof fetch
	/** Seconds since epoch. */
	now?: () => number
	setTimer?: (fn: () => void, ms: number) => unknown
	clearTimer?: (t: unknown) => void
}

export type LoginResult = { type: "success" } | { type: "cancelled" } | { type: "error"; error: AuthError }

export interface LoginOptions {
	prompt?: "login" | "select_account" | "consent"
	maxAge?: number
	loginHint?: string
}

export interface AuthClient {
	status(): AuthStatus
	subscribe(fn: (s: AuthStatus) => void): () => void
	onEvent(fn: (e: AuthEvent) => void): () => void
	login(opts?: LoginOptions): Promise<LoginResult>
	/** The redirect URL reached the app through a deep link instead of the auth session result. */
	completeFromUrl(url: string): Promise<LoginResult>
	hasPendingLogin(): boolean
	getAccessToken(): Promise<string>
	/** Forget the in-memory access token (after a 401) so the next call refreshes. */
	invalidateAccessToken(): void
	tryRestore(): Promise<boolean>
	stepUp(opts: { maxAge: number }): Promise<LoginResult>
	logout(): Promise<void>
	claims(): AccessClaims | null
	fetch(input: string, init?: RequestInit): Promise<Response>
	/** Wire to AppState: "active" resumes proactive refresh, anything else pauses it. */
	setAppActive(active: boolean): void
	/** Report a 403 AUTH_STEP_UP_REQUIRED seen by another layer (fetch middleware). */
	reportStepUp(maxAge: number): void
}

const TXN_MAX_AGE_S = 600

interface Txn {
	state: string
	verifier: string
	redirectUri: string
	createdAt: number
}

export function createAuthClient(config: AuthConfig, deps: AuthDeps): AuthClient {
	const leeway = config.refreshLeewaySec ?? 60
	const now = deps.now ?? (() => Math.floor(Date.now() / 1000))
	const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms))
	const clearTimer = deps.clearTimer ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>))
	const tokenCfg: TokenClientConfig = { apiBaseUrl: config.apiBaseUrl, clientId: config.clientId, fetch: deps.fetch }
	const storage = config.storage

	let status: AuthStatus = "unknown"
	let access: { token: string; exp: number; claims: AccessClaims | null } | null = null
	/** undefined: not read from storage yet. */
	let refreshToken: string | null | undefined
	let inflight: Promise<string> | null = null
	let txn: Txn | null = null
	let timer: unknown = null
	let appActive = true
	let refreshedThisWake = false

	const statusListeners = new Set<(s: AuthStatus) => void>()
	const eventListeners = new Set<(e: AuthEvent) => void>()

	function setStatus(next: AuthStatus) {
		if (status === next) return
		status = next
		for (const fn of statusListeners) fn(next)
	}

	function emit(e: AuthEvent) {
		config.onEvent?.(e)
		for (const fn of eventListeners) fn(e)
	}

	async function loadRefreshToken(): Promise<string | null> {
		if (refreshToken === undefined) refreshToken = await storage.get(REFRESH_TOKEN_KEY)
		return refreshToken
	}

	function cancelTimer() {
		if (timer !== null) clearTimer(timer)
		timer = null
	}

	function scheduleProactiveRefresh() {
		cancelTimer()
		if (!appActive || !access) return
		const delayMs = Math.max(0, (access.exp - leeway - now()) * 1000)
		timer = setTimer(() => {
			timer = null
			refresh().catch(() => {})
		}, delayMs)
	}

	async function applyTokens(tokens: TokenSet) {
		if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
			await storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken)
			refreshToken = tokens.refreshToken
		}
		const claims = decodeClaims(tokens.accessToken)
		access = { token: tokens.accessToken, exp: claims?.exp ?? now() + tokens.expiresIn, claims }
		setStatus("signed_in")
		scheduleProactiveRefresh()
	}

	async function clearLocal(reason: "user" | "expired" | "revoked") {
		cancelTimer()
		access = null
		refreshToken = null
		await storage.remove(REFRESH_TOKEN_KEY)
		setStatus("signed_out")
		emit({ type: "signed_out", reason })
	}

	async function doRefresh(): Promise<string> {
		const rt = await loadRefreshToken()
		if (!rt) {
			setStatus("signed_out")
			throw new AuthError("signed_out")
		}
		let tokens: TokenSet
		try {
			tokens = await refreshTokens(tokenCfg, rt)
		} catch (e) {
			if (isAuthError(e, "invalid_grant")) {
				await clearLocal("expired")
				throw e
			}
			throw e // network and other errors keep the session
		}
		await applyTokens(tokens)
		emit({ type: "refreshed" })
		return access!.token
	}

	function refresh(): Promise<string> {
		inflight ??= doRefresh().finally(() => {
			inflight = null
		})
		return inflight
	}

	async function getAccessToken(): Promise<string> {
		if (access && access.exp - now() > leeway) return access.token
		return refresh()
	}

	async function completeFromUrl(url: string): Promise<LoginResult> {
		const current = txn
		txn = null
		const params = parseQuery(url)
		if (!current || !params.state || params.state !== current.state || now() - current.createdAt > TXN_MAX_AGE_S) {
			return { type: "error", error: new AuthError("state_mismatch") }
		}
		if (params.error) {
			const kind = params.error === "access_denied" ? "access_denied" : "oauth_error"
			return { type: "error", error: new AuthError(kind, params.error_description ?? params.error) }
		}
		if (!params.code) return { type: "error", error: new AuthError("oauth_error", "missing code") }
		try {
			const tokens = await exchangeCode(tokenCfg, {
				code: params.code,
				codeVerifier: current.verifier,
				redirectUri: current.redirectUri,
			})
			await applyTokens(tokens)
			await storage.remove(LAST_SIGN_OUT_KEY)
			emit({ type: "signed_in" })
			return { type: "success" }
		} catch (e) {
			return { type: "error", error: isAuthError(e) ? e : new AuthError("network", String(e)) }
		}
	}

	async function login(opts: LoginOptions = {}): Promise<LoginResult> {
		const verifier = createVerifier()
		const challenge = await challengeS256(verifier)
		const state = createState()
		txn = { state, verifier, redirectUri: config.redirectUri, createdAt: now() }
		const explicitSignOut = (await storage.get(LAST_SIGN_OUT_KEY)) === "1"
		const params: Record<string, string> = {
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: "code",
			scope: config.scopes.join(" "),
			state,
			code_challenge: challenge,
			code_challenge_method: "S256",
		}
		const locale = config.locale?.()
		if (locale) params.ui_locales = locale
		const prompt = opts.prompt ?? (explicitSignOut ? "select_account" : undefined)
		if (prompt) params.prompt = prompt
		if (opts.maxAge !== undefined) params.max_age = String(opts.maxAge)
		if (opts.loginHint) params.login_hint = opts.loginHint

		let result: Awaited<ReturnType<AuthBrowser["authorize"]>>
		try {
			result = await deps.browser.authorize({
				authorizeUrl: config.authorizeUrl,
				params,
				redirectUri: config.redirectUri,
			})
		} catch (e) {
			txn = null
			return { type: "error", error: new AuthError("network", String(e)) }
		}
		if (result.type === "cancel") {
			txn = null
			return { type: "cancelled" }
		}
		return completeFromUrl(result.url)
	}

	async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
		const f = deps.fetch ?? globalThis.fetch
		const send = async (token: string) => {
			const headers = new Headers(init.headers)
			headers.set("Authorization", `Bearer ${token}`)
			return f(input, { ...init, headers })
		}
		let res = await send(await getAccessToken())
		const code = await errorCode(res)
		if (res.status === 401 && code === "AUTH_TOKEN_EXPIRED") {
			access = null
			res = await send(await refresh())
		} else if (res.status === 403 && code === "AUTH_STEP_UP_REQUIRED") {
			emit({ type: "step_up_required", maxAge: 600 })
		}
		return res
	}

	return {
		status: () => status,
		subscribe(fn) {
			statusListeners.add(fn)
			return () => statusListeners.delete(fn)
		},
		onEvent(fn) {
			eventListeners.add(fn)
			return () => eventListeners.delete(fn)
		},
		login,
		completeFromUrl,
		hasPendingLogin: () => txn !== null,
		getAccessToken,
		invalidateAccessToken() {
			access = null
		},
		async tryRestore() {
			// Lazy: no network at boot (plan 8.1.7). The first authenticated call refreshes.
			const rt = await loadRefreshToken()
			setStatus(rt ? "signed_in" : "signed_out")
			return !!rt
		},
		stepUp: ({ maxAge }) => login({ maxAge }),
		async logout() {
			const rt = await loadRefreshToken()
			if (rt) {
				try {
					await revokeToken(tokenCfg, rt)
				} catch {
					// Revoke failed (offline): clear anyway, never retry forever (race rule 7).
				}
			}
			await clearLocal("user")
			await storage.set(LAST_SIGN_OUT_KEY, "1")
		},
		claims: () => access?.claims ?? null,
		fetch: authedFetch,
		setAppActive(active) {
			if (active === appActive) return
			appActive = active
			if (!active) {
				cancelTimer()
				refreshedThisWake = false
				return
			}
			if (status !== "signed_in" || !access) return
			if (access.exp - now() <= leeway) {
				if (refreshedThisWake) return
				refreshedThisWake = true
				refresh().catch(() => {})
			} else {
				scheduleProactiveRefresh()
			}
		},
		reportStepUp(maxAge) {
			emit({ type: "step_up_required", maxAge })
		},
	}
}

function parseQuery(url: string): Record<string, string> {
	const q = url.includes("?") ? url.slice(url.indexOf("?") + 1).split("#")[0]! : ""
	const out: Record<string, string> = {}
	for (const pair of q.split("&")) {
		if (!pair) continue
		const [k, v = ""] = pair.split("=")
		try {
			out[decodeURIComponent(k!)] = decodeURIComponent(v.replace(/\+/g, " "))
		} catch {
			// ignore malformed pairs
		}
	}
	return out
}

async function errorCode(res: Response): Promise<string | null> {
	if (res.status !== 401 && res.status !== 403) return null
	try {
		const body = (await res.clone().json()) as { error?: { code?: string } }
		return body.error?.code ?? null
	} catch {
		return null
	}
}
