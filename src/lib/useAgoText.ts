// useAgoText.ts
// "12 s ago", "4 min ago", "2 h ago" from a timestamp.

import { useCallback } from "react"
import { useT } from "@/i18n/useT"
import { ago } from "./time"

export function useAgoText() {
	const { t } = useT()
	return useCallback(
		(fromMs: number, nowMs: number) => {
			const a = ago(fromMs, nowMs)
			if (a.unit === "s") return t("common:time.secondsAgo", { count: a.count })
			if (a.unit === "m") return t("common:time.minutesAgo", { count: a.count })
			return t("common:time.hoursAgo", { count: a.count })
		},
		[t],
	)
}
