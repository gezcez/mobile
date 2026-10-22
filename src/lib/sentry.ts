// sentry.ts
// Crash reporting, off unless EXPO_PUBLIC_SENTRY_DSN is set. No PII, scrubbed events and
// breadcrumbs, 5% traces, no session replay (plan section 7).

import * as Sentry from "@sentry/react-native"
import { env } from "./env"
import * as Application from "expo-application"
import * as Updates from "expo-updates"
import { scrubCrumb, scrubEvent } from "./scrub"

let enabled = false

/** `com.gezcez.app@26.10.0+42` (plan 15.5), so crashes map to the exact binary. */
export function sentryRelease(): string {
	const id = Application.applicationId ?? "com.gezcez.app"
	return `${id}@${Application.nativeApplicationVersion ?? env.appVersion}+${Application.nativeBuildVersion ?? "0"}`
}

/** One dist per OTA update, so JS source maps match the bundle that crashed. */
export function sentryDist(): string {
	return Updates.updateId ?? `embedded-${Application.nativeBuildVersion ?? "0"}`
}

export function initSentry() {
	if (!env.sentryDsn || enabled) return
	enabled = true
	Sentry.init({
		dsn: env.sentryDsn,
		environment: env.variant,
		sendDefaultPii: false,
		tracesSampleRate: 0.05,
		enableAutoSessionTracking: true,
		attachScreenshot: false,
		attachViewHierarchy: false,
		release: sentryRelease(),
		dist: sentryDist(),
		beforeSend: (event) => scrubEvent(event),
		beforeBreadcrumb: (crumb) => scrubCrumb(crumb),
	})
}

export function captureError(e: unknown) {
	if (enabled) Sentry.captureException(e)
}

export function wrapRoot(C: () => React.ReactNode): () => React.ReactNode {
	return env.sentryDsn ? (Sentry.wrap(C as React.ComponentType<Record<string, unknown>>) as () => React.ReactNode) : C
}
