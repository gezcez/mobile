// deviceData.ts
// "Delete data on this phone" (privacy centre): signs out locally and removes everything gezcez keeps
// on the device: card numbers and cards, saved stops and routes, recent searches, city and settings,
// pending usage counts, cached API data and offline packs. Account data on the server is deleted from
// the account pages instead (oauth /account/privacy/delete).

import type { QueryClient } from "@tanstack/react-query"
import { auth } from "@/auth"
import { useCardsStore } from "@/features/cards/useCardsStore"
import { useCityStore } from "@/features/city/useCityStore"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { useRecentSearches } from "@/features/search/recentSearches"
import { clearTelemetry } from "@/lib/telemetry"
import { kv, queryKv } from "@/lib/storage"
import { packFiles } from "@/pack/packStore"
import { usePrefsStore } from "./usePrefsStore"

export async function deleteDeviceData(qc: QueryClient): Promise<void> {
	try {
		await auth.logout()
	} catch {
		// Offline: the refresh token is still removed locally by logout; revocation retries are not needed.
	}
	await useCardsStore.getState().clearAll()
	useFavouritesStore.setState(useFavouritesStore.getInitialState(), true)
	useRecentSearches.setState(useRecentSearches.getInitialState(), true)
	useCityStore.setState(useCityStore.getInitialState(), true)
	clearTelemetry()
	try {
		const files = packFiles()
		for (const p of files.list()) files.remove(p.networkId)
	} catch {
		// No pack directory yet.
	}
	qc.clear()
	queryKv.clearAll()
	// Prefs last: resetting `onboarded` sends the rider back to onboarding.
	usePrefsStore.setState(usePrefsStore.getInitialState(), true)
	for (const k of ["gz.favourites", "gz.recentSearches", "gz.city", "gz.cards"]) kv.remove(k)
}
