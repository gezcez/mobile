// Conformance tests for the oauth.md client integration contract (9.8 vectors and race rules;
// rules 2 and 6 are web only). Copied, not imported, as the contract asks.

import { base64UrlEncode, utf8Encode } from "./base64"
import { AuthError } from "./errors"
import { challengeS256, createState, createVerifier } from "./pkce"
import { safeInternalPath } from "./safe-path"
import { createAuthClient, type AuthBrowser, type AuthEvent } from "./session"
import { LAST_SIGN_OUT_KEY, memoryStorage, REFRESH_TOKEN_KEY, secureStoreStorage } from "./storage"

const API = "https://api.test"
const REDIRECT = "gezcez-dev://oauth/callback"

function jwt(payload: Record<string, unknown>): string {
	const enc = (o: unknown) => base64UrlEncode(utf8Encode(JSON.stringify(o)))
	return `${enc({ alg: "ES256" })}.${enc(payload)}.sig`
}

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

interface Harness {
	clock: { t: number }
	calls: { url: string; body: string }[]
	tokenHandler: (body: URLSearchParams) => Response | Promise<Response>
}

function setup(opts: { rt?: string; browser?: AuthBrowser; api?: (req: Request) => Response } = {}) {
	const h: Harness = {
		clock: { t: 1_000_000 },
		calls: [],
		tokenHandler: () => json(200, { access_token: jwt({ sub: "u1", exp: h.clock.t + 900 }), expires_in: 900 }),
	}
	const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
		const body = typeof init?.body === "string" ? init.body : ""
		h.calls.push({ url, body })
		if (url.endsWith("/v1/oauth/token")) return h.tokenHandler(new URLSearchParams(body))
		if (url.endsWith("/v1/oauth/revoke")) return new Response(null, { status: 200 })
		if (opts.api) return opts.api(new Request(url, init))
		return json(404, { ok: false, error: { code: "NOT_FOUND" } })
	}) as unknown as typeof fetch
	const storage = memoryStorage(opts.rt ? { [REFRESH_TOKEN_KEY]: opts.rt } : {})
	const events: AuthEvent[] = []
	const timers: { fn: () => void; ms: number }[] = []
	const browser: AuthBrowser = opts.browser ?? { authorize: async () => ({ type: "cancel" }) }
	const client = createAuthClient(
		{
			clientId: "mobile-dev",
			issuer: API,
			authorizeUrl: "https://oauth.test/authorize",
			apiBaseUrl: API,
			redirectUri: REDIRECT,
			scopes: ["openid", "profile", "email", "offline_access", "transit"],
			refreshMode: "storage",
			storage,
			locale: () => "tr",
			onEvent: (e) => events.push(e),
		},
		{
			browser,
			fetch: fetchMock,
			now: () => h.clock.t,
			setTimer: (fn, ms) => {
				timers.push({ fn, ms })
				return timers.length
			},
			clearTimer: () => {},
		},
	)
	const tokenCalls = () => h.calls.filter((c) => c.url.endsWith("/v1/oauth/token"))
	return { client, storage, events, h, tokenCalls, fetchMock, timers }
}

describe("test vectors", () => {
	it("1. PKCE RFC 7636 Appendix B", async () => {
		await expect(challengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).resolves.toBe(
			"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		)
	})

	it("2. verifiers are 43 base64url chars from 32 random bytes and never repeat", () => {
		const a = createVerifier()
		const b = createVerifier()
		expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(a).not.toBe(b)
	})

	it("3. state is 22 chars; missing, unknown or stale state rejects without a token request", async () => {
		expect(createState()).toMatch(/^[A-Za-z0-9_-]{22}$/)

		// no login in flight at all
		const s1 = setup()
		await expect(s1.client.completeFromUrl(`${REDIRECT}?code=c&state=x`)).resolves.toEqual({
			type: "error",
			error: new AuthError("state_mismatch"),
		})
		expect(s1.tokenCalls()).toHaveLength(0)

		// wrong state and missing state
		for (const tail of ["code=c&state=forged", "code=c"]) {
			const s = setup({ browser: { authorize: async () => ({ type: "redirect", url: `${REDIRECT}?${tail}` }) } })
			const r = await s.client.login()
			expect(r.type === "error" && r.error.kind).toBe("state_mismatch")
			expect(s.tokenCalls()).toHaveLength(0)
		}

		// transaction older than 10 minutes
		let sent: Record<string, string> = {}
		const s4 = setup({
			browser: {
				authorize: async ({ params }) => {
					sent = params
					s4.h.clock.t += 601
					return { type: "redirect", url: `${REDIRECT}?code=c&state=${sent.state}` }
				},
			},
		})
		const r4 = await s4.client.login()
		expect(r4.type === "error" && r4.error.kind).toBe("state_mismatch")
		expect(s4.tokenCalls()).toHaveLength(0)
	})

	it("4. error=access_denied resolves to a typed access_denied error", async () => {
		const s = setup({
			browser: {
				authorize: async ({ params }) => ({
					type: "redirect",
					url: `${REDIRECT}?error=access_denied&state=${params.state}`,
				}),
			},
		})
		const r = await s.client.login()
		expect(r.type === "error" && r.error.kind).toBe("access_denied")
		expect(s.tokenCalls()).toHaveLength(0)
	})

	it("5. safeInternalPath table", () => {
		expect(safeInternalPath("/")).toBe("/")
		expect(safeInternalPath("/a?b=c#d")).toBe("/a?b=c#d")
		for (const bad of [
			"//evil.com",
			"/\\evil.com",
			"https://evil",
			"javascript:alert(1)",
			"%2F%2Fevil.com",
			"/%5Cevil.com",
			"",
		])
			expect(safeInternalPath(bad)).toBe("/")
	})
})

describe("authorization request", () => {
	it("sends client_id, exact redirect_uri, code, scope, state, S256 challenge and ui_locales, then exchanges", async () => {
		let sent: Record<string, string> = {}
		const s = setup({
			browser: {
				authorize: async ({ params }) => {
					sent = params
					return { type: "redirect", url: `${REDIRECT}?code=the-code&state=${params.state}` }
				},
			},
		})
		s.h.tokenHandler = () =>
			json(200, { access_token: jwt({ sub: "u1", sid: "s1", exp: s.h.clock.t + 900 }), refresh_token: "rt1", expires_in: 900 })
		const r = await s.client.login()
		expect(r).toEqual({ type: "success" })
		expect(sent).toMatchObject({
			client_id: "mobile-dev",
			redirect_uri: REDIRECT,
			response_type: "code",
			scope: "openid profile email offline_access transit",
			code_challenge_method: "S256",
			ui_locales: "tr",
		})
		expect(sent.code_challenge).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(sent.prompt).toBeUndefined()
		const body = new URLSearchParams(s.tokenCalls()[0]!.body)
		expect(body.get("grant_type")).toBe("authorization_code")
		expect(body.get("code")).toBe("the-code")
		expect(body.get("redirect_uri")).toBe(REDIRECT)
		expect(await challengeS256(body.get("code_verifier")!)).toBe(sent.code_challenge)
		expect(body.get("client_secret")).toBeNull()
		expect(s.client.status()).toBe("signed_in")
		expect(s.client.claims()?.sid).toBe("s1")
		expect(s.storage.dump()[REFRESH_TOKEN_KEY]).toBe("rt1")
		expect(s.events).toContainEqual({ type: "signed_in" })
	})

	it("a closed sheet resolves cancelled with no error", async () => {
		const s = setup()
		await expect(s.client.login()).resolves.toEqual({ type: "cancelled" })
		expect(s.client.hasPendingLogin()).toBe(false)
	})

	it("after an explicit sign-out the next login uses prompt=select_account", async () => {
		let sent: Record<string, string> = {}
		const s = setup({
			rt: "rt0",
			browser: {
				authorize: async ({ params }) => {
					sent = params
					return { type: "cancel" }
				},
			},
		})
		await s.client.logout()
		await s.client.login()
		expect(sent.prompt).toBe("select_account")
	})

	it("step-up logs in again with max_age=600", async () => {
		let sent: Record<string, string> = {}
		const s = setup({
			browser: {
				authorize: async ({ params }) => {
					sent = params
					return { type: "cancel" }
				},
			},
		})
		await s.client.stepUp({ maxAge: 600 })
		expect(sent.max_age).toBe("600")
	})
})

describe("race rules", () => {
	it("1. 100 concurrent getAccessToken calls cause exactly one refresh", async () => {
		const s = setup({ rt: "rt0" })
		let resolve!: (r: Response) => void
		s.h.tokenHandler = () => new Promise<Response>((r) => (resolve = r))
		const all = Promise.all(Array.from({ length: 100 }, () => s.client.getAccessToken()))
		await new Promise((r) => setTimeout(r, 0))
		resolve(json(200, { access_token: jwt({ sub: "u1", exp: s.h.clock.t + 900 }), refresh_token: "rt1", expires_in: 900 }))
		const tokens = await all
		expect(s.tokenCalls()).toHaveLength(1)
		expect(new Set(tokens).size).toBe(1)
		expect(s.storage.dump()[REFRESH_TOKEN_KEY]).toBe("rt1")
	})

	it("3. a duplicate refresh receiving the same successor within the grace window is not an error", async () => {
		const s = setup({ rt: "rt0" })
		s.h.tokenHandler = () =>
			json(200, { access_token: jwt({ sub: "u1", exp: s.h.clock.t + 30 }), refresh_token: "rt1", expires_in: 30 })
		await s.client.getAccessToken()
		await s.client.getAccessToken() // inside the 60 s leeway: refreshes again, server repeats rt1
		expect(s.tokenCalls()).toHaveLength(2)
		expect(s.client.status()).toBe("signed_in")
		expect(s.storage.dump()[REFRESH_TOKEN_KEY]).toBe("rt1")
	})

	it("4. invalid_grant clears tokens and emits signed_out once for many waiters; network errors never sign out", async () => {
		const s = setup({ rt: "rt0" })
		s.h.tokenHandler = () => json(400, { error: "invalid_grant" })
		const results = await Promise.allSettled([1, 2, 3, 4, 5].map(() => s.client.getAccessToken()))
		expect(results.every((r) => r.status === "rejected")).toBe(true)
		expect(s.events.filter((e) => e.type === "signed_out")).toEqual([{ type: "signed_out", reason: "expired" }])
		expect(s.storage.dump()[REFRESH_TOKEN_KEY]).toBeUndefined()
		expect(s.client.status()).toBe("signed_out")

		const n = setup({ rt: "rt0" })
		n.h.tokenHandler = () => {
			throw new TypeError("Network request failed")
		}
		await expect(n.client.getAccessToken()).rejects.toMatchObject({ kind: "network" })
		n.h.tokenHandler = () => json(503, {})
		await expect(n.client.getAccessToken()).rejects.toMatchObject({ kind: "network" })
		expect(n.storage.dump()[REFRESH_TOKEN_KEY]).toBe("rt0")
		expect(n.events.some((e) => e.type === "signed_out")).toBe(false)
	})

	it("5. a 401 AUTH_TOKEN_EXPIRED is retried exactly once; AUTH_STEP_UP_REQUIRED never", async () => {
		let apiCalls = 0
		const s = setup({
			rt: "rt0",
			api: () => {
				apiCalls++
				return apiCalls === 1
					? json(401, { ok: false, error: { code: "AUTH_TOKEN_EXPIRED" } })
					: json(200, { ok: true, data: {} })
			},
		})
		const res = await s.client.fetch(`${API}/v1/me`)
		expect(res.status).toBe(200)
		expect(apiCalls).toBe(2)
		expect(s.tokenCalls()).toHaveLength(2)

		let stepCalls = 0
		const t = setup({
			rt: "rt0",
			api: () => {
				stepCalls++
				return json(403, { ok: false, error: { code: "AUTH_STEP_UP_REQUIRED", details: { max_age: 600 } } })
			},
		})
		const r2 = await t.client.fetch(`${API}/v1/me/favourites`, { method: "PUT" })
		expect(r2.status).toBe(403)
		expect(stepCalls).toBe(1)
		expect(t.events).toContainEqual({ type: "step_up_required", maxAge: 600 })
	})

	it("7. logout revokes first, then clears, even when revoke fails", async () => {
		const s = setup({ rt: "rt0" })
		await s.client.logout()
		expect(s.h.calls[0]!.url).toBe(`${API}/v1/oauth/revoke`)
		expect(new URLSearchParams(s.h.calls[0]!.body).get("token")).toBe("rt0")
		expect(s.storage.dump()[REFRESH_TOKEN_KEY]).toBeUndefined()
		expect(s.storage.dump()[LAST_SIGN_OUT_KEY]).toBe("1")

		const f = setup({ rt: "rt0" })
		;(f.fetchMock as unknown as jest.Mock).mockImplementationOnce(async () => {
			throw new TypeError("offline")
		})
		await f.client.logout()
		expect(f.client.status()).toBe("signed_out")
		expect(f.storage.dump()[REFRESH_TOKEN_KEY]).toBeUndefined()
		expect(f.fetchMock).toHaveBeenCalledTimes(1)
	})

	it("8. proactive refresh pauses in the background and runs once per wake", async () => {
		const s = setup({ rt: "rt0" })
		await s.client.getAccessToken()
		expect(s.timers.at(-1)!.ms).toBe((900 - 60) * 1000)
		s.client.setAppActive(false)
		s.h.clock.t += 2000 // token expired while backgrounded
		s.client.setAppActive(true)
		s.client.setAppActive(true)
		await new Promise((r) => setTimeout(r, 0))
		expect(s.tokenCalls()).toHaveLength(2)
	})
})

describe("restore and storage", () => {
	it("tryRestore reads the stored refresh token without any network call", async () => {
		const s = setup({ rt: "rt0" })
		await expect(s.client.tryRestore()).resolves.toBe(true)
		expect(s.client.status()).toBe("signed_in")
		expect(s.h.calls).toHaveLength(0)
		const g = setup()
		await expect(g.client.tryRestore()).resolves.toBe(false)
		expect(g.client.status()).toBe("signed_out")
	})

	it("SecureStore adapter keeps the refresh token under gz.auth.rt, after first unlock, this device only", async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const SecureStore = require("expo-secure-store")
		const st = secureStoreStorage(SecureStore)
		await st.set(REFRESH_TOKEN_KEY, "rt")
		expect(SecureStore.setItemAsync).toHaveBeenCalledWith("gz.auth.rt", "rt", {
			keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
		})
		await expect(st.get(REFRESH_TOKEN_KEY)).resolves.toBe("rt")
	})
})
