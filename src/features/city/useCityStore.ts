// useCityStore.ts
// The rider's current city and which of its networks are on. Independent of any account; persisted
// to MMKV. Networks are stored as a disabled list, so a network the city gains later is on by
// default (plan 3.2: all networks of a city are enabled unless the rider turns one off).

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { zustandStorage } from "@/lib/storage"

export interface CityState {
	cityId: string | null
	disabledNetworkIds: string[]
	autoSwitch: boolean
	lastResolvedAt: number | null
	/** City the auto-switch banner offered and the rider dismissed (do not ask again this session). */
	dismissedSuggestion: string | null
	setCity: (cityId: string) => void
	setNetworkEnabled: (networkId: string, enabled: boolean) => void
	setAutoSwitch: (on: boolean) => void
	markResolved: () => void
	dismissSuggestion: (cityId: string | null) => void
}

export const useCityStore = create<CityState>()(
	persist(
		(set) => ({
			cityId: null,
			disabledNetworkIds: [],
			autoSwitch: true,
			lastResolvedAt: null,
			dismissedSuggestion: null,
			setCity: (cityId) => set({ cityId, dismissedSuggestion: null }),
			setNetworkEnabled: (networkId, enabled) =>
				set((s) => ({
					disabledNetworkIds: enabled
						? s.disabledNetworkIds.filter((id) => id !== networkId)
						: [...new Set([...s.disabledNetworkIds, networkId])],
				})),
			setAutoSwitch: (autoSwitch) => set({ autoSwitch }),
			markResolved: () => set({ lastResolvedAt: Date.now() }),
			dismissSuggestion: (dismissedSuggestion) => set({ dismissedSuggestion }),
		}),
		{
			name: "gz.city",
			version: 1,
			storage: createJSONStorage(() => zustandStorage()),
			partialize: (s) => ({
				cityId: s.cityId,
				disabledNetworkIds: s.disabledNetworkIds,
				autoSwitch: s.autoSwitch,
				lastResolvedAt: s.lastResolvedAt,
			}),
		},
	),
)
