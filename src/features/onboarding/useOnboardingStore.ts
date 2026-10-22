// useOnboardingStore.ts
// Holds the onboarding machine (machine.ts), persisted to MMKV so a killed app resumes at the same
// step. Finishing applies the result: sets the city, flips `onboarded` (the root Stack.Protected
// guard then shows the tabs) and clears the saved progress.

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { useCityStore } from "@/features/city/useCityStore"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { zustandStorage } from "@/lib/storage"
import { initialOnboarding, persistable, reduce, resume, type OnboardingEvent, type OnboardingState } from "./machine"

interface OnboardingStore extends OnboardingState {
	send: (e: OnboardingEvent) => void
}

function finish(s: OnboardingState) {
	if (s.cityId) {
		useCityStore.getState().setCity(s.cityId)
		useCityStore.getState().markResolved()
	}
	usePrefsStore.getState().setOnboarded(true)
}

export const useOnboardingStore = create<OnboardingStore>()(
	persist(
		(set, get) => ({
			...initialOnboarding,
			send: (e) => {
				const prev = get()
				const next = reduce(prev, e)
				if (next === prev) return
				if (next.step === "done") {
					// Nothing to resume once done, and a later "delete device data" starts clean.
					set(initialOnboarding)
					finish(next)
					return
				}
				set(next)
			},
		}),
		{
			name: "gz.onboarding",
			version: 1,
			storage: createJSONStorage(() => zustandStorage()),
			partialize: (s) => persistable(s),
			merge: (persisted, current) => ({ ...current, ...resume(persisted as Partial<OnboardingState> | undefined) }),
		},
	),
)

export const sendOnboarding = (e: OnboardingEvent) => useOnboardingStore.getState().send(e)
