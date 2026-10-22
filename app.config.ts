// app.config.ts
// Dynamic Expo config. APP_VARIANT picks the name, bundle id, icon, scheme, OAuth client and API
// host (plan section 15.1). Native folders are generated (CNG); never commit ios/ or android/.

import type { ConfigContext, ExpoConfig } from "expo/config"

type Variant = "development" | "preview" | "production"

const VARIANT: Variant = ((): Variant => {
	const v = process.env.APP_VARIANT
	return v === "development" || v === "preview" ? v : "production"
})()

const VARIANTS = {
	development: {
		name: "gezcez Dev",
		bundleId: "com.gezcez.app.dev",
		scheme: "gezcez-dev",
		icon: "./assets/icon/icon-dev.png",
		oauthClientId: "mobile-dev",
		apiUrl: "https://api-staging.gezcez.com",
		oauthUrl: "https://oauth-staging.gezcez.com",
	},
	preview: {
		name: "gezcez Beta",
		bundleId: "com.gezcez.app.preview",
		scheme: "gezcez-preview",
		icon: "./assets/icon/icon-preview.png",
		oauthClientId: "mobile",
		apiUrl: "https://api-staging.gezcez.com",
		oauthUrl: "https://oauth-staging.gezcez.com",
	},
	production: {
		name: "gezcez",
		bundleId: "com.gezcez.app",
		scheme: "gezcez",
		icon: "./assets/icon/icon.png",
		oauthClientId: "mobile",
		apiUrl: "https://api.gezcez.com",
		oauthUrl: "https://oauth.gezcez.com",
	},
} as const satisfies Record<Variant, Record<string, string>>

const v = VARIANTS[VARIANT]

const LOCATION_COPY_EN =
	"gezcez uses your location on your phone to find your city and nearby stops. It is not stored by gezcez."

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: v.name,
	slug: "gezcez",
	owner: "gezcez",
	version: "26.10.0",
	orientation: "portrait",
	icon: v.icon,
	scheme: v.scheme,
	userInterfaceStyle: "automatic",
	backgroundColor: "#fffbeb",
	runtimeVersion: { policy: "fingerprint" },
	updates: {
		url: process.env.EAS_UPDATE_URL,
		checkAutomatically: "ON_LOAD",
		fallbackToCacheTimeout: 0,
	},
	ios: {
		bundleIdentifier: v.bundleId,
		supportsTablet: false,
		config: { usesNonExemptEncryption: false },
		infoPlist: {
			NSLocationWhenInUseUsageDescription: LOCATION_COPY_EN,
			NSAppTransportSecurity: { NSAllowsArbitraryLoads: false },
		},
	},
	android: {
		package: v.bundleId,
		adaptiveIcon: {
			backgroundColor: "#fbbf24",
			foregroundImage: "./assets/icon/adaptive-foreground.png",
			monochromeImage: "./assets/icon/adaptive-monochrome.png",
		},
		permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
		blockedPermissions: [
			"android.permission.RECORD_AUDIO",
			"android.permission.ACCESS_BACKGROUND_LOCATION",
			"android.permission.SYSTEM_ALERT_WINDOW",
		],
		predictiveBackGestureEnabled: false,
	},
	locales: {
		tr: "./src/i18n/native/tr.json",
		en: "./src/i18n/native/en.json",
	},
	plugins: [
		"expo-router",
		[
			"expo-splash-screen",
			{
				backgroundColor: "#fffbeb",
				image: "./assets/icon/splash-logo.png",
				imageWidth: 112,
				dark: { backgroundColor: "#0b1533", image: "./assets/icon/splash-logo.png" },
			},
		],
		[
			"expo-font",
			{
				fonts: [
					"./assets/fonts/Inter-Regular.ttf",
					"./assets/fonts/Inter-Medium.ttf",
					"./assets/fonts/Inter-SemiBold.ttf",
					"./assets/fonts/Inter-Bold.ttf",
					"./assets/fonts/Inter-ExtraBold.ttf",
				],
			},
		],
		[
			"expo-location",
			{
				locationWhenInUsePermission: LOCATION_COPY_EN,
				locationAlwaysAndWhenInUsePermission: false,
				locationAlwaysPermission: false,
				isAndroidBackgroundLocationEnabled: false,
				isIosBackgroundLocationEnabled: false,
			},
		],
		["expo-secure-store", { faceIDPermission: false }],
		"expo-localization",
		"expo-web-browser",
		"@maplibre/maplibre-react-native",
		[
			"@sentry/react-native/expo",
			{
				organization: process.env.SENTRY_ORG,
				project: process.env.SENTRY_PROJECT,
			},
		],
	],
	experiments: {
		typedRoutes: true,
		reactCompiler: true,
	},
	extra: {
		variant: VARIANT,
		oauthClientId: v.oauthClientId,
		apiUrl: process.env.EXPO_PUBLIC_API_URL ?? v.apiUrl,
		oauthUrl: process.env.EXPO_PUBLIC_OAUTH_URL ?? v.oauthUrl,
		router: {},
		eas: { projectId: process.env.EAS_PROJECT_ID },
	},
})
