// useCountdownText.ts
// Countdown words for a departure: "now", "3 min", "14:52" or "tomorrow 06:10", in the network zone.

import { useCallback } from "react"
import { useT } from "@/i18n/useT"
import { countdown } from "@/lib/time"

export function useCountdownText(timeZone: string) {
	const { t } = useT()
	return useCallback(
		(iso: string, nowMs: number) => {
			const c = countdown(iso, nowMs, timeZone)
			if (c.kind === "now") return t("common:time.now")
			if (c.kind === "minutes") return t("common:time.min", { count: c.minutes })
			return c.tomorrow ? t("common:time.tomorrowAt", { time: c.time }) : c.time
		},
		[t, timeZone],
	)
}
