// tween.ts
// Vehicles glide from their old to their new position over 1 s when a delta lands (plan 3.5), at
// about 30 fps, only when fewer than 300 are visible and Reduce Motion is off. Otherwise they jump.
// No dead reckoning: with minute-level upstream updates extrapolation would invent positions.

import { useEffect, useRef, useState } from "react"
import type { LiveVehicle } from "./protocol"

export const TWEEN_MS = 1000
export const TWEEN_FRAME_MS = 33
export const TWEEN_MAX_VEHICLES = 300

type Pos = { lat: number; lon: number }

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Positions at progress t (0..1) between `from` and `to`; new vehicles appear at their target. */
export function interpolate(from: ReadonlyMap<string, Pos>, to: readonly LiveVehicle[], t: number): LiveVehicle[] {
	const k = ease(Math.min(1, Math.max(0, t)))
	return to.map((v) => {
		const a = from.get(v.id)
		if (!a || (a.lat === v.lat && a.lon === v.lon)) return v
		return { ...v, lat: a.lat + (v.lat - a.lat) * k, lon: a.lon + (v.lon - a.lon) * k }
	})
}

export function shouldTween(count: number, reduceMotion: boolean): boolean {
	return !reduceMotion && count > 0 && count < TWEEN_MAX_VEHICLES
}

/** Returns the vehicles to draw this frame. */
export function useTweenedVehicles(vehicles: LiveVehicle[], reduceMotion: boolean): LiveVehicle[] {
	const [frame, setFrame] = useState(vehicles)
	const shown = useRef(new Map<string, Pos>())
	const tween = shouldTween(vehicles.length, reduceMotion)

	useEffect(() => {
		const record = (list: LiveVehicle[]) => {
			shown.current = new Map(list.map((v) => [v.id, { lat: v.lat, lon: v.lon }]))
		}
		if (!tween) {
			record(vehicles)
			return
		}
		const from = shown.current
		const start = Date.now()
		let current = vehicles
		const timer = setInterval(() => {
			const t = (Date.now() - start) / TWEEN_MS
			current = t >= 1 ? vehicles : interpolate(from, vehicles, t)
			setFrame(current)
			if (t >= 1) clearInterval(timer)
		}, TWEEN_FRAME_MS)
		return () => {
			clearInterval(timer)
			record(current)
		}
	}, [vehicles, tween])

	return tween ? frame : vehicles
}
