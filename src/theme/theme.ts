// theme.ts
// Light and dark themes built from tokens.ts, useTheme() and createStyles(). Styles are created once
// per scheme and memoised, so hot lists do not rebuild StyleSheets.

import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from "react-native"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import {
	brandGradient,
	darkColors,
	fontFamily,
	groupColors,
	lightColors,
	radii,
	space,
	typography,
	type ColorTokens,
	type GroupColor,
} from "./tokens"

export type Scheme = "light" | "dark"

export interface Theme {
	scheme: Scheme
	colors: ColorTokens
	radii: typeof radii
	space: typeof space
	typography: typeof typography
	fontFamily: typeof fontFamily
	brandGradient: typeof brandGradient
	groupColor: (key: GroupColor) => string
}

function build(scheme: Scheme): Theme {
	return {
		scheme,
		colors: scheme === "dark" ? darkColors : lightColors,
		radii,
		space,
		typography,
		fontFamily,
		brandGradient,
		groupColor: (key) => groupColors[key][scheme],
	}
}

export const themes: Record<Scheme, Theme> = { light: build("light"), dark: build("dark") }

export function resolveScheme(pref: "system" | Scheme, system: string | null | undefined): Scheme {
	if (pref === "light" || pref === "dark") return pref
	return system === "dark" ? "dark" : "light"
}

export function useScheme(): Scheme {
	const pref = usePrefsStore((s) => s.theme)
	const system = useColorScheme()
	return resolveScheme(pref, system)
}

export function useTheme(): Theme {
	return themes[useScheme()]
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

/**
 * createStyles((t) => ({ ... })) returns a hook. The factory runs at most once per scheme.
 */
export function createStyles<T extends NamedStyles<T>>(factory: (t: Theme) => T) {
	const cache: Partial<Record<Scheme, T>> = {}
	return function useStyles(): T {
		const scheme = useScheme()
		return (cache[scheme] ??= StyleSheet.create(factory(themes[scheme]) as NamedStyles<T>) as T)
	}
}
