// Network manifest hooks: the current city, its enabled networks, capabilities and app config.
// Every screen reads capabilities through useCapability() and hides what a network lacks.

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { appConfigQuery, citiesQuery, cityManifestQuery, networkQuery } from "@/api/queries/transit"
import type { Capabilities, Network } from "@/api/types"
import { useCityStore } from "@/features/city/useCityStore"

export function useAppConfig() {
	return useQuery(appConfigQuery())
}

export function useCities() {
	return useQuery(citiesQuery())
}

export function useCurrentCityId(): string | null {
	return useCityStore((s) => s.cityId)
}

export function useCurrentCity() {
	const cityId = useCurrentCityId()
	const cities = useCities()
	return { ...cities, data: cities.data?.find((c) => c.id === cityId) ?? null }
}

export function useManifest(cityId: string | null) {
	return useQuery({ ...cityManifestQuery(cityId ?? ""), enabled: !!cityId })
}

/** Networks of the current city that the rider has not switched off. */
export function useCurrentNetworks(): { networks: Network[]; all: Network[]; isLoading: boolean; error: unknown } {
	const cityId = useCurrentCityId()
	const disabled = useCityStore((s) => s.disabledNetworkIds)
	const manifest = useManifest(cityId)
	const all = useMemo(() => manifest.data?.networks ?? [], [manifest.data])
	const networks = useMemo(() => all.filter((n) => !disabled.includes(n.id)), [all, disabled])
	return { networks, all, isLoading: manifest.isLoading, error: manifest.error }
}

/** One network: from the city manifest when it is the current city, else its own endpoint. */
export function useNetwork(networkId: string | null | undefined) {
	const { all } = useCurrentNetworks()
	const fromManifest = all.find((n) => n.id === networkId) ?? null
	const q = useQuery({ ...networkQuery(networkId ?? ""), enabled: !!networkId && !fromManifest })
	return { ...q, data: fromManifest ?? q.data ?? null }
}

type CapKey = keyof Capabilities

/** Capability value for a network; false-y while loading so features stay hidden until known. */
export function useCapability<K extends CapKey>(networkId: string | null | undefined, key: K): Capabilities[K] | null {
	const { data } = useNetwork(networkId)
	if (!data) return null
	if (data.status === "disabled" && (key === "realtimeVehicles" || key === "card")) return null
	return data.capabilities[key]
}

export function capabilityOn(n: Network | null | undefined, key: CapKey): boolean {
	if (!n) return false
	if (n.status === "disabled" && (key === "realtimeVehicles" || key === "realtimeDepartures" || key === "card")) return false
	const v = n.capabilities[key]
	return v !== null && v !== false && v !== "none"
}
