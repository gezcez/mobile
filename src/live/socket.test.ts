import type { ServerMessage } from "./protocol"
import { BACKGROUND_CLOSE_MS, DEAD_AFTER_MS, LiveSocket, backoffDelay, type SocketLike } from "./socket"

class FakeSocket implements SocketLike {
	readyState = 0
	sent: Record<string, unknown>[] = []
	closed: number | null = null
	onopen: ((ev: unknown) => void) | null = null
	onmessage: ((ev: { data: unknown }) => void) | null = null
	onclose: ((ev: { code?: number }) => void) | null = null
	onerror: ((ev: unknown) => void) | null = null
	constructor(readonly url: string) {}
	send(data: string) {
		this.sent.push(JSON.parse(data))
	}
	close(code?: number) {
		this.closed = code ?? 1000
		this.readyState = 3
	}
	// test helpers
	open() {
		this.readyState = 1
		this.onopen?.({})
	}
	receive(m: unknown) {
		this.onmessage?.({ data: JSON.stringify(m) })
	}
	drop(code = 1006) {
		this.readyState = 3
		this.onclose?.({ code })
	}
	types() {
		return this.sent.map((m) => m.type)
	}
}

function setup(opts: { token?: string } = {}) {
	const sockets: FakeSocket[] = []
	let now = 0
	const live = new LiveSocket({
		url: () => "wss://example.test/v1/ws",
		factory: (url) => {
			const s = new FakeSocket(url)
			sockets.push(s)
			return s
		},
		getToken: opts.token ? async () => opts.token! : undefined,
		random: () => 1,
		now: () => now,
	})
	const last = () => sockets[sockets.length - 1]!
	return { live, sockets, last, advance: (ms: number) => ((now += ms), jest.advanceTimersByTime(ms)) }
}

const flush = () => new Promise((r) => jest.requireActual<typeof import("timers")>("timers").setImmediate(r))

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe("backoffDelay", () => {
	it("uses full jitter with base 1 s, factor 2 and a 30 s cap", () => {
		expect(backoffDelay(0, () => 1)).toBe(1000)
		expect(backoffDelay(3, () => 1)).toBe(8000)
		expect(backoffDelay(10, () => 1)).toBe(30_000)
		expect(backoffDelay(10, () => 0.5)).toBe(15_000)
	})
})

describe("LiveSocket", () => {
	it("connects on the first subscription, authenticates, then subscribes", async () => {
		const { live, last } = setup({ token: "tok" })
		const got: ServerMessage[] = []
		live.subscribe({ channel: "vehicles", params: { network: "kocaeli-bus", routes: ["4.41265"] } }, (m) => got.push(m))
		last().open()
		await flush()
		expect(last().types()).toEqual(["auth", "subscribe"])
		expect(last().sent[1]).toMatchObject({ id: "s1", channel: "vehicles", params: { network: "kocaeli-bus" } })
		last().receive({ type: "snapshot", sub: "s1", seq: 1, feed_ts: 1, fields: [], vehicles: [] })
		expect(got.map((m) => m.type)).toEqual(["snapshot"])
	})

	it("shares equal subscriptions and unsubscribes when the last listener leaves", async () => {
		const { live, last } = setup()
		const sub = { channel: "departures" as const, params: { stop: "4.41001" } }
		const off1 = live.subscribe(sub, () => undefined)
		const off2 = live.subscribe(sub, () => undefined)
		last().open()
		await flush()
		expect(last().types()).toEqual(["subscribe"])
		off1()
		expect(last().types()).toEqual(["subscribe"])
		off2()
		expect(last().types()).toEqual(["subscribe", "unsubscribe"])
	})

	it("answers pings and resubscribes on a seq gap", async () => {
		const { live, last } = setup()
		const got: string[] = []
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, (m) => got.push(`${m.type}`))
		last().open()
		await flush()
		last().receive({ type: "ping", t: 5 })
		expect(last().sent.at(-1)).toEqual({ type: "pong", t: 5 })
		last().receive({ type: "snapshot", sub: "s1", seq: 1, feed_ts: 1, fields: [], vehicles: [] })
		last().receive({ type: "delta", sub: "s1", seq: 2, feed_ts: 2, upsert: [], remove: [] })
		last().receive({ type: "delta", sub: "s1", seq: 4, feed_ts: 4, upsert: [], remove: [] })
		expect(got).toEqual(["snapshot", "delta"])
		expect(last().types().slice(-2)).toEqual(["unsubscribe", "subscribe"])
	})

	it("reconnects with backoff, resubscribes, and reports the REST fallback after 3 failures", async () => {
		const { live, sockets, last, advance } = setup()
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, () => undefined)
		last().drop()
		expect(live.status).toMatchObject({ state: "waiting", failures: 1, fallback: false })
		advance(1000)
		expect(sockets).toHaveLength(2)
		last().drop()
		advance(2000)
		last().drop()
		expect(live.status).toMatchObject({ failures: 3, fallback: true })
		advance(4000)
		last().open()
		await flush()
		expect(live.status.fallback).toBe(false)
		expect(last().types()).toEqual(["subscribe"])
	})

	it("resets the backoff after 60 s of healthy connection", async () => {
		const { live, last, advance } = setup()
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, () => undefined)
		last().drop()
		advance(1000)
		last().drop()
		advance(2000)
		last().open()
		for (let i = 0; i < 4; i++) {
			advance(20_000)
			last().receive({ type: "ping" })
		}
		last().drop()
		expect(live.status.failures).toBe(1)
	})

	it("treats 45 s of silence as a dead connection", () => {
		const { live, sockets, last, advance } = setup()
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, () => undefined)
		last().open()
		advance(DEAD_AFTER_MS)
		expect(sockets[0]!.closed).toBe(4000)
		expect(live.status.state).toBe("waiting")
	})

	it("closes 30 s after going to background and reconnects on foreground", () => {
		const { live, sockets, last, advance } = setup()
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, () => undefined)
		last().open()
		live.setAppActive(false)
		advance(BACKGROUND_CLOSE_MS - 1)
		expect(sockets[0]!.closed).toBeNull()
		advance(1)
		expect(sockets[0]!.closed).toBe(1000)
		expect(live.status.state).toBe("suspended")
		live.setAppActive(true)
		expect(sockets).toHaveLength(2)
	})

	it("does not retry while offline and retries at once when the network returns", () => {
		const { live, sockets, last, advance } = setup()
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, () => undefined)
		live.setOnline(false)
		last().drop()
		advance(60_000)
		expect(sockets).toHaveLength(1)
		expect(live.status.state).toBe("offline")
		live.setOnline(true)
		expect(sockets).toHaveLength(2)
	})

	it("refreshes once on 4401 and reconnects", async () => {
		const sockets: FakeSocket[] = []
		const onAuthRejected = jest.fn(async () => undefined)
		const live = new LiveSocket({
			url: () => "wss://x",
			factory: (u) => {
				const s = new FakeSocket(u)
				sockets.push(s)
				return s
			},
			getToken: async () => "t",
			onAuthRejected,
		})
		live.subscribe({ channel: "vehicles", params: { network: "n" } }, () => undefined)
		sockets[0]!.drop(4401)
		await flush()
		expect(onAuthRejected).toHaveBeenCalledTimes(1)
		expect(sockets).toHaveLength(2)
	})

	it("refuses more than 8 subscriptions", () => {
		const { live } = setup()
		for (let i = 0; i < 8; i++) live.subscribe({ channel: "departures", params: { stop: `s${i}` } }, () => undefined)
		const errors: string[] = []
		live.subscribe({ channel: "departures", params: { stop: "s9" } }, (m) => m.type === "error" && errors.push(m.code))
		expect(errors).toEqual(["RATE_LIMITED"])
	})
})
