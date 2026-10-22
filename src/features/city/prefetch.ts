// prefetch.ts
// Before leaving onboarding (and when switching city) fetch the manifest and every network's pack so
// nearby and search work offline right away. Failures are fine: the app has server fallbacks.

import { cityManifestQuery } from "@/api/queries/transit"
import { queryClient } from "@/api/queryClient"
import { packQuery } from "@/pack/packStore"

export async function prefetchCity(cityId: string, onProgress?: (done: number, total: number) => void, signal?: AbortSignal) {
	const manifest = await queryClient.fetchQuery(cityManifestQuery(cityId))
	const withStops = manifest.networks.filter((n) => n.capabilities.stops)
	let done = 0
	onProgress?.(done, withStops.length)
	await Promise.allSettled(
		withStops.map(async (n) => {
			if (signal?.aborted) return
			await queryClient.prefetchQuery(packQuery(n))
			onProgress?.(++done, withStops.length)
		}),
	)
	return manifest
}
