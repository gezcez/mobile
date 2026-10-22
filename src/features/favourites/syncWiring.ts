// syncWiring.ts
// Runs favourites sync for the signed-in rider: on sign-in, 2 s after a local change, on
// foreground and when the device comes back online. Sign-out detaches the local copy from the
// account (items stay on the device).

import { onlineManager } from "@tanstack/react-query"
import { AppState } from "react-native"
import { api, unwrap } from "@/api/client"
import { auth } from "@/auth"
import { syncFavourites, type SyncTransport } from "./sync"
import { useFavouritesStore } from "./useFavouritesStore"

const DEBOUNCE_MS = 2_000

export const apiTransport: SyncTransport = {
	get: () => unwrap(api.GET("/v1/me/favourites")),
	put: (doc, ifMatch) => unwrap(api.PUT("/v1/me/favourites", { body: doc, params: { header: { "If-Match": `"${ifMatch}"`, "if-match": `"${ifMatch}"` } } })),
}

/** Starts the wiring; returns a stop function. Called once from the root layout. */
export function wireFavouritesSync(transport: SyncTransport = apiTransport): () => void {
	let timer: ReturnType<typeof setTimeout> | null = null
	const accountId = () => (auth.status() === "signed_in" ? (auth.claims()?.sub ?? null) : null)
	const run = () => {
		if (timer) clearTimeout(timer)
		timer = null
		if (!onlineManager.isOnline()) {
			if (accountId()) useFavouritesStore.getState().setSyncStatus("offline")
			return
		}
		void syncFavourites(transport, accountId())
	}
	const later = () => {
		if (timer) clearTimeout(timer)
		timer = setTimeout(run, DEBOUNCE_MS)
	}

	const offStatus = auth.subscribe((s) => {
		if (s === "signed_in") run()
		if (s === "signed_out" && useFavouritesStore.getState().accountId) useFavouritesStore.getState().detachAccount()
	})
	const offStore = useFavouritesStore.subscribe((s, prev) => {
		if (s.dirty && (s.groups !== prev.groups || s.tombstones !== prev.tombstones) && accountId()) later()
	})
	const app = AppState.addEventListener("change", (s) => {
		if (s === "active") run()
	})
	const offOnline = onlineManager.subscribe((online) => {
		if (online) run()
	})
	if (auth.status() === "signed_in") run()

	return () => {
		if (timer) clearTimeout(timer)
		offStatus()
		offStore()
		app.remove()
		offOnline()
	}
}
