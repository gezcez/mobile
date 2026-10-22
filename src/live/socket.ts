// socket.ts
// One WebSocket per app process for the live feed (plan 3.4, backend 6.10). Plain TS, no React:
// hooks subscribe through it and share equal subscriptions. It owns reconnects (full-jitter
// backoff, base 1 s, factor 2, cap 30 s, reset after 60 s healthy), the 45 s dead-connection
// watchdog, ping/pong, seq gap resubscribe, auth after every (re)connect, and app-state / network
// awareness (closes 30 s after the app goes to background, no retries while offline).

import { parseServerMessage, subscriptionKey, LIMITS, type ClientMessage, type ServerMessage, type Subscription } from "./protocol"

export interface SocketLike {
	readonly readyState: number
	send(data: string): void
	close(code?: number, reason?: string): void
	onopen: ((ev: unknown) => void) | null
	onmessage: ((ev: { data: unknown }) => void) | null
	onclose: ((ev: { code?: number }) => void) | null
	onerror: ((ev: unknown) => void) | null
}

export type SocketFactory = (url: string) => SocketLike

export type LiveState = "idle" | "connecting" | "open" | "waiting" | "offline" | "suspended"

export interface LiveStatus {
	state: LiveState
	/** Consecutive failed connections. */
	failures: number
	/** After 3 failures hooks poll REST while the socket keeps retrying. */
	fallback: boolean
}

export type MessageHandler = (m: ServerMessage) => void

export interface LiveSocketOptions {
	url: () => string | null
	factory: SocketFactory
	getToken?: () => Promise<string | null>
	/** Close code 4401: refresh the token once, then reconnect. */
	onAuthRejected?: () => Promise<void>
	random?: () => number
	now?: () => number
}

export const BACKOFF = { baseMs: 1000, factor: 2, capMs: 30_000, healthyMs: 60_000 } as const
export const DEAD_AFTER_MS = 45_000
export const BACKGROUND_CLOSE_MS = 30_000
export const IDLE_CLOSE_MS = 10_000
export const FALLBACK_AFTER_FAILURES = 3

const OPEN = 1

/** Full jitter: uniform in [0, min(cap, base * factor^attempt)]. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
	const ceiling = Math.min(BACKOFF.capMs, BACKOFF.baseMs * BACKOFF.factor ** Math.max(0, attempt))
	return Math.floor(random() * ceiling)
}

interface Sub {
	id: string
	sub: Subscription
	handlers: Set<MessageHandler>
	lastSeq: number | null
}

export class LiveSocket {
	private ws: SocketLike | null = null
	private subs = new Map<string, Sub>()
	private byId = new Map<string, Sub>()
	private nextId = 1
	private failures = 0
	private openedAt: number | null = null
	private active = true
	private online = true
	private disposed = false
	private authRetried = false
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private watchdog: ReturnType<typeof setTimeout> | null = null
	private backgroundTimer: ReturnType<typeof setTimeout> | null = null
	private idleTimer: ReturnType<typeof setTimeout> | null = null
	private statusListeners = new Set<(s: LiveStatus) => void>()
	private _status: LiveStatus = { state: "idle", failures: 0, fallback: false }

	constructor(private readonly opts: LiveSocketOptions) {}

	get status(): LiveStatus {
		return this._status
	}

	onStatus(listener: (s: LiveStatus) => void): () => void {
		this.statusListeners.add(listener)
		return () => this.statusListeners.delete(listener)
	}

	/** Subscribe; equal subscriptions share one server subscription. Returns the unsubscribe. */
	subscribe(sub: Subscription, handler: MessageHandler): () => void {
		const key = subscriptionKey(sub)
		let s = this.subs.get(key)
		if (!s) {
			if (this.subs.size >= LIMITS.maxSubs) {
				handler({ type: "error", code: "RATE_LIMITED", message: "too many live subscriptions" })
				return () => undefined
			}
			s = { id: `s${this.nextId++}`, sub, handlers: new Set(), lastSeq: null }
			this.subs.set(key, s)
			this.byId.set(s.id, s)
			if (this.isOpen()) this.sendSubscribe(s)
		}
		s.handlers.add(handler)
		this.clearTimer("idleTimer")
		this.ensureConnected()
		const entry = s
		return () => {
			entry.handlers.delete(handler)
			if (entry.handlers.size > 0 || this.subs.get(key) !== entry) return
			this.subs.delete(key)
			this.byId.delete(entry.id)
			if (this.isOpen()) this.send({ type: "unsubscribe", id: entry.id })
			if (this.subs.size === 0) this.idleTimer = setTimeout(() => this.closeSocket("idle"), IDLE_CLOSE_MS)
		}
	}

	/** AppState: background closes after 30 s; foreground reconnects at once. */
	setAppActive(active: boolean) {
		if (active === this.active) return
		this.active = active
		if (!active) {
			this.backgroundTimer = setTimeout(() => {
				this.closeSocket("suspended")
			}, BACKGROUND_CLOSE_MS)
			return
		}
		this.clearTimer("backgroundTimer")
		if (this._status.state === "suspended" || this._status.state === "waiting") this.connectNow()
		else this.ensureConnected()
	}

	/** NetInfo: offline pauses retries; regaining the network retries immediately. */
	setOnline(online: boolean) {
		if (online === this.online) return
		this.online = online
		if (!online) {
			this.clearTimer("reconnectTimer")
			if (!this.ws) this.setStatus("offline")
			return
		}
		if (!this.ws) this.connectNow()
	}

	/** Send a fresh token after a refresh (backend 6.10: auth again after every refresh). */
	async reauth() {
		if (!this.isOpen() || !this.opts.getToken) return
		const token = await this.opts.getToken()
		if (token && this.isOpen()) this.send({ type: "auth", token })
	}

	dispose() {
		this.disposed = true
		for (const t of ["reconnectTimer", "watchdog", "backgroundTimer", "idleTimer"] as const) this.clearTimer(t)
		this.subs.clear()
		this.byId.clear()
		this.closeSocket("idle")
	}

	// ---- internals --------------------------------------------------------------------------

	private now() {
		return (this.opts.now ?? Date.now)()
	}

	private isOpen() {
		return !!this.ws && this.ws.readyState === OPEN && this._status.state === "open"
	}

	private clearTimer(name: "reconnectTimer" | "watchdog" | "backgroundTimer" | "idleTimer") {
		const t = this[name]
		if (t) clearTimeout(t)
		this[name] = null
	}

	private setStatus(state: LiveState) {
		const next = { state, failures: this.failures, fallback: state !== "open" && this.failures >= FALLBACK_AFTER_FAILURES }
		const prev = this._status
		if (prev.state === next.state && prev.failures === next.failures && prev.fallback === next.fallback) return
		this._status = next
		for (const l of this.statusListeners) l(next)
	}

	private canConnect() {
		return !this.disposed && this.active && this.online && this.subs.size > 0 && !!this.opts.url()
	}

	private ensureConnected() {
		if (this.ws || this.reconnectTimer) return
		this.connectNow()
	}

	private connectNow() {
		this.clearTimer("reconnectTimer")
		if (this.ws) return
		if (!this.canConnect()) {
			this.setStatus(!this.online ? "offline" : !this.active ? "suspended" : "idle")
			return
		}
		const url = this.opts.url()!
		let ws: SocketLike
		try {
			ws = this.opts.factory(url)
		} catch {
			this.onClosed(null, undefined)
			return
		}
		this.ws = ws
		this.openedAt = null
		this.setStatus("connecting")
		this.armWatchdog()
		ws.onopen = () => {
			if (this.ws !== ws) return
			this.openedAt = this.now()
			this.setStatus("open")
			void this.afterOpen()
		}
		ws.onmessage = (ev) => {
			if (this.ws !== ws) return
			this.armWatchdog()
			if (typeof ev.data === "string") this.onMessage(ev.data)
		}
		ws.onclose = (ev) => this.onClosed(ws, ev?.code)
		ws.onerror = () => undefined
	}

	private async afterOpen() {
		if (this.opts.getToken) {
			const token = await this.opts.getToken().catch(() => null)
			if (token && this.isOpen()) this.send({ type: "auth", token })
		}
		for (const s of this.subs.values()) this.sendSubscribe(s)
	}

	private sendSubscribe(s: Sub) {
		s.lastSeq = null
		this.send({ type: "subscribe", id: s.id, ...s.sub } as ClientMessage)
	}

	private send(m: ClientMessage) {
		try {
			this.ws?.send(JSON.stringify(m))
		} catch {
			// a dead socket surfaces through onclose or the watchdog
		}
	}

	private armWatchdog() {
		this.clearTimer("watchdog")
		this.watchdog = setTimeout(() => {
			const ws = this.ws
			if (!ws) return
			try {
				ws.close(4000, "silent")
			} catch {
				// ignore
			}
			this.onClosed(ws, 4000)
		}, DEAD_AFTER_MS)
	}

	private onMessage(text: string) {
		const m = parseServerMessage(text)
		if (!m) return
		if (m.type === "ping") {
			this.send({ type: "pong", ...(m.t !== undefined ? { t: m.t } : {}) })
			return
		}
		if (m.type === "auth_ok") {
			this.authRetried = false
			return
		}
		if (m.type === "hello" || m.type === "pong") return
		const subId = m.type === "error" ? m.id : m.sub
		const s = subId ? this.byId.get(subId) : undefined
		if (!s) return
		if (m.type === "snapshot" || m.type === "delta" || m.type === "departures") {
			if (m.type !== "snapshot" && s.lastSeq !== null && m.seq !== s.lastSeq + 1) {
				// Lost a message: resubscribe for a fresh snapshot (backend 6.10).
				this.send({ type: "unsubscribe", id: s.id })
				this.sendSubscribe(s)
				return
			}
			s.lastSeq = m.seq
		}
		for (const h of s.handlers) h(m)
	}

	private onClosed(ws: SocketLike | null, code: number | undefined) {
		if (ws && this.ws !== ws) return
		if (ws) {
			ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
		}
		this.ws = null
		this.clearTimer("watchdog")
		const healthy = this.openedAt !== null && this.now() - this.openedAt >= BACKOFF.healthyMs
		this.openedAt = null
		if (this.disposed) return
		if (code === 4401 && this.opts.onAuthRejected && !this.authRetried) {
			this.authRetried = true
			void this.opts.onAuthRejected().finally(() => this.connectNow())
			return
		}
		this.failures = healthy ? 1 : this.failures + 1
		this.scheduleReconnect()
	}

	private scheduleReconnect() {
		if (!this.canConnect()) {
			this.setStatus(!this.online ? "offline" : !this.active ? "suspended" : "idle")
			return
		}
		this.setStatus("waiting")
		this.clearTimer("reconnectTimer")
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null
			this.connectNow()
		}, backoffDelay(this.failures - 1, this.opts.random))
	}

	private closeSocket(state: "idle" | "suspended") {
		const ws = this.ws
		this.ws = null
		this.clearTimer("watchdog")
		this.clearTimer("reconnectTimer")
		this.openedAt = null
		if (ws) {
			ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
			try {
				ws.close(1000, state)
			} catch {
				// ignore
			}
		}
		if (state === "idle") this.failures = 0
		this.setStatus(state)
	}
}
