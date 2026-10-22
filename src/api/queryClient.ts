// queryClient.ts
// QueryClient defaults, the MMKV persister and the onlineManager / focusManager wiring.
// Only queries marked `meta: { persist: true }` are written to disk (cities, manifests, routes,
// shapes, timetables, last departures), so live data never comes back stale from a cold start.

import NetInfo from "@react-native-community/netinfo"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { focusManager, onlineManager, QueryClient, type Query } from "@tanstack/react-query"
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client"
import Constants from "expo-constants"
import { AppState, Platform } from "react-native"
import { queryPersisterStorage } from "@/lib/storage"
import { isApiError, isRetryable } from "./errors"

declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: { persist?: boolean }
	}
}

export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000
/** Bump when a mapper or a persisted shape changes, so old caches are dropped. */
const CACHE_SCHEMA = "1"

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				gcTime: 30 * 60_000,
				retry: (count, error) => count < 2 && isRetryable(error),
				retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
				networkMode: "offlineFirst",
			},
			mutations: { retry: false, networkMode: "offlineFirst" },
		},
	})
}

export const queryClient = createQueryClient()

export const persister = createSyncStoragePersister({
	storage: queryPersisterStorage,
	key: "gz.query",
	throttleTime: 2000,
})

const runtime = String(
	(Constants.expoConfig?.runtimeVersion as string | undefined) ?? Constants.expoConfig?.version ?? "dev",
)

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
	persister,
	maxAge: PERSIST_MAX_AGE,
	buster: `${runtime}:${CACHE_SCHEMA}`,
	dehydrateOptions: {
		shouldDehydrateQuery: (q: Query) =>
			q.meta?.persist === true && q.state.status === "success" && !isApiError(q.state.error),
	},
}

let wired = false
/** Connect TanStack Query to NetInfo and AppState. Call once from the root layout. */
export function wireQueryManagers() {
	if (wired) return
	wired = true
	onlineManager.setEventListener((setOnline) =>
		NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)),
	)
	focusManager.setEventListener((handleFocus) => {
		const sub = AppState.addEventListener("change", (s) => {
			if (Platform.OS !== "web") handleFocus(s === "active")
		})
		return () => sub.remove()
	})
}
