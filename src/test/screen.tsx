// screen.tsx
// Screen-test harness: renders a screen with a fresh QueryClient over the mock backend (src/mock),
// a fixed clock (Wednesday 08:00 in Istanbul), fresh stores, in-memory packs and the toast host.
// Paths can be made to fail, hang or look offline per test to reach the error, loading and
// offline states.

import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react-native"
import type { ReactElement } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { auth } from "@/auth"
import { useCardsStore } from "@/features/cards/useCardsStore"
import { useCityStore } from "@/features/city/useCityStore"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { useRecentSearches } from "@/features/search/recentSearches"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { i18n } from "@/i18n"
import type { AppLanguage } from "@/i18n/resources"
import { useLocationStore } from "@/lib/location"
import { setTransportFetch } from "@/lib/transport"
import { createMockFetch, resetMockState } from "@/mock/fetch"
import { memoryFileStore } from "@/pack/fileStore"
import { setPackFiles } from "@/pack/packStore"
import { ToastHost } from "@/ui/Toast"
import { resetRouter } from "./router"

/** Wednesday 2026-10-21, 08:00 in Istanbul: every mock route is running. */
export const NOW = Date.parse("2026-10-21T05:00:00Z")

/** Near İzmit Merkez, Kocaeli. */
export const KOCAELI_FIX = { lat: 40.7656, lon: 29.9175, accuracy: 20, at: NOW }

type Override = (req: Request) => Response | Promise<Response> | null | undefined
let overrides: Override[] = []

const mockFetch = createMockFetch({ now: () => Date.now() })

setTransportFetch(async (input, init) => {
	const req = input instanceof Request ? input : new Request(input instanceof URL ? input.href : input, init)
	for (const o of overrides) {
		const r = await o(req)
		if (r) return r
	}
	return mockFetch(req)
})

const pathOf = (req: Request) => new URL(req.url).pathname

/** Answer matching requests with an API error envelope. */
export function failPath(re: RegExp, status = 500, code = "INTERNAL") {
	overrides.push((req) =>
		re.test(pathOf(req))
			? new Response(JSON.stringify({ ok: false, error: { code, message: code, request_id: "req-test" } }), {
					status,
					headers: { "content-type": "application/json", "x-request-id": "req-test" },
				})
			: null,
	)
}

/** Matching requests never answer (loading states). */
export function hangPath(re: RegExp) {
	overrides.push((req) => (re.test(pathOf(req)) ? new Promise<Response>(() => undefined) : null))
}

/** Matching requests fail like a dropped connection. */
export function dropPath(re: RegExp) {
	overrides.push((req) => (re.test(pathOf(req)) ? Promise.reject(new TypeError("Network request failed")) : null))
}

/** Every request fails like a dropped connection and TanStack Query is told the device is offline. */
export function goOffline() {
	dropPath(/./)
	onlineManager.setOnline(false)
}

export async function setLanguage(lng: AppLanguage) {
	usePrefsStore.setState({ locale: lng })
	await i18n.changeLanguage(lng)
}

export function testQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, retryDelay: 0, gcTime: Infinity, networkMode: "offlineFirst" },
			mutations: { retry: false },
		},
	})
}

const initial = {
	prefs: usePrefsStore.getState(),
	city: useCityStore.getState(),
	favourites: useFavouritesStore.getState(),
	recents: useRecentSearches.getState(),
	cards: useCardsStore.getState(),
	location: useLocationStore.getState(),
}

/** Call once at the top of a screen test file. */
export function setupScreenTests(opts: { city?: string | null } = {}) {
	beforeEach(async () => {
		jest.useFakeTimers({ now: NOW, advanceTimers: true, doNotFake: ["nextTick", "queueMicrotask", "setImmediate"] })
		overrides = []
		resetRouter()
		resetMockState()
		setPackFiles(memoryFileStore())
		onlineManager.setOnline(true)
		usePrefsStore.setState({ ...initial.prefs, onboarded: true }, true)
		useCityStore.setState({ ...initial.city, cityId: opts.city === undefined ? "kocaeli" : opts.city }, true)
		useFavouritesStore.setState(initial.favourites, true)
		useRecentSearches.setState(initial.recents, true)
		useCardsStore.setState(initial.cards, true)
		useLocationStore.setState(initial.location, true)
		await i18n.changeLanguage("en")
	})
	afterEach(async () => {
		if (auth.status() === "signed_in") await auth.logout()
		jest.useRealTimers()
	})
}

export async function renderScreen(ui: ReactElement, options: { client?: QueryClient } & RenderOptions = {}) {
	const { client = testQueryClient(), ...rest } = options
	const result = await render(
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
				<QueryClientProvider client={client}>
					{ui}
					<ToastHost />
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>,
		rest,
	)
	return { ...result, client }
}
