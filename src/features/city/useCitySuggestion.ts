// useCitySuggestion.ts
// Auto-switch (plan 3.2): when the app comes to the foreground with location already granted, take
// the cheap last-known position; if it resolves to another supported city, offer to switch with a
// non-modal banner. Never switches silently.

import { useEffect, useState } from "react"
import { AppState } from "react-native"
import type { City } from "@/api/types"
import { useCities } from "@/features/network/hooks"
import { getLastKnown, refreshPermission } from "@/lib/location"
import { resolveCity } from "./resolveCity"
import { useCityStore } from "./useCityStore"

export function useCitySuggestion(): { city: City | null; accept: () => void; dismiss: () => void } {
	const cities = useCities().data
	const cityId = useCityStore((s) => s.cityId)
	const autoSwitch = useCityStore((s) => s.autoSwitch)
	const dismissed = useCityStore((s) => s.dismissedSuggestion)
	const [found, setFound] = useState<City | null>(null)

	useEffect(() => {
		if (!autoSwitch || !cities) return
		const check = async () => {
			if ((await refreshPermission()) !== "granted") return
			const fix = await getLastKnown()
			if (!fix) return
			setFound(resolveCity(cities, fix.lat, fix.lon))
		}
		void check()
		const sub = AppState.addEventListener("change", (s) => s === "active" && void check())
		return () => sub.remove()
	}, [autoSwitch, cities])

	const city = found && found.id !== cityId && found.id !== dismissed && autoSwitch ? found : null
	return {
		city,
		accept: () => city && useCityStore.getState().setCity(city.id),
		dismiss: () => useCityStore.getState().dismissSuggestion(city?.id ?? null),
	}
}
