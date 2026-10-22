// packStore.ts
// Load a network pack: from the file when its version matches the manifest's pack_version, else
// download it (GET /v1/networks/:id/pack), write it and prune older versions. Offline with an older
// file on disk, the older file is used. Indexes are kept in the query cache, never persisted.

import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"
import { api, unwrap } from "@/api/client"
import type { ManualSchemas } from "@/api/schema.manual"
import { toPack, type Network, type Pack } from "@/api/types"
import { buildIndex, type PackIndex } from "./packIndex"
import { deviceFileStore, type PackFileStore } from "./fileStore"

let files: PackFileStore | null = null
export function packFiles(): PackFileStore {
	files ??= deviceFileStore()
	return files
}
export function setPackFiles(store: PackFileStore) {
	files = store
}

async function download(networkId: string): Promise<ManualSchemas["Pack"]> {
	return unwrap(api.GET("/v1/networks/{networkId}/pack", { params: { path: { networkId } } }))
}

export async function loadPack(networkId: string, expectedVersion: string | null, store = packFiles()): Promise<Pack> {
	const stored = store.list().filter((p) => p.networkId === networkId)
	const exact = expectedVersion ? stored.find((p) => p.version === expectedVersion) : stored[0]
	if (exact) {
		const json = await store.read(networkId, exact.version)
		if (json) {
			try {
				return toPack(JSON.parse(json) as ManualSchemas["Pack"])
			} catch {
				// corrupt file: fall through and download again
			}
		}
	}
	try {
		const wire = await download(networkId)
		await store.write(networkId, wire.pack_version, JSON.stringify(wire))
		store.remove(networkId, wire.pack_version)
		return toPack(wire)
	} catch (e) {
		const older = stored[0]
		const json = older ? await store.read(networkId, older.version) : null
		if (json) return toPack(JSON.parse(json) as ManualSchemas["Pack"])
		throw e
	}
}

export const packQuery = (n: Pick<Network, "id" | "packVersion">) => ({
	queryKey: ["pack", n.id, n.packVersion ?? "latest"] as const,
	queryFn: async () => buildIndex(await loadPack(n.id, n.packVersion)),
	staleTime: Infinity,
	gcTime: Infinity,
	retry: 2,
})

/** Indexes for the given networks (only those with stops), as they become ready. */
export function usePackIndexes(networks: readonly Network[]): { indexes: PackIndex[]; loading: boolean; failed: boolean } {
	const withStops = networks.filter((n) => n.capabilities.stops)
	const results = useQueries({ queries: withStops.map((n) => packQuery(n)) })
	const data = results.map((r) => r.data)
	const indexes = useMemo(() => data.filter((d): d is PackIndex => !!d), [data])
	return {
		indexes,
		loading: results.some((r) => r.isLoading),
		failed: results.length > 0 && results.every((r) => r.isError),
	}
}
