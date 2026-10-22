// scrub.ts
// Pure scrubbers for crash reports and logs (plan section 13): no card numbers (10+ digit runs), no
// coordinates, no query strings, no tokens.

const LONG_DIGITS = /\d[\d -]{8,}\d/g
const BEARER = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g
/** "40.7655, 29.9408" or "lat=40.7655&lon=29.9408": decimal pairs with 3+ decimals. */
const COORD_PAIR = /-?\d{1,3}\.\d{3,}\s*[,;/ ]\s*-?\d{1,3}\.\d{3,}/g
/** A path or URL followed by a query string: keep the path. */
const PATH_QUERY = /(\/[^\s?#]*)\?[^\s#]*/g
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export function scrubText(s: string): string {
	return s
		.replace(BEARER, "Bearer [redacted]")
		.replace(JWT, "[jwt]")
		.replace(PATH_QUERY, "$1")
		.replace(EMAIL, "[email]")
		.replace(COORD_PAIR, "[coords]")
		.replace(LONG_DIGITS, (m) => (m.replace(/\D/g, "").length >= 10 ? "[number]" : m))
}

/** Drop the query string and fragment from a URL (coordinates and ids live there). */
export function scrubUrl(url: string): string {
	const i = url.search(/[?#]/)
	return i < 0 ? url : url.slice(0, i)
}

export function scrubDeep<T>(value: T, depth = 0): T {
	if (depth > 6) return value
	if (typeof value === "string") return scrubText(value) as T
	if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as T
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(value)) {
			if (/^(lat|lon|lng|latitude|longitude|coords?|card_?number|token|refresh_token|access_token|authorization)$/i.test(k))
				out[k] = "[redacted]"
			else if (/^url$/i.test(k) && typeof v === "string") out[k] = scrubUrl(v)
			else out[k] = scrubDeep(v, depth + 1)
		}
		return out as T
	}
	return value
}

/** Minimal structural view of a Sentry event; kept here so the scrubber is testable without the SDK. */
export interface ScrubbableEvent {
	message?: string
	request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: Record<string, string>; data?: unknown }
	exception?: { values?: { value?: string }[] }
	breadcrumbs?: ScrubbableCrumb[]
	extra?: Record<string, unknown>
	contexts?: Record<string, unknown>
	tags?: Record<string, unknown>
	user?: unknown
	server_name?: string
}

export interface ScrubbableCrumb {
	message?: string
	data?: Record<string, unknown>
}

/** beforeSend: no PII, no query strings, no request bodies (card numbers travel in POST bodies). */
export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
	if (event.message) event.message = scrubText(event.message)
	if (event.request) {
		if (event.request.url) event.request.url = scrubUrl(event.request.url)
		delete event.request.query_string
		delete event.request.cookies
		delete event.request.data
		delete event.request.headers
	}
	if (event.exception?.values) for (const ex of event.exception.values) if (ex.value) ex.value = scrubText(ex.value)
	if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map((c) => scrubCrumb(c))
	if (event.extra) event.extra = scrubDeep(event.extra)
	if (event.contexts) event.contexts = scrubDeep(event.contexts)
	if (event.tags) event.tags = scrubDeep(event.tags)
	delete event.user
	delete event.server_name
	return event
}

/** beforeBreadcrumb: URLs lose their query, request bodies are dropped, text is scrubbed. */
export function scrubCrumb<C extends ScrubbableCrumb>(crumb: C): C {
	if (crumb.message) crumb.message = scrubText(crumb.message)
	if (crumb.data) {
		const { body: _body, request_body: _rb, ...rest } = crumb.data
		crumb.data = scrubDeep(rest)
	}
	return crumb
}
