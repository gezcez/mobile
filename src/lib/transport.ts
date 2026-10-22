// transport.ts
// The one fetch used by the API client and the auth token client. In mock mode
// (EXPO_PUBLIC_MOCK=1, and in tests) it is the fixture-backed fetch from src/mock, so every screen
// works without a backend.

import { env } from "./env"

let impl: typeof fetch = (...args) => globalThis.fetch(...args)

if (env.mock) {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { createMockFetch } = require("@/mock/fetch") as typeof import("@/mock/fetch")
	impl = createMockFetch({ latencyMs: process.env.NODE_ENV === "test" ? 0 : 250 })
}

export const transportFetch: typeof fetch = (input, init) => impl(input, init)

/** Swap the transport (tests). */
export function setTransportFetch(f: typeof fetch) {
	impl = f
}
