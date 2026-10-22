// usePrefsStore.ts
// Device preferences, persisted to MMKV. Independent of any account.

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { zustandStorage } from "@/lib/storage"

export type LocalePref = "system" | "tr" | "en"
export type ThemePref = "system" | "light" | "dark"

export interface PrefsState {
	locale: LocalePref
	theme: ThemePref
	analytics: boolean
	onboarded: boolean
	devMode: boolean
	/** Remote-config announcement the rider closed (shown again when the id changes). */
	dismissedAnnouncement: string | null
	setLocale: (locale: LocalePref) => void
	setTheme: (theme: ThemePref) => void
	setAnalytics: (on: boolean) => void
	setOnboarded: (done: boolean) => void
	setDevMode: (on: boolean) => void
	dismissAnnouncement: (id: string) => void
}

export const usePrefsStore = create<PrefsState>()(
	persist(
		(set) => ({
			locale: "system",
			theme: "system",
			analytics: true,
			onboarded: false,
			devMode: false,
			dismissedAnnouncement: null,
			setLocale: (locale) => set({ locale }),
			setTheme: (theme) => set({ theme }),
			setAnalytics: (analytics) => set({ analytics }),
			setOnboarded: (onboarded) => set({ onboarded }),
			setDevMode: (devMode) => set({ devMode }),
			dismissAnnouncement: (dismissedAnnouncement) => set({ dismissedAnnouncement }),
		}),
		{ name: "gz.prefs", version: 1, storage: createJSONStorage(() => zustandStorage()) },
	),
)
