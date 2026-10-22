// sync.ts
// Favourites sync (plan 3.3, backend 6.11). One document per account: GET, merge, PUT with
// If-Match; on 412 GET again, merge and retry once. The first sync after sign-in folds the guest's
// items into the account (unionOnSignIn). Runs on sign-in, on local change (debounced), on
// foreground and when the device comes back online. Signed out, nothing leaves the device.
//
// MANUAL ENDPOINT: /v1/me/favourites is not in openapi.json yet (typed in schema.manual.ts).

import type { ManualSchemas as W } from "@/api/schema.manual"
import { mergeDocs, unionOnSignIn } from "./merge"
import { fromWireDoc, toWireDoc, type FavDoc } from "./model"
import { useFavouritesStore } from "./useFavouritesStore"

export interface SyncTransport {
	get(): Promise<W["FavouritesDoc"]>
	/** Resolves with the stored document; rejects with `{ status: 412 }` on a version conflict. */
	put(doc: W["FavouritesDoc"], ifMatch: number): Promise<W["FavouritesDoc"]>
}

export type SyncResult = "synced" | "unchanged" | "skipped" | "conflict" | "failed"

const isConflict = (e: unknown) => typeof e === "object" && e !== null && (e as { status?: unknown }).status === 412
const isNetwork = (e: unknown) => typeof e === "object" && e !== null && ((e as { status?: unknown }).status === 0 || (e as { code?: unknown }).code === "NETWORK")

const docOfState = (s: FavDoc): FavDoc => ({ groups: s.groups, tombstones: s.tombstones })

/** Order-insensitive comparison of what sync cares about (ids, timestamps, positions). */
export function sameDoc(a: FavDoc, b: FavDoc): boolean {
	const sig = (d: FavDoc) =>
		JSON.stringify({
			g: [...d.groups]
				.sort((x, y) => x.id.localeCompare(y.id))
				.map((g) => [g.id, g.name, g.colour, g.position, g.updatedAt, g.items.map((i) => [i.id, i.updatedAt, i.label, i.direction ?? null])]),
			t: [...d.tombstones].map((t) => t.id).sort(),
		})
	return sig(a) === sig(b)
}

let running: Promise<SyncResult> | null = null
let again = false

/**
 * Syncs the local document with the account's. Concurrent calls share one run, and a call made
 * while a run is in flight schedules one more run afterwards.
 */
export function syncFavourites(transport: SyncTransport, accountId: string | null, nowMs: () => number = Date.now): Promise<SyncResult> {
	if (!accountId) return Promise.resolve("skipped")
	if (running) {
		again = true
		return running
	}
	running = (async () => {
		let result: SyncResult
		do {
			again = false
			result = await runOnce(transport, accountId, nowMs)
		} while (again && result !== "failed")
		return result
	})().finally(() => {
		running = null
	})
	return running
}

async function runOnce(transport: SyncTransport, accountId: string, nowMs: () => number): Promise<SyncResult> {
	const store = useFavouritesStore
	store.getState().setSyncStatus("syncing")
	try {
		for (let attempt = 0; attempt < 2; attempt++) {
			const remoteWire = await transport.get()
			const remote = fromWireDoc(remoteWire)
			const before = store.getState()
			const local = docOfState(before)

			let next: FavDoc
			let defaultId = before.defaultGroupId
			if (before.accountId !== accountId) {
				// First sync for this account on this device: guest items join the account.
				const u = before.accountId === null ? unionOnSignIn(local, before.defaultGroupId, remote, nowMs()) : { doc: remote, defaultId: null }
				next = u.doc
				defaultId = u.defaultId
			} else if (before.dirty) {
				next = mergeDocs(local, remote, nowMs())
			} else {
				next = remote
			}

			if (sameDoc(next, remote)) {
				applyIfUnchanged(before, remote, remote.version, accountId, defaultId)
				store.getState().setSyncStatus("idle")
				return "unchanged"
			}
			try {
				const stored = await transport.put(toWireDoc(next, remote.version, new Date(nowMs()).toISOString()), remote.version)
				const saved = fromWireDoc(stored)
				applyIfUnchanged(before, saved, saved.version, accountId, defaultId)
				store.getState().setSyncStatus("idle")
				return "synced"
			} catch (e) {
				if (isConflict(e) && attempt === 0) continue
				throw e
			}
		}
		store.getState().setSyncStatus("error")
		return "conflict"
	} catch (e) {
		store.getState().setSyncStatus(isNetwork(e) ? "offline" : "error")
		return "failed"
	}
}

/**
 * Applies the synced document. If the rider changed something while the request was in flight,
 * that change is merged on top and the document stays dirty for the next run.
 */
function applyIfUnchanged(before: FavDoc, doc: FavDoc, version: number, accountId: string, defaultId: string | null) {
	const store = useFavouritesStore
	const now = store.getState()
	const changed = now.groups !== before.groups || now.tombstones !== before.tombstones
	if (!changed) {
		now.applySynced(doc, version, accountId, defaultId)
		return
	}
	const merged = mergeDocs(docOfState(now), doc)
	now.applySynced(merged, version, accountId, defaultId)
	store.setState({ dirty: true })
	again = true
}

/** For tests. */
export function resetSyncState() {
	running = null
	again = false
}
