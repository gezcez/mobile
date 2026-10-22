// env.ts
// Typed runtime config: per-variant values from app.config.ts `extra`, overridable by EXPO_PUBLIC_*.
// Validated with zod so a bad build fails at boot, not on the first request.

import Constants from "expo-constants"
import { z } from "zod"
import { isExpoGo } from "./expoGo"

const EnvSchema = z.object({
	variant: z.enum(["development", "preview", "production"]),
	apiUrl: z.url(),
	oauthUrl: z.url(),
	oauthClientId: z.enum(["mobile", "mobile-dev"]),
	scheme: z.string().min(1),
	appVersion: z.string(),
	mock: z.boolean(),
	sentryDsn: z.string().optional(),
	/** Store ids for the force/soft update screens (production listing for every variant). */
	androidPackage: z.string().min(1),
	iosAppStoreId: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

/** Expo Go signs in with mobile-dev, which only exists on staging, so it always uses staging hosts. */
const EXPO_GO_EXTRA = {
	apiUrl: "https://api-staging.gezcez.com",
	oauthUrl: "https://oauth-staging.gezcez.com",
	oauthClientId: "mobile-dev",
}

function read(): Env {
	const cfg = Constants.expoConfig
	const extra: Record<string, unknown> = { ...cfg?.extra, ...(isExpoGo(Constants) ? EXPO_GO_EXTRA : {}) }
	const scheme = Array.isArray(cfg?.scheme) ? cfg.scheme[0] : cfg?.scheme
	return EnvSchema.parse({
		variant: extra.variant ?? "development",
		apiUrl: process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || "https://api-staging.gezcez.com",
		oauthUrl: process.env.EXPO_PUBLIC_OAUTH_URL || extra.oauthUrl || "https://oauth-staging.gezcez.com",
		oauthClientId: extra.oauthClientId ?? "mobile-dev",
		scheme: scheme ?? "gezcez-dev",
		appVersion: cfg?.version ?? "0.0.0",
		mock: process.env.EXPO_PUBLIC_MOCK === "1" || process.env.NODE_ENV === "test",
		sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
		androidPackage: "com.gezcez.app",
		iosAppStoreId: (extra.iosAppStoreId as string | undefined) || undefined,
	})
}

export const env: Env = read()
