// machine.ts
// Onboarding as a pure state machine (plan 5.1): welcome → location → city → (pack download) → done.
// The screens send events and render from the state; the store persists the step, the chosen city
// and the location outcome so a rider whose app was killed midway resumes where they were.

import { hasLocation, type LocationAccess } from "@/lib/location"

export type Step = "welcome" | "location" | "city" | "done"

export type Download =
	| { status: "idle" }
	| { status: "running"; done: number; total: number }
	| { status: "failed"; done: number; total: number; failed: number }
	| { status: "cancelled"; done: number; total: number }

export interface OnboardingState {
	step: Step
	/** Outcome of the location step; null until the rider decided (or chose a city themselves). */
	access: LocationAccess | null
	cityId: string | null
	/** Showing the picker instead of the detected-city card. */
	picking: boolean
	download: Download
	/** Finished without picking a city ("Skip for now"); Home then asks for one. */
	skippedCity: boolean
}

export type OnboardingEvent =
	| { type: "start" }
	| { type: "access"; access: LocationAccess }
	| { type: "chooseManually" }
	| { type: "selectCity"; cityId: string }
	| { type: "pickAnother" }
	| { type: "downloadStart" }
	| { type: "progress"; done: number; total: number }
	| { type: "downloadEnd"; total: number; failed: number }
	| { type: "downloadError" }
	| { type: "cancel" }
	| { type: "retry" }
	| { type: "continueOffline" }
	| { type: "skipCity" }
	| { type: "reset" }

export const initialOnboarding: OnboardingState = {
	step: "welcome",
	access: null,
	cityId: null,
	picking: false,
	download: { status: "idle" },
	skippedCity: false,
}

const counts = (d: Download) => (d.status === "idle" ? { done: 0, total: 0 } : { done: d.done, total: d.total })

export function reduce(s: OnboardingState, e: OnboardingEvent): OnboardingState {
	if (s.step === "done" && e.type !== "reset") return s
	switch (e.type) {
		case "start":
			return s.step === "welcome" ? { ...s, step: "location" } : s
		case "access":
			// Granted or approximate: on to the city card. Denied: the picker (the rider said no, do not
			// nag). Blocked or services off: stay on the location step, which explains how to fix it.
			if (hasLocation(e.access)) return { ...s, access: e.access, step: "city", picking: false }
			if (e.access === "denied") return { ...s, access: e.access, step: "city", picking: true }
			return { ...s, access: e.access, step: "location" }
		case "chooseManually":
			return { ...s, step: "city", picking: true }
		case "selectCity":
			if (s.download.status === "running") return s
			return { ...s, step: "city", cityId: e.cityId, picking: false, download: { status: "idle" } }
		case "pickAnother":
			if (s.download.status === "running") return s
			return { ...s, picking: true, download: { status: "idle" } }
		case "downloadStart":
		case "retry":
			if (!s.cityId || s.step !== "city" || s.download.status === "running") return s
			if (e.type === "retry" && s.download.status === "idle") return s
			return { ...s, picking: false, download: { status: "running", ...(e.type === "retry" ? counts(s.download) : { done: 0, total: 0 }) } }
		case "progress":
			return s.download.status === "running" ? { ...s, download: { status: "running", done: e.done, total: e.total } } : s
		case "downloadEnd":
			if (s.download.status !== "running") return s
			if (e.failed > 0) return { ...s, download: { status: "failed", done: e.total - e.failed, total: e.total, failed: e.failed } }
			return { ...s, step: "done", download: { status: "idle" } }
		case "downloadError":
			if (s.download.status !== "running") return s
			return { ...s, download: { status: "failed", ...counts(s.download), failed: Math.max(1, s.download.total - s.download.done) } }
		case "cancel":
			return s.download.status === "running" ? { ...s, download: { status: "cancelled", ...counts(s.download) } } : s
		case "continueOffline":
			// The app works with server fallbacks; packs load later when a screen needs them.
			return s.cityId && s.step === "city" ? { ...s, step: "done", download: { status: "idle" } } : s
		case "skipCity":
			return s.step === "welcome" ? s : { ...s, step: "done", cityId: null, skippedCity: true, download: { status: "idle" } }
		case "reset":
			return initialOnboarding
	}
}

/** What is persisted: enough to resume, never a download in flight. */
export type PersistedOnboarding = Pick<OnboardingState, "step" | "access" | "cityId" | "picking">

export function persistable(s: OnboardingState): PersistedOnboarding {
	return { step: s.step, access: s.access, cityId: s.cityId, picking: s.picking }
}

/**
 * State after the app was killed and restarted. A download that was running starts over from the
 * city card (cached packs resolve at once). A city that is no longer offered falls back to the picker.
 */
export function resume(p: Partial<PersistedOnboarding> | undefined, knownCityIds?: readonly string[]): OnboardingState {
	if (!p?.step || p.step === "done") return initialOnboarding
	let cityId = p.cityId ?? null
	let picking = !!p.picking
	if (cityId && knownCityIds && !knownCityIds.includes(cityId)) {
		cityId = null
		picking = true
	}
	return { ...initialOnboarding, step: p.step, access: p.access ?? null, cityId, picking }
}

/** The screens to stack on top of the welcome screen when resuming at `step`. */
export function resumePath(step: Step): ("/onboarding/location" | "/onboarding/city")[] {
	if (step === "location") return ["/onboarding/location"]
	if (step === "city") return ["/onboarding/location", "/onboarding/city"]
	return []
}
