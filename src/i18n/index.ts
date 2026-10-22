// i18n: i18next with this repo's own typed catalogs (tr/en). Device locale picks tr when the first
// preferred locale is Turkish, else en; the user override lives in prefs.

import { getLocales } from "expo-localization"
import { createInstance } from "i18next"
import { initReactI18next } from "react-i18next"
import { usePrefsStore, type LocalePref } from "@/features/settings/usePrefsStore"
import { NAMESPACES, resources, type AppLanguage } from "./resources"

export function deviceLanguage(): AppLanguage {
	const first = getLocales()[0]
	return first?.languageCode === "tr" ? "tr" : "en"
}

export function resolveLanguage(pref: LocalePref): AppLanguage {
	return pref === "system" ? deviceLanguage() : pref
}

export const i18n = createInstance()

void i18n.use(initReactI18next).init({
	resources,
	lng: resolveLanguage(usePrefsStore.getState().locale),
	fallbackLng: "en",
	ns: [...NAMESPACES],
	defaultNS: "mobile",
	interpolation: { escapeValue: false },
	returnNull: false,
	initAsync: false,
})

usePrefsStore.subscribe((s, prev) => {
	if (s.locale !== prev.locale) void i18n.changeLanguage(resolveLanguage(s.locale))
})

/** Current language for API Accept-Language, ui_locales and Intl formatting. */
export function currentLanguage(): AppLanguage {
	return i18n.language === "tr" ? "tr" : "en"
}

/** Pick the right string from an API `{ tr, en }` object. */
export function pickName(name: { tr: string; en: string } | string | null | undefined): string {
	if (!name) return ""
	if (typeof name === "string") return name
	return name[currentLanguage()] || name.en || name.tr
}
