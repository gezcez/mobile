// time.ts
// Times are shown in the NETWORK's timezone, never the device's (a visitor's phone may be set to
// another zone). Countdown text for departures, "ago" text for freshness.

import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

export function toMs(iso: string): number {
	return Date.parse(iso)
}

/** "HH:mm" in the given IANA zone. */
export function clockIn(iso: string | number, timeZone: string): string {
	return format(new TZDate(typeof iso === "number" ? iso : toMs(iso), timeZone), "HH:mm")
}

/** Calendar date "yyyy-MM-dd" in the zone. */
export function dateIn(ms: number, timeZone: string): string {
	return format(new TZDate(ms, timeZone), "yyyy-MM-dd")
}

export function isSameDayIn(a: number, b: number, timeZone: string): boolean {
	return dateIn(a, timeZone) === dateIn(b, timeZone)
}

/** Whole minutes from now until `iso`, never negative. */
export function minutesUntil(iso: string, nowMs: number): number {
	return Math.max(0, Math.floor((toMs(iso) - nowMs) / 60_000))
}

export type Countdown =
	| { kind: "now" }
	| { kind: "minutes"; minutes: number }
	| { kind: "clock"; time: string; tomorrow: boolean }

/**
 * Plan 5.5: live and near departures count down in minutes; anything more than 30 minutes away
 * shows the clock time (in the network zone), with "tomorrow" when it is on another day.
 */
export function countdown(iso: string, nowMs: number, timeZone: string, maxMinutes = 30): Countdown {
	const minutes = minutesUntil(iso, nowMs)
	if (minutes < 1) return { kind: "now" }
	if (minutes <= maxMinutes) return { kind: "minutes", minutes }
	return { kind: "clock", time: clockIn(iso, timeZone), tomorrow: !isSameDayIn(toMs(iso), nowMs, timeZone) }
}

export type Ago = { unit: "s" | "m" | "h"; count: number }

export function ago(fromMs: number, nowMs: number): Ago {
	const s = Math.max(0, Math.round((nowMs - fromMs) / 1000))
	if (s < 60) return { unit: "s", count: s }
	if (s < 3600) return { unit: "m", count: Math.floor(s / 60) }
	return { unit: "h", count: Math.floor(s / 3600) }
}

/** Month key "yyyy-MM" for card history, in the zone. */
export function monthIn(ms: number, timeZone: string): string {
	return format(new TZDate(ms, timeZone), "yyyy-MM")
}

export function shiftMonth(month: string, delta: number): string {
	const [y, m] = month.split("-").map(Number) as [number, number]
	const d = new Date(Date.UTC(y, m - 1 + delta, 1))
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}
