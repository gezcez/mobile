// tokens.ts
// Brand tokens as plain TS, copied by hand from the canonical list in _decisions.md section 0
// (the same values as www: cream #fffbeb, navy #172554, amber-600/700/400, yellow-400 to amber-500
// gradient, Inter 400 to 800, rounded-2xl cards, pill buttons, no shadows). A brand change is a small
// PR here and in each web repo. Do not import colours from anywhere else.

export const palette = {
	cream: "#fffbeb", // amber-50
	amber100: "#fef3c7",
	amber200: "#fde68a",
	amber300: "#fcd34d",
	amber400: "#fbbf24",
	amber500: "#f59e0b",
	amber600: "#d97706",
	amber700: "#b45309",
	yellow400: "#facc15",
	navy: "#172554", // blue-950
	navyDeep: "#0b1533",
	navy900: "#1e3a8a",
	white: "#ffffff",
	black: "#000000",
	red700: "#b91c1c",
	red400: "#f87171",
	green700: "#15803d",
	green400: "#4ade80",
} as const

export interface ColorTokens {
	bg: string
	surface: string
	surfaceMuted: string
	surfaceInverse: string
	ink: string
	inkMuted: string
	inkSubtle: string
	inkInverse: string
	border: string
	borderStrong: string
	primary: string
	onPrimary: string
	secondaryBorder: string
	accent: string
	onAccent: string
	eyebrow: string
	cta: string
	onCta: string
	danger: string
	success: string
	live: string
	tabActive: string
	onTabActive: string
	overlay: string
	skeleton: string
	mapLand: string
}

export const lightColors: ColorTokens = {
	bg: palette.cream,
	surface: palette.white,
	surfaceMuted: palette.amber100,
	surfaceInverse: palette.navy,
	ink: palette.navy,
	inkMuted: "rgba(23,37,84,0.70)",
	inkSubtle: "rgba(23,37,84,0.50)",
	inkInverse: palette.cream,
	border: "rgba(23,37,84,0.10)",
	borderStrong: "rgba(23,37,84,0.20)",
	primary: palette.navy,
	onPrimary: palette.cream,
	secondaryBorder: "rgba(23,37,84,0.20)",
	accent: palette.amber600,
	onAccent: palette.navy,
	eyebrow: palette.amber700,
	cta: palette.amber400,
	onCta: palette.navy,
	danger: palette.red700,
	success: palette.green700,
	live: palette.amber600,
	tabActive: palette.navy,
	onTabActive: palette.cream,
	overlay: "rgba(23,37,84,0.40)",
	skeleton: "rgba(23,37,84,0.08)",
	mapLand: palette.cream,
}

export const darkColors: ColorTokens = {
	bg: palette.navyDeep,
	surface: palette.navy,
	surfaceMuted: "rgba(255,255,255,0.05)",
	surfaceInverse: palette.cream,
	ink: palette.cream,
	inkMuted: "rgba(255,251,235,0.72)",
	inkSubtle: "rgba(255,251,235,0.50)",
	inkInverse: palette.navy,
	border: "rgba(255,255,255,0.10)",
	borderStrong: "rgba(255,255,255,0.20)",
	primary: palette.amber400,
	onPrimary: palette.navy,
	secondaryBorder: "rgba(255,255,255,0.25)",
	accent: palette.amber300,
	onAccent: palette.navy,
	eyebrow: palette.amber400,
	cta: palette.amber400,
	onCta: palette.navy,
	danger: palette.red400,
	success: palette.green400,
	live: palette.amber300,
	tabActive: palette.amber400,
	onTabActive: palette.navy,
	overlay: "rgba(0,0,0,0.50)",
	skeleton: "rgba(255,255,255,0.08)",
	mapLand: palette.navyDeep,
}

/** yellow-400 to amber-500, the www gradient (number badges, the "Now" roadmap card). */
export const brandGradient = [palette.yellow400, palette.amber500] as const

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 } as const

/** 4-pt scale: space[1] = 4 ... space[8] = 32. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48 } as const

/** Inter, embedded at build time (expo-font plugin) and loaded by these names in the splash gate. */
export const fontFamily = {
	regular: "Inter-Regular",
	medium: "Inter-Medium",
	semibold: "Inter-SemiBold",
	bold: "Inter-Bold",
	extrabold: "Inter-ExtraBold",
} as const

export const typography = {
	display: { fontFamily: fontFamily.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -0.5 },
	title: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
	heading: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22 },
	body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
	bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
	caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
	eyebrow: {
		fontFamily: fontFamily.semibold,
		fontSize: 12,
		lineHeight: 16,
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
} as const

export type TypographyVariant = keyof typeof typography

/** Minimum touch target (iOS 44 pt; we use 48 for both, as Android asks). */
export const touchTarget = 48

/** Favourite group colours: 8 keys, never free hex (plan 10.2). */
export const groupColors = {
	amber: { light: "#d97706", dark: "#fbbf24" },
	navy: { light: "#172554", dark: "#93c5fd" },
	teal: { light: "#0f766e", dark: "#5eead4" },
	rose: { light: "#be123c", dark: "#fda4af" },
	violet: { light: "#6d28d9", dark: "#c4b5fd" },
	green: { light: "#15803d", dark: "#86efac" },
	orange: { light: "#c2410c", dark: "#fdba74" },
	slate: { light: "#475569", dark: "#cbd5e1" },
} as const

export type GroupColor = keyof typeof groupColors
export const GROUP_COLOR_KEYS = Object.keys(groupColors) as GroupColor[]
