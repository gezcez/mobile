import createClient from "openapi-fetch"
import { authMiddleware } from "./middleware"
import type { AuthClient } from "./session"

function fakeAuth(status: "signed_in" | "signed_out") {
	let n = 0
	const a = {
		status: () => status,
		getAccessToken: jest.fn(async () => `t${n}`),
		invalidateAccessToken: jest.fn(() => {
			n++
		}),
		reportStepUp: jest.fn(),
	}
	return a as unknown as AuthClient & typeof a
}

const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

describe("authMiddleware", () => {
	it("sends no token for guests", async () => {
		const seen: (string | null)[] = []
		const f = jest.fn(async (r: Request) => {
			seen.push(r.headers.get("authorization"))
			return json(200, { ok: true, data: 1 })
		})
		const c = createClient<Record<string, never>>({ baseUrl: "https://api.test", fetch: f })
		c.use(authMiddleware(fakeAuth("signed_out"), () => f as unknown as typeof fetch))
		await (c as any).GET("/v1/cities")
		expect(seen).toEqual([null])
	})

	it("adds the bearer and retries exactly once after AUTH_TOKEN_EXPIRED", async () => {
		const seen: (string | null)[] = []
		const f = jest.fn(async (r: Request) => {
			seen.push(r.headers.get("authorization"))
			return seen.length === 1
				? json(401, { ok: false, error: { code: "AUTH_TOKEN_EXPIRED" } })
				: json(200, { ok: true, data: { email: "a@b.c" } })
		})
		const auth = fakeAuth("signed_in")
		const c = createClient<Record<string, never>>({ baseUrl: "https://api.test", fetch: f })
		c.use(authMiddleware(auth, () => f as unknown as typeof fetch))
		const r = await (c as any).GET("/v1/me")
		expect(seen).toEqual(["Bearer t0", "Bearer t1"])
		expect(r.data).toEqual({ ok: true, data: { email: "a@b.c" } })
	})

	it("reports step-up and does not retry", async () => {
		const f = jest.fn(async () =>
			json(403, { ok: false, error: { code: "AUTH_STEP_UP_REQUIRED", details: { max_age: 600 } } }),
		)
		const auth = fakeAuth("signed_in")
		const c = createClient<Record<string, never>>({ baseUrl: "https://api.test", fetch: f })
		c.use(authMiddleware(auth, () => f as unknown as typeof fetch))
		await (c as any).PUT("/v1/me/favourites", { body: {} })
		expect(f).toHaveBeenCalledTimes(1)
		expect(auth.reportStepUp).toHaveBeenCalledWith(600)
	})
})
