// useTelemetry.ts
// Wires src/lib/telemetry to the rider's analytics preference, the current city and the API, and
// counts one `screen_view:<route>` per navigation (route names only, never params).

import { useSegments } from "expo-router"
import { useEffect } from "react"
import { api, unwrap } from "@/api/client"
import { useCityStore } from "@/features/city/useCityStore"
import { env } from "@/lib/env"
import { clearTelemetry, count, screenKey, startTelemetry } from "@/lib/telemetry"
import { usePrefsStore } from "./usePrefsStore"

export function useTelemetry() {
	useEffect(() => {
		const stop = startTelemetry({
			enabled: () => usePrefsStore.getState().analytics,
			city: () => useCityStore.getState().cityId,
			appVersion: env.appVersion,
			send: async (batch) => {
				await unwrap(api.POST("/v1/telemetry/counters", { body: batch }))
			},
		})
		const unsub = usePrefsStore.subscribe((s, prev) => {
			if (prev.analytics && !s.analytics) clearTelemetry()
		})
		return () => {
			unsub()
			stop()
		}
	}, [])

	const segments = useSegments()
	const key = screenKey(segments)
	useEffect(() => {
		count(key)
	}, [key])
}
