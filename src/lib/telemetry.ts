// telemetry.ts
// Aggregate usage counters (plan section 7, Analytics): `screen_view:stop`, `feature:card_lookup`,
// `ws:fallback_poll`. Counted per UTC day and city with the app version and platform; no user id,
// device id, session id, coordinates or free text. Batched in MMKV and sent once per foreground
// session to POST /v1/telemetry/counters. The rider can switch it off (onboarding and Settings);
// switching off drops everything not yet sent.

import { AppState, Platform } from "react-native"
import { kv } from "./storage"

export interface TelemetryBatch {
	day: string
	platform: "ios" | "android"
	app_version: string
	city: string | null
	counters: Record<string, number>
}

export interface TelemetryConfig {
	enabled: () => boolean
	city: () => string | null
	appVersion: string
	send: (batch: TelemetryBatch) => Promise<void>
	now?: () => number
}

const STORE_KEY = "gz.telemetry"
/** Keys are `group:name` in lower snake case, so ids or text cannot slip in. */
const KEY_RE = /^[a-z][a-z0-9_]{0,31}:[a-z0-9_]{1,48}$/
const MAX_KEYS_PER_BATCH = 200
const MAX_AGE_DAYS = 7

let cfg: TelemetryConfig | null = null
let flushing: Promise<void> | null = null

type Pending = Record<string, TelemetryBatch> // keyed by `${day}|${city}`

function load(): Pending {
	try {
		return JSON.parse(kv.getString(STORE_KEY) ?? "{}") as Pending
	} catch {
		return {}
	}
}

function save(p: Pending) {
	if (Object.keys(p).length === 0) kv.remove(STORE_KEY)
	else kv.set(STORE_KEY, JSON.stringify(p))
}

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function isValidCounterKey(key: string): boolean {
	// No runs of 4+ digits: card numbers, stop codes and ids stay out of counter names.
	return KEY_RE.test(key) && !/\d{4,}/.test(key)
}

/** Adds to a counter. A no-op when telemetry is off, not configured, or the key is malformed. */
export function count(key: string, n = 1) {
	if (!cfg || !cfg.enabled() || !isValidCounterKey(key) || n <= 0) return
	const now = (cfg.now ?? Date.now)()
	const day = dayOf(now)
	const city = cfg.city()
	const id = `${day}|${city ?? ""}`
	const p = load()
	const b = (p[id] ??= {
		day,
		platform: Platform.OS === "ios" ? "ios" : "android",
		app_version: cfg.appVersion,
		city,
		counters: {},
	})
	if (!(key in b.counters) && Object.keys(b.counters).length >= MAX_KEYS_PER_BATCH) return
	b.counters[key] = (b.counters[key] ?? 0) + Math.floor(n)
	save(p)
}

/** Sends every pending batch; a batch is removed only after the backend accepted it. */
export function flush(): Promise<void> {
	if (!cfg) return Promise.resolve()
	if (!cfg.enabled()) {
		clearTelemetry()
		return Promise.resolve()
	}
	const c = cfg
	flushing ??= (async () => {
		const now = (c.now ?? Date.now)()
		const oldest = dayOf(now - MAX_AGE_DAYS * 86_400_000)
		const p = load()
		for (const [id, batch] of Object.entries(p)) {
			if (batch.day < oldest) {
				delete p[id]
				continue
			}
			try {
				await c.send(batch)
				// Counts added while sending stay: subtract what was sent.
				const cur = load()
				const live = cur[id]
				if (live) {
					for (const [k, v] of Object.entries(batch.counters)) {
						const left = (live.counters[k] ?? 0) - v
						if (left > 0) live.counters[k] = left
						else delete live.counters[k]
					}
					if (Object.keys(live.counters).length === 0) delete cur[id]
				}
				save(cur)
				delete p[id]
			} catch {
				// Offline or rejected: keep it for the next session.
			}
		}
		const after = load()
		for (const [id, b] of Object.entries(after)) if (b.day < oldest) delete after[id]
		save(after)
	})().finally(() => {
		flushing = null
	})
	return flushing
}

export function clearTelemetry() {
	kv.remove(STORE_KEY)
}

export function pendingTelemetry(): TelemetryBatch[] {
	return Object.values(load())
}

/**
 * Configures telemetry and flushes once per foreground session (at start, then each time the app
 * returns from the background). Returns an unsubscribe for tests and hot reload.
 */
export function startTelemetry(config: TelemetryConfig): () => void {
	cfg = config
	let last: string | null | undefined = AppState.currentState
	void flush()
	const sub = AppState.addEventListener("change", (next) => {
		if (next === "active" && last === "background") void flush()
		last = next
	})
	return () => {
		sub.remove()
		cfg = null
	}
}

/** "/stop/[networkId]/[stopId]" segments to "stop"; "(tabs)/me/cards" to "me_cards"; "/" to "home". */
export function screenKey(segments: readonly string[]): string {
	const parts = segments.filter((s) => !s.startsWith("(") && !s.startsWith("[") && s !== "index")
	const name = parts.join("_").replace(/[^a-z0-9_]/gi, "_").toLowerCase()
	return `screen_view:${name || "home"}`
}
