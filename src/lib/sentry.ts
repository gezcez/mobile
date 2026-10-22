// sentry.ts
// Crash reporting, off unless EXPO_PUBLIC_SENTRY_DSN is set. No PII, scrubbed events and
// breadcrumbs, 5% traces, no session replay (plan section 7).

import * as Sentry from "@sentry/react-native"
import { env } from "./env"
import { scrubDeep, scrubText, scrubUrl } from "./scrub"

let enabled = false

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
		beforeSend(event) {
			if (event.message) event.message = scrubText(event.message)
			if (event.request?.url) event.request.url = scrubUrl(event.request.url)
			if (event.request) delete event.request.query_string
			if (event.exception?.values)
				for (const ex of event.exception.values) if (ex.value) ex.value = scrubText(ex.value)
			if (event.extra) event.extra = scrubDeep(event.extra)
			if (event.contexts) event.contexts = scrubDeep(event.contexts)
			delete event.user
			return event
		},
		beforeBreadcrumb(crumb) {
			if (crumb.data) crumb.data = scrubDeep(crumb.data)
			if (crumb.message) crumb.message = scrubText(crumb.message)
			return crumb
		},
	})
}

export function captureError(e: unknown) {
	if (enabled) Sentry.captureException(e)
}

export function wrapRoot(C: () => React.ReactNode): () => React.ReactNode {
	return env.sentryDsn ? (Sentry.wrap(C as React.ComponentType<Record<string, unknown>>) as () => React.ReactNode) : C
}
