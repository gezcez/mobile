// useAlertCount.ts
// Active service alerts across the enabled networks that have the `alerts` capability, for the bell.

import { useQueries } from "@tanstack/react-query"
import { alertsQuery } from "@/api/queries/transit"
import type { Alert, Network } from "@/api/types"
import { capabilityOn } from "@/features/network/hooks"

function combine(results: { data?: Alert[] }[]) {
	return results.map((r) => r.data?.length ?? 0)
}

export function useAlertCount(networks: readonly Network[]): { count: number; firstNetworkId: string | null } {
	const withAlerts = networks.filter((n) => capabilityOn(n, "alerts"))
	const counts = useQueries({ queries: withAlerts.map((n) => alertsQuery(n.id)), combine })
	const i = counts.findIndex((c) => c > 0)
	return { count: counts.reduce((a, b) => a + b, 0), firstNetworkId: withAlerts[i]?.id ?? withAlerts[0]?.id ?? null }
}
