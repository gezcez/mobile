// useMapVehicles.ts
// The city map follows several networks at once. One headless component per realtime network owns
// that network's feed (whole network below zoom 12, a snapped bbox above) and writes into this
// store; the map and the "vehicles in view" list read the merged result.

import { useEffect } from "react"
import { create } from "zustand"
import type { LiveVehicle } from "@/live/protocol"
import { useVehicles } from "@/live/hooks"
import type { FeedSnapshot } from "@/live/vehicleFeed"
import type { Bounds } from "./bbox"

export interface MapVehicle extends LiveVehicle {
	networkId: string
}

interface MapVehiclesState {
	byNetwork: Record<string, { vehicles: MapVehicle[]; receivedAt: number | null; network: FeedSnapshot["network"] }>
	set: (networkId: string, snap: FeedSnapshot) => void
	clear: (networkId: string) => void
}

export const useMapVehiclesStore = create<MapVehiclesState>((set) => ({
	byNetwork: {},
	set: (networkId, snap) =>
		set((s) => ({
			byNetwork: {
				...s.byNetwork,
				[networkId]: { vehicles: snap.vehicles.map((v) => ({ ...v, networkId })), receivedAt: snap.receivedAt, network: snap.network },
			},
		})),
	clear: (networkId) =>
		set((s) => {
			const next = { ...s.byNetwork }
			delete next[networkId]
			return { byNetwork: next }
		}),
}))

export function NetworkVehicles({ networkId, bbox }: { networkId: string; bbox: Bounds | null }) {
	const snap = useVehicles({ network: networkId, ...(bbox ? { bbox } : {}) })
	useEffect(() => {
		useMapVehiclesStore.getState().set(networkId, snap)
	}, [networkId, snap])
	useEffect(() => () => useMapVehiclesStore.getState().clear(networkId), [networkId])
	return null
}

