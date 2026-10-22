// prefetch.ts
// Before leaving onboarding (and when switching city) fetch the manifest and every network's pack so
// nearby and search work offline right away. Failures are fine: the app has server fallbacks, so the
// result only reports how many packs failed for the Retry offer. No request carries coordinates.

import { cityManifestQuery } from "@/api/queries/transit"
import { queryClient } from "@/api/queryClient"
import type { City } from "@/api/types"
import { packQuery } from "@/pack/packStore"

/** Upper end of a gzipped pack (backend 6.5: Kocaeli is 300 to 800 KB). Used for the size hint only. */
export const PACK_BYTES_ESTIMATE = 800 * 1024

/** Rough download size for a city before its manifest is known: one pack per network. */
export function estimateCityBytes(city: Pick<City, "networks">): number {
	return Math.max(1, city.networks.length) * PACK_BYTES_ESTIMATE
}

export interface PrefetchResult {
	total: number
	failed: number
	aborted: boolean
}

export async function prefetchCity(
	cityId: string,
	onProgress?: (done: number, total: number) => void,
	signal?: AbortSignal,
): Promise<PrefetchResult> {
	const manifest = await queryClient.fetchQuery(cityManifestQuery(cityId))
	const withStops = manifest.networks.filter((n) => n.capabilities.stops)
	let done = 0
	let failed = 0
	onProgress?.(done, withStops.length)
	await Promise.all(
		withStops.map(async (n) => {
			if (signal?.aborted) return
			try {
				// fetchQuery (not prefetchQuery) so a failed pack is counted; a cached pack resolves at once.
				await queryClient.fetchQuery(packQuery(n))
			} catch {
				failed++
			}
			if (!signal?.aborted) onProgress?.(++done, withStops.length)
		}),
	)
	return { total: withStops.length, failed, aborted: !!signal?.aborted }
}
